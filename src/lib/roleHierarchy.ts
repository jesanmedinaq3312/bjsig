import type { AccessRole } from "./types";

export type TenantStaffRole = Exclude<AccessRole, "worker" | "developer" | "superadmin">;

export const TENANT_STAFF_ROLES: TenantStaffRole[] = [
  "company_owner",
  "human_resources",
  "admin",
  "manager",
  "prevencionista",
  "operador",
];

export const COMPANY_OWNER_ROLES: Exclude<
  AccessRole,
  "worker" | "developer" | "superadmin" | "company_owner"
>[] = ["human_resources", "operador", "prevencionista"];

export function canProvisionTenantRole(actor: string | null | undefined, target: string): boolean {
  if (actor === "developer" || actor === "superadmin")
    return TENANT_STAFF_ROLES.includes(target as (typeof TENANT_STAFF_ROLES)[number]);
  if (actor === "company_owner" || actor === "admin")
    return COMPANY_OWNER_ROLES.includes(target as (typeof COMPANY_OWNER_ROLES)[number]);
  return target === "operador" && actor === "human_resources";
}

export function canManageWorkers(
  role: string | null | undefined,
  permissions?: Record<string, boolean>,
): boolean {
  if (role === "worker" || !role) return false;
  return role === "developer" || role === "superadmin" || permissions?.can_edit_workers === true;
}
