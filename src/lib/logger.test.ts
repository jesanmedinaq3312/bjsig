import { afterEach, describe, expect, it, vi } from "vitest";
import { logger } from "./logger";
import { sanitizeLogValue } from "./logSanitizer";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("developer logging", () => {
  it("emits scoped timestamped diagnostic records without changing parent context", () => {
    vi.stubEnv("DEV", true);
    const output = vi.spyOn(console, "warn").mockImplementation(() => {});
    logger
      .child("sync", { requestId: "req-123" })
      .warn("Sync delayed", { status: 429, retryAt: 31000 });
    expect(output.mock.calls[0][0]).toMatchObject({
      level: "warn",
      scope: "sync",
      environment: "development",
      message: "Sync delayed",
      context: { requestId: "req-123" },
      details: [{ status: 429, retryAt: 31000 }],
    });
    const entry = output.mock.calls[0][0] as { timestamp: string };
    expect(Number.isNaN(Date.parse(entry.timestamp))).toBe(false);
    logger.warn("Parent");
    expect(output.mock.calls[1][0]).toMatchObject({ scope: "app", context: {} });
  });

  it("suppresses debug/info in production and emits JSON warnings/errors", () => {
    vi.stubEnv("DEV", false);
    const debug = vi.spyOn(console, "debug").mockImplementation(() => {});
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    logger.debug("hidden");
    logger.info("hidden");
    logger.warn("visible");
    logger.error("failure");
    expect(debug).not.toHaveBeenCalled();
    expect(info).not.toHaveBeenCalled();
    expect(JSON.parse(warn.mock.calls[0][0] as string)).toMatchObject({
      level: "warn",
      message: "visible",
    });
    expect(JSON.parse(error.mock.calls[0][0] as string)).toMatchObject({
      level: "error",
      message: "failure",
    });
  });

  it("redacts credentials and personal fields, including nested data", () => {
    const value = sanitizeLogValue({
      password: "private",
      nested: { access_token: "token-value", email: "person@example.com", latitude: 12 },
      message: "Bearer abc123 password=private person@example.com",
    });
    expect(value).toEqual({
      password: "[REDACTED]",
      nested: { access_token: "[REDACTED]", email: "[REDACTED]", latitude: "[REDACTED]" },
      message: "Bearer [REDACTED] password=[REDACTED] [REDACTED]",
    });
  });

  it("removes recovery URL parameters, fragments and URL credentials", () => {
    expect(
      sanitizeLogValue("https://user:pass@example.com/recovery?code=private#access_token=secret"),
    ).toBe("https://example.com/recovery");
  });

  it("preserves error stacks and causes while redacting their messages", () => {
    const cause = new Error("password=private");
    const error = Object.assign(new Error("Request failed", { cause }), {
      status: 429,
      retryAt: 31000,
    });
    expect(sanitizeLogValue(error)).toMatchObject({
      name: "Error",
      message: "Request failed",
      stack: expect.stringContaining("Request failed"),
      status: 429,
      retryAt: 31000,
      cause: { message: "password=[REDACTED]" },
    });
    expect(JSON.stringify(sanitizeLogValue(error))).not.toContain("private");
  });

  it("handles circular references and throwing getters without throwing", () => {
    const input: Record<string, unknown> = {};
    input.self = input;
    Object.defineProperty(input, "broken", {
      enumerable: true,
      get: () => {
        throw new Error("bad getter");
      },
    });
    expect(sanitizeLogValue(input)).toEqual({ self: "[Circular]", broken: "[Unreadable]" });
  });

  it("detaches diagnostic data and bounds long input", () => {
    const input = { code: "original" };
    const snapshot = sanitizeLogValue(input);
    input.code = "changed";
    expect(snapshot).toEqual({ code: "original" });
    expect(sanitizeLogValue("a".repeat(9000))).toHaveLength(8000);
    expect(sanitizeLogValue(Array.from({ length: 100 }, (_, i) => i))).toHaveLength(50);
  });
});
