import { callEdgeFunctionAnon } from "@/lib/edgeFunctions";
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
  worker_rut: string | null;
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
  if (pw.length < 8) return "La contraseña debe tener al menos 8 caracteres.";
  if (!/[A-Z]/.test(pw) || !/[a-z]/.test(pw) || !/\d/.test(pw)) {
    return "La contraseña debe incluir mayúsculas, minúsculas y números.";
  }
  return null;
}
