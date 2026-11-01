export type Tab = "advances" | "loans" | "discounts" | "statements";

export const ADVANCE_STATUS_LABELS: Record<string, string> = {
  pendiente: "Pendiente",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
  descontado: "Descontado",
};
export const ADVANCE_STATUS_COLORS: Record<string, string> = {
  pendiente: "bg-amber-50 text-amber-700 border-amber-200",
  aprobado: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rechazado: "bg-red-50 text-red-700 border-red-200",
  descontado: "bg-slate-100 text-slate-600 border-slate-200",
};
export const LOAN_STATUS_LABELS: Record<string, string> = {
  activo: "Activo",
  pagado: "Pagado",
  anulado: "Anulado",
};
export const LOAN_STATUS_COLORS: Record<string, string> = {
  activo: "bg-blue-50 text-blue-700 border-blue-200",
  pagado: "bg-emerald-50 text-emerald-700 border-emerald-200",
  anulado: "bg-slate-100 text-slate-500 border-slate-200 line-through",
};
export const DISCOUNT_STATUS_LABELS: Record<string, string> = {
  pendiente: "Pendiente",
  aprobado: "Aprobado",
  descontado: "Descontado",
};
export const DISCOUNT_STATUS_COLORS: Record<string, string> = {
  pendiente: "bg-amber-50 text-amber-700 border-amber-200",
  aprobado: "bg-emerald-50 text-emerald-700 border-emerald-200",
  descontado: "bg-slate-100 text-slate-600 border-slate-200",
};
export const ENTRY_TYPE_LABELS: Record<string, string> = {
  pago: "Pago",
  anticipo: "Anticipo",
  descuento: "Descuento",
  prestamo: "Préstamo",
  ajuste: "Ajuste",
};
export const ENTRY_TYPE_COLORS: Record<string, string> = {
  pago: "bg-emerald-50 text-emerald-700 border-emerald-200",
  anticipo: "bg-blue-50 text-blue-700 border-blue-200",
  descuento: "bg-red-50 text-red-700 border-red-200",
  prestamo: "bg-amber-50 text-amber-700 border-amber-200",
  ajuste: "bg-slate-100 text-slate-600 border-slate-200",
};
export const DISCOUNT_CONCEPTS = [
  "Daños",
  "Pérdidas",
  "Uniformes",
  "Herramientas",
  "Adelanto no autorizado",
  "Otro",
];

export function fmtCL(n: number): string {
  return Number(n || 0).toLocaleString("es-CL", {
    style: "currency",
    currency: "CLP",
    minimumFractionDigits: 0,
  });
}

export function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("es-CL", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}
