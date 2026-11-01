import { describe, it as test } from "node:test";
import { strictEqual } from "node:assert";
import { generateTemporaryPassword, meetsPasswordPolicy } from "./passwordPolicy";

describe("Password policy", () => {
  test("generated temporary passwords always include all four character types", () => {
    for (let i = 0; i < 500; i++)
      strictEqual(meetsPasswordPolicy(generateTemporaryPassword()), true);
  });
  test("rejects a password without a symbol", () => {
    strictEqual(meetsPasswordPolicy("Abcdefg1"), false);
  });
});
