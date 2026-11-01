import type { ShiftCycle, AttendanceStatus, CalendarEvent } from "@/lib/types";
import {
  Users,
  HardHat,
  AlertTriangle,
  FileSignature,
  GraduationCap,
  ShieldCheck,
  ScanLine,
  CalendarClock,
} from "lucide-react";

export type ViewMode = "month" | "week" | "day" | "agenda" | "table" | "attendance";

export const STANDARD_EPP: string[] = [
  "Casco de Seguridad",
  "Zapatos de Seguridad",
  "Lentes de Protección",
  "Guantes",
  "Chaleco Reflectante",
  "Protector Auditivo",
];

export function suggestShift(
  cycle: ShiftCycle,
  date: Date,
  shiftDefs?: { name: string; cycle: string; start_time: string | null; end_time: string | null }[],
): { working: boolean; label: string } {
  const dayOfWeek = (date.getDay() + 6) % 7;
  const dayOfYear = Math.floor(
    (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000,
  );

  const def = shiftDefs?.find((d) => d.cycle === cycle);
  const timeRange = def?.start_time && def?.end_time ? ` ${def.start_time}–${def.end_time}` : "";
  const defName = def?.name ?? "";

  if (cycle === "5x2") {
    return dayOfWeek < 5
      ? { working: true, label: defName ? `${defName}${timeRange}` : `Lun–Vie (5x2)${timeRange}` }
      : { working: false, label: "Fin de semana (descanso 5x2)" };
  }
  if (cycle === "7x7") {
    const block = Math.floor(dayOfYear / 7) % 2;
    return block === 0
      ? {
          working: true,
          label: defName ? `${defName} — Semana ON${timeRange}` : `Semana ON (7x7)${timeRange}`,
        }
      : { working: false, label: defName ? `${defName} — Semana OFF` : "Semana OFF (7x7)" };
  }
  if (cycle === "4x3") {
    const block = dayOfYear % 7;
    return block < 4
      ? {
          working: true,
          label: defName ? `${defName} — Día ON${timeRange}` : `Día ON (4x3)${timeRange}`,
        }
      : { working: false, label: defName ? `${defName} — Día OFF` : "Día OFF (4x3)" };
  }
  return { working: true, label: defName || cycle };
}

export const EVENT_META: Record<
  CalendarEvent["event_type"],
  { label: string; icon: React.ReactNode; color: string; bg: string }
> = {
  asistencia: {
    label: "Asistencia",
    icon: <Users size={12} />,
    color: "text-blue-700",
    bg: "bg-blue-100 border-blue-300",
  },
  epp: {
    label: "EPP",
    icon: <HardHat size={12} />,
    color: "text-emerald-700",
    bg: "bg-emerald-100 border-emerald-300",
  },
  incidente: {
    label: "Incidente",
    icon: <AlertTriangle size={12} />,
    color: "text-red-700",
    bg: "bg-red-100 border-red-300",
  },
  charla: {
    label: "Charla/AST",
    icon: <FileSignature size={12} />,
    color: "text-amber-700",
    bg: "bg-amber-100 border-amber-300",
  },
  capacitacion: {
    label: "Capacitación",
    icon: <GraduationCap size={12} />,
    color: "text-purple-700",
    bg: "bg-purple-100 border-purple-300",
  },
  iso: {
    label: "ISO",
    icon: <ShieldCheck size={12} />,
    color: "text-cyan-700",
    bg: "bg-cyan-100 border-cyan-300",
  },
  qr: {
    label: "QR",
    icon: <ScanLine size={12} />,
    color: "text-violet-700",
    bg: "bg-violet-100 border-violet-300",
  },
  vencimiento: {
    label: "Vencimiento",
    icon: <CalendarClock size={12} />,
    color: "text-orange-700",
    bg: "bg-orange-100 border-orange-300",
  },
  feriado: {
    label: "Feriado legal",
    icon: <CalendarClock size={12} />,
    color: "text-rose-700",
    bg: "bg-rose-100 border-rose-300",
  },
};

export const QR_LABELS: Record<string, string> = {
  entrada: "Entrada",
  salida: "Salida",
  almuerzo_inicio: "Inicio Almuerzo",
  almuerzo_termino: "Fin Almuerzo",
  terreno_salida: "Salida Terreno",
  terreno_llegada: "Llegada Terreno",
};

export const QR_SHORT: Record<string, string> = {
  entrada: "E",
  salida: "S",
  almuerzo_inicio: "AI",
  almuerzo_termino: "AF",
  terreno_salida: "TS",
  terreno_llegada: "TL",
};

export const SEVERITY_DOT: Record<CalendarEvent["severity_level"], string> = {
  verde: "bg-emerald-500",
  amarillo: "bg-amber-500",
  rojo: "bg-red-500",
  azul: "bg-blue-500",
};

export const ATTENDANCE_STATUSES: AttendanceStatus[] = [
  "Presente",
  "Ausente",
  "Licencia",
  "Permiso",
  "Descanso",
];

export const STATUS_STYLES: Record<AttendanceStatus, { active: string; dot: string }> = {
  Presente: { active: "bg-emerald-600 text-white border-transparent", dot: "bg-emerald-500" },
  Ausente: { active: "bg-red-600 text-white border-transparent", dot: "bg-red-500" },
  Licencia: { active: "bg-amber-500 text-white border-transparent", dot: "bg-amber-500" },
  Permiso: { active: "bg-blue-600 text-white border-transparent", dot: "bg-blue-500" },
  Descanso: { active: "bg-slate-500 text-white border-transparent", dot: "bg-slate-400" },
};

export const STATUS_BADGE: Record<AttendanceStatus, string> = {
  Presente: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Ausente: "bg-red-100 text-red-700 border-red-200",
  Licencia: "bg-amber-100 text-amber-700 border-amber-200",
  Permiso: "bg-blue-100 text-blue-700 border-blue-200",
  Descanso: "bg-slate-100 text-slate-600 border-slate-200",
};

export interface EppCheckState {
  [workerRut: string]: { [eppItem: string]: { inicio: boolean; termino: boolean } };
}
