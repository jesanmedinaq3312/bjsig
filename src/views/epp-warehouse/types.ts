export interface EppItem {
  id: string;
  name: string;
  category: string;
  sku: string | null;
  size_required: boolean;
  min_stock: number;
  unit_cost: number;
  notes: string | null;
}

export interface EppStock {
  id: string;
  item_id: string;
  size_label: string;
  quantity: number;
  min_quantity: number;
  last_restocked: string | null;
}

export interface EppDelivery {
  id: string;
  worker_rut: string;
  item_id: string;
  size_label: string;
  quantity: number;
  justification: string;
  condition: string;
  delivery_date: string;
  delivered_by: string | null;
  notes: string | null;
  created_at: string;
  confirmed_via_qr: boolean;
  confirmed_at: string | null;
  confirmed_scan_rut: string | null;
}

export interface EppReturn {
  id: string;
  delivery_id: string;
  worker_rut: string;
  item_id: string;
  quantity: number;
  return_condition: string;
  return_date: string;
  received_by: string | null;
  restocked: boolean;
  notes: string | null;
}

export const CATEGORIES = [
  "General",
  "Cabeza",
  "Ojos",
  "Auditivo",
  "Respiratorio",
  "Manos",
  "Pies",
  "Cuerpo",
  "Altura",
  "Eléctrico",
];
export const CONDITIONS = [
  "Nuevo",
  "Usado - Bueno",
  "Usado - Regular",
  "Reposición",
  "Cambio de Talla",
];
export const RETURN_CONDITIONS = ["Bueno", "Regular", "Malo", "Perdido"];

export type Tab = "stock" | "deliver" | "returns" | "history" | "terrain";

export type ModalMode = "item" | "return" | "restock";

export interface DeliverForm {
  worker_rut: string;
  item_id: string;
  size_label: string;
  quantity: number;
  justification: string;
  condition: string;
  notes: string;
}

export function normalizeSize(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
