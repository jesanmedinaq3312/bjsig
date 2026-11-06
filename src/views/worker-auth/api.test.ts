import { beforeEach, describe, expect, it, vi } from "vitest";

const { callEdgeFunctionAnon, getTurnstileToken } = vi.hoisted(() => ({
  callEdgeFunctionAnon: vi.fn(),
  getTurnstileToken: vi.fn(),
}));

vi.mock("@/lib/edgeFunctions", () => ({ callEdgeFunctionAnon }));
vi.mock("@/lib/turnstile", () => ({ getTurnstileToken }));

import { callWorkerAuth } from "./api";

describe("worker pre-login request", () => {
  beforeEach(() => {
    callEdgeFunctionAnon.mockReset();
    getTurnstileToken.mockReset();
    getTurnstileToken.mockResolvedValue("turnstile-test-token");
  });

  it("sends only the action, provided fields, and CAPTCHA token for public checks", async () => {
    callEdgeFunctionAnon.mockResolvedValue({ valid: true });

    await callWorkerAuth("check_rut", { rut: "12345678-9" });

    expect(getTurnstileToken).toHaveBeenCalledWith("worker_check_rut");
    expect(callEdgeFunctionAnon).toHaveBeenCalledOnce();
    expect(callEdgeFunctionAnon).toHaveBeenCalledWith("worker-auth", {
      action: "check_rut",
      rut: "12345678-9",
      captcha_token: "turnstile-test-token",
    });
  });

  it("uses separate CAPTCHA tokens for worker reset and Supabase Auth recovery", async () => {
    callEdgeFunctionAnon.mockResolvedValue({ success: true });
    getTurnstileToken
      .mockResolvedValueOnce("worker-edge-token")
      .mockResolvedValueOnce("supabase-auth-token");

    await callWorkerAuth("request_reset", { email: "user@example.com" });

    expect(getTurnstileToken).toHaveBeenNthCalledWith(1, "worker_request_reset");
    expect(getTurnstileToken).toHaveBeenNthCalledWith(2, "supabase_password_recovery");
    expect(callEdgeFunctionAnon).toHaveBeenCalledWith("worker-auth", {
      action: "request_reset",
      email: "user@example.com",
      captcha_token: "worker-edge-token",
      auth_captcha_token: "supabase-auth-token",
    });
  });

  it("requests only the native Supabase Auth CAPTCHA for authenticated password changes", async () => {
    callEdgeFunctionAnon.mockResolvedValue({ ok: true });

    await callWorkerAuth("change_password", { current_password: "secret" });

    expect(getTurnstileToken).toHaveBeenCalledOnce();
    expect(getTurnstileToken).toHaveBeenCalledWith("supabase_sign_in");
    expect(callEdgeFunctionAnon).toHaveBeenCalledWith("worker-auth", {
      action: "change_password",
      current_password: "secret",
      auth_captcha_token: "turnstile-test-token",
    });
  });

  it("uses separate CAPTCHA tokens for initial-password verification and Supabase Auth", async () => {
    callEdgeFunctionAnon.mockResolvedValue({ success: true });
    getTurnstileToken
      .mockResolvedValueOnce("worker-edge-token")
      .mockResolvedValueOnce("supabase-auth-token");

    await callWorkerAuth("set_initial_password", { email: "user@example.com" });

    expect(getTurnstileToken).toHaveBeenNthCalledWith(1, "worker_set_initial_password");
    expect(getTurnstileToken).toHaveBeenNthCalledWith(2, "supabase_sign_in");
    expect(callEdgeFunctionAnon).toHaveBeenCalledWith("worker-auth", {
      action: "set_initial_password",
      email: "user@example.com",
      captcha_token: "worker-edge-token",
      auth_captcha_token: "supabase-auth-token",
    });
  });

  it("fails closed when CAPTCHA cannot produce a token", async () => {
    getTurnstileToken.mockRejectedValue(new Error("captcha unavailable"));

    await expect(callWorkerAuth("request_reset", { email: "user@example.com" })).rejects.toThrow(
      "captcha unavailable",
    );
    expect(callEdgeFunctionAnon).not.toHaveBeenCalled();
  });
});
