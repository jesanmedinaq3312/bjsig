import { useState } from "react";
import {
  QrCode,
  Bell,
  CalendarDays,
  CheckCircle2,
  Clock,
  CalendarClock,
  ShieldCheck,
  ShieldX,
} from "lucide-react";
import { Badge, Button, EmptyState, Modal, Textarea } from "@/components/ui";
import type { WorkerPortalData } from "@/hooks/useWorkerData";
import { Section } from "./components";
import { SHIFT_CHANGE_TYPE_CONFIG } from "./constants";

const DAY_NAMES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const ATT_LABELS: Record<string, string> = {
  Presente: "Presente",
  Ausente: "Ausente",
  Licencia: "Licencia Médica",
  Permiso: "Permiso",
  Descanso: "Descanso",
};

type AttendanceRectification = WorkerPortalData["rectifications"][number];

export function AsistenciaTab({
  data,
  isPreview = false,
  onRespondRectification,
}: {
  data: WorkerPortalData;
  isPreview?: boolean;
  onRespondRectification: (
    id: string,
    accept: boolean,
    comment: string,
  ) => Promise<{ error: string | null }>;
}) {
  const defMap = new Map(data.shift_definitions.map((d) => [d.id, d]));
  const [responseTarget, setResponseTarget] = useState<AttendanceRectification | null>(null);
  const [responseComment, setResponseComment] = useState("");
  const [responseError, setResponseError] = useState<string | null>(null);
  const [submittingResponse, setSubmittingResponse] = useState(false);

  async function respondToProposal(accept: boolean) {
    if (!responseTarget) return;
    setSubmittingResponse(true);
    setResponseError(null);
    try {
      const result = await onRespondRectification(responseTarget.id, accept, responseComment);
      if (result.error) {
        setResponseError(result.error);
        return;
      }
      setResponseTarget(null);
      setResponseComment("");
    } catch (error) {
      setResponseError(
        error instanceof Error ? error.message : "No se pudo registrar tu respuesta.",
      );
    } finally {
      setSubmittingResponse(false);
    }
  }

  return (
    <div className="space-y-6">
      <Section
        icon={<CalendarClock size={18} className="text-slate-400" />}
        title="Mis Turnos Asignados"
      >
        {data.assignments.length === 0 ? (
          <EmptyState message="No tienes turnos asignados." icon={<CalendarClock size={28} />} />
        ) : (
          <div className="space-y-3">
            {data.assignments
              .filter((a) => a.active)
              .slice(0, 10)
              .map((a) => {
                const def = a.shift_definition_id ? defMap.get(a.shift_definition_id) : null;
                const days =
                  a.days_of_week && a.days_of_week.length > 0
                    ? a.days_of_week.map((d) => DAY_NAMES[d] ?? String(d)).join(", ")
                    : "Lun a Vie (continuo)";
                return (
                  <div key={a.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{a.shift_name}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Desde {a.start_date}
                          {a.end_date ? ` hasta ${a.end_date}` : " (indefinido)"}
                        </p>
                      </div>
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                        Activo
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs mt-2">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-slate-400">Horario</span>
                        <span className="text-slate-700 font-medium">
                          {def?.start_time ?? "—"} a {def?.end_time ?? "—"}
                        </span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-slate-400">Días</span>
                        <span className="text-slate-700 font-medium">{days}</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-slate-400">Duración</span>
                        <span className="text-slate-700 font-medium capitalize">
                          {a.duration_type}
                        </span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-slate-400">Ciclo</span>
                        <span className="text-slate-700 font-medium capitalize">
                          {def?.cycle ?? a.shift_name}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </Section>

      <Section icon={<QrCode size={18} className="text-slate-400" />} title="Mis Registros QR">
        {data.qr_scans.length === 0 ? (
          <EmptyState message="No tienes registros QR aún." icon={<QrCode size={28} />} />
        ) : (
          <div className="space-y-2">
            {data.qr_scans.slice(0, 8).map((s) => (
              <div
                key={s.id as string}
                className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50 border border-slate-100"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${s.validated ? "bg-emerald-100" : "bg-amber-100"}`}
                  >
                    {s.validated ? (
                      <CheckCircle2 size={16} className="text-emerald-600" />
                    ) : (
                      <Clock size={16} className="text-amber-600" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      {(s.scan_type as string) ?? "QR"}
                    </p>
                    <p className="text-xs text-slate-400">
                      {s.scan_date as string} {(s.scan_time as string) ?? ""}
                    </p>
                  </div>
                </div>
                <Badge
                  className={
                    s.validated
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-amber-50 text-amber-700 border-amber-200"
                  }
                >
                  {s.validated ? "Validado" : "Pendiente"}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section
        icon={<Clock size={18} className="text-slate-400" />}
        title="Propuestas de regularización"
      >
        <p className="mb-4 text-xs leading-relaxed text-slate-500">
          Revisa las propuestas de corrección y registra tu aceptación o rechazo. Tu respuesta no
          modifica ni sobrescribe la marca QR original.
        </p>
        {data.rectificationsError ? (
          <p
            role="alert"
            className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
          >
            No se pudieron cargar las propuestas de regularización. Intenta nuevamente más tarde.
          </p>
        ) : data.rectifications.length === 0 ? (
          <EmptyState message="No tienes propuestas de regularización pendientes o históricas." />
        ) : (
          <div className="space-y-3">
            {data.rectifications.slice(0, 30).map((rectification) => {
              const statusLabel =
                rectification.status === "aceptada"
                  ? "Aceptada"
                  : rectification.status === "rechazada"
                    ? "Rechazada"
                    : "Pendiente de tu respuesta";
              const statusClass =
                rectification.status === "aceptada"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : rectification.status === "rechazada"
                    ? "bg-rose-50 text-rose-700 border-rose-200"
                    : "bg-amber-50 text-amber-800 border-amber-200";
              const proposedAt = new Date(rectification.proposed_at);
              const proposedAtLabel = Number.isNaN(proposedAt.getTime())
                ? "Fecha no disponible"
                : new Intl.DateTimeFormat("es-CL", {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: "America/Santiago",
                  }).format(proposedAt);

              return (
                <article
                  key={rectification.id}
                  className="rounded-xl border border-slate-200 bg-white p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-slate-800">
                      {rectification.proposed_scan_type ?? "Ajuste de marca de asistencia"}
                    </h3>
                    <Badge className={statusClass}>{statusLabel}</Badge>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    Fecha y hora propuestas: <time>{proposedAtLabel}</time>
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                    {rectification.reason}
                  </p>
                  {rectification.worker_comment && (
                    <p className="mt-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                      Tu comentario: {rectification.worker_comment}
                    </p>
                  )}
                  {rectification.status === "pendiente" && !isPreview && (
                    <Button
                      className="mt-3"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setResponseTarget(rectification);
                        setResponseComment("");
                        setResponseError(null);
                      }}
                    >
                      Revisar propuesta
                    </Button>
                  )}
                  {rectification.status === "pendiente" && isPreview && (
                    <p className="mt-3 text-xs text-slate-500">
                      La respuesta está deshabilitada en la vista previa administrativa.
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </Section>

      <Section
        icon={<Bell size={18} className="text-slate-400" />}
        title="Notificaciones de Cambios de Turno"
      >
        {data.shift_change_logs.length === 0 ? (
          <EmptyState message="No hay cambios de turno registrados." icon={<Bell size={28} />} />
        ) : (
          <div className="space-y-0">
            {data.shift_change_logs.slice(0, 15).map((log, idx) => {
              const type = (log.change_type as string) ?? "modificacion";
              const cfg = SHIFT_CHANGE_TYPE_CONFIG[type] ?? SHIFT_CHANGE_TYPE_CONFIG.modificacion;
              const isLast = idx === Math.min(data.shift_change_logs.length, 15) - 1;
              return (
                <div key={log.id as string} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center border ${cfg.bg}`}
                    >
                      <Bell size={12} className={cfg.color} />
                    </div>
                    {!isLast && <div className="w-px flex-1 bg-slate-200 my-1" />}
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={cfg.bg}>{cfg.label}</Badge>
                      <span className="text-xs text-slate-400">
                        {log.created_at
                          ? new Date(log.created_at as string).toLocaleString("es-CL")
                          : ""}
                      </span>
                    </div>
                    <div className="mt-1 text-sm text-slate-600 space-y-0.5">
                      {log.old_shift_name && log.new_shift_name && (
                        <p>
                          {log.old_shift_name as string} →{" "}
                          <span className="font-medium text-slate-800">
                            {log.new_shift_name as string}
                          </span>
                        </p>
                      )}
                      {!log.old_shift_name && log.new_shift_name && (
                        <p>
                          Asignado:{" "}
                          <span className="font-medium text-slate-800">
                            {log.new_shift_name as string}
                          </span>
                        </p>
                      )}
                      {log.old_shift_name && !log.new_shift_name && (
                        <p>
                          Desactivado:{" "}
                          <span className="font-medium text-slate-800">
                            {log.old_shift_name as string}
                          </span>
                        </p>
                      )}
                      {log.new_duration_type && (
                        <p className="text-xs text-slate-400">
                          Duración: {log.new_duration_type as string}
                        </p>
                      )}
                      {log.reason && (
                        <p className="text-xs italic text-slate-400 mt-0.5">
                          Motivo: {log.reason as string}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      <Section
        icon={<CalendarDays size={18} className="text-slate-400" />}
        title="Historial de Asistencia Diaria"
      >
        {data.shifts.length === 0 ? (
          <EmptyState
            message="No tienes registros de asistencia."
            icon={<CalendarDays size={28} />}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                  <th className="pb-2 font-medium">Fecha</th>
                  <th className="pb-2 font-medium">Turno</th>
                  <th className="pb-2 font-medium">Estado</th>
                  <th className="pb-2 font-medium">EPP</th>
                  <th className="pb-2 font-medium">HHT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.shifts.slice(0, 15).map((s) => (
                  <tr key={s.id as string} className="text-slate-700">
                    <td className="py-2">{s.date as string}</td>
                    <td className="py-2 text-xs">{(s.shift_name as string) ?? "—"}</td>
                    <td className="py-2">
                      <Badge className="bg-slate-50 text-slate-600 border-slate-200">
                        {ATT_LABELS[
                          (s.attendance_status as string) ?? (s.status as string) ?? ""
                        ] ??
                          (s.attendance_status as string) ??
                          (s.status as string) ??
                          "—"}
                      </Badge>
                    </td>
                    <td className="py-2 text-xs">{s.epp_compliant ? "Cumple" : "No registrado"}</td>
                    <td className="py-2 text-xs">
                      {(s.calculated_hht as number)?.toString() ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Modal
          open={responseTarget !== null}
          onClose={() => {
            if (submittingResponse) return;
            setResponseTarget(null);
            setResponseError(null);
          }}
          title="Responder propuesta de regularización"
        >
          {responseTarget && (
            <div className="space-y-4">
              <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                <p className="font-medium">
                  {responseTarget.proposed_scan_type ?? "Ajuste de marca de asistencia"}
                </p>
                <p className="mt-1">
                  Fecha y hora propuestas:{" "}
                  {new Date(responseTarget.proposed_at).toLocaleString("es-CL", {
                    timeZone: "America/Santiago",
                  })}
                </p>
                <p className="mt-2 whitespace-pre-wrap">{responseTarget.reason}</p>
              </div>
              <p className="text-xs leading-relaxed text-slate-500">
                Tu aceptación o rechazo quedará registrado. Esta respuesta no modifica por sí sola
                la marca original ni acredita una regularización en el sistema.
              </p>
              <Textarea
                label="Comentario (opcional)"
                value={responseComment}
                onChange={(event) => setResponseComment(event.target.value.slice(0, 1000))}
                rows={3}
                maxLength={1000}
                placeholder="Agrega una observación si lo necesitas"
              />
              {responseError && (
                <p role="alert" className="text-sm text-rose-700">
                  {responseError}
                </p>
              )}
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  variant="outline"
                  disabled={submittingResponse}
                  onClick={() => void respondToProposal(false)}
                  loading={submittingResponse}
                >
                  <ShieldX size={15} /> Rechazar propuesta
                </Button>
                <Button
                  variant="primary"
                  disabled={submittingResponse}
                  onClick={() => void respondToProposal(true)}
                  loading={submittingResponse}
                >
                  <ShieldCheck size={15} /> Aceptar propuesta
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </Section>
    </div>
  );
}
