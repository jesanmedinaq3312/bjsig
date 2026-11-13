import { Fragment, useState, useEffect, useCallback } from "react";
import {
  Activity,
  ScrollText,
  Search,
  RefreshCw,
  Download,
  Filter,
  ChevronDown,
  ChevronUp,
  Clock3,
  Globe,
  Monitor,
  ShieldCheck,
  User,
  Users,
} from "lucide-react";
import { Card, CardHeader, Button, Badge, Spinner } from "@/components/ui";
import { activityLogRepo } from "@/lib/repositories";
import type { ActivityLog } from "@/lib/types";
import { ExportService } from "@/lib/export";
import { logger } from "@/lib/logger";
import { supabase } from "@/lib/supabase";

const PAGE_SIZE = 100;

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  "worker.create": {
    label: "Crear trabajador",
    color: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  "worker.update": {
    label: "Editar trabajador",
    color: "bg-blue-100 text-blue-700 border-blue-200",
  },
  "worker.delete": {
    label: "Eliminar trabajador",
    color: "bg-red-100 text-red-700 border-red-200",
  },
  "incident.create": {
    label: "Crear incidente",
    color: "bg-amber-100 text-amber-700 border-amber-200",
  },
  "incident.update": {
    label: "Editar incidente",
    color: "bg-blue-100 text-blue-700 border-blue-200",
  },
  "incident.delete": {
    label: "Eliminar incidente",
    color: "bg-red-100 text-red-700 border-red-200",
  },
  "training.create": {
    label: "Crear capacitación",
    color: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  "training.update": {
    label: "Editar capacitación",
    color: "bg-blue-100 text-blue-700 border-blue-200",
  },
  "training.delete": {
    label: "Eliminar capacitación",
    color: "bg-red-100 text-red-700 border-red-200",
  },
  "shift.create": {
    label: "Registrar turno",
    color: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  "shift.update": {
    label: "Editar turno",
    color: "bg-blue-100 text-blue-700 border-blue-200",
  },
  "shift.delete": {
    label: "Eliminar turno",
    color: "bg-red-100 text-red-700 border-red-200",
  },
  "epp.create": {
    label: "Entregar EPP",
    color: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  "epp.delete": {
    label: "Eliminar EPP",
    color: "bg-red-100 text-red-700 border-red-200",
  },
  "ast.create": {
    label: "Crear AST",
    color: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  "ast.delete": {
    label: "Eliminar AST",
    color: "bg-red-100 text-red-700 border-red-200",
  },
  "cphs.create": {
    label: "Crear acta CPHS",
    color: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  "cphs.delete": {
    label: "Eliminar acta CPHS",
    color: "bg-red-100 text-red-700 border-red-200",
  },
  "iso.create": {
    label: "Crear hallazgo ISO",
    color: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  "iso.update": {
    label: "Editar hallazgo ISO",
    color: "bg-blue-100 text-blue-700 border-blue-200",
  },
  "iso.delete": {
    label: "Eliminar hallazgo ISO",
    color: "bg-red-100 text-red-700 border-red-200",
  },
  "hhc.create": {
    label: "Crear plan HHC",
    color: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  "hhc.update": {
    label: "Editar plan HHC",
    color: "bg-blue-100 text-blue-700 border-blue-200",
  },
  "hhc.delete": {
    label: "Eliminar plan HHC",
    color: "bg-red-100 text-red-700 border-red-200",
  },
  "clouddoc.create": {
    label: "Subir documento",
    color: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  "clouddoc.update": {
    label: "Editar documento",
    color: "bg-blue-100 text-blue-700 border-blue-200",
  },
  "clouddoc.delete": {
    label: "Eliminar documento",
    color: "bg-red-100 text-red-700 border-red-200",
  },
  "qr.scan": {
    label: "Escaneo QR",
    color: "bg-violet-100 text-violet-700 border-violet-200",
  },
  "access.email.add": {
    label: "Autorizar correo",
    color: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  "access.email.toggle": {
    label: "Cambiar acceso correo",
    color: "bg-amber-100 text-amber-700 border-amber-200",
  },
  "access.email.role": {
    label: "Cambiar rol correo",
    color: "bg-blue-100 text-blue-700 border-blue-200",
  },
  "access.email.remove": {
    label: "Eliminar correo",
    color: "bg-red-100 text-red-700 border-red-200",
  },
  "auth.signin": {
    label: "Inicio de sesión",
    color: "bg-slate-100 text-slate-700 border-slate-200",
  },
  "auth.admin_signin_failed": {
    label: "Intento de acceso administrativo fallido",
    color: "bg-red-100 text-red-700 border-red-200",
  },
  "worker.signin_failed": {
    label: "Intento de acceso de trabajador fallido",
    color: "bg-red-100 text-red-700 border-red-200",
  },
  "auth.signout": {
    label: "Cierre de sesión",
    color: "bg-slate-100 text-slate-700 border-slate-200",
  },
  "auth.signup": {
    label: "Registro de cuenta",
    color: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  "worker.check_account": {
    label: "Verificar cuenta trabajador",
    color: "bg-slate-100 text-slate-700 border-slate-200",
  },
  "worker.auth_user_created": {
    label: "Crear auth trabajador",
    color: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  "worker.password_expired": {
    label: "Contraseña expirada",
    color: "bg-red-100 text-red-700 border-red-200",
  },
  "worker.set_initial_password": {
    label: "Establecer contraseña inicial",
    color: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  "worker.change_password": {
    label: "Cambiar contraseña",
    color: "bg-blue-100 text-blue-700 border-blue-200",
  },
  "worker.request_reset": {
    label: "Solicitar reset contraseña",
    color: "bg-amber-100 text-amber-700 border-amber-200",
  },
  "worker.portal_access": {
    label: "Acceso al portal trabajador",
    color: "bg-violet-100 text-violet-700 border-violet-200",
  },
  "worker.portal_preview": {
    label: "Admin ve portal trabajador",
    color: "bg-slate-100 text-slate-700 border-slate-200",
  },
  page_view: {
    label: "Navegación",
    color: "bg-violet-100 text-violet-700 border-violet-200",
  },
  page_time: {
    label: "Tiempo en pantalla",
    color: "bg-cyan-100 text-cyan-700 border-cyan-200",
  },
};

function metaFor(action: string) {
  return (
    ACTION_LABELS[action] ?? {
      label: action,
      color: "bg-slate-100 text-slate-600 border-slate-200",
    }
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("es-CL", { dateStyle: "short", timeStyle: "medium" });
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `hace ${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `hace ${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `hace ${hr}h`;
  const day = Math.floor(hr / 24);
  return `hace ${day}d`;
}

function formatDuration(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  if (safeSeconds < 60) return `${safeSeconds}s`;
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function roleLabel(role: string | null | undefined): string {
  if (!role) return "Sin rol";
  const labels: Record<string, string> = {
    worker: "Trabajador",
    admin: "Administrador",
    company_owner: "Dueño de empresa",
    manager: "Manager",
    operator: "Operador",
    developer: "Dev Team",
    superadmin: "Superadmin",
    platform_owner: "Plataforma",
    unknown: "No identificado",
  };
  return labels[role] ?? role.replaceAll("_", " ");
}

export function LogsView() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [tenants, setTenants] = useState<Array<{ tenant_id: string; tenant_name: string }>>([]);
  const [tenantFilter, setTenantFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [sessionFilter, setSessionFilter] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { rows, total } = await activityLogRepo.getFiltered({
        tenantId: tenantFilter || undefined,
        action: actionFilter || undefined,
        entity: entityFilter || undefined,
        role: roleFilter || undefined,
        sessionId: sessionFilter || undefined,
        search: search || undefined,
        limit: PAGE_SIZE,
      });
      setLogs(rows);
      setCount(total);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.warn("[logs] load error:", message);
      setLoadError(message);
      setLogs([]);
      setCount(0);
    }
    setLoading(false);
  }, [actionFilter, entityFilter, roleFilter, search, sessionFilter, tenantFilter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.rpc("fetch_saas_tenant_overview");
      if (Array.isArray(data)) {
        setTenants(
          data.map((tenant: { tenant_id: string; tenant_name: string }) => ({
            tenant_id: tenant.tenant_id,
            tenant_name: tenant.tenant_name,
          })),
        );
      }
    })();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("activity-logs-live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_logs" }, () => {
        void load();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [load]);

  const entities = Array.from(new Set(logs.map((l) => l.entity))).sort();
  const actions = Array.from(new Set(logs.map((l) => l.action))).sort();
  const roles = Array.from(
    new Set(logs.map((log) => log.user_role).filter((role): role is string => Boolean(role))),
  ).sort();
  const visibleUsers = new Set(logs.map((log) => log.user_email).filter(Boolean)).size;
  const visiblePageViews = logs.filter((log) => log.action === "page_view").length;
  const visibleSeconds = logs.reduce((total, log) => {
    if (log.action !== "page_time") return total;
    const detailSeconds = log.details?.duration_seconds;
    return (
      total + (log.session_duration ?? (typeof detailSeconds === "number" ? detailSeconds : 0))
    );
  }, 0);

  const [exporting, setExporting] = useState(false);

  async function exportLogs() {
    setExporting(true);
    try {
      const allLogs = await activityLogRepo.exportFiltered({
        tenantId: tenantFilter || undefined,
        action: actionFilter || undefined,
        entity: entityFilter || undefined,
        role: roleFilter || undefined,
        sessionId: sessionFilter || undefined,
        search: search || undefined,
      });
      ExportService.toExcel(
        allLogs.map((l) => ({
          Fecha: l.created_at,
          Usuario: l.user_email,
          Acción: l.action,
          Entidad: l.entity,
          "ID Entidad": l.entity_id ?? "",
          Descripción: l.entity_label ?? "",
          Ruta: l.page_path ?? "",
          "Segundos en pantalla": l.session_duration ?? "",
          Detalles: l.details ? JSON.stringify(l.details) : "",
          IP: l.ip_hint ?? "",
          Navegador: l.user_agent ?? "",
          Rol: l.user_role ?? "",
          Sesión: l.session_id ?? "",
        })),
        "Logs",
        "logs_actividad",
      );
    } catch (err) {
      logger.warn("[logs] export error:", err instanceof Error ? err.message : err);
    }
    setExporting(false);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <ScrollText size={22} className="text-blue-600" />
        <h2 className="text-lg font-semibold text-slate-800">Registro de Actividad (Logs)</h2>
        <Badge className="bg-slate-100 text-slate-600 border-slate-200">{count} registros</Badge>
        {sessionFilter && (
          <button
            type="button"
            onClick={() => setSessionFilter("")}
            className="ml-auto rounded-full bg-blue-50 px-3 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-100"
            title="Quitar filtro de sesión"
          >
            Recorrido de sesión · {sessionFilter.slice(0, 8)}… ×
          </button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <Activity size={15} className="text-blue-600" />
            Eventos
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">{count.toLocaleString("es-CL")}</p>
          <p className="mt-1 text-[10px] text-slate-400">total según filtros aplicados</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <Users size={15} className="text-violet-600" />
            Usuarios
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">{visibleUsers}</p>
          <p className="mt-1 text-[10px] text-slate-400">usuarios únicos en los eventos cargados</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <ScrollText size={15} className="text-emerald-600" />
            Vistas
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">{visiblePageViews}</p>
          <p className="mt-1 text-[10px] text-slate-400">
            vistas dentro de los últimos registros cargados
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <Clock3 size={15} className="text-cyan-600" />
            Tiempo visible estimado
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">
            {formatDuration(visibleSeconds)}
          </p>
          <p className="mt-1 text-[10px] text-slate-400">suma de los eventos de página cargados</p>
        </div>
      </div>

      <Card>
        <CardHeader
          title="Auditoría de actividad"
          subtitle="Eventos de acceso y navegación por usuario/rol, sesión seudónima validada por servidor, IP y navegador cuando están disponibles, y tiempo estimado con la pestaña visible. Esta auditoría de navegación no recopila GPS ni crea un fingerprint persistente del dispositivo."
        />
        <div className="px-5 pb-5 space-y-4">
          {/* Filters */}
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Buscar por usuario o descripción..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
              />
            </div>
            {tenants.length > 0 && (
              <select
                value={tenantFilter}
                onChange={(e) => setTenantFilter(e.target.value)}
                className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                aria-label="Filtrar logs por empresa"
              >
                <option value="">Todas las empresas</option>
                {tenants.map((tenant) => (
                  <option key={tenant.tenant_id} value={tenant.tenant_id}>
                    {tenant.tenant_name}
                  </option>
                ))}
              </select>
            )}
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Todas las acciones</option>
              {actions.map((a) => (
                <option key={a} value={a}>
                  {metaFor(a).label}
                </option>
              ))}
            </select>
            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Todas las entidades</option>
              {entities.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              aria-label="Filtrar registros por rol"
            >
              <option value="">Todos los roles</option>
              {roles.map((role) => (
                <option key={role} value={role}>
                  {roleLabel(role)}
                </option>
              ))}
            </select>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Actualizar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportLogs}
              disabled={logs.length === 0 || exporting}
            >
              <Download size={15} className={exporting ? "animate-pulse" : ""} />{" "}
              {exporting ? "Exportando..." : "Exportar"}
            </Button>
          </div>

          {/* Log table */}
          {loadError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              No se pudieron cargar los logs: {loadError}
            </div>
          ) : loading ? (
            <Spinner />
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              <Filter size={32} className="mx-auto mb-2 opacity-40" />
              No se encontraron registros de actividad
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
                      <th className="px-4 py-2.5 font-medium">Fecha</th>
                      <th className="px-4 py-2.5 font-medium">Usuario</th>
                      <th className="px-4 py-2.5 font-medium">Rol</th>
                      <th className="px-4 py-2.5 font-medium">Acción</th>
                      <th className="px-4 py-2.5 font-medium">Ruta / descripción</th>
                      <th className="px-4 py-2.5 font-medium">Tiempo visible</th>
                      <th className="px-4 py-2.5 font-medium">IP</th>
                      <th className="px-4 py-2.5 font-medium w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => {
                      const meta = metaFor(log.action);
                      const isOpen = expanded === log.id;
                      return (
                        <Fragment key={log.id}>
                          <tr
                            className="border-t border-slate-100 hover:bg-slate-50 cursor-pointer"
                            onClick={() => setExpanded(isOpen ? null : log.id)}
                          >
                            <td className="px-4 py-2.5 whitespace-nowrap">
                              <div className="text-xs font-medium text-slate-700">
                                {formatTime(log.created_at!)}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {relativeTime(log.created_at!)}
                              </div>
                            </td>
                            <td className="px-4 py-2.5">
                              <span className="text-xs text-slate-600 font-mono">
                                {log.user_email}
                              </span>
                            </td>
                            <td className="px-4 py-2.5">
                              <span
                                className={`inline-flex items-center gap-1 text-xs font-medium ${log.user_role === "admin" ? "text-blue-600" : "text-violet-600"}`}
                              >
                                {log.user_role === "admin" ? (
                                  <ShieldCheck size={12} />
                                ) : (
                                  <User size={12} />
                                )}
                                {roleLabel(log.user_role)}
                              </span>
                            </td>
                            <td className="px-4 py-2.5">
                              <Badge className={meta.color}>{meta.label}</Badge>
                            </td>
                            <td className="px-4 py-2.5">
                              <span className="text-xs text-slate-600">
                                {log.page_path ?? log.entity_label ?? log.entity}
                              </span>
                            </td>
                            <td className="px-4 py-2.5">
                              {log.session_duration != null && log.session_duration > 0 ? (
                                <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs text-cyan-700">
                                  <Clock3 size={12} /> {formatDuration(log.session_duration)}
                                </span>
                              ) : (
                                <span className="text-xs text-slate-400">—</span>
                              )}
                            </td>
                            <td className="px-4 py-2.5">
                              {log.ip_hint ? (
                                <span
                                  className="inline-flex items-center gap-1 text-xs text-slate-500 font-mono"
                                  title={log.ip_hint}
                                >
                                  <Globe size={12} /> {log.ip_hint}
                                </span>
                              ) : (
                                <span className="text-xs text-slate-400">—</span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              {isOpen ? (
                                <ChevronUp size={14} className="text-slate-400" />
                              ) : (
                                <ChevronDown size={14} className="text-slate-400" />
                              )}
                            </td>
                          </tr>
                          {isOpen && (
                            <tr className="bg-slate-50/60">
                              <td colSpan={8} className="px-4 py-3">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                  <div>
                                    <p className="text-slate-400 font-medium mb-0.5">
                                      ID de registro
                                    </p>
                                    <p className="font-mono text-slate-600">{log.id}</p>
                                  </div>
                                  <div>
                                    <p className="text-slate-400 font-medium mb-0.5">Entidad</p>
                                    <p className="font-mono text-slate-600">
                                      {log.entity}
                                      {log.entity_id ? ` · ${log.entity_id}` : ""}
                                    </p>
                                  </div>
                                  {log.details && (
                                    <div className="md:col-span-2">
                                      <p className="text-slate-400 font-medium mb-0.5">Detalles</p>
                                      <pre className="bg-slate-100 rounded-lg p-2 text-[11px] text-slate-700 overflow-x-auto">
                                        {JSON.stringify(log.details, null, 2)}
                                      </pre>
                                    </div>
                                  )}
                                  {log.user_agent && (
                                    <div className="md:col-span-2">
                                      <p className="text-slate-400 font-medium mb-0.5">Navegador</p>
                                      <p className="font-mono text-[11px] text-slate-600 break-all">
                                        <Monitor size={11} className="inline mr-1" />
                                        {log.user_agent}
                                      </p>
                                    </div>
                                  )}
                                  {log.session_id && (
                                    <div>
                                      <p className="text-slate-400 font-medium mb-0.5">Sesión</p>
                                      <p className="font-mono text-[11px] text-slate-600">
                                        {log.session_id.slice(0, 18)}…
                                      </p>
                                    </div>
                                  )}
                                  {log.session_id && (
                                    <div className="md:col-span-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          setSessionFilter(log.session_id!);
                                          setExpanded(null);
                                        }}
                                      >
                                        Ver recorrido de esta sesión
                                      </Button>
                                    </div>
                                  )}
                                  {log.page_path && (
                                    <div>
                                      <p className="text-slate-400 font-medium mb-0.5">Página</p>
                                      <p className="font-mono text-[11px] text-slate-600">
                                        {log.page_path}
                                      </p>
                                    </div>
                                  )}
                                  {log.session_duration != null && log.session_duration > 0 && (
                                    <div>
                                      <p className="text-slate-400 font-medium mb-0.5">
                                        Tiempo en página
                                      </p>
                                      <p className="font-mono text-[11px] text-slate-600">
                                        {formatDuration(log.session_duration)}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {count > PAGE_SIZE && (
                <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50 text-xs text-slate-500 text-center">
                  Mostrando los últimos {PAGE_SIZE} registros de {count} totales. Usa los filtros
                  para acotar la búsqueda.
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
