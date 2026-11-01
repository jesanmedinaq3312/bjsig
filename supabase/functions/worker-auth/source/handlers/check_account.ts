import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import {
  RATE_LIMIT_WINDOW_MIN, getPasswordExpiryHours,
  checkRateLimit, recordLoginAttempt, clientInfo, clientTracking, logAction, jsonResponse,
  findAuthUserByEmail,
} from "../../_shared/worker-auth-utils.ts";

export async function handleCheckAccount(
  svc: SupabaseClient,
  req: Request,
  body: Record<string, unknown>,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  const email = String(body?.email ?? "").toLowerCase().trim();
  if (!email) {
    return jsonResponse(corsHeaders, { error: "Email es obligatorio." }, 400);
  }

  const { ip } = clientInfo(req);
  const ct = clientTracking(body);
  const rateLimitKey = `${email}:check_account`;
  const rateLimitOk = await checkRateLimit(svc, rateLimitKey);
  if (!rateLimitOk) {
    await logAction(svc, req, { email, action: "worker.rate_limited", entity: "auth", entity_label: email, details: { ip_hint: ip }, ...ct });
    return jsonResponse(corsHeaders, {
      error: `Demasiados intentos fallidos. Intenta nuevamente en ${RATE_LIMIT_WINDOW_MIN} minutos.`,
    }, 429);
  }

  const { data: allowed, error: allowErr } = await svc
    .from("allowed_emails")
    .select("role, active, worker_rut, must_change_password, ad_synced, tenant_id")
    .ilike("email", email)
    .maybeSingle();
  if (allowErr) throw allowErr;

  if (!allowed) {
    await recordLoginAttempt(svc, rateLimitKey, ip, false, null);
    await logAction(svc, req, { email, action: "worker.check_account", entity: "auth", entity_label: email, details: { result: "not_found" }, ...ct });
    return jsonResponse(corsHeaders, { exists: false, is_worker: false });
  }

  if (allowed.role !== "worker" || !allowed.active) {
    await recordLoginAttempt(svc, rateLimitKey, ip, false, allowed.tenant_id ?? null);
    await logAction(svc, req, { email, action: "worker.check_account", entity: "auth", entity_label: email, details: { result: "denied" }, ...ct });
    return jsonResponse(corsHeaders, { exists: false, is_worker: false });
  }

  const authUser = await findAuthUserByEmail(svc, email);

  if (!authUser) {
    await logAction(svc, req, { email, action: "worker.check_account_no_auth_user", entity: "auth", entity_label: email, details: { worker_rut: allowed.worker_rut, result: "no_auth_user" }, ...ct });

    return jsonResponse(corsHeaders, {
      exists: true,
      is_worker: true,
      active: true,
      must_change_password: true,
      worker_rut: allowed.worker_rut,
      ad_synced: allowed.ad_synced ?? false,
      has_auth_user: false,
    });
  }

  if (allowed.must_change_password && authUser?.created_at) {
    const expiryHours = await getPasswordExpiryHours(svc);
    const elapsed = Date.now() - new Date(authUser.created_at).getTime();
    if (elapsed > expiryHours * 60 * 60 * 1000) {
      await logAction(svc, req, { email, action: "worker.password_expired", entity: "auth", entity_label: email, details: { elapsed_hours: Math.round(elapsed / 3600000), expiry_hours: expiryHours }, ...ct });
      return jsonResponse(corsHeaders, {
        exists: true,
        is_worker: true,
        active: false,
        error: "Tu contraseña temporal ha expirado. Contacta al administrador para restablecer tu acceso.",
      });
    }
  }

  await recordLoginAttempt(svc, rateLimitKey, ip, true, allowed.tenant_id ?? null);
  await logAction(svc, req, { email, action: "worker.check_account", entity: "auth", entity_label: email, details: { result: "ok", must_change_password: allowed.must_change_password ?? false }, tenantId: allowed.tenant_id, ...ct });
  return jsonResponse(corsHeaders, {
    exists: true,
    is_worker: true,
    active: true,
    must_change_password: allowed.must_change_password ?? false,
    worker_rut: allowed.worker_rut,
    ad_synced: allowed.ad_synced ?? false,
    has_auth_user: true,
  });
}
