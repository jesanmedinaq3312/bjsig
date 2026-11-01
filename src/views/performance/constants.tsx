import { Calendar, MessageSquare, AlertTriangle, Lightbulb, Inbox, Landmark } from "lucide-react";
import type { WorkerRequest } from "@/lib/types";

export type Tab = "objectives" | "evaluations" | "feedback" | "requests" | "documents";

export const CATEGORY_LABELS: Record<WorkerRequest["category"], string> = {
  permiso: "Permiso",
  consulta: "Consulta",
  reclamo: "Reclamo",
  sugerencia: "Sugerencia",
  otro: "Otro",
  cambio_bancario: "Cambio bancario",
};

export const STATUS_LABELS: Record<WorkerRequest["status"], string> = {
  pendiente: "Pendiente",
  en_proceso: "En Proceso",
  respondida: "Respondida",
  cerrada: "Cerrada",
};

export const STATUS_COLORS: Record<WorkerRequest["status"], string> = {
  pendiente: "bg-amber-50 text-amber-700 border-amber-200",
  en_proceso: "bg-blue-50 text-blue-700 border-blue-200",
  respondida: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cerrada: "bg-slate-100 text-slate-500 border-slate-200",
};

export const VALIDITY_LABELS: Record<string, string> = {
  pendiente: "Validez pendiente",
  valida: "Válida",
  invalida: "Inválida",
};

export const VALIDITY_COLORS: Record<string, string> = {
  pendiente: "bg-slate-100 text-slate-600 border-slate-200",
  valida: "bg-teal-50 text-teal-700 border-teal-200",
  invalida: "bg-red-50 text-red-700 border-red-200",
};

export const CATEGORY_ICONS: Record<WorkerRequest["category"], React.ReactNode> = {
  permiso: <Calendar size={14} className="text-blue-600" />,
  consulta: <MessageSquare size={14} className="text-cyan-600" />,
  reclamo: <AlertTriangle size={14} className="text-red-600" />,
  sugerencia: <Lightbulb size={14} className="text-amber-600" />,
  otro: <Inbox size={14} className="text-slate-500" />,
  cambio_bancario: <Landmark size={14} className="text-emerald-600" />,
};

export const REQUEST_STATUS_ORDER: Record<WorkerRequest["status"], number> = {
  pendiente: 0,
  en_proceso: 1,
  respondida: 2,
  cerrada: 3,
};
