import { useState, useMemo } from "react";
import { Inbox, Send, Clock, CheckCircle2, ShieldCheck } from "lucide-react";
import { Card, Button, Modal, Select, Badge, EmptyState, Textarea } from "@/components/ui";
import { workerRequestRepo } from "@/lib/repositories";
import { audit } from "@/lib/audit";
import { useToast } from "@/components/Toast";
import { useLoading } from "@/components/LoadingProvider";
import type { WorkerRequest } from "@/lib/types";
import type { AppData } from "@/hooks/useAppData";
import {
  CATEGORY_LABELS,
  STATUS_LABELS,
  STATUS_COLORS,
  VALIDITY_LABELS,
  VALIDITY_COLORS,
  CATEGORY_ICONS,
  REQUEST_STATUS_ORDER,
} from "./constants";

interface Props {
  requests: WorkerRequest[];
  workerName: (rut: string) => string;
  data: AppData;
}

export function RequestsTab({ requests, workerName, data }: Props) {
  const toast = useToast();
  const { runWithLoading } = useLoading();
  const [replyTo, setReplyTo] = useState<WorkerRequest | null>(null);
  const [validityFor, setValidityFor] = useState<WorkerRequest | null>(null);
  const [filterStatus, setFilterStatus] = useState<WorkerRequest["status"] | "all">("all");

  const sorted = [...requests].sort((a, b) => {
    if (REQUEST_STATUS_ORDER[a.status] !== REQUEST_STATUS_ORDER[b.status])
      return REQUEST_STATUS_ORDER[a.status] - REQUEST_STATUS_ORDER[b.status];
    return (b.created_at ?? "").localeCompare(a.created_at ?? "");
  });
  const visible = filterStatus === "all" ? sorted : sorted.filter((r) => r.status === filterStatus);

  const pendingCount = requests.filter((r) => r.status === "pendiente").length;
  const respondedCount = requests.filter(
    (r) => r.status === "respondida" || r.status === "cerrada",
  ).length;

  async function updateStatus(r: WorkerRequest, status: WorkerRequest["status"]) {
    try {
      await runWithLoading(async () => {
        await workerRequestRepo.update(r.id, { status });
        await audit({
          action: "worker_request.status",
          entity: "worker_requests",
          entity_id: r.id,
          entity_label: `${workerName(r.worker_rut)} — ${r.subject}`,
          details: { status },
        });
        toast.success("Estado actualizado", `${STATUS_LABELS[status]}`);
        await data.reload();
      });
    } catch (e) {
      toast.error("Error", (e as Error).message);
    }
  }

  async function updateValidity(
    r: WorkerRequest,
    validity: NonNullable<WorkerRequest["validity"]>,
    note: string,
  ) {
    try {
      await runWithLoading(async () => {
        await workerRequestRepo.update(r.id, { validity, validity_note: note || null });
        await audit({
          action: "worker_request.validity",
          entity: "worker_requests",
          entity_id: r.id,
          entity_label: `${workerName(r.worker_rut)} — ${r.subject}`,
          details: { validity, note },
        });
        toast.success("Validez actualizada", VALIDITY_LABELS[validity]);
        await data.reload();
      });
    } catch (e) {
      toast.error("Error", (e as Error).message);
    }
  }

  async function sendReply(r: WorkerRequest, reply: string, newStatus: WorkerRequest["status"]) {
    try {
      await runWithLoading(async () => {
        await workerRequestRepo.update(r.id, {
          admin_reply: reply,
          status: newStatus,
          replied_at: new Date().toISOString(),
        });
        await audit({
          action: "worker_request.reply",
          entity: "worker_requests",
          entity_id: r.id,
          entity_label: `${workerName(r.worker_rut)} — ${r.subject}`,
          details: { status: newStatus },
        });
        setReplyTo(null);
        toast.success("Respuesta enviada", `El trabajador verá tu respuesta en su portal.`);
        await data.reload();
      });
    } catch (e) {
      toast.error("Error", (e as Error).message);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 text-center">
          <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
          <p className="text-xs text-slate-500">Pendientes</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-2xl font-bold text-blue-600">
            {requests.filter((r) => r.status === "en_proceso").length}
          </p>
          <p className="text-xs text-slate-500">En Proceso</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-2xl font-bold text-emerald-600">{respondedCount}</p>
          <p className="text-xs text-slate-500">Respondidas</p>
        </Card>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-slate-500">Filtrar:</span>
        {(["all", "pendiente", "en_proceso", "respondida", "cerrada"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${filterStatus === s ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
          >
            {s === "all" ? "Todas" : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <Card>
          <EmptyState message="No hay solicitudes en este filtro" icon={<Inbox size={32} />} />
        </Card>
      ) : (
        <div className="space-y-3">
          {visible.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <Badge className="bg-slate-100 text-slate-600 border-slate-200">
                      {CATEGORY_ICONS[r.category]} {CATEGORY_LABELS[r.category]}
                    </Badge>
                    <Badge className={STATUS_COLORS[r.status]}>{STATUS_LABELS[r.status]}</Badge>
                    <Badge className={VALIDITY_COLORS[r.validity ?? "pendiente"]}>
                      {VALIDITY_LABELS[r.validity ?? "pendiente"]}
                    </Badge>
                    <span className="font-semibold text-slate-800">{r.subject}</span>
                  </div>
                  {r.validity_note && (
                    <p className="text-xs text-slate-500 italic mb-1">
                      Nota de validez: {r.validity_note}
                    </p>
                  )}
                  <p className="text-xs text-slate-500 mb-2">
                    {workerName(r.worker_rut)} ·{" "}
                    {r.created_at ? new Date(r.created_at).toLocaleDateString("es-CL") : ""}
                  </p>
                  <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3">{r.message}</p>

                  {r.admin_reply && (
                    <div className="mt-3 rounded-lg p-3 bg-emerald-50 border border-emerald-200">
                      <p className="text-xs font-semibold text-emerald-700 mb-1 flex items-center gap-1">
                        <CheckCircle2 size={12} /> Respuesta
                        {r.replied_at && (
                          <span className="font-normal text-emerald-600">
                            · {new Date(r.replied_at).toLocaleDateString("es-CL")}
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-slate-700">{r.admin_reply}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap mt-3 pt-3 border-t border-slate-100">
                {r.status === "pendiente" && (
                  <Button size="sm" variant="outline" onClick={() => updateStatus(r, "en_proceso")}>
                    <Clock size={13} /> Marcar en revisión
                  </Button>
                )}
                <Button size="sm" variant="primary" onClick={() => setReplyTo(r)}>
                  <Send size={13} /> {r.admin_reply ? "Editar Respuesta" : "Responder"}
                </Button>
                {r.status !== "cerrada" && (
                  <Button size="sm" variant="ghost" onClick={() => updateStatus(r, "cerrada")}>
                    <CheckCircle2 size={13} /> Cerrar
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => setValidityFor(r)}>
                  <ShieldCheck size={13} /> Validez
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ReplyModal
        request={replyTo}
        onClose={() => setReplyTo(null)}
        onSend={sendReply}
        workerName={workerName}
      />
      <ValidityModal
        request={validityFor}
        onClose={() => setValidityFor(null)}
        onApply={updateValidity}
      />
    </div>
  );
}

function ValidityModal({
  request,
  onClose,
  onApply,
}: {
  request: WorkerRequest | null;
  onClose: () => void;
  onApply: (
    r: WorkerRequest,
    validity: NonNullable<WorkerRequest["validity"]>,
    note: string,
  ) => void | Promise<void>;
}) {
  const [validity, setValidity] = useState("pendiente");
  const [note, setNote] = useState("");

  useMemo(() => {
    if (request) {
      setValidity(request.validity ?? "pendiente");
      setNote(request.validity_note ?? "");
    }
  }, [request]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!request) return;
    onApply(request, validity as NonNullable<WorkerRequest["validity"]>, note.trim());
    onClose();
  }

  return (
    <Modal open={!!request} onClose={onClose} title="Evaluar Validez Formal" size="md">
      {request && (
        <form onSubmit={submit} className="space-y-4">
          <div className="bg-slate-50 rounded-lg p-3 space-y-1">
            <p className="text-xs text-slate-500">Solicitud</p>
            <p className="text-sm font-medium text-slate-800">{request.subject}</p>
            <p className="text-xs text-slate-600 mt-1">{request.message}</p>
          </div>
          <Select
            label="Estado de validez"
            value={validity}
            onChange={(e) => setValidity(e.target.value)}
          >
            <option value="pendiente">Pendiente (no evaluada)</option>
            <option value="valida">Válida (cumple requisitos formales)</option>
            <option value="invalida">Inválida (falta documentación / no procede)</option>
          </Select>
          <Textarea
            label="Nota de validez (opcional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Ej: Falta adjuntar certificado médico, o: Documentación completa, procede."
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">Aplicar</Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function ReplyModal({
  request,
  onClose,
  onSend,
  workerName,
}: {
  request: WorkerRequest | null;
  onClose: () => void;
  onSend: (r: WorkerRequest, reply: string, status: WorkerRequest["status"]) => void;
  workerName: (rut: string) => string;
}) {
  const [reply, setReply] = useState("");
  const [newStatus, setNewStatus] = useState<WorkerRequest["status"]>("respondida");

  useMemo(() => {
    if (request) {
      setReply(request.admin_reply ?? "");
      setNewStatus(request.status === "cerrada" ? "cerrada" : "respondida");
    }
  }, [request]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!request || !reply.trim()) return;
    onSend(request, reply.trim(), newStatus);
  }

  return (
    <Modal open={!!request} onClose={onClose} title="Responder Solicitud" size="md">
      {request && (
        <form onSubmit={submit} className="space-y-4">
          <div className="bg-slate-50 rounded-lg p-3 space-y-1">
            <p className="text-xs text-slate-500">Trabajador</p>
            <p className="text-sm font-medium text-slate-800">{workerName(request.worker_rut)}</p>
            <p className="text-xs text-slate-500 mt-2">Solicitud</p>
            <p className="text-sm text-slate-700">{request.subject}</p>
            <p className="text-xs text-slate-600 mt-1">{request.message}</p>
          </div>
          <Textarea
            label="Tu respuesta"
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            rows={5}
            required
            placeholder="Escribe la respuesta que verá el trabajador en su portal..."
          />
          <Select
            label="Estado final"
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value as WorkerRequest["status"])}
          >
            <option value="respondida">Respondida (el trabajador puede leer y responder)</option>
            <option value="cerrada">Cerrada (solicitud finalizada)</option>
          </Select>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">
              <Send size={15} /> Enviar Respuesta
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
