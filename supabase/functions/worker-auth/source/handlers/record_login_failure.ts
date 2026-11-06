import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import {
  checkRateLimit,
  clientInfo,
  jsonResponse,
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

  const { ip } = clientInfo(req);
  const rateLimitKey = workerLoginRateLimitKey(email, ip);
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
  return jsonResponse(corsHeaders, { success: true });
}
