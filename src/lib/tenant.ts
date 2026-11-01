import { supabase } from "@/lib/supabase";
import { normalizeModuleMap, type PermissionMap } from "@/lib/authorization";

export type TenantStatus = "pendiente" | "activa" | "suspendida" | "cortada";
export interface TenantSummary {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  is_active: boolean;
}
export interface TenantSettings {
  tenant_id: string;
  plan: string;
  plan_id?: string | null;
  modules: Record<string, boolean>;
  plan_modules?: Record<string, boolean>;
  overrides?: Record<string, boolean>;
  permissions?: PermissionMap;
  role?: string;
  max_users: number | null;
  default_view: string;
}
export interface TenantContextValue {
  tenantId: string | null;
  tenant: TenantSummary | null;
  tenants: TenantSummary[];
  settings: TenantSettings | null;
  isSuperadmin: boolean;
  isImpersonating: boolean;
  loading: boolean;
  moduleEnabled: (key: string) => boolean;
  permissionEnabled: (key?: string) => boolean;
  switchTenant: (tenantId: string, reason?: string) => Promise<void>;
  reload: () => Promise<void>;
}

const ACTIVE_TENANT_CACHE_KEY = "bjsigapp.active-tenant";
const DEFAULT_VIEW_CACHE_PREFIX = "bjsigapp.default-view.";
export const SAFE_DEFAULT_VIEW = "dashboard";
function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "empresa"
  );
}
function readCache(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeCache(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private browsing */
  }
}

/** La caché sólo acelera el arranque; el acceso real siempre se valida por RPC/RLS. */
export async function fetchMyTenants(platformOperator = false): Promise<TenantSummary[]> {
  const normalize = (rows: Array<Record<string, unknown>>): TenantSummary[] =>
    rows.map((t) => ({
      id: String(t.id ?? t.tenant_id),
      name: String(t.name ?? t.tenant_name),
      slug: String(t.slug ?? t.tenant_slug ?? slugify(String(t.name ?? t.tenant_name))),
      status: (t.is_active ?? t.tenant_active ?? t.active) ? "activa" : "suspendida",
      is_active: Boolean(t.is_active ?? t.tenant_active ?? t.active),
    }));
  // Los operadores de plataforma deben ver todas las empresas activas, no sólo
  // las memberships que tengan provisionadas en `my_tenants`.
  if (platformOperator) {
    const { data: overview } = await supabase.rpc("fetch_saas_tenant_overview");
    if (Array.isArray(overview)) return normalize(overview as Array<Record<string, unknown>>);
  }

  const { data, error } = await supabase.rpc("my_tenants");
  if (!error && Array.isArray(data)) {
    const rows = normalize(data as Array<Record<string, unknown>>);
    const { data: overview } = await supabase.rpc("fetch_saas_tenant_overview");
    return Array.isArray(overview) && overview.length > rows.length ? normalize(overview) : rows;
  }
  const { data: overview } = await supabase.rpc("fetch_saas_tenant_overview");
  if (Array.isArray(overview) && overview.length) return normalize(overview);
  const { data: tid } = await supabase.rpc("current_tenant_id");
  if (!tid) return [];
  const { data: row } = await supabase
    .from("tenants")
    .select("id, name, slug, active")
    .eq("id", tid as string)
    .maybeSingle();
  return row ? normalize([row as Record<string, unknown>]) : [];
}
export async function fetchIsSuperadmin(): Promise<boolean> {
  const { data, error } = await supabase.rpc("is_superadmin");
  return !error && data === true;
}
export async function fetchActiveTenantId(): Promise<string | null> {
  const { data, error } = await supabase.rpc("current_tenant_id");
  return error
    ? readCache(ACTIVE_TENANT_CACHE_KEY)
    : ((data as string | null) ?? readCache(ACTIVE_TENANT_CACHE_KEY));
}
export async function fetchTenantSettings(tenantId: string): Promise<TenantSettings | null> {
  const { data, error } = await supabase.rpc("get_effective_tenant_access", {
    _tenant_id: tenantId,
  });
  if (error || !data) return null;
  const row = (Array.isArray(data) ? data[0] : data) as Record<string, unknown>;
  if (!row) return null;
  const overrideMap = normalizeModuleMap((row.overrides as Record<string, boolean>) ?? {});
  const planModules = normalizeModuleMap((row.plan_features as Record<string, boolean>) ?? {});
  const effectiveModules = normalizeModuleMap(
    (row.effective_modules as Record<string, boolean>) ?? {},
  );
  const defaultView = String(
    row.default_view ?? readCache(`${DEFAULT_VIEW_CACHE_PREFIX}${tenantId}`) ?? SAFE_DEFAULT_VIEW,
  );
  writeCache(`${DEFAULT_VIEW_CACHE_PREFIX}${tenantId}`, defaultView);
  return {
    tenant_id: String(row.tenant_id),
    plan: String(row.plan_code ?? "basico"),
    plan_id: row.plan_id as string | null,
    modules: effectiveModules,
    plan_modules: planModules,
    overrides: overrideMap,
    permissions: (row.permissions as PermissionMap) ?? {},
    role: String(row.role ?? "guest"),
    max_users: (row.max_users as number | null) ?? null,
    default_view: defaultView,
  };
}
export async function setActiveTenant(
  tenantId: string,
  reason?: string,
  platformOperator = false,
): Promise<void> {
  // El selector normal valida la membresía local. DevTeam/superadmin usa la
  // autorización del RPC server-side para tenants administrados que pueden no
  // estar incluidos en `my_tenants`.
  if (!platformOperator) {
    const target = (await fetchMyTenants()).find((tenant) => tenant.id === tenantId);
    if (!target || !target.is_active) throw new Error("Empresa no disponible para esta sesión");
  }
  const { error } = await supabase.rpc("set_active_tenant", {
    _tenant_id: tenantId,
    _reason: reason ?? null,
  });
  if (error) throw new Error(error.message);
  writeCache(ACTIVE_TENANT_CACHE_KEY, tenantId);
}
export async function clearActiveTenant(): Promise<void> {
  await supabase.rpc("clear_active_tenant");
  try {
    localStorage.removeItem(ACTIVE_TENANT_CACHE_KEY);
  } catch {
    /* ignore */
  }
}
export async function isImpersonatingTenant(): Promise<boolean> {
  const { data } = await supabase
    .from("active_tenant_sessions")
    .select("is_impersonation")
    .maybeSingle();
  return (data as { is_impersonation?: boolean } | null)?.is_impersonation === true;
}
export { slugify };
