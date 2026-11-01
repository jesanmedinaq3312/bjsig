import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  Trash2,
  Megaphone,
  Eye,
  CheckCircle,
  Users,
  Building2,
  Clock,
  Send,
  ArrowLeft,
  FileText,
} from "lucide-react";
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
import {
  circularRepo,
  circularAckRepo,
  departmentRepo,
  getActiveWorkersLite,
  getCurrentUserEmail,
} from "@/lib/repositories";
import { audit } from "@/lib/audit";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/hooks/useConfirm";
import type {
  Circular,
  CircularAcknowledgment,
  Worker,
  Department,
  CircularCategory,
} from "@/lib/types";

const CATEGORY_LABELS: Record<string, string> = {
  informacion: "Información",
  descuentos: "Descuentos y afiliados",
  entretencion: "Cultura y entretención",
  caja_compensacion: "Caja de compensación",
  beneficios: "Beneficios",
};

const CATEGORY_COLORS: Record<string, string> = {
  informacion: "bg-slate-100 text-slate-600 border-slate-200",
  descuentos: "bg-emerald-50 text-emerald-700 border-emerald-200",
  entretencion: "bg-amber-50 text-amber-700 border-amber-200",
  caja_compensacion: "bg-blue-50 text-blue-700 border-blue-200",
  beneficios: "bg-rose-50 text-rose-700 border-rose-200",
};

const AUDIENCE_LABELS: Record<string, string> = {
  todos: "Todos los trabajadores",
  departamento: "Por departamento",
};

const AUDIENCE_COLORS: Record<string, string> = {
  todos: "bg-blue-50 text-blue-700 border-blue-200",
  departamento: "bg-amber-50 text-amber-700 border-amber-200",
};

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("es-CL", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function CommunicationsView({
  userRole,
  permissions,
}: {
  userRole: string;
  permissions?: Record<string, boolean>;
}) {
  const canManage =
    userRole === "superadmin" ||
    userRole === "developer" ||
    permissions?.["can_view_workers"] === true;
  const canDelete =
    userRole === "superadmin" ||
    userRole === "developer" ||
    permissions?.["can_delete_communications"] === true;
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [circulars, setCirculars] = useState<(Circular & { acks?: CircularAcknowledgment[] })[]>(
    [],
  );
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewingCircular, setViewingCircular] = useState<
    (Circular & { acks?: CircularAcknowledgment[] }) | null
  >(null);
  const [form, setForm] = useState({
    title: "",
    body: "",
    target_audience: "todos",
    department_id: "",
    ack_required: true,
    category: "informacion" as CircularCategory,
  });
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const { confirm } = useConfirm();

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [cRes, wRes, dRes] = await Promise.all([
        circularRepo.getAllWithAcks(),
        getActiveWorkersLite(),
        departmentRepo.getAllByName(),
      ]);
      setCirculars(cRes);
      setWorkers(wRes as unknown as Worker[]);
      setDepartments(dRes as Department[]);
    } catch (e) {
      toast.error("Error al cargar", (e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const workerMap = useMemo(() => new Map(workers.map((w) => [w.rut, w.full_name])), [workers]);
  const deptMap = useMemo(() => new Map(departments.map((d) => [d.id, d.name])), [departments]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return circulars;
    return circulars.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.body.toLowerCase().includes(q) ||
        (c.published_by ?? "").toLowerCase().includes(q),
    );
  }, [circulars, search]);

  const targetWorkers = useMemo(() => {
    if (!viewingCircular) return [];
    if (viewingCircular.target_audience === "todos") return workers;
    return workers.filter((w) => w.department_id === viewingCircular.department_id);
  }, [viewingCircular, workers]);

  const ackedRuts = useMemo(() => {
    if (!viewingCircular?.acks) return new Set<string>();
    return new Set(viewingCircular.acks.map((a) => a.worker_rut));
  }, [viewingCircular]);

  async function handleCreate() {
    if (!form.title.trim() || !form.body.trim()) {
      toast.error("Faltan datos", "Título y contenido son obligatorios");
      return;
    }
    setSaving(true);
    try {
      const publishedBy = await getCurrentUserEmail();
      const data = await circularRepo.createWithAcks({
        title: form.title.trim(),
        body: form.body.trim(),
        target_audience: form.target_audience as Circular["target_audience"],
        department_id: form.target_audience === "departamento" ? form.department_id || null : null,
        published_by: publishedBy,
        ack_required: form.ack_required,
        category: form.category,
      });
      await audit({ action: "circular.create", entity: "circulars", entity_label: form.title });
      toast.success("Circular publicada", form.title);
      setCirculars((prev) => [data as Circular & { acks?: CircularAcknowledgment[] }, ...prev]);
      setModalOpen(false);
      setForm({
        title: "",
        body: "",
        target_audience: "todos",
        department_id: "",
        ack_required: true,
        category: "informacion",
      });
    } catch (e) {
      toast.error("Error", (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(c: Circular) {
    const ok = await confirm({
      title: "Eliminar circular",
      message: `Se eliminará "${c.title}".`,
      confirmText: "Eliminar",
      type: "danger",
    });
    if (!ok) return;
    try {
      await circularRepo.removeById(c.id);
      await audit({ action: "circular.delete", entity: "circulars", entity_label: c.title });
      toast.success("Circular eliminada", c.title);
      setCirculars((prev) => prev.filter((x) => x.id !== c.id));
    } catch (e) {
      toast.error("Error", (e as Error).message);
    }
  }

  async function handleManualAck(circularId: string, workerRut: string) {
    try {
      const data = await circularAckRepo.ackCircular(circularId, workerRut);
      setViewingCircular((prev) =>
        prev ? { ...prev, acks: [...(prev.acks ?? []), data as CircularAcknowledgment] } : prev,
      );
      setCirculars((prev) =>
        prev.map((c) =>
          c.id === circularId
            ? { ...c, acks: [...(c.acks ?? []), data as CircularAcknowledgment] }
            : c,
        ),
      );
      toast.success("Acuse registrado", workerMap.get(workerRut) ?? workerRut);
    } catch (e) {
      toast.error("Error", (e as Error).message);
    }
  }

  if (loading) return <Spinner />;

  if (viewingCircular) {
    const ackedCount = viewingCircular.acks?.length ?? 0;
    const totalCount = targetWorkers.length;
    const pendingCount = totalCount - ackedCount;
    const pendingWorkers = targetWorkers.filter((w) => !ackedRuts.has(w.rut));

    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setViewingCircular(null)}>
            <ArrowLeft size={16} /> Volver
          </Button>
          <div>
            <h2 className="text-lg font-semibold text-slate-800">{viewingCircular.title}</h2>
            <p className="text-xs text-slate-500">
              Publicado por {viewingCircular.published_by ?? "—"} ·{" "}
              {fmtDate(viewingCircular.published_at)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card className="p-4">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-1">
              <Users size={14} /> Destinatarios
            </div>
            <p className="text-2xl font-bold text-slate-800">{totalCount}</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-emerald-600 text-xs font-medium mb-1">
              <CheckCircle size={14} /> Han confirmado
            </div>
            <p className="text-2xl font-bold text-emerald-700">{ackedCount}</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-amber-600 text-xs font-medium mb-1">
              <Clock size={14} /> Pendientes
            </div>
            <p className="text-2xl font-bold text-amber-700">{pendingCount}</p>
          </Card>
        </div>

        <Card>
          <CardHeader
            title="Contenido de la circular"
            subtitle={
              viewingCircular.ack_required ? "Requiere acuse de recibo" : "Sin acuse requerido"
            }
          />
          <div className="px-5 pb-5">
            <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap leading-relaxed">
              {viewingCircular.body}
            </div>
            <div className="mt-4 flex items-center gap-2">
              <Badge className={AUDIENCE_COLORS[viewingCircular.target_audience]}>
                {AUDIENCE_LABELS[viewingCircular.target_audience]}
              </Badge>
              {viewingCircular.target_audience === "departamento" &&
                viewingCircular.department_id && (
                  <Badge className="bg-slate-100 text-slate-600 border-slate-200">
                    {deptMap.get(viewingCircular.department_id) ?? "Departamento"}
                  </Badge>
                )}
            </div>
          </div>
        </Card>

        {viewingCircular.ack_required && (
          <Card>
            <CardHeader
              title="Acuse de recibo — Pendientes"
              subtitle={`${pendingWorkers.length} trabajadores sin confirmar`}
            />
            <div className="px-5 pb-5">
              {pendingWorkers.length === 0 ? (
                <EmptyState
                  message="Todos los trabajadores han confirmado la lectura"
                  icon={<CheckCircle size={28} className="text-emerald-500" />}
                />
              ) : (
                <div className="divide-y divide-slate-100">
                  {pendingWorkers.map((w) => (
                    <div key={w.rut} className="flex items-center justify-between py-2.5">
                      <div>
                        <p className="text-sm font-medium text-slate-700">{w.full_name}</p>
                        <p className="text-xs text-slate-400">{w.rut}</p>
                      </div>
                      {canManage && (
                        <Button
                          size="sm"
                          variant="success"
                          onClick={() => void handleManualAck(viewingCircular.id, w.rut)}
                        >
                          <CheckCircle size={14} /> Marcar leído
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        )}

        {viewingCircular.ack_required && ackedCount > 0 && (
          <Card>
            <CardHeader
              title="Confirmaciones recibidas"
              subtitle={`${ackedCount} acuses de recibo`}
            />
            <div className="px-5 pb-5">
              <div className="divide-y divide-slate-100">
                {(viewingCircular.acks ?? []).map((ack) => (
                  <div key={ack.id} className="flex items-center justify-between py-2.5">
                    <div>
                      <p className="text-sm font-medium text-slate-700">
                        {workerMap.get(ack.worker_rut) ?? ack.worker_rut}
                      </p>
                      <p className="text-xs text-slate-400">{ack.worker_rut}</p>
                    </div>
                    <div className="text-right">
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                        <CheckCircle size={12} /> Confirmado
                      </Badge>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {fmtDate(ack.acknowledged_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Stats summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-1">
            <Megaphone size={14} /> Circulares publicadas
          </div>
          <p className="text-2xl font-bold text-slate-800">{circulars.length}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-emerald-600 text-xs font-medium mb-1">
            <CheckCircle size={14} /> Total acuses
          </div>
          <p className="text-2xl font-bold text-emerald-700">
            {circulars.reduce((s, c) => s + (c.acks?.length ?? 0), 0)}
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-amber-600 text-xs font-medium mb-1">
            <Clock size={14} /> Pendientes de acuse
          </div>
          <p className="text-2xl font-bold text-amber-700">
            {circulars
              .filter((c) => c.ack_required)
              .reduce(
                (s, c) =>
                  s +
                  Math.max(
                    0,
                    (c.target_audience === "todos"
                      ? workers.length
                      : workers.filter((w) => w.department_id === c.department_id).length) -
                      (c.acks?.length ?? 0),
                  ),
                0,
              )}
          </p>
        </Card>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="glass-input w-full pl-9 pr-3 py-2 text-sm text-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Buscar circular..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {canManage && (
          <Button onClick={() => setModalOpen(true)}>
            <Plus size={16} /> Nueva Circular
          </Button>
        )}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            message="No hay circulares publicadas"
            icon={<Megaphone size={28} className="text-slate-300" />}
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => {
            const ackCount = c.acks?.length ?? 0;
            const totalForC =
              c.target_audience === "todos"
                ? workers.length
                : workers.filter((w) => w.department_id === c.department_id).length;
            const pct = totalForC > 0 ? Math.round((ackCount / totalForC) * 100) : 0;
            return (
              <Card
                key={c.id}
                className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setViewingCircular(c)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText size={16} className="text-primary shrink-0" />
                      <h3 className="text-sm font-semibold text-slate-800 truncate">{c.title}</h3>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2 mb-2">{c.body}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {c.category && (
                        <Badge
                          className={CATEGORY_COLORS[c.category] ?? CATEGORY_COLORS.informacion}
                        >
                          {CATEGORY_LABELS[c.category] ?? "Información"}
                        </Badge>
                      )}
                      <Badge className={AUDIENCE_COLORS[c.target_audience]}>
                        {c.target_audience === "departamento" ? (
                          <>
                            <Building2 size={10} />{" "}
                            {deptMap.get(c.department_id ?? "") ?? "Departamento"}
                          </>
                        ) : (
                          <>
                            <Users size={10} /> {AUDIENCE_LABELS[c.target_audience]}
                          </>
                        )}
                      </Badge>
                      {c.ack_required && (
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                          <CheckCircle size={10} /> {ackCount}/{totalForC} ({pct}%)
                        </Badge>
                      )}
                      <span className="text-[10px] text-slate-400">{fmtDate(c.published_at)}</span>
                    </div>
                  </div>
                  <div
                    className="flex items-center gap-1 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button size="sm" variant="ghost" onClick={() => setViewingCircular(c)}>
                      <Eye size={14} />
                    </Button>
                    {canDelete && (
                      <Button size="sm" variant="ghost" onClick={() => void handleDelete(c)}>
                        <Trash2 size={14} className="text-red-500" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nueva Circular" size="lg">
        <div className="space-y-4">
          <Input
            label="Título"
            placeholder="Ej: Nuevo protocolo de seguridad..."
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <Textarea
            label="Contenido"
            placeholder="Escriba el contenido de la circular..."
            rows={6}
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
          />
          <Select
            label="Categoría"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value as CircularCategory })}
          >
            <option value="informacion">Información</option>
            <option value="descuentos">Descuentos y afiliados</option>
            <option value="entretencion">Cultura y entretención</option>
            <option value="caja_compensacion">Caja de compensación</option>
            <option value="beneficios">Beneficios</option>
          </Select>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Dirigido a"
              value={form.target_audience}
              onChange={(e) =>
                setForm({ ...form, target_audience: e.target.value, department_id: "" })
              }
            >
              <option value="todos">Todos los trabajadores</option>
              <option value="departamento">Por departamento</option>
            </Select>
            {form.target_audience === "departamento" && (
              <Select
                label="Departamento"
                value={form.department_id}
                onChange={(e) => setForm({ ...form, department_id: e.target.value })}
              >
                <option value="">Seleccionar...</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </Select>
            )}
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.ack_required}
              onChange={(e) => setForm({ ...form, ack_required: e.target.checked })}
              className="rounded border-slate-300 text-primary focus:ring-primary"
            />
            Requiere acuse de recibo
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button loading={saving} onClick={() => void handleCreate()}>
              <Send size={16} /> Publicar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
