import { useState, useMemo, useEffect } from "react";
import {
  Plus,
  Trash2,
  FileSpreadsheet,
  Calculator,
  DollarSign,
  Briefcase,
  Download,
  Eye,
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
import { ExportPdf } from "@/lib/exportPdf";
import { DocumentPreview } from "@/components/DocumentPreview";
import { finiquitoRepo } from "@/lib/repositories";
import { audit } from "@/lib/audit";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/hooks/useConfirm";
import { useLoading } from "@/components/LoadingProvider";
import type { FiniquitoRecord, FiniquitoReason } from "@/lib/types";
import { calcFiniquito } from "@/lib/payroll";
import type { AppData } from "@/hooks/useAppData";

const REASONS: { value: FiniquitoReason; label: string }[] = [
  { value: "renuncia", label: "Renuncia" },
  { value: "despido_justificado", label: "Despido Justificado" },
  { value: "despido_injustificado", label: "Despido Injustificado" },
  { value: "necesidades_empresa", label: "Necesidades de la Empresa (Art. 161)" },
  { value: "mutuo_acuerdo", label: "Mutuo Acuerdo" },
  { value: "vencimiento_contrato", label: "Vencimiento de Contrato" },
  { value: "fallecimiento", label: "Fallecimiento" },
];

function reasonLabel(r: FiniquitoReason): string {
  return REASONS.find((x) => x.value === r)?.label ?? r;
}

function fmtCLP(n: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(n);
}

export function FiniquitosView({
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
  const { workers, finiquitos, vacationBalances, loading } = data;
  const canDelete = userRole === "superadmin" || !!permissions?.can_delete_finiquitos;
  const toast = useToast();
  const { confirm } = useConfirm();
  const { runWithLoading } = useLoading();
  const [modalOpen, setModalOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [bankAccount, setBankAccount] = useState<{
    bank_name: string;
    account_type: string;
    account_number: string;
    holder_name: string;
    holder_rut: string | null;
  } | null>(null);

  const workerName = (rut: string) => workers.find((w) => w.rut === rut)?.full_name ?? rut;
  const detail = finiquitos.find((f) => f.id === detailId);

  useEffect(() => {
    if (!detailId) {
      setBankAccount(null);
      return;
    }
    const f = finiquitos.find((x) => x.id === detailId);
    if (!f) return;
    void (async () => {
      try {
        const { data: ba } = await (
          await import("@/lib/supabase")
        ).supabase
          .from("worker_bank_accounts")
          .select("bank_name, account_type, account_number, holder_name, holder_rut")
          .eq("worker_rut", f.worker_rut)
          .eq("is_active", true)
          .maybeSingle();
        setBankAccount(ba as typeof bankAccount);
      } catch {
        setBankAccount(null);
      }
    })();
  }, [detailId, finiquitos]);

  async function generateFiniquitoPdf(f: FiniquitoRecord): Promise<Blob> {
    return ExportPdf.toFiniquitoPdf({
      workerName: f.worker_name,
      workerRut: f.worker_rut,
      hireDate: f.hire_date,
      endDate: f.end_date,
      reason: reasonLabel(f.reason),
      baseSalary: f.base_salary,
      yearsOfService: f.years_of_service,
      monthsOfService: f.months_of_service,
      vacationDaysPending: f.vacation_days_pending,
      indemnizacionAnios: f.indemnizacion_anios_servicio,
      indemnizacionSustitutiva: f.indemnizacion_sustitutiva,
      vacacionesNoGozadas: f.vacaciones_no_gozadas,
      gratificacion: f.gratificacion,
      total: f.total_finiquito,
      notes: f.notes,
    });
  }

  async function downloadFiniquitoPdf(f: FiniquitoRecord) {
    try {
      const blob = await generateFiniquitoPdf(f);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Finiquito_${f.worker_name.replace(/\s+/g, "_")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      await audit({
        action: "finiquito.export_pdf",
        entity: "finiquito_records",
        entity_id: f.id,
        entity_label: f.worker_name,
      });
    } catch (e) {
      toast.error("Error al generar PDF", (e as Error).message);
    }
  }

  const totalAmount = useMemo(
    () => finiquitos.reduce((s, f) => s + f.total_finiquito, 0),
    [finiquitos],
  );
  const avgAmount = finiquitos.length > 0 ? Math.round(totalAmount / finiquitos.length) : 0;

  async function addFiniquito(
    form: Omit<
      FiniquitoRecord,
      | "id"
      | "created_at"
      | "indemnizacion_anios_servicio"
      | "indemnizacion_sustitutiva"
      | "vacaciones_no_gozadas"
      | "total_finiquito"
      | "gratificacion"
      | "worker_name"
    >,
  ) {
    try {
      await runWithLoading(async () => {
        const calc = calcFiniquito(
          form.base_salary,
          form.years_of_service,
          form.months_of_service,
          form.vacation_days_pending,
          form.reason,
        );
        const saved = await finiquitoRepo.insert({
          ...form,
          worker_name: workerName(form.worker_rut),
          indemnizacion_anios_servicio: calc.indemnizacionAnios,
          indemnizacion_sustitutiva: calc.indemnizacionSustitutiva,
          vacaciones_no_gozadas: calc.vacacionesNoGozadas,
          gratificacion: calc.gratificacion,
          total_finiquito: calc.total,
        });
        if (Math.round(saved.total_finiquito) !== calc.total) {
          toast.error(
            "Diferencia de cálculo detectada",
            `La vista previa mostró ${fmtCLP(calc.total)} y el sistema guardó ${fmtCLP(saved.total_finiquito)}. Revisa la regla de cálculo en la base de datos antes de pagar.`,
          );
        }
        await audit({
          action: "finiquito.create",
          entity: "finiquito_records",
          entity_label: `${saved.worker_name} — ${fmtCLP(saved.total_finiquito)}`,
        });
        setModalOpen(false);
        toast.success("Finiquito creado", fmtCLP(saved.total_finiquito));
        await data.reload();
      });
    } catch (e) {
      toast.error("Error", (e as Error).message);
    }
  }

  async function delFiniquito(f: FiniquitoRecord) {
    const ok = await confirm({
      title: "Eliminar finiquito",
      message: `¿Eliminar el finiquito de ${f.worker_name}? Esta acción no se puede deshacer.`,
      confirmText: "Eliminar",
      type: "danger",
    });
    if (!ok) return;
    try {
      await runWithLoading(async () => {
        await finiquitoRepo.remove(f.id);
        await audit({ action: "finiquito.delete", entity: "finiquito_records", entity_id: f.id });
        toast.success("Finiquito eliminado");
        await data.reload();
      });
    } catch (e) {
      toast.error("Error", (e as Error).message);
    }
  }

  function exportExcel() {
    ExportService.toExcel(
      finiquitos.map((f) => ({
        Trabajador: f.worker_name,
        RUT: f.worker_rut,
        "Fecha Ingreso": f.hire_date,
        "Fecha Término": f.end_date,
        Causal: reasonLabel(f.reason),
        "Sueldo Base": f.base_salary,
        "Años Servicio": f.years_of_service,
        "Meses Servicio": f.months_of_service,
        "Indemnización Años": f.indemnizacion_anios_servicio,
        "Indemnización Sustitutiva": f.indemnizacion_sustitutiva,
        "Vacaciones No Gozadas": f.vacaciones_no_gozadas,
        "Días Vacaciones Pendientes": f.vacation_days_pending,
        Total: f.total_finiquito,
        Notas: f.notes ?? "",
      })),
      "Finiquitos",
      "finiquitos_gyc",
    );
  }

  if (loading) return <Spinner />;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Calculator size={18} className="text-blue-600" />
            <span className="text-xs text-slate-500">Finiquitos</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{finiquitos.length}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign size={18} className="text-emerald-600" />
            <span className="text-xs text-slate-500">Monto Total</span>
          </div>
          <p className="text-lg font-bold text-slate-800">{fmtCLP(totalAmount)}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign size={18} className="text-amber-600" />
            <span className="text-xs text-slate-500">Promedio</span>
          </div>
          <p className="text-lg font-bold text-slate-800">{fmtCLP(avgAmount)}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Briefcase size={18} className="text-violet-600" />
            <span className="text-xs text-slate-500">Causales</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">
            {new Set(finiquitos.map((f) => f.reason)).size}
          </p>
        </Card>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={exportExcel}>
          <FileSpreadsheet size={15} /> Excel
        </Button>
        <Button size="sm" onClick={() => setModalOpen(true)}>
          <Plus size={15} /> Nuevo Finiquito
        </Button>
      </div>

      <Card>
        <CardHeader
          title="Registro de Finiquitos"
          subtitle="Cálculo de indemnizaciones y liquidaciones conforme al Código del Trabajo"
        />
        {finiquitos.length === 0 ? (
          <EmptyState message="No hay finiquitos registrados" icon={<Calculator size={32} />} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
                  <th className="pb-2 pr-4">Trabajador</th>
                  <th className="pb-2 pr-4">Causal</th>
                  <th className="pb-2 pr-4">Ingreso</th>
                  <th className="pb-2 pr-4">Término</th>
                  <th className="pb-2 pr-4">Años</th>
                  <th className="pb-2 pr-4 text-right">Total</th>
                  <th className="pb-2 pr-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {finiquitos.map((f) => (
                  <tr
                    key={f.id}
                    className="hover:bg-slate-50/50 cursor-pointer"
                    onClick={() => setDetailId(f.id)}
                  >
                    <td className="py-2.5 pr-4 font-medium text-slate-700">{f.worker_name}</td>
                    <td className="py-2.5 pr-4">
                      <Badge className="bg-slate-100 text-slate-600 border-slate-200">
                        {reasonLabel(f.reason)}
                      </Badge>
                    </td>
                    <td className="py-2.5 pr-4 text-slate-500">{f.hire_date}</td>
                    <td className="py-2.5 pr-4 text-slate-500">{f.end_date}</td>
                    <td className="py-2.5 pr-4">{f.years_of_service}</td>
                    <td className="py-2.5 pr-4 text-right font-semibold text-slate-800">
                      {fmtCLP(f.total_finiquito)}
                    </td>
                    <td className="py-2.5 pr-4">
                      {canDelete && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            delFiniquito(f);
                          }}
                          className="p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 rounded"
                          title="Eliminar"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <FiniquitoModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        workers={workers}
        vacationBalances={vacationBalances}
        onSave={addFiniquito}
        currentUserEmail={currentUserEmail}
      />

      {detail && (
        <Modal
          open={!!detailId}
          onClose={() => setDetailId(null)}
          title={`Detalle Finiquito — ${detail.worker_name}`}
          size="lg"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-slate-500">RUT</p>
                <p className="text-sm font-medium text-slate-800">{detail.worker_rut}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-slate-500">Causal</p>
                <p className="text-sm font-medium text-slate-800">{reasonLabel(detail.reason)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-slate-500">Fecha de Ingreso</p>
                <p className="text-sm font-medium text-slate-800">{detail.hire_date}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-slate-500">Fecha de Término</p>
                <p className="text-sm font-medium text-slate-800">{detail.end_date}</p>
              </div>
            </div>
            {bankAccount && (
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                <p className="text-xs font-semibold text-blue-700 mb-1.5">
                  Cuenta Bancaria para Pago
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500">Banco:</span>{" "}
                    <span className="font-medium text-slate-800">{bankAccount.bank_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Tipo:</span>{" "}
                    <span className="font-medium text-slate-800">{bankAccount.account_type}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Cuenta:</span>{" "}
                    <span className="font-mono font-medium text-slate-800">
                      {bankAccount.account_number}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Titular:</span>{" "}
                    <span className="font-medium text-slate-800">{bankAccount.holder_name}</span>
                  </div>
                </div>
              </div>
            )}
            <div className="border-t border-slate-200 pt-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Sueldo Base</span>
                <span className="font-medium text-slate-800">{fmtCLP(detail.base_salary)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">
                  Indemnización Años de Servicio ({detail.years_of_service} años{" "}
                  {detail.months_of_service} meses)
                </span>
                <span className="font-medium text-slate-800">
                  {fmtCLP(detail.indemnizacion_anios_servicio)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Indemnización Sustitutiva</span>
                <span className="font-medium text-slate-800">
                  {fmtCLP(detail.indemnizacion_sustitutiva)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">
                  Vacaciones No Gozadas ({detail.vacation_days_pending} días)
                </span>
                <span className="font-medium text-slate-800">
                  {fmtCLP(detail.vacaciones_no_gozadas)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Gratificación</span>
                <span className="font-medium text-slate-800">{fmtCLP(detail.gratificacion)}</span>
              </div>
              <div className="flex justify-between text-base font-bold border-t border-slate-200 pt-2">
                <span className="text-slate-800">Total Finiquito</span>
                <span className="text-primary">{fmtCLP(detail.total_finiquito)}</span>
              </div>
            </div>
            {detail.notes && (
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500 mb-1">Notas</p>
                <p className="text-sm text-slate-700">{detail.notes}</p>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)}>
                <Eye size={15} /> Vista previa PDF
              </Button>
              <Button size="sm" onClick={() => downloadFiniquitoPdf(detail)}>
                <Download size={15} /> Descargar PDF
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {detail && (
        <DocumentPreview
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          generatePdf={() => generateFiniquitoPdf(detail)}
          fileName={`Finiquito_${detail.worker_name.replace(/\s+/g, "_")}`}
          title={`Vista previa — Finiquito ${detail.worker_name}`}
        />
      )}
    </div>
  );
}

function FiniquitoModal({
  open,
  onClose,
  workers,
  vacationBalances,
  onSave,
  currentUserEmail,
}: {
  open: boolean;
  onClose: () => void;
  workers: AppData["workers"];
  vacationBalances: AppData["vacationBalances"];
  onSave: (
    form: Omit<
      FiniquitoRecord,
      | "id"
      | "created_at"
      | "indemnizacion_anios_servicio"
      | "indemnizacion_sustitutiva"
      | "vacaciones_no_gozadas"
      | "total_finiquito"
      | "gratificacion"
      | "worker_name"
    >,
  ) => Promise<void>;
  currentUserEmail: string;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [workerRut, setWorkerRut] = useState("");
  const [hireDate, setHireDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState<FiniquitoReason>("renuncia");
  const [baseSalary, setBaseSalary] = useState(0);
  const [years, setYears] = useState(0);
  const [months, setMonths] = useState(0);
  const [vacationPending, setVacationPending] = useState(0);
  const [notes, setNotes] = useState("");
  const [autoFilled, setAutoFilled] = useState(false);

  const preview = calcFiniquito(baseSalary, years, months, vacationPending, reason);

  useEffect(() => {
    if (!workerRut) return;
    const worker = workers.find((w) => w.rut === workerRut);
    if (!worker) return;
    if (worker.base_salary != null && worker.base_salary > 0) {
      setBaseSalary(worker.base_salary);
    }
    if (worker.hire_date) {
      setHireDate(worker.hire_date);
    }
    const endYear = new Date().getFullYear();
    const bal =
      vacationBalances.find((b) => b.worker_rut === workerRut && b.year === endYear) ??
      vacationBalances.find((b) => b.worker_rut === workerRut);
    if (bal) {
      setVacationPending(Math.max(0, bal.remaining_days));
    }
    setAutoFilled(true);
  }, [workerRut, workers, vacationBalances]);

  useEffect(() => {
    if (!hireDate || !endDate) return;
    const start = new Date(hireDate + "T00:00:00");
    const end = new Date(endDate + "T00:00:00");
    if (end < start) return;
    let y = end.getFullYear() - start.getFullYear();
    let m = end.getMonth() - start.getMonth();
    if (m < 0) {
      y -= 1;
      m += 12;
    }
    if (end.getDate() < start.getDate()) {
      m -= 1;
      if (m < 0) {
        y -= 1;
        m += 12;
      }
    }
    setYears(Math.max(0, y));
    setMonths(Math.max(0, m));
  }, [hireDate, endDate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (!workerRut || !hireDate || !endDate) return;
    if (!(baseSalary > 0) || !Number.isInteger(baseSalary)) return;
    setSubmitting(true);
    try {
      await onSave({
        worker_rut: workerRut,
        hire_date: hireDate,
        end_date: endDate,
        reason,
        base_salary: baseSalary,
        years_of_service: years,
        months_of_service: months,
        vacation_days_pending: vacationPending,
        notes: notes || null,
        created_by_email: currentUserEmail || "admin",
      });
      setWorkerRut("");
      setHireDate("");
      setEndDate("");
      setReason("renuncia");
      setBaseSalary(0);
      setYears(0);
      setMonths(0);
      setVacationPending(0);
      setNotes("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nuevo Finiquito" size="lg">
      <form onSubmit={submit} className="space-y-4">
        <Select
          label="Trabajador"
          value={workerRut}
          onChange={(e) => {
            setWorkerRut(e.target.value);
            setAutoFilled(false);
          }}
          required
        >
          <option value="">Seleccionar...</option>
          {workers.map((w) => (
            <option key={w.rut} value={w.rut}>
              {w.full_name} — {w.rut}
            </option>
          ))}
        </Select>
        {autoFilled && (
          <p className="text-xs text-blue-600 bg-blue-50 rounded px-2 py-1">
            Datos del trabajador y saldo vacacional cargados automáticamente. Edita solo si
            necesitas corregir.
          </p>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Fecha de Ingreso"
            type="date"
            value={hireDate}
            onChange={(e) => setHireDate(e.target.value)}
            required
          />
          <Input
            label="Fecha de Término"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
          />
        </div>
        <Select
          label="Causal de Término"
          value={reason}
          onChange={(e) => setReason(e.target.value as FiniquitoReason)}
          required
        >
          {REASONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </Select>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Sueldo Base (CLP)"
            type="number"
            min={0}
            value={baseSalary}
            onChange={(e) => setBaseSalary(Number(e.target.value))}
            required
          />
          <Input
            label="Días Vacaciones Pendientes"
            type="number"
            min={0}
            value={vacationPending}
            onChange={(e) => setVacationPending(Number(e.target.value))}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Años de Servicio"
            type="number"
            min={0}
            value={years}
            onChange={(e) => setYears(Number(e.target.value))}
            required
          />
          <Input
            label="Meses Adicionales"
            type="number"
            min={0}
            max={11}
            value={months}
            onChange={(e) => setMonths(Number(e.target.value))}
          />
        </div>
        <Textarea
          label="Notas (opcional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />

        <div className="bg-slate-50 rounded-lg p-4 space-y-1.5">
          <p className="text-xs font-semibold text-slate-600 mb-2">Vista Previa del Cálculo</p>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">
              Indemnización Años de Servicio ({preview.aniosComputables} años computables)
            </span>
            <span className="font-medium">{fmtCLP(preview.indemnizacionAnios)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Indemnización Sustitutiva</span>
            <span className="font-medium">{fmtCLP(preview.indemnizacionSustitutiva)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Vacaciones No Gozadas</span>
            <span className="font-medium">{fmtCLP(preview.vacacionesNoGozadas)}</span>
          </div>
          <div className="flex justify-between text-base font-bold border-t border-slate-200 pt-1.5">
            <span className="text-slate-800">Total</span>
            <span className="text-primary">{fmtCLP(preview.total)}</span>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" size="sm" disabled={submitting || !(baseSalary > 0)}>
            {submitting ? "Guardando…" : "Crear Finiquito"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
