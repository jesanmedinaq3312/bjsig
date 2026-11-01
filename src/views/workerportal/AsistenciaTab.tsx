import { QrCode, Bell, CalendarDays, CheckCircle2, Clock, CalendarClock } from "lucide-react";
import { Badge, EmptyState } from "@/components/ui";
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

export function AsistenciaTab({ data }: { data: WorkerPortalData }) {
  const defMap = new Map(data.shift_definitions.map((d) => [d.id, d]));

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
      </Section>
    </div>
  );
}
