export type ActorKind = "superadmin" | "developer" | "tenant";
export interface Actor {
  kind: ActorKind;
  email: string;
  role: string;
  tenantId: string | null;
  devTenantIds: string[];
}
export type Decision = { ok: true } | { ok: false; status: number; code: string };
export type TenantDecision =
  { ok: true; tenantId: string } | { ok: false; status: number; code: string };
const allow: Decision = { ok: true };
const deny = (code: string, status = 403): Decision => ({ ok: false, status, code });
export const TENANT_ROLES = [
  "company_owner",
  "admin",
  "human_resources",
  "manager",
  "prevencionista",
  "operador",
];
export const USER_MANAGER_ROLES = ["company_owner", "admin", "human_resources"];
const RANK: Record<string, number> = {
  company_owner: 50,
  admin: 40,
  human_resources: 30,
  manager: 10,
  prevencionista: 10,
  operador: 10,
};
export const isPlatform = (a: Actor) => a.kind !== "tenant";
export function actorFrom(i: {
  superadmin: boolean;
  platformOwner: boolean;
  role: string;
  email: string;
  tenantId: string | null;
  devTenantIds?: string[];
}): Actor {
  const kind: ActorKind = i.superadmin
    ? "superadmin"
    : i.platformOwner || i.role === "developer"
      ? "developer"
      : "tenant";
  return {
    kind,
    email: i.email.trim().toLowerCase(),
    role: i.role,
    tenantId: i.tenantId,
    devTenantIds: i.devTenantIds ?? [],
  };
}
export function canUseUserAdmin(a: Actor): Decision {
  if (isPlatform(a)) return allow;
  return USER_MANAGER_ROLES.includes(a.role) ? allow : deny("ADMIN_ROLE_REQUIRED");
}
export function resolveTenant(a: Actor, requested: unknown): TenantDecision {
  const req = typeof requested === "string" && requested.trim() ? requested.trim() : null;
  if (a.kind === "superadmin") {
    const t = req ?? a.tenantId;
    return t ? { ok: true, tenantId: t } : { ok: false, status: 400, code: "TENANT_REQUIRED" };
  }
  if (a.kind === "developer") {
    const t = req ?? a.tenantId;
    if (!t) return { ok: false, status: 400, code: "TENANT_REQUIRED" };
    return a.devTenantIds.includes(t)
      ? { ok: true, tenantId: t }
      : { ok: false, status: 403, code: "TENANT_ACCESS_DENIED" };
  }
  if (!a.tenantId) return { ok: false, status: 403, code: "TENANT_REQUIRED" };
  if (req && req !== a.tenantId)
    return { ok: false, status: 403, code: "TENANT_BOUNDARY_VIOLATION" };
  return { ok: true, tenantId: a.tenantId };
}
export function canGrantTenantRole(a: Actor, target: string): Decision {
  if (target === "developer" || target === "superadmin")
    return a.kind === "superadmin" ? allow : deny("SUPERADMIN_REQUIRED");
  if (!TENANT_ROLES.includes(target)) return deny("ROLE_NOT_ALLOWED");
  if (isPlatform(a)) return allow;
  if (target === "company_owner") return deny("PLATFORM_ROLE_REQUIRED");
  if (a.role === "human_resources") return target === "operador" ? allow : deny("ROLE_ESCALATION");
  return (RANK[target] ?? 99) < (RANK[a.role] ?? 0) ? allow : deny("ROLE_ESCALATION");
}
export function canManageAccount(
  a: Actor,
  targetEmail: string,
  target: { isPlatform: boolean; isSuperadmin: boolean; tenantIds: string[] },
): Decision {
  if (!isPlatform(a)) return deny("PLATFORM_ROLE_REQUIRED");
  if (targetEmail.trim().toLowerCase() === a.email) return deny("SELF_MODIFICATION_FORBIDDEN");
  if (target.isSuperadmin && a.kind !== "superadmin") return deny("SUPERADMIN_PROTECTED");
  if (target.isPlatform) {
    return a.kind === "superadmin" ? allow : deny("PLATFORM_ACCOUNT_PROTECTED");
  }
  if (a.kind === "superadmin") return allow;
  if (target.tenantIds.length === 0) return deny("TENANT_ACCESS_DENIED");
  return target.tenantIds.every((t) => a.devTenantIds.includes(t))
    ? allow
    : deny("TENANT_ACCESS_DENIED");
}
export function canResetExistingIdentity(
  a: Actor,
  targetEmail: string,
  target: { isPlatform: boolean; isSuperadmin: boolean; tenantIds: string[] },
): Decision {
  if (!isPlatform(a)) return deny("IDENTITY_EXISTS", 409);
  return canManageAccount(a, targetEmail, target);
}
export function listScope(a: Actor): { all: true } | { all: false; tenantIds: string[] } | null {
  if (a.kind === "superadmin") return { all: true };
  if (a.kind === "developer") return { all: false, tenantIds: a.devTenantIds };
  return null;
}
export function canWriteActivity(
  a: Actor,
  requested: unknown,
  mfaRequired: boolean,
  aal: string | null | undefined,
): TenantDecision {
  if (mfaRequired && aal !== "aal2") return { ok: false, status: 403, code: "MFA_REQUIRED" };
  return resolveTenant(a, requested);
}
export function canSendOnboarding(a: Actor, tenantId: unknown): Decision {
  if (!isPlatform(a)) return deny("PLATFORM_ROLE_REQUIRED");
  const r = resolveTenant(a, tenantId);
  return r.ok ? allow : deny(r.code, r.status);
}
export const isHttpUrl = (v: unknown) =>
  typeof v === "string" && /^https?:\/\/\S+$/i.test(v.trim());
