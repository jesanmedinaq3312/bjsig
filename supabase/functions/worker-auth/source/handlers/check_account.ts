import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import {
  checkRateLimit,
  clientInfo,
  getPasswordExpiryHours,
  jsonResponse,
  logAction,
  normalizeRut,
  RATE_LIMIT_WINDOW_MIN,
  recordLoginAttempt,
  validateRutModule11,
  workerLoginRateLimitKey,
} from "../../_shared/worker-auth-utils.ts";

const NO_MATCH = { exists: false, is_worker: false };

export interface AuthenticatedWorkerUser {
  id: string;
  email?: string | null;
  created_at?: string | null;
  is_anonymous?: boolean;
}

export async function handleCheckAccount(
  svc: SupabaseClient,
  req: Request,
  body: Record<string, unknown>,
  corsHeaders: Record<string, string>,
  authenticatedUser: AuthenticatedWorkerUser | null = null,
): Promise<Response> {
  if (!authenticatedUser || authenticatedUser.is_anonymous || !authenticatedUser.email) {
    return jsonResponse(corsHeaders, { error: "Sesión requerida." }, 401);
  }

  // Always derive the lookup identity from the verified session, never body.email.
  const email = authenticatedUser.email.toLowerCase().trim();
  const rut = typeof body?.rut === "string" ? normalizeRut(body.rut) : "";
  if (!email || email.length > 254 || !/^[^\s@%_]+@[^\s@%_]+\.[^\s@%_]+$/.test(email) || !rut) {
    return jsonResponse(
      corsHeaders,
      {
        error: "RUT es obligatorio.",
      },
      400,
    );
  }

  const { ip } = clientInfo(req);
  const rateLimitKey = workerLoginRateLimitKey(email, ip);
  const rateLimitOk = await checkRateLimit(svc, rateLimitKey);
  if (!rateLimitOk) {
    await logAction(svc, req, {
      email,
      action: "worker.rate_limited",
      entity: "auth",
      entity_label: email,
      details: { ip_hint: ip },
    });
    return jsonResponse(
      corsHeaders,
      {
        error: `Demasiados intentos fallidos. Intenta nuevamente en ${RATE_LIMIT_WINDOW_MIN} minutos.`,
      },
      429,
    );
  }

  if (!validateRutModule11(rut)) {
    await recordLoginAttempt(svc, rateLimitKey, ip, false, null);
    await logAction(svc, req, {
      email,
      action: "worker.check_account",
      entity: "auth",
      entity_label: email,
      details: { result: "not_found" },
    });
    return jsonResponse(corsHeaders, NO_MATCH);
  }

  const { data: allowed, error: allowErr } = await svc
    .from("allowed_emails")
    .select("role, active, worker_rut, must_change_password, tenant_id")
    .ilike("email", email)
    .maybeSingle();
  if (allowErr) throw allowErr;

  const allowedRut = allowed?.worker_rut ? normalizeRut(String(allowed.worker_rut)) : "";
  if (
    !allowed ||
    allowed.role !== "worker" ||
    allowed.active !== true ||
    !allowedRut ||
    allowedRut !== rut
  ) {
    await recordLoginAttempt(svc, rateLimitKey, ip, false, allowed?.tenant_id ?? null);
    await logAction(svc, req, {
      email,
      action: "worker.check_account",
      entity: "auth",
      entity_label: email,
      details: { result: "not_found" },
    });
    return jsonResponse(corsHeaders, NO_MATCH);
  }

  if (allowed.must_change_password && authenticatedUser.created_at) {
    const expiryHours = await getPasswordExpiryHours(svc);
    const elapsed = Date.now() - new Date(authenticatedUser.created_at).getTime();
    if (elapsed > expiryHours * 60 * 60 * 1000) {
      await recordLoginAttempt(svc, rateLimitKey, ip, false, allowed.tenant_id);
      await logAction(svc, req, {
        email,
        action: "worker.password_expired",
        entity: "auth",
        entity_label: email,
        details: {
          elapsed_hours: Math.round(elapsed / 3600000),
          expiry_hours: expiryHours,
        },
        tenantId: allowed.tenant_id,
      });
      return jsonResponse(corsHeaders, NO_MATCH);
    }
  }

  await logAction(svc, req, {
    email,
    action: "worker.check_account",
    entity: "auth",
    entity_label: email,
    details: {
      result: "ok",
      must_change_password: allowed.must_change_password ?? false,
    },
    tenantId: allowed.tenant_id,
  });
  return jsonResponse(corsHeaders, {
    exists: true,
    is_worker: true,
    active: true,
    must_change_password: allowed.must_change_password ?? false,
    has_auth_user: true,
  });
}
