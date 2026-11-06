import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import {
  meetsPasswordPolicy,
  PASSWORD_POLICY_MESSAGE,
  PASSWORD_SYMBOLS,
} from "../../_shared/password-policy.ts";

export const RATE_LIMIT_MAX_ATTEMPTS = 5;
export const RATE_LIMIT_WINDOW_MIN = 15;
export const RUT_CHECK_MAX_ATTEMPTS = 3;
export const RUT_CHECK_IP_MAX_ATTEMPTS = 10;
export const DEFAULT_PASSWORD_EXPIRY_HOURS = 72;
export const WORKER_PASSWORD_SYMBOLS = PASSWORD_SYMBOLS;
export const WORKER_PASSWORD_POLICY_MESSAGE = PASSWORD_POLICY_MESSAGE;
export const meetsWorkerPasswordPolicy = meetsPasswordPolicy;

export function generateRandomPassword(length = 16): string {
  if (length < 4) throw new Error("PASSWORD_LENGTH_TOO_SHORT");
  const groups = [
    "ABCDEFGHJKLMNPQRSTUVWXYZ",
    "abcdefghijkmnpqrstuvwxyz",
    "23456789",
    WORKER_PASSWORD_SYMBOLS,
  ];
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  const charset = groups.join("");
  const chars = groups.map((group, index) => group[bytes[index] % group.length]);
  for (let index = groups.length; index < length; index += 1) {
    chars.push(charset[bytes[index] % charset.length]);
  }
  for (let index = chars.length - 1; index > 0; index -= 1) {
    const swapIndex = bytes[index] % (index + 1);
    [chars[index], chars[swapIndex]] = [chars[swapIndex], chars[index]];
  }
  return chars.join("");
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
  let sum = 0,
    multiplier = 2;
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
    const { data } = await svc
      .from("system_config")
      .select("value")
      .eq("key", "worker_password_expiry_hours")
      .maybeSingle();
    if (data?.value) {
      const h = parseInt(String(data.value), 10);
      if (!isNaN(h) && h > 0) return h;
    }
  } catch {
    /* fall through to default */
  }
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
  } catch {
    return false;
  }
}

export function workerLoginRateLimitKey(email: string, ip: string | null): string {
  return `${email.toLowerCase().trim()}:worker_login:${ip ?? "unknown"}`;
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
    await Promise.resolve(svc.rpc("cleanup_login_attempts")).catch(() => {});
  } catch {
    /* non-blocking */
  }
}

export function clientInfo(req: Request): { ip: string | null; ua: string | null } {
  const cfIp = req.headers.get("cf-connecting-ip");
  // Supabase Edge Functions are fronted by Cloudflare. Never trust the client-
  // supplied X-Forwarded-For/X-Real-IP chain for authentication rate limits.
  const ip = cfIp?.trim() || null;
  const ua = req.headers.get("user-agent") || null;
  return { ip, ua };
}

export async function logAction(
  svc: SupabaseClient,
  req: Request,
  params: {
    email: string;
    action: string;
    entity: string;
    entity_label?: string | null;
    details?: Record<string, unknown> | null;
    role?: string | null;
    tenantId?: string | null;
  },
): Promise<void> {
  const { ip, ua } = clientInfo(req);
  const safeString = (value: unknown, max: number): string | null =>
    typeof value === "string" && value.length > 0 ? value.slice(0, max) : null;
  const safeDetails: Record<string, string | number | boolean> = {};
  const allowedDetailKeys = new Set([
    "result",
    "reason",
    "must_change_password",
    "elapsed_hours",
    "expiry_hours",
  ]);
  for (const [key, value] of Object.entries(params.details ?? {})) {
    if (!allowedDetailKeys.has(key)) continue;
    if (typeof value === "string") safeDetails[key] = value.slice(0, 64);
    else if (typeof value === "number" && Number.isFinite(value)) safeDetails[key] = value;
    else if (typeof value === "boolean") safeDetails[key] = value;
  }
  try {
    await svc.from("activity_logs").insert({
      tenant_id: params.tenantId ?? null,
      user_email: safeString(params.email, 254) ?? "unknown",
      action: safeString(params.action, 64) ?? "worker.auth",
      entity: safeString(params.entity, 64) ?? "auth",
      entity_label: safeString(params.entity_label, 96),
      details: Object.keys(safeDetails).length ? safeDetails : null,
      ip_hint: ip,
      user_agent: safeString(ua, 256),
      user_role: params.role ?? "worker",
    });
  } catch {
    /* logging must never block the action */
  }
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
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
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
