import { useState, useMemo } from "react";
import { Plus, Trash2, FileSpreadsheet, AlertTriangle, Shield } from "lucide-react";
import {
  Card,
  CardHeader,
  Button,
  Modal,
  Input,
  Select,
  Badge,
  EmptyState,
  Spinner,
  Textarea,
} from "@/components/ui";
import { ExportService } from "@/lib/export";
import { iperEntryRepo } from "@/lib/repositories";
import { audit } from "@/lib/audit";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/hooks/useConfirm";
import { useLoading } from "@/components/LoadingProvider";
import type { IperEntry, IperRiskLevel } from "@/lib/types";
import type { AppData } from "@/hooks/useAppData";

const RISK_LEVELS: IperRiskLevel[] = [
  "trivial",
  "tolerable",
  "moderado",
  "importante",
  "intolerable",
];

const RISK_META: Record<IperRiskLevel, { label: string; cls: string }> = {
  trivial: { label: "Trivial", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  tolerable: { label: "Tolerable", cls: "bg-lime-100 text-lime-700 border-lime-200" },
  moderado: { label: "Moderado", cls: "bg-amber-100 text-amber-700 border-amber-200" },
  importante: { label: "Importante", cls: "bg-orange-100 text-orange-700 border-orange-200" },
  intolerable: { label: "Intolerable", cls: "bg-red-100 text-red-700 border-red-200" },
};

function calcRiskLevel(prob: number, sev: number): IperRiskLevel {
  const score = prob * sev;
  if (score <= 2) return "trivial";
  if (score <= 6) return "tolerable";
  if (score <= 12) return "moderado";
  if (score <= 20) return "importante";
  return "intolerable";
}

export function IperMatrixView({
  data,
  userRole,
  permissions,
}: {
  data: AppData;
  userRole?: string;
  permissions?: Record<string, boolean>;
}) {
  const { iperEntries, loading } = data;
  const canDelete = userRole === "superadmin" || !!permissions?.can_delete_iper;
  const toast = useToast();
  const { confirm } = useConfirm();
  const { runWithLoading } = useLoading();
  const [modalOpen, setModalOpen] = useState(false);
  const [filterArea, setFilterArea] = useState("all");
  const [filterRisk, setFilterRisk] = useState("all");

  const areas = useMemo(() => Array.from(new Set(iperEntries.map((e) => e.area))), [iperEntries]);

  const filtered = useMemo(() => {
    return iperEntries.filter((e) => {
      if (filterArea !== "all" && e.area !== filterArea) return false;
      if (filterRisk !== "all" && e.risk_level !== filterRisk) return false;
      return true;
    });
  }, [iperEntries, filterArea, filterRisk]);

  const riskCounts = useMemo(() => {
    const counts: Record<IperRiskLevel, number> = {
      trivial: 0,
      tolerable: 0,
      moderado: 0,
      importante: 0,
      intolerable: 0,
    };
    iperEntries.forEach((e) => {
      counts[e.risk_level]++;
    });
    return counts;
  }, [iperEntries]);

  async function addEntry(
    form: Omit<IperEntry, "id" | "created_at" | "risk_level" | "residual_risk_level">,
  ) {
    const riskLevel = calcRiskLevel(form.probability, form.severity);
    try {
      await runWithLoading(async () => {
        await iperEntryRepo.insert({
          ...form,
          risk_level: riskLevel,
          residual_risk_level: riskLevel,
        });
        await audit({
          action: "iper.create",
          entity: "iper_entries",
          entity_label: `${form.area} — ${form.activity}`,
        });
        setModalOpen(false);
        toast.success("Entrada IPER creada", `${form.area} — ${form.activity}`);
        await data.reload();
      });
    } catch (e) {
      toast.error("Error", (e as Error).message);
    }
  }

  async function delEntry(e: IperEntry) {
    const ok = await confirm({
      title: "Eliminar entrada IPER",
      message: `¿Eliminar la evaluación de riesgo para "${e.activity}" en ${e.area}?`,
      confirmText: "Eliminar",
      type: "danger",
    });
    if (!ok) return;
    try {
      await runWithLoading(async () => {
        await iperEntryRepo.remove(e.id);
        await audit({ action: "iper.delete", entity: "iper_entries", entity_id: e.id });
        toast.success("Entrada eliminada");
        await data.reload();
      });
    } catch (e2) {
      toast.error("Error", (e2 as Error).message);
    }
  }

  function exportExcel() {
    ExportService.toExcel(
      filtered.map((e) => ({
        Área: e.area,
        Actividad: e.activity,
        Peligro: e.hazard,
        "Descripción del Riesgo": e.risk_description,
        Probabilidad: e.probability,
        Severidad: e.severity,
        "Nivel de Riesgo": RISK_META[e.risk_level].label,
        "Medidas de Control": e.control_measures,
        "Riesgo Residual": RISK_META[e.residual_risk_level].label,
        Responsable: e.responsible ?? "",
        "Fecha Revisión": e.review_date ?? "",
      })),
      "Matriz IPER",
      "matriz_iper_gyc",
    );
  }

  if (loading) return <Spinner />;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {(Object.keys(riskCounts) as IperRiskLevel[]).map((level) => (
          <Card key={level} className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle
                size={14}
                className={
                  RISK_META[level].cls.includes("emerald")
                    ? "text-emerald-600"
                    : RISK_META[level].cls.includes("lime")
                      ? "text-lime-600"
                      : RISK_META[level].cls.includes("amber")
                        ? "text-amber-600"
                        : RISK_META[level].cls.includes("orange")
                          ? "text-orange-600"
                          : "text-red-600"
                }
              />
              <span className="text-xs text-slate-500">{RISK_META[level].label}</span>
            </div>
            <p className="text-xl font-bold text-slate-800">{riskCounts[level]}</p>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap justify-between items-center gap-2">
        <div className="flex flex-wrap gap-2">
          <Select
            value={filterArea}
            onChange={(e) => setFilterArea(e.target.value)}
            className="w-auto"
          >
            <option value="all">Todas las áreas</option>
            {areas.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </Select>
          <Select
            value={filterRisk}
            onChange={(e) => setFilterRisk(e.target.value)}
            className="w-auto"
          >
            <option value="all">Todos los niveles</option>
            {RISK_LEVELS.map((r) => (
              <option key={r} value={r}>
                {RISK_META[r].label}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportExcel}>
            <FileSpreadsheet size={15} /> Excel
          </Button>
          <Button size="sm" onClick={() => setModalOpen(true)}>
            <Plus size={15} /> Nueva Evaluación
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader
          title="Matriz IPER"
          subtitle="Identificación de Peligros y Evaluación de Riesgos — metodología probabilidad × severidad"
        />
        {filtered.length === 0 ? (
          <EmptyState
            message="No hay evaluaciones de riesgo que coincidan con el filtro"
            icon={<Shield size={32} />}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
                  <th className="pb-2 pr-4">Área</th>
                  <th className="pb-2 pr-4">Actividad</th>
                  <th className="pb-2 pr-4">Peligro</th>
                  <th className="pb-2 pr-4 text-center">Prob</th>
                  <th className="pb-2 pr-4 text-center">Sev</th>
                  <th className="pb-2 pr-4">Nivel Riesgo</th>
                  <th className="pb-2 pr-4">Riesgo Residual</th>
                  <th className="pb-2 pr-4">Responsable</th>
                  <th className="pb-2 pr-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 pr-4 font-medium text-slate-700">{e.area}</td>
                    <td className="py-2.5 pr-4">{e.activity}</td>
                    <td className="py-2.5 pr-4 text-slate-500">{e.hazard}</td>
                    <td className="py-2.5 pr-4 text-center">{e.probability}</td>
                    <td className="py-2.5 pr-4 text-center">{e.severity}</td>
                    <td className="py-2.5 pr-4">
                      <Badge className={RISK_META[e.risk_level].cls}>
                        {RISK_META[e.risk_level].label}
                      </Badge>
                    </td>
                    <td className="py-2.5 pr-4">
                      <Badge className={RISK_META[e.residual_risk_level].cls}>
                        {RISK_META[e.residual_risk_level].label}
                      </Badge>
                    </td>
                    <td className="py-2.5 pr-4 text-slate-500">{e.responsible ?? "—"}</td>
                    <td className="py-2.5 pr-4">
                      {canDelete && (
                        <button
                          onClick={() => delEntry(e)}
                          className="p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 rounded"
                          title="Eliminar"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <IperModal open={modalOpen} onClose={() => setModalOpen(false)} onSave={addEntry} />
    </div>
  );
}

function IperModal({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (
    form: Omit<IperEntry, "id" | "created_at" | "risk_level" | "residual_risk_level">,
  ) => void;
}) {
  const [area, setArea] = useState("");
  const [activity, setActivity] = useState("");
  const [hazard, setHazard] = useState("");
  const [riskDesc, setRiskDesc] = useState("");
  const [probability, setProbability] = useState(1);
  const [severity, setSeverity] = useState(1);
  const [controlMeasures, setControlMeasures] = useState("");
  const [responsible, setResponsible] = useState("");
  const [reviewDate, setReviewDate] = useState("");

  const previewLevel = calcRiskLevel(probability, severity);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!area || !activity || !hazard) return;
    onSave({
      area,
      activity,
      hazard,
      risk_description: riskDesc,
      probability,
      severity,
      control_measures: controlMeasures,
      responsible: responsible || null,
      review_date: reviewDate || null,
    });
    setArea("");
    setActivity("");
    setHazard("");
    setRiskDesc("");
    setProbability(1);
    setSeverity(1);
    setControlMeasures("");
    setResponsible("");
    setReviewDate("");
  }

  return (
    <Modal open={open} onClose={onClose} title="Nueva Evaluación IPER" size="lg">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Área"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            placeholder="Ej: Terreno"
            required
          />
          <Input
            label="Actividad"
            value={activity}
            onChange={(e) => setActivity(e.target.value)}
            placeholder="Ej: Trabajo en altura"
            required
          />
        </div>
        <Input
          label="Peligro"
          value={hazard}
          onChange={(e) => setHazard(e.target.value)}
          placeholder="Ej: Caída a distinto nivel"
          required
        />
        <Textarea
          label="Descripción del Riesgo"
          value={riskDesc}
          onChange={(e) => setRiskDesc(e.target.value)}
          rows={2}
        />
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Probabilidad (1-5)"
            value={probability}
            onChange={(e) => setProbability(Number(e.target.value))}
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </Select>
          <Select
            label="Severidad (1-5)"
            value={severity}
            onChange={(e) => setSeverity(Number(e.target.value))}
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </Select>
        </div>
        <div className="bg-slate-50 rounded-lg p-3 flex items-center justify-between">
          <span className="text-sm text-slate-500">Nivel de Riesgo Calculado:</span>
          <Badge className={RISK_META[previewLevel].cls}>
            {RISK_META[previewLevel].label} (P×S = {probability * severity})
          </Badge>
        </div>
        <Textarea
          label="Medidas de Control"
          value={controlMeasures}
          onChange={(e) => setControlMeasures(e.target.value)}
          rows={3}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Responsable (opcional)"
            value={responsible}
            onChange={(e) => setResponsible(e.target.value)}
          />
          <Input
            label="Fecha de Revisión (opcional)"
            type="date"
            value={reviewDate}
            onChange={(e) => setReviewDate(e.target.value)}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" size="sm">
            Crear Evaluación
          </Button>
        </div>
      </form>
    </Modal>
  );
}
