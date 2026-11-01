import { useState, useMemo } from "react";
import {
  Plus,
  Trash2,
  FileSpreadsheet,
  FileText,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  Search,
  AlertTriangle,
  FolderCheck,
  Filter,
} from "lucide-react";
import {
  Card,
  CardHeader,
  Button,
  Modal,
  Input,
  Select,
  Textarea,
  Badge,
  EmptyState,
  Spinner,
  InfoTooltip,
} from "@/components/ui";
import { ExportService } from "@/lib/export";
import { getCompanyName } from "@/lib/logo";
import { isoAuditRepo } from "@/lib/repositories";
import { audit } from "@/lib/audit";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/hooks/useConfirm";
import { useLoading } from "@/components/LoadingProvider";
import type { IsoAudit, IsoStandard, IsoStatus } from "@/lib/types";
import type { AppData } from "@/hooks/useAppData";

const STANDARDS: IsoStandard[] = ["ISO 9001", "ISO 14001", "ISO 45001"];

export function IsoView({
  data,
  userRole,
  permissions,
}: {
  data: AppData;
  userRole?: string;
  permissions?: Record<string, boolean>;
}) {
  const { isoAudits, loading } = data;
  const canDelete = userRole === "superadmin" || !!permissions?.can_delete_iso;
  const [modalOpen, setModalOpen] = useState(false);
  const [activeStd, setActiveStd] = useState<IsoStandard | "all">("all");
  const [statusFilter, setStatusFilter] = useState<IsoStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const toast = useToast();
  const { confirm } = useConfirm();
  const { runWithLoading } = useLoading();

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  const globalStats = useMemo(() => {
    const total = isoAudits.length;
    const ncs = isoAudits.filter((a) => a.finding_type === "No conformidad").length;
    const closed = isoAudits.filter((a) => a.status === "Cerrada").length;
    const overdue = isoAudits.filter(
      (a) => a.status !== "Cerrada" && a.due_date && a.due_date < todayStr,
    ).length;

    return { total, ncs, closed, overdue };
  }, [isoAudits, todayStr]);

  const stats = useMemo(() => {
    const byStd = (s: IsoStandard) => isoAudits.filter((a) => a.iso_standard === s);
    return STANDARDS.map((s) => {
      const items = byStd(s);
      return {
        standard: s,
        total: items.length,
        open: items.filter((a) => a.status !== "Cerrada").length,
        closed: items.filter((a) => a.status === "Cerrada").length,
        overdue: items.filter((a) => a.status !== "Cerrada" && a.due_date && a.due_date < todayStr)
          .length,
      };
    });
  }, [isoAudits, todayStr]);

  const filtered = useMemo(() => {
    return isoAudits.filter((a) => {
      const matchStd = activeStd === "all" || a.iso_standard === activeStd;
      const matchStatus = statusFilter === "all" || a.status === statusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        a.description.toLowerCase().includes(q) ||
        a.area.toLowerCase().includes(q) ||
        (a.corrective_action && a.corrective_action.toLowerCase().includes(q)) ||
        a.finding_type.toLowerCase().includes(q);

      return matchStd && matchStatus && matchQuery;
    });
  }, [isoAudits, activeStd, statusFilter, searchQuery]);

  async function addAudit(form: Omit<IsoAudit, "id" | "created_at">) {
    try {
      await runWithLoading(async () => {
        await isoAuditRepo.insert(form);
        await audit({
          action: "iso.create",
          entity: "iso_audits",
          entity_label: `${form.iso_standard} — ${form.area}`,
        });
        setModalOpen(false);
        toast.success("Hallazgo registrado", `${form.iso_standard} — ${form.area}`);
        await data.reload();
      });
    } catch (e) {
      toast.error("Error al guardar hallazgo", (e as Error).message);
    }
  }

  async function updateStatus(a: IsoAudit, status: IsoStatus) {
    try {
      await runWithLoading(async () => {
        await isoAuditRepo.update(a.id, { status });
        await audit({
          action: "iso.update",
          entity: "iso_audits",
          entity_id: a.id,
          entity_label: `${a.iso_standard} — ${a.area}`,
          details: { status },
        });
        toast.success("Estado actualizado", `${a.area} → ${status}`);
        await data.reload();
      });
    } catch (e) {
      toast.error("Error al actualizar estado", (e as Error).message);
    }
  }

  async function delAudit(a: IsoAudit) {
    const ok = await confirm({
      title: "Eliminar hallazgo",
      message: `¿Eliminar definitivamente el hallazgo de ${a.iso_standard} en ${a.area}? Esta acción no se puede deshacer.`,
      confirmText: "Eliminar",
      type: "danger",
    });
    if (!ok) return;
    try {
      await runWithLoading(async () => {
        await isoAuditRepo.remove(a.id);
        await audit({
          action: "iso.delete",
          entity: "iso_audits",
          entity_id: a.id,
          entity_label: `${a.iso_standard} — ${a.area}`,
        });
        toast.success("Hallazgo eliminado");
        await data.reload();
      });
    } catch (e) {
      toast.error("Error al eliminar hallazgo", (e as Error).message);
    }
  }

  function exportExcel() {
    ExportService.toExcel(
      filtered.map((a) => ({
        Norma: a.iso_standard,
        "Tipo Hallazgo": a.finding_type,
        Área: a.area,
        Descripción: a.description,
        "Acción Correctiva": a.corrective_action ?? "Sin asignar",
        Estado: a.status,
        "Fecha Vencimiento": a.due_date ?? "Sin fecha",
        "Fecha Registro": a.created_at ? new Date(a.created_at).toLocaleDateString("es-CL") : "—",
      })),
      "Auditoría ISO",
      "auditoria_iso_gyc",
    );
  }

  function exportPdf() {
    ExportService.toPdf(
      `Registro Integrado de Auditoría ISO — ${getCompanyName()}`,
      ["Norma", "Tipo", "Área", "Descripción", "Estado", "Vence"],
      filtered.map((a) => [
        a.iso_standard,
        a.finding_type,
        a.area,
        a.description.length > 50 ? `${a.description.slice(0, 47)}...` : a.description,
        a.status,
        a.due_date ?? "—",
      ]),
      "auditoria_iso_gyc",
      "ISO 9001:2015 · ISO 14001:2015 · ISO 45001:2018",
    );
  }

  if (loading) return <Spinner />;

  const statusBadge = (s: IsoStatus) =>
    s === "Cerrada"
      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
      : s === "En proceso"
        ? "bg-amber-100 text-amber-700 border-amber-200"
        : "bg-red-100 text-red-700 border-red-200";

  return (
    <div className="space-y-5">
      {/* Header & Title */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck size={24} className="text-blue-600 shrink-0" />
          <div>
            <h2 className="text-lg font-semibold text-slate-800 leading-tight">
              Sistema Integrado de Gestión (SIG ISO)
            </h2>
            <p className="text-xs text-slate-500">
              Módulo de auditoría continua y gestión de hallazgos
            </p>
          </div>
        </div>
        <InfoTooltip text="Módulo para la gestión y seguimiento del Plan de Acciones Correctivas (PAC) de auditorías ISO 9001, ISO 14001 e ISO 45001." />
      </div>

      {/* Global KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-stretch">
        <div className="p-3.5 glass-surface glass-hover rounded-xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <FolderCheck size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-500 font-medium truncate">Total Hallazgos</p>
            <p className="text-lg font-bold text-slate-800">{globalStats.total}</p>
          </div>
        </div>

        <div className="p-3.5 glass-surface glass-hover rounded-xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0">
            <AlertCircle size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-500 font-medium truncate">No Conformidades</p>
            <p className="text-lg font-bold text-slate-800">{globalStats.ncs}</p>
          </div>
        </div>

        <div className="p-3.5 glass-surface glass-hover rounded-xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-500 font-medium truncate">Cerradas</p>
            <p className="text-lg font-bold text-slate-800">{globalStats.closed}</p>
          </div>
        </div>

        <div className="p-3.5 glass-surface glass-hover rounded-xl flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${globalStats.overdue > 0 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"}`}
          >
            <AlertTriangle size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-500 font-medium truncate">Atrasadas</p>
            <p className="text-lg font-bold text-slate-800">{globalStats.overdue}</p>
          </div>
        </div>
      </div>

      {/* Contenedores de Normas ISO (Perfectamente simétricos y alineados) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-stretch">
        {stats.map((s) => (
          <Card
            key={s.standard}
            onClick={() => setActiveStd(s.standard === activeStd ? "all" : s.standard)}
            className={`p-4 cursor-pointer transition-all h-full flex flex-col justify-between ${
              activeStd === s.standard
                ? "border-blue-500 ring-2 ring-blue-100 bg-blue-50/10"
                : "hover:border-blue-300"
            }`}
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`p-2 rounded-lg shrink-0 ${
                      s.standard === "ISO 9001"
                        ? "bg-blue-100 text-blue-600"
                        : s.standard === "ISO 14001"
                          ? "bg-emerald-100 text-emerald-600"
                          : "bg-amber-100 text-amber-600"
                    }`}
                  >
                    <ShieldCheck size={20} />
                  </div>
                  <div className="min-w-0">
                    <span className="font-bold text-slate-800 text-sm block truncate">
                      {s.standard}
                    </span>
                    <span className="text-[11px] text-slate-500 block truncate">
                      {s.standard === "ISO 9001"
                        ? "Gestión de Calidad"
                        : s.standard === "ISO 14001"
                          ? "Gestión Ambiental"
                          : "Seguridad & Salud SST"}
                    </span>
                  </div>
                </div>
                {activeStd === s.standard && (
                  <Badge className="bg-blue-600 text-white border-transparent shrink-0 text-[10px]">
                    Filtrado
                  </Badge>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-1 text-xs mt-2">
              <div className="flex items-center gap-1 shrink-0">
                <AlertCircle size={13} className="text-red-500 shrink-0" />
                <span className="text-slate-600 font-medium">{s.open} ab.</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                <span className="text-slate-600 font-medium">{s.closed} cer.</span>
              </div>
              {s.overdue > 0 && (
                <Badge className="bg-red-50 text-red-700 border-red-200 text-[10px] shrink-0 px-1.5 py-0.5">
                  {s.overdue} venc.
                </Badge>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Control bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 glass-surface p-3 rounded-xl">
        <div className="flex flex-col sm:flex-row gap-2 flex-1">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por área, descripción o acción..."
              className="w-full pl-9 pr-3 py-1.5 text-xs glass-input border border-white/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-1.5 min-w-[160px]">
            <Filter size={14} className="text-slate-400 shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as IsoStatus | "all")}
              className="w-full text-xs glass-input border border-white/40 rounded-lg px-2 py-1.5 text-slate-700 focus:outline-none"
            >
              <option value="all">Todos los estados</option>
              <option value="Abierta">Abiertas</option>
              <option value="En proceso">En proceso</option>
              <option value="Cerrada">Cerradas</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={exportExcel}>
            <FileSpreadsheet size={15} /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={exportPdf}>
            <FileText size={15} /> PDF
          </Button>
          <Button size="sm" onClick={() => setModalOpen(true)}>
            <Plus size={15} /> Nuevo Hallazgo
          </Button>
        </div>
      </div>

      {/* Main card list */}
      <Card>
        <CardHeader
          title="Registro de Hallazgos y Plan de Acciones Correctivas"
          subtitle={`Mostrando ${filtered.length} de ${isoAudits.length} hallazgos registrados`}
        />
        {filtered.length === 0 ? (
          <EmptyState
            message="No se encontraron hallazgos que coincidan con los filtros"
            icon={<ShieldCheck size={32} />}
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((a) => {
              const isOverdue = a.status !== "Cerrada" && a.due_date && a.due_date < todayStr;
              return (
                <div key={a.id} className="px-5 py-4 hover:bg-white/40 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <Badge
                          className={
                            a.iso_standard === "ISO 9001"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : a.iso_standard === "ISO 14001"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                          }
                        >
                          {a.iso_standard}
                        </Badge>
                        <Badge className="bg-slate-100 text-slate-700 border-slate-200">
                          {a.finding_type}
                        </Badge>
                        <Badge className={statusBadge(a.status)}>{a.status}</Badge>

                        {a.due_date && (
                          <span
                            className={`text-xs flex items-center gap-1 font-medium px-2 py-0.5 rounded-md ${
                              isOverdue
                                ? "bg-red-100 text-red-700 font-bold"
                                : "text-slate-500 bg-slate-100"
                            }`}
                          >
                            <Clock size={12} />
                            {isOverdue ? `Vencido: ${a.due_date}` : `Vence: ${a.due_date}`}
                          </span>
                        )}
                      </div>

                      <p className="text-sm font-medium text-slate-800 mb-1.5">{a.description}</p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 bg-white/40 p-2.5 rounded-lg border border-white/30">
                        <p>
                          <span className="font-semibold text-slate-700">Área / Proceso:</span>{" "}
                          {a.area}
                        </p>
                        {a.created_at && (
                          <p>
                            <span className="font-semibold text-slate-700">Fecha registro:</span>{" "}
                            {new Date(a.created_at).toLocaleDateString("es-CL")}
                          </p>
                        )}
                        {a.corrective_action && (
                          <p className="col-span-1 sm:col-span-2">
                            <span className="font-semibold text-slate-700">
                              Acción correctiva (PAC):
                            </span>{" "}
                            {a.corrective_action}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 self-start shrink-0">
                      <select
                        value={a.status}
                        onChange={(e) => updateStatus(a, e.target.value as IsoStatus)}
                        className="text-xs glass-input border border-white/40 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="Abierta">Abierta</option>
                        <option value="En proceso">En proceso</option>
                        <option value="Cerrada">Cerrada</option>
                      </select>
                      {canDelete && (
                        <button
                          onClick={() => delAudit(a)}
                          className="p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded transition-colors"
                          title="Eliminar hallazgo"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Modal form */}
      {modalOpen && <IsoModal onClose={() => setModalOpen(false)} onSave={addAudit} />}
    </div>
  );
}

function IsoModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (f: Omit<IsoAudit, "id" | "created_at">) => void;
}) {
  const [form, setForm] = useState({
    iso_standard: "ISO 9001" as IsoStandard,
    finding_type: "No conformidad",
    description: "",
    area: "",
    corrective_action: "",
    status: "Abierta" as IsoStatus,
    due_date: "",
  });

  return (
    <Modal open onClose={onClose} title="Registrar Nuevo Hallazgo de Auditoría ISO">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave({
            ...form,
            due_date: form.due_date || null,
            corrective_action: form.corrective_action || null,
          });
        }}
        className="space-y-4"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Norma ISO Referencia"
            value={form.iso_standard}
            onChange={(e) => setForm({ ...form, iso_standard: e.target.value as IsoStandard })}
          >
            <option value="ISO 9001">ISO 9001:2015 (Calidad)</option>
            <option value="ISO 14001">ISO 14001:2015 (Medio Ambiente)</option>
            <option value="ISO 45001">ISO 45001:2018 (Seguridad y Salud SST)</option>
          </Select>

          <Select
            label="Tipo de Hallazgo"
            value={form.finding_type}
            onChange={(e) => setForm({ ...form, finding_type: e.target.value })}
          >
            <option value="No conformidad">No conformidad</option>
            <option value="Observación">Observación</option>
            <option value="Oportunidad de mejora">Oportunidad de mejora</option>
          </Select>

          <Input
            label="Área o Proceso Auditado"
            required
            placeholder="Ej: Mantenimiento, Bodega, Terreno, Operaciones"
            value={form.area}
            onChange={(e) => setForm({ ...form, area: e.target.value })}
          />

          <Input
            label="Fecha Límite Compromiso"
            type="date"
            value={form.due_date}
            onChange={(e) => setForm({ ...form, due_date: e.target.value })}
          />
        </div>

        <Textarea
          label="Descripción Detallada del Hallazgo / Evidencia"
          required
          rows={3}
          placeholder="Describa el hallazgo detectado, la cláusula de la norma o el estándar incumplido..."
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />

        <Textarea
          label="Acción Correctiva Planificada (PAC)"
          rows={2}
          placeholder="Plan de acción o medida inmediata para subsanar la causa raíz del hallazgo..."
          value={form.corrective_action}
          onChange={(e) => setForm({ ...form, corrective_action: e.target.value })}
        />

        <Select
          label="Estado Inicial del Hallazgo"
          value={form.status}
          onChange={(e) => setForm({ ...form, status: e.target.value as IsoStatus })}
        >
          <option value="Abierta">Abierta</option>
          <option value="En proceso">En proceso</option>
          <option value="Cerrada">Cerrada</option>
        </Select>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">
            <Plus size={15} /> Guardar Hallazgo
          </Button>
        </div>
      </form>
    </Modal>
  );
}
