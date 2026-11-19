import { actorFrom, canGrantTenantRole, canManageAccount } from "./authz.ts";

const TENANT_ID = "tenant-a";

const developer = actorFrom({
  superadmin: false,
  platformOwner: true,
  role: "developer",
  email: "dev-a@example.com",
  tenantId: null,
  devTenantIds: [TENANT_ID],
});

const superadmin = actorFrom({
  superadmin: true,
  platformOwner: true,
  role: "superadmin",
  email: "root@example.com",
  tenantId: null,
});

const tenantUser = {
  isPlatform: false,
  isSuperadmin: false,
  tenantIds: [TENANT_ID],
};

const platformUser = {
  isPlatform: true,
  isSuperadmin: false,
  tenantIds: [TENANT_ID],
};

const expectDenied = (result: { ok: boolean; code?: string }, code: string) => {
  if (result.ok || result.code !== code) {
    throw new Error(`expected ${code}, received ${JSON.stringify(result)}`);
  }
};

Deno.test("developer manages an assigned tenant account", () => {
  const result = canManageAccount(developer, "admin@example.com", tenantUser);
  if (!result.ok) throw new Error(`expected allow, received ${JSON.stringify(result)}`);
});

Deno.test("developer cannot manage another developer or a superadmin", () => {
  expectDenied(
    canManageAccount(developer, "dev-b@example.com", platformUser),
    "PLATFORM_ACCOUNT_PROTECTED",
  );
  expectDenied(
    canManageAccount(developer, "root@example.com", {
      ...platformUser,
      isSuperadmin: true,
    }),
    "SUPERADMIN_PROTECTED",
  );
});

Deno.test("developer with no assigned tenant cannot use an empty target scope", () => {
  const result = canManageAccount(developer, "admin@example.com", {
    ...tenantUser,
    tenantIds: [],
  });
  expectDenied(result, "TENANT_ACCESS_DENIED");
});

Deno.test("only superadmin can grant platform roles", () => {
  expectDenied(canGrantTenantRole(developer, "developer"), "SUPERADMIN_REQUIRED");
  expectDenied(canGrantTenantRole(developer, "superadmin"), "SUPERADMIN_REQUIRED");
  if (!canGrantTenantRole(superadmin, "developer").ok) {
    throw new Error("superadmin should grant developer");
  }
  if (!canGrantTenantRole(superadmin, "superadmin").ok) {
    throw new Error("superadmin should grant superadmin");
  }
});
