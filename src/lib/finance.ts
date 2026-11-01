/**
 * Núcleo financiero: fórmulas y validaciones compartidas por Tesorería,
 * Remuneraciones, Finanzas Extendidas y Finiquitos.
 *
 * Regla: cualquier monto que se muestre en pantalla debe salir de aquí,
 * y ese mismo valor es el que se guarda. Nunca dos cálculos distintos.
 */

export interface CashTx {
  type: "ingreso" | "egreso";
  amount: number | string;
  status: string;
  transaction_date: string;
  payment_method?: string;
}

export interface CashSummary {
  /** Efectivamente movido (status Pagado) */
  ingresos: number;
  egresos: number;
  balance: number;
  /** Comprometido (status Pendiente), no afecta caja todavía */
  ingresosPendientes: number;
  egresosPendientes: number;
  balanceProyectado: number;
  anulados: number;
  count: number;
}

const num = (v: number | string | null | undefined): number => {
  const n = typeof v === "number" ? v : Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

export function cashSummary(txs: CashTx[]): CashSummary {
  let ingresos = 0,
    egresos = 0,
    ingresosPendientes = 0,
    egresosPendientes = 0,
    anulados = 0;
  for (const t of txs) {
    const amount = num(t.amount);
    if (t.status === "Anulado") {
      anulados += amount;
      continue;
    }
    const pending = t.status !== "Pagado";
    if (t.type === "ingreso") {
      if (pending) ingresosPendientes += amount;
      else ingresos += amount;
    } else {
      if (pending) egresosPendientes += amount;
      else egresos += amount;
    }
  }
  const balance = ingresos - egresos;
  return {
    ingresos,
    egresos,
    balance,
    ingresosPendientes,
    egresosPendientes,
    balanceProyectado: balance + ingresosPendientes - egresosPendientes,
    anulados,
    count: txs.length,
  };
}

export interface ArqueoRow {
  month: string; // YYYY-MM
  saldoInicial: number;
  ingresos: number;
  egresos: number;
  saldoFinal: number;
  movimientos: number;
}

/** Arqueo mensual acumulado sobre movimientos pagados, del mes más antiguo al más nuevo. */
export function monthlyArqueo(txs: CashTx[], saldoApertura = 0): ArqueoRow[] {
  const byMonth = new Map<string, { ingresos: number; egresos: number; movimientos: number }>();
  for (const t of txs) {
    if (t.status !== "Pagado") continue;
    const month = (t.transaction_date ?? "").slice(0, 7);
    if (month.length !== 7) continue;
    const row = byMonth.get(month) ?? { ingresos: 0, egresos: 0, movimientos: 0 };
    if (t.type === "ingreso") row.ingresos += num(t.amount);
    else row.egresos += num(t.amount);
    row.movimientos += 1;
    byMonth.set(month, row);
  }
  let saldo = saldoApertura;
  return [...byMonth.keys()].sort().map((month) => {
    const r = byMonth.get(month)!;
    const saldoInicial = saldo;
    const saldoFinal = saldoInicial + r.ingresos - r.egresos;
    saldo = saldoFinal;
    return {
      month,
      saldoInicial,
      ingresos: r.ingresos,
      egresos: r.egresos,
      saldoFinal,
      movimientos: r.movimientos,
    };
  });
}

/** Saldo de préstamo derivado de las cuotas realmente registradas. */
export function loanOutstanding(
  loan: { principal_amount: number | string; monthly_deduction: number | string; status?: string },
  paidEntries: { amount: number | string }[],
): number {
  if (loan.status === "pagado" || loan.status === "anulado") return 0;
  const principal = num(loan.principal_amount);
  const paid = paidEntries.reduce((s, e) => s + Math.abs(num(e.amount)), 0);
  return Math.max(0, Math.round(principal - paid));
}

export interface StatementLike {
  reference_id: string | null;
  period_label: string;
  amount: number | string;
}

/** Cuotas/descuentos ya registrados para un origen (anticipo, préstamo o descuento). */
export function entriesForReference<T extends StatementLike>(
  statements: T[],
  referenceId: string,
): T[] {
  return statements.filter((s) => s.reference_id === referenceId);
}

/** True si ese origen ya fue aplicado en el período indicado (evita doble descuento). */
export function alreadyAppliedInPeriod(
  statements: StatementLike[],
  referenceId: string,
  periodLabel: string,
): boolean {
  return statements.some((s) => s.reference_id === referenceId && s.period_label === periodLabel);
}

/** Período contable actual en formato YYYY-MM. */
export function currentPeriodLabel(d = new Date()): string {
  return d.toISOString().slice(0, 7);
}

export interface ReconcileRow {
  periodLabel: string;
  liquidado: number;
  pagadoEnCaja: number;
  diferencia: number;
}

/** Conciliación entre lo liquidado en remuneraciones y lo egresado en caja. */
export function reconcilePeriods(
  payroll: { period_label: string; net_pay: number | string }[],
  cash: { period_label: string | null; amount: number | string; status: string }[],
): ReconcileRow[] {
  const liq = new Map<string, number>();
  for (const p of payroll) liq.set(p.period_label, (liq.get(p.period_label) ?? 0) + num(p.net_pay));
  const paid = new Map<string, number>();
  for (const c of cash) {
    if (c.status !== "Pagado" || !c.period_label) continue;
    paid.set(c.period_label, (paid.get(c.period_label) ?? 0) + num(c.amount));
  }
  const labels = [...new Set([...liq.keys(), ...paid.keys()])].sort();
  return labels.map((periodLabel) => {
    const liquidado = Math.round(liq.get(periodLabel) ?? 0);
    const pagadoEnCaja = Math.round(paid.get(periodLabel) ?? 0);
    return { periodLabel, liquidado, pagadoEnCaja, diferencia: liquidado - pagadoEnCaja };
  });
}

export const MAX_SAFE_AMOUNT = 2_000_000_000;
/** Sobre este monto se pide confirmación explícita antes de guardar. */
export const LARGE_AMOUNT_THRESHOLD = 20_000_000;

/** Devuelve el mensaje de error o null si el monto es válido en pesos. */
export function validateAmount(value: number | string, { allowZero = false } = {}): string | null {
  const n = num(value);
  if (!Number.isFinite(n)) return "El monto no es un número válido";
  if (n < 0) return "El monto no puede ser negativo";
  if (!allowZero && n === 0) return "El monto debe ser mayor a cero";
  if (!Number.isInteger(n)) return "El monto debe ser un número entero de pesos, sin decimales";
  if (n > MAX_SAFE_AMOUNT) return "El monto excede el máximo permitido";
  return null;
}

export function validateTxDate(date: string, { allowFuture = false } = {}): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return "Fecha inválida";
  if (!allowFuture) {
    const today = new Date().toISOString().slice(0, 10);
    if (date > today) return "La fecha no puede ser futura salvo que sea un pago programado";
  }
  return null;
}

/** Detecta documentos repetidos del mismo proveedor (factura duplicada). */
export function findDuplicateInvoice(
  txs: { id: string; supplier_id: string | null; invoice_number: string | null }[],
  candidate: { supplier_id: string | null; invoice_number: string | null; id?: string },
): { id: string } | null {
  const nr = (candidate.invoice_number ?? "").trim().toLowerCase();
  if (!nr) return null;
  const dup = txs.find(
    (t) =>
      t.id !== candidate.id &&
      (t.invoice_number ?? "").trim().toLowerCase() === nr &&
      (t.supplier_id ?? "") === (candidate.supplier_id ?? ""),
  );
  return dup ? { id: dup.id } : null;
}

/** Movimiento de reverso: misma magnitud, tipo opuesto, ligado al original. */
export function buildReversal<
  T extends CashTx & { description: string; category: string; id: string },
>(
  tx: T,
  reason: string,
): Omit<CashTx, "status"> & { description: string; category: string; status: string } {
  return {
    type: tx.type === "ingreso" ? "egreso" : "ingreso",
    amount: num(tx.amount),
    category: tx.category,
    transaction_date: new Date().toISOString().slice(0, 10),
    payment_method: tx.payment_method,
    status: "Pagado",
    description: `REVERSO de "${tx.description}"${reason ? ` — ${reason}` : ""} [ref:${tx.id}]`,
  };
}
