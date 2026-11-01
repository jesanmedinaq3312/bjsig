import { describe, it as test } from "node:test";
import { strictEqual } from "node:assert";
import { hasActivityAuditAssurance } from "./activityAuth";

const token = (aal?: string) => `header.${btoa(JSON.stringify({ aal }))}.signature`;

describe("Activity audit MFA preflight", () => {
  test("does not submit audit events with an AAL1 session", () => {
    strictEqual(hasActivityAuditAssurance(token("aal1")), false);
  });
  test("resumes submissions with the upgraded AAL2 token", () => {
    strictEqual(hasActivityAuditAssurance(token("aal2")), true);
  });
  test("does not submit with missing or malformed assurance", () => {
    strictEqual(hasActivityAuditAssurance(token()), false);
    strictEqual(hasActivityAuditAssurance("invalid"), false);
  });
});
describe("Activity audit server MFA rejection", () => {
  test("stops resending with a token the server rejected, resumes with a new one", async () => {
    const { canSubmitActivityAudit, markActivityAuditMfaRequired } = await import("./activityAuth");
    const rejected = `header.${btoa(JSON.stringify({ aal: "aal2", n: 1 }))}.sig`;
    const refreshed = `header.${btoa(JSON.stringify({ aal: "aal2", n: 2 }))}.sig`;
    strictEqual(canSubmitActivityAudit(rejected), true);
    markActivityAuditMfaRequired(rejected);
    strictEqual(canSubmitActivityAudit(rejected), false);
    strictEqual(canSubmitActivityAudit(refreshed), true);
  });
});
