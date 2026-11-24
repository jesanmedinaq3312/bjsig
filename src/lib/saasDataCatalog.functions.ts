import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type SaasTenantCatalogRow = {
  tenant_id: string;
  table_name: string;
  row_count: number;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validateCatalogInput(input?: { tenantId?: string | null }): {
  tenantId: string | null;
} {
  const raw = input?.tenantId ?? null;
  if (raw !== null && (typeof raw !== "string" || !UUID_RE.test(raw))) {
    throw new Error("INVALID_TENANT_ID");
  }
  return { tenantId: raw };
}

export const fetchSaasTenantDataCatalog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(validateCatalogInput)
  .handler(async ({ data, context }): Promise<SaasTenantCatalogRow[]> => {
    if (context.claims["is_anonymous"] === true) {
      throw new Error("PLATFORM_ROLE_REQUIRED");
    }

    const { data: isOwner, error: roleError } = await context.supabase.rpc("is_platform_owner");
    if (roleError || isOwner !== true) {
      throw new Error("PLATFORM_ROLE_REQUIRED");
    }

    const { data: mfaRequired, error: mfaError } = await context.supabase.rpc(
      "mfa_required_for_current_user",
    );
    if (mfaError) {
      throw new Error("MFA_CHECK_FAILED");
    }
    if (mfaRequired === true && context.claims["aal"] !== "aal2") {
      throw new Error("MFA_REQUIRED");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const rpcArgs = data.tenantId ? { _tenant_id: data.tenantId } : {};
    const { data: rows, error } = await supabaseAdmin.rpc(
      "fetch_saas_tenant_data_catalog",
      rpcArgs,
    );

    if (error) {
      throw new Error(error.message);
    }

    return (rows ?? []).map((row) => ({
      tenant_id: row.tenant_id,
      table_name: row.table_name,
      row_count: Number(row.row_count ?? 0),
    }));
  });
