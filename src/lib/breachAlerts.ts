/**
 * Security breach deadline countdown service — Ley 21.663 compliance.
 *
 * Computes remaining time for the two mandatory notification deadlines:
 * - CSIRT/ANCI notification: 72 hours from detection
 * - Affected subjects notification: 5 days from detection
 *
 * Returns live-updating countdowns (hours/minutes/seconds) and urgency states
 * matching the pattern from expirationAlerts.ts.
 */

export type DeadlineType = "csirt" | "subjects";
export type DeadlineUrgency = "ok" | "warning" | "critical" | "overdue" | "done";

export interface BreachDeadline {
  type: DeadlineType;
  label: string;
  deadline: string | null;
  notifiedAt: string | null;
  remainingMs: number | null;
  urgency: DeadlineUrgency;
  isNotified: boolean;
}

const CSIRT_LABEL = "Notificación CSIRT/ANCI (72h)";
const SUBJECTS_LABEL = "Notificación a Titulares (5 días)";

function urgencyFromMs(
  remainingMs: number,
  isNotified: boolean,
  type: DeadlineType,
): DeadlineUrgency {
  if (isNotified) return "done";
  if (remainingMs <= 0) return "overdue";
  if (type === "csirt") {
    if (remainingMs < 12 * 3600_000) return "critical";
    if (remainingMs < 24 * 3600_000) return "warning";
    return "ok";
  }
  if (remainingMs < 24 * 3600_000) return "critical";
  if (remainingMs < 48 * 3600_000) return "warning";
  return "ok";
}

export function computeDeadline(
  type: DeadlineType,
  deadline: string | null,
  notifiedAt: string | null,
  now = Date.now(),
): BreachDeadline {
  const isNotified = !!notifiedAt;
  const label = type === "csirt" ? CSIRT_LABEL : SUBJECTS_LABEL;
  let remainingMs: number | null = null;
  let urgency: DeadlineUrgency = "ok";

  if (deadline) {
    const dl = new Date(deadline).getTime();
    if (!isNaN(dl)) {
      remainingMs = dl - now;
      urgency = urgencyFromMs(remainingMs, isNotified, type);
    }
  }

  return { type, label, deadline, notifiedAt, remainingMs, urgency, isNotified };
}

export function computeBreachDeadlines(
  csirtDeadline: string | null,
  csirtNotifiedAt: string | null,
  subjectsDeadline: string | null,
  subjectsNotifiedAt: string | null,
  now = Date.now(),
): BreachDeadline[] {
  return [
    computeDeadline("csirt", csirtDeadline, csirtNotifiedAt, now),
    computeDeadline("subjects", subjectsDeadline, subjectsNotifiedAt, now),
  ];
}

export function formatCountdown(remainingMs: number): string {
  const abs = Math.abs(remainingMs);
  const totalSeconds = Math.floor(abs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const prefix = remainingMs < 0 ? "-" : "";
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    return `${prefix}${days}d ${remHours}h ${minutes}m`;
  }
  return `${prefix}${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export const URGENCY_STYLES: Record<
  DeadlineUrgency,
  { label: string; badge: string; bar: string; ring: string }
> = {
  ok: {
    label: "En plazo",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-300",
    bar: "bg-emerald-500",
    ring: "ring-emerald-200",
  },
  warning: {
    label: "Atención",
    badge: "bg-amber-50 text-amber-700 border-amber-300",
    bar: "bg-amber-500",
    ring: "ring-amber-200",
  },
  critical: {
    label: "Urgente",
    badge: "bg-orange-50 text-orange-700 border-orange-300",
    bar: "bg-orange-500",
    ring: "ring-orange-200",
  },
  overdue: {
    label: "Vencido",
    badge: "bg-red-50 text-red-700 border-red-300",
    bar: "bg-red-500",
    ring: "ring-red-200",
  },
  done: {
    label: "Notificado",
    badge: "bg-slate-100 text-slate-600 border-slate-300",
    bar: "bg-slate-400",
    ring: "ring-slate-200",
  },
};

export function progressPercent(remainingMs: number, totalMs: number): number {
  if (totalMs <= 0) return 0;
  const elapsed = totalMs - remainingMs;
  const pct = (elapsed / totalMs) * 100;
  return Math.max(0, Math.min(100, pct));
}
