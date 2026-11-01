import { useState, useMemo } from "react";
import { Target, Plus, Trash2, FileSpreadsheet, TrendingUp, Save, Calendar } from "lucide-react";
import { Card, Button, Modal, Input, Select, Badge, EmptyState, Textarea } from "@/components/ui";
import { ExportService } from "@/lib/export";
import { objectiveRepo } from "@/lib/repositories";
import { audit } from "@/lib/audit";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/hooks/useConfirm";
import { useLoading } from "@/components/LoadingProvider";
import type { PerformanceObjective, Worker } from "@/lib/types";
import type { AppData } from "@/hooks/useAppData";

interface Props {
  objectives: PerformanceObjective[];
  workers: Worker[];
  workerName: (rut: string) => string;
  data: AppData;
  canDelete?: boolean;
}

export function ObjectivesTab({ objectives, workers, workerName, data, canDelete }: Props) {
  const toast = useToast();
  const { confirm } = useConfirm();
  const { runWithLoading } = useLoading();
  const [modalOpen, setModalOpen] = useState(false);
  const [progressModal, setProgressModal] = useState<PerformanceObjective | null>(null);

  async function addObjective(form: Omit<PerformanceObjective, "id" | "created_at">) {
    try {
      await runWithLoading(async () => {
        await objectiveRepo.insert(form);
        await audit({
          action: "performance.objective_create",
          entity: "performance_objectives",
          entity_label: `${form.title} — ${workerName(form.worker_rut)}`,
        });
        setModalOpen(false);
        toast.success("Objetivo creado", form.title);
        await data.reload();
      });
    } catch (e) {
      toast.error("Error", (e as Error).message);
    }
  }

  async function deleteObjective(o: PerformanceObjective) {
    const ok = await confirm({
      title: "Eliminar objetivo",
      message: `¿Eliminar "${o.title}"?`,
      confirmText: "Eliminar",
      type: "danger",
    });
    if (!ok) return;
    try {
      await runWithLoading(async () => {
        await objectiveRepo.remove(o.id);
        toast.success("Objetivo eliminado");
        await data.reload();
      });
    } catch (e) {
      toast.error("Error", (e as Error).message);
    }
  }

  async function updateProgress(o: PerformanceObjective, progress: number, current: number) {
    const status = progress >= 100 ? "completado" : progress > 0 ? "en_progreso" : o.status;
    try {
      await runWithLoading(async () => {
        await objectiveRepo.update(o.id, { progress, current_value: current, status });
        setProgressModal(null);
        toast.success("Progreso actualizado", o.title);
        await data.reload();
      });
    } catch (e) {
      toast.error("Error", (e as Error).message);
    }
  }

  function exportObj() {
    ExportService.toExcel(
      objectives.map((o) => ({
        Trabajador: workerName(o.worker_rut),
        Título: o.title,
        Tipo: o.type,
        Estado: o.status,
        Prioridad: o.priority,
        Progreso: `${o.progress}%`,
        "Valor Actual": o.current_value,
        "Valor Meta": o.target_value,
        Unidad: o.unit ?? "",
        "Fecha Inicio": o.start_date,
        "Fecha Tope": o.due_date ?? "",
      })),
      "Objetivos",
      "objetivos_desempeno",
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="outline" onClick={exportObj}>
          <FileSpreadsheet size={15} /> Excel
        </Button>
        <Button size="sm" onClick={() => setModalOpen(true)}>
          <Plus size={15} /> Nuevo Objetivo
        </Button>
      </div>

      {objectives.length === 0 ? (
        <Card>
          <EmptyState message="No hay objetivos registrados" icon={<Target size={32} />} />
        </Card>
      ) : (
        <div className="space-y-3">
          {objectives.map((o) => {
            const priorityColor =
              o.priority === "alta"
                ? "bg-red-100 text-red-700 border-red-200"
                : o.priority === "media"
                  ? "bg-amber-100 text-amber-700 border-amber-200"
                  : "bg-slate-100 text-slate-600 border-slate-200";
            const statusColor =
              o.status === "completado"
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : o.status === "en_progreso"
                  ? "bg-blue-50 text-blue-700 border-blue-200"
                  : o.status === "vencido"
                    ? "bg-red-50 text-red-700 border-red-200"
                    : "bg-slate-100 text-slate-600 border-slate-200";
            return (
              <Card key={o.id} className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <Badge className="bg-blue-50 text-blue-700 border-blue-200">{o.type}</Badge>
                      <Badge className={statusColor}>{o.status}</Badge>
                      <Badge className={priorityColor}>{o.priority}</Badge>
                      <span className="text-xs text-slate-500">{workerName(o.worker_rut)}</span>
                    </div>
                    <p className="font-semibold text-slate-800">{o.title}</p>
                    {o.description && (
                      <p className="text-sm text-slate-500 mt-0.5">{o.description}</p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-600">
                      <span>
                        Actual:{" "}
                        <strong>
                          {o.current_value}
                          {o.unit}
                        </strong>{" "}
                        / Meta:{" "}
                        <strong>
                          {o.target_value}
                          {o.unit}
                        </strong>
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Calendar size={12} /> {o.start_date}
                        {o.due_date ? ` → ${o.due_date}` : ""}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="flex-1 max-w-[200px] bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${o.progress >= 100 ? "bg-emerald-500" : o.progress >= 50 ? "bg-blue-500" : "bg-amber-500"}`}
                          style={{ width: `${o.progress}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-slate-600">{o.progress}%</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 self-start">
                    <Button size="sm" variant="ghost" onClick={() => setProgressModal(o)}>
                      <TrendingUp size={14} /> Actualizar
                    </Button>
                    {canDelete && (
                      <button
                        onClick={() => deleteObjective(o)}
                        className="p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 rounded"
                        title="Eliminar"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <ObjectiveModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        workers={workers}
        onCreate={addObjective}
      />
      <ProgressModalComponent
        objective={progressModal}
        onClose={() => setProgressModal(null)}
        onUpdate={updateProgress}
      />
    </div>
  );
}

function ObjectiveModal({
  open,
  onClose,
  workers,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  workers: Worker[];
  onCreate: (form: Omit<PerformanceObjective, "id" | "created_at">) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [workerRut, setWorkerRut] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<PerformanceObjective["type"]>("KPI");
  const [targetValue, setTargetValue] = useState("100");
  const [unit, setUnit] = useState("%");
  const [startDate, setStartDate] = useState(today);
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<PerformanceObjective["priority"]>("media");

  useMemo(() => {
    if (open && workers.length > 0 && !workerRut) setWorkerRut(workers[0].rut);
  }, [open, workers, workerRut]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!workerRut || !title) return;
    onCreate({
      worker_rut: workerRut,
      title,
      description: description || null,
      type,
      target_value: Number(targetValue),
      current_value: 0,
      unit: unit || null,
      start_date: startDate,
      due_date: dueDate || null,
      status: "pendiente",
      priority,
      progress: 0,
    });
    setTitle("");
    setDescription("");
    setDueDate("");
  }

  return (
    <Modal open={open} onClose={onClose} title="Nuevo Objetivo" size="lg">
      <form onSubmit={submit} className="space-y-4">
        <Select label="Trabajador" value={workerRut} onChange={(e) => setWorkerRut(e.target.value)}>
          {workers.map((w) => (
            <option key={w.id} value={w.rut}>
              {w.full_name}
            </option>
          ))}
        </Select>
        <Input
          label="Título"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Cumplir 95% de asistencia"
          required
        />
        <Textarea
          label="Descripción (opcional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
        />
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Tipo"
            value={type}
            onChange={(e) => setType(e.target.value as PerformanceObjective["type"])}
          >
            <option value="KPI">KPI</option>
            <option value="OKR">OKR</option>
            <option value="META">Meta</option>
            <option value="TAREA">Tarea</option>
          </Select>
          <Select
            label="Prioridad"
            value={priority}
            onChange={(e) => setPriority(e.target.value as PerformanceObjective["priority"])}
          >
            <option value="baja">Baja</option>
            <option value="media">Media</option>
            <option value="alta">Alta</option>
          </Select>
          <Input
            label="Valor Meta"
            type="number"
            value={targetValue}
            onChange={(e) => setTargetValue(e.target.value)}
          />
          <Input
            label="Unidad"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="%, unidades, horas"
          />
          <Input
            label="Fecha Inicio"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <Input
            label="Fecha Tope"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">
            <Save size={15} /> Crear Objetivo
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function ProgressModalComponent({
  objective,
  onClose,
  onUpdate,
}: {
  objective: PerformanceObjective | null;
  onClose: () => void;
  onUpdate: (o: PerformanceObjective, progress: number, current: number) => void;
}) {
  const [progress, setProgress] = useState("0");
  const [current, setCurrent] = useState("0");

  useMemo(() => {
    if (objective) {
      setProgress(String(objective.progress));
      setCurrent(String(objective.current_value));
    }
  }, [objective]);

  if (!objective) return null;

  return (
    <Modal
      open={!!objective}
      onClose={onClose}
      title={`Actualizar Progreso — ${objective.title}`}
      size="md"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onUpdate(objective, Number(progress), Number(current));
        }}
        className="space-y-4"
      >
        <Input
          label="Progreso (%)"
          type="number"
          min="0"
          max="100"
          value={progress}
          onChange={(e) => setProgress(e.target.value)}
        />
        <Input
          label={`Valor Actual (${objective.unit ?? ""})`}
          type="number"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">
            <Save size={15} /> Guardar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
