import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { handleCheckRut } from "../source/handlers/check_rut.ts";

const RUT = "12345678-5";
const NAME = "Trabajador Confidencial";
const EMAIL = "private.worker@example.test";

function equal(actual: unknown, expected: unknown, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)}, received ${String(actual)}`);
  }
}

function harness(found: boolean) {
  const identifiers: string[] = [];
  const svc = {
    from(table: string) {
      if (table === "workers") {
        return {
          select() {
            return {
              eq() {
                return {
                  limit: async () => ({
                    data: found
                      ? [{ rut: RUT, full_name: NAME, email: EMAIL, tenant_id: "tenant-a" }]
                      : [],
                    error: null,
                  }),
                };
              },
            };
          },
        };
      }
      if (table === "allowed_emails") {
        return {
          select() {
            return {
              eq() {
                return {
                  maybeSingle: async () => ({
                    data: found
                      ? { email: EMAIL, active: true, role: "worker", tenant_id: "tenant-a" }
                      : null,
                    error: null,
                  }),
                };
              },
            };
          },
        };
      }
      return {
        insert(row: Record<string, unknown>) {
          if (table === "login_attempts") identifiers.push(String(row.identifier));
          return Promise.resolve({ error: null });
        },
      };
    },
    rpc(name: string, args?: Record<string, unknown>) {
      if (name === "check_login_rate_limit") identifiers.push(String(args?.p_identifier));
      return Promise.resolve({ data: true, error: null });
    },
  };
  return { svc: svc as unknown as SupabaseClient, identifiers };
}

function request(): Request {
  return new Request("https://example-project.supabase.co/functions/v1/worker-auth", {
    method: "POST",
    headers: {
      "cf-connecting-ip": "203.0.113.10",
      "x-forwarded-for": "198.51.100.99",
    },
  });
}

Deno.test("check_rut uses identical response for registered and unregistered RUTs", async () => {
  const registered = harness(true);
  const unknown = harness(false);
  const registeredResponse = await handleCheckRut(registered.svc, request(), { rut: RUT }, {});
  const unknownResponse = await handleCheckRut(unknown.svc, request(), { rut: RUT }, {});

  equal(registeredResponse.status, unknownResponse.status, "status must match");
  const registeredBody = await registeredResponse.text();
  const unknownBody = await unknownResponse.text();
  equal(registeredBody, unknownBody, "body must not reveal registration state");
  equal(registeredBody, JSON.stringify({ valid: true }), "minimal response shape");
  equal(registered.identifiers[0], "123456785:rut:203.0.113.10", "RUT bucket includes trusted IP");
  equal(
    unknown.identifiers[0],
    "123456785:rut:203.0.113.10",
    "unknown RUT uses same bucket format",
  );
});
