import type { WorkerRequestCategory, WorkerRequestStatus } from "@/lib/types";

export const CATEGORY_LABELS: Record<WorkerRequestCategory, string> = {
  permiso: "Permiso",
  consulta: "Consulta",
  reclamo: "Reclamo",
  sugerencia: "Sugerencia",
  cambio_bancario: "Cambio de Datos Bancarios",
  otro: "Otro",
};

export const STATUS_LABELS: Record<WorkerRequestStatus, string> = {
  pendiente: "Enviada · Esperando revisión",
  en_proceso: "En revisión por RRHH",
  respondida: "Respondida por RRHH",
  cerrada: "Cerrada · Gestión finalizada",
};

export const STATUS_DESCRIPTIONS: Record<WorkerRequestStatus, string> = {
  pendiente: "Tu solicitud fue recibida y está en cola para ser revisada.",
  en_proceso: "Un administrador está revisando tu solicitud.",
  respondida: "Un administrador ha respondido a tu solicitud.",
  cerrada: "Esta solicitud ha sido cerrada. Si necesitas seguimiento, crea una nueva.",
};

export const STATUS_ICONS: Record<WorkerRequestStatus, string> = {
  pendiente: "clock",
  en_proceso: "eye",
  respondida: "check-circle",
  cerrada: "archive",
};

export const STATUS_COLORS: Record<WorkerRequestStatus, string> = {
  pendiente: "bg-amber-50 text-amber-700 border-amber-300",
  en_proceso: "bg-blue-50 text-blue-700 border-blue-300",
  respondida: "bg-emerald-50 text-emerald-700 border-emerald-300",
  cerrada: "bg-slate-100 text-slate-500 border-slate-300",
};

export type PortalTab =
  "resumen" | "asistencia" | "rrhh" | "seguridad" | "solicitudes" | "comunicaciones" | "denuncias";

export const TAB_LABELS: Record<PortalTab, string> = {
  resumen: "Resumen",
  asistencia: "Asistencia",
  rrhh: "RRHH",
  seguridad: "Seguridad",
  solicitudes: "Solicitudes",
  comunicaciones: "Comunicaciones",
  denuncias: "Denuncias",
};

export const SHIFT_CHANGE_TYPE_CONFIG: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  creacion: {
    label: "Asignación creada",
    color: "text-emerald-700",
    bg: "bg-emerald-50 border-emerald-200",
  },
  modificacion: {
    label: "Turno modificado",
    color: "text-blue-700",
    bg: "bg-blue-50 border-blue-200",
  },
  intercambio: {
    label: "Intercambio de turno",
    color: "text-amber-700",
    bg: "bg-amber-50 border-amber-200",
  },
  desactivacion: {
    label: "Turno desactivado",
    color: "text-red-600",
    bg: "bg-red-50 border-red-200",
  },
  reactivacion: {
    label: "Turno reactivado",
    color: "text-teal-700",
    bg: "bg-teal-50 border-teal-200",
  },
};
