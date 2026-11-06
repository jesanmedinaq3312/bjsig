import { callEdgeFunctionAnon } from "@/lib/edgeFunctions";
import { meetsPasswordPolicy, PASSWORD_POLICY_MESSAGE } from "@/lib/passwordPolicy";
import { getTurnstileToken } from "@/lib/turnstile";

export type Mode = "rut" | "login" | "first_password" | "reset_request" | "success";

export interface AccountCheck {
  exists: boolean;
  is_worker: boolean;
  active: boolean;
  must_change_password: boolean;
  has_auth_user: boolean;
  error?: string;
}

export interface RutCheck {
  valid: boolean;
  worker_name?: string;
  email?: string;
  email_hint?: boolean;
  active?: boolean;
  error?: string;
}

const CAPTCHA_ACTIONS: Record<string, string> = {
  check_rut: "worker_check_rut",
  check_account: "worker_check_account",
  request_reset: "worker_request_reset",
  record_login_failure: "worker_login_failure",
  set_initial_password: "worker_set_initial_password",
};

const SUPABASE_AUTH_CAPTCHA_ACTIONS: Record<string, string> = {
  request_reset: "supabase_password_recovery",
  set_initial_password: "supabase_sign_in",
  change_password: "supabase_sign_in",
};

export async function callWorkerAuth(action: string, payload: Record<string, unknown>) {
  const captchaAction = CAPTCHA_ACTIONS[action];
  const captchaToken = captchaAction ? await getTurnstileToken(captchaAction) : null;
  const authCaptchaAction = SUPABASE_AUTH_CAPTCHA_ACTIONS[action];
  const authCaptchaToken = authCaptchaAction ? await getTurnstileToken(authCaptchaAction) : null;
  return callEdgeFunctionAnon("worker-auth", {
    ...payload,
    action,
    ...(captchaToken ? { captcha_token: captchaToken } : {}),
    ...(authCaptchaToken ? { auth_captcha_token: authCaptchaToken } : {}),
  });
}

export function validatePassword(pw: string): string | null {
  return meetsPasswordPolicy(pw) ? null : PASSWORD_POLICY_MESSAGE;
}
