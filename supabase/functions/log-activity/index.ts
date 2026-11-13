import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders, isOriginAllowed } from "../_shared/auth.ts";
import { checkGpsSessionAccess } from "../_shared/gps-gate.ts";

type Payload = {
  tenant_id?: string | null;
  action?: string;
  entity?: string;
  entity_id?: string | null;
  entity_label?: string | null;
  details?: Record<string, unknown> | null;
  page_path?: string | null;
  session_duration?: number | null;
};

function json(request: Request, body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(request), "Content-Type": "application/json" },
  });
}

function firstForwardedIp(request: Request): string | null {
  const value = request.headers.get("cf-connecting-ip");
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

function verifiedSessionId(authHeader: string): string | null {
  const token = authHeader.match(/^Bearer\s+(.+)$/i)?.[1];
  const encodedPayload = token?.split(".")[1];
  if (!encodedPayload) return null;
  try {
    const normalized = encodedPayload.replace(/-/g, "+").replace(/_/g, "/");
    const claims = JSON.parse(atob(normalized)) as Record<string, unknown>;
    return safeUuid(typeof claims.session_id === "string" ? claims.session_id : null);
  } catch {
    return null;
  }
}

function safePagePath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const path = value.trim().split(/[?#]/, 1)[0];
  if (
    !path ||
    path.length > 240 ||
    !(
      path === "/worker/portal" ||
      path === "/platform/saas" ||
      path === "/unknown" ||
      /^\/admin\/[a-z0-9_-]{1,80}$/i.test(path)
    )
  ) {
    return null;
  }
  return path;
}

function isLimitedNavigationEvent(payload: Payload): boolean {
  return (
    payload.entity === "navigation" &&
    (payload.action === "page_view" || payload.action === "page_time")
  );
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: getCorsHeaders(request) });
  }
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader) return json(request, { error: "Sesión requerida." }, 401);
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceKey)
      return json(request, { error: "Configuración server-side incompleta." }, 503);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) return json(request, { error: "Sesión inválida." }, 401);

    const payload = (await request.json()) as Payload;
    if (!payload.action?.trim() || !payload.entity?.trim())
      return json(request, { error: "action y entity son obligatorios." }, 400);
    const limitedNavigationEvent = isLimitedNavigationEvent(payload);

    // Generic audit events remain AAL2-only. Only the allowlisted, minimal
    // page-view/time events are accepted at AAL1 for roles without mandatory MFA.
    const { data: aal, error: aalError } =
      await userClient.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aalError || (aal?.currentLevel !== "aal2" && !limitedNavigationEvent))
      return json(request, { error: "MFA_REQUIRED" }, 403);

    const gpsAccess = await checkGpsSessionAccess(userClient);
    if (!gpsAccess.allowed)
      return json(
        request,
        { error: gpsAccess.code },
        gpsAccess.code === "GPS_REQUIRED" ? 403 : 503,
      );

    const { data: platformOwnerData } = await userClient.rpc("is_platform_owner");
    const { data: currentTenantId } = await userClient.rpc("current_tenant_id");
    const isPlatformOwner = platformOwnerData === true;
    const requestedTenant = safeUuid(payload.tenant_id);
    const serverTenantId = typeof currentTenantId === "string" ? currentTenantId : null;
    const tenantId = limitedNavigationEvent ? serverTenantId : requestedTenant || serverTenantId;
    if (!tenantId && !isPlatformOwner) return json(request, { error: "TENANT_REQUIRED" }, 400);
    if (tenantId && !isPlatformOwner && currentTenantId !== tenantId)
      return json(request, { error: "TENANT_BOUNDARY_VIOLATION" }, 403);

    const ip = firstForwardedIp(request);
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: decision, error: decisionError } = await admin.rpc("evaluate_saas_ip_access", {
      _tenant_id: tenantId,
      _ip: ip,
    });
    if (decisionError)
      return json(request, { error: "No se pudo evaluar la política de IP." }, 503);
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
      return json(request, { error: "IP_NOT_ALLOWED" }, 403);
    }

    const { data: roleData } = await userClient.rpc("current_user_role");
    const pagePath = safePagePath(payload.page_path);
    const sessionDuration =
      typeof payload.session_duration === "number" && Number.isFinite(payload.session_duration)
        ? Math.max(0, Math.min(86400, Math.floor(payload.session_duration)))
        : null;
    const navigationReason = payload.details?.reason;
    const details = limitedNavigationEvent
      ? {
          event: payload.action,
          ...(payload.action === "page_time" && sessionDuration !== null
            ? { duration_seconds: sessionDuration }
            : {}),
          ...(typeof navigationReason === "string" &&
          [
            "tab_hidden",
            "route_change",
            "unload",
            "component_unmount",
            "identity_changed",
          ].includes(navigationReason)
            ? { reason: navigationReason }
            : {}),
        }
      : payload.details
        ? safeValue(payload.details)
        : null;
    const { error: insertError } = await admin.from("activity_logs").insert({
      tenant_id: tenantId,
      // Identity is resolved from the validated JWT, never from browser input.
      user_email: userData.user.email || "unknown",
      action: payload.action.trim().slice(0, 120),
      entity: payload.entity.trim().slice(0, 80),
      entity_id: limitedNavigationEvent ? null : safeUuid(payload.entity_id),
      entity_label: limitedNavigationEvent ? pagePath : payload.entity_label?.slice(0, 240) || null,
      details,
      ip_hint: ip,
      user_agent: request.headers.get("user-agent"),
      user_role:
        typeof roleData === "string"
          ? roleData.slice(0, 80)
          : isPlatformOwner
            ? "platform_owner"
            : "tenant_user",
      session_id: verifiedSessionId(authHeader),
      page_path: pagePath,
      session_duration: sessionDuration,
      // Deliberately omit persistent browser fingerprints, cookies, GPS, referrer and viewport.
    });
    if (insertError) return json(request, { error: "No se pudo persistir el log." }, 500);
    return json(request, { ok: true, decision: policy.decision }, 200);
  } catch {
    return json(request, { error: "No se pudo registrar actividad." }, 500);
  }
});
