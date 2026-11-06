import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders, isOriginAllowed } from "../../_shared/auth.ts";
import { resolveTenantId } from "../_shared/auth.ts";

const VALID_CATEGORIES = ["acoso_laboral", "acoso_sexual", "violencia", "otro"];

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);
  const json = (body: unknown, status: number) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (!isOriginAllowed(req)) return json({ error: "ORIGIN_NOT_ALLOWED" }, 403);
  if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !anonKey || !serviceKey) {
      return json({ error: "Configuración segura incompleta." }, 503);
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    if (!token || token === anonKey) {
      return json({ error: "No autorizado: se requiere sesión activa." }, 401);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userData?.user?.id || !userData.user.email) {
      return json({ error: "Sesión inválida." }, 401);
    }
    const userEmail = userData.user.email;
    const admin = createClient(supabaseUrl, serviceKey);

    let tenantId: string | null = null;
    try {
      tenantId = await resolveTenantId(userClient);
    } catch {
      // Worker sessions may not expose current_tenant_id; resolve exactly one
      // active worker membership from the verified session email instead.
    }
    if (!tenantId) {
      const { data: memberships, error: membershipError } = await admin
        .from("allowed_emails")
        .select("tenant_id")
        .eq("email", userEmail.toLowerCase())
        .eq("role", "worker")
        .eq("active", true)
        .limit(2);
      if (membershipError || memberships?.length !== 1 || !memberships[0]?.tenant_id) {
        return json({ error: "TENANT_REQUIRED" }, 403);
      }
      tenantId = String(memberships[0].tenant_id);
    }
    if (!tenantId.trim()) return json({ error: "TENANT_REQUIRED" }, 403);

    const rateKeys = [`harassment-report:user:${userData.user.id}`];
    const ip = req.headers.get("cf-connecting-ip")?.trim();
    if (ip) rateKeys.push(`harassment-report:ip:${ip}`);
    for (const identifier of rateKeys) {
      const { data: rateAllowed, error: rateError } = await admin.rpc("check_login_rate_limit", {
        p_identifier: identifier,
        p_max_attempts: 5,
        p_window_minutes: 60,
      });
      if (rateError) return json({ error: "RATE_LIMIT_UNAVAILABLE" }, 503);
      if (rateAllowed !== true) {
        return json({ error: "Demasiadas denuncias. Intenta nuevamente más tarde." }, 429);
      }
    }

    const body = await req.json();
    const category = typeof body?.category === "string" ? body.category : null;
    const description = typeof body?.description === "string" ? body.description.trim() : null;
    const reporterWorkerRut =
      typeof body?.reporter_worker_rut === "string" ? body.reporter_worker_rut.trim() : null;
    const anonymous = body?.anonymous !== false;

    if (!category || !VALID_CATEGORIES.includes(category)) {
      return json({ error: "Categoría no válida." }, 400);
    }
    if (!description || description.length < 10) {
      return json({ error: "La descripción debe tener al menos 10 caracteres." }, 400);
    }
    if (description.length > 5000) {
      return json({ error: "La descripción no puede exceder 5000 caracteres." }, 400);
    }

    let boundReporterRut: string | null = null;
    if (!anonymous) {
      const normalizeRut = (value: string) => value.replace(/[.\s-]/g, "").toUpperCase();
      const submittedRut = reporterWorkerRut ? normalizeRut(reporterWorkerRut) : "";
      if (!submittedRut) return json({ error: "RUT del denunciante obligatorio." }, 400);

      const { data: accesses, error: accessError } = await admin
        .from("allowed_emails")
        .select("worker_rut")
        .eq("email", userEmail.toLowerCase())
        .eq("tenant_id", tenantId)
        .eq("role", "worker")
        .eq("active", true)
        .limit(2);
      if (accessError) return json({ error: "No se pudo verificar la identidad." }, 503);
      const linked = (accesses ?? []).filter(
        (access: { worker_rut: string | null }) =>
          !!access.worker_rut && normalizeRut(access.worker_rut) === submittedRut,
      );
      if (linked.length !== 1) {
        return json({ error: "El RUT no corresponde a la identidad autenticada." }, 403);
      }

      const { data: worker, error: workerError } = await admin
        .from("workers")
        .select("rut")
        .eq("tenant_id", tenantId)
        .eq("rut", submittedRut)
        .maybeSingle();
      if (workerError || !worker) {
        return json({ error: "El RUT no pertenece al tenant autenticado." }, 403);
      }
      boundReporterRut = worker.rut;
    }

    // check_login_rate_limit reads login_attempts; persist one row per bucket
    // after validating the payload so subsequent submissions consume quota.
    for (const identifier of rateKeys) {
      const { error: attemptError } = await admin.from("login_attempts").insert({
        identifier,
        ip_hint: ip ?? null,
        success: false,
        tenant_id: tenantId,
      });
      if (attemptError) return json({ error: "RATE_LIMIT_UNAVAILABLE" }, 503);
    }

    const { data: report, error: insertErr } = await admin
      .from("harassment_reports")
      .insert({
        tenant_id: tenantId,
        category,
        description,
        reporter_worker_rut: anonymous ? null : boundReporterRut,
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

    return json(
      {
        message: "Denuncia registrada exitosamente.",
        report_id: report.id,
        legal_deadline: report.legal_deadline,
      },
      200,
    );
  } catch {
    return json({ error: "Error interno del servidor." }, 500);
  }
});
