import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import {
  getSafeRedirectUrl,
  handleRequestReset,
  type ResetAuthClientFactory,
} from "../source/handlers/reset.ts";

function equal(actual: unknown, expected: unknown, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)}, received ${String(actual)}`);
  }
}

function harness(rateAllowed: boolean, accountIsWorker = false) {
  const inserted: Record<string, unknown>[] = [];
  const svc = {
    rpc(name: string) {
      return Promise.resolve({
        data: name === "check_login_rate_limit" ? rateAllowed : null,
        error: null,
      });
    },
    from(table: string) {
      if (table === "login_attempts") {
        return {
          insert(row: Record<string, unknown>) {
            inserted.push(row);
            return Promise.resolve({ error: null });
          },
        };
      }
      return {
        select() {
          return {
            ilike() {
              return {
                maybeSingle: async () => ({
                  data: accountIsWorker
                    ? { role: "worker", active: true, tenant_id: "tenant-qa" }
                    : null,
                  error: null,
                }),
              };
            },
          };
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

function configureSafeRedirect() {
  const previousOrigin = Deno.env.get("WORKER_AUTH_REDIRECT_ORIGIN");
  const previousAllowed = Deno.env.get("WORKER_AUTH_ALLOWED_REDIRECT_ORIGINS");
  const previousSupabaseUrl = Deno.env.get("SUPABASE_URL");
  const previousAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  Deno.env.set("WORKER_AUTH_REDIRECT_ORIGIN", "https://app.example.test");
  Deno.env.set("WORKER_AUTH_ALLOWED_REDIRECT_ORIGINS", "https://app.example.test");
  Deno.env.set("SUPABASE_URL", "https://example-project.supabase.co");
  Deno.env.set("SUPABASE_ANON_KEY", "synthetic-anon-key-for-tests");
  equal(getSafeRedirectUrl(), "https://app.example.test/trabajador", "test redirect configuration");
  return () => {
    if (previousOrigin === undefined) Deno.env.delete("WORKER_AUTH_REDIRECT_ORIGIN");
    else Deno.env.set("WORKER_AUTH_REDIRECT_ORIGIN", previousOrigin);
    if (previousAllowed === undefined) Deno.env.delete("WORKER_AUTH_ALLOWED_REDIRECT_ORIGINS");
    else Deno.env.set("WORKER_AUTH_ALLOWED_REDIRECT_ORIGINS", previousAllowed);
    if (previousSupabaseUrl === undefined) Deno.env.delete("SUPABASE_URL");
    else Deno.env.set("SUPABASE_URL", previousSupabaseUrl);
    if (previousAnonKey === undefined) Deno.env.delete("SUPABASE_ANON_KEY");
    else Deno.env.set("SUPABASE_ANON_KEY", previousAnonKey);
  };
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

Deno.test("request_reset triggers Supabase recovery without a CAPTCHA token", async () => {
  const restoreEnv = configureSafeRedirect();
  try {
    const { svc, inserted } = harness(true, true);
    const resetCalls: Array<{ email: string; options: Record<string, unknown> }> = [];
    const createAuthClient: ResetAuthClientFactory = () =>
      ({
        auth: {
          resetPasswordForEmail: async (email: string, options: Record<string, unknown>) => {
            resetCalls.push({ email, options });
            return { error: null };
          },
        },
      }) as never;

    const response = await handleRequestReset(
      svc,
      request(),
      { email: "worker@example.test" },
      {},
      createAuthClient,
    );

    equal(response.status, 200, "reset response remains generic");
    equal(resetCalls.length, 1, "eligible worker receives a recovery request");
    equal(resetCalls[0].email, "worker@example.test", "recovery target");
    equal(
      resetCalls[0].options.redirectTo,
      "https://app.example.test/trabajador",
      "redirect remains fixed to the portal",
    );
    equal("captchaToken" in resetCalls[0].options, false, "no CAPTCHA token is sent to Auth");
    equal(inserted.length, 1, "rate-limit attempt is retained");
  } finally {
    restoreEnv();
  }
});
