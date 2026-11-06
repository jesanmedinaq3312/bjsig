import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import {
  RATE_LIMIT_WINDOW_MIN,
  checkRateLimit,
  clientInfo,
  findAuthUserByEmail,
  getPasswordExpiryHours,
  jsonResponse,
  logAction,
  meetsWorkerPasswordPolicy,
  recordLoginAttempt,
  WORKER_PASSWORD_POLICY_MESSAGE,
  workerLoginRateLimitKey,
} from "../../_shared/worker-auth-utils.ts";

export type TemporaryPasswordAuthClient = Pick<SupabaseClient, "auth">;
export type TemporaryPasswordAuthClientFactory = (
  supabaseUrl: string,
  anonKey: string,
) => TemporaryPasswordAuthClient;

export const createTemporaryPasswordAuthClient: TemporaryPasswordAuthClientFactory = (
  supabaseUrl,
  anonKey,
) =>
  createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

const INVALID_INITIAL_ACCESS =
  "No se pudo validar el acceso inicial. Verifica tus datos o solicita un nuevo acceso al administrador.";

export async function handleSetInitialPassword(
  svc: SupabaseClient,
  req: Request,
  body: Record<string, unknown>,
  corsHeaders: Record<string, string>,
  supabaseUrl: string,
  anonKey: string,
  createAuthClient: TemporaryPasswordAuthClientFactory = createTemporaryPasswordAuthClient,
): Promise<Response> {
  const email = typeof body?.email === "string" ? body.email.toLowerCase().trim() : "";
  const currentPassword = typeof body?.current_password === "string" ? body.current_password : "";
  const newPassword = typeof body?.new_password === "string" ? body.new_password : "";
  const authCaptchaToken =
    typeof body?.auth_captcha_token === "string" ? body.auth_captcha_token.trim() : "";

  if (!email || !currentPassword || !newPassword) {
    return jsonResponse(
      corsHeaders,
      {
        error: "Correo, contraseña temporal y nueva contraseña son obligatorios.",
      },
      400,
    );
  }
  if (!meetsWorkerPasswordPolicy(newPassword)) {
    return jsonResponse(corsHeaders, { error: WORKER_PASSWORD_POLICY_MESSAGE }, 400);
  }
  if (currentPassword === newPassword) {
    return jsonResponse(
      corsHeaders,
      {
        error: "La nueva contraseña debe ser diferente a la temporal.",
      },
      400,
    );
  }

  const { ip } = clientInfo(req);
  const rateLimitKey = workerLoginRateLimitKey(`${email}:set_password`, ip);
  const rateOk = await checkRateLimit(svc, rateLimitKey);
  if (!rateOk) {
    return jsonResponse(
      corsHeaders,
      {
        error: `Demasiados intentos fallidos. Intenta nuevamente en ${RATE_LIMIT_WINDOW_MIN} minutos.`,
      },
      429,
    );
  }

  const rejectAttempt = async (tenantId: string | null = null) => {
    await recordLoginAttempt(svc, rateLimitKey, ip, false, tenantId);
    return jsonResponse(corsHeaders, { error: INVALID_INITIAL_ACCESS }, 400);
  };

  if (!authCaptchaToken || authCaptchaToken.length > 2048) {
    return await rejectAttempt();
  }

  const { data: allowed, error: allowError } = await svc
    .from("allowed_emails")
    .select("role, active, must_change_password, tenant_id")
    .ilike("email", email)
    .maybeSingle();
  if (allowError) throw allowError;

  if (
    !allowed ||
    allowed.role !== "worker" ||
    allowed.active !== true ||
    allowed.must_change_password !== true ||
    !allowed.tenant_id
  ) {
    return await rejectAttempt(allowed?.tenant_id ?? null);
  }

  const authUser = await findAuthUserByEmail(svc, email);
  if (!authUser) return await rejectAttempt(allowed.tenant_id);

  const createdAt = authUser.created_at ? Date.parse(authUser.created_at) : Number.NaN;
  const expiryHours = await getPasswordExpiryHours(svc);
  if (Number.isFinite(createdAt) && Date.now() - createdAt > expiryHours * 60 * 60 * 1000) {
    return await rejectAttempt(allowed.tenant_id);
  }

  const verifier = createAuthClient(supabaseUrl, anonKey);
  const { error: passwordError } = await verifier.auth.signInWithPassword({
    email,
    password: currentPassword,
    options: { captchaToken: authCaptchaToken },
  });
  if (passwordError) return await rejectAttempt(allowed.tenant_id);

  const { error: authUpdateError } = await svc.auth.admin.updateUserById(authUser.id, {
    password: newPassword,
  });
  if (authUpdateError) throw authUpdateError;

  const { error: allowedUpdateError } = await svc
    .from("allowed_emails")
    .update({ must_change_password: false, password_set_at: new Date().toISOString() })
    .ilike("email", email)
    .eq("tenant_id", allowed.tenant_id);
  if (allowedUpdateError) throw allowedUpdateError;

  await recordLoginAttempt(svc, rateLimitKey, ip, true, allowed.tenant_id);
  await logAction(svc, req, {
    email,
    action: "worker.set_initial_password",
    entity: "auth",
    entity_label: email,
    tenantId: allowed.tenant_id,
  });

  return jsonResponse(corsHeaders, {
    success: true,
    message: "Contraseña establecida correctamente.",
  });
}
