import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

export type GpsGateResult =
  | { allowed: true; enabled: boolean }
  | { allowed: false; code: "GPS_REQUIRED" | "GPS_GATE_UNAVAILABLE" };

export async function checkGpsSessionAccess(userClient: SupabaseClient): Promise<GpsGateResult> {
  const { data: enabled, error: enabledError } = await userClient.rpc("gps_gate_enabled");
  if (enabledError) return { allowed: false, code: "GPS_GATE_UNAVAILABLE" };
  if (enabled !== true) return { allowed: true, enabled: false };

  const { data: verified, error: verifiedError } = await userClient.rpc("gps_session_is_verified");
  if (verifiedError) return { allowed: false, code: "GPS_GATE_UNAVAILABLE" };
  if (verified !== true) return { allowed: false, code: "GPS_REQUIRED" };
  return { allowed: true, enabled: true };
}
