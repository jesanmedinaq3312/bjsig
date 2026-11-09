import { beforeEach, describe, expect, it, vi } from "vitest";

const { callEdgeFunctionAnon } = vi.hoisted(() => ({
  callEdgeFunctionAnon: vi.fn(),
}));

vi.mock("@/lib/edgeFunctions", () => ({ callEdgeFunctionAnon }));

import { callWorkerAuth } from "./api";

describe("worker auth requests", () => {
  beforeEach(() => {
    callEdgeFunctionAnon.mockReset();
    callEdgeFunctionAnon.mockResolvedValue({ success: true });
  });

  it("sends the requested action and payload without CAPTCHA tokens", async () => {
    await callWorkerAuth("check_rut", { rut: "12345678-9" });

    expect(callEdgeFunctionAnon).toHaveBeenCalledOnce();
    expect(callEdgeFunctionAnon).toHaveBeenCalledWith("worker-auth", {
      action: "check_rut",
      rut: "12345678-9",
    });
  });

  it("does not add CAPTCHA fields to recovery or password actions", async () => {
    await callWorkerAuth("request_reset", { email: "worker@example.test" });
    await callWorkerAuth("set_initial_password", { email: "worker@example.test" });
    await callWorkerAuth("change_password", { current_password: "synthetic" });

    for (const [, payload] of callEdgeFunctionAnon.mock.calls) {
      expect(payload).not.toHaveProperty("captcha_token");
      expect(payload).not.toHaveProperty("auth_captcha_token");
    }
  });
});
