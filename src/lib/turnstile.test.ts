import { afterEach, describe, expect, it, vi } from "vitest";
import { getTurnstileToken } from "./turnstile";

describe("Turnstile pausado", () => {
  afterEach(() => vi.restoreAllMocks());

  it("falla antes de crear o solicitar el script de Cloudflare", async () => {
    const createElement = vi.spyOn(document, "createElement");
    const appendChild = vi.spyOn(document.head, "appendChild");

    await expect(getTurnstileToken("worker_check_rut")).rejects.toThrow(
      "pendiente de una configuración de acceso aprobada",
    );
    expect(createElement).not.toHaveBeenCalled();
    expect(appendChild).not.toHaveBeenCalled();
  });
});
