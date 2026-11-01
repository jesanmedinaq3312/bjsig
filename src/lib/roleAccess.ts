import { effectivePermission, isPlatformRole, type PermissionMap } from "@/lib/authorization";

export type RolePermissions = PermissionMap | undefined;
export { isPlatformRole };

export function canAccessPermission(
  requiredPermission: string | undefined,
  permissions: RolePermissions,
  role: string | null | undefined,
  context: {
    planModules?: PermissionMap;
    overrides?: PermissionMap;
    tenantActive?: boolean;
    platformContext?: boolean;
  } = {},
): boolean {
  return effectivePermission(requiredPermission, { role, permissions, ...context });
}

export function canRenderNavItem(
  requiredPermission: string | undefined,
  permissions: RolePermissions,
  role: string | null | undefined,
  moduleEnabled = true,
  context: {
    planModules?: PermissionMap;
    overrides?: PermissionMap;
    tenantActive?: boolean;
    platformContext?: boolean;
  } = {},
): boolean {
  return moduleEnabled && canAccessPermission(requiredPermission, permissions, role, context);
}
