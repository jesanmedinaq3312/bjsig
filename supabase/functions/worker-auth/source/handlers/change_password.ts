import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import {
  RATE_LIMIT_WINDOW_MIN,
  checkRateLimit,
  recordLoginAttempt,
  clientInfo,
  logAction,
  jsonResponse,
  findAuthUserByEmail,
  meetsWorkerPasswordPolicy,
  WORKER_PASSWORD_POLICY_MESSAGE,
} from "../../_shared/worker-auth-utils.ts";

export async function handleChangePassword(
  svc: SupabaseClient,
  req: Request,
  body: Record<string, unknown>,
  corsHeaders: Record<string, string>,
  supabaseUrl: string,
): Promise<Response> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return jsonResponse(corsHeaders, { error: "Falta token de autenticación." }, 401);
  }
  const jwt = authHeader.replace("Bearer ", "");

  const email = String(body?.email ?? "")
    .toLowerCase()
    .trim();
  const currentPassword = String(body?.current_password ?? "");
  const newPassword = String(body?.new_password ?? "");

  if (!email || !currentPassword || !newPassword) {
    return jsonResponse(
      corsHeaders,
      { error: "Email, contraseña actual y nueva contraseña son obligatorios." },
      400,
    );
  }
  if (!meetsWorkerPasswordPolicy(newPassword)) {
    return jsonResponse(corsHeaders, { error: WORKER_PASSWORD_POLICY_MESSAGE }, 400);
  }
  if (currentPassword === newPassword) {
    return jsonResponse(
      corsHeaders,
      { error: "La nueva contraseña debe ser diferente a la actual." },
      400,
    );
  }

  const { ip } = clientInfo(req);
  const rateLimitKey = `changepw:${email}`;
  const rateOk = await checkRateLimit(svc, rateLimitKey);
  if (!rateOk) {
    return jsonResponse(
      corsHeaders,
      {
        error: `Demasiados intentos. Intenta nuevamente en ${RATE_LIMIT_WINDOW_MIN} minutos.`,
      },
      429,
    );
  }

  const { data: allowed, error: allowErr } = await svc
    .from("allowed_emails")
    .select("role, active, must_change_password, tenant_id")
    .ilike("email", email)
    .maybeSingle();
  if (allowErr) throw allowErr;
  if (!allowed) {
    return jsonResponse(corsHeaders, { error: "Esta cuenta no existe." }, 400);
  }

  const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });

  const { error: signInErr } = await userClient.auth.signInWithPassword({
    email,
    password: currentPassword,
  });
  if (signInErr) {
    await recordLoginAttempt(svc, rateLimitKey, ip, false, allowed.tenant_id ?? null);
    return jsonResponse(corsHeaders, { error: "La contraseña actual es incorrecta." }, 400);
  }

  const authUser = await findAuthUserByEmail(svc, email);
  if (!authUser) {
    return jsonResponse(corsHeaders, { error: "No se encontró el usuario." }, 400);
  }

  const { error: updateErr } = await svc.auth.admin.updateUserById(authUser.id, {
    password: newPassword,
  });
  if (updateErr) throw updateErr;

  await svc
    .from("allowed_emails")
    .update({ must_change_password: false, password_set_at: new Date().toISOString() })
    .ilike("email", email)
    .eq("tenant_id", allowed.tenant_id);

  await recordLoginAttempt(svc, rateLimitKey, ip, true, allowed.tenant_id ?? null);
  await logAction(svc, req, {
    email,
    action: "worker.change_password",
    entity: "auth",
    entity_label: email,
    tenantId: allowed.tenant_id,
  });

  return jsonResponse(corsHeaders, {
    success: true,
    message: "Contraseña actualizada correctamente.",
  });
}
