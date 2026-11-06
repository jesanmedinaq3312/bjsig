import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { handleRequestReset } from "../source/handlers/reset.ts";

function equal(actual: unknown, expected: unknown, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)}, received ${String(actual)}`);
  }
}

function harness(rateAllowed: boolean) {
  const inserted: Record<string, unknown>[] = [];
  const svc = {
    rpc(name: string) {
      return Promise.resolve({
        data: name === "check_login_rate_limit" ? rateAllowed : null,
        error: null,
      });
    },
    from(table: string) {
      return {
        insert(row: Record<string, unknown>) {
          if (table === "login_attempts") inserted.push(row);
          return Promise.resolve({ error: null });
        },
      };
    },
  };
  return { svc: svc as unknown as SupabaseClient, inserted };
}

function request(referer?: string): Request {
  const headers = new Headers({ "cf-connecting-ip": "203.0.113.42" });
  if (referer) headers.set("referer", referer);
  return new Request("https://example-project.supabase.co/functions/v1/worker-auth", {
    method: "POST",
    headers,
  });
}

Deno.test(
  "request_reset returns the same generic body when the rate limit is exhausted",
  async () => {
    const { svc, inserted } = harness(false);
    const response = await handleRequestReset(
      svc,
      request("https://attacker.example/redirect"),
      { email: "worker@example.test" },
      {},
    );

    equal(response.status, 200, "rate-limited status remains generic");
    equal(
      await response.text(),
      JSON.stringify({
        success: true,
        message: "Si el correo existe, recibirá un enlace de restablecimiento en breve.",
      }),
      "generic response body",
    );
    equal(inserted.length, 0, "blocked requests do not add attempts");
  },
);

Deno.test("request_reset responds generically to malformed addresses", async () => {
  const { svc } = harness(true);
  const response = await handleRequestReset(svc, request(), { email: "not-an-email" }, {});
  equal(response.status, 200, "malformed address status");
  const body = (await response.json()) as Record<string, unknown>;
  equal(body.success, true, "response must not reveal address validity");
});

Deno.test(
  "request_reset is generic when its separate Supabase Auth CAPTCHA token is missing",
  async () => {
    const { svc, inserted } = harness(true);
    const response = await handleRequestReset(svc, request(), { email: "worker@example.test" }, {});

    equal(response.status, 200, "missing Auth CAPTCHA status remains generic");
    equal(
      await response.text(),
      JSON.stringify({
        success: true,
        message: "Si el correo existe, recibirá un enlace de restablecimiento en breve.",
      }),
      "generic response body",
    );
    equal(inserted.length, 1, "missing Auth CAPTCHA attempt is rate-limited");
  },
);
