import { SupabaseClient, createClient } from "npm:@supabase/supabase-js@2";

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

export function extractBearer(authHeader: string | null): string {
  if (!authHeader?.startsWith("Bearer ")) {
    throw new AuthError("Missing or invalid Authorization header", 401);
  }
  return authHeader.replace("Bearer ", "");
}

export function requireAuthentication(token: string, anonKey: string): void {
  if (!token || token === anonKey) {
    throw new AuthError("Unauthenticated: requires valid session", 401);
  }
}

export function createUserClient(
  supabaseUrl: string,
  anonKey: string,
  jwt: string,
): SupabaseClient {
  return createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
}

export async function requireAdmin(userClient: SupabaseClient): Promise<void> {
  const { data, error } = await userClient.rpc("is_admin");
  if (error || !data) {
    throw new AuthError("Forbidden: admin role required", 403);
  }
}

export async function requirePermission(
  userClient: SupabaseClient,
  permission: string,
): Promise<void> {
  const { data, error } = await userClient.rpc("check_permission", {
    p_permission: permission,
  });
  if (error || !data) {
    throw new AuthError(`Forbidden: ${permission} required`, 403);
  }
}

export async function resolveCallerEmail(userClient: SupabaseClient): Promise<string> {
  const { data, error } = await userClient.auth.getUser();
  if (error || !data?.user?.email) {
    throw new AuthError("Cannot resolve caller identity", 401);
  }
  return data.user.email;
}

export async function resolveTenantId(userClient: SupabaseClient): Promise<string> {
  const { data, error } = await userClient.rpc("current_tenant_id");
  if (error || !data) {
    throw new AuthError("Cannot resolve tenant from session", 403);
  }
  return data as string;
}

export async function resolveIsSuperadmin(userClient: SupabaseClient): Promise<boolean> {
  const { data, error } = await userClient.rpc("is_superadmin");
  if (error) return false;
  return data === true;
}

export async function requireAuth(
  req: Request,
  options: { requireAdmin?: boolean; requirePermission?: string } = {},
): Promise<{ token: string; userClient: SupabaseClient; email: string; tenantId: string }> {
  const authHeader = req.headers.get("Authorization");
  const token = extractBearer(authHeader);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  requireAuthentication(token, anonKey);

  const userClient = createUserClient(supabaseUrl, anonKey, token);

  if (options.requireAdmin) {
    await requireAdmin(userClient);
  }
  if (options.requirePermission) {
    await requirePermission(userClient, options.requirePermission);
  }

  const email = await resolveCallerEmail(userClient);
  const tenantId = await resolveTenantId(userClient);

  return { token, userClient, email, tenantId };
}

const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";

function resolveOrigin(req: Request): string | null {
  const origin = req.headers.get("Origin");
  if (!origin) return null;
  if (ALLOWED_ORIGINS.length > 0) {
    return ALLOWED_ORIGINS.includes(origin) ? origin : null;
  }
  // No allowlist configured — fail closed for security.
  // Requests without an Origin header (same-origin, curl) still work;
  // cross-origin browser requests are rejected.
  return null;
}

export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = resolveOrigin(req);
  return {
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
  };
}

export function authErrorResponse(err: unknown, req?: Request): Response {
  const corsH = req
    ? getCorsHeaders(req)
    : {
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
      };
  if (err instanceof AuthError) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: err.status,
      headers: { ...corsH, "Content-Type": "application/json" },
    });
  }
  return new Response(JSON.stringify({ error: "Internal server error" }), {
    status: 500,
    headers: { ...corsH, "Content-Type": "application/json" },
  });
}
