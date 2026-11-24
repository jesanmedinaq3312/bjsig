import { describe, expect, it } from "vitest";
import { validateCatalogInput } from "./saasDataCatalog.functions";

describe("validateCatalogInput", () => {
  it("allows omitted or null tenantId for global platform catalog reads", () => {
    expect(validateCatalogInput()).toEqual({ tenantId: null });
    expect(validateCatalogInput({ tenantId: null })).toEqual({ tenantId: null });
  });

  it("accepts a valid UUID tenantId", () => {
    const id = "550e8400-e29b-41d4-a716-446655440000";
    expect(validateCatalogInput({ tenantId: id })).toEqual({ tenantId: id });
  });

  it("rejects non-UUID or malformed tenantId inputs", () => {
    expect(() => validateCatalogInput({ tenantId: "not-a-uuid" })).toThrow("INVALID_TENANT_ID");
    expect(() => validateCatalogInput({ tenantId: "'; DROP TABLE tenants;--" })).toThrow(
      "INVALID_TENANT_ID",
    );
  });
});
