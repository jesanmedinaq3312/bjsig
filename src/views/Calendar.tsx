import { useState, useMemo, lazy, Suspense } from "react";
import { Calendar as CalIcon, Filter, FileSpreadsheet, FileText } from "lucide-react";
import { Card, Button, Select, InfoTooltip, Modal, Spinner } from "@/components/ui";
import { ExportService } from "@/lib/export";
import { getCompanyName } from "@/lib/logo";
import type { AppData } from "@/hooks/useAppData";
import type { CalendarEvent } from "@/lib/types";
import { useCalendarEvents } from "./calendar/useCalendarEvents";
import { EVENT_META, SEVERITY_DOT, type ViewMode } from "./calendar/constants";

const MonthView = lazy(() =>
  import("./calendar/MonthView").then((m) => ({ default: m.MonthView })),
);
const WeekView = lazy(() => import("./calendar/WeekView").then((m) => ({ default: m.WeekView })));
const DayView = lazy(() => import("./calendar/DayView").then((m) => ({ default: m.DayView })));
const AgendaView = lazy(() =>
  import("./calendar/AgendaView").then((m) => ({ default: m.AgendaView })),
);
const VirtualizedTable = lazy(() =>
  import("./calendar/VirtualizedTable").then((m) => ({ default: m.VirtualizedTable })),
);
const AttendanceView = lazy(() =>
  import("./calendar/AttendanceView").then((m) => ({ default: m.AttendanceView })),
);
const QrCardGenerator = lazy(() =>
  import("@/components/QrCardGenerator").then((m) => ({ default: m.QrCardGenerator })),
);
const QrScanner = lazy(() =>
  import("@/components/QrScanner").then((m) => ({ default: m.QrScanner })),
);

export function CalendarView({
  data,
  userRole,
  permissions,
}: {
  data: AppData;
  userRole?: string;
  permissions?: Record<string, boolean>;
}) {
  const canDelete =
    userRole === "superadmin" || userRole === "developer" || !!permissions?.can_delete_attendance;
  const [mode, setMode] = useState<ViewMode>("month");
  const [cursor, setCursor] = useState(new Date());
  const allEvents = useCalendarEvents(data, cursor.getFullYear());
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [workerFilter, setWorkerFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [dayDetail, setDayDetail] = useState<{ date: string; events: CalendarEvent[] } | null>(
    null,
  );
  const [showQrCards, setShowQrCards] = useState(false);
  const [showQrScanner, setShowQrScanner] = useState(false);

  const filtered = useMemo(() => {
    return allEvents.filter((e) => {
      if (typeFilter !== "all" && e.event_type !== typeFilter) return false;
      if (severityFilter !== "all" && e.severity_level !== severityFilter) return false;
      if (workerFilter) {
        const w = data.workers.find((wk) => wk.rut === workerFilter);
        if (!w) return false;
        if (e.worker_rut !== workerFilter) return false;
      }
      return true;
    });
  }, [allEvents, typeFilter, severityFilter, workerFilter, data.workers]);

  function exportExcel() {
    ExportService.toExcel(
      filtered.map((e) => ({
        Fecha: e.event_date,
        Tipo: EVENT_META[e.event_type].label,
        Trabajador: e.worker_rut ?? "—",
        Severidad: e.severity_level,
        Título: e.title,
        Detalle: e.details,
      })),
      "Historial Calendario",
      "historial_calendario_gyc",
    );
  }
  function exportPdf() {
    ExportService.toPdf(
      "Historial de Eventos — Calendario SIG",
      ["Fecha", "Tipo", "Severidad", "Título", "Detalle"],
      filtered.map((e) => [
        e.event_date,
        EVENT_META[e.event_type].label,
        e.severity_level,
        e.title.slice(0, 40),
        e.details.slice(0, 50),
      ]),
      "historial_calendario_gyc",
      "Calendario masivo · DS 44 · DS 594 · ISO",
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 relative z-10">
        <div className="flex items-center gap-2">
          <CalIcon size={20} className="text-blue-600" />
          <h2 className="text-lg font-semibold text-slate-800">Historial y Calendario Masivo</h2>
          <InfoTooltip text="Navega entre fechas sin lentitud. Usa los filtros para aislar eventos por cuadrilla o gravedad. Soporta más de 10.000 eventos con renderizado virtualizado." />
        </div>
        <div className="flex flex-wrap gap-2">
          {(["month", "week", "day", "agenda", "table", "attendance"] as ViewMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${mode === m ? "bg-blue-600 text-white border-transparent" : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"}`}
            >
              {m === "month"
                ? "Mes"
                : m === "week"
                  ? "Semana"
                  : m === "day"
                    ? "Día"
                    : m === "agenda"
                      ? "Agenda"
                      : m === "table"
                        ? "Tabla Virtual"
                        : "Asistencia"}
            </button>
          ))}
        </div>
      </div>

      <Card className="p-4">
        <div className="flex flex-col md:flex-row md:items-end gap-3">
          <div className="flex items-center gap-1.5 text-sm text-slate-600">
            <Filter size={16} className="text-slate-400" /> Filtros:
            <InfoTooltip text="Combina filtros por tipo de evento, gravedad (semáforo), trabajador o cuadrilla para consultas precisas en el historial." />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
            <Select
              label="Tipo de Evento"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">Todos</option>
              {Object.entries(EVENT_META).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </Select>
            <Select
              label="Severidad (Semáforo)"
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
            >
              <option value="all">Todas</option>
              <option value="verde">Verde (Normal)</option>
              <option value="amarillo">Amarillo (Alerta)</option>
              <option value="rojo">Rojo (Incidente/Vencido)</option>
              <option value="azul">Azul (Informativo)</option>
            </Select>
            <Select
              label="Trabajador / Cuadrilla"
              value={workerFilter}
              onChange={(e) => setWorkerFilter(e.target.value)}
            >
              <option value="">Todos</option>
              {data.workers.map((w) => (
                <option key={w.rut} value={w.rut}>
                  {w.full_name}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportExcel}>
              <FileSpreadsheet size={15} /> Excel
            </Button>
            <Button variant="outline" size="sm" onClick={exportPdf}>
              <FileText size={15} /> PDF
            </Button>
          </div>
        </div>
        <div className="mt-2 text-xs text-slate-500">{filtered.length} eventos encontrados</div>
      </Card>

      <Suspense
        fallback={
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        }
      >
        {mode === "month" && (
          <MonthView
            events={filtered}
            cursor={cursor}
            setCursor={setCursor}
            onDayClick={(date, evs) => setDayDetail({ date, events: evs })}
          />
        )}
        {mode === "week" && (
          <WeekView
            events={filtered}
            cursor={cursor}
            setCursor={setCursor}
            onDayClick={(date, evs) => setDayDetail({ date, events: evs })}
          />
        )}
        {mode === "day" && <DayView events={filtered} cursor={cursor} setCursor={setCursor} />}
        {mode === "agenda" && (
          <AgendaView events={filtered} cursor={cursor} setCursor={setCursor} />
        )}
        {mode === "table" && <VirtualizedTable events={filtered} />}
        {mode === "attendance" && (
          <AttendanceView
            data={data}
            canDelete={canDelete}
            onOpenQrCards={() => setShowQrCards(true)}
            onOpenQrScanner={() => setShowQrScanner(true)}
          />
        )}
      </Suspense>

      {dayDetail && (
        <Modal
          open
          onClose={() => setDayDetail(null)}
          title={`Resumen del día — ${dayDetail.date}`}
          size="lg"
        >
          <div className="space-y-3">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  ExportService.toExcel(
                    dayDetail.events.map((e) => ({
                      Fecha: e.event_date,
                      Tipo: EVENT_META[e.event_type].label,
                      Título: e.title,
                      Detalle: e.details,
                    })),
                    "Dia",
                    `informe_dia_${dayDetail.date}`,
                  )
                }
              >
                <FileSpreadsheet size={15} /> Exportar Excel
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  ExportService.toPdf(
                    `Informe Diario — ${dayDetail.date}`,
                    ["Tipo", "Severidad", "Título", "Detalle"],
                    dayDetail.events.map((e) => [
                      EVENT_META[e.event_type].label,
                      e.severity_level,
                      e.title,
                      e.details,
                    ]),
                    `informe_dia_${dayDetail.date}`,
                    `${getCompanyName()} · Reporte diario de terreno`,
                  )
                }
              >
                <FileText size={15} /> Exportar PDF
              </Button>
            </div>
            <div className="divide-y divide-slate-100">
              {dayDetail.events.map((e) => {
                const meta = EVENT_META[e.event_type];
                return (
                  <div key={e.id} className="py-3 flex items-start gap-3">
                    <span
                      className={`mt-1 w-2 h-2 rounded-full shrink-0 ${SEVERITY_DOT[e.severity_level]}`}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border ${meta.bg} ${meta.color}`}
                        >
                          {meta.icon} {meta.label}
                        </span>
                        <span className="text-sm font-medium text-slate-800">{e.title}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{e.details}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Modal>
      )}
      {showQrCards && (
        <Modal
          open
          onClose={() => setShowQrCards(false)}
          title="Tarjetas QR de Asistencia"
          size="xl"
        >
          <Suspense fallback={<Spinner />}>
            <QrCardGenerator data={data} />
          </Suspense>
        </Modal>
      )}
      {showQrScanner && (
        <Suspense fallback={<Spinner />}>
          <QrScanner data={data} onClose={() => setShowQrScanner(false)} />
        </Suspense>
      )}
    </div>
  );
}
