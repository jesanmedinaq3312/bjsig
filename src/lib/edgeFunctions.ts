/**
 * Single unified helper for calling Supabase Edge Functions.
 * Every call validates the response and returns user-friendly error
 * messages instead of raw server internals.
 *
 * Supports:
 *  - callEdgeFunction: JSON POST with session token (default)
 *  - callEdgeFunctionGet: GET with session token
 *  - callEdgeFunctionAnon: POST with anon key (for public endpoints like worker-auth)
 *  - callEdgeFunctionStream: streaming via the Streams API
 *  - callEdgeFunctionKeepalive: POST with keepalive flag (for beforeunload)
 */

import { supabase } from "./supabase";
import { isOnline } from "@/hooks/useOnlineStatus";
import { friendlyError } from "./networkError";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./supabaseConfig";
import { RateLimitError } from "./rateLimit";
import {
  canSubmitActivityAudit,
  markActivityAuditMfaRequired,
  MFA_REQUIRED_MESSAGE,
} from "./activityAuth";

const BASE_URL = SUPABASE_URL;
const ANON_KEY = SUPABASE_ANON_KEY;

// register-device sigue deshabilitada hasta completar su contrato server-side.
// log-activity usa la función segura que captura IP en servidor y valida tenant.
const DISABLED_EDGE_FUNCTIONS = new Set(["register-device"]);

export interface EdgeFunctionResult<T> {
  data: T | null;
  error: string | null;
  errorCode?: "MFA_REQUIRED";
}

export interface EdgeFunctionOptions {
  /** Use anon key instead of session token (for public endpoints) */
  anon?: boolean;
  /** HTTP method, defaults to POST */
  method?: "GET" | "POST";
  /** Use keepalive flag for unload events */
  keepalive?: boolean;
  /** Cache-busting query param (for GET requests that must not be cached) */
  cacheBust?: boolean;
}

function buildHeaders(accessToken: string): Record<string, string> {
  // Las funciones del servidor exigen SIEMPRE el encabezado Authorization.
  // Con las claves nuevas (sb_publishable_/sb_secret_) el token va igual como
  // Bearer, además del apikey.
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
    apikey: ANON_KEY,
  };
}

function buildUrl(slug: string, cacheBust?: boolean): string {
  const url = `${BASE_URL}/functions/v1/${slug}`;
  return cacheBust ? `${url}?_=${Date.now()}` : url;
}

function isLimitedNavigationEvent(slug: string, body: Record<string, unknown>): boolean {
  return (
    slug === "log-activity" &&
    body.entity === "navigation" &&
    (body.action === "page_view" || body.action === "page_time")
  );
}

async function parseError(res: Response): Promise<EdgeFunctionResult<never>> {
  let serverMsg = "";
  const requestId = res.headers.get("x-request-id") ?? res.headers.get("x-trace-id") ?? "";
  try {
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const errBody = await res.json();
      serverMsg = errBody?.error ?? "";
    } else {
      const text = await res.text().catch(() => "");
      serverMsg = text.slice(0, 200) || "";
    }
  } catch {
    // response body wasn't parseable
  }

  const failure = (error: string): EdgeFunctionResult<never> => ({ data: null, error });
  if (res.status === 401) {
    return failure("Tu sesión ha expirado. Inicia sesión nuevamente.");
  }
  if (res.status === 403) {
    if (serverMsg === "MFA_REQUIRED") {
      return { data: null, error: MFA_REQUIRED_MESSAGE, errorCode: "MFA_REQUIRED" };
    }
    return failure("No tienes permisos para realizar esta acción.");
  }
  if (res.status === 503) {
    return failure(
      "Sin conexión. La petición fue encolada y se enviará cuando se recupere la red.",
    );
  }
  if (res.status === 429) {
    return failure(
      serverMsg ||
        "Se alcanzó el límite temporal de solicitudes. Espera un momento antes de reintentar.",
    );
  }
  const message = serverMsg || `La operación no pudo completarse (error ${res.status}).`;
  return failure(
    requestId
      ? `${message} Reintenta la operación. Código: ${requestId.slice(0, 12)}.`
      : `${message} Reintenta la operación.`,
  );
}

async function getSessionToken(): Promise<string | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  return sessionData?.session?.access_token ?? null;
}

/**
 * Calls an edge function by slug with a JSON POST body.
 * Attaches the current session's access token as Bearer.
 * Returns { data, error } — error is always a plain-language string.
 */
export async function callEdgeFunction<T = unknown>(
  slug: string,
  body: Record<string, unknown>,
  options?: EdgeFunctionOptions,
): Promise<EdgeFunctionResult<T>> {
  if (DISABLED_EDGE_FUNCTIONS.has(slug)) {
    return { data: null, error: null };
  }

  const method = options?.method ?? "POST";
  const useAnon = options?.anon ?? false;
  const keepalive = options?.keepalive ?? false;

  if (!useAnon && !isOnline()) {
    return {
      data: null,
      error: "Sin conexión. La petición se enviará automáticamente cuando se recupere la red.",
    };
  }

  try {
    const accessToken = useAnon ? ANON_KEY : await getSessionToken();
    if (!accessToken) {
      return {
        data: null,
        error: "No hay una sesión activa. Inicia sesión nuevamente.",
      };
    }

    // Only minimal navigation telemetry is permitted at AAL1. All other audit
    // events still require MFA; the server applies the same event allowlist.
    if (
      slug === "log-activity" &&
      !isLimitedNavigationEvent(slug, body) &&
      !canSubmitActivityAudit(accessToken)
    ) {
      return { data: null, error: MFA_REQUIRED_MESSAGE, errorCode: "MFA_REQUIRED" };
    }

    const fetchOptions: RequestInit = {
      method,
      headers: buildHeaders(accessToken),
    };

    if (method === "POST") {
      fetchOptions.body = JSON.stringify(body);
    }
    if (keepalive) {
      fetchOptions.keepalive = true;
    }
    const res = await fetch(buildUrl(slug, options?.cacheBust), fetchOptions);

    if (!res.ok) {
      const failure = await parseError(res);
      if (slug === "log-activity" && failure.errorCode === "MFA_REQUIRED") {
        markActivityAuditMfaRequired(accessToken);
      }
      return failure;
    }

    const json = (await res.json()) as T;
    return { data: json, error: null };
  } catch (err) {
    if (keepalive) return { data: null, error: null };
    return {
      data: null,
      error: useAnon
        ? friendlyError(err)
        : "No se pudo conectar con el servidor. Verifica tu conexión e intenta nuevamente.",
    };
  }
}

/**
 * GET request to an edge function with session token.
 */
export async function callEdgeFunctionGet<T = unknown>(
  slug: string,
  cacheBust = false,
): Promise<EdgeFunctionResult<T>> {
  return callEdgeFunction<T>(slug, {}, { method: "GET", cacheBust });
}

/**
 * POST request with anon key (for public endpoints like worker-auth).
 * Throws on error instead of returning { error } — matches the
 * callWorkerAuth pattern it replaces.
 */
export async function callEdgeFunctionAnon<T = unknown>(
  slug: string,
  body: Record<string, unknown>,
): Promise<T> {
  if (!isOnline()) {
    throw new Error("Sin conexión. Verifica tu conexión e intenta nuevamente.");
  }

  try {
    const res = await fetch(buildUrl(slug, true), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ANON_KEY}`,
        apikey: ANON_KEY,
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `El servidor respondió en formato inesperado (HTTP ${res.status}). ${text.slice(0, 200) || "Sin contenido adicional."}`,
      );
    }

    const data = (await res.json()) as Record<string, unknown>;
    if (!res.ok) {
      const message = typeof data?.error === "string" ? data.error : `Error ${res.status}`;
      if (res.status === 429) {
        throw new RateLimitError(message, res.headers.get("Retry-After"));
      }
      throw new Error(message);
    }
    return data as T;
  } catch (err) {
    if (err instanceof RateLimitError) throw err;
    throw new Error(friendlyError(err));
  }
}

/**
 * Fire-and-forget POST with keepalive — for beforeunload/page_hide events
 * where the request must survive page navigation.
 */
export function callEdgeFunctionKeepalive(slug: string, body: Record<string, unknown>): void {
  if (DISABLED_EDGE_FUNCTIONS.has(slug)) return;

  const apiUrl = buildUrl(slug);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    apikey: ANON_KEY,
  };
  // Try to use session token if available synchronously — but don't block
  supabase.auth
    .getSession()
    .then(({ data }) => {
      const token = data?.session?.access_token;
      if (!token) return;
      if (
        slug === "log-activity" &&
        !isLimitedNavigationEvent(slug, body) &&
        !canSubmitActivityAudit(token)
      )
        return;
      headers["Authorization"] = `Bearer ${token}`;
      fetch(apiUrl, {
        method: "POST",
        headers,
        keepalive: true,
        body: JSON.stringify(body),
      })
        .then((res) => {
          if (slug === "log-activity" && res.status === 403) {
            res
              .clone()
              .json()
              .then((b) => {
                if (b?.error === "MFA_REQUIRED") markActivityAuditMfaRequired(token);
              })
              .catch(() => {});
          }
        })
        .catch(() => {});
    })
    .catch(() => {});
}

/**
 * Streaming edge function call using the Streams API.
 * Processes response chunks as they arrive — useful for long-running
 * operations where waiting for the full response would freeze the UI.
 */
export async function callEdgeFunctionStream(
  slug: string,
  body: Record<string, unknown>,
  onChunk: (text: string) => void,
  signal?: AbortSignal,
): Promise<EdgeFunctionResult<string>> {
  if (!isOnline()) {
    return {
      data: null,
      error: "Sin conexión. El streaming requiere una conexión activa.",
    };
  }

  try {
    const accessToken = await getSessionToken();
    if (!accessToken) {
      return {
        data: null,
        error: "No hay una sesión activa. Inicia sesión nuevamente.",
      };
    }

    const res = await fetch(buildUrl(slug), {
      method: "POST",
      headers: {
        ...buildHeaders(accessToken),
        Accept: "text/event-stream",
      },
      body: JSON.stringify(body),
      signal,
    });

    if (!res.ok) {
      return await parseError(res);
    }

    const reader = res.body?.getReader();
    if (!reader) {
      const text = await res.text();
      onChunk(text);
      return { data: text, error: null };
    }

    const decoder = new TextDecoder();
    let fullText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      fullText += chunk;
      onChunk(chunk);
    }

    const final = decoder.decode();
    if (final) {
      fullText += final;
      onChunk(final);
    }

    return { data: fullText, error: null };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return { data: null, error: null };
    }
    return {
      data: null,
      error: "No se pudo conectar con el servidor. Verifica tu conexión e intenta nuevamente.",
    };
  }
}
