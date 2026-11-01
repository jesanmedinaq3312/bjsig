import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { getCorsHeaders, resolveTenantId } from "../_shared/auth.ts";

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

    // Check admin
    const { data: isAdmin } = await userClient.rpc("is_admin");
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Requiere permisos de administrador." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const tenantId = await resolveTenantId(userClient);

    const body = await req.json();
    const action = typeof body?.action === "string" ? body.action : null;
    const workerRut = typeof body?.worker_rut === "string" ? body.worker_rut : null;

    if (!action || !workerRut) {
      return new Response(
        JSON.stringify({ error: "Se requieren action y worker_rut." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action !== "anonymize" && action !== "delete") {
      return new Response(
        JSON.stringify({ error: "Acción no válida. Use 'anonymize' o 'delete'." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const confirmToken = typeof body?.confirm === "string" ? body.confirm.trim().toUpperCase() : "";
    if (confirmToken !== "CONFIRMAR") {
      return new Response(
        JSON.stringify({ error: "Se requiere confirmación. Envíe confirm: \"CONFIRMAR\" para ejecutar esta acción irreversible." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Fetch worker name before action for audit
    const { data: worker } = await admin
      .from("workers")
      .select("full_name, rut")
      .eq("rut", workerRut)
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (action === "anonymize") {
      const { error: rpcErr } = await admin.rpc("anonymize_worker", { p_rut: workerRut, p_tenant_id: tenantId });
      if (rpcErr) throw rpcErr;
    } else {
      const { error: rpcErr } = await admin.rpc("delete_worker_gdpr", { p_rut: workerRut, p_tenant_id: tenantId });
      if (rpcErr) throw rpcErr;
    }

    // Audit log
    await admin.from("activity_logs").insert({
      tenant_id: tenantId,
      user_email: userEmail,
      action: action === "anonymize" ? "gdpr.anonymize" : "gdpr.delete",
      entity: "workers",
      entity_id: workerRut,
      entity_label: worker?.full_name ?? workerRut,
      details: {
        worker_rut: workerRut,
        action,
        performed_by: userEmail,
        severity: "high",
      },
    });

    return new Response(
      JSON.stringify({
        message: action === "anonymize"
          ? "Datos personales anonimizados correctamente."
          : "Datos personales eliminados correctamente.",
        worker_rut: workerRut,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Error interno del servidor." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
