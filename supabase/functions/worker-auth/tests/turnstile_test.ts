import { verifyTurnstile } from "../_shared/turnstile.ts";

Deno.test("Turnstile pausado no remite IP ni llama a Cloudflare", async () => {
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;
  globalThis.fetch = async () => {
    fetchCalls += 1;
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  };

  try {
    const result = await verifyTurnstile(
      new Request("https://example.test/worker-auth"),
      { captcha_token: "synthetic-token" },
      "worker_check_rut",
    );
    if (result !== false) throw new Error("Turnstile pausado debe fallar cerrado.");
    if (fetchCalls !== 0) throw new Error("No debe realizar solicitudes a Cloudflare.");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
