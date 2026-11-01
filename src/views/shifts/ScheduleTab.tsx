import { useState, useMemo, useCallback } from "react";
import { ChevronLeft, ChevronRight, FileDown, ArrowLeftRight } from "lucide-react";
import { Card, CardHeader, Button, Modal, Badge } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { ExportPdf } from "@/lib/exportPdf";
import { ExportExcel } from "@/lib/exportExcel";
import { getChileHolidays } from "@/lib/holidays";
import { WorkerAvatar } from "@/components/WorkerAvatar";
import type { ShiftDefinition, ShiftAssignment, Worker } from "@/lib/types";
import {
  WEEKDAYS,
  MONTH_NAMES,
  DURATION_LABELS,
  fmtDate,
  isAssignmentActiveOnDate,
  getContrastColor,
  toDateStr,
  getMonday,
  getMonthDays,
  getWeekDays,
  type ScheduleView,
} from "./constants";

export function ScheduleTab({
  shiftDefs,
  shiftAssignments,
  workers,
  workerMap,
}: {
  shiftDefs: ShiftDefinition[];
  shiftAssignments: ShiftAssignment[];
  workers: Worker[];
  workerMap: Map<string, Worker>;
}) {
  const [view, setView] = useState<ScheduleView>("month");
  const [refDate, setRefDate] = useState(() => new Date());
  const toast = useToast();

  const activeAssignments = useMemo(
    () => shiftAssignments.filter((a) => a.active),
    [shiftAssignments],
  );

  const defMap = useMemo(() => {
    const m = new Map<string, ShiftDefinition>();
    shiftDefs.forEach((d) => m.set(d.id, d));
    return m;
  }, [shiftDefs]);

  const assignmentsByRut = useMemo(() => {
    const m = new Map<string, ShiftAssignment>();
    activeAssignments.forEach((a) => {
      if (!m.has(a.worker_rut)) m.set(a.worker_rut, a);
    });
    return m;
  }, [activeAssignments]);

  const getAssignmentForDate = useCallback(
    (rut: string, dateStr: string): ShiftAssignment | null => {
      const a = assignmentsByRut.get(rut);
      if (!a) return null;
      return isAssignmentActiveOnDate(a, dateStr) ? a : null;
    },
    [assignmentsByRut],
  );

  function shiftDate(amount: number) {
    const d = new Date(refDate);
    if (view === "month") d.setMonth(d.getMonth() + amount);
    else if (view === "week") d.setDate(d.getDate() + amount * 7);
    else d.setDate(d.getDate() + amount);
    setRefDate(d);
  }

  function today() {
    setRefDate(new Date());
  }

  const dateLabel = useMemo(() => {
    if (view === "month") return `${MONTH_NAMES[refDate.getMonth()]} ${refDate.getFullYear()}`;
    if (view === "week") {
      const monday = getMonday(refDate);
      const sunday = new Date(monday);
      sunday.setDate(sunday.getDate() + 6);
      return `${monday.toLocaleDateString("es-CL", { day: "2-digit", month: "short" })} – ${sunday.toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" })}`;
    }
    return refDate.toLocaleDateString("es-CL", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }, [refDate, view]);

  async function exportSchedule(format: "pdf" | "excel") {
    const dateStr = toDateStr(refDate);
    const rows: Record<string, unknown>[] = [];
    const days =
      view === "month" ? getMonthDays(refDate) : view === "week" ? getWeekDays(refDate) : [dateStr];

    workers
      .filter((w) => w.contract_status !== "Desvinculado")
      .forEach((w) => {
        days.forEach((day) => {
          const a = getAssignmentForDate(w.rut, day);
          const def = a?.shift_definition_id ? defMap.get(a.shift_definition_id) : null;
          if (a) {
            rows.push({
              Fecha: fmtDate(day),
              Trabajador: w.full_name,
              RUT: w.rut,
              Turno: a.shift_name,
              Horario: def?.start_time && def?.end_time ? `${def.start_time}–${def.end_time}` : "",
              Ciclo: def?.cycle ?? "",
              Duración: DURATION_LABELS[a.duration_type],
            });
          }
        });
      });

    if (rows.length === 0) {
      toast.error("Sin datos", "No hay asignaciones para exportar en este período");
      return;
    }

    try {
      if (format === "pdf") {
        const headers = ["Fecha", "Trabajador", "RUT", "Turno", "Horario", "Ciclo", "Duración"];
        const body = rows.map((r) =>
          [r.Fecha, r.Trabajador, r.RUT, r.Turno, r.Horario, r.Ciclo, r.Duración].map((v) =>
            String(v ?? ""),
          ),
        );
        await ExportPdf.toPdf(
          `Calendario de Turnos — ${dateLabel}`,
          headers,
          body,
          "calendario_turnos",
          `Período: ${dateLabel}`,
        );
      } else {
        await ExportExcel.toExcel(rows, "Calendario", "calendario_turnos");
      }
      toast.success("Exportado", `Calendario exportado a ${format.toUpperCase()}`);
    } catch (e) {
      toast.error("Error al exportar", (e as Error).message);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-3 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              onClick={() => shiftDate(-1)}
              className="p-1.5 rounded hover:bg-slate-100 text-slate-600"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={today}
              className="px-3 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded"
            >
              Hoy
            </button>
            <button
              onClick={() => shiftDate(1)}
              className="p-1.5 rounded hover:bg-slate-100 text-slate-600"
            >
              <ChevronRight size={18} />
            </button>
            <h3 className="text-base font-semibold text-slate-800 ml-2 capitalize">{dateLabel}</h3>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
              {(["month", "week", "day"] as ScheduleView[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md ${view === v ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}
                >
                  {v === "month" ? "Mes" : v === "week" ? "Semana" : "Día"}
                </button>
              ))}
            </div>
            <Button size="sm" variant="outline" onClick={() => exportSchedule("pdf")}>
              <FileDown size={14} /> PDF
            </Button>
            <Button size="sm" variant="outline" onClick={() => exportSchedule("excel")}>
              <FileDown size={14} /> Excel
            </Button>
          </div>
        </div>

        {view === "month" && (
          <MonthView
            refDate={refDate}
            workers={workers}
            getAssignment={getAssignmentForDate}
            defMap={defMap}
          />
        )}
        {view === "week" && (
          <WeekView
            refDate={refDate}
            workers={workers}
            getAssignment={getAssignmentForDate}
            defMap={defMap}
          />
        )}
        {view === "day" && (
          <DayView
            refDate={refDate}
            workers={workers}
            getAssignment={getAssignmentForDate}
            defMap={defMap}
            workerMap={workerMap}
          />
        )}
      </Card>

      {shiftDefs.length > 0 && (
        <Card>
          <CardHeader title="Leyenda de Turnos" />
          <div className="px-5 pb-4 flex flex-wrap gap-3">
            {shiftDefs
              .filter((d) => d.active)
              .map((d) => (
                <div key={d.id} className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: d.color ?? "#3b82f6" }}
                  />
                  <span className="text-xs text-slate-600">{d.name}</span>
                  {d.start_time && d.end_time && (
                    <span className="text-xs text-slate-400">
                      {d.start_time}–{d.end_time}
                    </span>
                  )}
                </div>
              ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function MonthView({
  refDate,
  workers,
  getAssignment,
  defMap,
}: {
  refDate: Date;
  workers: Worker[];
  getAssignment: (rut: string, dateStr: string) => ShiftAssignment | null;
  defMap: Map<string, ShiftDefinition>;
}) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const days = getMonthDays(refDate);
  const firstDay = new Date(refDate.getFullYear(), refDate.getMonth(), 1);
  const offset = (firstDay.getDay() + 6) % 7;
  const todayStr = new Date().toISOString().slice(0, 10);
  const activeWorkers = workers.filter((w) => w.contract_status !== "Desvinculado");

  const cells: (string | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  days.forEach((d) => cells.push(d));

  const selectedWorkers = selectedDate
    ? activeWorkers.map((w) => ({ w, a: getAssignment(w.rut, selectedDate) })).filter((x) => x.a)
    : [];

  return (
    <>
      <div className="px-5 pb-5 overflow-x-auto">
        <div className="grid grid-cols-7 gap-1 min-w-[700px]">
          {WEEKDAYS.map((wd) => (
            <div key={wd} className="text-center text-xs font-semibold text-slate-500 py-1">
              {wd}
            </div>
          ))}
          {cells.map((dateStr, i) => {
            if (!dateStr) return <div key={i} className="min-h-[80px] bg-slate-50/50 rounded" />;
            const dayWorkers = activeWorkers
              .map((w) => ({ w, a: getAssignment(w.rut, dateStr) }))
              .filter((x) => x.a);
            const isToday = dateStr === todayStr;
            return (
              <div
                key={i}
                onClick={() => dayWorkers.length > 0 && setSelectedDate(dateStr)}
                className={`min-h-[80px] rounded border p-1.5 transition-colors ${dayWorkers.length > 0 ? "cursor-pointer hover:border-blue-300 hover:bg-blue-50/20" : ""} ${isToday ? "border-blue-400 bg-blue-50/30" : "border-slate-100"}`}
              >
                <p
                  className={`text-xs font-medium mb-1 ${isToday ? "text-blue-600" : "text-slate-400"}`}
                >
                  {parseInt(dateStr.slice(8), 10)}
                </p>
                <div className="space-y-0.5">
                  {dayWorkers.slice(0, 4).map(({ w, a }) => {
                    const def = a?.shift_definition_id ? defMap.get(a.shift_definition_id) : null;
                    const color = def?.color ?? "#3b82f6";
                    return (
                      <div
                        key={w.rut}
                        className="text-[10px] px-1 py-0.5 rounded truncate"
                        style={{ backgroundColor: color + "20", color }}
                        title={`${w.full_name} — ${a?.shift_name}`}
                      >
                        {w.full_name.split(" ").slice(0, 2).join(" ")}
                      </div>
                    );
                  })}
                  {dayWorkers.length > 4 && (
                    <p className="text-[10px] text-blue-500 px-1 font-medium">
                      +{dayWorkers.length - 4} más
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {selectedDate && (
        <DayWorkersModal
          dateStr={selectedDate}
          workers={selectedWorkers}
          defMap={defMap}
          onClose={() => setSelectedDate(null)}
        />
      )}
    </>
  );
}

function DayWorkersModal({
  dateStr,
  workers,
  defMap,
  onClose,
}: {
  dateStr: string;
  workers: { w: Worker; a: ShiftAssignment | null }[];
  defMap: Map<string, ShiftDefinition>;
  onClose: () => void;
}) {
  const dt = new Date(dateStr + "T00:00:00");
  const formatted = dt.toLocaleDateString("es-CL", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <Modal open onClose={onClose} title={`Turnos del ${formatted}`} size="md">
      <div className="max-h-[60vh] overflow-y-auto divide-y divide-slate-100">
        {workers.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center">
            No hay trabajadores asignados a este día.
          </p>
        ) : (
          workers.map(({ w, a }) => {
            const def = a?.shift_definition_id ? defMap.get(a.shift_definition_id) : null;
            const color = def?.color ?? "#3b82f6";
            const textColor = getContrastColor(color);
            return (
              <div key={w.rut} className="flex items-center gap-3 py-2.5">
                <WorkerAvatar
                  name={w.full_name}
                  rut={w.rut}
                  photoUrl={w.photo_url}
                  className="h-8 w-8 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{w.full_name}</p>
                  <p className="text-xs text-slate-500">
                    {w.rut} · {w.position}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <Badge className="bg-slate-100 text-slate-600 border-slate-200">
                    {a?.shift_name}
                  </Badge>
                  {def?.start_time && def?.end_time && (
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {def.start_time}–{def.end_time}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
      <div className="flex justify-end pt-3">
        <Button variant="secondary" onClick={onClose}>
          Cerrar
        </Button>
      </div>
    </Modal>
  );
}

function WeekView({
  refDate,
  workers,
  getAssignment,
  defMap,
}: {
  refDate: Date;
  workers: Worker[];
  getAssignment: (rut: string, dateStr: string) => ShiftAssignment | null;
  defMap: Map<string, ShiftDefinition>;
}) {
  const days = getWeekDays(refDate);
  const todayStr = new Date().toISOString().slice(0, 10);
  const activeWorkers = workers.filter((w) => w.contract_status !== "Desvinculado");

  return (
    <div className="px-5 pb-5 overflow-x-auto">
      <div className="min-w-[700px]">
        <div className="grid gap-1" style={{ gridTemplateColumns: `200px repeat(7, 1fr)` }}>
          <div />
          {days.map((d, i) => {
            const dt = new Date(d + "T00:00:00");
            const isToday = d === todayStr;
            const holiday = getChileHolidays(Number(d.slice(0, 4))).find((item) => item.date === d);
            return (
              <div
                key={d}
                className={`text-center py-1.5 rounded ${holiday ? "bg-rose-50 text-rose-700" : isToday ? "bg-blue-50 text-blue-600" : "bg-slate-50 text-slate-500"}`}
              >
                <p className="text-xs font-semibold">{WEEKDAYS[i]}</p>
                <p className="text-xs">{dt.getDate()}</p>
              </div>
            );
          })}
          {activeWorkers.map((w) => (
            <DayWorkerRow
              key={w.rut}
              weekDays={days}
              worker={w}
              getAssignment={getAssignment}
              defMap={defMap}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function DayWorkerRow({
  weekDays,
  worker,
  getAssignment,
  defMap,
}: {
  weekDays: string[];
  worker: Worker;
  getAssignment: (rut: string, dateStr: string) => ShiftAssignment | null;
  defMap: Map<string, ShiftDefinition>;
}) {
  return (
    <>
      <div className="flex items-center px-2 py-1.5 border-t border-slate-100">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-700 truncate">{worker.full_name}</p>
          <p className="text-[10px] text-slate-400">{worker.rut}</p>
        </div>
      </div>
      {weekDays.map((d) => {
        const a = getAssignment(worker.rut, d);
        const def = a?.shift_definition_id ? defMap.get(a.shift_definition_id) : null;
        const color = def?.color ?? "#3b82f6";
        const textColor = getContrastColor(color);
        return (
          <div key={d} className="border-t border-slate-100 p-1">
            {a && (
              <div
                className="text-[10px] px-1.5 py-1 rounded text-center font-medium"
                style={{ backgroundColor: color, color: textColor }}
                title={a.shift_name}
              >
                {a.shift_name.length > 12 ? a.shift_name.slice(0, 10) + "…" : a.shift_name}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

function DayView({
  refDate,
  workers,
  getAssignment,
  defMap,
  workerMap,
}: {
  refDate: Date;
  workers: Worker[];
  getAssignment: (rut: string, dateStr: string) => ShiftAssignment | null;
  defMap: Map<string, ShiftDefinition>;
  workerMap: Map<string, Worker>;
}) {
  const dateStr = toDateStr(refDate);
  const activeWorkers = workers.filter((w) => w.contract_status !== "Desvinculado");
  const assigned = activeWorkers
    .map((w) => ({ w, a: getAssignment(w.rut, dateStr) }))
    .filter((x) => x.a);
  const unassigned = activeWorkers.filter((w) => !getAssignment(w.rut, dateStr));

  return (
    <div className="px-5 pb-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="text-sm font-semibold text-slate-700 mb-2">
            Cubren turno ({assigned.length})
          </h4>
          <div className="space-y-2">
            {assigned.length === 0 ? (
              <p className="text-xs text-slate-400 py-4">Nadie cubre este día</p>
            ) : (
              assigned.map(({ w, a }) => {
                const def = a?.shift_definition_id ? defMap.get(a.shift_definition_id) : null;
                const color = def?.color ?? "#3b82f6";
                const textColor = getContrastColor(color);
                const swapW = a?.swap_with_rut ? workerMap.get(a.swap_with_rut) : null;
                return (
                  <div
                    key={w.rut}
                    className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-100"
                  >
                    <WorkerAvatar
                      name={w.full_name}
                      rut={w.rut}
                      photoUrl={w.photo_url}
                      className="h-8 w-8"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{w.full_name}</p>
                      <p className="text-xs text-slate-500">
                        {a?.shift_name}
                        {def?.start_time && def?.end_time
                          ? ` · ${def.start_time}–${def.end_time}`
                          : ""}
                      </p>
                      {swapW && (
                        <p className="text-[10px] text-amber-600 mt-0.5">
                          <ArrowLeftRight size={9} className="inline" /> Intercambio con{" "}
                          {swapW.full_name}
                        </p>
                      )}
                    </div>
                    <Badge className="bg-slate-100 text-slate-600 border-slate-200">
                      {DURATION_LABELS[a!.duration_type]}
                    </Badge>
                  </div>
                );
              })
            )}
          </div>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-slate-700 mb-2">
            Sin asignar ({unassigned.length})
          </h4>
          <div className="space-y-1.5">
            {unassigned.length === 0 ? (
              <p className="text-xs text-slate-400 py-4">Todos los trabajadores tienen turno</p>
            ) : (
              unassigned.map((w) => (
                <div
                  key={w.rut}
                  className="flex items-center gap-2 p-2 rounded text-xs text-slate-500"
                >
                  <div className="w-2 h-2 rounded-full bg-slate-300" />
                  <span>{w.full_name}</span>
                  <span className="text-slate-300">{w.rut}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
