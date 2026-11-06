import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getCorsHeaders, isOriginAllowed } from "../_shared/auth.ts";

const genericResponse = {
  allowed: true,
  is_worker: false,
  is_platform_developer: false,
  is_new_admin: false,
  has_auth_identity: true,
};

function json(body: unknown, status = 200, corsHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function opaqueRateKey(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (request) => {
  const corsHeaders = getCorsHeaders(request);
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (!isOriginAllowed(request)) return json({ error: "ORIGIN_NOT_ALLOWED" }, 403, corsHeaders);
  if (request.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405, corsHeaders);

  try {
    const body = (await request.json()) as { email?: unknown; action?: unknown };
    const email = typeof body.email === "string" ? body.email.toLowerCase().trim() : "";
    if (!email || email.length > 254 || !email.includes("@")) {
      return json({ error: "Solicitud inválida." }, 400, corsHeaders);
    }

    const url = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !anonKey || !serviceKey) {
      return json({ error: "Servicio no disponible." }, 503, corsHeaders);
    }

    // The database function is granted only to service_role; no client-side fallback.
    const service = createClient(url, serviceKey);
    const clientIp = request.headers.get("cf-connecting-ip")?.trim();
    if (!clientIp) return json({ error: "Servicio no disponible." }, 503, corsHeaders);
    const emailHash = await opaqueRateKey(email);
    const ipHash = await opaqueRateKey(clientIp);
    const rateKeys: Array<{ value: string; maxAttempts: number }> = [
      { value: `check-email:${emailHash}:${ipHash}`, maxAttempts: 5 },
      { value: `check-email-ip:${ipHash}`, maxAttempts: 20 },
    ];
    for (const { value, maxAttempts } of rateKeys) {
      let result: { data: boolean | null; error: unknown };
      try {
        result = await service.rpc("check_login_rate_limit", {
          p_identifier: value,
          p_max_attempts: maxAttempts,
          p_window_minutes: 15,
        });
      } catch {
        return json({ error: "Rate limit no disponible." }, 503, corsHeaders);
      }
      if (result.error) return json({ error: "Rate limit no disponible." }, 503, corsHeaders);
      if (result.data !== true) {
        return json(
          { error: "Demasiados intentos. Intenta nuevamente más tarde." },
          429,
          corsHeaders,
        );
      }
    }

    const client = createClient(url, anonKey);
    await client.rpc("check_allowed_email", { p_email: email });
    // Deliberately do not return membership, role or identity-existence data.
    return json(genericResponse, 200, corsHeaders);
  } catch {
    // No account data is returned; service/rate-limit failures must not fail open.
    return json({ error: "Servicio no disponible." }, 503, getCorsHeaders(request));
  }
});
