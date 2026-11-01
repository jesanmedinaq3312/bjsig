import { useState, useMemo, useEffect } from "react";
import { Plus, Trash2, FileText, BarChart3, Users, FileType, AlertTriangle } from "lucide-react";
import {
  Card,
  CardHeader,
  Button,
  Modal,
  Input,
  Textarea,
  Badge,
  EmptyState,
  Spinner,
  InfoTooltip,
} from "@/components/ui";
import { BarChart, LineChart } from "@/components/charts";
import { ExportService } from "@/lib/export";
import {
  IndicatorService,
  fetchServerIndicators,
  type ServerIndicatorResult,
} from "@/lib/indicators";
import { cphsRepo } from "@/lib/repositories";
import { audit } from "@/lib/audit";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/hooks/useConfirm";
import { useLoading } from "@/components/LoadingProvider";
import type { CphsMeeting } from "@/lib/types";
import type { AppData } from "@/hooks/useAppData";

export function IndicatorsView({
  data,
  userRole,
  permissions,
}: {
  data: AppData;
  userRole?: string;
  permissions?: Record<string, boolean>;
}) {
  const { incidents, shifts, workers, eppLogs, cphsMeetings, loading } = data;
  const canDelete = userRole === "superadmin" || !!permissions?.can_delete_indicators;
  const [modalOpen, setModalOpen] = useState(false);
  const [manHoursOverride, setManHoursOverride] = useState("");
  const [plannedActivities, setPlannedActivities] = useState("100");
  const [executedActivities, setExecutedActivities] = useState("");
  const [serverIndicators, setServerIndicators] = useState<ServerIndicatorResult | null>(null);
  const toast = useToast();
  const { confirm } = useConfirm();
  const { runWithLoading } = useLoading();

  useEffect(() => {
    fetchServerIndicators().then((r) => setServerIndicators(r));
  }, [data.reload]);

  const planned = Number(plannedActivities) || 100;
  const executed =
    Number(executedActivities) ||
    data.trainings.length + data.astLogs.length + data.eppLogs.length + data.cphsMeetings.length;

  const clientInd = useMemo(
    () => IndicatorService.compute(incidents, shifts, workers, eppLogs, planned, executed),
    [incidents, shifts, workers, eppLogs, planned, executed],
  );

  const ind = serverIndicators ?? clientInd;
  const usingFallback = !serverIndicators;
  const effectiveHours = manHoursOverride ? Number(manHoursOverride) : ind.manHours;

  const tf = IndicatorService.frequency(ind.accidentCTPCount, effectiveHours);
  const tg = IndicatorService.severity(ind.daysLost, ind.daysCharge, effectiveHours);

  const monthlyTrend = useMemo(() => {
    const months: Record<
      string,
      { tf: number; tg: number; acc: number; days: number; hours: number }
    > = {};
    const monthSet = new Set(incidents.map((i) => i.event_date.slice(0, 7)));
    const perMonth = monthSet.size > 0 ? effectiveHours / monthSet.size : effectiveHours;
    incidents.forEach((i) => {
      const m = i.event_date.slice(0, 7);
      if (!months[m]) months[m] = { tf: 0, tg: 0, acc: 0, days: 0, hours: perMonth };
      if (i.type === "Accidente") months[m].acc++;
      months[m].days += i.days_lost;
    });
    return Object.entries(months)
      .sort()
      .map(([m, v]) => {
        const label = new Date(m + "-01").toLocaleDateString("es-CL", { month: "short" });
        return {
          label,
          tf: IndicatorService.frequency(v.acc, v.hours),
          tg: IndicatorService.severity(v.days, 0, v.hours),
        };
      });
  }, [incidents, effectiveHours]);

  async function addMeeting(form: Omit<CphsMeeting, "id" | "created_at">) {
    try {
      await runWithLoading(async () => {
        await cphsRepo.insert(form);
        await audit({
          action: "cphs.create",
          entity: "cphs_meetings",
          entity_label: `${form.meeting_date} — ${form.month_label}`,
        });
        setModalOpen(false);
        toast.success("Acta CPHS creada", form.month_label);
        await data.reload();
      });
    } catch (e) {
      toast.error("Error", (e as Error).message);
    }
  }
  async function delMeeting(m: CphsMeeting) {
    const ok = await confirm({
      title: "Eliminar acta",
      message: `¿Eliminar el acta de ${m.month_label}?`,
      confirmText: "Eliminar",
      type: "danger",
    });
    if (!ok) return;
    try {
      await runWithLoading(async () => {
        await cphsRepo.remove(m.id);
        await audit({
          action: "cphs.delete",
          entity: "cphs_meetings",
          entity_id: m.id,
          entity_label: m.month_label,
        });
        toast.success("Acta eliminada");
        await data.reload();
      });
    } catch (e) {
      toast.error("Error", (e as Error).message);
    }
  }

  function exportPdf() {
    ExportService.toPdf(
      "Indicadores Estadísticos ACHS / SUSESO",
      ["Indicador", "Valor", "Fórmula", "Meta ACHS"],
      [
        ["N° Accidentes Total", String(ind.accidentCount), "Eventos tipo Accidente", "—"],
        ["N° Accidentes CTP", String(ind.accidentCTPCount), "Accidentes con tiempo perdido", "—"],
        ["Días Perdidos", String(ind.daysLost), "Suma días_lost", "—"],
        ["Días de Carga", String(ind.daysCharge), "Suma días_charge", "—"],
        ["Horas Hombre (HHT)", effectiveHours.toLocaleString("es-CL"), "Σ(activos×h×días)", "—"],
        ["Tasa Frecuencia (TF)", tf.toFixed(2), "(CTP×1.000.000)/HHT", "< 5.0"],
        ["Tasa Gravedad (TG)", tg.toFixed(2), "((Días+DíasCarga)×1.000.000)/HHT", "< 50.0"],
        ["Índice Accidentabilidad (IA)", ind.ia.toFixed(2) + "%", "(Accidentes×100)/Dotación", "—"],
        ["Cumplimiento DS44", ind.cumplimientoDS44.toFixed(1) + "%", "(Ejec/Prog)×100", "> 90%"],
        ["Cobertura EPP", ind.coberturaEpp.toFixed(1) + "%", "(EPPvigente/Total)×100", "100%"],
      ],
      "indicadores_achs_gyc",
      "DS 44 · Ley 16.744 · Metodología ACHS/SUSESO",
    );
  }

  async function exportWord() {
    await ExportService.toWord(
      "Reporte Ejecutivo de Indicadores de Prevención de Riesgos",
      "Período de evaluación · ACHS / SUSESO · DS 44 · Ley 16.744",
      [
        {
          heading: "Resumen Ejecutivo",
          paragraphs: [
            `Durante el período evaluado se registraron ${ind.accidentCount} accidentes en total, de los cuales ${ind.accidentCTPCount} fueron accidentes con tiempo perdido (CTP). Las horas hombre trabajadas (HHT) alcanzaron ${effectiveHours.toLocaleString("es-CL")} horas.`,
            `La Tasa de Frecuencia (TF) es de ${tf.toFixed(2)}, ${tf < 5 ? "cumpliendo" : "NO cumpliendo"} la meta ACHS de < 5.0.`,
            `La Tasa de Gravedad (TG) es de ${tg.toFixed(2)}, considerando ${ind.daysLost} días perdidos y ${ind.daysCharge} días de carga.`,
            `El Índice de Accidentabilidad (IA) es de ${ind.ia.toFixed(2)}%, el Cumplimiento DS44 de ${ind.cumplimientoDS44.toFixed(1)}% y la Cobertura de EPP de ${ind.coberturaEpp.toFixed(1)}%.`,
          ],
        },
        {
          heading: "Metodología de Cálculo",
          paragraphs: [
            "TF = (N° Accidentes CTP × 1.000.000) / HHT — Tasa de Frecuencia según metodología ACHS/SUSESO.",
            "TG = ((Días Perdidos + Días Carga) × 1.000.000) / HHT — Tasa de Gravedad.",
            "IA = (N° Accidentes Total × 100) / Dotación Promedio — Índice de Accidentabilidad.",
            "Cumplimiento DS44 = (Actividades Ejecutadas / Actividades Programadas) × 100.",
            "Cobertura EPP = (Trabajadores con EPP Vigente y Firmado / Total Activos) × 100.",
          ],
        },
        {
          heading: "Recomendaciones",
          paragraphs: [
            "Mantener HHT actualizado mensualmente para precisión de indicadores.",
            "Verificar que todo accidente CTP sea notificado inmediatamente a la ACHS con DIAT/DIEP.",
            "Asegurar 100% de cobertura de EPP con firma digital del trabajador (DS 594 / DS 18).",
          ],
        },
      ],
      {
        headers: ["Indicador", "Valor", "Meta ACHS"],
        rows: [
          ["TF (Tasa Frecuencia)", tf.toFixed(2), "< 5.0"],
          ["TG (Tasa Gravedad)", tg.toFixed(2), "< 50.0"],
          ["IA (Índice Accidentabilidad)", ind.ia.toFixed(2) + "%", "—"],
          ["Cumplimiento DS44", ind.cumplimientoDS44.toFixed(1) + "%", "> 90%"],
          ["Cobertura EPP", ind.coberturaEpp.toFixed(1) + "%", "100%"],
        ],
      },
      "reporte_indicadores_achs_gyc",
    );
  }

  if (loading) return <Spinner />;

  const kpiCards = [
    {
      label: "Tasa de Frecuencia (TF)",
      value: tf.toFixed(2),
      formula: "(CTP × 1M) / HHT",
      meta: "< 5.0",
      tone: tf < 5 ? "text-emerald-600" : "text-red-600",
      tip: "Tasa de Frecuencia exige HHT real del mes. Meta ACHS: < 5.0.",
    },
    {
      label: "Tasa de Gravedad (TG)",
      value: tg.toFixed(2),
      formula: "((Días+DíasCarga) × 1M) / HHT",
      meta: "< 50.0",
      tone: tg < 50 ? "text-emerald-600" : "text-red-600",
      tip: "Tasa de Gravedad: días de incapacidad por millón de horas trabajadas. Meta ACHS: < 50.",
    },
    {
      label: "Índice Accidentabilidad (IA)",
      value: ind.ia.toFixed(2) + "%",
      formula: "(Accidentes × 100) / Dotación",
      meta: "—",
      tone: "text-blue-600",
      tip: "Porcentaje de trabajadores siniestrados en el período.",
    },
    {
      label: "Cumplimiento DS44",
      value: ind.cumplimientoDS44.toFixed(1) + "%",
      formula: "(Ejec / Prog) × 100",
      meta: "> 90%",
      tone: ind.cumplimientoDS44 >= 90 ? "text-emerald-600" : "text-amber-600",
      tip: "Nivel de cumplimiento del Plan Anual de Prevención de Riesgos (DS 44).",
    },
    {
      label: "Cobertura EPP",
      value: ind.coberturaEpp.toFixed(1) + "%",
      formula: "(EPPvigente / Total) × 100",
      meta: "100%",
      tone: ind.coberturaEpp >= 100 ? "text-emerald-600" : "text-red-600",
      tip: "Tasa de cobertura legal de equipos de protección personal (DS 594 / DS 18).",
    },
    {
      label: "Horas Hombre (HHT)",
      value: effectiveHours.toLocaleString("es-CL"),
      formula: "Σ(activos × h × días)",
      meta: "—",
      tone: "text-slate-700",
      tip: "HHT = Suma de (Trabajadores Activos por Turno × Horas Diarias × Días Trabajados del Mes).",
    },
  ];

  return (
    <div className="space-y-5">
      {usingFallback && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-300 bg-amber-50">
          <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Cálculo de respaldo (cliente)</p>
            <p className="text-xs text-amber-700 mt-0.5">
              No se pudieron obtener los indicadores desde el servidor. Las cifras mostradas se
              calculan en el navegador sobre datos limitados y pueden ser incompletas. Contacta al
              administrador para verificar el funcionamiento del RPC{" "}
              <code className="font-mono">compute_indicators</code>.
            </p>
          </div>
        </div>
      )}
      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpiCards.map((k) => (
          <Card key={k.label} className="p-4">
            <div className="flex items-start justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <BarChart3 size={18} className="text-slate-400" />
                <span className="text-xs text-slate-500">{k.label}</span>
                <InfoTooltip text={k.tip} />
              </div>
              {k.meta !== "—" && (
                <Badge className="bg-slate-100 text-slate-500 border-slate-200">
                  Meta: {k.meta}
                </Badge>
              )}
            </div>
            <p className={`text-2xl font-bold ${k.tone}`}>{k.value}</p>
            <p className="text-[10px] text-slate-400 mt-1 font-mono">{k.formula}</p>
          </Card>
        ))}
      </div>

      {/* Calculator panel */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 size={20} className="text-blue-600" />
          <h3 className="font-semibold text-slate-800">Motor de Cálculo ACHS/SUSESO</h3>
          <InfoTooltip text="Ajusta las Horas Hombre Trabajadas (HHT) reales del mes y las actividades programadas/ejecutadas para un cálculo preciso de los indicadores." />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Input
            label="HHT del período"
            type="number"
            value={manHoursOverride}
            onChange={(e) => setManHoursOverride(e.target.value)}
            placeholder={String(ind.manHours)}
          />
          <Input
            label="Actividades Programadas DS44"
            type="number"
            value={plannedActivities}
            onChange={(e) => setPlannedActivities(e.target.value)}
          />
          <Input
            label="Actividades Ejecutadas DS44"
            type="number"
            value={executedActivities}
            onChange={(e) => setExecutedActivities(e.target.value)}
            placeholder={String(executed)}
          />
          <div className="flex items-end gap-2">
            <Button variant="outline" size="sm" onClick={exportPdf}>
              <FileText size={15} /> PDF
            </Button>
            <Button variant="outline" size="sm" onClick={exportWord}>
              <FileType size={15} /> Word
            </Button>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <MiniStat label="Accidentes CTP" value={String(ind.accidentCTPCount)} />
          <MiniStat label="Días Perdidos" value={String(ind.daysLost)} />
          <MiniStat label="Días de Carga" value={String(ind.daysCharge)} />
          <MiniStat
            label="Dotación Activa"
            value={String(workers.filter((w) => w.status === "ACTIVO").length)}
          />
        </div>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="p-5">
          <h3 className="font-semibold text-slate-800 mb-3">Tendencia Tasa de Frecuencia</h3>
          <LineChart
            data={monthlyTrend.map((m) => ({ label: m.label, value: m.tf }))}
            height={200}
            color="#1e40af"
          />
        </Card>
        <Card className="p-5">
          <h3 className="font-semibold text-slate-800 mb-3">Tendencia Tasa de Gravedad</h3>
          <BarChart
            data={monthlyTrend.map((m) => ({ label: m.label, value: m.tg }))}
            height={200}
            color="#7c3aed"
          />
        </Card>
      </div>

      {/* CPHS */}
      <Card>
        <CardHeader
          title="Actas del CPHS"
          subtitle="Comité Paritario de Higiene y Seguridad — obligatorio para más de 25 trabajadores"
          action={
            <Button size="sm" onClick={() => setModalOpen(true)}>
              <Plus size={15} /> Nueva Acta
            </Button>
          }
        />
        {cphsMeetings.length === 0 ? (
          <EmptyState message="No hay actas CPHS registradas" icon={<Users size={32} />} />
        ) : (
          <div className="divide-y divide-slate-100">
            {cphsMeetings.map((m) => (
              <div
                key={m.id}
                className="px-5 py-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3"
              >
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                      {m.meeting_date}
                    </Badge>
                    <Badge className="bg-slate-100 text-slate-600 border-slate-200">
                      {m.month_label}
                    </Badge>
                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                      {m.attendees_count} asistentes
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-700">
                    <span className="font-medium">Temas:</span> {m.topics}
                  </p>
                  {m.agreements && (
                    <p className="text-sm text-slate-600 mt-1">
                      <span className="font-medium">Acuerdos:</span> {m.agreements}
                    </p>
                  )}
                </div>
                {canDelete && (
                  <button
                    onClick={() => delMeeting(m)}
                    className="p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 rounded self-start"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {modalOpen && <CphsModal onClose={() => setModalOpen(false)} onSave={addMeeting} />}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-50 rounded-lg p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-lg font-bold text-slate-800">{value}</p>
    </div>
  );
}

function CphsModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (f: Omit<CphsMeeting, "id" | "created_at">) => void;
}) {
  const [form, setForm] = useState({
    meeting_date: new Date().toISOString().slice(0, 10),
    month_label: new Date().toLocaleDateString("es-CL", { month: "long", year: "numeric" }),
    attendees_count: "8",
    topics: "",
    agreements: "",
  });
  return (
    <Modal open onClose={onClose} title="Nueva Acta CPHS">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave({
            meeting_date: form.meeting_date,
            month_label: form.month_label,
            attendees_count: Number(form.attendees_count),
            topics: form.topics,
            agreements: form.agreements || null,
          });
        }}
        className="space-y-4"
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Fecha Reunión"
            type="date"
            required
            value={form.meeting_date}
            onChange={(e) => setForm({ ...form, meeting_date: e.target.value })}
          />
          <Input
            label="Mes (etiqueta)"
            required
            value={form.month_label}
            onChange={(e) => setForm({ ...form, month_label: e.target.value })}
          />
          <Input
            label="N° Asistentes"
            type="number"
            min="0"
            required
            value={form.attendees_count}
            onChange={(e) => setForm({ ...form, attendees_count: e.target.value })}
          />
        </div>
        <Textarea
          label="Temas Tratados"
          required
          rows={2}
          value={form.topics}
          onChange={(e) => setForm({ ...form, topics: e.target.value })}
        />
        <Textarea
          label="Acuerdos"
          rows={2}
          value={form.agreements}
          onChange={(e) => setForm({ ...form, agreements: e.target.value })}
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">Guardar</Button>
        </div>
      </form>
    </Modal>
  );
}
