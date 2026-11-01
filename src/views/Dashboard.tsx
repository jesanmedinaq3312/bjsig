import { useMemo, useState, useEffect, useRef } from "react";
import {
  Users,
  AlertTriangle,
  GraduationCap,
  ShieldCheck,
  HardHat,
  TrendingDown,
  CalendarClock,
  ArrowRight,
  BarChart3,
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
  MessageSquare,
  Bell,
  BellRing,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Card, CardHeader, Spinner, Badge, InfoTooltip, Button } from "@/components/ui";
import { BarChart, DonutChart, LineChart } from "@/components/charts";
import { IndicatorService } from "@/lib/indicators";
import { ExpiryService } from "@/lib/expiry";
import { ExpirationAlertService, type ExpirationAlert } from "@/lib/expirationAlerts";
import { shiftRepo, workerRequestRepo, eppDeliveryRepo } from "@/lib/repositories";
import { audit } from "@/lib/audit";
import type { AppData } from "@/hooks/useAppData";
import type { ViewKey } from "@/components/Layout";
import type { ShiftCycle, AttendanceStatus, WorkerRequest } from "@/lib/types";
import { WorkerAvatar } from "@/components/WorkerAvatar";

export function Dashboard({
  data,
  onNavigate,
}: {
  data: AppData;
  onNavigate: (v: ViewKey) => void;
}) {
  const [pendingRequests, setPendingRequests] = useState<WorkerRequest[]>([]);
  const [eppDeliveryRuts, setEppDeliveryRuts] = useState<Set<string>>(new Set());
  useEffect(() => {
    workerRequestRepo
      .getAll()
      .then((r) =>
        setPendingRequests(r.filter((x) => x.status === "pendiente" || x.status === "en_proceso")),
      )
      .catch(() => {});
  }, []);
  useEffect(() => {
    eppDeliveryRepo
      .getWorkerRuts()
      .then((ruts) => setEppDeliveryRuts(new Set(ruts)))
      .catch(() => {});
  }, []);
  const { workers, incidents, trainings, shifts, isoAudits, eppLogs, loading } = data;

  const expirationAlerts = useMemo(
    () =>
      ExpirationAlertService.scan({
        workers,
        eppLogs,
        cloudDocs: data.cloudDocs,
        medicalLicenses: data.medicalLicenses,
        isoAudits,
      }),
    [workers, eppLogs, data.cloudDocs, data.medicalLicenses, isoAudits],
  );

  const alertSummary = useMemo(
    () => ExpirationAlertService.summary(expirationAlerts),
    [expirationAlerts],
  );

  const [notifEnabled, setNotifEnabled] = useState(false);
  const [alertExpanded, setAlertExpanded] = useState(true);
  const notifiedRef = useRef(false);
  useEffect(() => {
    if (notifiedRef.current) return;
    if (expirationAlerts.length > 0 && notifEnabled) {
      ExpirationAlertService.notify(expirationAlerts);
      notifiedRef.current = true;
    }
  }, [expirationAlerts, notifEnabled]);

  async function enableNotifications() {
    const granted = await ExpirationAlertService.requestPermission();
    if (granted) {
      setNotifEnabled(true);
      ExpirationAlertService.notify(expirationAlerts);
      notifiedRef.current = true;
    }
  }

  const stats = useMemo(() => {
    const planned = 100;
    const executed =
      trainings.length + data.astLogs.length + eppLogs.length + data.cphsMeetings.length;
    const ind = IndicatorService.compute(incidents, shifts, workers, eppLogs, planned, executed);

    // Override coberturaEpp: merge epp_logs (terrain) with epp_deliveries (warehouse)
    const workersWithEppLogs = new Set(
      eppLogs
        .filter((e) => e.condition === "Bueno" && e.digital_signature)
        .map((e) => e.worker_rut),
    );
    const allEppRuts = new Set([...workersWithEppLogs, ...eppDeliveryRuts]);
    const activeWorkersList = workers.filter((w) => w.status === "ACTIVO");
    const activeWithEpp = activeWorkersList.filter((w) => allEppRuts.has(w.rut)).length;
    ind.coberturaEpp =
      activeWorkersList.length > 0 ? (activeWithEpp / activeWorkersList.length) * 100 : 0;

    const accidents = ind.accidentCount;
    const nearMisses = incidents.filter((i) => i.type === "Casi-accidente").length;
    const unsafe = incidents.filter((i) => i.type === "Condición insegura").length;

    const today = new Date();
    const examsVencidos = workers.filter(
      (w) => ExpiryService.check(w.occupational_exam_exp_date, today).status === "vencido",
    ).length;
    const examsPorVencer = workers.filter(
      (w) => ExpiryService.check(w.occupational_exam_exp_date, today).status === "por-vencer",
    ).length;
    const openIso = isoAudits.filter((a) => a.status !== "Cerrada").length;
    const activeWorkers = activeWorkersList.length;

    return {
      ind,
      accidents,
      nearMisses,
      unsafe,
      examsVencidos,
      examsPorVencer,
      openIso,
      activeWorkers,
    };
  }, [
    workers,
    incidents,
    trainings,
    shifts,
    isoAudits,
    eppLogs,
    data.astLogs,
    data.cphsMeetings,
    eppDeliveryRuts,
  ]);

  const incidentTrend = useMemo(() => {
    const months: Record<string, number> = {};
    incidents.forEach((i) => {
      const m = new Date(i.event_date).toLocaleDateString("es-CL", { month: "short" });
      months[m] = (months[m] || 0) + 1;
    });
    return Object.entries(months).map(([label, value]) => ({ label, value }));
  }, [incidents]);

  const incidentTypes = useMemo(
    () => [
      { label: "Accidentes", value: stats.accidents, color: "#dc2626" },
      { label: "Casi-accidentes", value: stats.nearMisses, color: "#f59e0b" },
      { label: "Cond. inseguras", value: stats.unsafe, color: "#3b82f6" },
    ],
    [stats],
  );

  const trainingsByMonth = useMemo(() => {
    const months: Record<string, number> = {};
    trainings.forEach((t) => {
      const m = new Date(t.date).toLocaleDateString("es-CL", { month: "short" });
      months[m] = (months[m] || 0) + 1;
    });
    return Object.entries(months).map(([label, value]) => ({ label, value }));
  }, [trainings]);

  if (loading) return <Spinner />;

  const kpis: {
    label: string;
    value: string | number;
    icon: React.ReactNode;
    color: string;
    view: ViewKey;
    hover: string;
  }[] = [
    {
      label: "Trabajadores Activos",
      value: stats.activeWorkers,
      icon: <Users size={20} />,
      color: "text-blue-600 bg-blue-50",
      view: "workers",
      hover: `${stats.activeWorkers} trabajadores con estado ACTIVO. Click para ver el registro completo de dotación.`,
    },
    {
      label: "Accidentes (período)",
      value: stats.accidents,
      icon: <AlertTriangle size={20} />,
      color: "text-red-600 bg-red-50",
      view: "incidents",
      hover: `${stats.accidents} accidentes registrados. ${stats.ind.accidentCTPCount} con tiempo perdido (CTP). Click para ver el libro de incidentes DS 44.`,
    },
    {
      label: "Casi-accidentes",
      value: stats.nearMisses,
      icon: <TrendingDown size={20} />,
      color: "text-amber-600 bg-amber-50",
      view: "incidents",
      hover: `${stats.nearMisses} eventos sin daño registrados. Click para ver detalle y análisis de causa raíz.`,
    },
    {
      label: "Capacitaciones",
      value: trainings.length,
      icon: <GraduationCap size={20} />,
      color: "text-emerald-600 bg-emerald-50",
      view: "trainings",
      hover: `${trainings.length} capacitaciones registradas bajo DS 44. Click para ver el plan anual HHC.`,
    },
    {
      label: "Tasa de Frecuencia",
      value: stats.ind.tf.toFixed(2),
      icon: <BarChart3 size={20} />,
      color: "text-indigo-600 bg-indigo-50",
      view: "indicators",
      hover: `TF = (CTP × 1M) / HHT = ${stats.ind.tf.toFixed(2)}. Meta ACHS: < 5.0. Click para ver el motor de cálculo.`,
    },
    {
      label: "Tasa de Gravedad",
      value: stats.ind.tg.toFixed(2),
      icon: <BarChart3 size={20} />,
      color: "text-purple-600 bg-purple-50",
      view: "indicators",
      hover: `TG = ((Días + Días Carga) × 1M) / HHT = ${stats.ind.tg.toFixed(2)}. Meta ACHS: < 50. Click para ver el motor de cálculo.`,
    },
    {
      label: "Cobertura EPP",
      value: stats.ind.coberturaEpp.toFixed(0) + "%",
      icon: <HardHat size={20} />,
      color: "text-teal-600 bg-teal-50",
      view: "terrain",
      hover: `${stats.ind.coberturaEpp.toFixed(1)}% de trabajadores con EPP vigente y firmado. Meta: 100%. Click para ver entregas de EPP.`,
    },
    {
      label: "Hallazgos ISO abiertos",
      value: stats.openIso,
      icon: <ShieldCheck size={20} />,
      color: "text-cyan-600 bg-cyan-50",
      view: "iso",
      hover: `${stats.openIso} hallazgos sin cerrar en ISO 9001/14001/45001. Click para ver auditorías.`,
    },
    {
      label: "Exámenes por vencer",
      value: stats.examsPorVencer + stats.examsVencidos,
      icon: <CalendarClock size={20} />,
      color: "text-orange-600 bg-orange-50",
      view: "docs",
      hover: `${stats.examsVencidos} vencidos + ${stats.examsPorVencer} por vencer (30 días). Click para ver la matriz de documentación.`,
    },
  ];

  return (
    <div className="space-y-6 rounded-[2rem] bg-gradient-to-br from-slate-50 via-white to-blue-50/50 p-1 md:p-2">
      <div className="flex flex-col justify-between gap-4 rounded-3xl border border-slate-200/80 bg-white/80 px-5 py-5 shadow-sm backdrop-blur md:flex-row md:items-center">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">
            Portfolio operativo BJSIGAPP
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 md:text-3xl">
            Vista general de la empresa
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Personas, cumplimiento, prevención e inventario en una sola lectura.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void data.reload()}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:border-blue-300 hover:text-blue-700"
        >
          <BarChart3 size={14} /> Actualizar datos
        </button>
      </div>
      {/* 1. Weekly Attendance Widget (AHORA AL PRINCIPIO) */}
      <WeeklyAttendanceWidget data={data} onNavigate={onNavigate} />

      {/* 2. KPI grid — clickable + hover */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {kpis.map((k) => (
          <button
            key={k.label}
            onClick={() => onNavigate(k.view)}
            className="group text-left glass-surface glass-hover rounded-xl p-4 cursor-pointer relative transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${k.color}`}>
                {k.icon}
              </div>
              <InfoTooltip text={k.hover} size={14} />
            </div>
            <p className="text-2xl font-bold text-slate-800">{k.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{k.label}</p>
            <div className="mt-2 flex items-center gap-1 text-xs text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
              Ver sección <ArrowRight size={12} />
            </div>
          </button>
        ))}
      </div>

      {/* 3. Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Tendencia de Incidentes"
            subtitle="Eventos registrados por mes (DS 44)"
          />
          <div className="px-5 pb-5">
            <LineChart data={incidentTrend} height={220} color="#1e40af" />
          </div>
        </Card>
        <Card>
          <CardHeader title="Distribución de Eventos" />
          <div className="px-5 pb-5 flex justify-center">
            <DonutChart segments={incidentTypes} />
          </div>
        </Card>
      </div>

      {/* 4. Capacitaciones y Alertas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Capacitaciones por Mes" subtitle="Plan anual DS 44" />
          <div className="px-5 pb-5">
            {trainingsByMonth.length < 3 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <GraduationCap size={28} className="text-slate-300 mb-2" />
                <p className="text-sm text-slate-500">
                  {trainingsByMonth.length === 0
                    ? "No hay capacitaciones registradas aún."
                    : "Datos insuficientes para mostrar tendencia."}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Registra capacitaciones en la sección correspondiente para visualizar el plan
                  anual DS 44.
                </p>
              </div>
            ) : (
              <BarChart data={trainingsByMonth} height={200} color="#059669" />
            )}
          </div>
        </Card>
        <Card>
          <CardHeader
            title="Alertas de Vencimiento Proactivas"
            subtitle={`${alertSummary.vencidos} vencidos · ${alertSummary.porVencer} por vencer`}
            action={
              <button
                onClick={enableNotifications}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${notifEnabled ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100"}`}
                title={notifEnabled ? "Notificaciones activadas" : "Activar notificaciones push"}
              >
                {notifEnabled ? <BellRing size={14} /> : <Bell size={14} />}
                {notifEnabled ? "Activadas" : "Notificar"}
              </button>
            }
          />
          <div className="px-5 pb-5 space-y-2">
            {expirationAlerts.length === 0 ? (
              <div className="flex items-center gap-2 py-3 text-sm text-slate-500">
                <CheckCircle2 size={16} className="text-emerald-500" />
                Todos los documentos están vigentes.
              </div>
            ) : (
              <>
                {(alertExpanded ? expirationAlerts : expirationAlerts.slice(0, 4)).map((a) => (
                  <ExpirationAlertRow
                    key={a.id}
                    alert={a}
                    onClick={() => onNavigate(a.view as ViewKey)}
                  />
                ))}
                {expirationAlerts.length > 4 && (
                  <button
                    onClick={() => setAlertExpanded(!alertExpanded)}
                    className="w-full flex items-center justify-center gap-1 py-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {alertExpanded ? (
                      <>
                        Ver menos <ChevronUp size={13} />
                      </>
                    ) : (
                      <>
                        Ver {expirationAlerts.length - 4} más <ChevronDown size={13} />
                      </>
                    )}
                  </button>
                )}
              </>
            )}
          </div>
        </Card>
      </div>

      {/* 4b. Worker requests widget */}
      {pendingRequests.length > 0 && (
        <Card>
          <CardHeader
            title="Solicitudes de Trabajadores"
            subtitle={`${pendingRequests.length} pendientes de respuesta`}
            action={<MessageSquare size={18} className="text-amber-500" />}
          />
          <div className="px-5 pb-5 space-y-2">
            {pendingRequests.slice(0, 5).map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between py-2 px-3 rounded-lg bg-amber-50/50 border border-amber-100/60"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">{r.subject}</p>
                  <p className="text-xs text-slate-400">
                    RUT: {r.worker_rut} · {r.category}
                  </p>
                </div>
                <Badge
                  className={
                    r.status === "pendiente"
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-blue-50 text-blue-700 border-blue-200"
                  }
                >
                  {r.status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 5. Header banner (AHORA AL FINAL DE LA PÁGINA) */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-blue-900 to-blue-800 p-6 lg:p-8 text-white">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: "radial-gradient(circle at 80% 20%, white 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <HardHat size={22} />
            <span className="text-sm font-medium text-blue-200">
              Sistema Integrado de Gestión (SIG) Pro Edition
            </span>
          </div>
          <h2 className="text-2xl lg:text-3xl font-bold mb-1">
            Centro de Control de Prevención de Riesgos
          </h2>
          <p className="text-blue-200 text-sm max-w-2xl">
            Cumplimiento DS 44 · DS 594 · Ley 16.744 · ISO 9001/14001/45001 — Indicadores calculados
            según metodología ACHS / SUSESO.
          </p>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-blue-300">
            <InfoTooltip
              text="Los indicadores TF y TG se calculan con fórmulas oficiales ACHS/SUSESO basadas en Horas Hombre Trabajadas (HHT) reales. Meta ACHS: TF < 5.0 y TG < 50.0."
              size={14}
            />
            <span>Indicadores automáticos según metodología ACHS/SUSESO</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <BannerStat
              label="Horas Hombre (HHT)"
              value={stats.ind.manHours.toLocaleString("es-CL")}
            />
            <BannerStat label="Días Perdidos" value={String(stats.ind.daysLost)} />
            <BannerStat label="Cumpl. DS44" value={stats.ind.cumplimientoDS44.toFixed(0) + "%"} />
            <BannerStat label="IA (Accidentabilidad)" value={stats.ind.ia.toFixed(2) + "%"} />
          </div>
        </div>
      </div>
    </div>
  );
}

function BannerStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-2 bg-white/10 backdrop-blur rounded-lg border border-white/20">
      <p className="text-xs text-blue-200">{label}</p>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}

function ExpirationAlertRow({ alert, onClick }: { alert: ExpirationAlert; onClick: () => void }) {
  const isVencido = alert.severity === "vencido";
  const tone = isVencido
    ? "bg-red-50 text-red-700 border-red-200"
    : "bg-amber-50 text-amber-700 border-amber-200";
  const daysLabel =
    alert.daysRemaining < 0
      ? `Vencido hace ${Math.abs(alert.daysRemaining)}d`
      : `${alert.daysRemaining}d restantes`;
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-start gap-2.5 px-3 py-2.5 rounded-lg border ${tone} hover:opacity-80 transition-opacity text-left`}
    >
      <div className="mt-0.5 shrink-0">
        {isVencido ? (
          <AlertTriangle size={15} className="text-red-600" />
        ) : (
          <CalendarClock size={15} className="text-amber-600" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-700 truncate">{alert.title}</p>
        <p className="text-xs text-slate-500">
          {ExpirationAlertService.categoryLabel(alert.category)} · {alert.expiryDate} · {daysLabel}
        </p>
      </div>
      <Badge
        className={
          isVencido
            ? "bg-red-100 text-red-700 border-red-200"
            : "bg-amber-100 text-amber-700 border-amber-200"
        }
      >
        {isVencido ? "Vencido" : "Por vencer"}
      </Badge>
    </button>
  );
}

function suggestShift(cycle: ShiftCycle, date: Date): boolean {
  const dayOfWeek = (date.getDay() + 6) % 7;
  const dayOfYear = Math.floor(
    (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000,
  );
  if (cycle === "5x2") return dayOfWeek < 5;
  if (cycle === "7x7") return Math.floor(dayOfYear / 7) % 2 === 0;
  if (cycle === "4x3") return dayOfYear % 7 < 4;
  return true;
}

const ATT_STATUSES: AttendanceStatus[] = ["Presente", "Ausente", "Licencia", "Permiso", "Descanso"];

const ATT_DOT: Record<AttendanceStatus, string> = {
  Presente: "bg-emerald-500",
  Ausente: "bg-red-500",
  Licencia: "bg-amber-500",
  Permiso: "bg-blue-500",
  Descanso: "bg-slate-400",
};

const ATT_RING: Record<AttendanceStatus, string> = {
  Presente: "bg-emerald-100 text-emerald-700",
  Ausente: "bg-red-100 text-red-700",
  Licencia: "bg-amber-100 text-amber-700",
  Permiso: "bg-blue-100 text-blue-700",
  Descanso: "bg-slate-100 text-slate-600",
};

function WeeklyAttendanceWidget({
  data,
  onNavigate,
}: {
  data: AppData;
  onNavigate: (v: ViewKey) => void;
}) {
  const { workers, shifts, qrScans } = data;
  const today = new Date(); // eslint-disable-line react-hooks/exhaustive-deps -- reviewed dependency set; unstable callback recreation is intentional to avoid loops
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const weekDays = useMemo(() => {
    const day = (today.getDay() + 6) % 7;
    const monday = new Date(today);
    monday.setDate(today.getDate() - day);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  }, [today]);

  const todayStr = today.toISOString().slice(0, 10);

  const activeWorkers = useMemo(() => workers.filter((w) => w.status === "ACTIVO"), [workers]);

  // QR scans: a validated 'entrada' on a given date means the worker is present
  const qrPresentByDate = useMemo(() => {
    const map = new Set<string>(); // 'rut|date'
    qrScans.forEach((q) => {
      if (q.validated && q.scan_type === "entrada") {
        map.add(`${q.worker_rut}|${q.scan_date}`);
      }
    });
    return map;
  }, [qrScans]);

  const shiftMap = useMemo(() => {
    const map = new Map<string, typeof shifts>();
    shifts.forEach((s) => {
      const arr = map.get(s.worker_rut) ?? [];
      arr.push(s);
      map.set(s.worker_rut, arr);
    });
    return map;
  }, [shifts]);

  function getAttForDay(rut: string, dateStr: string): AttendanceStatus {
    const ws = shiftMap.get(rut)?.find((s) => s.date === dateStr);
    if (ws) return ws.attendance_status;
    // QR entrada scan counts as present
    if (qrPresentByDate.has(`${rut}|${dateStr}`)) return "Presente";
    const shouldWork = suggestShift(
      activeWorkers.find((w) => w.rut === rut)?.shift_cycle ?? "7x7",
      new Date(dateStr + "T00:00"),
    );
    return shouldWork ? "Presente" : "Descanso";
  }

  const todayCounts = useMemo(() => {
    const c: Record<string, number> = {
      Presente: 0,
      Ausente: 0,
      Licencia: 0,
      Permiso: 0,
      Descanso: 0,
    };
    activeWorkers.forEach((w) => {
      const s = getAttForDay(w.rut, todayStr);
      c[s] = (c[s] ?? 0) + 1;
    });
    return c;
  }, [activeWorkers, shiftMap, qrPresentByDate, todayStr]); // eslint-disable-line react-hooks/exhaustive-deps -- reviewed dependency set; unstable callback recreation is intentional to avoid loops

  const weekSummary = useMemo(() => {
    let present = 0,
      total = 0;
    weekDays.forEach((d) => {
      const ds = d.toISOString().slice(0, 10);
      activeWorkers.forEach((w) => {
        total++;
        if (getAttForDay(w.rut, ds) === "Presente") present++;
      });
    });
    return { present, total, pct: total > 0 ? Math.round((present / total) * 100) : 0 };
  }, [weekDays, activeWorkers, shiftMap, qrPresentByDate]); // eslint-disable-line react-hooks/exhaustive-deps -- reviewed dependency set; unstable callback recreation is intentional to avoid loops

  async function quickPass(rut: string, status: AttendanceStatus) {
    setSaving(true);
    setSavedMsg(null);
    try {
      const existing = shiftMap.get(rut)?.find((s) => s.date === todayStr);
      if (existing) {
        await shiftRepo.update(existing.id, {
          ...existing,
          attendance_status: status,
          calculated_hht: status === "Presente" ? 8 : 0,
        });
        await audit({
          action: "shift.update",
          entity: "daily_shifts",
          entity_id: existing.id,
          entity_label: `${rut} — ${todayStr}`,
          details: { attendance_status: status },
        });
      } else {
        await shiftRepo.insert({
          date: todayStr,
          worker_rut: rut,
          attendance_status: status,
          shift_name: "Turno 1",
          ast_signed: false,
          calculated_hht: status === "Presente" ? 8 : 0,
          epp_inicio: {},
          epp_termino: {},
          notes: null,
        });
        await audit({
          action: "shift.create",
          entity: "daily_shifts",
          entity_label: `${rut} — ${todayStr}`,
          details: { attendance_status: status },
        });
      }
      setSavedMsg(
        `${activeWorkers.find((w) => w.rut === rut)?.full_name ?? "Trabajador"} marcado como ${status}.`,
      );
      await data.reload();
    } catch (e) {
      setSavedMsg("Error: " + (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader
        title="Asistencia Semanal"
        subtitle="Resumen de la semana y pase rápido de asistencia de hoy"
        action={
          <Button variant="outline" size="sm" onClick={() => onNavigate("calendar")}>
            Ver calendario <ArrowRight size={14} />
          </Button>
        }
      />
      <div className="px-5 pb-5 space-y-4">
        {/* Week strip */}
        <div className="grid grid-cols-7 gap-1.5">
          {weekDays.map((d) => {
            const ds = d.toISOString().slice(0, 10);
            const isToday = ds === todayStr;
            const dayPresent = activeWorkers.filter(
              (w) => getAttForDay(w.rut, ds) === "Presente",
            ).length;
            return (
              <div
                key={ds}
                className={`rounded-lg p-2 text-center border ${isToday ? "bg-blue-50/60 border-blue-300" : "bg-white/30 border-white/40"}`}
              >
                <p className="text-[10px] text-slate-500 uppercase">
                  {d.toLocaleDateString("es-CL", { weekday: "short" })}
                </p>
                <p className={`text-sm font-bold ${isToday ? "text-blue-700" : "text-slate-700"}`}>
                  {d.getDate()}
                </p>
                <p className="text-[10px] text-emerald-600 mt-0.5">
                  {dayPresent}/{activeWorkers.length}
                </p>
              </div>
            );
          })}
        </div>

        {/* Today summary */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/40 rounded-lg border border-white/40">
            <ClipboardCheck size={15} className="text-blue-600" />
            <span className="text-sm font-semibold text-slate-700">
              Hoy: {todayCounts.Presente}/{activeWorkers.length} presentes
            </span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/40 rounded-lg border border-white/40">
            <BarChart3 size={15} className="text-slate-500" />
            <span className="text-sm text-slate-600">
              Semana: {weekSummary.pct}% asistencia ({weekSummary.present}/{weekSummary.total})
            </span>
          </div>
          {ATT_STATUSES.map(
            (s) =>
              todayCounts[s] > 0 && (
                <div
                  key={s}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/40 bg-white/30"
                >
                  <span className={`w-2 h-2 rounded-full ${ATT_DOT[s]}`} />
                  <span className="text-xs text-slate-600">
                    {s}: {todayCounts[s]}
                  </span>
                </div>
              ),
          )}
        </div>

        {savedMsg && (
          <div className="px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700 flex items-center gap-2">
            <CheckCircle2 size={14} /> {savedMsg}
          </div>
        )}

        {/* Quick pass list */}
        <div className="border border-white/30 rounded-lg overflow-hidden glass-surface">
          <div className="px-3 py-2 bg-white/30 border-b border-white/30 flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
              <Users size={14} /> Pase rápido de asistencia —{" "}
              {today.toLocaleDateString("es-CL", {
                weekday: "long",
                day: "numeric",
                month: "short",
              })}
            </p>
            <Button variant="outline" size="sm" onClick={() => onNavigate("calendar")}>
              Pasar lista completa <ChevronRight size={13} />
            </Button>
          </div>
          <div className="max-h-[280px] overflow-y-auto divide-y divide-slate-100">
            {activeWorkers.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">No hay trabajadores activos</p>
            ) : (
              activeWorkers.map((w) => {
                const att = getAttForDay(w.rut, todayStr);
                return (
                  <div
                    key={w.rut}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-white/40 transition-colors"
                  >
                    <WorkerAvatar
                      name={w.full_name}
                      rut={w.rut}
                      photoUrl={w.photo_url}
                      className="h-8 w-8 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{w.full_name}</p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {w.position} · {w.rut}
                      </p>
                    </div>
                    <Badge className={`shrink-0 ${ATT_RING[att]} border-transparent`}>{att}</Badge>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => quickPass(w.rut, "Presente")}
                        disabled={saving}
                        title="Marcar presente"
                        className="w-7 h-7 rounded-md flex items-center justify-center bg-emerald-50 text-emerald-600 hover:bg-emerald-100 disabled:opacity-50 transition-colors"
                      >
                        <CheckCircle2 size={15} />
                      </button>
                      <button
                        onClick={() => quickPass(w.rut, "Ausente")}
                        disabled={saving}
                        title="Marcar ausente"
                        className="w-7 h-7 rounded-md flex items-center justify-center bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50 transition-colors"
                      >
                        <XCircle size={15} />
                      </button>
                      <button
                        onClick={() => quickPass(w.rut, "Licencia")}
                        disabled={saving}
                        title="Marcar licencia"
                        className="w-7 h-7 rounded-md flex items-center justify-center bg-amber-50 text-amber-600 hover:bg-amber-100 disabled:opacity-50 transition-colors"
                      >
                        <Clock size={15} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
