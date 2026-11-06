import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getCorsHeaders, isOriginAllowed } from "../_shared/auth.ts";

type Payload = {
  tenant_id: string;
  company_name: string;
  contact_name?: string;
  primary_email: string;
  alternate_email?: string;
  subject: string;
  access_path: string;
  help_path?: string;
  manual_url?: string;
  support_email?: string;
  support_phone?: string;
  support_whatsapp?: string;
  support_hours?: string;
  provider_legal_name?: string;
  provider_rut?: string;
  bank_name?: string;
  account_type?: string;
  account_number?: string;
  account_holder?: string;
  account_holder_rut?: string;
  billing_email?: string;
  billing_legal_notice?: string;
};

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function validEmail(value: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);
}

function validHttpUrl(value: unknown): value is string {
  if (typeof value !== "string" || !value.trim()) return false;
  try {
    const url = new URL(value.trim());
    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      !!url.hostname &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

function renderHtml(payload: Payload): string {
  const accessInstructions =
    "<p>Utiliza el enlace de acceso y completa la activación o recuperación de contraseña.</p>";
  return `<!doctype html><html lang="es"><body style="margin:0;background:#f1f5f9;font-family:Arial,sans-serif;color:#0f172a"><div style="max-width:680px;margin:32px auto;background:#fff;border-radius:20px;overflow:hidden;border:1px solid #e2e8f0"><div style="padding:32px;background:linear-gradient(135deg,#0f172a,#1d4ed8);color:#fff"><div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;opacity:.8">Onboarding de cliente</div><h1 style="margin:12px 0 0;font-size:28px">Bienvenido a ${escapeHtml(payload.company_name)}</h1></div><div style="padding:32px"><p>Hola ${escapeHtml(payload.contact_name || "")},</p><p>Tu empresa ya está preparada para comenzar a trabajar con la plataforma. Este correo contiene las rutas de acceso, el manual inicial y los canales de soporte.</p><div style="padding:18px;background:#eff6ff;border-radius:14px"><p><strong>Ruta de acceso:</strong> <a href="${escapeHtml(payload.access_path)}">${escapeHtml(payload.access_path)}</a></p><p><strong>Usuario:</strong> ${escapeHtml(payload.primary_email)}</p>${accessInstructions}</div><h2 style="font-size:18px;margin-top:28px">Primeros pasos</h2><ol><li>Ingresa al portal.</li><li>Completa la activación o recuperación de contraseña.</li><li>Revisa los datos de tu empresa.</li><li>Invita a los usuarios que correspondan.</li><li>Consulta el manual y contacta soporte si necesitas ayuda.</li></ol>${payload.manual_url ? `<p><a href="${escapeHtml(payload.manual_url)}">Descargar manual de uso</a></p>` : ""}${payload.help_path ? `<p><a href="${escapeHtml(payload.help_path)}">Abrir centro de ayuda</a></p>` : ""}<h2 style="font-size:18px;margin-top:28px">Soporte</h2><p>${escapeHtml(payload.support_email || "Correo por confirmar")} · ${escapeHtml(payload.support_phone || payload.support_whatsapp || "Canal por confirmar")}<br/>${escapeHtml(payload.support_hours || "Horario por confirmar")}</p><h2 style="font-size:18px;margin-top:28px">Cobranza y depósito</h2><p><strong>${escapeHtml(payload.provider_legal_name || "Proveedor SaaS")}</strong>${payload.provider_rut ? ` · RUT ${escapeHtml(payload.provider_rut)}` : ""}<br/>${escapeHtml(payload.bank_name || "Banco por confirmar")} · ${escapeHtml(payload.account_type || "Tipo de cuenta por confirmar")}<br/>Titular: ${escapeHtml(payload.account_holder || "Por confirmar")}${payload.account_number ? `<br/>Cuenta: ${escapeHtml(payload.account_number)}` : ""}${payload.billing_email ? `<br/>Comprobantes: ${escapeHtml(payload.billing_email)}` : ""}</p><p style="font-size:12px;color:#64748b">${escapeHtml(payload.billing_legal_notice || "Los avisos de cobro no reemplazan una factura electrónica ni un DTE.")}</p><hr style="border:0;border-top:1px solid #e2e8f0;margin:28px 0"><p style="font-size:12px;color:#64748b">Si recibiste este correo por error, no utilices las credenciales y comunícate con soporte.</p></div></div></body></html>`;
}

Deno.serve(async (request) => {
  const corsHeaders = getCorsHeaders(request);
  const json = (body: unknown, status: number) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  if (request.method === "OPTIONS")
    return new Response(null, { status: 204, headers: corsHeaders });
  if (!isOriginAllowed(request)) return json({ error: "ORIGIN_NOT_ALLOWED" }, 403);
  if (request.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  try {
    const authHeader = request.headers.get("Authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    if (!token) return json({ error: "Sesión requerida." }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceKey) {
      return json({ error: "Configuración segura incompleta." }, 503);
    }
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser(token);
    if (userError || !userData.user) return json({ error: "Sesión inválida." }, 401);

    // Supabase SDK validates the JWT signature before exposing its claims.
    const { data: verifiedClaims, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || verifiedClaims?.claims?.aal !== "aal2") {
      return json({ error: "MFA_REQUIRED" }, 403);
    }
    const { data: owner, error: ownerError } = await userClient.rpc("is_platform_owner");
    if (ownerError || owner !== true) {
      return json({ error: "Sólo el dueño de la plataforma puede enviar onboarding." }, 403);
    }

    const payload = (await request.json()) as Payload;
    if (
      !payload?.tenant_id ||
      !payload.company_name ||
      !validEmail(payload.primary_email) ||
      !validHttpUrl(payload.access_path) ||
      (payload.help_path != null && payload.help_path !== "" && !validHttpUrl(payload.help_path)) ||
      (payload.manual_url != null && payload.manual_url !== "" && !validHttpUrl(payload.manual_url))
    ) {
      return json({ error: "Datos de onboarding incompletos o inválidos." }, 400);
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: delivery, error: deliveryError } = await admin
      .from("saas_onboarding_deliveries")
      .insert({
        tenant_id: payload.tenant_id,
        recipient_name: payload.contact_name || null,
        recipient_email: payload.primary_email.trim().toLowerCase(),
        subject: payload.subject.trim(),
        status: "queued",
        provider: "resend",
        created_by_email: userData.user.email || null,
      })
      .select("id")
      .single();
    if (deliveryError) return json({ error: "No se pudo registrar el envío." }, 500);

    const resendKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("ONBOARDING_FROM_EMAIL");
    if (!resendKey || !fromEmail) {
      await admin
        .from("saas_onboarding_deliveries")
        .update({ status: "failed", error_message: "Proveedor de correo no configurado." })
        .eq("id", delivery.id);
      return json(
        {
          error:
            "Proveedor de correo no configurado. Guarda el borrador y configura RESEND_API_KEY y ONBOARDING_FROM_EMAIL.",
        },
        503,
      );
    }

    const recipients = [
      payload.primary_email.trim().toLowerCase(),
      ...(payload.alternate_email && validEmail(payload.alternate_email)
        ? [payload.alternate_email.trim().toLowerCase()]
        : []),
    ];
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: fromEmail,
        to: recipients,
        subject: payload.subject.trim(),
        html: renderHtml(payload),
      }),
    });
    if (!response.ok) {
      const providerMessage = (await response.text()).slice(0, 500).replaceAll(/\s+/g, " ");
      await admin
        .from("saas_onboarding_deliveries")
        .update({
          status: "failed",
          error_message: providerMessage || "El proveedor rechazó el correo.",
        })
        .eq("id", delivery.id);
      return json(
        { error: "El proveedor de correo rechazó el envío. El borrador quedó disponible." },
        502,
      );
    }

    await admin
      .from("saas_onboarding_deliveries")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", delivery.id);
    return json({ ok: true, delivery_id: delivery.id }, 200);
  } catch {
    return json({ error: "No se pudo procesar el onboarding." }, 500);
  }
});
