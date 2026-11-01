import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Payload = {
  tenant_id?: string | null;
  action?: string;
  entity?: string;
  entity_id?: string | null;
  entity_label?: string | null;
  details?: Record<string, unknown> | null;
};

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function firstForwardedIp(request: Request): string | null {
  const value =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return value?.trim() || null;
}

const SECRET_KEY = /(password|token|secret|credential|authorization|cookie|api[_-]?key)/i;
function safeValue(value: unknown, depth = 0): unknown {
  if (depth > 2) return "[truncated]";
  if (value === null || typeof value === "boolean" || typeof value === "number") return value;
  if (typeof value === "string") return value.slice(0, 500);
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => safeValue(item, depth + 1));
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([key]) => !SECRET_KEY.test(key))
        .slice(0, 40)
        .map(([key, item]) => [key.slice(0, 80), safeValue(item, depth + 1)]),
    );
  }
  return String(value).slice(0, 200);
}

function safeUuid(value: string | null | undefined): string | null {
  return value &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : null;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader) return json({ error: "Sesión requerida." }, 401);
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceKey)
      return json({ error: "Configuración server-side incompleta." }, 503);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) return json({ error: "Sesión inválida." }, 401);

    // Audit events are an administrative control and require an AAL2 session.
    const { data: aal, error: aalError } =
      await userClient.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aalError || aal?.currentLevel !== "aal2") return json({ error: "MFA_REQUIRED" }, 403);

    const payload = (await request.json()) as Payload;
    if (!payload.action?.trim() || !payload.entity?.trim())
      return json({ error: "action y entity son obligatorios." }, 400);
    const { data: isPlatformOwner } = await userClient.rpc("is_platform_owner");
    const { data: currentTenantId } = await userClient.rpc("current_tenant_id");
    const requestedTenant = safeUuid(payload.tenant_id);
    const tenantId =
      requestedTenant || (typeof currentTenantId === "string" ? currentTenantId : null);
    if (!tenantId) return json({ error: "TENANT_REQUIRED" }, 400);
    if (!isPlatformOwner && currentTenantId !== tenantId)
      return json({ error: "TENANT_BOUNDARY_VIOLATION" }, 403);

    const ip = firstForwardedIp(request);
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: decision, error: decisionError } = await admin.rpc("evaluate_saas_ip_access", {
      _tenant_id: tenantId,
      _ip: ip,
    });
    if (decisionError) return json({ error: "No se pudo evaluar la política de IP." }, 503);
    const policy = Array.isArray(decision) ? decision[0] : decision;
    if (!policy?.allowed) {
      await admin.from("saas_data_audit_events").insert({
        tenant_id: tenantId,
        actor_user_id: userData.user.id,
        action: "activity_log.denied_by_ip",
        resource_type: "activity_logs",
        classification: "security",
        outcome: "denied",
        ip_address: ip,
        user_agent: request.headers.get("user-agent"),
        metadata: { decision: policy?.decision ?? "deny", reason: policy?.reason ?? null },
      });
      return json({ error: "IP_NOT_ALLOWED" }, 403);
    }

    const { data: roleData } = await userClient.rpc("current_user_role");
    const { error: insertError } = await admin.from("activity_logs").insert({
      tenant_id: tenantId,
      // Identity is resolved from the validated JWT, never from browser input.
      user_email: userData.user.email || "unknown",
      action: payload.action.trim().slice(0, 120),
      entity: payload.entity.trim().slice(0, 80),
      entity_id: safeUuid(payload.entity_id),
      entity_label: payload.entity_label?.slice(0, 240) || null,
      details: payload.details ? safeValue(payload.details) : null,
      ip_hint: ip,
      user_agent: request.headers.get("user-agent"),
      user_role:
        typeof roleData === "string"
          ? roleData.slice(0, 80)
          : isPlatformOwner
            ? "platform_owner"
            : "tenant_user",
      // No session identifiers, fingerprint, cookies, GPS, referrer or viewport are persisted.
    });
    if (insertError) return json({ error: "No se pudo persistir el log." }, 500);
    return json({ ok: true, decision: policy.decision }, 200);
  } catch {
    return json({ error: "No se pudo registrar actividad." }, 500);
  }
});
