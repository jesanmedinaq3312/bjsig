import { useState, useMemo } from "react";
import { Star, Plus, Trash2, FileSpreadsheet, Save, ThumbsUp, Lightbulb } from "lucide-react";
import { Card, Button, Modal, Input, Select, Badge, EmptyState, Textarea } from "@/components/ui";
import { ExportService } from "@/lib/export";
import { evaluationRepo } from "@/lib/repositories";
import { audit } from "@/lib/audit";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/hooks/useConfirm";
import { useLoading } from "@/components/LoadingProvider";
import type { PerformanceEvaluation, Worker } from "@/lib/types";
import type { AppData } from "@/hooks/useAppData";

interface Props {
  evaluations: PerformanceEvaluation[];
  workers: Worker[];
  workerName: (rut: string) => string;
  data: AppData;
  canDelete?: boolean;
}

function scoreColor(score: number) {
  if (score >= 6) return "text-emerald-600";
  if (score >= 4) return "text-amber-600";
  return "text-red-600";
}

export function EvaluationsTab({ evaluations, workers, workerName, data, canDelete }: Props) {
  const toast = useToast();
  const { confirm } = useConfirm();
  const { runWithLoading } = useLoading();
  const [modalOpen, setModalOpen] = useState(false);
  const [detailEval, setDetailEval] = useState<PerformanceEvaluation | null>(null);

  async function addEvaluation(form: Omit<PerformanceEvaluation, "id" | "created_at">) {
    try {
      await runWithLoading(async () => {
        await evaluationRepo.insert(form);
        await audit({
          action: "performance.evaluation_create",
          entity: "performance_evaluations",
          entity_label: `${workerName(form.worker_rut)} — ${form.evaluation_date}`,
        });
        setModalOpen(false);
        toast.success("Evaluación creada");
        await data.reload();
      });
    } catch (e) {
      toast.error("Error", (e as Error).message);
    }
  }

  async function deleteEvaluation(ev: PerformanceEvaluation) {
    const ok = await confirm({
      title: "Eliminar evaluación",
      message: "¿Eliminar esta evaluación?",
      confirmText: "Eliminar",
      type: "danger",
    });
    if (!ok) return;
    try {
      await runWithLoading(async () => {
        await evaluationRepo.remove(ev.id);
        toast.success("Evaluación eliminada");
        await data.reload();
      });
    } catch (e) {
      toast.error("Error", (e as Error).message);
    }
  }

  function exportEval() {
    ExportService.toExcel(
      evaluations.map((e) => ({
        Trabajador: workerName(e.worker_rut),
        Fecha: e.evaluation_date,
        Período: e.period_label ?? "",
        Evaluador: e.evaluator ?? "",
        Nota: e.score,
        Estado: e.status,
        Resumen: e.summary ?? "",
      })),
      "Evaluaciones",
      "evaluaciones_desempeno",
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="outline" onClick={exportEval}>
          <FileSpreadsheet size={15} /> Excel
        </Button>
        <Button size="sm" onClick={() => setModalOpen(true)}>
          <Plus size={15} /> Nueva Evaluación
        </Button>
      </div>

      {evaluations.length === 0 ? (
        <Card>
          <EmptyState message="No hay evaluaciones registradas" icon={<Star size={32} />} />
        </Card>
      ) : (
        <div className="space-y-3">
          {evaluations.map((e) => (
            <Card key={e.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-semibold text-slate-800">{workerName(e.worker_rut)}</span>
                    <Badge className="bg-slate-100 text-slate-600 border-slate-200">
                      {e.evaluation_date}
                    </Badge>
                    {e.period_label && (
                      <Badge className="bg-blue-50 text-blue-700 border-blue-200">
                        {e.period_label}
                      </Badge>
                    )}
                    <Badge className="bg-slate-100 text-slate-600 border-slate-200">
                      {e.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <span className={`text-3xl font-bold ${scoreColor(Number(e.score))}`}>
                      {Number(e.score).toFixed(1)}
                    </span>
                    <span className="text-xs text-slate-400">/ 7.0</span>
                    {e.evaluator && (
                      <span className="text-xs text-slate-500 ml-2">Evaluador: {e.evaluator}</span>
                    )}
                  </div>
                  {e.summary && <p className="text-sm text-slate-500 mt-2">{e.summary}</p>}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setDetailEval(e)}
                    className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded font-medium"
                  >
                    Ver detalle
                  </button>
                  {canDelete && (
                    <button
                      onClick={() => deleteEvaluation(e)}
                      className="p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 rounded"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <EvaluationModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        workers={workers}
        onCreate={addEvaluation}
      />
      <Modal
        open={!!detailEval}
        onClose={() => setDetailEval(null)}
        title={`Evaluación — ${detailEval ? workerName(detailEval.worker_rut) : ""}`}
        size="lg"
      >
        {detailEval && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className={`text-4xl font-bold ${scoreColor(Number(detailEval.score))}`}>
                {Number(detailEval.score).toFixed(1)}
              </span>
              <div>
                <p className="text-sm text-slate-500">
                  {detailEval.evaluation_date} · {detailEval.period_label}
                </p>
                <p className="text-xs text-slate-400">Evaluador: {detailEval.evaluator ?? "—"}</p>
              </div>
            </div>
            {detailEval.strengths && (
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
                  <ThumbsUp size={12} className="text-emerald-600" /> Fortalezas
                </p>
                <p className="text-sm text-slate-700">{detailEval.strengths}</p>
              </div>
            )}
            {detailEval.improvements && (
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
                  <Lightbulb size={12} className="text-amber-600" /> Áreas de Mejora
                </p>
                <p className="text-sm text-slate-700">{detailEval.improvements}</p>
              </div>
            )}
            {detailEval.summary && (
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-1">Resumen</p>
                <p className="text-sm text-slate-700">{detailEval.summary}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

function EvaluationModal({
  open,
  onClose,
  workers,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  workers: Worker[];
  onCreate: (form: Omit<PerformanceEvaluation, "id" | "created_at">) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [workerRut, setWorkerRut] = useState("");
  const [evalDate, setEvalDate] = useState(today);
  const [periodLabel, setPeriodLabel] = useState("");
  const [evaluator, setEvaluator] = useState("");
  const [score, setScore] = useState("5.0");
  const [strengths, setStrengths] = useState("");
  const [improvements, setImprovements] = useState("");
  const [summary, setSummary] = useState("");

  useMemo(() => {
    if (open && workers.length > 0 && !workerRut) setWorkerRut(workers[0].rut);
  }, [open, workers, workerRut]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!workerRut) return;
    onCreate({
      worker_rut: workerRut,
      evaluation_date: evalDate,
      period_label: periodLabel || null,
      evaluator: evaluator || null,
      score: Number(score),
      categories: null,
      strengths: strengths || null,
      improvements: improvements || null,
      summary: summary || null,
      status: "completada",
    });
    setStrengths("");
    setImprovements("");
    setSummary("");
    setPeriodLabel("");
    setEvaluator("");
  }

  return (
    <Modal open={open} onClose={onClose} title="Nueva Evaluación de Desempeño" size="lg">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Trabajador"
            value={workerRut}
            onChange={(e) => setWorkerRut(e.target.value)}
          >
            {workers.map((w) => (
              <option key={w.id} value={w.rut}>
                {w.full_name}
              </option>
            ))}
          </Select>
          <Input
            label="Fecha"
            type="date"
            value={evalDate}
            onChange={(e) => setEvalDate(e.target.value)}
            required
          />
          <Input
            label="Período (ej: Q3 2026)"
            value={periodLabel}
            onChange={(e) => setPeriodLabel(e.target.value)}
          />
          <Input
            label="Evaluador"
            value={evaluator}
            onChange={(e) => setEvaluator(e.target.value)}
            placeholder="Nombre del evaluador"
          />
        </div>
        <Input
          label="Nota (1.0 - 7.0)"
          type="number"
          step="0.1"
          min="1"
          max="7"
          value={score}
          onChange={(e) => setScore(e.target.value)}
        />
        <Textarea
          label="Fortalezas"
          value={strengths}
          onChange={(e) => setStrengths(e.target.value)}
          rows={2}
        />
        <Textarea
          label="Áreas de Mejora"
          value={improvements}
          onChange={(e) => setImprovements(e.target.value)}
          rows={2}
        />
        <Textarea
          label="Resumen"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          rows={2}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">
            <Save size={15} /> Crear Evaluación
          </Button>
        </div>
      </form>
    </Modal>
  );
}
