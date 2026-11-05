import { isPreauthorizedCompanyOwner } from "../_shared/provisioning.ts";

const TENANT_ID = "00000000-0000-4000-8000-000000000001";
const OTHER_TENANT_ID = "00000000-0000-4000-8000-000000000002";

Deno.test("accepts only an active company_owner already authorized for this tenant", () => {
  const result = isPreauthorizedCompanyOwner(
    { role: "company_owner", tenant_id: TENANT_ID, active: true },
    "company_owner",
    TENANT_ID,
  );
  equal(result, true, "matching preauthorization is idempotent");
});

Deno.test("rejects a preauthorization for another tenant", () => {
  const result = isPreauthorizedCompanyOwner(
    { role: "company_owner", tenant_id: OTHER_TENANT_ID, active: true },
    "company_owner",
    TENANT_ID,
  );
  equal(result, false, "cross-tenant authorization is not reusable");
});

Deno.test("rejects a different role or inactive authorization", () => {
  equal(
    isPreauthorizedCompanyOwner(
      { role: "admin", tenant_id: TENANT_ID, active: true },
      "admin",
      TENANT_ID,
    ),
    false,
    "other roles remain duplicate errors",
  );
  equal(
    isPreauthorizedCompanyOwner(
      { role: "company_owner", tenant_id: TENANT_ID, active: false },
      "company_owner",
      TENANT_ID,
    ),
    false,
    "inactive authorization is not reusable",
  );
});

function equal(actual: unknown, expected: unknown, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)}, received ${String(actual)}`);
  }
}
