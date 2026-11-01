import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import {
  RUT_CHECK_MAX_ATTEMPTS, RUT_CHECK_IP_MAX_ATTEMPTS, RATE_LIMIT_WINDOW_MIN,
  validateRutModule11, normalizeRut, maskName, maskEmail,
  checkRateLimit, recordLoginAttempt, clientInfo, clientTracking, logAction, jsonResponse,
} from "../../_shared/worker-auth-utils.ts";

export async function handleCheckRut(
  svc: SupabaseClient,
  req: Request,
  body: Record<string, unknown>,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  const rut = String(body?.rut ?? "").trim();
  if (!rut) {
    return jsonResponse(corsHeaders, { valid: false, error: "RUT es obligatorio." }, 400);
  }
  if (!validateRutModule11(rut)) {
    return jsonResponse(corsHeaders, { valid: false, error: "El RUT ingresado no es válido. Verifica el dígito verificador." }, 400);
  }

  const { ip } = clientInfo(req);
  const ct = clientTracking(body);
  const rateLimitKey = `${rut}:rut`;
  const ipRateLimitKey = ip ? `ip:${ip}:rut_check` : null;
  const rutAllowed = await checkRateLimit(svc, rateLimitKey, RUT_CHECK_MAX_ATTEMPTS);
  if (!rutAllowed) {
    return jsonResponse(corsHeaders, {
      valid: false,
      error: `Demasiados intentos. Intenta nuevamente en ${RATE_LIMIT_WINDOW_MIN} minutos.`,
    }, 429);
  }

  if (ipRateLimitKey) {
    const ipAllowed = await checkRateLimit(svc, ipRateLimitKey, RUT_CHECK_IP_MAX_ATTEMPTS);
    if (!ipAllowed) {
      return jsonResponse(corsHeaders, {
        valid: false,
        error: `Demasiados intentos desde esta dirección. Intenta nuevamente en ${RATE_LIMIT_WINDOW_MIN} minutos.`,
      }, 429);
    }
  }

  const normalizedRut = normalizeRut(rut);

  const { data: workers, error: workerErr } = await svc
    .from("workers")
    .select("rut, full_name, email, tenant_id")
    .eq("rut", normalizedRut)
    .limit(2);

  if (workerErr) throw workerErr;

  const worker = workers?.[0] ?? null;

  if (!worker) {
    await recordLoginAttempt(svc, rateLimitKey, ip, false, null);
    if (ipRateLimitKey) await recordLoginAttempt(svc, ipRateLimitKey, ip, false, null);
    await logAction(svc, req, { email: "unknown", action: "worker.check_rut", entity: "auth", entity_label: rut, details: { result: "not_found" }, ...ct });
    return jsonResponse(corsHeaders, { valid: false, error: "El RUT no está registrado o no tiene acceso al portal. Contacta al administrador." });
  }

  const { data: portalAccess, error: portalErr } = await svc
    .from("allowed_emails")
    .select("email, active, role, tenant_id")
    .eq("worker_rut", worker.rut)
    .maybeSingle();

  if (portalErr) throw portalErr;

  const workerTenantId = (worker as { tenant_id?: string } | null)?.tenant_id ?? null;

  if (!portalAccess || portalAccess.role !== "worker" || !portalAccess.active) {
    await recordLoginAttempt(svc, rateLimitKey, ip, false, workerTenantId);
    if (ipRateLimitKey) await recordLoginAttempt(svc, ipRateLimitKey, ip, false, workerTenantId);
    await logAction(svc, req, { email: worker.email ?? "unknown", action: "worker.check_rut", entity: "auth", entity_label: rut, details: { result: "denied" }, tenantId: workerTenantId, ...ct });
    return jsonResponse(corsHeaders, { valid: false, error: "El RUT no está registrado o no tiene acceso al portal. Contacta al administrador." });
  }

  await recordLoginAttempt(svc, rateLimitKey, ip, true, workerTenantId);
  if (ipRateLimitKey) await recordLoginAttempt(svc, ipRateLimitKey, ip, true, workerTenantId);
  await logAction(svc, req, { email: portalAccess.email, action: "worker.check_rut", entity: "auth", entity_label: rut, details: { result: "ok" }, tenantId: workerTenantId, ...ct });

  return jsonResponse(corsHeaders, {
    valid: true,
    worker_name: maskName(worker.full_name),
    email: portalAccess.email ? maskEmail(portalAccess.email) : null,
    email_hint: true,
    active: portalAccess.active,
  });
}
