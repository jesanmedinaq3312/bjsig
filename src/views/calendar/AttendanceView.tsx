import { useState, useMemo, useEffect } from "react";
import {
  HardHat,
  Users,
  AlertTriangle,
  CalendarClock,
  ClipboardCheck,
  CheckCircle2,
  Sunrise,
  Sunset,
  Save,
  Search,
  ChevronDown,
  UserCheck,
  UserX,
  Clock,
  CheckCheck,
  QrCode as QrIcon,
  ScanLine,
  Trash2,
  Pencil,
  FileSpreadsheet,
} from "lucide-react";
import { Card, Button, Input, InfoTooltip, Spinner } from "@/components/ui";
import { ExportService } from "@/lib/export";
import { shiftRepo } from "@/lib/repositories";
import { audit } from "@/lib/audit";
import { useLoading } from "@/components/LoadingProvider";
import { WorkerAvatar } from "@/components/WorkerAvatar";
import type { AppData } from "@/hooks/useAppData";
import type { AttendanceStatus, DailyShift } from "@/lib/types";
import { getChileAttendanceTime } from "@/lib/chileAttendanceTime";
import {
  STANDARD_EPP,
  suggestShift,
  QR_LABELS,
  ATTENDANCE_STATUSES,
  STATUS_STYLES,
  type EppCheckState,
} from "./constants";

export function AttendanceView({
  data,
  canDelete,
  onOpenQrCards,
  onOpenQrScanner,
}: {
  data: AppData;
  canDelete?: boolean;
  onOpenQrCards: () => void;
  onOpenQrScanner: () => void;
}) {
  const { workers, shifts, eppLogs, qrScans } = data;
  const today = getChileAttendanceTime(new Date()).scanDate;
  const [selectedDate, setSelectedDate] = useState(today);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<AttendanceStatus | "all">("all");
  const [expandedRut, setExpandedRut] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const { runInBackground } = useLoading();

  const activeWorkers = useMemo(() => workers.filter((w) => w.status === "ACTIVO"), [workers]);

  const todayShifts = useMemo(() => {
    const map = new Map<string, DailyShift>();
    shifts.forEach((s) => {
      if (s.date === selectedDate) map.set(s.worker_rut, s);
    });
    return map;
  }, [shifts, selectedDate]);

  const qrByWorker = useMemo(() => {
    const map = new Map<string, { type: string; time: string }[]>();
    qrScans.forEach((q) => {
      if (!q.validated || q.scan_date !== selectedDate) return;
      const arr = map.get(q.worker_rut) ?? [];
      arr.push({
        type: q.scan_type,
        time: new Date(q.scan_time).toLocaleTimeString("es-CL", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      });
      map.set(q.worker_rut, arr);
    });
    return map;
  }, [qrScans, selectedDate]);

  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [hhtValues, setHhtValues] = useState<Record<string, number>>({});
  const [eppChecks, setEppChecks] = useState<EppCheckState>({});
  const [reviewedRuts, setReviewedRuts] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    const newAtt: Record<string, AttendanceStatus> = {};
    const newHht: Record<string, number> = {};
    activeWorkers.forEach((w) => {
      const dayShift = todayShifts.get(w.rut);
      if (dayShift) {
        newAtt[w.rut] = dayShift.attendance_status;
        newHht[w.rut] =
          dayShift.calculated_hht ?? (dayShift.attendance_status === "Presente" ? 8 : 0);
      } else {
        const sug = suggestShift(w.shift_cycle, new Date(selectedDate + "T00:00"), data.shiftDefs);
        newAtt[w.rut] = sug.working ? "Presente" : "Descanso";
        newHht[w.rut] = sug.working ? 8 : 0;
      }
    });
    setAttendance(newAtt);
    setHhtValues(newHht);
    const newEpp: EppCheckState = {};
    activeWorkers.forEach((w) => {
      const dayShift = todayShifts.get(w.rut);
      const workerEpp = eppLogs.filter(
        (e) => e.worker_rut === w.rut && e.delivery_date <= selectedDate,
      );
      const items = workerEpp.length > 0 ? workerEpp.map((e) => e.epp_item_name) : STANDARD_EPP;
      const checkObj: {
        [item: string]: { inicio: boolean; termino: boolean };
      } = {};
      items.forEach((item) => {
        checkObj[item] = {
          inicio: dayShift?.epp_inicio?.[item] ?? false,
          termino: dayShift?.epp_termino?.[item] ?? false,
        };
      });
      newEpp[w.rut] = checkObj;
    });
    setEppChecks(newEpp);
    setSavedMsg(null);
    setExpandedRut(null);
    setDirty(false);
    setReviewedRuts(new Set());
  }, [activeWorkers, todayShifts, eppLogs, selectedDate]); // eslint-disable-line react-hooks/exhaustive-deps -- reviewed dependency set; unstable callback recreation is intentional to avoid loops

  const counts = useMemo(() => {
    const c: Record<string, number> = {
      Presente: 0,
      Ausente: 0,
      Licencia: 0,
      Permiso: 0,
      Descanso: 0,
      total: activeWorkers.length,
    };
    activeWorkers.forEach((w) => {
      const s = attendance[w.rut] ?? "Presente";
      c[s] = (c[s] ?? 0) + 1;
    });
    return c;
  }, [activeWorkers, attendance]);

  const filteredWorkers = useMemo(() => {
    return activeWorkers.filter((w) => {
      const matchSearch =
        !search ||
        w.full_name.toLowerCase().includes(search.toLowerCase()) ||
        w.rut.includes(search) ||
        w.position.toLowerCase().includes(search.toLowerCase());
      const matchFilter = filterStatus === "all" || attendance[w.rut] === filterStatus;
      return matchSearch && matchFilter;
    });
  }, [activeWorkers, search, filterStatus, attendance]);

  function setAtt(rut: string, status: AttendanceStatus) {
    setAttendance((prev) => ({ ...prev, [rut]: status }));
    setHhtValues((prev) => ({
      ...prev,
      [rut]: status === "Presente" ? (prev[rut] ?? 8) : 0,
    }));
    setReviewedRuts((prev) => new Set(prev).add(rut));
    setDirty(true);
  }

  function setHht(rut: string, value: number) {
    const safeValue = Number.isFinite(value) ? Math.min(24, Math.max(0, value)) : 0;
    setHhtValues((prev) => ({ ...prev, [rut]: safeValue }));
    setReviewedRuts((prev) => new Set(prev).add(rut));
    setDirty(true);
  }

  function markAllPresent() {
    const nextAtt: Record<string, AttendanceStatus> = {};
    const nextHht: Record<string, number> = {};
    activeWorkers.forEach((w) => {
      const sug = suggestShift(w.shift_cycle, new Date(selectedDate + "T00:00"), data.shiftDefs);
      nextAtt[w.rut] = sug.working ? "Presente" : "Descanso";
      nextHht[w.rut] = sug.working ? 8 : 0;
    });
    setAttendance(nextAtt);
    setHhtValues(nextHht);
    setReviewedRuts(new Set(activeWorkers.map((w) => w.rut)));
    setDirty(true);
  }

  function markAllStatus(status: AttendanceStatus) {
    const nextAtt: Record<string, AttendanceStatus> = {};
    const nextHht: Record<string, number> = {};
    activeWorkers.forEach((w) => {
      nextAtt[w.rut] = status;
      nextHht[w.rut] = status === "Presente" ? 8 : 0;
    });
    setAttendance(nextAtt);
    setHhtValues(nextHht);
    setReviewedRuts(new Set(activeWorkers.map((w) => w.rut)));
    setDirty(true);
  }

  function toggleEpp(rut: string, item: string, phase: "inicio" | "termino") {
    setEppChecks((prev) => ({
      ...prev,
      [rut]: {
        ...prev[rut],
        [item]: { ...prev[rut]?.[item], [phase]: !prev[rut]?.[item]?.[phase] },
      },
    }));
    setReviewedRuts((prev) => new Set(prev).add(rut));
    setDirty(true);
  }

  function checkAllEpp(rut: string, phase: "inicio" | "termino") {
    setEppChecks((prev) => {
      const items = Object.keys(prev[rut] ?? {});
      const updated: { [item: string]: { inicio: boolean; termino: boolean } } = {};
      items.forEach((item) => {
        const cur = prev[rut]?.[item] ?? { inicio: false, termino: false };
        updated[item] = { ...cur, [phase]: true };
      });
      return { ...prev, [rut]: updated };
    });
    setReviewedRuts((prev) => new Set(prev).add(rut));
    setDirty(true);
  }

  async function saveAttendance() {
    setSaving(true);
    setSavedMsg(null);
    try {
      const rows: Omit<DailyShift, "id" | "created_at">[] = activeWorkers
        .filter((w) => reviewedRuts.has(w.rut))
        .map((w) => {
          const status = attendance[w.rut] ?? "Presente";
          const suggestion = suggestShift(
            w.shift_cycle,
            new Date(selectedDate + "T00:00"),
            data.shiftDefs,
          );
          const eppI = eppChecks[w.rut] ?? {};
          const eppInicio: Record<string, boolean> = {};
          const eppTermino: Record<string, boolean> = {};
          Object.entries(eppI).forEach(([item, val]) => {
            eppInicio[item] = val.inicio;
            eppTermino[item] = val.termino;
          });
          return {
            date: selectedDate,
            worker_rut: w.rut,
            attendance_status: status,
            shift_name: suggestion.label,
            ast_signed: todayShifts.get(w.rut)?.ast_signed ?? false,
            calculated_hht: hhtValues[w.rut] ?? (status === "Presente" ? 8 : 0),
            epp_inicio: eppInicio,
            epp_termino: eppTermino,
            notes: todayShifts.get(w.rut)?.notes ?? null,
          };
        });
      if (rows.length > 0) await shiftRepo.upsertMany(rows);
      setSavedMsg({
        type: "ok",
        text: `Transacción confirmada para ${rows.length} trabajadores revisados.`,
      });
      setDirty(false);
    } catch (e) {
      setSavedMsg({
        type: "err",
        text: "No se pudo sincronizar: " + (e as Error).message + ". Intenta nuevamente.",
      });
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (!dirty) return;
    const timer = window.setTimeout(() => {
      void runInBackground("Sincronizando asistencia", saveAttendance).catch(() => {});
    }, 900);
    return () => window.clearTimeout(timer);
  }, [dirty, attendance, hhtValues, eppChecks, selectedDate, reviewedRuts]); // eslint-disable-line react-hooks/exhaustive-deps -- reviewed dependency set; unstable callback recreation is intentional to avoid loops

  async function deleteAttendance(rut: string) {
    try {
      await shiftRepo.deleteByWorkerDate(rut, selectedDate);
      await audit({
        action: "shift.delete",
        entity: "daily_shifts",
        entity_label: `${rut} — ${selectedDate}`,
      });
      const sug = suggestShift(
        workers.find((w) => w.rut === rut)?.shift_cycle ?? "5x2",
        new Date(selectedDate + "T00:00"),
        data.shiftDefs,
      );
      setAttendance((prev) => ({ ...prev, [rut]: sug.working ? "Presente" : "Descanso" }));
      setHhtValues((prev) => ({ ...prev, [rut]: sug.working ? 8 : 0 }));
      setReviewedRuts((prev) => {
        const next = new Set(prev);
        next.delete(rut);
        return next;
      });
      setSavedMsg({ type: "ok", text: `Registro eliminado para ${rut}.` });
    } catch (e) {
      setSavedMsg({
        type: "err",
        text: "Error al eliminar: " + (e as Error).message,
      });
    }
  }

  function exportExcel() {
    const rows = activeWorkers.map((w) => {
      const s = suggestShift(w.shift_cycle, new Date(selectedDate + "T00:00"), data.shiftDefs);
      const att = attendance[w.rut] ?? "Presente";
      const epp = eppChecks[w.rut] ?? {};
      const eppInicio = Object.keys(epp)
        .filter((item) => epp[item]?.inicio)
        .join(", ");
      const eppTermino = Object.keys(epp)
        .filter((item) => epp[item]?.termino)
        .join(", ");
      return {
        Fecha: selectedDate,
        Trabajador: w.full_name,
        RUT: w.rut,
        Cargo: w.position,
        Ciclo: w.shift_cycle,
        Turno_Sugerido: s.label,
        Deberia_Trabajar: s.working ? "Sí" : "No",
        Estado: att,
        HHT: hhtValues[w.rut] ?? 0,
        EPP_Inicio_Jornada: eppInicio,
        EPP_Termino_Jornada: eppTermino,
      };
    });
    ExportService.toExcel(rows, "Asistencia", `asistencia_${selectedDate}`);
  }

  if (data.loading) return <Spinner />;

  const dateObj = new Date(selectedDate + "T00:00");
  const dateLabel = dateObj.toLocaleDateString("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const hasExisting = (rut: string) => !!todayShifts.get(rut);

  return (
    <div className="space-y-4">
      <Card className="p-3 sm:p-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
              <ClipboardCheck size={20} className="text-blue-700" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-slate-800 text-sm sm:text-base">
                Control de Asistencia
              </h3>
              <p className="text-xs text-slate-500 hidden sm:block">
                Pasa lista, revisa el turno sugerido y verifica EPP al inicio y término de jornada
              </p>
            </div>
            <InfoTooltip text="El sistema sugiere si el trabajador debería estar en turno según su ciclo (7x7, 5x2, 4x3) y la fecha. Marca los EPP verificados al inicio y término de la jornada laboral (DS 594). Las horas HHT son editables." />
          </div>
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <div className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-50 rounded-lg border border-slate-200">
              <CalendarClock size={15} className="text-slate-400" />
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="border-0 bg-transparent px-0 py-0 text-sm focus:ring-0 max-w-[130px]"
              />
            </div>
            <Button variant="outline" size="sm" onClick={exportExcel}>
              <FileSpreadsheet size={15} /> <span className="hidden sm:inline">Excel</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenQrCards}
              title="Generar e imprimir tarjetas QR"
            >
              <QrIcon size={15} /> <span className="hidden sm:inline">Tarjetas QR</span>
            </Button>
            <Button size="sm" onClick={onOpenQrScanner} title="Escanear QR de trabajador">
              <ScanLine size={15} /> <span className="hidden sm:inline">Escanear QR</span>
            </Button>
            <Button size="sm" onClick={() => void saveAttendance()} loading={saving}>
              <Save size={15} /> Guardar
            </Button>
          </div>
        </div>
        {dirty && (
          <div className="mt-3 px-3 py-2 rounded-lg text-sm flex items-center gap-2 bg-blue-50 text-blue-700">
            <AlertTriangle size={15} /> Cambios locales listos. Se sincronizan automáticamente.
          </div>
        )}
        {savedMsg && (
          <div
            className={`mt-3 px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${savedMsg.type === "err" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}
          >
            {savedMsg.type === "err" ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />}
            {savedMsg.text}
          </div>
        )}
      </Card>

      <div className="grid grid-cols-2 min-[480px]:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
        <Card className="p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
            <Users size={17} className="text-slate-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-slate-800 leading-none">{counts.total}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Total</p>
          </div>
        </Card>
        {ATTENDANCE_STATUSES.map((s) => (
          <Card key={s} className="p-3 flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center ${STATUS_STYLES[s].dot} bg-opacity-15`}
            >
              {s === "Presente" ? (
                <UserCheck size={17} className="text-emerald-600" />
              ) : s === "Ausente" ? (
                <UserX size={17} className="text-red-600" />
              ) : (
                <Clock size={17} className="text-slate-600" />
              )}
            </div>
            <div>
              <p className="text-xl font-bold text-slate-800 leading-none">{counts[s] ?? 0}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{s}</p>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, RUT o cargo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setFilterStatus("all")}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors ${filterStatus === "all" ? "bg-slate-700 text-white border-transparent" : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"}`}
            >
              Todos
            </button>
            {ATTENDANCE_STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors flex items-center gap-1.5 ${filterStatus === s ? STATUS_STYLES[s].active : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${STATUS_STYLES[s].dot}`} />
                {s}
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={markAllPresent}
            title="Marcar todos los que deberían trabajar como Presente"
          >
            <CheckCheck size={15} /> Presentes sugeridos
          </Button>
          <Button variant="outline" size="sm" onClick={() => markAllStatus("Presente")}>
            <UserCheck size={15} /> Todos presentes
          </Button>
          <Button variant="outline" size="sm" onClick={() => markAllStatus("Ausente")}>
            <UserX size={15} /> Todos ausentes
          </Button>
        </div>
      </Card>

      {activeWorkers.length === 0 ? (
        <Card className="p-8 text-center text-slate-400">
          No hay trabajadores activos registrados
        </Card>
      ) : filteredWorkers.length === 0 ? (
        <Card className="p-8 text-center text-slate-400">
          No se encontraron trabajadores con esos filtros
        </Card>
      ) : (
        <div className="space-y-1.5">
          <div className="hidden lg:grid grid-cols-[minmax(220px,1.5fr)_180px_150px_100px_150px_56px] gap-3 px-4 py-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider select-none">
            <div>Trabajador</div>
            <div>Turno y Horario</div>
            <div>Registros</div>
            <div>Horas HHT</div>
            <div>Estado / Validador</div>
            <div className="text-right">Acciones</div>
          </div>
          {filteredWorkers.map((w) => {
            const suggestion = suggestShift(w.shift_cycle, dateObj, data.shiftDefs);
            const att = attendance[w.rut] ?? "Presente";
            const epp = eppChecks[w.rut] ?? {};
            const items = eppLogs
              .filter((e) => e.worker_rut === w.rut && e.delivery_date <= selectedDate)
              .map((e) => e.epp_item_name);
            const eppItems = items.length > 0 ? items : STANDARD_EPP;
            const isExpanded = expandedRut === w.rut;
            const eppInicioCount = eppItems.filter((item) => epp[item]?.inicio).length;
            const eppTerminoCount = eppItems.filter((item) => epp[item]?.termino).length;
            const exists = hasExisting(w.rut);
            const workerQrScans = qrByWorker.get(w.rut) ?? [];
            return (
              <Card
                key={w.rut}
                className={`overflow-hidden transition-shadow ${isExpanded ? "shadow-md" : ""}`}
              >
                {/* Desktop row layout */}
                <div className="hidden lg:grid grid-cols-[minmax(220px,1.5fr)_180px_150px_100px_150px_56px] gap-3 px-4 py-3 items-center">
                  <div className="flex items-center gap-3 min-w-0">
                    <WorkerAvatar
                      name={w.full_name}
                      rut={w.rut}
                      photoUrl={w.photo_url}
                      className="h-9 w-9 shrink-0"
                    />
                    <div className="min-w-0">
                      <p
                        className="font-semibold text-slate-800 text-sm leading-tight"
                        title={w.full_name}
                      >
                        {w.full_name}
                      </p>
                      <p
                        className="text-xs text-slate-500 leading-tight mt-0.5"
                        title={`${w.rut} · ${w.position}`}
                      >
                        {w.rut} · {w.position}
                      </p>
                    </div>
                  </div>
                  <div className="min-w-0">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border ${suggestion.working ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200"}`}
                    >
                      {suggestion.working ? <Sunrise size={12} /> : <Sunset size={12} />}{" "}
                      {suggestion.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                    <span
                      title={`${eppInicioCount} de ${eppItems.length} EPP verificados al inicio`}
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-medium border cursor-help ${eppInicioCount === eppItems.length && eppItems.length > 0 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-400 border-slate-200"}`}
                    >
                      <HardHat size={11} /> {eppInicioCount}/{eppItems.length}
                    </span>
                    <span
                      title={`${eppTerminoCount} de ${eppItems.length} EPP verificados al termino`}
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-medium border cursor-help ${eppTerminoCount === eppItems.length && eppItems.length > 0 ? "bg-indigo-50 text-indigo-700 border-indigo-200" : "bg-slate-50 text-slate-400 border-slate-200"}`}
                    >
                      <HardHat size={11} /> {eppTerminoCount}/{eppItems.length}
                    </span>
                    {workerQrScans.length > 0 && (
                      <span
                        title={`${workerQrScans.length} registro(s) QR validados: ${workerQrScans.map((q) => `${QR_LABELS[q.type] ?? q.type} ${q.time}`).join(", ")}`}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-medium border bg-violet-50 text-violet-700 border-violet-200 cursor-help"
                      >
                        <ScanLine size={11} /> {workerQrScans.length}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={0}
                      max={24}
                      step={0.5}
                      value={hhtValues[w.rut] ?? 0}
                      onChange={(e) => setHht(w.rut, parseFloat(e.target.value) || 0)}
                      title="Horas Hombre trabajadas — editable"
                      className="w-14 px-1.5 py-1 text-xs text-center border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <span className="text-xs text-slate-400 font-medium">hrs</span>
                    <Pencil size={11} className="text-slate-300 shrink-0" />
                  </div>
                  <div className="flex items-center gap-1 min-w-0 flex-wrap">
                    {ATTENDANCE_STATUSES.map((s) => (
                      <button
                        key={s}
                        onClick={() => setAtt(w.rut, s)}
                        title={`Marcar ${s}`}
                        className={`px-2 py-1 text-[11px] font-semibold rounded-md border transition-all flex items-center gap-1 ${att === s ? STATUS_STYLES[s].active : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"}`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${att === s ? "bg-white" : STATUS_STYLES[s].dot}`}
                        />
                        {s}
                      </button>
                    ))}
                    {workerQrScans.length > 0 && (
                      <span
                        title="Trabajador con registro QR validado"
                        className="shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full bg-violet-100"
                      >
                        <ScanLine size={12} className="text-violet-600" />
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-end gap-1">
                    {exists && canDelete && (
                      <button
                        onClick={() => deleteAttendance(w.rut)}
                        title="Eliminar registro de asistencia"
                        className="p-1.5 rounded-md text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                    <button
                      onClick={() => setExpandedRut(isExpanded ? null : w.rut)}
                      title={isExpanded ? "Contraer panel" : "Expandir panel de EPP y estado"}
                      className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                    >
                      <ChevronDown
                        size={18}
                        className={`transition-transform ${isExpanded ? "rotate-180" : ""}`}
                      />
                    </button>
                  </div>
                </div>

                {/* Mobile card layout */}
                <div className="lg:hidden px-3 py-2.5 space-y-2.5">
                  <div className="flex items-center gap-2.5">
                    <WorkerAvatar
                      name={w.full_name}
                      rut={w.rut}
                      photoUrl={w.photo_url}
                      className="h-8 w-8 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p
                        className="font-semibold text-slate-800 text-sm leading-tight truncate"
                        title={w.full_name}
                      >
                        {w.full_name}
                      </p>
                      <p className="text-[11px] text-slate-500 leading-tight mt-0.5 truncate">
                        {w.rut} · {w.position}
                      </p>
                    </div>
                    <button
                      onClick={() => setExpandedRut(isExpanded ? null : w.rut)}
                      className="p-1 rounded-md text-slate-400 hover:bg-slate-100"
                    >
                      <ChevronDown
                        size={18}
                        className={`transition-transform ${isExpanded ? "rotate-180" : ""}`}
                      />
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border ${suggestion.working ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200"}`}
                    >
                      {suggestion.working ? <Sunrise size={12} /> : <Sunset size={12} />}{" "}
                      {suggestion.label}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-medium border ${eppInicioCount === eppItems.length && eppItems.length > 0 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-400 border-slate-200"}`}
                    >
                      <HardHat size={11} /> {eppInicioCount}/{eppItems.length}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-medium border ${eppTerminoCount === eppItems.length && eppItems.length > 0 ? "bg-indigo-50 text-indigo-700 border-indigo-200" : "bg-slate-50 text-slate-400 border-slate-200"}`}
                    >
                      <HardHat size={11} /> {eppTerminoCount}/{eppItems.length}
                    </span>
                    {workerQrScans.length > 0 && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-medium border bg-violet-50 text-violet-700 border-violet-200">
                        <ScanLine size={11} /> {workerQrScans.length}
                      </span>
                    )}
                    <div className="flex items-center gap-1 ml-auto">
                      <input
                        type="number"
                        min={0}
                        max={24}
                        step={0.5}
                        value={hhtValues[w.rut] ?? 0}
                        onChange={(e) => setHht(w.rut, parseFloat(e.target.value) || 0)}
                        className="w-12 px-1.5 py-0.5 text-xs text-center border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <span className="text-[11px] text-slate-400">hrs</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-wrap">
                    {ATTENDANCE_STATUSES.map((s) => (
                      <button
                        key={s}
                        onClick={() => setAtt(w.rut, s)}
                        className={`px-1.5 py-0.5 text-[10px] font-semibold rounded-md border transition-all flex items-center gap-1 ${att === s ? STATUS_STYLES[s].active : "bg-white text-slate-500 border-slate-200"}`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${att === s ? "bg-white" : STATUS_STYLES[s].dot}`}
                        />
                        {s}
                      </button>
                    ))}
                    {exists && canDelete && (
                      <button
                        onClick={() => deleteAttendance(w.rut)}
                        className="p-1 rounded-md text-red-400 hover:bg-red-50 hover:text-red-600 ml-auto"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-3 animate-fade-in">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                        <HardHat size={14} className="text-blue-600" /> Verificacion de EPP
                      </p>
                      <span className="text-xs text-slate-400">{dateLabel}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white rounded-lg border border-slate-200 p-3">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-semibold text-amber-600 flex items-center gap-1.5">
                            <Sunrise size={14} /> Inicio de Jornada
                          </p>
                          <button
                            onClick={() => checkAllEpp(w.rut, "inicio")}
                            className="text-[11px] text-blue-600 hover:text-blue-700 font-medium"
                          >
                            Marcar todos
                          </button>
                        </div>
                        <div className="space-y-1.5">
                          {eppItems.map((item) => (
                            <button
                              key={item}
                              onClick={() => toggleEpp(w.rut, item, "inicio")}
                              className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-md border transition-colors text-left ${epp[item]?.inicio ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}
                            >
                              {epp[item]?.inicio ? (
                                <CheckCircle2 size={15} className="shrink-0" />
                              ) : (
                                <span className="w-[15px] h-[15px] rounded-full border-2 border-slate-300 shrink-0" />
                              )}
                              {item}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="bg-white rounded-lg border border-slate-200 p-3">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-semibold text-indigo-600 flex items-center gap-1.5">
                            <Sunset size={14} /> Termino de Jornada
                          </p>
                          <button
                            onClick={() => checkAllEpp(w.rut, "termino")}
                            className="text-[11px] text-blue-600 hover:text-blue-700 font-medium"
                          >
                            Marcar todos
                          </button>
                        </div>
                        <div className="space-y-1.5">
                          {eppItems.map((item) => (
                            <button
                              key={item}
                              onClick={() => toggleEpp(w.rut, item, "termino")}
                              className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-md border transition-colors text-left ${epp[item]?.termino ? "bg-indigo-50 text-indigo-700 border-indigo-200" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}
                            >
                              {epp[item]?.termino ? (
                                <CheckCircle2 size={15} className="shrink-0" />
                              ) : (
                                <span className="w-[15px] h-[15px] rounded-full border-2 border-slate-300 shrink-0" />
                              )}
                              {item}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
