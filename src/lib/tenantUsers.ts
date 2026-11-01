import { callEdgeFunction } from "./edgeFunctions";
import { supabase } from "./supabase";
import {
  generateTemporaryPassword,
  meetsPasswordPolicy,
  PASSWORD_POLICY_MESSAGE,
} from "./passwordPolicy";
import type { TenantStaffRole } from "./roleHierarchy";

export interface ProvisionTenantUserInput {
  tenantId: string;
  email: string;
  role: TenantStaffRole;
  permissions: Record<string, boolean>;
  password?: string;
}

export interface ProvisionTenantUserResult {
  temporary_password?: string;
  user_id?: string;
  email?: string;
}

/**
 * Creates the Auth identity through the server function and then makes the
 * tenant membership explicit and idempotent through the protected RPC.
 * The RPC is deliberately kept separate so an Auth user can never be granted
 * access to a different tenant by client-side fields alone.
 */
export async function provisionTenantUser(
  input: ProvisionTenantUserInput,
): Promise<ProvisionTenantUserResult> {
  const email = input.email.trim().toLowerCase();
  if (!email) throw new Error("El correo del usuario es obligatorio.");
  if (!input.tenantId) throw new Error("No hay una empresa activa para asignar el usuario.");

  const chosen = input.password?.trim();
  if (chosen && !meetsPasswordPolicy(chosen)) throw new Error(PASSWORD_POLICY_MESSAGE);
  const generated = chosen ? undefined : generateTemporaryPassword();

  const { data, error } = await callEdgeFunction<ProvisionTenantUserResult>("admin-user-manage", {
    action: "create_user",
    email,
    password: chosen || generated,
    role: input.role,
    permissions: input.permissions,
    tenant_id: input.tenantId,
  });
  if (error) throw new Error(error);

  const { error: membershipError } = await supabase.rpc("provision_tenant_access", {
    _tenant_id: input.tenantId,
    _email: email,
    _role: input.role,
    _permissions: input.permissions,
  });
  if (membershipError) {
    throw new Error(
      `La cuenta se creó, pero no se pudo asignar a la empresa: ${membershipError.message}`,
    );
  }

  return {
    ...(data ?? {}),
    temporary_password: data?.temporary_password ?? generated,
    email,
  };
}
