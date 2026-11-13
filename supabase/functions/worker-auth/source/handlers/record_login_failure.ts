import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import {
  adminLoginRateLimitKey,
  checkRateLimit,
  clientInfo,
  jsonResponse,
  logAction,
  RATE_LIMIT_WINDOW_MIN,
  recordLoginAttempt,
  workerLoginRateLimitKey,
} from "../../_shared/worker-auth-utils.ts";

export async function handleRecordLoginFailure(
  svc: SupabaseClient,
  req: Request,
  body: Record<string, unknown>,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  const email = typeof body?.email === "string" ? body.email.toLowerCase().trim() : "";
  if (!email || email.length > 254 || !/^[^\s@%_]+@[^\s@%_]+\.[^\s@%_]+$/.test(email)) {
    return jsonResponse(corsHeaders, { error: "Correo inválido." }, 400);
  }

  const surface = body?.surface === "admin" ? "admin" : "worker";
  const { ip } = clientInfo(req);
  const rateLimitKey =
    surface === "admin" ? adminLoginRateLimitKey(email, ip) : workerLoginRateLimitKey(email, ip);
  if (!(await checkRateLimit(svc, rateLimitKey))) {
    return jsonResponse(
      corsHeaders,
      {
        error: `Demasiados intentos fallidos. Intenta nuevamente en ${RATE_LIMIT_WINDOW_MIN} minutos.`,
      },
      429,
    );
  }

  await recordLoginAttempt(svc, rateLimitKey, ip, false, null);
  const { data: allowedAccount } = await svc
    .from("allowed_emails")
    .select("role,tenant_id")
    .ilike("email", email)
    .maybeSingle();
  await logAction(svc, req, {
    email,
    action: surface === "admin" ? "auth.admin_signin_failed" : "worker.signin_failed",
    entity: "auth",
    entity_label: email,
    details: {
      reason: "invalid_credentials",
      source: surface,
      reported_by_client: true,
    },
    role: allowedAccount?.role ?? (surface === "admin" ? "unknown" : "worker"),
    tenantId: allowedAccount?.tenant_id ?? null,
  });
  return jsonResponse(corsHeaders, { success: true });
}
