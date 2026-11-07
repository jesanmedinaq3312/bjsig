import { describe, expect, it } from "vitest";
import { canAccessPermission } from "./roleAccess";

describe("platform access to tenant views", () => {
  it.each(["developer", "superadmin"])(
    "allows %s to open a tenant view in platform context",
    (role) => {
      expect(canAccessPermission("can_view_workers", {}, role, { platformContext: true })).toBe(
        true,
      );
    },
  );

  it("does not grant the platform bypass to tenant roles or without tenant context", () => {
    expect(canAccessPermission("can_view_workers", {}, "admin", { platformContext: true })).toBe(
      false,
    );
    expect(canAccessPermission("can_view_workers", {}, "developer")).toBe(false);
  });
});
