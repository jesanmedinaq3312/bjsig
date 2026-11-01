import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import {
  RATE_LIMIT_WINDOW_MIN,
  checkRateLimit, clientInfo, clientTracking, logAction, jsonResponse,
  findAuthUserByEmail,
} from "../../_shared/worker-auth-utils.ts";

export async function handleSetInitialPassword(
  svc: SupabaseClient,
  req: Request,
  body: Record<string, unknown>,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  const email = String(body?.email ?? "").toLowerCase().trim();
  const password = String(body?.password ?? "");
  if (!email || !password) {
    return jsonResponse(corsHeaders, { error: "Email y contraseña son obligatorios." }, 400);
  }

  const { ip: _ip } = clientInfo(req);
  const ct = clientTracking(body);
  const rateLimitKey = `${email}:set_password`;
  const rateOk = await checkRateLimit(svc, rateLimitKey);
  if (!rateOk) {
    return jsonResponse(corsHeaders, {
      error: `Demasiados intentos fallidos. Intenta nuevamente en ${RATE_LIMIT_WINDOW_MIN} minutos.`,
    }, 429);
  }
  if (password.length < 8) {
    return jsonResponse(corsHeaders, { error: "La contraseña debe tener al menos 8 caracteres." }, 400);
  }
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
    return jsonResponse(corsHeaders, { error: "La contraseña debe incluir mayúsculas, minúsculas y números." }, 400);
  }

  const { data: allowed, error: allowErr } = await svc
    .from("allowed_emails")
    .select("role, active, must_change_password, tenant_id")
    .ilike("email", email)
    .maybeSingle();
  if (allowErr) throw allowErr;
  if (!allowed || allowed.role !== "worker") {
    return jsonResponse(corsHeaders, { error: "Esta cuenta no existe o no es de trabajador." }, 400);
  }
  if (!allowed.active) {
    return jsonResponse(corsHeaders, { error: "Tu cuenta está bloqueada." }, 403);
  }

  const authUser = await findAuthUserByEmail(svc, email);
  if (!authUser) {
    return jsonResponse(corsHeaders, { error: "No se encontró el usuario en el sistema de autenticación." }, 400);
  }

  const { error: updateErr } = await svc.auth.admin.updateUserById(authUser.id, { password });
  if (updateErr) throw updateErr;

  await svc.from("allowed_emails")
    .update({ must_change_password: false, password_set_at: new Date().toISOString() })
    .ilike("email", email)
    .eq("tenant_id", allowed.tenant_id);

  await logAction(svc, req, { email, action: "worker.set_initial_password", entity: "auth", entity_label: email, tenantId: allowed.tenant_id, ...ct });

  return jsonResponse(corsHeaders, { success: true, message: "Contraseña establecida correctamente." });
}
