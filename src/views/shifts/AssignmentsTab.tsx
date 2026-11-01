import { useState, useMemo } from "react";
import { Users, FileDown, ArrowLeftRight, X } from "lucide-react";
import {
  Card,
  CardHeader,
  Button,
  Modal,
  Input,
  Select,
  Badge,
  EmptyState,
  Textarea,
} from "@/components/ui";
import { audit } from "@/lib/audit";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/hooks/useConfirm";
import { useLoading } from "@/components/LoadingProvider";
import { ExportPdf } from "@/lib/exportPdf";
import { ExportExcel } from "@/lib/exportExcel";
import type { ShiftDefinition, ShiftAssignment, ShiftDurationType, Worker } from "@/lib/types";
import { DURATION_LABELS, DURATION_TYPES, fmtDate, WEEKDAYS } from "./constants";

export interface AssignmentModalData {
  worker: Worker;
  shiftDef: ShiftDefinition;
  durationType: ShiftDurationType;
  startDate: string;
  endDate: string | null;
  swapWithRut: string | null;
  reason: string;
  daysOfWeek: number[];
  isEdit: boolean;
  existingAssignment?: ShiftAssignment;
}

export function AssignmentsTab({
  shiftDefs,
  shiftAssignments,
  workers,
  workerMap,
  onReload,
  toast,
  runWithLoading,
}: {
  shiftDefs: ShiftDefinition[];
  shiftAssignments: ShiftAssignment[];
  workers: Worker[];
  workerMap: Map<string, Worker>;
  onReload: () => Promise<void>;
  toast: ReturnType<typeof useToast>;
  runWithLoading: ReturnType<typeof useLoading>["runWithLoading"];
}) {
  const { confirm } = useConfirm();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState<AssignmentModalData | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const activeAssignments = useMemo(
    () => shiftAssignments.filter((a) => a.active),
    [shiftAssignments],
  );
  const activeWorkers = useMemo(
    () => workers.filter((w) => w.contract_status !== "Desvinculado"),
    [workers],
  );

  const assignmentByRut = useMemo(() => {
    const m = new Map<string, ShiftAssignment>();
    activeAssignments.forEach((a) => {
      if (!m.has(a.worker_rut)) m.set(a.worker_rut, a);
    });
    return m;
  }, [activeAssignments]);

  const filteredWorkers = useMemo(() => {
    if (!search) return activeWorkers;
    const q = search.toLowerCase();
    return activeWorkers.filter((w) => w.full_name.toLowerCase().includes(q) || w.rut.includes(q));
  }, [activeWorkers, search]);

  function openNewAssignment(worker: Worker) {
    if (shiftDefs.length === 0) {
      toast.error("Sin turnos", "Primero crea una definición de turno");
      return;
    }
    const existing = assignmentByRut.get(worker.rut);
    const def = existing
      ? (shiftDefs.find((d) => d.id === existing.shift_definition_id) ?? shiftDefs[0])
      : (shiftDefs.find((d) => d.cycle === worker.shift_cycle) ?? shiftDefs[0]);
    setModalData({
      worker,
      shiftDef: def,
      durationType: existing?.duration_type ?? "indefinido",
      startDate: existing?.start_date ?? new Date().toISOString().slice(0, 10),
      endDate: existing?.end_date ?? null,
      swapWithRut: null,
      reason: "",
      daysOfWeek: existing?.days_of_week ?? [],
      isEdit: !!existing,
      existingAssignment: existing,
    });
    setModalOpen(true);
  }

  async function saveAssignment(d: AssignmentModalData) {
    setSaving(true);
    try {
      await runWithLoading(async () => {
        const { error } = await supabase.rpc("apply_shift_assignment", {
          _worker_rut: d.worker.rut,
          _shift_definition_id: d.shiftDef.id,
          _duration_type: d.durationType,
          _start_date: d.startDate,
          _end_date: d.durationType === "indefinido" ? null : d.endDate,
          _swap_with_rut: d.swapWithRut,
          _reason: d.reason || null,
          _days_of_week: d.daysOfWeek.length > 0 ? d.daysOfWeek : null,
        });
        if (error) throw new Error(shiftErrorMessage(error.message));
        toast.success(
          d.isEdit ? "Asignación actualizada" : "Trabajador asignado",
          `${d.worker.full_name} → ${d.shiftDef.name}`,
        );
        setModalOpen(false);
        setModalData(null);
        await onReload();
      });
    } catch (e) {
      toast.error("Error", (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function deactivateAssignment(a: ShiftAssignment) {
    const w = workerMap.get(a.worker_rut);
    const ok = await confirm({
      title: "Desactivar asignación",
      message: `¿Desactivar la asignación de ${w?.full_name ?? a.worker_rut} al turno "${a.shift_name}"?`,
      confirmText: "Desactivar",
      type: "danger",
    });
    if (!ok) return;
    try {
      await runWithLoading(async () => {
        const { error } = await supabase.rpc("deactivate_shift_assignment", {
          _assignment_id: a.id,
          _reason: "Desactivación manual",
        });
        if (error) throw new Error(error.message);
        await audit({
          action: "shift.deactivate",
          entity: "shift_assignments",
          entity_id: a.id,
          entity_label: w?.full_name ?? a.worker_rut,
        });
        toast.success("Asignación desactivada", w?.full_name ?? a.worker_rut);
        await onReload();
      });
    } catch (e) {
      toast.error("Error", (e as Error).message);
    }
  }

  async function exportAssignments(format: "pdf" | "excel") {
    const rows = activeAssignments.map((a) => {
      const w = workerMap.get(a.worker_rut);
      const swapW = a.swap_with_rut ? workerMap.get(a.swap_with_rut) : null;
      const def = shiftDefs.find((d) => d.id === a.shift_definition_id);
      return {
        Trabajador: w?.full_name ?? a.worker_rut,
        RUT: a.worker_rut,
        Cargo: w?.position ?? "",
        Turno: a.shift_name,
        Ciclo: def?.cycle ?? "",
        "Tipo Duración": DURATION_LABELS[a.duration_type],
        "Fecha Inicio": fmtDate(a.start_date),
        "Fecha Término": fmtDate(a.end_date),
        Intercambio: swapW?.full_name ?? "",
        Motivo: a.change_reason ?? "",
        "Asignado por": a.assigned_by_email,
      };
    });
    try {
      if (format === "pdf") {
        const headers = [
          "Trabajador",
          "RUT",
          "Cargo",
          "Turno",
          "Ciclo",
          "Duración",
          "Inicio",
          "Término",
          "Intercambio",
          "Motivo",
          "Asignado por",
        ];
        const body = rows.map((r) => [
          r.Trabajador,
          r.RUT,
          r.Cargo,
          r.Turno,
          r.Ciclo,
          r["Tipo Duración"],
          r["Fecha Inicio"],
          r["Fecha Término"],
          r.Intercambio,
          r.Motivo,
          r["Asignado por"],
        ]);
        await ExportPdf.toPdf(
          "Asignaciones de Turnos",
          headers,
          body,
          "asignaciones_turnos",
          "Listado de trabajadores asignados a turnos",
        );
      } else {
        await ExportExcel.toExcel(rows, "Asignaciones", "asignaciones_turnos");
      }
      toast.success("Exportado", `Asignaciones exportadas a ${format.toUpperCase()}`);
    } catch (e) {
      toast.error("Error al exportar", (e as Error).message);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Asignaciones de Turnos"
          subtitle="Asigna turnos a trabajadores, registra intercambios y motivos de cambio."
          action={
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => exportAssignments("pdf")}>
                <FileDown size={15} /> PDF
              </Button>
              <Button size="sm" variant="outline" onClick={() => exportAssignments("excel")}>
                <FileDown size={15} /> Excel
              </Button>
            </div>
          }
        />
        <div className="px-5 pb-3">
          <Input
            placeholder="Buscar trabajador por nombre o RUT..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {filteredWorkers.length === 0 ? (
          <EmptyState message="No hay trabajadores para asignar" icon={<Users size={32} />} />
        ) : (
          <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
            {filteredWorkers.map((w) => {
              const a = assignmentByRut.get(w.rut);
              const def = a ? shiftDefs.find((d) => d.id === a.shift_definition_id) : null;
              const swapW = a?.swap_with_rut ? workerMap.get(a.swap_with_rut) : null;
              return (
                <div key={w.rut} className="px-5 py-3 flex items-center gap-3">
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: def?.color ?? "#cbd5e1" }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-slate-800 text-sm">{w.full_name}</p>
                      <span className="text-xs text-slate-400">{w.rut}</span>
                    </div>
                    {a ? (
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge className="bg-blue-50 text-blue-700 border-blue-200">
                          {a.shift_name}
                        </Badge>
                        <Badge className="bg-slate-100 text-slate-600 border-slate-200">
                          {DURATION_LABELS[a.duration_type]}
                        </Badge>
                        {a.end_date && (
                          <span className="text-xs text-slate-500">
                            Hasta {fmtDate(a.end_date)}
                          </span>
                        )}
                        {a.days_of_week && a.days_of_week.length > 0 && (
                          <span className="text-xs text-slate-500">
                            {a.days_of_week.map((d) => WEEKDAYS[d]).join(" · ")}
                          </span>
                        )}
                        {swapW && (
                          <Badge className="bg-amber-50 text-amber-700 border-amber-200">
                            <ArrowLeftRight size={11} /> {swapW.full_name}
                          </Badge>
                        )}
                        {a.change_reason && (
                          <span className="text-xs text-slate-400 italic truncate max-w-[200px]">
                            {a.change_reason}
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 mt-0.5">Sin turno asignado</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {a && (
                      <button
                        onClick={() => deactivateAssignment(a)}
                        className="p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded"
                        title="Desactivar"
                      >
                        <X size={15} />
                      </button>
                    )}
                    <Button
                      size="sm"
                      variant={a ? "outline" : "primary"}
                      onClick={() => openNewAssignment(w)}
                    >
                      {a ? "Cambiar" : "Asignar"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {modalOpen && modalData && (
        <AssignmentModal
          data={modalData}
          shiftDefs={shiftDefs}
          workers={activeWorkers}
          onClose={() => {
            setModalOpen(false);
            setModalData(null);
          }}
          onSave={saveAssignment}
          saving={saving}
        />
      )}
    </div>
  );
}

function AssignmentModal({
  data,
  shiftDefs,
  workers,
  onClose,
  onSave,
  saving,
}: {
  data: AssignmentModalData;
  shiftDefs: ShiftDefinition[];
  workers: Worker[];
  onClose: () => void;
  onSave: (d: AssignmentModalData) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState({
    shift_definition_id: data.shiftDef.id,
    duration_type: data.durationType,
    start_date: data.startDate,
    end_date: data.endDate ?? "",
    swap_with_rut: "",
    reason: data.reason,
  });
  const [selectedDays, setSelectedDays] = useState<number[]>(data.daysOfWeek);

  const selectedDef = shiftDefs.find((d) => d.id === form.shift_definition_id);
  const showEndDate = form.duration_type !== "indefinido";

  const [formError, setFormError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const def = shiftDefs.find((d) => d.id === form.shift_definition_id && d.active !== false);
    if (!def) return setFormError("Selecciona un turno activo.");
    if (!form.start_date) return setFormError("Indica la fecha de inicio.");
    if (showEndDate && !form.end_date) return setFormError("Indica la fecha de término.");
    if (showEndDate && form.end_date < form.start_date)
      return setFormError("La fecha de término no puede ser anterior al inicio.");
    setFormError(null);
    onSave({
      ...data,
      shiftDef: def,
      durationType: form.duration_type as ShiftDurationType,
      startDate: form.start_date,
      endDate: showEndDate && form.end_date ? form.end_date : null,
      swapWithRut: form.swap_with_rut || null,
      reason: form.reason,
      daysOfWeek: selectedDays,
    });
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`${data.isEdit ? "Cambiar" : "Asignar"} turno — ${data.worker.full_name}`}
      size="lg"
    >
      <form onSubmit={submit} className="space-y-4">
        {formError && (
          <p
            role="alert"
            className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700"
          >
            {formError}
          </p>
        )}
        <div className="bg-slate-50 rounded-lg p-3 flex min-w-0 items-center gap-3">
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: selectedDef?.color ?? "#3b82f6" }}
          />
          <div className="min-w-0 flex-1">
            <p className="break-words text-sm font-medium text-slate-700">
              {data.worker.full_name}
            </p>
            <p className="break-words text-xs text-slate-500">
              {data.worker.rut} · {data.worker.position}
            </p>
          </div>
          {data.existingAssignment && (
            <div className="ml-auto min-w-0 shrink-0 text-right">
              <p className="text-xs text-slate-400">Turno actual</p>
              <p className="text-xs font-medium text-slate-600">
                {data.existingAssignment.shift_name}
              </p>
            </div>
          )}
        </div>

        <Select
          label="Turno"
          value={form.shift_definition_id}
          onChange={(e) => setForm({ ...form, shift_definition_id: e.target.value })}
        >
          {shiftDefs
            .filter((d) => d.active)
            .map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.cycle})
                {d.start_time && d.end_time ? ` — ${d.start_time}–${d.end_time}` : ""}
              </option>
            ))}
        </Select>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label="Tipo de duración"
            value={form.duration_type}
            onChange={(e) =>
              setForm({ ...form, duration_type: e.target.value as ShiftDurationType })
            }
          >
            {DURATION_TYPES.map((d) => (
              <option key={d} value={d}>
                {DURATION_LABELS[d]}
              </option>
            ))}
          </Select>
          <Input
            label="Fecha de inicio"
            type="date"
            required
            value={form.start_date}
            onChange={(e) => setForm({ ...form, start_date: e.target.value })}
          />
        </div>

        {showEndDate && (
          <Input
            label="Fecha de término"
            type="date"
            value={form.end_date}
            onChange={(e) => setForm({ ...form, end_date: e.target.value })}
          />
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Días de la semana (opcional)
          </label>
          <p className="text-xs text-slate-400 mb-2">
            Deja vacío si el turno aplica todos los días dentro del rango. Selecciona días
            específicos para patrones no continuos (ej. Lun/Mié/Jue).
          </p>
          <div className="flex gap-1.5 flex-wrap">
            {WEEKDAYS.map((label, idx) => {
              const dayNum = idx;
              const active = selectedDays.includes(dayNum);
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() =>
                    setSelectedDays((prev) =>
                      active ? prev.filter((d) => d !== dayNum) : [...prev, dayNum],
                    )
                  }
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${active ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <Select
          label="Intercambio con compañero (opcional)"
          value={form.swap_with_rut}
          onChange={(e) => setForm({ ...form, swap_with_rut: e.target.value })}
        >
          <option value="">Sin intercambio</option>
          {workers
            .filter((w) => w.rut !== data.worker.rut)
            .map((w) => (
              <option key={w.rut} value={w.rut}>
                {w.full_name} ({w.rut})
              </option>
            ))}
        </Select>

        <Textarea
          label="Motivo del cambio o asignación"
          placeholder="Ej: Cobertura por licencia médica, reorganización de turnos, solicitud del trabajador..."
          rows={3}
          value={form.reason}
          onChange={(e) => setForm({ ...form, reason: e.target.value })}
        />

        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving} className="w-full sm:w-auto">
            {data.isEdit ? "Guardar cambio" : "Asignar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

const SHIFT_ERRORS: Record<string, string> = {
  AUTH_REQUIRED: "Tu sesión expiró. Vuelve a iniciar sesión.",
  TENANT_CONTEXT_REQUIRED: "Selecciona una empresa antes de asignar turnos.",
  SHIFT_WRITE_NOT_ALLOWED: "Tu rol no tiene permiso para modificar turnos.",
  WORKER_REQUIRED: "Selecciona un trabajador.",
  WORKER_NOT_FOUND_OR_INACTIVE: "El trabajador no existe o está inactivo.",
  SHIFT_DEFINITION_NOT_ACTIVE: "El turno seleccionado no está activo.",
  SHIFT_DURATION_INVALID: "El tipo de duración no es válido.",
  SHIFT_DATE_RANGE_INVALID: "La fecha de término no puede ser anterior al inicio.",
  SWAP_WORKER_NOT_FOUND_OR_INACTIVE: "El trabajador de intercambio no existe o está inactivo.",
  SHIFT_ASSIGNMENT_NOT_FOUND: "La asignación ya no existe.",
};

function shiftErrorMessage(raw: string): string {
  const code = Object.keys(SHIFT_ERRORS).find((k) => raw.includes(k));
  return code ? SHIFT_ERRORS[code] : raw;
}
