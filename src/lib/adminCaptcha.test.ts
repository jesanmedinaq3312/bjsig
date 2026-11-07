import { describe, expect, it, vi } from "vitest";
import { getAdminCaptchaToken } from "./adminCaptcha";

describe("temporary administrator CAPTCHA suspension", () => {
  it("allows administrator password login without a configured Turnstile key", async () => {
    vi.stubEnv("VITE_TURNSTILE_SITE_KEY", "");
    try {
      expect(await getAdminCaptchaToken("supabase_sign_in")).toBeUndefined();
    } finally {
      vi.unstubAllEnvs();
    }
  });
});