const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

function configuredOrigin(origin: string): string | null {
  try {
    const parsed = new URL(origin);
    if ((parsed.protocol !== "http:" && parsed.protocol !== "https:") || parsed.origin !== origin) {
      return null;
    }
    return ALLOWED_ORIGINS.includes(origin) ? origin : null;
  } catch {
    return null;
  }
}

export function isOriginAllowed(request: Request): boolean {
  const origin = request.headers.get("Origin");
  // Non-browser/service-to-service requests do not participate in CORS.
  return origin === null || configuredOrigin(origin) !== null;
}

export function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("Origin");
  const allowedOrigin = origin ? configuredOrigin(origin) : null;
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, X-Client-Info, Apikey, Content-Type",
    Vary: "Origin",
  };
  if (allowedOrigin) headers["Access-Control-Allow-Origin"] = allowedOrigin;
  return headers;
}
