import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { createClient } from "npm:@supabase/supabase-js@2";
import { logAction, clientTracking, jsonResponse } from "../../_shared/worker-auth-utils.ts";

export async function handleRequestReset(
  svc: SupabaseClient,
  req: Request,
  body: Record<string, unknown>,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  const email = String(body?.email ?? "").toLowerCase().trim();
  if (!email) {
    return jsonResponse(corsHeaders, { error: "Email es obligatorio." }, 400);
  }

  const ct = clientTracking(body);

  const { data: allowed, error: allowErr } = await svc
    .from("allowed_emails")
    .select("role, active, tenant_id")
    .ilike("email", email)
    .maybeSingle();
  if (allowErr) throw allowErr;

  const genericSuccess = jsonResponse(corsHeaders, {
    success: true,
    message: "Si el correo existe, recibirá un enlace de restablecimiento en breve.",
  });

  if (!allowed || !allowed.active) {
    return genericSuccess;
  }

  const referer = req.headers.get("referer");
  const appOrigin = referer ? new URL(referer).origin : new URL(req.url).origin;
  const isWorker = allowed.role === "worker";
  const defaultPath = isWorker ? "/trabajador" : "/admin";
  const redirectTo = `${appOrigin}${defaultPath}`;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const anonClient = createClient(supabaseUrl, anonKey);

  const { error: resetErr } = await anonClient.auth.resetPasswordForEmail(email, {
    redirectTo,
  });
  if (resetErr) {
    await logAction(svc, req, { email, action: "worker.request_reset_failed", entity: "auth", entity_label: email, details: { error: resetErr.message }, tenantId: allowed?.tenant_id ?? null, ...ct });
    throw resetErr;
  }

  await logAction(svc, req, { email, action: "worker.request_reset", entity: "auth", entity_label: email, tenantId: allowed?.tenant_id ?? null, ...ct });

  return genericSuccess;
}
