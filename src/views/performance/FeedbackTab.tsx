import { useState, useMemo } from "react";
import {
  MessageSquare,
  Plus,
  Trash2,
  Save,
  ThumbsUp,
  Lightbulb,
  AlertTriangle,
} from "lucide-react";
import { Card, Button, Modal, Input, Select, Badge, EmptyState, Textarea } from "@/components/ui";
import { feedbackRepo } from "@/lib/repositories";
import { audit } from "@/lib/audit";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/hooks/useConfirm";
import { useLoading } from "@/components/LoadingProvider";
import type { PerformanceFeedback, Worker } from "@/lib/types";
import type { AppData } from "@/hooks/useAppData";

interface Props {
  feedback: PerformanceFeedback[];
  workers: Worker[];
  workerName: (rut: string) => string;
  data: AppData;
  canDelete?: boolean;
}

function typeIcon(type: string) {
  if (type === "positivo") return <ThumbsUp size={14} className="text-emerald-600" />;
  if (type === "constructivo") return <Lightbulb size={14} className="text-amber-600" />;
  return <AlertTriangle size={14} className="text-red-600" />;
}

function typeColor(type: string) {
  if (type === "positivo") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (type === "constructivo") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-red-50 text-red-700 border-red-200";
}

export function FeedbackTab({ feedback, workers, workerName, data, canDelete }: Props) {
  const toast = useToast();
  const { confirm } = useConfirm();
  const { runWithLoading } = useLoading();
  const [modalOpen, setModalOpen] = useState(false);

  async function addFeedback(form: Omit<PerformanceFeedback, "id" | "created_at">) {
    try {
      await runWithLoading(async () => {
        await feedbackRepo.insert(form);
        await audit({
          action: "performance.feedback_create",
          entity: "performance_feedback",
          entity_label: `${workerName(form.worker_rut)} — ${form.feedback_date}`,
        });
        setModalOpen(false);
        toast.success("Feedback registrado");
        await data.reload();
      });
    } catch (e) {
      toast.error("Error", (e as Error).message);
    }
  }

  async function deleteFeedback(f: PerformanceFeedback) {
    const ok = await confirm({
      title: "Eliminar feedback",
      message: "¿Eliminar este registro de feedback?",
      confirmText: "Eliminar",
      type: "danger",
    });
    if (!ok) return;
    try {
      await runWithLoading(async () => {
        await feedbackRepo.remove(f.id);
        toast.success("Feedback eliminado");
        await data.reload();
      });
    } catch (e) {
      toast.error("Error", (e as Error).message);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setModalOpen(true)}>
          <Plus size={15} /> Nuevo Feedback
        </Button>
      </div>

      {feedback.length === 0 ? (
        <Card>
          <EmptyState message="No hay registros de feedback" icon={<MessageSquare size={32} />} />
        </Card>
      ) : (
        <div className="space-y-3">
          {feedback.map((f) => (
            <Card key={f.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <Badge className={typeColor(f.type)}>
                      {typeIcon(f.type)} {f.type}
                    </Badge>
                    <span className="font-semibold text-slate-800">{workerName(f.worker_rut)}</span>
                    <span className="text-xs text-slate-500">{f.feedback_date}</span>
                    {f.author && <span className="text-xs text-slate-400">· por {f.author}</span>}
                  </div>
                  <p className="text-sm text-slate-700">{f.content}</p>
                  {f.action_items && (
                    <p className="text-xs text-slate-500 mt-2 bg-slate-50 rounded p-2">
                      <strong>Acciones:</strong> {f.action_items}
                    </p>
                  )}
                </div>
                {canDelete && (
                  <button
                    onClick={() => deleteFeedback(f)}
                    className="p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 rounded"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <FeedbackModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        workers={workers}
        onCreate={addFeedback}
      />
    </div>
  );
}

function FeedbackModal({
  open,
  onClose,
  workers,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  workers: Worker[];
  onCreate: (form: Omit<PerformanceFeedback, "id" | "created_at">) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [workerRut, setWorkerRut] = useState("");
  const [feedbackDate, setFeedbackDate] = useState(today);
  const [type, setType] = useState<PerformanceFeedback["type"]>("positivo");
  const [author, setAuthor] = useState("");
  const [content, setContent] = useState("");
  const [actionItems, setActionItems] = useState("");

  useMemo(() => {
    if (open && workers.length > 0 && !workerRut) setWorkerRut(workers[0].rut);
  }, [open, workers, workerRut]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!workerRut || !content) return;
    onCreate({
      worker_rut: workerRut,
      feedback_date: feedbackDate,
      type,
      author: author || null,
      content,
      action_items: actionItems || null,
    });
    setContent("");
    setActionItems("");
    setAuthor("");
  }

  return (
    <Modal open={open} onClose={onClose} title="Nuevo Feedback" size="md">
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
            value={feedbackDate}
            onChange={(e) => setFeedbackDate(e.target.value)}
            required
          />
          <Select
            label="Tipo"
            value={type}
            onChange={(e) => setType(e.target.value as PerformanceFeedback["type"])}
          >
            <option value="positivo">Positivo</option>
            <option value="constructivo">Constructivo</option>
            <option value="oportunidad_mejora">Oportunidad de Mejora</option>
          </Select>
          <Input
            label="Autor (opcional)"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="Tu nombre"
          />
        </div>
        <Textarea
          label="Contenido"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          required
        />
        <Textarea
          label="Acciones a seguir (opcional)"
          value={actionItems}
          onChange={(e) => setActionItems(e.target.value)}
          rows={2}
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
