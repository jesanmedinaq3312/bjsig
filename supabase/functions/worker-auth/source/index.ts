import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../../_shared/auth.ts";
import { clientInfo, jsonResponse } from "../_shared/worker-auth-utils.ts";
import { verifyTurnstile } from "../_shared/turnstile.ts";
import { handleCheckRut } from "./handlers/check_rut.ts";
import { handleCheckAccount } from "./handlers/check_account.ts";
import { handleSetInitialPassword } from "./handlers/set_password.ts";
import { handleChangePassword } from "./handlers/change_password.ts";
import { handleRequestReset } from "./handlers/reset.ts";
import { handleRecordLoginFailure } from "./handlers/record_login_failure.ts";

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !anonKey || !serviceKey) {
      return jsonResponse(
        corsHeaders,
        {
          error: "Variables de entorno de Supabase no configuradas en el servidor.",
        },
        500,
      );
    }

    const svc = createClient(supabaseUrl, serviceKey);
    const body = await req.json();
    const action = body?.action as string;

    const captchaActions: Record<string, string> = {
      check_rut: "worker_check_rut",
      check_account: "worker_check_account",
      request_reset: "worker_request_reset",
      record_login_failure: "worker_login_failure",
      set_initial_password: "worker_set_initial_password",
    };
    const expectedCaptchaAction = captchaActions[action];
    if (expectedCaptchaAction) {
      if (!clientInfo(req).ip) {
        return jsonResponse(
          corsHeaders,
          { error: "El servicio de verificación no está disponible. Intenta más tarde." },
          503,
        );
      }
      if (!(await verifyTurnstile(req, body, expectedCaptchaAction))) {
        return jsonResponse(
          corsHeaders,
          { error: "No se pudo completar la verificación de seguridad. Intenta nuevamente." },
          403,
        );
      }
    }

    switch (action) {
      case "check_rut":
        return await handleCheckRut(svc, req, body, corsHeaders);
      case "check_account":
        return await handleCheckAccount(svc, req, body, corsHeaders);
      case "record_login_failure":
        return await handleRecordLoginFailure(svc, req, body, corsHeaders);
      case "set_initial_password":
        return await handleSetInitialPassword(svc, req, body, corsHeaders, supabaseUrl, anonKey);
      case "change_password":
        return await handleChangePassword(svc, req, body, corsHeaders, supabaseUrl);
      case "request_reset":
        return await handleRequestReset(svc, req, body, corsHeaders);

      default:
        return jsonResponse(corsHeaders, { error: "Acción no reconocida." }, 400);
    }
  } catch {
    return jsonResponse(
      corsHeaders,
      {
        error: "No se pudo procesar la solicitud. Intenta nuevamente.",
      },
      500,
    );
  }
});
