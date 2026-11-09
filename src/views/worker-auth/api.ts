import { callEdgeFunctionAnon } from "@/lib/edgeFunctions";
import { meetsPasswordPolicy, PASSWORD_POLICY_MESSAGE } from "@/lib/passwordPolicy";

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

export async function callWorkerAuth(action: string, payload: Record<string, unknown>) {
  return callEdgeFunctionAnon("worker-auth", {
    ...payload,
    action,
  });
}

export function validatePassword(pw: string): string | null {
  return meetsPasswordPolicy(pw) ? null : PASSWORD_POLICY_MESSAGE;
}
