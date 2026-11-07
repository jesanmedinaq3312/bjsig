import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../../_shared/auth.ts";
import { resolveTenantId } from "../_shared/auth.ts";

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");

    if (!token || token === anonKey) {
      return new Response(JSON.stringify({ error: "No autorizado: se requiere sesión activa." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: userData, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Sesión inválida." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userEmail = userData.user.email ?? "unknown";

    const body = await req.json();
    const rut = typeof body?.rut === "string" ? body.rut : null;
    const context = typeof body?.context === "string" ? body.context : "unknown";

    if (!rut) {
      return new Response(JSON.stringify({ error: "Se requiere rut." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const tenantId = await resolveTenantId(userClient);

    // Query honeytokens server-side — never expose the full list to the client
    const { data: tokens, error: tokErr } = await admin
      .from("honeytokens")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("token_type", "fake_worker")
      .eq("triggered", false);
    if (tokErr) throw tokErr;

    let triggered = false;

    for (const token of tokens ?? []) {
      const payloadRut = token.payload?.rut;
      if (payloadRut && payloadRut === rut) {
        triggered = true;

        // Log critical security event
        await admin.from("activity_logs").insert({
          tenant_id: tenantId,
          user_email: userEmail,
          action: "security.honeytoken_triggered",
          entity: "honeytokens",
          entity_id: token.id,
          entity_label: `HONEYTOKEN ACCEDIDO: ${token.label}`,
          details: {
            token_type: token.token_type,
            context,
            rut_accessed: rut,
            severity: "critical",
          },
        });

        // Mark as triggered
        await admin
          .from("honeytokens")
          .update({
            triggered: true,
            triggered_at: new Date().toISOString(),
            triggered_by: context,
          })
          .eq("id", token.id)
          .eq("tenant_id", tenantId);

        break;
      }
    }

    return new Response(JSON.stringify({ triggered }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Error interno del servidor." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
