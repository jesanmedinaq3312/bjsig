import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const genericResponse = {
  allowed: true,
  is_worker: false,
  is_platform_developer: false,
  is_new_admin: false,
  has_auth_identity: true,
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = (await request.json()) as { email?: unknown; action?: unknown };
    const email = typeof body.email === "string" ? body.email.toLowerCase().trim() : "";
    if (!email || email.length > 254 || !email.includes("@"))
      return json({ error: "Solicitud inválida." }, 400);
    const url = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!url || !anonKey) return json({ error: "Servicio no disponible." }, 503);
    const client = createClient(url, anonKey);
    const rateKey = `${email}:check_email`;
    const { data: allowed, error: rateError } = await client.rpc("check_login_rate_limit", {
      p_identifier: rateKey,
      p_max_attempts: 5,
      p_window_minutes: 15,
    });
    if (rateError || allowed === false)
      return json({ error: "Demasiados intentos. Intenta nuevamente más tarde." }, 429);
    await client.rpc("check_allowed_email", { p_email: email });
    // Deliberately do not return membership, role or identity-existence data.
    return json(genericResponse);
  } catch {
    // Keep the same generic shape to avoid turning failures into an account oracle.
    return json(genericResponse);
  }
});
