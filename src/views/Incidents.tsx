import { useState, useMemo } from "react";
import {
  Plus,
  Trash2,
  FileSpreadsheet,
  FileText,
  AlertTriangle,
  FileWarning,
  FileType,
  ChevronLeft,
  ChevronRight,
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
  InfoTooltip,
} from "@/components/ui";
import { ExportService } from "@/lib/export";
import { getCompanyName } from "@/lib/logo";
import { incidentRepo } from "@/lib/repositories";
import { audit } from "@/lib/audit";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/hooks/useConfirm";
import { useLoading } from "@/components/LoadingProvider";
import { usePagination } from "@/hooks/usePagination";
import type { Incident, IncidentType, IncidentSeverity, IncidentCategory } from "@/lib/types";
import type { AppData } from "@/hooks/useAppData";

export function IncidentsView({
  data,
  userRole,
  permissions,
}: {
  data: AppData;
  userRole?: string;
  permissions?: Record<string, boolean>;
}) {
  const { incidents, workers, loading } = data;
  const canDelete = userRole === "superadmin" || !!permissions?.can_delete_incidents;
  const [modalOpen, setModalOpen] = useState(false);
  const [diatModal, setDiatModal] = useState<Incident | null>(null);
  const [filterType, setFilterType] = useState<string>("");
  const toast = useToast();
  const { confirm } = useConfirm();
  const { runWithLoading } = useLoading();

  const workerName = (rut: string | null) =>
    workers.find((w) => w.rut === rut)?.full_name ?? "No asignado";

  const filtered = useMemo(() => {
    if (!filterType) return incidents;
    return incidents.filter((i) => i.type === filterType);
  }, [incidents, filterType]);

  const { page, totalPages, pageItems, setPage, total } = usePagination(filtered, 50);

  async function addIncident(form: Omit<Incident, "id" | "created_at">) {
    try {
      await runWithLoading(async () => {
        await incidentRepo.insert(form);
        await audit({
          action: "incident.create",
          entity: "incidents_ds44",
          entity_label: `${form.type} — ${form.event_date}`,
        });
        setModalOpen(false);
        toast.success("Incidente registrado", `${form.type} — ${form.event_date}`);
        await data.reload();
      });
    } catch (e) {
      toast.error("Error", (e as Error).message);
    }
  }
  async function delIncident(i: Incident) {
    const ok = await confirm({
      title: "Eliminar incidente",
      message: "¿Seguro que deseas eliminar este incidente? Esta acción no se puede deshacer.",
      confirmText: "Eliminar",
      type: "danger",
    });
    if (!ok) return;
    try {
      await runWithLoading(async () => {
        await incidentRepo.remove(i.id);
        await audit({
          action: "incident.delete",
          entity: "incidents_ds44",
          entity_id: i.id,
          entity_label: i.description.slice(0, 80),
        });
        toast.success("Incidente eliminado");
        await data.reload();
      });
    } catch (e) {
      toast.error("Error", (e as Error).message);
    }
  }

  function exportExcel() {
    ExportService.toExcel(
      filtered.map((i) => ({
        Fecha: i.event_date,
        Tipo: i.type,
        Severidad: i.severity,
        Trabajador: workerName(i.worker_rut),
        "Días Perdidos": i.days_lost,
        Descripción: i.description,
        "Causa Raíz": i.root_cause_analysis ?? "",
        "Acción Correctiva": i.corrective_action ?? "",
        "Reportado ACHS": i.reported_to_achs ? "Sí" : "No",
        "DIAT/DIEP": i.diat_dieg_required ? "Sí" : "No",
      })),
      "Incidentes",
      "incidentes_ds44_gyc",
    );
  }
  function exportPdf() {
    ExportService.toPdf(
      "Libro Digital de Incidentes — DS 44",
      ["Fecha", "Tipo", "Severidad", "Trabajador", "Días", "Descripción", "ACHS"],
      filtered.map((i) => [
        i.event_date,
        i.type,
        i.severity,
        workerName(i.worker_rut),
        i.days_lost,
        i.description.slice(0, 60),
        i.reported_to_achs ? "Sí" : "No",
      ]),
      "incidentes_ds44_gyc",
      `${getCompanyName()} · Registro DS 44`,
    );
  }

  async function exportWord() {
    await ExportService.toWord(
      "Reporte de Investigación de Accidentes — DS 44 / Ley 16.744",
      `Libro Digital de Incidentes y Cuasi-Accidentes · ${getCompanyName()} SIG`,
      [
        {
          heading: "Resumen de Incidentes",
          paragraphs: [
            `Total de incidentes registrados en el período: ${filtered.length}.`,
            `Accidentes: ${filtered.filter((i) => i.type === "Accidente").length} | Casi-accidentes: ${filtered.filter((i) => i.type === "Casi-accidente").length} | Condiciones inseguras: ${filtered.filter((i) => i.type === "Condición insegura").length}.`,
            `Incidentes reportados a la ACHS: ${filtered.filter((i) => i.reported_to_achs).length}.`,
            `Días perdidos totales: ${filtered.reduce((s, i) => s + i.days_lost, 0)}.`,
          ],
        },
        {
          heading: "Detalle de Investigaciones",
          paragraphs: filtered.map(
            (i) =>
              `Fecha: ${i.event_date} | Tipo: ${i.type} | Severidad: ${i.severity} | Trabajador: ${workerName(i.worker_rut)} | Días perdidos: ${i.days_lost}. Descripción: ${i.description}. Causa raíz: ${i.root_cause_analysis ?? "Sin análisis"}. Acción correctiva: ${i.corrective_action ?? "Sin acción"}.`,
          ),
        },
      ],
      {
        headers: ["Fecha", "Tipo", "Severidad", "Trabajador", "Días", "ACHS"],
        rows: filtered.map((i) => [
          i.event_date,
          i.type,
          i.severity,
          workerName(i.worker_rut),
          i.days_lost,
          i.reported_to_achs ? "Sí" : "No",
        ]),
      },
      "reporte_incidentes_ds44_gyc",
    );
  }

  if (loading) return <Spinner />;

  const sevBadge = (s: IncidentSeverity) =>
    s === "Grave" || s === "Fatal"
      ? "bg-red-100 text-red-700 border-red-200"
      : s === "Moderado"
        ? "bg-amber-100 text-amber-700 border-amber-200"
        : "bg-emerald-100 text-emerald-700 border-emerald-200";

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="max-w-xs"
          >
            <option value="">Todos los tipos</option>
            <option value="Accidente">Accidente</option>
            <option value="Casi-accidente">Casi-accidente</option>
            <option value="Condición insegura">Condición insegura</option>
            <option value="Enfermedad profesional">Enfermedad profesional</option>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportExcel}>
            <FileSpreadsheet size={15} /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={exportPdf}>
            <FileText size={15} /> PDF
          </Button>
          <Button variant="outline" size="sm" onClick={exportWord}>
            <FileType size={15} /> Word
          </Button>
          <Button size="sm" onClick={() => setModalOpen(true)}>
            <Plus size={15} /> Registrar Incidente
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader
          title="Libro Digital de Incidentes y Cuasi-Accidentes"
          subtitle="DS 44 — registro de eventos sin daño, condiciones inseguras y accidentes"
          action={
            <InfoTooltip
              text="El DS 44 exige registrar todo incidente y cuasi-accidente. Los accidentes con tiempo perdido (CTP) deben denunciarse inmediatamente a la ACHS mediante DIAT/DIEP (Ley 16.744)."
              size={16}
            />
          }
        />
        {filtered.length === 0 ? (
          <EmptyState message="No hay incidentes registrados" icon={<AlertTriangle size={32} />} />
        ) : (
          <>
            <div className="divide-y divide-slate-100">
              {pageItems.map((i) => (
                <div key={i.id} className="px-5 py-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <Badge className="bg-slate-100 text-slate-600 border-slate-200">
                          {i.event_date}
                        </Badge>
                        <Badge className={sevBadge(i.severity)}>{i.severity}</Badge>
                        <Badge className="bg-blue-50 text-blue-700 border-blue-200">{i.type}</Badge>
                        {i.reported_to_achs && (
                          <Badge className="bg-red-50 text-red-700 border-red-200">
                            Reportado ACHS
                          </Badge>
                        )}
                        {i.diat_dieg_required && (
                          <Badge className="bg-purple-50 text-purple-700 border-purple-200">
                            DIAT/DIEP
                          </Badge>
                        )}
                        {i.days_lost > 0 && (
                          <Badge className="bg-amber-50 text-amber-700 border-amber-200">
                            {i.days_lost} días perdidos
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-700 mb-1">{i.description}</p>
                      <p className="text-xs text-slate-500">
                        <span className="font-medium">Trabajador:</span> {workerName(i.worker_rut)}
                      </p>
                      {i.root_cause_analysis && (
                        <p className="text-xs text-slate-500 mt-1">
                          <span className="font-medium">Causa raíz:</span> {i.root_cause_analysis}
                        </p>
                      )}
                      {i.corrective_action && (
                        <p className="text-xs text-slate-500 mt-1">
                          <span className="font-medium">Acción correctiva:</span>{" "}
                          {i.corrective_action}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1 self-start">
                      {i.diat_dieg_required && (
                        <button
                          onClick={() => setDiatModal(i)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                          title="Generar DIAT/DIEP"
                        >
                          <FileWarning size={15} />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => delIncident(i)}
                          className="p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 rounded"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
                <span className="text-xs text-slate-500">
                  Página {page} de {totalPages} · {total} incidentes
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="px-3 text-xs font-medium text-slate-700">
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {modalOpen && (
        <IncidentModal workers={workers} onClose={() => setModalOpen(false)} onSave={addIncident} />
      )}
      {diatModal && (
        <DiatModal
          incident={diatModal}
          workerName={workerName(diatModal.worker_rut)}
          onClose={() => setDiatModal(null)}
        />
      )}
    </div>
  );
}

function IncidentModal({
  workers,
  onClose,
  onSave,
}: {
  workers: AppData["workers"];
  onClose: () => void;
  onSave: (f: Omit<Incident, "id" | "created_at">) => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState({
    event_date: new Date().toISOString().slice(0, 10),
    type: "Casi-accidente" as IncidentType,
    category: "CUASI" as IncidentCategory,
    severity: "Leve" as IncidentSeverity,
    location: "",
    description: "",
    root_cause_analysis: "",
    corrective_action: "",
    reported_to_achs: false,
    diat_dieg_required: false,
    worker_rut: "",
    days_lost: 0,
    days_charge: 0,
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.description.trim()) {
      toast.warning("Descripción requerida", "Debes ingresar una descripción del evento");
      return;
    }
    onSave({
      ...form,
      incident_code: null,
      worker_rut: form.worker_rut || null,
      root_cause_analysis: form.root_cause_analysis || null,
      corrective_action: form.corrective_action || null,
      location: form.location || null,
      days_charge: form.days_charge,
      consent_given_at: null,
    });
  }

  return (
    <Modal open onClose={onClose} title="Registrar Incidente (DS 44)" size="lg">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Fecha del Evento"
            type="date"
            required
            value={form.event_date}
            onChange={(e) => setForm({ ...form, event_date: e.target.value })}
          />
          <Select
            label="Tipo"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value as IncidentType })}
          >
            <option value="Accidente">Accidente</option>
            <option value="Casi-accidente">Casi-accidente</option>
            <option value="Condición insegura">Condición insegura</option>
            <option value="Enfermedad profesional">Enfermedad profesional</option>
          </Select>
          <Select
            label="Categoría"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value as IncidentCategory })}
          >
            <option value="CTP">CTP (con tiempo perdido)</option>
            <option value="STP">STP (sin tiempo perdido)</option>
            <option value="CUASI">CUASI (cuasi-accidente)</option>
            <option value="CONDICION">CONDICION (insegura)</option>
            <option value="ENF_PROF">ENF_PROF (enfermedad profesional)</option>
          </Select>
          <Select
            label="Severidad"
            value={form.severity}
            onChange={(e) => setForm({ ...form, severity: e.target.value as IncidentSeverity })}
          >
            <option value="Leve">Leve</option>
            <option value="Moderado">Moderado</option>
            <option value="Grave">Grave</option>
            <option value="Fatal">Fatal</option>
          </Select>
        </div>
        <Textarea
          label="Descripción del Evento"
          required
          rows={3}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <Input
          label="Ubicación / Lugar"
          value={form.location}
          onChange={(e) => setForm({ ...form, location: e.target.value })}
          placeholder="Planta / Sector / Área"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Trabajador Involucrado"
            value={form.worker_rut}
            onChange={(e) => setForm({ ...form, worker_rut: e.target.value })}
          >
            <option value="">No asignado / condición insegura</option>
            {workers.map((w) => (
              <option key={w.rut} value={w.rut}>
                {w.full_name} — {w.rut}
              </option>
            ))}
          </Select>
          <div className="grid grid-cols-2 gap-2">
            <Input
              label="Días Perdidos"
              type="number"
              min={0}
              value={form.days_lost}
              onChange={(e) => setForm({ ...form, days_lost: Number(e.target.value) })}
            />
            <Input
              label="Días de Carga"
              type="number"
              min={0}
              value={form.days_charge}
              onChange={(e) => setForm({ ...form, days_charge: Number(e.target.value) })}
            />
          </div>
        </div>
        <Textarea
          label="Análisis de Causa Raíz"
          rows={2}
          value={form.root_cause_analysis}
          onChange={(e) => setForm({ ...form, root_cause_analysis: e.target.value })}
        />
        <Textarea
          label="Acción Correctiva"
          rows={2}
          value={form.corrective_action}
          onChange={(e) => setForm({ ...form, corrective_action: e.target.value })}
        />
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.reported_to_achs}
              onChange={(e) => setForm({ ...form, reported_to_achs: e.target.checked })}
              className="rounded"
            />
            Reportado a la ACHS
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.diat_dieg_required}
              onChange={(e) => setForm({ ...form, diat_dieg_required: e.target.checked })}
              className="rounded"
            />
            Requiere DIAT/DIEP
          </label>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">Guardar</Button>
        </div>
      </form>
    </Modal>
  );
}

function DiatModal({
  incident,
  workerName,
  onClose,
}: {
  incident: Incident;
  workerName: string;
  onClose: () => void;
}) {
  function exportDiat() {
    ExportService.toPdf(
      "Denuncia Individual de Accidente del Trabajo (DIAT)",
      ["Campo", "Dato"],
      [
        ["Fecha del accidente", incident.event_date],
        ["Tipo", incident.type],
        ["Severidad", incident.severity],
        ["Trabajador", workerName],
        ["RUT", incident.worker_rut ?? "—"],
        ["Días perdidos", String(incident.days_lost)],
        ["Descripción", incident.description],
        ["Causa raíz", incident.root_cause_analysis ?? "—"],
        ["Acción correctiva", incident.corrective_action ?? "—"],
        ["Reportado a ACHS", incident.reported_to_achs ? "Sí" : "No"],
      ],
      `DIAT_${incident.event_date}`,
      "Pre-llenado DIAT/DIEP — Presentar a ACHS / Mutual",
    );
    onClose();
  }

  return (
    <Modal open onClose={onClose} title="Pre-llenado DIAT / DIEP" size="lg">
      <div className="space-y-4">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
          Formulario pre-llenado para la Denuncia Individual de Accidente del Trabajo requerida
          inmediatamente por la ACHS.
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <Field label="Fecha" value={incident.event_date} />
          <Field label="Trabajador" value={workerName} />
          <Field label="RUT" value={incident.worker_rut ?? "—"} />
          <Field label="Severidad" value={incident.severity} />
          <Field label="Días perdidos" value={String(incident.days_lost)} />
          <Field label="Reportado ACHS" value={incident.reported_to_achs ? "Sí" : "No"} />
        </div>
        <div className="text-sm">
          <p className="font-medium text-slate-700 mb-1">Descripción:</p>
          <p className="text-slate-600 bg-slate-50 p-3 rounded-lg">{incident.description}</p>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
          <Button onClick={exportDiat}>
            <FileText size={15} /> Exportar DIAT PDF
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-surface rounded-lg px-3 py-2">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="font-medium text-slate-800">{value}</p>
    </div>
  );
}
