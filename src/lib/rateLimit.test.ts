import { describe, expect, it } from "vitest";
import { RateLimitError } from "./rateLimit";

describe("HTTP rate limit cooldown", () => {
  it("honors the server's 15 minute worker-auth response", () => {
    const error = new RateLimitError(
      "Demasiados intentos. Intenta nuevamente en 15 minutos.",
      null,
      1000,
    );
    expect(error.retryAt).toBe(901000);
  });

  it("prefers Retry-After seconds over the response message", () => {
    const error = new RateLimitError("Intenta nuevamente en 15 minutos.", "30", 1000);
    expect(error.retryAt).toBe(31000);
  });

  it("accepts an HTTP date Retry-After", () => {
    const error = new RateLimitError(
      "Espera.",
      "Fri, 23 Oct 2026 02:15:00 GMT",
      Date.parse("2026-10-23T02:00:00Z"),
    );
    expect(error.retryAt).toBe(Date.parse("2026-10-23T02:15:00Z"));
  });
});
