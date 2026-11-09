import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import {
  handleSetInitialPassword,
  type TemporaryPasswordAuthClientFactory,
} from "../source/handlers/set_password.ts";
import { meetsWorkerPasswordPolicy } from "../_shared/worker-auth-utils.ts";

const EMAIL = "worker.qa@example.test";
const TEMPORARY_PASSWORD = "SyntheticTempPassword!1";
const NEW_PASSWORD = "SyntheticNewPassword!2";
const SUPABASE_URL = "https://example-project.supabase.co";
const ANON_KEY = "synthetic-anon-key-for-unit-tests";
const TENANT_ID = "00000000-0000-0000-0000-000000000001";

Deno.test(
  "server policy accepts an approved symbol but not whitespace or an unapproved slash",
  () => {
    equal(meetsWorkerPasswordPolicy("Abcdef1!"), true, "approved symbol");
    equal(meetsWorkerPasswordPolicy("Abcdef1 "), false, "whitespace is not a symbol");
    equal(meetsWorkerPasswordPolicy("Abcdef1/"), false, "slash is not an approved symbol");
  },
);

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function equal(actual: unknown, expected: unknown, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)}, received ${String(actual)}`);
  }
}

function makeHarness(
  options: {
    passwordValid?: boolean;
    rateAllowed?: boolean;
    mustChangePassword?: boolean;
    createdAt?: string;
  } = {},
) {
  const state = {
    allowed: {
      role: "worker",
      active: true,
      must_change_password: options.mustChangePassword ?? true,
      tenant_id: TENANT_ID,
    },
    authUpdates: [] as Array<{ id: string; password: string }>,
    allowedUpdates: [] as Array<Record<string, unknown>>,
    loginAttempts: [] as Array<Record<string, unknown>>,
    auditRows: [] as Array<Record<string, unknown>>,
    rpcCalls: [] as Array<{ name: string; args: Record<string, unknown> | undefined }>,
    signIns: [] as Array<{
      email: string;
      password: string;
      options?: Record<string, unknown>;
    }>,
    authOptions: [] as Array<{ url: string; key: string }>,
  };

  const svc = {
    from(table: string) {
      return {
        select() {
          return {
            ilike() {
              return {
                maybeSingle: async () => ({ data: { ...state.allowed }, error: null }),
              };
            },
            eq() {
              return {
                maybeSingle: async () => ({ data: { value: 72 }, error: null }),
              };
            },
          };
        },
        update(values: Record<string, unknown>) {
          return {
            ilike() {
              return {
                eq: async () => {
                  state.allowedUpdates.push({ table, ...values });
                  Object.assign(state.allowed, values);
                  return { error: null };
                },
              };
            },
          };
        },
        insert(values: Record<string, unknown>) {
          if (table === "login_attempts") state.loginAttempts.push(values);
          if (table === "activity_logs") state.auditRows.push(values);
          return Promise.resolve({ error: null });
        },
      };
    },
    rpc(name: string, args?: Record<string, unknown>) {
      state.rpcCalls.push({ name, args });
      return Promise.resolve({
        data: name === "check_login_rate_limit" ? (options.rateAllowed ?? true) : null,
        error: null,
      });
    },
    auth: {
      admin: {
        listUsers: async () => ({
          data: {
            users: [
              {
                id: "synthetic-qa-auth-user",
                email: EMAIL,
                created_at: options.createdAt ?? new Date().toISOString(),
              },
            ],
          },
          error: null,
        }),
        updateUserById: async (id: string, values: { password: string }) => {
          state.authUpdates.push({ id, password: values.password });
          return { error: null };
        },
      },
    },
  };

  const authFactory: TemporaryPasswordAuthClientFactory = (url, key) => {
    state.authOptions.push({ url, key });
    return {
      auth: {
        signInWithPassword: async (credentials: {
          email: string;
          password: string;
          options?: Record<string, unknown>;
        }) => {
          state.signIns.push(credentials);
          return {
            error: options.passwordValid === false ? new Error("invalid credentials") : null,
          };
        },
      },
    } as never;
  };

  return { svc: svc as unknown as SupabaseClient, state, authFactory };
}

async function invoke(
  harness: ReturnType<typeof makeHarness>,
  currentPassword = TEMPORARY_PASSWORD,
  newPassword = NEW_PASSWORD,
) {
  const request = new Request("https://example-project.supabase.co/functions/v1/worker-auth", {
    method: "POST",
    headers: { "content-type": "application/json", "cf-connecting-ip": "203.0.113.10" },
    body: JSON.stringify({ action: "set_initial_password" }),
  });
  const response = await handleSetInitialPassword(
    harness.svc,
    request,
    {
      email: EMAIL,
      current_password: currentPassword,
      new_password: newPassword,
    },
    {},
    SUPABASE_URL,
    ANON_KEY,
    harness.authFactory,
  );
  return { response, body: (await response.json()) as Record<string, unknown> };
}

Deno.test(
  "rejects an incorrect temporary password without changing Auth or the initial flag",
  async () => {
    const harness = makeHarness({ passwordValid: false });
    const { response, body } = await invoke(harness);

    equal(response.status, 400, "status");
    equal(harness.state.authUpdates.length, 0, "Auth must remain unchanged");
    equal(harness.state.allowedUpdates.length, 0, "must_change_password must remain unchanged");
    equal(harness.state.loginAttempts.length, 1, "failed attempt must be recorded");
    equal(
      harness.state.loginAttempts[0].identifier,
      `${EMAIL}:set_password:worker_login:203.0.113.10`,
      "rate-limit identifier",
    );
    equal(harness.state.loginAttempts[0].success, false, "attempt result");
    assert(typeof body.error === "string", "localized generic rejection should be returned");
    const logged = JSON.stringify({
      attempts: harness.state.loginAttempts,
      audit: harness.state.auditRows,
    });
    assert(!logged.includes(TEMPORARY_PASSWORD), "temporary password must not appear in logs");
    assert(!logged.includes(NEW_PASSWORD), "new password must not appear in logs");
  },
);

Deno.test(
  "accepts the correct temporary password and updates Auth and the initial flag",
  async () => {
    const harness = makeHarness({ passwordValid: true });
    const { response, body } = await invoke(harness);

    equal(response.status, 200, "status");
    equal(body.success, true, "success response");
    equal(harness.state.authUpdates.length, 1, "Auth update count");
    equal(harness.state.authUpdates[0].password, NEW_PASSWORD, "new password reaches Auth update");
    equal(harness.state.allowed.must_change_password, false, "initial password flag");
    equal(harness.state.allowedUpdates.length, 1, "allowed_emails update count");
    equal(harness.state.loginAttempts.at(-1)?.success, true, "successful attempt record");
    equal(harness.state.authOptions[0].url, SUPABASE_URL, "Auth verification URL");
    equal(harness.state.authOptions[0].key, ANON_KEY, "Auth verification uses anon key");
    equal(harness.state.signIns.length, 1, "Auth verifies the temporary password without CAPTCHA");
    equal(harness.state.signIns[0].options, undefined, "no CAPTCHA options are sent to Auth");
    const logged = JSON.stringify({
      attempts: harness.state.loginAttempts,
      audit: harness.state.auditRows,
    });
    assert(!logged.includes(TEMPORARY_PASSWORD), "temporary password must not appear in logs");
    assert(!logged.includes(NEW_PASSWORD), "new password must not appear in logs");
  },
);

Deno.test("rejects a second first-access request after the account flag is cleared", async () => {
  const harness = makeHarness({ mustChangePassword: false });
  const { response } = await invoke(harness);

  equal(response.status, 400, "status");
  equal(harness.state.signIns.length, 0, "must reject before password verification");
  equal(harness.state.authUpdates.length, 0, "Auth must remain unchanged");
  equal(harness.state.allowedUpdates.length, 0, "flag must remain unchanged");
});

Deno.test("stops before Auth when the remote rate limit is reached", async () => {
  const harness = makeHarness({ rateAllowed: false });
  const { response } = await invoke(harness);

  equal(response.status, 429, "status");
  equal(harness.state.signIns.length, 0, "Auth must not be called after rate limiting");
  equal(harness.state.authUpdates.length, 0, "Auth must remain unchanged");
  equal(harness.state.allowedUpdates.length, 0, "flag must remain unchanged");
});

Deno.test("does not allow the temporary password to become the permanent password", async () => {
  const harness = makeHarness({ passwordValid: true });
  const { response } = await invoke(harness, TEMPORARY_PASSWORD, TEMPORARY_PASSWORD);

  equal(response.status, 400, "status");
  equal(harness.state.signIns.length, 0, "Auth must not be called");
  equal(harness.state.authUpdates.length, 0, "Auth must remain unchanged");
  equal(harness.state.allowedUpdates.length, 0, "flag must remain unchanged");
});

Deno.test("rejects an expired temporary password before Auth verification", async () => {
  const createdAt = new Date(Date.now() - 73 * 60 * 60 * 1000).toISOString();
  const harness = makeHarness({ createdAt });
  const { response } = await invoke(harness);

  equal(response.status, 400, "status");
  equal(harness.state.signIns.length, 0, "expired temporary password must not be checked as valid");
  equal(harness.state.authUpdates.length, 0, "Auth must remain unchanged");
  equal(harness.state.allowedUpdates.length, 0, "flag must remain unchanged");
});
