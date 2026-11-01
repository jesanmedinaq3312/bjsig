import { useState, useEffect, useCallback } from "react";
import {
  HardHat,
  Mail,
  CheckCircle2,
  XCircle,
  Loader2,
  ShieldAlert,
  Info,
  UserPlus,
  Trash2,
  ShieldCheck,
  KeyRound,
  UserCog,
  Lock,
  Eye,
  EyeOff,
  AlertTriangle,
  X,
  Users,
} from "lucide-react";
import { Button, Badge, Select } from "@/components/ui";
import { CredentialModal } from "@/components/CredentialModal";
import { allowedEmailRepo, getCurrentUserEmail } from "@/lib/repositories";
import { audit } from "@/lib/audit";
import { callEdgeFunction } from "@/lib/edgeFunctions";
import { workerRepo } from "@/lib/repositories";
import { useConfirm } from "@/hooks/useConfirm";
import { useLoading } from "@/components/LoadingProvider";
import { useTenantOptional } from "@/components/TenantProvider";
import { provisionTenantUser } from "@/lib/tenantUsers";
import {
  canProvisionTenantRole,
  COMPANY_OWNER_ROLES,
  TENANT_STAFF_ROLES,
  type TenantStaffRole,
} from "@/lib/roleHierarchy";
import {
  ROLE_LABELS,
  ROLE_COLORS,
  DEFAULT_PERMISSIONS,
  PERMISSION_GROUPS,
  PERMISSION_LABELS,
  VIEW_PREVIEW,
  type AllowedEmail,
  type UserRole,
} from "./constants";

export function AccessControlPanel({
  isAdmin,
  isPlatformOperator = false,
  currentEmail,
  currentUserRole = "",
}: {
  isAdmin: boolean;
  isPlatformOperator?: boolean;
  currentEmail: string;
  currentUserRole?: string;
}) {
  const [emails, setEmails] = useState<AllowedEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<UserRole>("human_resources");
  const [newPermissions, setNewPermissions] = useState<Record<string, boolean>>(
    DEFAULT_PERMISSIONS.human_resources,
  );
  const [editingNewPermissions, setEditingNewPermissions] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [editingPermissions, setEditingPermissions] = useState<AllowedEmail | null>(null);
  const [authUsersMap, setAuthUsersMap] = useState<Record<string, { id: string; banned: boolean }>>(
    {},
  );
  const [resetBusyEmail, setResetBusyEmail] = useState<string | null>(null);
  const [passwordModal, setPasswordModal] = useState<AllowedEmail | null>(null);
  const [credentialModal, setCredentialModal] = useState<{
    name: string;
    email: string;
    password?: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [activeUserEmail, setActiveUserEmail] = useState<string>(currentEmail || "");
  const [filter, setFilter] = useState<"all" | "worker" | "staff">("all");
  const { confirm } = useConfirm();
  const { runWithLoading } = useLoading();
  const tenant = useTenantOptional();
  const tenantId = tenant?.tenantId ?? null;
  const tenantOwner = currentUserRole === "company_owner" || currentUserRole === "admin";
  const creatableRoles: UserRole[] = isPlatformOperator
    ? TENANT_STAFF_ROLES
    : tenantOwner
      ? COMPANY_OWNER_ROLES
      : ["operador"];

  useEffect(() => {
    async function fetchAuthUser() {
      const sessionEmail = await getCurrentUserEmail();
      if (sessionEmail) setActiveUserEmail(sessionEmail);
      else if (currentEmail) setActiveUserEmail(currentEmail);
    }
    fetchAuthUser();
  }, [currentEmail]);

  const effectiveEmail = activeUserEmail.trim().toLowerCase();

  const load = useCallback(async () => {
    setLoading(true);
    const rows = await allowedEmailRepo.getAll();
    if (rows) {
      const workerMap = await workerRepo.getRutNameMap();
      const enriched = (rows as AllowedEmail[]).map((row) => ({
        ...row,
        worker_name: row.worker_rut ? (workerMap.get(row.worker_rut) ?? null) : null,
      }));
      setEmails(enriched);
    }
    const { data: authData } = await callEdgeFunction<{
      auth_users: { id: string; email: string; banned: boolean }[];
    }>("admin-user-manage", { action: "list_users" });
    if (authData?.auth_users) {
      const map: Record<string, { id: string; banned: boolean }> = {};
      authData.auth_users.forEach((u) => {
        map[u.email.toLowerCase()] = { id: u.id, banned: u.banned };
      });
      setAuthUsersMap(map);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visibleEmails = (
    isAdmin ? emails : emails.filter((e) => e.email.trim().toLowerCase() === effectiveEmail)
  )
    .filter((e) => isPlatformOperator || (e.role !== "developer" && e.role !== "superadmin"))
    .filter(
      (e) => filter === "all" || (filter === "worker" ? e.role === "worker" : e.role !== "worker"),
    );

  async function addEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!newEmail.trim()) return;
    setBusy(true);
    setMsg(null);
    try {
      await runWithLoading(async () => {
        const cleanEmail = newEmail.trim().toLowerCase();
        const perms = newPermissions;
        if (!tenantId)
          throw new Error(
            "No hay una empresa activa. Vuelve a entrar desde la ruta de la empresa.",
          );
        if (
          !creatableRoles.includes(newRole) ||
          !canProvisionTenantRole(isPlatformOperator ? "developer" : currentUserRole, newRole)
        )
          throw new Error("Tu rol no puede crear ese tipo de usuario.");
        const createData = await provisionTenantUser({
          tenantId,
          email: cleanEmail,
          password: newPassword,
          role: newRole as TenantStaffRole,
          permissions: perms,
        });
        await audit({
          action: "access.email.add",
          entity: "allowed_emails",
          entity_label: cleanEmail,
          details: { role: newRole, with_credentials: true },
        });
        setNewEmail("");
        setNewPassword("");
        setNewPermissions(DEFAULT_PERMISSIONS.human_resources);
        setNewRole("human_resources");
        await load();
        const tempPw = createData?.temporary_password;
        setMsg({
          type: "ok",
          text: tempPw
            ? `Usuario ${ROLE_LABELS[newRole]} creado. Contraseña temporal generada.`
            : `Usuario ${ROLE_LABELS[newRole]} creado con credenciales.`,
        });
        if (tempPw)
          setCredentialModal({ name: ROLE_LABELS[newRole], email: cleanEmail, password: tempPw });
      });
    } catch (err) {
      setMsg({
        type: "err",
        text: err instanceof Error ? err.message : "Error al autorizar correo",
      });
    } finally {
      setBusy(false);
    }
  }

  async function resetWorkerPassword(email: string) {
    setResetBusyEmail(email);
    setMsg(null);
    try {
      await runWithLoading(async () => {
        const { error } = await callEdgeFunction("admin-user-manage", {
          action: "reset_password",
          email,
          redirect_to: `${window.location.origin}/admin`,
        });
        if (error) throw new Error(error);
        await audit({
          action: "access.worker_account.reset_password",
          entity: "auth",
          entity_label: email,
        });
        setMsg({ type: "ok", text: `Correo de recuperacion enviado a ${email}.` });
      });
    } catch (err) {
      setMsg({
        type: "err",
        text: err instanceof Error ? err.message : "Error al enviar correo de recuperacion",
      });
    } finally {
      setResetBusyEmail(null);
    }
  }

  async function setDirectPassword(email: string, newPassword: string) {
    setBusy(true);
    setMsg(null);
    try {
      await runWithLoading(async () => {
        const { error } = await callEdgeFunction("admin-user-manage", {
          action: "set_password",
          email,
          password: newPassword,
        });
        if (error) throw new Error(error);
        await audit({ action: "access.user.set_password", entity: "auth", entity_label: email });
        setMsg({ type: "ok", text: `Contraseña de ${email} actualizada directamente.` });
      });
    } catch (err) {
      setMsg({
        type: "err",
        text: err instanceof Error ? err.message : "Error al cambiar contrasena",
      });
    } finally {
      setBusy(false);
    }
  }

  async function toggleBanWorker(email: string, currentlyBanned: boolean) {
    setBusy(true);
    setMsg(null);
    try {
      await runWithLoading(async () => {
        const action = currentlyBanned ? "unban" : "ban";
        const { error } = await callEdgeFunction("admin-user-manage", { action, email });
        if (error) throw new Error(error);
        await audit({
          action: `access.worker_account.${action}`,
          entity: "auth",
          entity_label: email,
        });
        await load();
        setMsg({ type: "ok", text: currentlyBanned ? "Cuenta reactivada." : "Cuenta bloqueada." });
      });
    } catch (err) {
      setMsg({ type: "err", text: err instanceof Error ? err.message : "Error" });
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(e: AllowedEmail) {
    setBusy(true);
    setMsg(null);
    try {
      await runWithLoading(async () => {
        await allowedEmailRepo.setActive(e.id, !e.active);
        await audit({
          action: "access.email.toggle",
          entity: "allowed_emails",
          entity_id: e.id,
          entity_label: e.email,
          details: { active: !e.active },
        });
        await load();
      });
    } catch (err) {
      setMsg({ type: "err", text: err instanceof Error ? err.message : "Error al actualizar" });
    } finally {
      setBusy(false);
    }
  }

  async function removeEmail(e: AllowedEmail) {
    const ok = await confirm({
      title: "Eliminar correo autorizado",
      message: `¿Eliminar ${e.email} de la lista de autorizados?`,
      confirmText: "Eliminar",
      type: "danger",
    });
    if (!ok) return;
    setBusy(true);
    setMsg(null);
    try {
      await runWithLoading(async () => {
        await allowedEmailRepo.removeById(e.id);
        await audit({
          action: "access.email.remove",
          entity: "allowed_emails",
          entity_id: e.id,
          entity_label: e.email,
        });
        await load();
        setMsg({ type: "ok", text: "Correo eliminado." });
      });
    } catch (err) {
      setMsg({ type: "err", text: err instanceof Error ? err.message : "Error al eliminar" });
    } finally {
      setBusy(false);
    }
  }

  async function savePermissions(
    e: AllowedEmail,
    perms: Record<string, boolean>,
    newRoleValue: UserRole,
  ) {
    setBusy(true);
    setMsg(null);
    try {
      await runWithLoading(async () => {
        if (
          !isPlatformOperator &&
          (!tenantOwner ||
            (newRoleValue !== e.role && !canProvisionTenantRole(currentUserRole, newRoleValue)))
        ) {
          throw new Error(
            "No puedes escalar ni cambiar este usuario a un rol fuera de tu empresa.",
          );
        }
        const roleChanged = newRoleValue !== e.role;
        await allowedEmailRepo.setRoleAndPermissions(e.id, newRoleValue, perms);
        await audit({
          action: "access.email.permissions",
          entity: "allowed_emails",
          entity_id: e.id,
          entity_label: e.email,
          details: { ...perms, role: newRoleValue },
        });
        setEditingPermissions(null);
        await load();
        setMsg({
          type: "ok",
          text: roleChanged
            ? `Rol actualizado a ${ROLE_LABELS[newRoleValue]}. ${newRoleValue === "worker" ? "Ahora verá el Portal del Trabajador." : "Ahora verá el panel admin con las vistas asignadas."}`
            : "Permisos actualizados correctamente.",
        });
      });
    } catch (err) {
      setMsg({
        type: "err",
        text: err instanceof Error ? err.message : "Error al guardar permisos",
      });
    } finally {
      setBusy(false);
    }
  }

  const bootstrap = emails.length === 0;

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Users size={18} className="text-blue-600" />
        <h3 className="text-sm font-semibold text-slate-800">
          Control de Acceso — Correos y Credenciales
        </h3>
      </div>
      <p className="text-xs text-slate-500 -mt-2">
        Autoriza correos, crea usuarios con credenciales y gestiona permisos por rol. El que manda
        es la asignacion de permisos aqui en Configuracion.
      </p>

      {tenantOwner && (
        <div className="flex items-start gap-2 px-3 py-2.5 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
          <ShieldCheck size={16} className="shrink-0 mt-0.5" />
          <span>
            Como responsable de <strong>{tenant?.tenant?.name ?? "esta empresa"}</strong>, puedes
            crear el usuario de Recursos Humanos. Ese usuario podrá administrar trabajadores y su
            portal, sin acceso a otras empresas.
          </span>
        </div>
      )}

      {bootstrap && (
        <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
          <ShieldAlert size={16} className="shrink-0 mt-0.5" />
          <span>
            Modo libre activo: no hay correos autorizados. Agrega tu correo para activar el control
            de acceso.
          </span>
        </div>
      )}

      {!isAdmin && !bootstrap && (
        <div className="flex items-start gap-2 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600">
          <Info size={16} className="shrink-0 mt-0.5" />
          <span>
            Solo los administradores pueden modificar la lista. Tu correo:{" "}
            <strong>{effectiveEmail}</strong>
          </span>
        </div>
      )}

      {msg && (
        <div
          className={`flex items-start gap-2 px-3 py-2 rounded-lg text-sm ${msg.type === "err" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}
        >
          {msg.type === "err" ? (
            <XCircle size={16} className="shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
          )}
          <span>{msg.text}</span>
        </div>
      )}

      {isAdmin && (
        <form
          onSubmit={addEmail}
          className="space-y-2 p-4 bg-slate-50 border border-slate-200 rounded-xl"
        >
          <div className="text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1.5">
            <UserCog size={14} /> Crear nuevo usuario con credenciales
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            <div className="relative">
              <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="relative">
              <KeyRound
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Contraseña (en blanco = auto-generada)"
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <Select
              value={newRole}
              onChange={(e) => {
                const role = e.target.value as UserRole;
                setNewRole(role);
                setNewPermissions(DEFAULT_PERMISSIONS[role]);
              }}
            >
              {creatableRoles.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </Select>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditingNewPermissions(true)}
              className="w-full"
            >
              <Lock size={15} /> Elegir vistas (
              {VIEW_PREVIEW.filter((v) => newPermissions[v.permKey]).length})
            </Button>
            <Button type="submit" size="sm" disabled={busy} className="w-full">
              <UserPlus size={15} /> Crear usuario
            </Button>
          </div>
          <p className="text-[11px] text-slate-400">
            Para trabajadores, usa la ficha en <strong>Trabajadores</strong> — la cuenta del portal
            se crea sola. Este formulario crea staff de la empresa y asigna automáticamente su
            membresía tenant-scoped.
          </p>
        </form>
      )}

      {/* Filter tabs */}
      {!bootstrap && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {(
            [
              { key: "all", label: "Todos", count: emails.length },
              {
                key: "staff",
                label: "Personal",
                count: emails.filter((e) => e.role !== "worker").length,
              },
              {
                key: "worker",
                label: "Trabajadores",
                count: emails.filter((e) => e.role === "worker").length,
              },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${filter === tab.key ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 size={20} className="animate-spin text-slate-400" />
        </div>
      ) : visibleEmails.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-4">
          {isAdmin
            ? "No hay correos autorizados todavía."
            : "Tu correo no figura en la lista de autorizados."}
        </p>
      ) : (
        <div className="space-y-1.5">
          {visibleEmails.map((e) => {
            const isCurrentUser = e.email.trim().toLowerCase() === effectiveEmail;
            const authInfo = authUsersMap[e.email.toLowerCase()];
            return (
              <div
                key={e.id}
                className={`flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 px-3 py-2.5 rounded-lg border ${e.active ? "bg-white border-slate-200" : "bg-slate-50 border-slate-200 opacity-60"}`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${ROLE_COLORS[e.role as UserRole] ?? "bg-slate-100"}`}
                  >
                    {e.role === "worker" ? (
                      <HardHat size={16} className="text-cyan-700" />
                    ) : e.role === "superadmin" ? (
                      <ShieldCheck size={16} className="text-amber-700" />
                    ) : e.role === "admin" || e.role === "developer" ? (
                      <ShieldCheck size={16} className="text-blue-700" />
                    ) : (
                      <Mail size={16} className="text-slate-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{e.email}</p>
                    <p className="text-xs text-slate-500">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${ROLE_COLORS[e.role as UserRole] ?? "bg-slate-100 text-slate-600"}`}
                      >
                        {ROLE_LABELS[e.role as UserRole] ?? e.role}
                      </span>
                      {isCurrentUser && " · Tú"}
                      {e.role === "worker" && e.worker_name && ` · ${e.worker_name}`}
                      {authInfo?.banned && (
                        <span className="text-red-500 font-medium"> · Bloqueado</span>
                      )}
                    </p>
                  </div>
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-1 flex-wrap pl-11 sm:pl-0">
                    {e.role !== "worker" && (
                      <button
                        onClick={() => setEditingPermissions(e)}
                        className="px-2 py-1 text-xs rounded-md text-slate-600 hover:bg-slate-100"
                        title="Editar permisos"
                      >
                        <Lock size={13} className="inline sm:mr-0.5" />
                        <span className="hidden sm:inline">Permisos</span>
                      </button>
                    )}
                    {authInfo && (
                      <button
                        onClick={() => toggleBanWorker(e.email, authInfo.banned)}
                        className={`px-2 py-1 text-xs rounded-md ${authInfo.banned ? "text-emerald-600 hover:bg-emerald-50" : "text-amber-600 hover:bg-amber-50"}`}
                        title={authInfo.banned ? "Desbloquear" : "Bloquear"}
                      >
                        {authInfo.banned ? "Activar" : "Bloquear"}
                      </button>
                    )}
                    <button
                      onClick={() => setPasswordModal(e)}
                      className="px-2 py-1 text-xs rounded-md text-blue-600 hover:bg-blue-50"
                      title="Cambiar contraseña directamente"
                    >
                      <KeyRound size={12} className="inline sm:mr-0.5" />
                      <span className="hidden sm:inline">Cambiar</span>
                    </button>
                    <button
                      onClick={() => resetWorkerPassword(e.email)}
                      className="px-2 py-1 text-xs rounded-md text-slate-500 hover:bg-slate-100"
                      title="Enviar correo de recuperacion"
                      disabled={resetBusyEmail === e.email}
                    >
                      {resetBusyEmail === e.email ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Mail size={12} className="inline sm:mr-0.5" />
                      )}
                      <span className="hidden sm:inline">Correo</span>
                    </button>
                    <button
                      onClick={() => toggleActive(e)}
                      className={`px-2 py-1 text-xs rounded-md ${e.active ? "text-amber-600 hover:bg-amber-50" : "text-emerald-600 hover:bg-emerald-50"}`}
                      title={e.active ? "Desactivar" : "Activar"}
                    >
                      {e.active ? "Desactivar" : "Activar"}
                    </button>
                    <button
                      onClick={() => removeEmail(e)}
                      className="p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded"
                      title="Eliminar"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                )}
                {!isAdmin && (
                  <Badge
                    className={`${e.active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200"} self-start sm:self-auto`}
                  >
                    {e.active ? "Activo" : "Inactivo"}
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!bootstrap && isAdmin && (
        <div className="flex items-center gap-4 pt-2 border-t border-slate-100 text-xs text-slate-500 flex-wrap">
          {(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => (
            <span key={r} className="flex items-center gap-1">
              <span
                className={`inline-block w-2 h-2 rounded-full ${ROLE_COLORS[r].split(" ")[0]}`}
              />
              {emails.filter((e) => e.role === r && e.active).length} {ROLE_LABELS[r].toLowerCase()}
              (s)
            </span>
          ))}
          <span className="flex items-center gap-1">
            <XCircle size={13} className="text-slate-400" />{" "}
            {emails.filter((e) => !e.active).length} inactivo(s)
          </span>
        </div>
      )}

      {editingPermissions && (
        <PermissionsModal
          email={editingPermissions}
          onSave={savePermissions}
          onClose={() => setEditingPermissions(null)}
          busy={busy}
          allowPlatformRoles={isPlatformOperator}
          allowedRoles={
            isPlatformOperator
              ? (Object.keys(ROLE_LABELS) as UserRole[]).filter((role) => role !== "worker")
              : editingPermissions.role === "company_owner"
                ? ["company_owner"]
                : tenantOwner
                  ? COMPANY_OWNER_ROLES
                  : [editingPermissions.role as UserRole]
          }
        />
      )}

      {editingNewPermissions && (
        <PermissionsModal
          email={{
            id: "",
            email: newEmail || "Nuevo usuario",
            role: newRole,
            active: true,
            worker_rut: null,
            created_at: "",
            permissions: newPermissions,
          }}
          onSave={(_, perms, role) => {
            setNewRole(role);
            setNewPermissions(perms);
            setEditingNewPermissions(false);
          }}
          onClose={() => setEditingNewPermissions(false)}
          busy={false}
          allowPlatformRoles={isPlatformOperator}
          allowedRoles={creatableRoles}
        />
      )}

      {passwordModal && (
        <SetPasswordModal
          email={passwordModal.email}
          onSave={setDirectPassword}
          onClose={() => setPasswordModal(null)}
          busy={busy}
        />
      )}

      {credentialModal && (
        <CredentialModal
          open={!!credentialModal}
          onClose={() => setCredentialModal(null)}
          workerName={credentialModal.name}
          email={credentialModal.email}
          temporaryPassword={credentialModal.password}
        />
      )}
    </div>
  );
}

function SetPasswordModal({
  email,
  onSave,
  onClose,
  busy,
}: {
  email: string;
  onSave: (email: string, password: string) => void;
  onClose: () => void;
  busy: boolean;
}) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!newPassword || !confirmPassword) {
      setError("Todos los campos son obligatorios.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (newPassword.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    onSave(email, newPassword);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Cambiar contraseña</h3>
            <p className="text-xs text-slate-500">Usuario: {email}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3">
          <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-200/80 rounded-lg text-xs text-amber-700">
            <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-600" />
            <span>
              Estableces la contraseña directamente, sin necesidad de correo. El usuario debera usar
              esta contraseña para ingresar.
            </span>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Nueva contraseña
            </label>
            <div className="relative">
              <KeyRound
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimo 8 caracteres"
                className="w-full pl-9 pr-10 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Confirmar contraseña
            </label>
            <div className="relative">
              <KeyRound
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite la contraseña"
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" type="button" onClick={onClose}>
              Cancelar
            </Button>
            <Button size="sm" type="submit" disabled={busy}>
              {busy ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}{" "}
              Guardar
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PermissionsModal({
  email,
  onSave,
  onClose,
  busy,
  allowPlatformRoles = false,
  allowedRoles,
}: {
  email: AllowedEmail;
  onSave: (e: AllowedEmail, perms: Record<string, boolean>, role: UserRole) => void;
  onClose: () => void;
  busy: boolean;
  allowPlatformRoles?: boolean;
  allowedRoles?: UserRole[];
}) {
  const [role, setRole] = useState<UserRole>(email.role as UserRole);
  const [perms, setPerms] = useState<Record<string, boolean>>(
    email.permissions ?? DEFAULT_PERMISSIONS[email.role as UserRole] ?? {},
  );
  const [showPreview, setShowPreview] = useState(false);

  function handleRoleChange(next: UserRole) {
    setRole(next);
    setPerms(DEFAULT_PERMISSIONS[next] ?? {});
  }

  function toggle(key: string) {
    setPerms((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function toggleGroup(keys: string[], value: boolean) {
    setPerms((prev) => {
      const next = { ...prev };
      for (const k of keys) next[k] = value;
      return next;
    });
  }

  const visibleViews = VIEW_PREVIEW.filter((v) => perms[v.permKey]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 sticky top-0 bg-white z-10">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Permisos — {email.email}</h3>
            <p className="text-xs text-slate-500">
              Rol actual: {ROLE_LABELS[email.role as UserRole] ?? email.role}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Rol
            </label>
            <Select value={role} onChange={(e) => handleRoleChange(e.target.value as UserRole)}>
              {(
                allowedRoles ??
                (Object.keys(ROLE_LABELS) as UserRole[]).filter(
                  (r) => allowPlatformRoles || !["developer", "superadmin"].includes(r),
                )
              ).map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </Select>
            {role === "worker" ? (
              <p className="text-[11px] text-slate-400 mt-1">
                Con este rol, la persona ve el Portal del Trabajador (RUT + correo), no el panel
                admin.
              </p>
            ) : (email.role as UserRole) === "worker" ? (
              <p className="text-[11px] text-amber-600 mt-1">
                Al guardar, esta cuenta deja el Portal del Trabajador y pasa a ver el panel admin
                con las vistas de abajo.
              </p>
            ) : null}
          </div>

          <div className="border border-blue-200 rounded-lg bg-blue-50/50 p-3">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-2 text-sm font-medium text-blue-700 w-full"
            >
              <Eye size={16} />
              Vista previa del menu del usuario ({visibleViews.length} vistas)
              <span className="ml-auto text-xs text-blue-500">
                {showPreview ? "Ocultar" : "Mostrar"}
              </span>
            </button>
            {showPreview && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {visibleViews.length === 0 ? (
                  <p className="text-xs text-slate-400">
                    Sin vistas asignadas. El usuario no vera ningun modulo al ingresar.
                  </p>
                ) : (
                  visibleViews.map((v) => (
                    <span
                      key={v.permKey}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-slate-200 rounded-md text-xs text-slate-700"
                    >
                      <v.icon size={12} className="text-blue-500" />
                      {v.label}
                    </span>
                  ))
                )}
              </div>
            )}
          </div>

          {PERMISSION_GROUPS.map((group) => (
            <div key={group.label}>
              <div className="flex items-center justify-between mb-1.5">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {group.label}
                </h4>
                <div className="flex gap-1">
                  <button
                    onClick={() => toggleGroup(group.keys, true)}
                    className="text-xs px-2 py-0.5 rounded text-blue-600 hover:bg-blue-50"
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => toggleGroup(group.keys, false)}
                    className="text-xs px-2 py-0.5 rounded text-slate-500 hover:bg-slate-100"
                  >
                    Ninguno
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {group.keys.map((key) => (
                  <label
                    key={key}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={!!perms[key]}
                      onChange={() => toggle(key)}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-slate-700">{PERMISSION_LABELS[key] ?? key}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-200 sticky bottom-0 bg-white">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button size="sm" onClick={() => onSave(email, perms, role)} disabled={busy}>
            Guardar
          </Button>
        </div>
      </div>
    </div>
  );
}
