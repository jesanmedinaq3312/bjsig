import { useState, useMemo } from "react";
import {
  Plus,
  Trash2,
  ExternalLink,
  Cloud,
  FileSpreadsheet,
  FileText,
  Search,
  Pencil,
  Save,
  AlertCircle,
  CheckCircle2,
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
  InfoTooltip,
} from "@/components/ui";
import { ExportService } from "@/lib/export";
import { getCompanyName } from "@/lib/logo";
import { ExpiryService } from "@/lib/expiry";
import { cloudDocRepo } from "@/lib/repositories";
import { audit } from "@/lib/audit";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/hooks/useConfirm";
import { useLoading } from "@/components/LoadingProvider";
import type { CloudDocument, CloudProvider, CloudDocStatus } from "@/lib/types";
import type { AppData } from "@/hooks/useAppData";

const PROVIDERS: CloudProvider[] = [
  "Google Drive",
  "OneDrive",
  "TeraBox",
  "Dropbox",
  "URL Directa",
];

const CATEGORIES = [
  "Cédula de Identidad",
  "Licencia de Conducir (A1/A2/A4/B/D)",
  "Examen Ocupacional / Preocupacional",
  "Inducción ODI / IRL (DS 44)",
  "Certificación de Competencias (Rigger, Soldador, Electricista SEC)",
  "Contrato de Trabajo / Anexos",
  "Currículum Vitae",
  "Certificado de Antecedentes",
  "Ficha de Salud",
  "Otro",
];

const PROVIDER_COLORS: Record<CloudProvider, string> = {
  "Google Drive": "bg-blue-50 text-blue-700 border-blue-200",
  OneDrive: "bg-cyan-50 text-cyan-700 border-cyan-200",
  TeraBox: "bg-violet-50 text-violet-700 border-violet-200",
  Dropbox: "bg-indigo-50 text-indigo-700 border-indigo-200",
  "URL Directa": "bg-slate-50 text-slate-700 border-slate-200",
};

function computeStatus(expDate: string | null): CloudDocStatus {
  if (!expDate) return "FALTANTE";
  const check = ExpiryService.check(expDate);
  if (check.status === "vencido") return "VENCIDO";
  if (check.status === "por-vencer") return "POR_VENCER";
  return "VIGENTE";
}

const STATUS_BADGE: Record<CloudDocStatus, string> = {
  VIGENTE: "bg-emerald-100 text-emerald-700 border-emerald-200",
  POR_VENCER: "bg-amber-100 text-amber-700 border-amber-200",
  VENCIDO: "bg-red-100 text-red-700 border-red-200",
  FALTANTE: "bg-slate-100 text-slate-500 border-slate-200",
};

type DocFormState = {
  worker_rut: string;
  category: string;
  provider: CloudProvider;
  url: string;
  expiration_date: string;
};

export function CloudDocsView({
  data,
  userRole,
  permissions,
}: {
  data: AppData;
  userRole?: string;
  permissions?: Record<string, boolean>;
}) {
  const { cloudDocs, workers, loading } = data;
  const canDelete = userRole === "superadmin" || !!permissions?.can_delete_clouddocs;
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CloudDocument | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const toast = useToast();
  const { confirm } = useConfirm();
  const { runWithLoading } = useLoading();

  const workerName = (rut: string | null) =>
    workers.find((w) => w.rut === rut)?.full_name ?? rut ?? "—";

  const filtered = useMemo(() => {
    return cloudDocs.filter((d) => {
      if (filterStatus !== "all" && d.status !== filterStatus) return false;
      if (search) {
        const q = search.toLowerCase();
        const w = workers.find((wk) => wk.rut === d.worker_rut);
        if (!(
          d.category.toLowerCase().includes(q) ||
          d.provider.toLowerCase().includes(q) ||
          (w?.full_name.toLowerCase().includes(q) ?? false) ||
          (d.worker_rut ?? "").includes(q)
        ))
          return false;
      }
      return true;
    });
  }, [cloudDocs, filterStatus, search, workers]);

  const counts = useMemo(() => {
    const c: Record<CloudDocStatus, number> = {
      VIGENTE: 0,
      POR_VENCER: 0,
      VENCIDO: 0,
      FALTANTE: 0,
    };
    cloudDocs.forEach((d) => {
      c[d.status]++;
    });
    return c;
  }, [cloudDocs]);

  async function addDoc(form: DocFormState) {
    setSaving(true);
    try {
      await runWithLoading(async () => {
        const status = computeStatus(form.expiration_date || null);
        await cloudDocRepo.insert({
          ...form,
          worker_id: null,
          expiration_date: form.expiration_date || null,
          status,
        });
        await audit({
          action: "clouddoc.create",
          entity: "cloud_documents",
          entity_label: `${form.category} — ${form.worker_rut}`,
        });
        setModalOpen(false);
        toast.success(editing ? "Documento actualizado" : "Documento creado", form.category);
        await data.reload();
      });
    } catch (e) {
      toast.error("Error", (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function updateDoc(id: string, form: DocFormState) {
    setSaving(true);
    try {
      await runWithLoading(async () => {
        const status = computeStatus(form.expiration_date || null);
        await cloudDocRepo.update(id, {
          ...form,
          worker_id: null,
          expiration_date: form.expiration_date || null,
          status,
        });
        await audit({
          action: "clouddoc.update",
          entity: "cloud_documents",
          entity_id: id,
          entity_label: `${form.category} — ${form.worker_rut}`,
        });
        setEditing(null);
        toast.success("Documento actualizado", form.category);
        await data.reload();
      });
    } catch (e) {
      toast.error("Error", (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function delDoc(d: CloudDocument) {
    const ok = await confirm({
      title: "Eliminar documento",
      message: `¿Eliminar el enlace de "${d.category}"? Esta acción no se puede deshacer.`,
      confirmText: "Eliminar",
      type: "danger",
    });
    if (!ok) return;
    try {
      await runWithLoading(async () => {
        await cloudDocRepo.remove(d.id);
        await audit({
          action: "clouddoc.delete",
          entity: "cloud_documents",
          entity_id: d.id,
          entity_label: d.category,
        });
        toast.success("Documento eliminado", d.category);
        await data.reload();
      });
    } catch (e) {
      toast.error("Error", (e as Error).message);
    }
  }

  function exportExcel() {
    ExportService.toExcel(
      filtered.map((d) => ({
        Trabajador: workerName(d.worker_rut),
        Categoría: d.category,
        Proveedor: d.provider,
        URL: d.url,
        Vencimiento: d.expiration_date ?? "Sin fecha",
        Estado: d.status,
      })),
      "Documentos Nube",
      "documentos_nube_gyc",
    );
  }
  function exportPdf() {
    ExportService.toPdf(
      `Matriz de Documentos en la Nube — ${getCompanyName()}`,
      ["Trabajador", "Categoría", "Proveedor", "Vencimiento", "Estado"],
      filtered.map((d) => [
        workerName(d.worker_rut),
        d.category,
        d.provider,
        d.expiration_date ?? "—",
        d.status,
      ]),
      "documentos_nube_gyc",
      "Enlaces a Google Drive · OneDrive · TeraBox · Dropbox · URL Directa",
    );
  }

  if (loading) return <Spinner />;

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {(["VIGENTE", "POR_VENCER", "VENCIDO", "FALTANTE"] as CloudDocStatus[]).map((s) => (
          <Card key={s} className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">{s}</span>
              <Badge className={STATUS_BADGE[s]}>{counts[s]}</Badge>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Cloud size={20} className="text-blue-600" />
          <h2 className="text-lg font-semibold text-slate-800">Documentos en la Nube</h2>
          <InfoTooltip text="Pega aquí el enlace público o compartido de tu nube (Google Drive, OneDrive, TeraBox, Dropbox o URL directa). El sistema calcula automáticamente el semáforo de vencimiento según la fecha ingresada." />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportExcel}>
            <FileSpreadsheet size={15} /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={exportPdf}>
            <FileText size={15} /> PDF
          </Button>
          <Button size="sm" onClick={() => setModalOpen(true)}>
            <Plus size={15} /> Nuevo Enlace
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por trabajador, categoría o proveedor..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <Select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="max-w-xs"
        >
          <option value="all">Todos los estados</option>
          <option value="VIGENTE">Vigente</option>
          <option value="POR_VENCER">Por vencer</option>
          <option value="VENCIDO">Vencido</option>
          <option value="FALTANTE">Faltante</option>
        </Select>
      </div>

      <Card>
        <CardHeader
          title="Enlaces de Documentos por Trabajador"
          subtitle="Trazabilidad de documentos en la nube con semáforo de vencimiento automático"
        />
        {filtered.length === 0 ? (
          <EmptyState
            message="No hay documentos en la nube registrados"
            icon={<Cloud size={32} />}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs text-slate-500 uppercase">
                  <th className="px-4 py-2.5 font-medium">Trabajador</th>
                  <th className="px-4 py-2.5 font-medium">Categoría</th>
                  <th className="px-4 py-2.5 font-medium">Proveedor</th>
                  <th className="px-4 py-2.5 font-medium">Vencimiento</th>
                  <th className="px-4 py-2.5 font-medium">Estado</th>
                  <th className="px-4 py-2.5 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <tr
                    key={d.id}
                    className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {workerName(d.worker_rut)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{d.category}</td>
                    <td className="px-4 py-3">
                      <Badge className={PROVIDER_COLORS[d.provider]}>{d.provider}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{d.expiration_date ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Badge className={STATUS_BADGE[d.status]}>{d.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <a
                          href={d.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Abrir documento"
                        >
                          <ExternalLink size={15} />
                        </a>
                        <button
                          onClick={() => setEditing(d)}
                          className="p-1.5 text-slate-500 hover:bg-blue-50 hover:text-blue-600 rounded transition-colors"
                          title="Editar documento"
                        >
                          <Pencil size={15} />
                        </button>
                        {canDelete && (
                          <button
                            onClick={() => delDoc(d)}
                            className="p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 rounded transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {modalOpen && (
        <CloudDocModal
          workers={workers}
          saving={saving}
          onClose={() => setModalOpen(false)}
          onSave={addDoc}
        />
      )}

      {editing && (
        <CloudDocModal
          workers={workers}
          doc={editing}
          saving={saving}
          onClose={() => setEditing(null)}
          onSave={(form) => updateDoc(editing.id, form)}
        />
      )}
    </div>
  );
}

function CloudDocModal({
  workers,
  doc,
  saving,
  onClose,
  onSave,
}: {
  workers: AppData["workers"];
  doc?: CloudDocument;
  saving: boolean;
  onClose: () => void;
  onSave: (f: DocFormState) => void;
}) {
  const [form, setForm] = useState<DocFormState>({
    worker_rut: doc?.worker_rut ?? workers[0]?.rut ?? "",
    category: doc?.category ?? CATEGORIES[0],
    provider: (doc?.provider ?? "Google Drive") as CloudProvider,
    url: doc?.url ?? "",
    expiration_date: doc?.expiration_date ?? "",
  });
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.url.trim()) {
      setError("La URL del documento es obligatoria");
      return;
    }
    setError(null);
    onSave(form);
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={doc ? "Editar Documento en la Nube" : "Nuevo Enlace de Documento en la Nube"}
      size="lg"
    >
      <form onSubmit={submit} className="space-y-4">
        <Select
          label="Trabajador"
          value={form.worker_rut}
          onChange={(e) => setForm({ ...form, worker_rut: e.target.value })}
        >
          {workers.map((w) => (
            <option key={w.rut} value={w.rut}>
              {w.full_name} — {w.rut}
            </option>
          ))}
        </Select>
        <Select
          label="Categoría de Documento"
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Proveedor de Nube"
            value={form.provider}
            onChange={(e) => setForm({ ...form, provider: e.target.value as CloudProvider })}
          >
            {PROVIDERS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
          <Input
            label="Fecha de Vencimiento (opcional)"
            type="date"
            value={form.expiration_date}
            onChange={(e) => setForm({ ...form, expiration_date: e.target.value })}
          />
        </div>
        <Input
          label="URL del Documento"
          required
          value={form.url}
          onChange={(e) => setForm({ ...form, url: e.target.value })}
          placeholder="https://drive.google.com/..."
        />

        {/* Preview */}
        {form.url.trim() && (
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-xs text-slate-500">Vista previa:</span>
            <a
              href={form.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 truncate"
            >
              <ExternalLink size={12} /> {form.url}
            </a>
          </div>
        )}

        {/* Status preview */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Estado calculado:</span>
          <Badge className={STATUS_BADGE[computeStatus(form.expiration_date || null)]}>
            {computeStatus(form.expiration_date || null)}
          </Badge>
        </div>

        {error && (
          <div className="flex items-start gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            {!saving && (doc ? <Save size={15} /> : <CheckCircle2 size={15} />)}
            {doc ? "Guardar Cambios" : "Guardar Enlace"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
