import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { getCorsHeaders, resolveTenantId } from "../_shared/auth.ts";

const VALID_CATEGORIES = ["acoso_laboral", "acoso_sexual", "violencia", "otro"];

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
      return new Response(
        JSON.stringify({ error: "No autorizado: se requiere sesión activa." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: userData, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "Sesión inválida." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const userEmail = userData.user.email ?? "unknown";

    let tenantId: string | null = null;
    try {
      tenantId = await resolveTenantId(userClient);
    } catch {
      // Worker sessions may not resolve a tenant via RPC — fall back to null
    }

    const body = await req.json();
    const category = typeof body?.category === "string" ? body.category : null;
    const description = typeof body?.description === "string" ? body.description.trim() : null;
    const reporterWorkerRut = typeof body?.reporter_worker_rut === "string" ? body.reporter_worker_rut.trim() : null;
    const anonymous = body?.anonymous !== false;

    if (!category || !VALID_CATEGORIES.includes(category)) {
      return new Response(
        JSON.stringify({ error: "Categoría no válida." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!description || description.length < 10) {
      return new Response(
        JSON.stringify({ error: "La descripción debe tener al menos 10 caracteres." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (description.length > 5000) {
      return new Response(
        JSON.stringify({ error: "La descripción no puede exceder 5000 caracteres." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: report, error: insertErr } = await admin
      .from("harassment_reports")
      .insert({
        tenant_id: tenantId,
        category,
        description,
        reporter_worker_rut: anonymous ? null : (reporterWorkerRut || null),
        status: "recibida",
      })
      .select("id, legal_deadline")
      .single();

    if (insertErr) throw insertErr;

    await admin.from("activity_logs").insert({
      tenant_id: tenantId,
      user_email: userEmail,
      action: "harassment.submit",
      entity: "harassment_reports",
      entity_id: report.id,
      entity_label: `Denuncia ${report.id.slice(0, 8)}`,
      details: {
        category,
        anonymous,
        performed_by: userEmail,
        severity: "high",
      },
    });

    return new Response(
      JSON.stringify({
        message: "Denuncia registrada exitosamente.",
        report_id: report.id,
        legal_deadline: report.legal_deadline,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch {
    return new Response(
      JSON.stringify({ error: "Error interno del servidor." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
