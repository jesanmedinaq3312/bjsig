import { useState, useMemo, useEffect, useCallback } from "react";
import { Plus, Search, Wallet, HandCoins, Percent, FileSpreadsheet, Clock } from "lucide-react";
import { Card, Button, Spinner } from "@/components/ui";
import {
  salaryAdvanceRepo,
  internalLoanRepo,
  workerDiscountRepo,
  workerPaymentStatementRepo,
  getActiveWorkersLite,
  getCurrentUserEmail,
} from "@/lib/repositories";
import { audit } from "@/lib/audit";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/hooks/useConfirm";
import type {
  SalaryAdvance,
  InternalLoan,
  WorkerDiscount,
  WorkerPaymentStatement,
  Worker,
} from "@/lib/types";
import {
  type Tab,
  ADVANCE_STATUS_LABELS,
  LOAN_STATUS_LABELS,
  DISCOUNT_STATUS_LABELS,
  fmtCL,
} from "./extended-finance/constants";
import {
  loanOutstanding,
  entriesForReference,
  alreadyAppliedInPeriod,
  currentPeriodLabel,
} from "@/lib/finance";
import { type ModalMode, FinanceModal } from "./extended-finance/FinanceModal";
import { AdvanceTable, LoanTable, DiscountTable, StatementTable } from "./extended-finance/Tables";
import { WorkerStatementDetail } from "./extended-finance/WorkerStatementDetail";

export function ExtendedFinanceView({
  userRole,
  permissions,
}: {
  userRole: string;
  permissions?: Record<string, boolean>;
}) {
  const canManage =
    userRole === "superadmin" ||
    userRole === "developer" ||
    permissions?.["can_view_payroll"] === true ||
    permissions?.["can_edit_workers"] === true;
  const canDelete =
    userRole === "superadmin" ||
    userRole === "developer" ||
    permissions?.["can_delete_extended_finance"] === true;
  const [tab, setTab] = useState<Tab>("advances");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [advances, setAdvances] = useState<SalaryAdvance[]>([]);
  const [loans, setLoans] = useState<InternalLoan[]>([]);
  const [discounts, setDiscounts] = useState<WorkerDiscount[]>([]);
  const [statements, setStatements] = useState<WorkerPaymentStatement[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("advance");
  const [viewingWorker, setViewingWorker] = useState<Worker | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const { confirm } = useConfirm();

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [wRes, aRes, lRes, dRes, sRes] = await Promise.all([
        getActiveWorkersLite(),
        salaryAdvanceRepo.getRecent(300),
        internalLoanRepo.getRecent(300),
        workerDiscountRepo.getRecent(300),
        workerPaymentStatementRepo.getRecent(500),
      ]);
      setWorkers(wRes as unknown as Worker[]);
      setAdvances(aRes);
      setLoans(lRes);
      setDiscounts(dRes);
      setStatements(sRes);
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

  /** Saldo real de cada préstamo, derivado de las cuotas registradas en la cartola. */
  const loanBalances = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of loans) m.set(l.id, loanOutstanding(l, entriesForReference(statements, l.id)));
    return m;
  }, [loans, statements]);

  const stats = useMemo(() => {
    const pendingAdvances = advances.filter((a) => a.status === "pendiente").length;
    const approvedAdvances = advances
      .filter((a) => a.status === "aprobado")
      .reduce((s, a) => s + Number(a.amount), 0);
    const activeLoans = loans
      .filter((l) => l.status === "activo")
      .reduce((s, l) => s + (loanBalances.get(l.id) ?? 0), 0);
    const pendingDiscounts = discounts.filter((d) => d.status === "pendiente").length;
    return { pendingAdvances, approvedAdvances, activeLoans, pendingDiscounts };
  }, [advances, loans, discounts, loanBalances]);

  const filteredAdvances = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return advances;
    return advances.filter(
      (a) =>
        (workerMap.get(a.worker_rut) ?? "").toLowerCase().includes(q) || a.worker_rut.includes(q),
    );
  }, [advances, search, workerMap]);

  const filteredLoans = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return loans;
    return loans.filter(
      (l) =>
        (workerMap.get(l.worker_rut) ?? "").toLowerCase().includes(q) || l.worker_rut.includes(q),
    );
  }, [loans, search, workerMap]);

  const filteredDiscounts = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return discounts;
    return discounts.filter(
      (d) =>
        (workerMap.get(d.worker_rut) ?? "").toLowerCase().includes(q) ||
        d.worker_rut.includes(q) ||
        d.concept.toLowerCase().includes(q),
    );
  }, [discounts, search, workerMap]);

  function openModal(mode: ModalMode) {
    setModalMode(mode);
    setForm({});
    setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const userEmail = await getCurrentUserEmail();
      if (modalMode === "advance") {
        if (!form.worker_rut || !form.amount) {
          toast.error("Faltan datos", "Trabajador y monto son obligatorios");
          setSaving(false);
          return;
        }
        const data = await salaryAdvanceRepo.insert({
          worker_rut: form.worker_rut,
          amount: Number(form.amount),
          request_date: form.request_date || new Date().toISOString().slice(0, 10),
          status: "pendiente",
          notes: form.notes || null,
        } as never);
        await audit({
          action: "advance.create",
          entity: "salary_advances",
          entity_label: `${workerMap.get(form.worker_rut) ?? form.worker_rut} - ${fmtCL(Number(form.amount))}`,
        });
        setAdvances((prev) => [data as SalaryAdvance, ...prev]);
      } else if (modalMode === "loan") {
        if (!form.worker_rut || !form.principal_amount || !form.installments) {
          toast.error("Faltan datos", "Trabajador, monto y cuotas son obligatorios");
          setSaving(false);
          return;
        }
        const principal = Number(form.principal_amount);
        const installments = Number(form.installments);
        const monthly = Math.ceil(principal / installments);
        const data = await internalLoanRepo.insert({
          worker_rut: form.worker_rut,
          principal_amount: principal,
          installments,
          monthly_deduction: monthly,
          outstanding_balance: principal,
          start_date: form.start_date || new Date().toISOString().slice(0, 10),
          status: "activo",
          notes: form.notes || null,
          created_by: userEmail,
        } as never);
        await audit({
          action: "loan.create",
          entity: "internal_loans",
          entity_label: `${workerMap.get(form.worker_rut) ?? form.worker_rut} - ${fmtCL(principal)}`,
        });
        setLoans((prev) => [data as InternalLoan, ...prev]);
      } else if (modalMode === "discount") {
        if (!form.worker_rut || !form.amount || !form.concept) {
          toast.error("Faltan datos", "Trabajador, concepto y monto son obligatorios");
          setSaving(false);
          return;
        }
        const data = await workerDiscountRepo.insert({
          worker_rut: form.worker_rut,
          concept: form.concept,
          amount: Number(form.amount),
          discount_date: form.discount_date || new Date().toISOString().slice(0, 10),
          status: "pendiente",
          notes: form.notes || null,
        } as never);
        await audit({
          action: "discount.create",
          entity: "worker_discounts",
          entity_label: `${workerMap.get(form.worker_rut) ?? form.worker_rut} - ${form.concept}`,
        });
        setDiscounts((prev) => [data as WorkerDiscount, ...prev]);
      } else if (modalMode === "statement") {
        if (!form.worker_rut || !form.amount || !form.entry_type || !form.period_label) {
          toast.error("Faltan datos", "Trabajador, tipo, período y monto son obligatorios");
          setSaving(false);
          return;
        }
        const data = await workerPaymentStatementRepo.insert({
          worker_rut: form.worker_rut,
          period_label: form.period_label,
          entry_type: form.entry_type,
          amount: Number(form.amount),
          description: form.description || null,
        } as never);
        await audit({
          action: "statement.create",
          entity: "worker_payment_statements",
          entity_label: `${workerMap.get(form.worker_rut) ?? form.worker_rut} - ${form.period_label}`,
        });
        setStatements((prev) => [data as WorkerPaymentStatement, ...prev]);
      }
      toast.success("Registro guardado", "");
      setModalOpen(false);
    } catch (e) {
      toast.error("Error", (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  /** Registra el movimiento en la cartola evitando aplicarlo dos veces al mismo período. */
  async function registerStatement(entry: {
    worker_rut: string;
    period_label: string;
    entry_type: "anticipo" | "descuento" | "prestamo";
    amount: number;
    description: string;
    reference_id: string;
  }): Promise<boolean> {
    if (alreadyAppliedInPeriod(statements, entry.reference_id, entry.period_label)) {
      toast.error("Ya aplicado", `Este movimiento ya fue descontado en ${entry.period_label}`);
      return false;
    }
    const data = await workerPaymentStatementRepo.insert(entry as never);
    setStatements((prev) => [data as WorkerPaymentStatement, ...prev]);
    return true;
  }

  async function handleAdvanceStatus(a: SalaryAdvance, newStatus: string) {
    try {
      const period = currentPeriodLabel();
      const update: Record<string, unknown> = { status: newStatus };
      if (newStatus === "aprobado") {
        update.approved_by = await getCurrentUserEmail();
        update.approved_at = new Date().toISOString();
      }
      if (newStatus === "descontado") {
        if (a.deducted_in_period) {
          toast.error("Ya descontado", `Aplicado en ${a.deducted_in_period}`);
          return;
        }
        const ok = await confirm({
          title: "Descontar anticipo",
          message: `Se descontará ${fmtCL(Number(a.amount))} en el período ${period} y quedará registrado en la cartola.`,
          confirmText: "Descontar",
        });
        if (!ok) return;
        const done = await registerStatement({
          worker_rut: a.worker_rut,
          period_label: period,
          entry_type: "anticipo",
          amount: -Math.abs(Number(a.amount)),
          description: "Descuento de anticipo",
          reference_id: a.id,
        });
        if (!done) return;
        update.deducted_in_period = period;
      }
      await salaryAdvanceRepo.update(a.id, update as Partial<SalaryAdvance>);
      await audit({
        action: "advance.status_change",
        entity: "salary_advances",
        entity_label: `${a.worker_rut} → ${newStatus}`,
      });
      setAdvances((prev) =>
        prev.map((x) => (x.id === a.id ? ({ ...x, ...update } as SalaryAdvance) : x)),
      );
      toast.success("Estado actualizado", ADVANCE_STATUS_LABELS[newStatus]);
    } catch (e) {
      toast.error("Error", (e as Error).message);
    }
  }

  async function handleDiscountStatus(d: WorkerDiscount, newStatus: string) {
    try {
      const period = currentPeriodLabel();
      const update: Record<string, unknown> = { status: newStatus };
      if (newStatus === "aprobado") {
        update.approved_by = await getCurrentUserEmail();
      }
      if (newStatus === "descontado") {
        const ok = await confirm({
          title: "Aplicar descuento",
          message: `Se descontará ${fmtCL(Number(d.amount))} (${d.concept}) en el período ${period}.`,
          confirmText: "Descontar",
        });
        if (!ok) return;
        const done = await registerStatement({
          worker_rut: d.worker_rut,
          period_label: period,
          entry_type: "descuento",
          amount: -Math.abs(Number(d.amount)),
          description: d.concept,
          reference_id: d.id,
        });
        if (!done) return;
      }
      await workerDiscountRepo.update(d.id, update as Partial<WorkerDiscount>);
      await audit({
        action: "discount.status_change",
        entity: "worker_discounts",
        entity_label: `${d.worker_rut} → ${newStatus}`,
      });
      setDiscounts((prev) =>
        prev.map((x) => (x.id === d.id ? ({ ...x, ...update } as WorkerDiscount) : x)),
      );
      toast.success("Estado actualizado", DISCOUNT_STATUS_LABELS[newStatus]);
    } catch (e) {
      toast.error("Error", (e as Error).message);
    }
  }

  /** Descuenta una cuota del préstamo en el período actual, sin repetirla. */
  async function handleLoanInstallment(l: InternalLoan) {
    const period = currentPeriodLabel();
    const balance = loanBalances.get(l.id) ?? Number(l.outstanding_balance);
    if (balance <= 0) {
      toast.error("Sin saldo", "Este préstamo ya está pagado");
      return;
    }
    const cuota = Math.min(Math.round(Number(l.monthly_deduction)), balance);
    const ok = await confirm({
      title: "Descontar cuota",
      message: `Se descontará una cuota de ${fmtCL(cuota)} en el período ${period}. Saldo actual: ${fmtCL(balance)}.`,
      confirmText: "Descontar cuota",
    });
    if (!ok) return;
    try {
      const done = await registerStatement({
        worker_rut: l.worker_rut,
        period_label: period,
        entry_type: "prestamo",
        amount: -cuota,
        description: "Cuota de préstamo interno",
        reference_id: l.id,
      });
      if (!done) return;
      const nuevoSaldo = Math.max(0, balance - cuota);
      const update: Record<string, unknown> = { outstanding_balance: nuevoSaldo };
      if (nuevoSaldo === 0) update.status = "pagado";
      await internalLoanRepo.update(l.id, update as Partial<InternalLoan>);
      await audit({
        action: "loan.installment",
        entity: "internal_loans",
        entity_id: l.id,
        entity_label: `${l.worker_rut} - ${fmtCL(cuota)} (${period})`,
      });
      setLoans((prev) =>
        prev.map((x) => (x.id === l.id ? ({ ...x, ...update } as InternalLoan) : x)),
      );
      toast.success("Cuota descontada", fmtCL(cuota));
    } catch (e) {
      toast.error("Error", (e as Error).message);
    }
  }

  async function handleLoanStatus(l: InternalLoan, newStatus: string) {
    try {
      const period = currentPeriodLabel();
      const update: Record<string, unknown> = { status: newStatus };
      if (newStatus === "pagado") {
        const balance = loanBalances.get(l.id) ?? Number(l.outstanding_balance);
        if (balance > 0) {
          const ok = await confirm({
            title: "Saldar préstamo",
            message: `Se registrará el saldo restante de ${fmtCL(balance)} como pagado en el período ${period}.`,
            confirmText: "Saldar",
          });
          if (!ok) return;
          const done = await registerStatement({
            worker_rut: l.worker_rut,
            period_label: period,
            entry_type: "prestamo",
            amount: -balance,
            description: "Saldo final de préstamo interno",
            reference_id: l.id,
          });
          if (!done) return;
        }
        update.outstanding_balance = 0;
      }
      await internalLoanRepo.update(l.id, update as Partial<InternalLoan>);
      await audit({
        action: "loan.status_change",
        entity: "internal_loans",
        entity_label: `${l.worker_rut} → ${newStatus}`,
      });
      setLoans((prev) =>
        prev.map((x) => (x.id === l.id ? ({ ...x, ...update } as InternalLoan) : x)),
      );
      toast.success("Estado actualizado", LOAN_STATUS_LABELS[newStatus]);
    } catch (e) {
      toast.error("Error", (e as Error).message);
    }
  }

  const deleteRepos = {
    salary_advances: salaryAdvanceRepo,
    internal_loans: internalLoanRepo,
    worker_discounts: workerDiscountRepo,
    worker_payment_statements: workerPaymentStatementRepo,
  } as const;

  async function handleDelete(
    table: keyof typeof deleteRepos,
    id: string,
    label: string,
    setter: () => void,
  ) {
    if (table !== "worker_payment_statements" && entriesForReference(statements, id).length > 0) {
      toast.error(
        "No se puede eliminar",
        "Ya fue descontado en un período. Anúlalo con un ajuste en la cartola.",
      );
      return;
    }
    if (table === "salary_advances" && advances.find((a) => a.id === id)?.deducted_in_period) {
      toast.error("No se puede eliminar", "Este anticipo ya fue descontado en una liquidación.");
      return;
    }

    const ok = await confirm({
      title: "Eliminar",
      message: `Se eliminará: ${label}`,
      confirmText: "Eliminar",
      type: "danger",
    });
    if (!ok) return;
    try {
      await deleteRepos[table].remove(id);
      setter();
      toast.success("Eliminado", label);
    } catch (e) {
      toast.error("Error", (e as Error).message);
    }
  }

  if (loading) return <Spinner />;

  const tabs: { key: Tab; label: string; icon: typeof Wallet }[] = [
    { key: "advances", label: "Anticipos", icon: HandCoins },
    { key: "loans", label: "Préstamos", icon: Wallet },
    { key: "discounts", label: "Descuentos", icon: Percent },
    { key: "statements", label: "Cartola de Pago", icon: FileSpreadsheet },
  ];

  if (viewingWorker) {
    return (
      <WorkerStatementDetail
        worker={viewingWorker}
        statements={statements}
        onBack={() => setViewingWorker(null)}
      />
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-amber-600 text-xs font-medium mb-1">
            <Clock size={14} /> Anticipos pendientes
          </div>
          <p className="text-xl font-bold text-amber-700">{stats.pendingAdvances}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-emerald-600 text-xs font-medium mb-1">
            <HandCoins size={14} /> Anticipos aprobados
          </div>
          <p className="text-xl font-bold text-emerald-700">{fmtCL(stats.approvedAdvances)}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-blue-600 text-xs font-medium mb-1">
            <Wallet size={14} /> Saldo préstamos
          </div>
          <p className="text-xl font-bold text-blue-700">{fmtCL(stats.activeLoans)}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-red-600 text-xs font-medium mb-1">
            <Percent size={14} /> Descuentos pendientes
          </div>
          <p className="text-xl font-bold text-red-700">{stats.pendingDiscounts}</p>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                tab === t.key
                  ? "border-primary text-primary"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <Icon size={16} /> {t.label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="glass-input w-full pl-9 pr-3 py-2 text-sm text-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Buscar por trabajador..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {canManage && (
          <Button
            onClick={() =>
              openModal(
                tab === "statements"
                  ? "statement"
                  : tab === "advances"
                    ? "advance"
                    : tab === "loans"
                      ? "loan"
                      : "discount",
              )
            }
          >
            <Plus size={16} /> Nuevo{" "}
            {tab === "advances"
              ? "Anticipo"
              : tab === "loans"
                ? "Préstamo"
                : tab === "discounts"
                  ? "Descuento"
                  : "Movimiento"}
          </Button>
        )}
      </div>

      {tab === "advances" && (
        <AdvanceTable
          advances={filteredAdvances}
          workerMap={workerMap}
          canManage={canManage}
          canDelete={canDelete}
          onStatusChange={handleAdvanceStatus}
          onDelete={(a) =>
            handleDelete(
              "salary_advances",
              a.id,
              `Anticipo ${workerMap.get(a.worker_rut) ?? a.worker_rut}`,
              () => setAdvances((prev) => prev.filter((x) => x.id !== a.id)),
            )
          }
        />
      )}

      {tab === "loans" && (
        <LoanTable
          loans={filteredLoans}
          workerMap={workerMap}
          canManage={canManage}
          canDelete={canDelete}
          balances={loanBalances}
          onInstallment={(l) => {
            void handleLoanInstallment(l);
          }}
          onStatusChange={handleLoanStatus}

          onDelete={(l) =>
            handleDelete(
              "internal_loans",
              l.id,
              `Préstamo ${workerMap.get(l.worker_rut) ?? l.worker_rut}`,
              () => setLoans((prev) => prev.filter((x) => x.id !== l.id)),
            )
          }
        />
      )}

      {tab === "discounts" && (
        <DiscountTable
          discounts={filteredDiscounts}
          workerMap={workerMap}
          canManage={canManage}
          canDelete={canDelete}
          onStatusChange={handleDiscountStatus}
          onDelete={(d) =>
            handleDelete("worker_discounts", d.id, `Descuento ${d.concept}`, () =>
              setDiscounts((prev) => prev.filter((x) => x.id !== d.id)),
            )
          }
        />
      )}

      {tab === "statements" && (
        <StatementTable
          workers={workers}
          statements={statements}
          onView={(w) => setViewingWorker(w)}
        />
      )}

      {modalOpen && (
        <FinanceModal
          mode={modalMode}
          form={form}
          setForm={setForm}
          workers={workers}
          saving={saving}
          onClose={() => setModalOpen(false)}
          onSave={() => void handleSave()}
        />
      )}
    </div>
  );
}
