import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  isOnline: vi.fn(),
  canSubmitActivityAudit: vi.fn(),
  markActivityAuditMfaRequired: vi.fn(),
}));

vi.mock("./supabase", () => ({
  supabase: { auth: { getSession: mocks.getSession } },
}));
vi.mock("@/hooks/useOnlineStatus", () => ({ isOnline: mocks.isOnline }));
vi.mock("./activityAuth", () => ({
  canSubmitActivityAudit: mocks.canSubmitActivityAudit,
  markActivityAuditMfaRequired: mocks.markActivityAuditMfaRequired,
  MFA_REQUIRED_MESSAGE: "MFA requerido",
}));

import { callEdgeFunction } from "./edgeFunctions";

describe("log-activity AAL1 allowlist", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    mocks.getSession.mockResolvedValue({ data: { session: { access_token: "aal1-token" } } });
    mocks.isOnline.mockReturnValue(true);
    mocks.canSubmitActivityAudit.mockReturnValue(false);
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fetchMock.mockReset();
  });

  it.each(["page_view", "page_time"])("allows only %s at AAL1", async (action) => {
    const result = await callEdgeFunction("log-activity", { action, entity: "navigation" });
    expect(result).toMatchObject({ data: { ok: true }, error: null });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("still requires MFA for generic audit events", async () => {
    const result = await callEdgeFunction("log-activity", {
      action: "worker.update",
      entity: "worker",
    });

    expect(result.errorCode).toBe("MFA_REQUIRED");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not allow a page event to bypass MFA for another entity", async () => {
    const result = await callEdgeFunction("log-activity", {
      action: "page_view",
      entity: "worker",
    });

    expect(result.errorCode).toBe("MFA_REQUIRED");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
