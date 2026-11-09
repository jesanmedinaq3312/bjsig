import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders, isOriginAllowed } from "../_shared/auth.ts";
import {
  type Actor,
  actorFrom,
  canGrantTenantRole,
  canManageAccount,
  canResetExistingIdentity,
  canUseUserAdmin,
  type Decision,
  listScope,
  resolveTenant,
} from "../_shared/authz.ts";
import { checkGpsSessionAccess } from "../_shared/gps-gate.ts";
import { isPreauthorizedCompanyOwner } from "./_shared/provisioning.ts";
import {
  meetsPasswordPolicy,
  PASSWORD_POLICY_MESSAGE,
  PASSWORD_SYMBOLS,
} from "../_shared/password-policy.ts";
const cleanEmail = (v: unknown) =>
  String(v ?? "")
    .trim()
    .toLowerCase();
const password = (n = 16) => {
  const groups = [
    "ABCDEFGHJKLMNPQRSTUVWXYZ",
    "abcdefghijkmnpqrstuvwxyz",
    "23456789",
    PASSWORD_SYMBOLS,
  ];
  if (n < groups.length) throw new Error("PASSWORD_LENGTH_TOO_SHORT");
  const random = new Uint32Array(n);
  crypto.getRandomValues(random);
  const all = groups.join("");
  const chars = groups.map((group, i) => group[random[i] % group.length]);
  for (let i = groups.length; i < n; i += 1) {
    chars.push(all[random[i] % all.length]);
  }
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = random[i] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
};
async function authUserByEmail(svc: SupabaseClient, email: string) {
  let page = 1;
  while (true) {
    const { data, error } = await svc.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) throw error;
    const found = data.users.find((u) => u.email?.toLowerCase() === email);
    if (found) return found;
    if (data.users.length < 200) return undefined;
    page++;
  }
}
async function targetInfo(svc: SupabaseClient, email: string) {
  const [{ data: ae }, { data: ms }] = await Promise.all([
    svc.from("allowed_emails").select("role, tenant_id").eq("email", email),
    svc
      .from("tenant_memberships")
      .select("role, tenant_id")
      .eq("user_email", email)
      .eq("active", true),
  ]);
  const rows = [...(ae ?? []), ...(ms ?? [])] as {
    role: string;
    tenant_id: string | null;
  }[];
  return {
    isSuperadmin: rows.some((r) => r.role === "superadmin"),
    isPlatform: rows.some((r) => r.role === "developer" || r.role === "superadmin"),
    tenantIds: [
      ...new Set(
        rows.filter((r) => r.role !== "developer" && r.tenant_id).map((r) => r.tenant_id as string),
      ),
    ],
  };
}
async function ensureAuthUser(svc: SupabaseClient, actor: Actor, email: string, supplied?: string) {
  const existing = await authUserByEmail(svc, email);
  if (existing) {
    const d = canResetExistingIdentity(actor, email, await targetInfo(svc, email));
    if (!d.ok) {
      return { id: existing.id, temporaryPassword: undefined, reused: true };
    }
    const next = supplied || password();
    if (!meetsPasswordPolicy(next)) throw new Error("PASSWORD_POLICY");
    const { error } = await svc.auth.admin.updateUserById(existing.id, {
      password: next,
      email_confirm: true,
    });
    if (error) throw error;
    return {
      id: existing.id,
      temporaryPassword: supplied ? undefined : next,
      reused: true,
    };
  }
  const next = supplied || password();
  if (!meetsPasswordPolicy(next)) throw new Error("PASSWORD_POLICY");
  const { data, error } = await svc.auth.admin.createUser({
    email,
    password: next,
    email_confirm: true,
  });
  if (error || !data.user) throw error || new Error("AUTH_CREATE_FAILED");
  return {
    id: data.user.id,
    temporaryPassword: supplied ? undefined : next,
    reused: false,
  };
}
Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);
  const json = (body: Record<string, unknown>, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  const denied = (d: Decision) => (d.ok ? null : json({ error: d.code }, d.status));
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }
  if (!isOriginAllowed(req)) return json({ error: "ORIGIN_NOT_ALLOWED" }, 403);
  if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);
  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) {
      return json({ error: "Falta token de autenticación." }, 401);
    }
    const url = Deno.env.get("SUPABASE_URL"),
      anon = Deno.env.get("SUPABASE_ANON_KEY"),
      key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !anon || !key) {
      return json({ error: "Configuración segura incompleta." }, 500);
    }
    const user = createClient(url, anon, {
      global: { headers: { Authorization: auth } },
    });
    const { data: who, error: whoError } = await user.auth.getUser();
    if (whoError || !who.user?.email) {
      return json({ error: "Sesión inválida." }, 401);
    }
    const { data: verifiedClaims, error: claimsError } = await user.auth.getClaims(
      auth.slice("Bearer ".length),
    );
    if (claimsError || verifiedClaims?.claims?.aal !== "aal2") {
      return json({ error: "MFA_REQUIRED" }, 403);
    }
    const gpsAccess = await checkGpsSessionAccess(user);
    if (!gpsAccess.allowed) {
      return json({ error: gpsAccess.code }, gpsAccess.code === "GPS_REQUIRED" ? 403 : 503);
    }
    const svc = createClient(url, key);
    const [{ data: role }, { data: tenant }, { data: owner }, { data: superadmin }] =
      await Promise.all([
        user.rpc("current_user_role"),
        user.rpc("current_tenant_id"),
        user.rpc("is_platform_owner"),
        user.rpc("is_superadmin"),
      ]);
    const email = who.user.email.toLowerCase();
    let devTenantIds: string[] = [];
    if (owner === true && superadmin !== true) {
      const { data: ms } = await svc
        .from("tenant_memberships")
        .select("tenant_id")
        .eq("user_email", email)
        .eq("role", "developer")
        .eq("active", true);
      devTenantIds = (ms ?? []).map((m: { tenant_id: string }) => m.tenant_id);
    }
    const actor = actorFrom({
      superadmin: superadmin === true,
      platformOwner: owner === true,
      role: String(role ?? ""),
      email,
      tenantId: tenant ? String(tenant) : null,
      devTenantIds,
    });
    const gate = denied(canUseUserAdmin(actor));
    if (gate) return gate;
    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "");
    if (action === "list_users") {
      const scope = listScope(actor);
      if (!scope) return json({ error: "PLATFORM_ROLE_REQUIRED" }, 403);
      const allowed: Array<{ email: string; [key: string]: unknown }> = [];
      for (let page = 0; ; page += 1) {
        let query = svc.from("allowed_emails").select("*");
        if (!scope.all) {
          query = query.in(
            "tenant_id",
            scope.tenantIds.length ? scope.tenantIds : ["00000000-0000-0000-0000-000000000000"],
          );
        }
        const { data: pageAllowed, error: allowedError } = await query
          .order("email")
          .order("tenant_id")
          .range(page * 500, page * 500 + 499);
        if (allowedError) throw allowedError;
        const pageRows = (pageAllowed ?? []) as Array<{ email: string; [key: string]: unknown }>;
        allowed.push(...pageRows);
        if (pageRows.length < 500) break;
      }

      const authUsers = [];
      for (let page = 1; ; page += 1) {
        const { data, error } = await svc.auth.admin.listUsers({ page, perPage: 500 });
        if (error) throw error;
        authUsers.push(...data.users);
        if (data.users.length < 500) break;
      }
      const visible = new Set(
        (allowed ?? []).map((a: { email: string }) => a.email?.toLowerCase()),
      );
      const users = authUsers.filter((u) => scope.all || visible.has(u.email?.toLowerCase() ?? ""));
      return json({
        success: true,
        auth_users: users.map((u) => ({
          id: u.id,
          email: u.email,
          banned: !!u.banned_until,
        })),
        allowed_emails: allowed ?? [],
      });
    }
    if (action === "create_user") {
      const target = cleanEmail(body.email);
      const targetRole = String(body.role ?? "operador");
      const suppliedPassword =
        typeof body.password === "string" && body.password.length ? body.password : undefined;
      if (!target) return json({ error: "Email es obligatorio." }, 400);
      if (suppliedPassword && !meetsPasswordPolicy(suppliedPassword)) {
        return json({ error: PASSWORD_POLICY_MESSAGE }, 400);
      }
      const r = denied(canGrantTenantRole(actor, targetRole));
      if (r) return r;
      if (targetRole === "developer" || targetRole === "superadmin") {
        if (targetRole === "superadmin" && actor.kind !== "superadmin") {
          return json({ error: "SUPERADMIN_PROTECTED" }, 403);
        }
        const a = await ensureAuthUser(svc, actor, target, suppliedPassword);
        return json({
          success: true,
          user_id: a.id,
          temporary_password: a.temporaryPassword,
          message: "Developer creado. Configura sus empresas y permisos.",
        });
      }
      const t = resolveTenant(actor, body.tenant_id);
      if (!t.ok) return json({ error: t.code }, t.status);
      const { data: existingAccess, error: accessError } = await svc
        .from("allowed_emails")
        .select("role, tenant_id, active")
        .eq("email", target)
        .eq("tenant_id", t.tenantId)
        .maybeSingle();
      if (accessError) throw accessError;
      const preauthorizedOwner = isPreauthorizedCompanyOwner(
        existingAccess,
        targetRole,
        t.tenantId,
      );
      if (existingAccess && !preauthorizedOwner) {
        return json({ error: "Este correo ya está autorizado en la empresa." }, 400);
      }
      const { error } = await user.rpc("provision_tenant_access", {
        _tenant_id: t.tenantId,
        _email: target,
        _role: targetRole,
        _permissions: body.permissions ?? {},
      });
      if (error) return json({ error: "PROVISION_DENIED" }, 403);
      const a = await ensureAuthUser(svc, actor, target, suppliedPassword);
      return json({
        success: true,
        user_id: a.id,
        temporary_password: a.temporaryPassword,
        existing_identity: a.reused,
        message: `Usuario ${targetRole} creado.`,
      });
    }
    if (action === "create_worker") {
      const target = cleanEmail(body.email);
      const suppliedPassword =
        typeof body.password === "string" && body.password.length ? body.password : undefined;
      const rut = String(body.worker_rut ?? "")
        .replace(/[.\s-]/g, "")
        .toUpperCase();
      if (!target || !rut) {
        return json({ error: "Email y RUT son obligatorios." }, 400);
      }
      if (suppliedPassword && !meetsPasswordPolicy(suppliedPassword)) {
        return json({ error: PASSWORD_POLICY_MESSAGE }, 400);
      }
      const t = resolveTenant(actor, body.tenant_id);
      if (!t.ok) return json({ error: t.code }, t.status);
      const { data: worker, error: workerError } = await svc
        .from("workers")
        .select("rut, full_name")
        .eq("tenant_id", t.tenantId)
        .eq("rut", rut)
        .maybeSingle();
      if (workerError) throw workerError;
      if (!worker) {
        return json(
          {
            error: "El RUT no corresponde a un trabajador de la empresa.",
          },
          400,
        );
      }

      // A previous attempt may have provisioned the worker row before Auth rejected its
      // temporary password. Permit only the exact same worker access to be retried.
      const [
        { data: existingAccess, error: accessError },
        { data: membership, error: membershipError },
      ] = await Promise.all([
        svc
          .from("allowed_emails")
          .select("role, tenant_id, worker_rut")
          .eq("email", target)
          .maybeSingle(),
        svc
          .from("tenant_memberships")
          .select("role")
          .eq("user_email", target)
          .eq("tenant_id", t.tenantId)
          .maybeSingle(),
      ]);
      if (accessError) throw accessError;
      if (membershipError) throw membershipError;
      const existingRut = String(existingAccess?.worker_rut ?? "")
        .replace(/[.\s-]/g, "")
        .toUpperCase();
      if (
        existingAccess &&
        (existingAccess.role !== "worker" ||
          existingAccess.tenant_id !== t.tenantId ||
          existingRut !== worker.rut)
      ) {
        return json({ error: "EMAIL_ALREADY_AUTHORIZED" }, 409);
      }
      if (membership && membership.role !== "worker") {
        return json({ error: "EMAIL_ALREADY_AUTHORIZED" }, 409);
      }

      const { error } = await user.rpc("provision_worker_access", {
        _tenant_id: t.tenantId,
        _email: target,
        _worker_rut: worker.rut,
        _permissions: {
          must_change_password: true,
          ad_synced: !!body.ad_synced,
        },
      });
      if (error) return json({ error: "PROVISION_DENIED" }, 403);
      const a = await ensureAuthUser(svc, actor, target, suppliedPassword);
      return json({
        success: true,
        user_id: a.id,
        worker_name: worker.full_name,
        temporary_password: a.temporaryPassword,
        existing_identity: a.reused,
        must_change_password: true,
        message: "Cuenta de trabajador creada.",
      });
    }
    if (["set_password", "ban", "unban", "delete_user"].includes(action)) {
      const target = cleanEmail(body.email);
      const info = await targetInfo(svc, target);
      const r = denied(canManageAccount(actor, target, info));
      if (r) return r;
      const found = await authUserByEmail(svc, target);
      if (!found) {
        return json({ error: "No se encontró el usuario en Auth." }, 404);
      }
      if (action === "set_password") {
        const next = String(body.password ?? "");
        if (!meetsPasswordPolicy(next)) {
          return json({ error: PASSWORD_POLICY_MESSAGE }, 400);
        }
        const { error } = await svc.auth.admin.updateUserById(found.id, {
          password: next,
        });
        if (error) throw error;
        return json({ success: true, message: "Contraseña actualizada." });
      }
      if (action === "delete_user") {
        if (
          actor.kind === "superadmin" ||
          info.tenantIds.every((x) => actor.devTenantIds.includes(x))
        ) {
          const { error } = await svc.auth.admin.deleteUser(found.id);
          if (error) throw error;
        }
        const deleteQuery = svc.from("allowed_emails").delete().eq("email", target);
        const scopedDeleteQuery =
          actor.kind === "superadmin"
            ? deleteQuery
            : deleteQuery.in("tenant_id", actor.devTenantIds);
        const { error: deleteError } = await scopedDeleteQuery;
        if (deleteError) throw deleteError;
        return json({ success: true });
      }
      const { error } = await svc.auth.admin.updateUserById(found.id, {
        ban_duration: action === "ban" ? "876000h" : "none",
      });
      if (error) throw error;
      const updateQuery = svc
        .from("allowed_emails")
        .update({ active: action === "unban" })
        .eq("email", target);
      const scopedUpdateQuery =
        actor.kind === "superadmin" ? updateQuery : updateQuery.in("tenant_id", actor.devTenantIds);
      const { error: updateError } = await scopedUpdateQuery;
      if (updateError) throw updateError;
      return json({ success: true });
    }
    return json({ error: `Acción no reconocida: ${action}` }, 400);
  } catch (error) {
    console.error("admin-user-manage", error);
    return json({ error: "Error interno del servidor." }, 500);
  }
});
