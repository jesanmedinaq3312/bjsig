export type Tab = "quotes" | "invoices" | "customers" | "purchaseOrders";

export interface SupplierLite {
  id: string;
  name: string;
}

export const QUOTE_STATUS_LABELS: Record<string, string> = {
  borrador: "Borrador",
  enviada: "Enviada",
  aprobada: "Aprobada",
  rechazada: "Rechazada",
  vencida: "Vencida",
  convertida: "Convertida",
};
export const QUOTE_STATUS_COLORS: Record<string, string> = {
  borrador: "bg-slate-100 text-slate-600 border-slate-200",
  enviada: "bg-blue-50 text-blue-700 border-blue-200",
  aprobada: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rechazada: "bg-red-50 text-red-700 border-red-200",
  vencida: "bg-amber-50 text-amber-700 border-amber-200",
  convertida: "bg-teal-50 text-teal-700 border-teal-200",
};
export const INVOICE_STATUS_LABELS: Record<string, string> = {
  emitida: "Emitida",
  pagada: "Pagada",
  vencida: "Vencida",
  anulada: "Anulada",
  borrador: "Borrador",
};
export const INVOICE_STATUS_COLORS: Record<string, string> = {
  emitida: "bg-blue-50 text-blue-700 border-blue-200",
  pagada: "bg-emerald-50 text-emerald-700 border-emerald-200",
  vencida: "bg-red-50 text-red-700 border-red-200",
  anulada: "bg-slate-100 text-slate-500 border-slate-200 line-through",
  borrador: "bg-amber-50 text-amber-700 border-amber-200",
};
export const PO_STATUS_LABELS: Record<string, string> = {
  pendiente: "Pendiente",
  enviada: "Enviada",
  parcial: "Parcial",
  recibida: "Recibida",
  anulada: "Anulada",
};
export const PO_STATUS_COLORS: Record<string, string> = {
  pendiente: "bg-amber-50 text-amber-700 border-amber-200",
  enviada: "bg-blue-50 text-blue-700 border-blue-200",
  parcial: "bg-cyan-50 text-cyan-700 border-cyan-200",
  recibida: "bg-emerald-50 text-emerald-700 border-emerald-200",
  anulada: "bg-slate-100 text-slate-500 border-slate-200 line-through",
};
export const SII_STATUS_LABELS: Record<string, string> = {
  no_enviada: "No enviada",
  enviada: "Enviada",
  aceptada: "Aceptada",
  rechazada: "Rechazada",
  anulada: "Anulada",
};
export const SII_STATUS_COLORS: Record<string, string> = {
  no_enviada: "bg-slate-100 text-slate-500 border-slate-200",
  enviada: "bg-blue-50 text-blue-700 border-blue-200",
  aceptada: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rechazada: "bg-red-50 text-red-700 border-red-200",
  anulada: "bg-slate-100 text-slate-500 border-slate-200",
};

export const PAYMENT_METHODS = ["Transferencia", "Efectivo", "Cheque", "Tarjeta", "Webpay", "Otro"];
export const TAX_RATE = 19.0;

export function fmtCL(n: number): string {
  return Number(n || 0).toLocaleString("es-CL");
}

export function computeTotals(
  items: { quantity: number; unit_price: number; exemption_flag?: boolean }[],
  discount: number = 0,
) {
  const taxable = items
    .filter((i) => !i.exemption_flag)
    .reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const exempt = items
    .filter((i) => i.exemption_flag)
    .reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const subtotal = taxable + exempt;
  const discountedTaxable = Math.max(0, taxable - discount);
  const taxAmount = discountedTaxable * (TAX_RATE / 100);
  const total = discountedTaxable + exempt + taxAmount;
  return { subtotal, discount, exemptAmount: exempt, taxAmount, total };
}

export interface ItemRow {
  description: string;
  quantity: number;
  unit_price: number;
  exemption_flag?: boolean;
}
