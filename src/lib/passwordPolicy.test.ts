import { describe, expect, it } from "vitest";
import { generateTemporaryPassword, meetsPasswordPolicy } from "./passwordPolicy";

describe("Password policy", () => {
  it("generated temporary passwords always include all four character types", () => {
    for (let i = 0; i < 500; i++) {
      expect(meetsPasswordPolicy(generateTemporaryPassword())).toBe(true);
    }
  });

  it("rejects a password without a symbol", () => {
    expect(meetsPasswordPolicy("Abcdefg1")).toBe(false);
  });

  it("accepts a password with an allowed symbol", () => {
    expect(meetsPasswordPolicy("Abcdef1!")).toBe(true);
  });

  it("does not treat whitespace as an allowed symbol", () => {
    expect(meetsPasswordPolicy("Abcdef1 ")).toBe(false);
  });

  it("rejects punctuation outside the configured symbol allowlist", () => {
    expect(meetsPasswordPolicy("Abcdef1/")).toBe(false);
  });
});
