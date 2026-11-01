import { useState, useMemo } from "react";
import {
  Plus,
  Trash2,
  FileSpreadsheet,
  GraduationCap,
  Clock,
  Users,
  CheckCircle2,
  TrendingUp,
  ChevronDown,
  ChevronRight,
  Calendar,
  Save,
  ChevronLeft,
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
} from "@/components/ui";
import { ExportService } from "@/lib/export";
import { trainingRepo, hhcRepo, trainingAttRepo } from "@/lib/repositories";
import { audit } from "@/lib/audit";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/hooks/useConfirm";
import { useLoading } from "@/components/LoadingProvider";
import { usePagination } from "@/hooks/usePagination";
import type { Training, HhcPlan, TrainingAttendance } from "@/lib/types";
import type { AppData } from "@/hooks/useAppData";

export function TrainingsView({
  data,
  userRole,
  permissions,
}: {
  data: AppData;
  userRole?: string;
  permissions?: Record<string, boolean>;
}) {
  const { trainings, workers, hhcPlans, trainingAttendance, loading } = data;
  const canDelete = userRole === "superadmin" || !!permissions?.can_delete_trainings;
  const toast = useToast();
  const { confirm } = useConfirm();
  const { runWithLoading } = useLoading();
  const [modalOpen, setModalOpen] = useState(false);
  const [hhcModal, setHhcModal] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailTraining, setDetailTraining] = useState<Training | null>(null);
  const workerName = (rut: string) => workers.find((w) => w.rut === rut)?.full_name ?? rut;

  const totalHours = useMemo(() => trainings.reduce((s, t) => s + Number(t.hours), 0), [trainings]);
  const totalCompleted = useMemo(
    () => trainingAttendance.reduce((s, a) => s + Number(a.completed_hours), 0),
    [trainingAttendance],
  );
  const totalAttendees = useMemo(
    () => trainings.reduce((s, t) => s + t.attendees_rut_list.length, 0),
    [trainings],
  );
  const completionPct =
    totalHours > 0 ? Math.min(Math.round((totalCompleted / totalHours) * 100), 100) : 0;

  const {
    page: trainPage,
    totalPages: trainTotalPages,
    pageItems: trainPageItems,
    setPage: setTrainPage,
    total: trainTotal,
  } = usePagination(trainings, 50);

  function attendanceFor(trainingId: string): TrainingAttendance[] {
    return trainingAttendance.filter((a) => a.training_id === trainingId);
  }

  function completedHoursFor(trainingId: string): number {
    return attendanceFor(trainingId).reduce((s, a) => s + Number(a.completed_hours), 0);
  }

  async function addTraining(form: Omit<Training, "id" | "created_at">) {
    try {
      await runWithLoading(async () => {
        await trainingRepo.insert(form);
        await audit({
          action: "training.create",
          entity: "trainings_ds44",
          entity_label: `${form.topic} — ${form.date}`,
        });
        setModalOpen(false);
        toast.success("Capacitación creada", form.topic);
        await data.reload();
      });
    } catch (e) {
      toast.error("Error", (e as Error).message);
    }
  }

  async function delTraining(t: Training) {
    const ok = await confirm({
      title: "Eliminar capacitación",
      message: `¿Seguro que deseas eliminar "${t.topic}"? Esta acción no se puede deshacer.`,
      confirmText: "Eliminar",
      type: "danger",
    });
    if (!ok) return;
    try {
      await runWithLoading(async () => {
        await trainingRepo.remove(t.id);
        await audit({
          action: "training.delete",
          entity: "trainings_ds44",
          entity_id: t.id,
          entity_label: t.topic,
        });
        toast.success("Capacitación eliminada", t.topic);
        await data.reload();
      });
    } catch (e) {
      toast.error("Error", (e as Error).message);
    }
  }

  async function saveHhc(form: Omit<HhcPlan, "id" | "created_at">) {
    try {
      await runWithLoading(async () => {
        await hhcRepo.insert(form);
        await audit({ action: "hhc.create", entity: "hhc_plan", entity_label: String(form.year) });
        setHhcModal(false);
        toast.success("Plan HHC creado", `Año ${form.year}`);
        await data.reload();
      });
    } catch (e) {
      toast.error("Error", (e as Error).message);
    }
  }

  async function saveAttendance(
    trainingId: string,
    workerRut: string,
    hours: number,
    date: string,
    notes?: string,
  ) {
    try {
      await runWithLoading(async () => {
        const existing = trainingAttendance.find(
          (a) =>
            a.training_id === trainingId &&
            a.worker_rut === workerRut &&
            a.attendance_date === date,
        );
        if (existing) {
          await trainingAttRepo.update(existing.id, {
            completed_hours: hours,
            notes: notes ?? existing.notes,
          });
        } else {
          await trainingAttRepo.insert({
            training_id: trainingId,
            worker_rut: workerRut,
            completed_hours: hours,
            attendance_date: date,
            notes: notes ?? null,
          });
        }
        await audit({
          action: "training.attendance_update",
          entity: "training_attendance",
          entity_label: `${workerRut} — ${hours}h`,
          details: {
            training_id: trainingId,
            worker_rut: workerRut,
            completed_hours: hours,
            attendance_date: date,
          },
        });
        toast.success("Asistencia registrada", `${workerRut} — ${hours}h`);
        await data.reload();
      });
    } catch (e) {
      toast.error("Error", (e as Error).message);
    }
  }

  async function deleteAttendance(attId: string) {
    try {
      await runWithLoading(async () => {
        await trainingAttRepo.remove(attId);
        toast.success("Registro eliminado");
        await data.reload();
      });
    } catch (e) {
      toast.error("Error", (e as Error).message);
    }
  }

  function exportExcel() {
    ExportService.toExcel(
      trainings.map((t) => ({
        Fecha: t.date,
        Tema: t.topic,
        Horas: t.hours,
        Instructor: t.trainer,
        Asistentes: t.attendees_rut_list.length,
        "RUT Asistentes": t.attendees_rut_list.join(", "),
        Nombres: t.attendees_rut_list.map(workerName).join(", "),
        "Horas Cumplidas": completedHoursFor(t.id),
      })),
      "Capacitaciones",
      "capacitaciones_ds44_gyc",
    );
  }

  if (loading) return <Spinner />;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <GraduationCap size={18} className="text-emerald-600" />
            <span className="text-xs text-slate-500">Capacitaciones</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{trainings.length}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock size={18} className="text-blue-600" />
            <span className="text-xs text-slate-500">Horas Planificadas</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{totalHours}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={18} className="text-emerald-600" />
            <span className="text-xs text-slate-500">Horas Cumplidas</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">
            {totalCompleted}
            <span className="text-sm font-normal text-slate-400 ml-1">/ {totalHours}h</span>
          </p>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className={`h-full rounded-full ${completionPct >= 100 ? "bg-emerald-500" : completionPct >= 50 ? "bg-amber-500" : "bg-red-500"}`}
              style={{ width: `${completionPct}%` }}
            />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users size={18} className="text-amber-600" />
            <span className="text-xs text-slate-500">Asistentes Totales</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{totalAttendees}</p>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Control de Horas Hombre Capacitadas (HHC)"
          subtitle="Plan anual de capacitaciones — DS 44. El progreso se calcula automáticamente desde las horas cumplidas registradas por trabajador."
          action={
            <Button size="sm" variant="outline" onClick={() => setHhcModal(true)}>
              <Plus size={15} /> Nuevo Plan
            </Button>
          }
        />
        <div className="px-5 pb-5">
          {hhcPlans.length === 0 ? (
            <EmptyState message="No hay planes HHC registrados" />
          ) : (
            <div className="space-y-3">
              {hhcPlans.map((h) => {
                const yearTrainings = trainings.filter((t) => t.date.startsWith(String(h.year)));
                const yearAttIds = new Set(yearTrainings.map((t) => t.id));
                const executed = trainingAttendance
                  .filter((a) => yearAttIds.has(a.training_id))
                  .reduce((s, a) => s + Number(a.completed_hours), 0);
                const pct =
                  h.planned_hours > 0 ? Math.min((executed / h.planned_hours) * 100, 100) : 0;
                return (
                  <div key={h.id} className="border border-slate-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="font-semibold text-slate-800">Plan {h.year}</span>
                        {h.notes && (
                          <span className="text-sm text-slate-500 ml-2">— {h.notes}</span>
                        )}
                      </div>
                      <Badge
                        className={
                          pct >= 100
                            ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                            : pct >= 70
                              ? "bg-amber-100 text-amber-700 border-amber-200"
                              : "bg-red-100 text-red-700 border-red-200"
                        }
                      >
                        {pct.toFixed(0)}% cumplido
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-600 mb-2">
                      <span>
                        Planificadas: <strong>{h.planned_hours}h</strong>
                      </span>
                      <span>
                        Cumplidas: <strong>{executed}h</strong>
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${pct >= 100 ? "bg-emerald-500" : pct >= 70 ? "bg-amber-500" : "bg-red-500"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={exportExcel}>
          <FileSpreadsheet size={15} /> Excel
        </Button>
        <Button size="sm" onClick={() => setModalOpen(true)}>
          <Plus size={15} /> Nueva Capacitación
        </Button>
      </div>

      <Card>
        <CardHeader
          title="Registro de Capacitaciones e Inducciones"
          subtitle="Marca horas cumplidas y registra asistencia diaria por trabajador — marco DS 44"
        />
        {trainings.length === 0 ? (
          <EmptyState
            message="No hay capacitaciones registradas"
            icon={<GraduationCap size={32} />}
          />
        ) : (
          <>
            <div className="divide-y divide-slate-100">
              {trainPageItems.map((t) => {
                const completed = completedHoursFor(t.id);
                const pct =
                  Number(t.hours) > 0 ? Math.min((completed / Number(t.hours)) * 100, 100) : 0;
                const isExpanded = expandedId === t.id;
                const atts = attendanceFor(t.id);
                return (
                  <div key={t.id} className="px-5 py-4">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <Badge className="bg-slate-100 text-slate-600 border-slate-200">
                            {t.date}
                          </Badge>
                          <Badge className="bg-blue-50 text-blue-700 border-blue-200">
                            {t.hours}h planificadas
                          </Badge>
                          {completed >= Number(t.hours) && Number(t.hours) > 0 && (
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                              <CheckCircle2 size={11} /> Cumplido
                            </Badge>
                          )}
                          <span className="text-xs text-slate-500">Instructor: {t.trainer}</span>
                        </div>
                        <p className="font-semibold text-slate-800">{t.topic}</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {t.attendees_rut_list.map((rut, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 bg-slate-100 rounded text-xs text-slate-600"
                            >
                              {workerName(rut)}
                            </span>
                          ))}
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-3">
                          <span className="text-xs font-medium text-slate-600">
                            Horas cumplidas (total):
                          </span>
                          <span className="text-sm font-bold text-slate-800">{completed}h</span>
                          <span className="text-xs text-slate-400">de {t.hours}h</span>
                          <div className="flex-1 min-w-[80px] max-w-[160px] bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${pct >= 100 ? "bg-emerald-500" : "bg-amber-500"}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : t.id)}
                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
                          >
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            {isExpanded ? "Ocultar detalle" : "Ver detalle por trabajador"}
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 self-start">
                        <button
                          onClick={() => setDetailTraining(t)}
                          className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded font-medium"
                          title="Registrar asistencia diaria"
                        >
                          <Calendar size={14} /> Registrar
                        </button>
                        {canDelete && (
                          <button
                            onClick={() => delTraining(t)}
                            className="p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 rounded"
                            title="Eliminar"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-4 ml-2 border-l-2 border-slate-200 pl-4 space-y-2">
                        {t.attendees_rut_list.length === 0 ? (
                          <p className="text-xs text-slate-400">Sin asistentes registrados</p>
                        ) : (
                          <>
                            <p className="text-xs font-medium text-slate-500 mb-1">
                              Registro de horas por trabajador:
                            </p>
                            {t.attendees_rut_list.map((rut) => {
                              const workerAtts = atts.filter((a) => a.worker_rut === rut);
                              const workerTotal = workerAtts.reduce(
                                (s, a) => s + Number(a.completed_hours),
                                0,
                              );
                              return (
                                <div
                                  key={rut}
                                  className="flex flex-col gap-1 py-1.5 border-b border-slate-50 last:border-0"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm text-slate-700">
                                      {workerName(rut)}
                                    </span>
                                    <span className="text-xs text-slate-500">
                                      {workerTotal}h cumplidas
                                    </span>
                                  </div>
                                  {workerAtts.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mt-1">
                                      {workerAtts.map((a) => (
                                        <span
                                          key={a.id}
                                          className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 rounded text-xs text-blue-700"
                                        >
                                          {a.attendance_date}: {a.completed_hours}h
                                          {a.notes && (
                                            <span className="text-blue-400" title={a.notes}>
                                              ·
                                            </span>
                                          )}
                                          <button
                                            onClick={() => deleteAttendance(a.id)}
                                            className="text-blue-400 hover:text-red-600"
                                            title="Eliminar registro"
                                          >
                                            <Trash2 size={10} />
                                          </button>
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                            <button
                              onClick={() => setDetailTraining(t)}
                              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium mt-2"
                            >
                              <Plus size={12} /> Registrar nueva asistencia
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {trainTotalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
                <span className="text-xs text-slate-500">
                  Página {trainPage} de {trainTotalPages} · {trainTotal} capacitaciones
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setTrainPage(Math.max(1, trainPage - 1))}
                    disabled={trainPage === 1}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="px-3 text-xs font-medium text-slate-700">
                    {trainPage} / {trainTotalPages}
                  </span>
                  <button
                    onClick={() => setTrainPage(Math.min(trainTotalPages, trainPage + 1))}
                    disabled={trainPage === trainTotalPages}
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
        <TrainingModal workers={workers} onClose={() => setModalOpen(false)} onSave={addTraining} />
      )}
      {hhcModal && <HhcModal onClose={() => setHhcModal(false)} onSave={saveHhc} />}
      {detailTraining && (
        <AttendanceModal
          training={detailTraining}
          existingAttendance={attendanceFor(detailTraining.id)}
          workerName={workerName}
          onClose={() => setDetailTraining(null)}
          onSave={saveAttendance}
        />
      )}
    </div>
  );
}

function TrainingModal({
  workers,
  onClose,
  onSave,
}: {
  workers: AppData["workers"];
  onClose: () => void;
  onSave: (f: Omit<Training, "id" | "created_at">) => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState({
    topic: "",
    hours: "1",
    trainer: "",
    date: new Date().toISOString().slice(0, 10),
    selected: [] as string[],
  });
  function toggle(rut: string) {
    setForm((f) => ({
      ...f,
      selected: f.selected.includes(rut)
        ? f.selected.filter((r) => r !== rut)
        : [...f.selected, rut],
    }));
  }
  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (form.selected.length === 0) {
      toast.warning("Selecciona asistentes", "Debes elegir al menos un trabajador");
      return;
    }
    onSave({
      topic: form.topic,
      hours: Number(form.hours),
      completed_hours: 0,
      trainer: form.trainer,
      date: form.date,
      attendees_rut_list: form.selected,
      location: null,
      scheduled_time: null,
    });
  }
  return (
    <Modal open onClose={onClose} title="Nueva Capacitación (DS 44)" size="lg">
      <form onSubmit={submit} className="space-y-4">
        <Input
          label="Tema de Capacitación"
          required
          value={form.topic}
          onChange={(e) => setForm({ ...form, topic: e.target.value })}
        />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Horas"
            type="number"
            step="0.01"
            min="0"
            required
            value={form.hours}
            onChange={(e) => setForm({ ...form, hours: e.target.value })}
          />
          <Input
            label="Instructor"
            required
            value={form.trainer}
            onChange={(e) => setForm({ ...form, trainer: e.target.value })}
          />
          <Input
            label="Fecha"
            type="date"
            required
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
        </div>
        <div>
          <p className="text-xs font-medium text-slate-600 mb-2">Asistentes</p>
          <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
            {workers.map((w) => (
              <label
                key={w.rut}
                className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={form.selected.includes(w.rut)}
                  onChange={() => toggle(w.rut)}
                  className="rounded"
                />
                <span className="text-sm text-slate-700">{w.full_name}</span>
                <span className="text-xs text-slate-400 font-mono">{w.rut}</span>
              </label>
            ))}
          </div>
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

function AttendanceModal({
  training,
  existingAttendance,
  workerName,
  onClose,
  onSave,
}: {
  training: Training;
  existingAttendance: TrainingAttendance[];
  workerName: (rut: string) => string;
  onClose: () => void;
  onSave: (
    trainingId: string,
    workerRut: string,
    hours: number,
    date: string,
    notes?: string,
  ) => Promise<void>;
}) {
  const toast = useToast();
  const [selectedRut, setSelectedRut] = useState<string>(training.attendees_rut_list[0] ?? "");
  const [hours, setHours] = useState("1");
  const [date, setDate] = useState(training.date);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedRut) {
      toast.warning("Selecciona un trabajador", "Debes elegir un trabajador de la lista");
      return;
    }
    setSaving(true);
    await onSave(training.id, selectedRut, Number(hours), date, notes || undefined);
    setSaving(false);
    onClose();
  }

  return (
    <Modal open onClose={onClose} title={`Registrar Asistencia — ${training.topic}`} size="md">
      <form onSubmit={submit} className="space-y-4">
        <div className="glass-surface rounded-lg p-3 mb-2">
          <p className="text-xs text-slate-500">
            Capacitación: <span className="font-medium text-slate-700">{training.topic}</span>
          </p>
          <p className="text-xs text-slate-500">
            Fecha: <span className="font-medium text-slate-700">{training.date}</span> · Horas
            planificadas: <span className="font-medium text-slate-700">{training.hours}h</span>
          </p>
        </div>

        {existingAttendance.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-slate-600">Registros existentes:</p>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {existingAttendance.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between px-2 py-1.5 bg-white/40 rounded text-xs"
                >
                  <span className="text-slate-700">{workerName(a.worker_rut)}</span>
                  <span className="text-slate-500">
                    {a.attendance_date}: {a.completed_hours}h
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <Select
          label="Trabajador"
          value={selectedRut}
          onChange={(e) => setSelectedRut(e.target.value)}
        >
          {training.attendees_rut_list.map((rut) => (
            <option key={rut} value={rut}>
              {workerName(rut)} ({rut})
            </option>
          ))}
        </Select>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Horas Cumplidas"
            type="number"
            step="0.5"
            min="0"
            max={Number(training.hours)}
            required
            value={hours}
            onChange={(e) => setHours(e.target.value)}
          />
          <Input
            label="Fecha"
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <Input label="Notas (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            <Save size={15} /> Registrar
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function HhcModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (f: Omit<HhcPlan, "id" | "created_at">) => void;
}) {
  const [form, setForm] = useState({
    year: String(new Date().getFullYear()),
    planned_hours: "240",
    executed_hours: "0",
    notes: "",
  });
  return (
    <Modal open onClose={onClose} title="Nuevo Plan HHC">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave({
            year: Number(form.year),
            planned_hours: Number(form.planned_hours),
            executed_hours: Number(form.executed_hours),
            notes: form.notes || null,
          });
        }}
        className="space-y-4"
      >
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Año"
            type="number"
            required
            value={form.year}
            onChange={(e) => setForm({ ...form, year: e.target.value })}
          />
          <Input
            label="Horas Planificadas"
            type="number"
            required
            value={form.planned_hours}
            onChange={(e) => setForm({ ...form, planned_hours: e.target.value })}
          />
        </div>
        <Input
          label="Horas Ejecutadas"
          type="number"
          value={form.executed_hours}
          onChange={(e) => setForm({ ...form, executed_hours: e.target.value })}
        />
        <Input
          label="Notas"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
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
