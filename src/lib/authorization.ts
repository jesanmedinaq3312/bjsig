export type PermissionMap = Record<string, boolean>;
export type ModuleMap = Record<string, boolean>;

export const PLATFORM_ROLES = new Set(["superadmin", "developer"]);
export const OPERATIONAL_ROLES = new Set([
  "company_owner",
  "admin",
  "manager",
  "human_resources",
  "prevencionista",
  "operador",
  "finance",
  "accounting",
]);

/** Todas las fuentes históricas terminan en la clave interna de vista. */
export function normalizeModuleKey(value: string): string {
  const key = value
    .trim()
    .toLowerCase()
    .replace(/^can_view_/, "");
  const aliases: Record<string, string> = {
    finance: "extendedfinance",
    extended_finance: "extendedfinance",
    medical_licenses: "medicallicenses",
    epp_warehouse: "eppwarehouse",
    security_talks: "securitytalks",
    harassment_reports: "harassmentreports",
    security_breaches: "securitybreaches",
    compliance: "compliancedocs",
    iper: "ipermatrix",
  };
  return aliases[key] ?? key;
}

export function normalizeModuleMap(value: Record<string, boolean> | null | undefined): ModuleMap {
  const result: ModuleMap = {};
  for (const [key, enabled] of Object.entries(value ?? {})) {
    result[normalizeModuleKey(key)] = enabled === true;
  }
  return result;
}

export function isPlatformRole(role: string | null | undefined): boolean {
  return !!role && PLATFORM_ROLES.has(role);
}

/**
 * Una identidad puede tener ficha de trabajador y permisos operativos a la vez.
 * La ruta permite elegir la superficie; los RPC/RLS siguen siendo la autoridad.
 */
export function hasOperationalAccess(
  role: string | null | undefined,
  permissions?: PermissionMap | null,
): boolean {
  if (role && (PLATFORM_ROLES.has(role) || OPERATIONAL_ROLES.has(role))) return true;
  return Object.entries(permissions ?? {}).some(
    ([key, enabled]) => enabled === true && /^(can_view_|can_edit_|can_manage_)/.test(key),
  );
}

/** Precedencia UI: RLS/RPC ya autorizó el actor; luego tenant, rol, permiso, plan, override. */
export function effectiveModuleEnabled(
  moduleKey: string,
  input: {
    role?: string | null;
    permissions?: PermissionMap;
    planModules?: ModuleMap;
    overrides?: ModuleMap;
    tenantActive?: boolean;
    platformContext?: boolean;
  },
): boolean {
  if (!input.tenantActive && !input.platformContext) return false;
  if (input.platformContext && isPlatformRole(input.role)) return true;
  const key = normalizeModuleKey(moduleKey);
  const permissionKey = `can_view_${key}`;
  const roleAllows =
    isPlatformRole(input.role) ||
    input.permissions?.[permissionKey] === true ||
    input.permissions?.[key] === true;
  const planAllows = input.planModules?.[key] === true;
  const override = input.overrides?.[key];
  return roleAllows && (override === undefined ? planAllows : override === true);
}

export function effectivePermission(
  permissionKey: string | undefined,
  input: {
    role?: string | null;
    permissions?: PermissionMap;
    planModules?: ModuleMap;
    overrides?: ModuleMap;
    tenantActive?: boolean;
    platformContext?: boolean;
  },
): boolean {
  if (!permissionKey) return true;
  if (input.platformContext && isPlatformRole(input.role)) return true;
  const moduleKey = normalizeModuleKey(permissionKey);
  return effectiveModuleEnabled(moduleKey, input) || input.permissions?.[permissionKey] === true;
}

export function authorizationErrorMessage(error: unknown): string {
  const message = String(
    (error as { message?: string } | null)?.message ?? error ?? "",
  ).toLowerCase();
  if (message.includes("platform_role_required"))
    return "Acceso rechazado: se requiere rol de plataforma.";
  if (
    message.includes("tenant_access_denied") ||
    message.includes("row-level security") ||
    message.includes("42501")
  )
    return "Acceso rechazado por RLS o por falta de acceso al tenant.";
  if (message.includes("plan_not_found")) return "El plan solicitado no existe o está inactivo.";
  if (message.includes("persistence_error"))
    return "No se pudo completar la persistencia transaccional del cambio.";
  return String(
    (error as { message?: string } | null)?.message ?? "No se pudo completar la operación.",
  );
}
