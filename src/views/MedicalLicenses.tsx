import { useState, useMemo } from "react";
import {
  HeartPulse,
  Plus,
  Trash2,
  FileSpreadsheet,
  Calendar,
  Clock,
  User,
  Activity,
  AlertCircle,
  ExternalLink,
  Pencil,
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
import { ExportService } from "@/lib/export";
import { medicalLicenseRepo } from "@/lib/repositories";
import { audit } from "@/lib/audit";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/hooks/useConfirm";
import { useLoading } from "@/components/LoadingProvider";
import { ExpiryService } from "@/lib/expiry";
import type { MedicalLicense, MedicalLicenseType, MedicalLicenseStatus, Worker } from "@/lib/types";
import type { AppData } from "@/hooks/useAppData";

const LICENSE_TYPES: { value: MedicalLicenseType; label: string }[] = [
  { value: "enfermedad", label: "Enfermedad Común" },
  { value: "accidente", label: "Accidente del Trabajo" },
  { value: "maternal", label: "Licencia Maternal" },
  { value: "postnatal", label: "Postnatal" },
  { value: "patologia_grave", label: "Patología Grave" },
  { value: "licencia_preventiva", label: "Licencia Preventiva" },
];

const LICENSE_STATUSES: { value: MedicalLicenseStatus; label: string; badge: string }[] = [
  {
    value: "vigente",
    label: "Vigente",
    badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  { value: "vencida", label: "Vencida", badge: "bg-red-100 text-red-700 border-red-200" },
  { value: "ampliada", label: "Ampliada", badge: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: "rechazada", label: "Rechazada", badge: "bg-slate-100 text-slate-600 border-slate-200" },
];

function licenseTypeLabel(t: string): string {
  return LICENSE_TYPES.find((x) => x.value === t)?.label ?? t;
}

function statusMeta(s: string) {
  return LICENSE_STATUSES.find((x) => x.value === s) ?? LICENSE_STATUSES[0];
}

function computeDays(start: string, end: string): number {
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return 1;
  const diff = Math.round((e.getTime() - s.getTime()) / 86400000) + 1;
  return Math.max(diff, 1);
}

interface FormState {
  worker_rut: string;
  license_type: MedicalLicenseType;
  start_date: string;
  end_date: string;
  diagnosis: string;
  provider: string;
  document_url: string;
  status: MedicalLicenseStatus;
  notes: string;
}

const EMPTY_FORM: FormState = {
  worker_rut: "",
  license_type: "enfermedad",
  start_date: new Date().toISOString().slice(0, 10),
  end_date: new Date().toISOString().slice(0, 10),
  diagnosis: "",
  provider: "",
  document_url: "",
  status: "vigente",
  notes: "",
};

export function MedicalLicensesView({
  data,
  userRole,
  permissions,
}: {
  data: AppData;
  currentUserEmail?: string;
  userRole?: string;
  permissions?: Record<string, boolean>;
}) {
  const { medicalLicenses, workers, loading } = data;
  const canDelete = userRole === "superadmin" || !!permissions?.can_delete_medical_licenses;
  const toast = useToast();
  const { confirm } = useConfirm();
  const { runWithLoading } = useLoading();
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [filterWorker, setFilterWorker] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("");

  const workerName = (rut: string) => workers.find((w) => w.rut === rut)?.full_name ?? rut;
  const workerByRut = (rut: string): Worker | undefined => workers.find((w) => w.rut === rut);

  const filtered = useMemo(() => {
    return medicalLicenses.filter((l) => {
      if (
        filterWorker &&
        !l.worker_rut.toLowerCase().includes(filterWorker.toLowerCase()) &&
        !workerName(l.worker_rut).toLowerCase().includes(filterWorker.toLowerCase())
      )
        return false;
      if (filterStatus && l.status !== filterStatus) return false;
      return true;
    });
  }, [medicalLicenses, filterWorker, filterStatus, workers]); // eslint-disable-line react-hooks/exhaustive-deps -- reviewed dependency set; unstable callback recreation is intentional to avoid loops

  const stats = useMemo(() => {
    let vigente = 0,
      vencida = 0,
      ampliada = 0,
      totalDays = 0;
    for (const l of medicalLicenses) {
      if (l.status === "vigente") vigente++;
      else if (l.status === "vencida") vencida++;
      else if (l.status === "ampliada") ampliada++;
      totalDays += l.days;
    }
    return { vigente, vencida, ampliada, total: medicalLicenses.length, totalDays };
  }, [medicalLicenses]);

  function openCreate() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(l: MedicalLicense) {
    setEditId(l.id);
    setForm({
      worker_rut: l.worker_rut,
      license_type: l.license_type,
      start_date: l.start_date,
      end_date: l.end_date,
      diagnosis: l.diagnosis ?? "",
      provider: l.provider ?? "",
      document_url: l.document_url ?? "",
      status: l.status,
      notes: l.notes ?? "",
    });
    setModalOpen(true);
  }

  async function save() {
    if (!form.worker_rut.trim()) {
      toast.error("RUT requerido", "Debe seleccionar un trabajador");
      return;
    }
    const days = computeDays(form.start_date, form.end_date);
    const payload = {
      worker_rut: form.worker_rut,
      license_type: form.license_type,
      start_date: form.start_date,
      end_date: form.end_date,
      days,
      diagnosis: form.diagnosis || null,
      provider: form.provider || null,
      document_url: form.document_url || null,
      status: form.status,
      notes: form.notes || null,
    };
    try {
      await runWithLoading(async () => {
        if (editId) {
          await medicalLicenseRepo.update(editId, payload);
          await audit({
            action: "medical_license.update",
            entity: "medical_licenses",
            entity_id: editId,
            entity_label: `${workerName(form.worker_rut)} — ${licenseTypeLabel(form.license_type)}`,
          });
          toast.success("Licencia actualizada", workerName(form.worker_rut));
        } else {
          await medicalLicenseRepo.insert(payload);
          await audit({
            action: "medical_license.create",
            entity: "medical_licenses",
            entity_label: `${workerName(form.worker_rut)} — ${licenseTypeLabel(form.license_type)}`,
          });
          toast.success("Licencia registrada", workerName(form.worker_rut));
        }
        setModalOpen(false);
        await data.reload();
      });
    } catch (e) {
      toast.error("Error", (e as Error).message);
    }
  }

  async function remove(l: MedicalLicense) {
    const ok = await confirm({
      title: "Eliminar licencia médica",
      message: `¿Eliminar la licencia de ${workerName(l.worker_rut)} (${licenseTypeLabel(l.license_type)})?`,
      confirmText: "Eliminar",
      type: "danger",
    });
    if (!ok) return;
    try {
      await runWithLoading(async () => {
        await medicalLicenseRepo.remove(l.id);
        await audit({
          action: "medical_license.delete",
          entity: "medical_licenses",
          entity_id: l.id,
          entity_label: workerName(l.worker_rut),
        });
        toast.success("Licencia eliminada");
        await data.reload();
      });
    } catch (e) {
      toast.error("Error", (e as Error).message);
    }
  }

  function exportExcel() {
    ExportService.toExcel(
      filtered.map((l) => ({
        Trabajador: workerName(l.worker_rut),
        RUT: l.worker_rut,
        Tipo: licenseTypeLabel(l.license_type),
        Inicio: l.start_date,
        Fin: l.end_date,
        Días: l.days,
        Diagnóstico: l.diagnosis ?? "",
        Entidad: l.provider ?? "",
        Estado: statusMeta(l.status).label,
        Notas: l.notes ?? "",
      })),
      "Licencias Médicas",
      "licencias_medicas_sil_gyc",
    );
  }

  if (loading) return <Spinner />;

  return (
    <div className="space-y-5">
      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <HeartPulse size={18} className="text-rose-600" />
            <span className="text-xs text-slate-500">Total Licencias</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Activity size={18} className="text-emerald-600" />
            <span className="text-xs text-slate-500">Vigentes</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{stats.vigente}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle size={18} className="text-red-600" />
            <span className="text-xs text-slate-500">Vencidas</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{stats.vencida}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock size={18} className="text-blue-600" />
            <span className="text-xs text-slate-500">Días Totales</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{stats.totalDays}</p>
        </Card>
      </div>

      {/* Filters + actions */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 flex-1">
          <Input
            placeholder="Buscar por trabajador o RUT..."
            value={filterWorker}
            onChange={(e) => setFilterWorker(e.target.value)}
            className="sm:max-w-xs"
          />
          <Select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="sm:max-w-[180px]"
          >
            <option value="">Todos los estados</option>
            {LICENSE_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportExcel}>
            <FileSpreadsheet size={15} /> Excel
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus size={15} /> Nueva Licencia
          </Button>
        </div>
      </div>

      {/* List */}
      <Card>
        <CardHeader
          title="Licencias Médicas (SIL)"
          subtitle="Registro de Subsidios por Incapacidad Laboral — Ley 16.744 / SUSESO"
        />
        {filtered.length === 0 ? (
          <EmptyState
            message="No hay licencias médicas registradas"
            icon={<HeartPulse size={32} />}
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((l) => {
              const w = workerByRut(l.worker_rut);
              const expiry = ExpiryService.check(l.end_date);
              const sm = statusMeta(l.status);
              return (
                <div
                  key={l.id}
                  className="px-5 py-4 flex flex-col sm:flex-row sm:items-start gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <Badge className={sm.badge}>{sm.label}</Badge>
                      <Badge className="bg-rose-50 text-rose-700 border-rose-200">
                        {licenseTypeLabel(l.license_type)}
                      </Badge>
                      {l.status === "vigente" && expiry.status !== "vigente" && (
                        <Badge className={`border ${ExpiryService.color(expiry.status)}`}>
                          {expiry.label}
                          {expiry.daysRemaining !== null ? ` (${expiry.daysRemaining}d)` : ""}
                        </Badge>
                      )}
                    </div>
                    <p className="font-semibold text-slate-800">{w?.full_name ?? l.worker_rut}</p>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar size={13} /> {l.start_date} → {l.end_date}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={13} /> {l.days} día{l.days !== 1 ? "s" : ""}
                      </span>
                      {l.provider && (
                        <span className="flex items-center gap-1">
                          <User size={13} /> {l.provider}
                        </span>
                      )}
                    </div>
                    {l.diagnosis && (
                      <p className="mt-1 text-sm text-slate-600">
                        <strong>Diagnóstico:</strong> {l.diagnosis}
                      </p>
                    )}
                    {l.notes && <p className="mt-0.5 text-xs text-slate-400">{l.notes}</p>}
                    {l.document_url && (
                      <a
                        href={l.document_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
                      >
                        <ExternalLink size={12} /> Ver documento
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-1 self-start">
                    <button
                      onClick={() => openEdit(l)}
                      className="p-1.5 text-slate-500 hover:bg-blue-50 hover:text-blue-600 rounded"
                      title="Editar"
                    >
                      <Pencil size={15} />
                    </button>
                    {canDelete && (
                      <button
                        onClick={() => remove(l)}
                        className="p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 rounded"
                        title="Eliminar"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Modal */}
      {modalOpen && (
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editId ? "Editar Licencia Médica" : "Nueva Licencia Médica"}
          size="lg"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Trabajador</label>
              <Select
                value={form.worker_rut}
                onChange={(e) => setForm({ ...form, worker_rut: e.target.value })}
              >
                <option value="">Seleccionar trabajador...</option>
                {workers
                  .filter((w) => w.status === "ACTIVO")
                  .map((w) => (
                    <option key={w.id} value={w.rut}>
                      {w.full_name} — {w.rut}
                    </option>
                  ))}
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Tipo de Licencia
                </label>
                <Select
                  value={form.license_type}
                  onChange={(e) =>
                    setForm({ ...form, license_type: e.target.value as MedicalLicenseType })
                  }
                >
                  {LICENSE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Estado</label>
                <Select
                  value={form.status}
                  onChange={(e) =>
                    setForm({ ...form, status: e.target.value as MedicalLicenseStatus })
                  }
                >
                  {LICENSE_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Fecha de Inicio
                </label>
                <Input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Fecha de Fin
                </label>
                <Input
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                />
              </div>
            </div>

            <div className="px-3 py-2 bg-slate-50 rounded-lg text-sm text-slate-600">
              Días de licencia: <strong>{computeDays(form.start_date, form.end_date)}</strong>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Diagnóstico</label>
              <Input
                value={form.diagnosis}
                onChange={(e) => setForm({ ...form, diagnosis: e.target.value })}
                placeholder="Ej: Lumbago agudo"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Entidad (ACHS / ISAPRE / Mutual)
                </label>
                <Input
                  value={form.provider}
                  onChange={(e) => setForm({ ...form, provider: e.target.value })}
                  placeholder="Ej: ACHS"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  URL del documento
                </label>
                <Input
                  value={form.document_url}
                  onChange={(e) => setForm({ ...form, document_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Notas</label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                placeholder="Observaciones adicionales..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={save}>{editId ? "Guardar cambios" : "Registrar licencia"}</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
