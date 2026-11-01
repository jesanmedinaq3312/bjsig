import { useState, useMemo } from "react";
import {
  Plus,
  Trash2,
  FileSpreadsheet,
  Plane,
  CalendarDays,
  CheckCircle2,
  XCircle,
  Clock,
  Hourglass,
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
import { vacationRequestRepo, vacationBalanceRepo } from "@/lib/repositories";
import { audit } from "@/lib/audit";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/hooks/useConfirm";
import { useLoading } from "@/components/LoadingProvider";
import { countBusinessDays } from "@/lib/holidays";
import type { VacationRequest, VacationRequestStatus, VacationBalance } from "@/lib/types";
import type { AppData } from "@/hooks/useAppData";

const STATUS_META: Record<
  VacationRequestStatus,
  { label: string; cls: string; icon: React.ReactNode }
> = {
  pendiente: {
    label: "Pendiente",
    cls: "bg-amber-100 text-amber-700 border-amber-200",
    icon: <Clock size={11} />,
  },
  aprobada: {
    label: "Aprobada",
    cls: "bg-emerald-100 text-emerald-700 border-emerald-200",
    icon: <CheckCircle2 size={11} />,
  },
  rechazada: {
    label: "Rechazada",
    cls: "bg-red-100 text-red-700 border-red-200",
    icon: <XCircle size={11} />,
  },
  gozada: {
    label: "Gozada",
    cls: "bg-blue-100 text-blue-700 border-blue-200",
    icon: <CheckCircle2 size={11} />,
  },
};

function diffDays(start: string, end: string): number {
  return Math.max(countBusinessDays(start, end), 0);
}

export function VacationsView({
  data,
  currentUserEmail,
  userRole,
  permissions,
}: {
  data: AppData;
  currentUserEmail: string;
  userRole?: string;
  permissions?: Record<string, boolean>;
}) {
  const { workers, vacationRequests, vacationBalances, loading } = data;
  const canDelete = userRole === "superadmin" || !!permissions?.can_delete_vacations;
  const toast = useToast();
  const { confirm } = useConfirm();
  const { runWithLoading } = useLoading();
  const [modalOpen, setModalOpen] = useState(false);
  const [balanceModal, setBalanceModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterWorker, setFilterWorker] = useState<string>("all");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const workerName = (rut: string) => workers.find((w) => w.rut === rut)?.full_name ?? rut;

  const filtered = useMemo(() => {
    return vacationRequests.filter((r) => {
      if (filterStatus !== "all" && r.status !== filterStatus) return false;
      if (filterWorker !== "all" && r.worker_rut !== filterWorker) return false;
      return true;
    });
  }, [vacationRequests, filterStatus, filterWorker]);

  const pendingCount = vacationRequests.filter((r) => r.status === "pendiente").length;
  const approvedCount = vacationRequests.filter((r) => r.status === "aprobada").length;
  const totalDaysRequested = vacationRequests.reduce((s, r) => s + r.days_requested, 0);

  async function addRequest(
    form: Omit<
      VacationRequest,
      "id" | "created_at" | "status" | "approved_by_email" | "approved_at"
    >,
  ) {
    try {
      await runWithLoading(async () => {
        await vacationRequestRepo.insert({
          ...form,
          days_requested: diffDays(form.start_date, form.end_date),
          status: "pendiente",
          approved_by_email: null,
          approved_at: null,
        });
        await audit({
          action: "vacation.create",
          entity: "vacation_requests",
          entity_label: `${workerName(form.worker_rut)} — ${form.start_date}`,
        });
        setModalOpen(false);
        toast.success("Solicitud creada", "La solicitud de vacaciones fue registrada");
        await data.reload();
      });
    } catch (e) {
      toast.error("Error", (e as Error).message);
    }
  }

  async function updateStatus(req: VacationRequest, status: VacationRequestStatus) {
    if (processingId) return;
    setProcessingId(req.id);
    try {
      await runWithLoading(async () => {
        if (status === "aprobada") {
          const balance = await vacationBalanceRepo.getByWorkerYear(req.worker_rut, req.year);
          if (!balance) {
            toast.error(
              "Sin saldo",
              `No hay saldo vacacional registrado para ${workerName(req.worker_rut)} en ${req.year}. Crea el saldo primero.`,
            );
            return;
          }
          const available = balance.total_days + balance.carryover_days - balance.used_days;
          if (req.days_requested > available) {
            toast.error(
              "Saldo insuficiente",
              `${workerName(req.worker_rut)} tiene ${available} día(s) disponibles y la solicitud es por ${req.days_requested} día(s).`,
            );
            return;
          }
          const newUsed = balance.used_days + req.days_requested;
          const newRemaining = balance.total_days + balance.carryover_days - newUsed;
          const updatedBal = await vacationBalanceRepo.updateUsageIfUnchanged(
            balance.id,
            balance.used_days,
            newUsed,
            newRemaining,
          );
          if (!updatedBal) {
            toast.error(
              "Conflicto de concurrencia",
              "El saldo fue modificado por otro administrador simultáneamente. Recargando...",
            );
            await data.reload();
            return;
          }
          const updatedReq = await vacationRequestRepo.updateStatusIfIn(req.id, ["pendiente"], {
            status,
            approved_by_email: currentUserEmail || "admin",
            approved_at: new Date().toISOString(),
          });
          if (!updatedReq) {
            await vacationBalanceRepo.setUsage(
              balance.id,
              balance.used_days,
              balance.total_days + balance.carryover_days - balance.used_days,
            );
            toast.error(
              "Conflicto de concurrencia",
              "La solicitud fue procesada por otro administrador simultáneamente. Recargando...",
            );
            await data.reload();
            return;
          }
        } else if (status === "rechazada") {
          if (req.status === "aprobada") {
            const balance = await vacationBalanceRepo.getByWorkerYear(req.worker_rut, req.year);
            if (balance) {
              const newUsed = Math.max(0, balance.used_days - req.days_requested);
              const newRemaining = Math.max(
                0,
                balance.total_days + balance.carryover_days - newUsed,
              );
              const updatedBal = await vacationBalanceRepo.updateUsageIfUnchanged(
                balance.id,
                balance.used_days,
                newUsed,
                newRemaining,
              );
              if (!updatedBal) {
                toast.error(
                  "Conflicto de concurrencia",
                  "El saldo fue modificado por otro administrador simultáneamente. Recargando...",
                );
                await data.reload();
                return;
              }
            }
          }
          const updatedReq = await vacationRequestRepo.updateStatusIfIn(
            req.id,
            ["pendiente", "aprobada"],
            {
              status,
              approved_by_email: currentUserEmail || "admin",
              approved_at: new Date().toISOString(),
            },
          );
          if (!updatedReq) {
            toast.error(
              "Conflicto de concurrencia",
              "La solicitud fue procesada por otro administrador simultáneamente. Recargando...",
            );
            await data.reload();
            return;
          }
        } else if (status === "gozada") {
          const updatedReq = await vacationRequestRepo.updateStatusIfIn(req.id, ["aprobada"], {
            status,
            approved_by_email: currentUserEmail || "admin",
            approved_at: new Date().toISOString(),
          });
          if (!updatedReq) {
            toast.error(
              "Conflicto de concurrencia",
              "La solicitud fue procesada por otro administrador simultáneamente. Recargando...",
            );
            await data.reload();
            return;
          }
        }
        await audit({
          action: `vacation.${status}`,
          entity: "vacation_requests",
          entity_id: req.id,
          entity_label: `${workerName(req.worker_rut)} — ${status}`,
        });
        toast.success("Solicitud actualizada", `Estado: ${STATUS_META[status].label}`);
        await data.reload();
      });
    } catch (e) {
      toast.error("Error", (e as Error).message);
    } finally {
      setProcessingId(null);
    }
  }

  async function delRequest(req: VacationRequest) {
    const ok = await confirm({
      title: "Eliminar solicitud",
      message: `¿Eliminar la solicitud de vacaciones de ${workerName(req.worker_rut)}?`,
      confirmText: "Eliminar",
      type: "danger",
    });
    if (!ok) return;
    try {
      await runWithLoading(async () => {
        await vacationRequestRepo.remove(req.id);
        await audit({ action: "vacation.delete", entity: "vacation_requests", entity_id: req.id });
        toast.success("Solicitud eliminada");
        await data.reload();
      });
    } catch (e) {
      toast.error("Error", (e as Error).message);
    }
  }

  async function saveBalance(form: Omit<VacationBalance, "id" | "created_at">) {
    try {
      await runWithLoading(async () => {
        await vacationBalanceRepo.insert(form);
        await audit({
          action: "vacation.balance_create",
          entity: "vacation_balances",
          entity_label: `${workerName(form.worker_rut)} — ${form.year}`,
        });
        setBalanceModal(false);
        toast.success("Saldo creado", `Saldo vacacional ${form.year}`);
        await data.reload();
      });
    } catch (e) {
      toast.error("Error", (e as Error).message);
    }
  }

  function exportExcel() {
    ExportService.toExcel(
      filtered.map((r) => ({
        Trabajador: workerName(r.worker_rut),
        RUT: r.worker_rut,
        Inicio: r.start_date,
        Fin: r.end_date,
        "Días Solicitados": r.days_requested,
        Año: r.year,
        Estado: STATUS_META[r.status].label,
        Notas: r.notes ?? "",
      })),
      "Vacaciones",
      "vacaciones_gyc",
    );
  }

  if (loading) return <Spinner />;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Plane size={18} className="text-blue-600" />
            <span className="text-xs text-slate-500">Solicitudes</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{vacationRequests.length}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock size={18} className="text-amber-600" />
            <span className="text-xs text-slate-500">Pendientes</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{pendingCount}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 size={18} className="text-emerald-600" />
            <span className="text-xs text-slate-500">Aprobadas</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{approvedCount}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Hourglass size={18} className="text-violet-600" />
            <span className="text-xs text-slate-500">Días Totales</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{totalDaysRequested}</p>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Saldos Vacacionales"
          subtitle="Saldo disponible por trabajador y año"
          action={
            <Button size="sm" variant="outline" onClick={() => setBalanceModal(true)}>
              <Plus size={15} /> Nuevo Saldo
            </Button>
          }
        />
        <div className="px-5 pb-5">
          {vacationBalances.length === 0 ? (
            <EmptyState message="No hay saldos vacacionales registrados" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
                    <th className="pb-2 pr-4">Trabajador</th>
                    <th className="pb-2 pr-4">Año</th>
                    <th className="pb-2 pr-4">Total</th>
                    <th className="pb-2 pr-4">Usados</th>
                    <th className="pb-2 pr-4">Pendientes</th>
                    <th className="pb-2 pr-4">Arrastre</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vacationBalances.map((b) => (
                    <tr key={b.id} className="py-2">
                      <td className="py-2.5 pr-4 font-medium text-slate-700">
                        {workerName(b.worker_rut)}
                      </td>
                      <td className="py-2.5 pr-4">{b.year}</td>
                      <td className="py-2.5 pr-4">{b.total_days}</td>
                      <td className="py-2.5 pr-4">{b.used_days}</td>
                      <td className="py-2.5 pr-4">
                        <Badge
                          className={
                            b.remaining_days > 0
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-slate-100 text-slate-500 border-slate-200"
                          }
                        >
                          {b.remaining_days}
                        </Badge>
                      </td>
                      <td className="py-2.5 pr-4">{b.carryover_days}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      <div className="flex flex-wrap justify-between items-center gap-2">
        <div className="flex flex-wrap gap-2">
          <Select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-auto"
          >
            <option value="all">Todos los estados</option>
            <option value="pendiente">Pendientes</option>
            <option value="aprobada">Aprobadas</option>
            <option value="rechazada">Rechazadas</option>
            <option value="gozada">Gozadas</option>
          </Select>
          <Select
            value={filterWorker}
            onChange={(e) => setFilterWorker(e.target.value)}
            className="w-auto"
          >
            <option value="all">Todos los trabajadores</option>
            {workers.map((w) => (
              <option key={w.rut} value={w.rut}>
                {w.full_name}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportExcel}>
            <FileSpreadsheet size={15} /> Excel
          </Button>
          <Button size="sm" onClick={() => setModalOpen(true)}>
            <Plus size={15} /> Nueva Solicitud
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader
          title="Solicitudes de Vacaciones"
          subtitle="Gestiona y aprueba las solicitudes de vacaciones del personal"
        />
        {filtered.length === 0 ? (
          <EmptyState
            message="No hay solicitudes que coincidan con el filtro"
            icon={<Plane size={32} />}
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((r) => {
              const meta = STATUS_META[r.status];
              return (
                <div
                  key={r.id}
                  className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <Badge className={meta.cls}>
                        {meta.icon} {meta.label}
                      </Badge>
                      <Badge className="bg-slate-100 text-slate-600 border-slate-200">
                        {r.days_requested} días
                      </Badge>
                      <span className="text-xs text-slate-500">Año {r.year}</span>
                    </div>
                    <p className="font-semibold text-slate-800">{workerName(r.worker_rut)}</p>
                    <div className="flex items-center gap-1.5 text-sm text-slate-500 mt-0.5">
                      <CalendarDays size={13} />
                      <span>
                        {r.start_date} → {r.end_date}
                      </span>
                    </div>
                    {r.notes && <p className="text-xs text-slate-400 mt-1">{r.notes}</p>}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {r.status === "pendiente" && (
                      <>
                        <Button
                          size="sm"
                          variant="success"
                          disabled={processingId === r.id}
                          onClick={() => updateStatus(r, "aprobada")}
                        >
                          Aprobar
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          disabled={processingId === r.id}
                          onClick={() => updateStatus(r, "rechazada")}
                        >
                          Rechazar
                        </Button>
                      </>
                    )}
                    {r.status === "aprobada" && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={processingId === r.id}
                        onClick={() => updateStatus(r, "gozada")}
                      >
                        Marcar Gozada
                      </Button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => delRequest(r)}
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

      <VacationRequestModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        workers={workers}
        onSave={addRequest}
      />
      <VacationBalanceModal
        open={balanceModal}
        onClose={() => setBalanceModal(false)}
        workers={workers}
        onSave={saveBalance}
      />
    </div>
  );
}

function VacationRequestModal({
  open,
  onClose,
  workers,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  workers: AppData["workers"];
  onSave: (
    form: Omit<
      VacationRequest,
      "id" | "created_at" | "status" | "approved_by_email" | "approved_at"
    >,
  ) => void;
}) {
  const toast = useToast();
  const [workerRut, setWorkerRut] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [notes, setNotes] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!workerRut || !startDate || !endDate) return;
    if (new Date(endDate) < new Date(startDate)) {
      toast.error(
        "Fechas inválidas",
        "La fecha de fin debe ser posterior o igual a la fecha de inicio",
      );
      return;
    }
    onSave({
      worker_rut: workerRut,
      start_date: startDate,
      end_date: endDate,
      days_requested: 0,
      year,
      notes: notes || null,
    });
    setWorkerRut("");
    setStartDate("");
    setEndDate("");
    setNotes("");
  }

  return (
    <Modal open={open} onClose={onClose} title="Nueva Solicitud de Vacaciones">
      <form onSubmit={submit} className="space-y-4">
        <Select
          label="Trabajador"
          value={workerRut}
          onChange={(e) => setWorkerRut(e.target.value)}
          required
        >
          <option value="">Seleccionar...</option>
          {workers.map((w) => (
            <option key={w.rut} value={w.rut}>
              {w.full_name} — {w.rut}
            </option>
          ))}
        </Select>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Fecha de Inicio"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
          <Input
            label="Fecha de Fin"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
          />
        </div>
        <Input
          label="Año"
          type="number"
          min={2000}
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          required
        />
        <Textarea
          label="Notas (opcional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" size="sm">
            Crear Solicitud
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function VacationBalanceModal({
  open,
  onClose,
  workers,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  workers: AppData["workers"];
  onSave: (form: Omit<VacationBalance, "id" | "created_at">) => void;
}) {
  const [workerRut, setWorkerRut] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [totalDays, setTotalDays] = useState(15);
  const [usedDays, setUsedDays] = useState(0);
  const [carryover, setCarryover] = useState(0);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!workerRut) return;
    onSave({
      worker_rut: workerRut,
      year,
      total_days: totalDays,
      used_days: usedDays,
      remaining_days: totalDays - usedDays + carryover,
      carryover_days: carryover,
    });
    setWorkerRut("");
    setTotalDays(15);
    setUsedDays(0);
    setCarryover(0);
  }

  return (
    <Modal open={open} onClose={onClose} title="Nuevo Saldo Vacacional">
      <form onSubmit={submit} className="space-y-4">
        <Select
          label="Trabajador"
          value={workerRut}
          onChange={(e) => setWorkerRut(e.target.value)}
          required
        >
          <option value="">Seleccionar...</option>
          {workers.map((w) => (
            <option key={w.rut} value={w.rut}>
              {w.full_name} — {w.rut}
            </option>
          ))}
        </Select>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Año"
            type="number"
            min={2000}
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            required
          />
          <Input
            label="Días Totales"
            type="number"
            min={0}
            value={totalDays}
            onChange={(e) => setTotalDays(Number(e.target.value))}
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Días Usados"
            type="number"
            min={0}
            value={usedDays}
            onChange={(e) => setUsedDays(Number(e.target.value))}
          />
          <Input
            label="Días Arrastre"
            type="number"
            min={0}
            value={carryover}
            onChange={(e) => setCarryover(Number(e.target.value))}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" size="sm">
            Crear Saldo
          </Button>
        </div>
      </form>
    </Modal>
  );
}
