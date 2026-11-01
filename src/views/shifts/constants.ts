import type { ShiftCycle, ShiftDurationType, ShiftChangeType } from "@/lib/types";

export const CYCLES: (ShiftCycle | "custom")[] = ["7x7", "5x2", "4x3", "custom"];
export const COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#64748b",
];
export const DURATION_TYPES: ShiftDurationType[] = [
  "indefinido",
  "temporal",
  "semanal",
  "mensual",
  "personalizado",
];
export const DURATION_LABELS: Record<ShiftDurationType, string> = {
  indefinido: "Indefinido",
  temporal: "Temporal",
  semanal: "Semanal",
  mensual: "Mensual",
  personalizado: "Personalizado",
};
export const CHANGE_TYPE_LABELS: Record<ShiftChangeType, string> = {
  creacion: "Creación",
  modificacion: "Modificación",
  intercambio: "Intercambio",
  desactivacion: "Desactivación",
  reactivacion: "Reactivación",
};

export const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
export const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

export type Tab = "definitions" | "assignments" | "schedule" | "history";
export type ScheduleView = "month" | "week" | "day";

export function fmtDate(d: string | null): string {
  if (!d) return "—";
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function isAssignmentActiveOnDate(
  a: {
    active: boolean;
    start_date: string;
    end_date: string | null;
    days_of_week?: number[] | null;
  },
  dateStr: string,
): boolean {
  if (!a.active) return false;
  if (a.start_date > dateStr) return false;
  if (a.end_date && a.end_date < dateStr) return false;
  if (a.days_of_week && Array.isArray(a.days_of_week) && a.days_of_week.length > 0) {
    // days_of_week follows the database contract: 0=Mon..6=Sun.
    const jsDay = new Date(dateStr + "T00:00:00").getDay();
    const dow = (jsDay + 6) % 7;
    return a.days_of_week.includes(dow);
  }
  return true;
}

export function getContrastColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.5 ? "#1e293b" : "#ffffff";
}

export function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - day);
  return date;
}

export function getMonthDays(d: Date): string[] {
  const year = d.getFullYear();
  const month = d.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const days: string[] = [];
  for (let i = 1; i <= lastDay; i++) {
    days.push(toDateStr(new Date(year, month, i)));
  }
  return days;
}

export function getWeekDays(d: Date): string[] {
  const monday = getMonday(d);
  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    const dt = new Date(monday);
    dt.setDate(dt.getDate() + i);
    days.push(toDateStr(dt));
  }
  return days;
}
