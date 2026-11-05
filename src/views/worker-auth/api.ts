import { callEdgeFunctionAnon } from "@/lib/edgeFunctions";
import { meetsPasswordPolicy, PASSWORD_POLICY_MESSAGE } from "@/lib/passwordPolicy";
import {
  getCachedGps,
  getBrowserFingerprint,
  getCookieMetadata,
  getNavigationContext,
  getLocalDeviceId,
} from "@/lib/gps";

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

async function buildTrackingPayload(): Promise<Record<string, unknown>> {
  const gps = await getCachedGps();
  const navCtx = getNavigationContext();
  return {
    latitude: gps?.latitude ?? null,
    longitude: gps?.longitude ?? null,
    device_id: getLocalDeviceId(),
    fingerprint: getBrowserFingerprint(),
    client_ua: navigator.userAgent,
    viewport: navCtx.viewport,
    referrer: navCtx.referrer,
    cookie_data: getCookieMetadata(),
  };
}

export async function callWorkerAuth(action: string, payload: Record<string, unknown>) {
  const tracking = await buildTrackingPayload();
  return callEdgeFunctionAnon("worker-auth", { action, ...payload, ...tracking });
}

export function validatePassword(pw: string): string | null {
  return meetsPasswordPolicy(pw) ? null : PASSWORD_POLICY_MESSAGE;
}
