import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { handleCheckAccount } from "../source/handlers/check_account.ts";
import { handleRecordLoginFailure } from "../source/handlers/record_login_failure.ts";
import { clientInfo } from "../_shared/worker-auth-utils.ts";

const EMAIL = "worker.qa@example.test";
const RUT = "12345678-5";
const NOW = new Date().toISOString();

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function equal(actual: unknown, expected: unknown, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)}, received ${String(actual)}`);
  }
}

function makeHarness(
  options: { rateAllowed?: boolean; workerRut?: string; authUserExists?: boolean } = {},
) {
  const state = {
    attempts: [] as Array<Record<string, unknown>>,
    auditRows: [] as Array<Record<string, unknown>>,
    allowed: {
      role: "worker",
      active: true,
      worker_rut: options.workerRut ?? RUT,
      must_change_password: false,
      ad_synced: false,
      tenant_id: "00000000-0000-0000-0000-000000000001",
    },
  };
  const svc = {
    from(table: string) {
      return {
        select() {
          return {
            ilike() {
              return {
                maybeSingle: async () => ({
                  data: { ...state.allowed },
                  error: null,
                }),
              };
            },
            eq() {
              return {
                maybeSingle: async () => ({ data: { value: 72 }, error: null }),
              };
            },
          };
        },
        insert(values: Record<string, unknown>) {
          if (table === "login_attempts") state.attempts.push(values);
          if (table === "activity_logs") state.auditRows.push(values);
          return Promise.resolve({ error: null });
        },
      };
    },
    rpc(name: string) {
      return Promise.resolve({
        data: name === "check_login_rate_limit" ? (options.rateAllowed ?? true) : null,
        error: null,
      });
    },
    auth: {
      admin: {
        listUsers: async () => ({
          data: {
            users:
              options.authUserExists === false
                ? []
                : [
                    {
                      id: "synthetic-auth-user",
                      email: EMAIL,
                      created_at: NOW,
                    },
                  ],
          },
          error: null,
        }),
      },
    },
  };
  return { svc: svc as unknown as SupabaseClient, state };
}

function request(): Request {
  return new Request("https://example-project.supabase.co/functions/v1/worker-auth", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "cf-connecting-ip": "203.0.113.10",
      "x-forwarded-for": "198.51.100.99",
    },
  });
}

Deno.test("clientInfo trusts cf-connecting-ip and ignores a spoofed forwarded chain", () => {
  const trusted = clientInfo(
    new Request("https://example.test", {
      headers: {
        "cf-connecting-ip": "203.0.113.10",
        "x-forwarded-for": "198.51.100.99",
        "x-real-ip": "198.51.100.98",
      },
    }),
  );
  equal(trusted.ip, "203.0.113.10", "Cloudflare proxy IP");

  const untrusted = clientInfo(
    new Request("https://example.test", {
      headers: { "x-forwarded-for": "198.51.100.99", "x-real-ip": "198.51.100.98" },
    }),
  );
  equal(untrusted.ip, null, "untrusted forwarding headers must be ignored");
});

Deno.test("check_account validates the RUT server-side and never returns it", async () => {
  const harness = makeHarness();
  const response = await handleCheckAccount(
    harness.svc,
    request(),
    { email: EMAIL, rut: "12.345.678-5" },
    {},
  );
  const body = await response.text();

  equal(response.status, 200, "status");
  assert(body.includes('"exists":true'), "matching email and RUT should proceed");
  assert(!body.includes(RUT), "full RUT must not be returned");
  equal(harness.state.attempts.length, 0, "precheck must not be recorded as successful login");
  assert(!JSON.stringify(harness.state.auditRows).includes(RUT), "audit must not store full RUT");
});

Deno.test(
  "check_account gives a generic response and records a mismatched RUT as failure",
  async () => {
    const harness = makeHarness();
    const response = await handleCheckAccount(
      harness.svc,
      request(),
      { email: EMAIL, rut: "11111111-1" },
      {},
    );
    const body = (await response.json()) as Record<string, unknown>;

    equal(response.status, 200, "status");
    equal(body.exists, false, "mismatch must not reveal account state");
    equal(harness.state.attempts.length, 1, "mismatch must count as a failed attempt");
    equal(harness.state.attempts[0].success, false, "attempt result");
    assert(!JSON.stringify(body).includes(RUT), "response must not reveal the stored RUT");
  },
);

Deno.test("record_login_failure uses the same account/IP key checked by preflight", async () => {
  const harness = makeHarness();
  const response = await handleRecordLoginFailure(harness.svc, request(), { email: EMAIL }, {});

  equal(response.status, 200, "status");
  equal(harness.state.attempts.length, 1, "failed login must be recorded");
  equal(
    harness.state.attempts[0].identifier,
    `${EMAIL}:worker_login:203.0.113.10`,
    "shared rate-limit identifier",
  );
  equal(harness.state.attempts[0].success, false, "failed login result");
  equal(harness.state.auditRows.length, 1, "failed login is visible in activity_logs");
  equal(harness.state.auditRows[0].action, "worker.signin_failed", "worker event action");
  equal(
    harness.state.auditRows[0].tenant_id,
    "00000000-0000-0000-0000-000000000001",
    "tenant scope",
  );
  assert(
    JSON.stringify(harness.state.auditRows[0].details).includes('"reported_by_client":true'),
    "the event must disclose that it was reported by the client",
  );
});

Deno.test("record_login_failure keeps the admin rate-limit bucket separate", async () => {
  const harness = makeHarness();
  const response = await handleRecordLoginFailure(
    harness.svc,
    request(),
    { email: EMAIL, surface: "admin" },
    {},
  );

  equal(response.status, 200, "status");
  equal(
    harness.state.attempts[0].identifier,
    `${EMAIL}:admin_login:203.0.113.10`,
    "admin rate-limit identifier",
  );
  equal(harness.state.auditRows[0].action, "auth.admin_signin_failed", "admin event action");
});

Deno.test("record_login_failure rejects when the shared rate limit is exhausted", async () => {
  const harness = makeHarness({ rateAllowed: false });
  const response = await handleRecordLoginFailure(harness.svc, request(), { email: EMAIL }, {});

  equal(response.status, 429, "status");
  equal(harness.state.attempts.length, 0, "blocked attempt must not add another row");
  equal(harness.state.auditRows.length, 0, "rate-limited requests must not flood activity_logs");
});

Deno.test(
  "check_account returns the same public body when a matching worker has no Auth identity",
  async () => {
    const harness = makeHarness({ authUserExists: false });
    const response = await handleCheckAccount(
      harness.svc,
      request(),
      { email: EMAIL, rut: RUT },
      {},
    );

    equal(response.status, 200, "status");
    equal(
      await response.text(),
      '{"exists":false,"is_worker":false}',
      "no-Auth response must be generic",
    );
    equal(harness.state.attempts.length, 1, "missing Auth identity counts as failed preflight");
    equal(harness.state.attempts[0].success, false, "attempt result");
  },
);
