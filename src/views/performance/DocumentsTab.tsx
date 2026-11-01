import { useState, useMemo } from "react";
import { FileText, Plus, Trash2, FileSpreadsheet, Save } from "lucide-react";
import { Card, Button, Modal, Input, Select, Badge, EmptyState, Textarea } from "@/components/ui";
import { ExportService } from "@/lib/export";
import { workerDocRepo } from "@/lib/repositories";
import { audit } from "@/lib/audit";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/hooks/useConfirm";
import { useLoading } from "@/components/LoadingProvider";
import type { WorkerDocument, Worker } from "@/lib/types";
import type { AppData } from "@/hooks/useAppData";

interface Props {
  docs: WorkerDocument[];
  workers: Worker[];
  workerName: (rut: string) => string;
  data: AppData;
  canDelete?: boolean;
}

function sevColor(sev: string) {
  if (sev === "leve") return "bg-amber-50 text-amber-700 border-amber-200";
  if (sev === "grave") return "bg-orange-50 text-orange-700 border-orange-200";
  if (sev === "muy_grave") return "bg-red-50 text-red-700 border-red-200";
  return "bg-slate-100 text-slate-600 border-slate-200";
}

export function DocumentsTab({ docs, workers, workerName, data, canDelete }: Props) {
  const toast = useToast();
  const { confirm } = useConfirm();
  const { runWithLoading } = useLoading();
  const [modalOpen, setModalOpen] = useState(false);

  async function addDoc(form: Omit<WorkerDocument, "id" | "created_at">) {
    try {
      await runWithLoading(async () => {
        await workerDocRepo.insert(form);
        await audit({
          action: "performance.doc_create",
          entity: "worker_documents",
          entity_label: `${form.document_type} — ${workerName(form.worker_rut)}`,
        });
        setModalOpen(false);
        toast.success("Documento creado", form.subject);
        await data.reload();
      });
    } catch (e) {
      toast.error("Error", (e as Error).message);
    }
  }

  async function deleteDoc(d: WorkerDocument) {
    const ok = await confirm({
      title: "Eliminar documento",
      message: `¿Eliminar "${d.subject}"?`,
      confirmText: "Eliminar",
      type: "danger",
    });
    if (!ok) return;
    try {
      await runWithLoading(async () => {
        await workerDocRepo.remove(d.id);
        toast.success("Documento eliminado");
        await data.reload();
      });
    } catch (e) {
      toast.error("Error", (e as Error).message);
    }
  }

  function exportDocs() {
    ExportService.toExcel(
      docs.map((d) => ({
        Trabajador: workerName(d.worker_rut),
        Tipo: d.document_type,
        Fecha: d.document_date,
        Asunto: d.subject,
        Severidad: d.severity,
        Emitido: d.issued_by ?? "",
        Estado: d.status,
      })),
      "Documentos",
      "documentos_trabajadores",
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="outline" onClick={exportDocs}>
          <FileSpreadsheet size={15} /> Excel
        </Button>
        <Button size="sm" onClick={() => setModalOpen(true)}>
          <Plus size={15} /> Nuevo Documento
        </Button>
      </div>

      {docs.length === 0 ? (
        <Card>
          <EmptyState message="No hay documentos registrados" icon={<FileText size={32} />} />
        </Card>
      ) : (
        <div className="space-y-3">
          {docs.map((d) => (
            <Card key={d.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <Badge className="bg-blue-50 text-blue-700 border-blue-200">
                      {d.document_type}
                    </Badge>
                    <Badge className={sevColor(d.severity)}>{d.severity}</Badge>
                    <Badge className="bg-slate-100 text-slate-600 border-slate-200">
                      {d.status}
                    </Badge>
                    <span className="font-semibold text-slate-800">{d.subject}</span>
                  </div>
                  <p className="text-xs text-slate-500 mb-2">
                    {workerName(d.worker_rut)} · {d.document_date}
                    {d.issued_by ? ` · Emitido por: ${d.issued_by}` : ""}
                  </p>
                  <p className="text-sm text-slate-600 line-clamp-3">{d.body}</p>
                </div>
                {canDelete && (
                  <button
                    onClick={() => deleteDoc(d)}
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

      <DocumentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        workers={workers}
        onCreate={addDoc}
      />
    </div>
  );
}

function DocumentModal({
  open,
  onClose,
  workers,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  workers: Worker[];
  onCreate: (form: Omit<WorkerDocument, "id" | "created_at">) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [workerRut, setWorkerRut] = useState("");
  const [docType, setDocType] = useState<WorkerDocument["document_type"]>("nota");
  const [docDate, setDocDate] = useState(today);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [severity, setSeverity] = useState<WorkerDocument["severity"]>("informativa");
  const [issuedBy, setIssuedBy] = useState("");

  useMemo(() => {
    if (open && workers.length > 0 && !workerRut) setWorkerRut(workers[0].rut);
  }, [open, workers, workerRut]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!workerRut || !subject || !body) return;
    onCreate({
      worker_rut: workerRut,
      document_type: docType,
      document_date: docDate,
      subject,
      body,
      severity,
      issued_by: issuedBy || null,
      sent_to_email: false,
      sent_at: null,
      status: "borrador",
    });
    setSubject("");
    setBody("");
    setIssuedBy("");
  }

  return (
    <Modal open={open} onClose={onClose} title="Nuevo Documento" size="lg">
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
            value={docDate}
            onChange={(e) => setDocDate(e.target.value)}
            required
          />
          <Select
            label="Tipo de Documento"
            value={docType}
            onChange={(e) => setDocType(e.target.value as WorkerDocument["document_type"])}
          >
            <option value="nota">Nota</option>
            <option value="amonestacion">Amonestación</option>
            <option value="carta">Carta</option>
            <option value="reconocimiento">Reconocimiento</option>
            <option value="advertencia">Advertencia</option>
          </Select>
          <Select
            label="Severidad"
            value={severity}
            onChange={(e) => setSeverity(e.target.value as WorkerDocument["severity"])}
          >
            <option value="informativa">Informativa</option>
            <option value="leve">Leve</option>
            <option value="grave">Grave</option>
            <option value="muy_grave">Muy Grave</option>
          </Select>
        </div>
        <Input
          label="Asunto"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
        />
        <Textarea
          label="Cuerpo del Documento"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={6}
          required
        />
        <Input
          label="Emitido por (opcional)"
          value={issuedBy}
          onChange={(e) => setIssuedBy(e.target.value)}
          placeholder="Nombre del emisor"
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">
            <Save size={15} /> Crear Documento
          </Button>
        </div>
      </form>
    </Modal>
  );
}
