export interface ExistingTenantAuthorization {
  role: string;
  tenant_id: string | null;
  active: boolean | null;
}

/**
 * Tenant creation pre-authorizes its initial company owner before the Auth
 * identity is provisioned. Treat only that exact active row as idempotent;
 * never reuse an authorization for another role or tenant.
 */
export function isPreauthorizedCompanyOwner(
  existing: ExistingTenantAuthorization | null | undefined,
  requestedRole: string,
  tenantId: string,
): boolean {
  return (
    requestedRole === "company_owner" &&
    existing?.role === "company_owner" &&
    existing.tenant_id === tenantId &&
    existing.active === true
  );
}
