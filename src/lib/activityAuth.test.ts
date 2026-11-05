import { describe, expect, it } from "vitest";
import {
  canSubmitActivityAudit,
  hasActivityAuditAssurance,
  markActivityAuditMfaRequired,
} from "./activityAuth";

const token = (aal?: string) => `header.${btoa(JSON.stringify({ aal }))}.signature`;

describe("Activity audit MFA preflight", () => {
  it("does not submit audit events with an AAL1 session", () => {
    expect(hasActivityAuditAssurance(token("aal1"))).toBe(false);
  });

  it("resumes submissions with the upgraded AAL2 token", () => {
    expect(hasActivityAuditAssurance(token("aal2"))).toBe(true);
  });

  it("does not submit with missing or malformed assurance", () => {
    expect(hasActivityAuditAssurance(token())).toBe(false);
    expect(hasActivityAuditAssurance("invalid")).toBe(false);
  });

  it("stops resending with a token the server rejected, then resumes with a refreshed token", () => {
    const rejected = `header.${btoa(JSON.stringify({ aal: "aal2", n: 1 }))}.sig`;
    const refreshed = `header.${btoa(JSON.stringify({ aal: "aal2", n: 2 }))}.sig`;
    expect(canSubmitActivityAudit(rejected)).toBe(true);
    markActivityAuditMfaRequired(rejected);
    expect(canSubmitActivityAudit(rejected)).toBe(false);
    expect(canSubmitActivityAudit(refreshed)).toBe(true);
  });
});
