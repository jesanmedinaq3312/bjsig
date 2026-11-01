import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Wallet, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, Button, EmptyState, Spinner } from "@/components/ui";
import { ExportPdf } from "@/lib/exportPdf";
import { DocumentPreview } from "@/components/DocumentPreview";
import { payrollPeriodRepo, payrollItemRepo, workerRepo } from "@/lib/repositories";
import { callEdgeFunction } from "@/lib/edgeFunctions";
import { usePayrollItemsByPeriod, usePayrollStats } from "@/hooks/useModuleData";
import { audit } from "@/lib/audit";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/hooks/useConfirm";
import { useLoading } from "@/components/LoadingProvider";
import type { PayrollPeriod, PayrollItem, Worker } from "@/lib/types";
import type { AppData } from "@/hooks/useAppData";
import { StatsCards } from "./payroll/StatsCards";
import { PeriodCard } from "./payroll/PeriodCard";
import { SalarySection } from "./payroll/SalarySection";
import { NewPeriodModal } from "./payroll/NewPeriodModal";
import { SalaryModal } from "./payroll/SalaryModal";
import { fmtCLP, totalDeductions } from "./payroll/utils";

const PERIODS_PAGE_SIZE = 20;

export function PayrollView({
  data,
  userRole,
  permissions,
}: {
  data: AppData;
  userRole?: string;
  permissions?: Record<string, boolean>;
}) {
  const { workers, loading } = data;
  const canDelete = userRole === "superadmin" || !!permissions?.can_delete_payroll;
  const toast = useToast();
  const { confirm } = useConfirm();
  const { runWithLoading } = useLoading();
  const queryClient = useQueryClient();
  const [periodModal, setPeriodModal] = useState(false);
  const [expandedPeriod, setExpandedPeriod] = useState<string | null>(null);
  const [salaryModalFor, setSalaryModalFor] = useState<Worker | null>(null);
  const [previewPeriod, setPreviewPeriod] = useState<PayrollPeriod | null>(null);
  const [periodsPage, setPeriodsPage] = useState(1);

  const workerName = (rut: string) => workers.find((w) => w.rut === rut)?.full_name ?? rut;
  // Server-side paginated periods
  const { data: periodsPageData, isLoading: periodsLoading } = useQuery({
    queryKey: ["payrollPeriods", "paginated", periodsPage, PERIODS_PAGE_SIZE],
    queryFn: () =>
      payrollPeriodRepo.getPaginatedWithDateRange(periodsPage, PERIODS_PAGE_SIZE, "created_at"),
    staleTime: 120_000,
  });
  const payrollPeriods = periodsPageData?.rows ?? [];
  const periodsTotal = periodsPageData?.total ?? 0;
  const periodsHasMore = periodsPageData?.hasMore ?? false;

  // Fetch items for the expanded period on-demand
  const { data: expandedItemsData } = usePayrollItemsByPeriod(expandedPeriod);
  const expandedItems = expandedItemsData ?? [];

  // Server-side aggregate stats via RPC (avoids truncation)
  const { data: statsData } = usePayrollStats();
  const totalPayroll = statsData?.total_payroll ?? 0;
  const workersCount = statsData?.workers_count ?? workers.length;
  const itemsCount = statsData?.items_count ?? 0;

  function itemsForPeriod(periodId: string): PayrollItem[] {
    if (expandedPeriod === periodId) return expandedItems;
    return [];
  }

  async function createPeriod(form: {
    period_label: string;
    period_month: number;
    period_year: number;
    start_date: string;
    end_date: string;
    notes: string;
  }) {
    try {
      await runWithLoading(async () => {
        await payrollPeriodRepo.insert({ ...form, notes: form.notes || null, status: "borrador" });
        await audit({
          action: "payroll.period_create",
          entity: "payroll_periods",
          entity_label: form.period_label,
        });
        setPeriodModal(false);
        toast.success("Período creado", form.period_label);
        await queryClient.invalidateQueries({ queryKey: ["payrollPeriods"] });
        await queryClient.invalidateQueries({ queryKey: ["payrollStats"] });
      });
    } catch (e) {
      toast.error("Error", (e as Error).message);
    }
  }

  async function deletePeriod(p: PayrollPeriod) {
    if (p.status === "aprobado" || p.status === "pagado") {
      toast.error("Período cerrado", "Un período aprobado o pagado no puede eliminarse.");
      return;
    }
    const ok = await confirm({
      title: "Eliminar período",
      message: `¿Eliminar "${p.period_label}"? Se borrarán todas las liquidaciones asociadas.`,
      confirmText: "Eliminar",
      type: "danger",
    });
    if (!ok) return;
    try {
      await runWithLoading(async () => {
        await payrollPeriodRepo.remove(p.id);
        await audit({
          action: "payroll.period_delete",
          entity: "payroll_periods",
          entity_id: p.id,
          entity_label: p.period_label,
        });
        toast.success("Período eliminado", p.period_label);
        await queryClient.invalidateQueries({ queryKey: ["payrollPeriods"] });
        await queryClient.invalidateQueries({ queryKey: ["payrollItems"] });
        await queryClient.invalidateQueries({ queryKey: ["payrollStats"] });
        await queryClient.invalidateQueries({ queryKey: ["payrollPeriodSummary"] });
      });
    } catch (e) {
      toast.error("Error", (e as Error).message);
    }
  }

  async function calculatePeriod(p: PayrollPeriod) {
    if (p.status !== "borrador" && p.status !== "calculado") {
      toast.error("Período cerrado", "Solo un período en borrador puede recalcularse.");
      return;
    }
    try {
      await runWithLoading(async () => {
        const { data: result, error } = await callEdgeFunction<{
          workers: number;
          total_net: number;
        }>("payroll-calculate", { period_id: p.id });
        if (error) throw new Error(error);
        await audit({
          action: "payroll.calculate",
          entity: "payroll_periods",
          entity_id: p.id,
          entity_label: p.period_label,
          details: { workers: result?.workers },
        });
        toast.success(
          "Liquidaciones calculadas",
          `${result?.workers ?? 0} trabajadores procesados`,
        );
        await queryClient.invalidateQueries({ queryKey: ["payrollPeriods"] });
        await queryClient.invalidateQueries({ queryKey: ["payrollItems"] });
        await queryClient.invalidateQueries({ queryKey: ["payrollStats"] });
        await queryClient.invalidateQueries({ queryKey: ["payrollPeriodSummary"] });
      });
    } catch (e) {
      toast.error("Error", (e as Error).message);
    }
  }

  /** Cierra el período congelando los montos calculados (snapshot auditable). */
  async function approvePeriod(p: PayrollPeriod) {
    const items = await payrollItemRepo.getByPeriod(p.id);
    if (items.length === 0) {
      toast.error("Sin liquidaciones", "Calcula el período antes de aprobarlo.");
      return;
    }
    const total = items.reduce((s, i) => s + Number(i.net_pay), 0);
    const ok = await confirm({
      title: "Cerrar período",
      message: `Se congelarán ${items.length} liquidaciones por ${fmtCLP(total)}. Después no podrás recalcular ni editar montos de este período.`,
      confirmText: "Cerrar y aprobar",
    });
    if (!ok) return;
    try {
      await runWithLoading(async () => {
        const snapshot = {
          status: "aprobado" as const,
          closed_at: new Date().toISOString(),
          items_snapshot: items.length,
          total_snapshot: Math.round(total),
        };
        try {
          await payrollPeriodRepo.update(p.id, snapshot as unknown as Partial<PayrollPeriod>);
        } catch {
          // Base de datos sin columnas de snapshot: al menos se cierra el período.
          await payrollPeriodRepo.update(p.id, { status: "aprobado" });
        }
        await audit({
          action: "payroll.approve",
          entity: "payroll_periods",
          entity_id: p.id,
          entity_label: p.period_label,
          details: { items: items.length, total: Math.round(total) },
        });
        toast.success("Período cerrado", `${p.period_label} — ${fmtCLP(total)}`);
        await queryClient.invalidateQueries({ queryKey: ["payrollPeriods"] });
        await queryClient.invalidateQueries({ queryKey: ["payrollStats"] });
      });
    } catch (e) {
      toast.error("Error", (e as Error).message);
    }
  }

  async function markPaid(p: PayrollPeriod) {
    if (p.status !== "aprobado") {
      toast.error("Falta cerrar", "Primero aprueba (cierra) el período antes de marcarlo pagado.");
      return;
    }
    const ok = await confirm({
      title: "Marcar como pagado",
      message: `Se marcará "${p.period_label}" y todas sus liquidaciones como pagadas. Esta acción no se puede revertir.`,
      confirmText: "Marcar pagado",
    });
    if (!ok) return;
    try {
      await runWithLoading(async () => {
        const items = await payrollItemRepo.getByPeriod(p.id);
        await payrollPeriodRepo.update(p.id, { status: "pagado" });
        for (const item of items) {
          await payrollItemRepo.update(item.id, { status: "pagado" });
        }
        await audit({
          action: "payroll.paid",
          entity: "payroll_periods",
          entity_id: p.id,
          entity_label: p.period_label,
        });
        toast.success("Período marcado como pagado", p.period_label);
        await queryClient.invalidateQueries({ queryKey: ["payrollPeriods"] });
        await queryClient.invalidateQueries({ queryKey: ["payrollItems"] });
        await queryClient.invalidateQueries({ queryKey: ["payrollStats"] });
        await queryClient.invalidateQueries({ queryKey: ["payrollPeriodSummary"] });
      });
    } catch (e) {
      toast.error("Error", (e as Error).message);
    }
  }

  async function saveSalaryParams(w: Worker, params: Partial<Worker>) {
    try {
      await runWithLoading(async () => {
        await workerRepo.update(w.id, params);
        await audit({
          action: "worker.salary_update",
          entity: "workers",
          entity_id: w.id,
          entity_label: w.full_name,
        });
        setSalaryModalFor(null);
        toast.success("Parámetros guardados", w.full_name);
        await queryClient.invalidateQueries({ queryKey: ["workers"] });
      });
    } catch (e) {
      toast.error("Error", (e as Error).message);
    }
  }

  if (loading || periodsLoading) return <Spinner />;

  return (
    <div className="space-y-5">
      <StatsCards
        totalPayroll={totalPayroll}
        periodsCount={periodsTotal}
        workersCount={workersCount}
        itemsCount={itemsCount}
      />

      <div className="flex justify-end gap-2">
        <Button size="sm" onClick={() => setPeriodModal(true)}>
          <Plus size={15} /> Nuevo Período
        </Button>
      </div>

      {payrollPeriods.length === 0 ? (
        <Card>
          <EmptyState message="No hay períodos de nómina creados" icon={<Wallet size={32} />} />
        </Card>
      ) : (
        <div className="space-y-3">
          {payrollPeriods.map((p) => (
            <PeriodCard
              key={p.id}
              period={p}
              items={itemsForPeriod(p.id)}
              isExpanded={expandedPeriod === p.id}
              workerName={workerName}
              onToggleExpand={() => setExpandedPeriod(expandedPeriod === p.id ? null : p.id)}
              onCalculate={() => calculatePeriod(p)}
              onApprove={() => approvePeriod(p)}
              onMarkPaid={() => markPaid(p)}
              onPreview={() => setPreviewPeriod(p)}
              onDelete={
                canDelete && p.status !== "aprobado" && p.status !== "pagado"
                  ? () => {
                      void deletePeriod(p);
                    }
                  : undefined
              }
            />
          ))}
          {(periodsTotal > PERIODS_PAGE_SIZE || periodsPage > 1) && (
            <div className="flex items-center justify-between px-1">
              <span className="text-xs text-slate-500">
                Página {periodsPage} · {payrollPeriods.length} de {periodsTotal} períodos
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPeriodsPage((p) => Math.max(1, p - 1))}
                  disabled={periodsPage === 1}
                >
                  <ChevronLeft size={15} /> Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPeriodsPage((p) => p + 1)}
                  disabled={!periodsHasMore}
                >
                  Siguiente <ChevronRight size={15} />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <SalarySection workers={workers} onConfigure={setSalaryModalFor} />

      <NewPeriodModal
        open={periodModal}
        onClose={() => setPeriodModal(false)}
        onCreate={createPeriod}
      />
      <SalaryModal
        worker={salaryModalFor}
        onClose={() => setSalaryModalFor(null)}
        onSave={saveSalaryParams}
      />
      <DocumentPreview
        open={!!previewPeriod}
        onClose={() => setPreviewPeriod(null)}
        title={previewPeriod ? `Liquidaciones — ${previewPeriod.period_label}` : ""}
        fileName={
          previewPeriod
            ? `liquidaciones_${previewPeriod.period_year}_${previewPeriod.period_month}`
            : ""
        }
        generatePdf={async () => {
          if (!previewPeriod) throw new Error("Sin período");
          const items = await payrollItemRepo.getByPeriod(previewPeriod.id);
          const headers = [
            "Trabajador",
            "RUT",
            "Días Pres.",
            "Hrs Reg.",
            "Hrs Ext.",
            "Base",
            "Bonos",
            "Descuentos",
            "Líquido",
          ];
          const body = items.map((i) => [
            workerName(i.worker_rut),
            i.worker_rut,
            i.days_present,
            `${i.regular_hours}h`,
            `${i.overtime_hours}h`,
            fmtCLP(i.base_salary_amount),
            fmtCLP(i.bonus_amount),
            fmtCLP(totalDeductions(i)),
            fmtCLP(i.net_pay),
          ]);
          return ExportPdf.toPdfBlob(
            `Liquidaciones de Sueldo — ${previewPeriod.period_label}`,
            headers,
            body,
            `liquidaciones_${previewPeriod.period_year}_${previewPeriod.period_month}`,
            `Período: ${previewPeriod.start_date} a ${previewPeriod.end_date}`,
          );
        }}
      />
    </div>
  );
}
