import { describe, expect, it } from "vitest";
import { httpUrlSchema, optionalHttpUrlSchema } from "./httpUrl";

describe("httpUrlSchema", () => {
  it.each(["https://example.com/manual.pdf", "http://intranet.example/help"])(
    "accepts %s",
    (value) => expect(httpUrlSchema.safeParse(value).success).toBe(true),
  );

  it.each(["javascript:alert(1)", "//example.com/path", "/relative/path", "https:// bad.example"])(
    "rejects %s",
    (value) => expect(httpUrlSchema.safeParse(value).success).toBe(false),
  );

  it("allows an empty optional URL but not a non-http URL", () => {
    expect(optionalHttpUrlSchema.safeParse("").success).toBe(true);
    expect(optionalHttpUrlSchema.safeParse("javascript:alert(1)").success).toBe(false);
  });
});
