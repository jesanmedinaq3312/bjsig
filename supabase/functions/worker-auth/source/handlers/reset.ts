import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  checkRateLimit,
  clientInfo,
  jsonResponse,
  logAction,
  RATE_LIMIT_WINDOW_MIN,
  recordLoginAttempt,
  workerLoginRateLimitKey,
} from "../../_shared/worker-auth-utils.ts";

const GENERIC_SUCCESS = {
  success: true,
  message: "Si el correo existe, recibirá un enlace de restablecimiento en breve.",
};

export type ResetAuthClientFactory = (
  supabaseUrl: string,
  anonKey: string,
) => Pick<SupabaseClient, "auth">;

export const createResetAuthClient: ResetAuthClientFactory = (supabaseUrl, anonKey) =>
  createClient(supabaseUrl, anonKey);

export function getSafeRedirectUrl(): string | null {
  const configuredOrigin = Deno.env.get("WORKER_AUTH_REDIRECT_ORIGIN")?.trim();
  const allowedOrigins = (Deno.env.get("WORKER_AUTH_ALLOWED_REDIRECT_ORIGINS") ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (!configuredOrigin || allowedOrigins.length === 0) return null;

  try {
    const url = new URL(configuredOrigin);
    if (
      url.protocol !== "https:" ||
      url.origin !== configuredOrigin ||
      !allowedOrigins.includes(url.origin)
    ) {
      return null;
    }
    return new URL("/trabajador", url.origin).toString();
  } catch {
    return null;
  }
}

export async function handleRequestReset(
  svc: SupabaseClient,
  req: Request,
  body: Record<string, unknown>,
  corsHeaders: Record<string, string>,
  createAuthClient: ResetAuthClientFactory = createResetAuthClient,
): Promise<Response> {
  const email = typeof body?.email === "string" ? body.email.toLowerCase().trim() : "";
  if (!email || email.length > 254 || !/^[^\s@%_]+@[^\s@%_]+\.[^\s@%_]+$/.test(email)) {
    return jsonResponse(corsHeaders, GENERIC_SUCCESS);
  }

  const { ip } = clientInfo(req);
  // Combine account and proxy-derived IP so one caller cannot freeze resets for
  // a worker from every network. The caller receives the same payload either way.
  const rateLimitKey = workerLoginRateLimitKey(`reset:${email}`, ip);
  const rateLimitAllowed = await checkRateLimit(svc, rateLimitKey);
  if (!rateLimitAllowed) {
    return jsonResponse(corsHeaders, GENERIC_SUCCESS);
  }
  await recordLoginAttempt(svc, rateLimitKey, ip, false, null);

  const redirectTo = getSafeRedirectUrl();
  if (!redirectTo) {
    // Configuration is intentionally fail-closed, but the public response is
    // indistinguishable from a successful reset request.
    await logAction(svc, req, {
      email: "unknown",
      action: "worker.request_reset_unavailable",
      entity: "auth",
      details: { reason: "redirect_not_configured" },
    });
    return jsonResponse(corsHeaders, GENERIC_SUCCESS);
  }

  try {
    const { data: allowed, error: allowErr } = await svc
      .from("allowed_emails")
      .select("role, active, tenant_id")
      .ilike("email", email)
      .maybeSingle();
    if (allowErr) throw allowErr;

    if (allowed?.active && allowed.role === "worker") {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
      if (!supabaseUrl || !anonKey) throw new Error("SUPABASE_AUTH_NOT_CONFIGURED");
      const anonClient = createAuthClient(supabaseUrl, anonKey);
      const { error } = await anonClient.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) throw error;
    }

    await logAction(svc, req, {
      email: "unknown",
      action: "worker.request_reset",
      entity: "auth",
      tenantId: allowed?.tenant_id ?? null,
    });
  } catch {
    // Do not expose whether the identity exists or whether Supabase rejected it.
    await logAction(svc, req, {
      email: "unknown",
      action: "worker.request_reset_failed",
      entity: "auth",
      details: { reason: "provider_error" },
    });
  }

  return jsonResponse(corsHeaders, GENERIC_SUCCESS);
}
