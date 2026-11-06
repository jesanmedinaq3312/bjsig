import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import {
  RUT_CHECK_MAX_ATTEMPTS,
  RUT_CHECK_IP_MAX_ATTEMPTS,
  RATE_LIMIT_WINDOW_MIN,
  validateRutModule11,
  normalizeRut,
  checkRateLimit,
  recordLoginAttempt,
  clientInfo,
  logAction,
  jsonResponse,
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
    return jsonResponse(
      corsHeaders,
      { valid: false, error: "El RUT ingresado no es válido. Verifica el dígito verificador." },
      400,
    );
  }

  const { ip } = clientInfo(req);
  const normalizedRut = normalizeRut(rut);
  // Bind the RUT bucket to the proxy-derived IP so one caller cannot lock out
  // the worker globally by repeatedly submitting the worker's RUT.
  const rateLimitKey = `${normalizedRut}:rut:${ip ?? "unknown"}`;
  const ipRateLimitKey = ip ? `ip:${ip}:rut_check` : null;
  const rutAllowed = await checkRateLimit(svc, rateLimitKey, RUT_CHECK_MAX_ATTEMPTS);
  if (!rutAllowed) {
    return jsonResponse(
      corsHeaders,
      {
        valid: false,
        error: `Demasiados intentos. Intenta nuevamente en ${RATE_LIMIT_WINDOW_MIN} minutos.`,
      },
      429,
    );
  }

  if (ipRateLimitKey) {
    const ipAllowed = await checkRateLimit(svc, ipRateLimitKey, RUT_CHECK_IP_MAX_ATTEMPTS);
    if (!ipAllowed) {
      return jsonResponse(
        corsHeaders,
        {
          valid: false,
          error: `Demasiados intentos desde esta dirección. Intenta nuevamente en ${RATE_LIMIT_WINDOW_MIN} minutos.`,
        },
        429,
      );
    }
  }

  // Do not query account or worker tables until credentials are checked
  // together. This avoids RUT enumeration and multi-tenant timing differences.
  await recordLoginAttempt(svc, rateLimitKey, ip, false, null);
  if (ipRateLimitKey) {
    await recordLoginAttempt(svc, ipRateLimitKey, ip, false, null);
  }
  await logAction(svc, req, {
    email: "unknown",
    action: "worker.check_rut",
    entity: "auth",
    details: { result: "completed" },
  });

  // Do not reveal whether the RUT is registered, active, or linked to an email.
  // Continue the same UI path; the authenticated sign-in is authoritative.
  return jsonResponse(corsHeaders, { valid: true });
}
