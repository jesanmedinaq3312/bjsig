import { describe, it as test } from "node:test";
import { strictEqual } from "node:assert";
import { RateLimitError } from "./rateLimit";

describe("HTTP rate limit cooldown", () => {
  test("honors the server's 15 minute worker-auth response", () => {
    const error = new RateLimitError(
      "Demasiados intentos. Intenta nuevamente en 15 minutos.",
      null,
      1000,
    );
    strictEqual(error.retryAt, 901000);
  });
  test("prefers Retry-After seconds over the response message", () => {
    const error = new RateLimitError("Intenta nuevamente en 15 minutos.", "30", 1000);
    strictEqual(error.retryAt, 31000);
  });
  test("accepts an HTTP date Retry-After", () => {
    const error = new RateLimitError(
      "Espera.",
      "Fri, 23 Oct 2026 02:15:00 GMT",
      Date.parse("2026-10-23T02:00:00Z"),
    );
    strictEqual(error.retryAt, Date.parse("2026-10-23T02:15:00Z"));
  });
});
