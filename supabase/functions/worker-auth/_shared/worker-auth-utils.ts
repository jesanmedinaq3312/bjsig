import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

export const RATE_LIMIT_MAX_ATTEMPTS = 5;
export const RATE_LIMIT_WINDOW_MIN = 15;
export const RUT_CHECK_MAX_ATTEMPTS = 3;
export const RUT_CHECK_IP_MAX_ATTEMPTS = 10;
export const DEFAULT_PASSWORD_EXPIRY_HOURS = 72;

export function generateRandomPassword(length = 16): string {
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => charset[b % charset.length]).join("");
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain || local.length <= 1) return email;
  return `${local[0]}${"*".repeat(Math.min(local.length - 1, 4))}@${domain}`;
}

export function maskName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return fullName;
  const first = parts[0];
  if (parts.length === 1) return first[0] + "*".repeat(Math.max(1, first.length - 1));
  return `${first} ${parts[1][0]}.`;
}

export function validateRutModule11(rut: string): boolean {
  const clean = rut.replace(/[.\s-]/g, "").toUpperCase();
  if (clean.length < 2) return false;
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1).toUpperCase();
  if (!/^\d+$/.test(body)) return false;
  let sum = 0, multiplier = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i], 10) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  const mod = sum % 11;
  const computed = 11 - mod;
  const expected = computed === 11 ? "0" : computed === 10 ? "K" : String(computed);
  return dv === expected;
}

export function normalizeRut(r: string): string {
  return r.replace(/[.\s-]/g, "").toUpperCase();
}

export async function getPasswordExpiryHours(svc: SupabaseClient): Promise<number> {
  try {
    const { data } = await svc.from("system_config").select("value").eq("key", "worker_password_expiry_hours").maybeSingle();
    if (data?.value) {
      const h = parseInt(String(data.value), 10);
      if (!isNaN(h) && h > 0) return h;
    }
  } catch { /* fall through to default */ }
  return DEFAULT_PASSWORD_EXPIRY_HOURS;
}

export async function checkRateLimit(
  svc: SupabaseClient,
  identifier: string,
  maxAttempts: number = RATE_LIMIT_MAX_ATTEMPTS,
): Promise<boolean> {
  try {
    const { data, error } = await svc.rpc("check_login_rate_limit", {
      p_identifier: identifier,
      p_max_attempts: maxAttempts,
      p_window_minutes: RATE_LIMIT_WINDOW_MIN,
    });
    if (error) return false;
    return !!data;
  } catch { return false; }
}

export async function recordLoginAttempt(
  svc: SupabaseClient,
  identifier: string,
  ip: string | null,
  success: boolean,
  tenantId: string | null,
): Promise<void> {
  try {
    await svc.from("login_attempts").insert({
      identifier,
      ip_hint: ip,
      success,
      tenant_id: tenantId,
    });
    await svc.rpc("cleanup_login_attempts").catch(() => {});
  } catch { /* non-blocking */ }
}

export function clientInfo(req: Request): { ip: string | null; ua: string | null } {
  const fwd = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  const cfIp = req.headers.get("cf-connecting-ip");
  const ip = (fwd?.split(",")[0].trim()) || realIp || cfIp || null;
  const ua = req.headers.get("user-agent") || null;
  return { ip, ua };
}

export function clientTracking(body: Record<string, unknown>): {
  latitude: number | null;
  longitude: number | null;
  device_id: string | null;
  fingerprint: string | null;
  client_ua: string | null;
  viewport: string | null;
  referrer: string | null;
  cookie_data: Record<string, unknown> | null;
} {
  return {
    latitude: typeof body?.latitude === "number" ? body.latitude : null,
    longitude: typeof body?.longitude === "number" ? body.longitude : null,
    device_id: typeof body?.device_id === "string" ? body.device_id : null,
    fingerprint: typeof body?.fingerprint === "string" ? body.fingerprint : null,
    client_ua: typeof body?.client_ua === "string" ? body.client_ua : null,
    viewport: typeof body?.viewport === "string" ? body.viewport : null,
    referrer: typeof body?.referrer === "string" ? body.referrer : null,
    cookie_data: (body?.cookie_data && typeof body.cookie_data === "object" && !Array.isArray(body.cookie_data))
      ? body.cookie_data as Record<string, unknown>
      : null,
  };
}

export async function logAction(
  svc: SupabaseClient,
  req: Request,
  params: {
    email: string; action: string; entity: string; entity_label?: string | null;
    details?: Record<string, unknown> | null; role?: string | null; tenantId?: string | null;
    latitude?: number | null; longitude?: number | null; device_id?: string | null;
    fingerprint?: string | null; session_id?: string | null;
    cookie_data?: Record<string, unknown> | null; session_duration?: number | null;
    referrer?: string | null; viewport?: string | null; client_ua?: string | null;
  },
): Promise<void> {
  const { ip, ua } = clientInfo(req);
  try {
    await svc.from("activity_logs").insert({
      tenant_id: params.tenantId ?? null,
      user_email: params.email,
      action: params.action,
      entity: params.entity,
      entity_label: params.entity_label ?? null,
      details: params.details ?? null,
      ip_hint: ip,
      user_agent: params.client_ua ?? ua,
      user_role: params.role ?? "worker",
      latitude: params.latitude ?? null,
      longitude: params.longitude ?? null,
      device_id: params.device_id ?? null,
      fingerprint: params.fingerprint ?? null,
      session_id: params.session_id ?? null,
      cookie_data: params.cookie_data ?? null,
      session_duration: params.session_duration ?? null,
      referrer: params.referrer ?? null,
      viewport: params.viewport ?? null,
    });
  } catch { /* logging must never block the action */ }
}

export interface AuthUser {
  id: string;
  email: string;
  created_at?: string;
  banned_until?: string;
}

/**
 * Find a single auth user by email. Paginates through all users since
 * listUsers does not support server-side email filtering.
 */
export async function findAuthUserByEmail(
  svc: SupabaseClient,
  email: string,
): Promise<AuthUser | undefined> {
  const cleanEmail = email.toLowerCase().trim();
  let page = 1;
  const perPage = 200;
  while (true) {
    const { data, error } = await svc.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const found = data.users.find((u) => u.email === cleanEmail);
    if (found) return found as AuthUser;
    if (data.users.length < perPage) break;
    page++;
  }
  return undefined;
}

export async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function jsonResponse(
  corsHeaders: Record<string, string>,
  body: Record<string, unknown>,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
