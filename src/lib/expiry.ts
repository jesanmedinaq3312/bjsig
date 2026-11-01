/**
 * Document expiry semáforo service — classifies dates as Vigente / Por Vencer / Vencido.
 * Threshold: 30 days = yellow (por vencer).
 */
export type ExpiryStatus = "vigente" | "por-vencer" | "vencido" | "no-registrado";

export interface ExpiryCheck {
  status: ExpiryStatus;
  label: string;
  daysRemaining: number | null;
}

export class ExpiryService {
  static readonly THRESHOLD_DAYS = 30;

  static check(dateStr: string | null, today = new Date()): ExpiryCheck {
    if (!dateStr) {
      return { status: "no-registrado", label: "No registrado", daysRemaining: null };
    }
    const d = new Date(dateStr + "T00:00:00");
    if (isNaN(d.getTime())) {
      return { status: "no-registrado", label: "No registrado", daysRemaining: null };
    }
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const diffMs = d.getTime() - todayMidnight.getTime();
    const days = Math.round(diffMs / (1000 * 60 * 60 * 24));
    if (days < 0) return { status: "vencido", label: "Vencido", daysRemaining: days };
    if (days <= this.THRESHOLD_DAYS)
      return { status: "por-vencer", label: "Por vencer", daysRemaining: days };
    return { status: "vigente", label: "Vigente", daysRemaining: days };
  }

  static color(status: ExpiryStatus): string {
    switch (status) {
      case "vigente":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "por-vencer":
        return "bg-amber-100 text-amber-700 border-amber-200";
      case "vencido":
        return "bg-red-100 text-red-700 border-red-200";
      case "no-registrado":
        return "bg-slate-100 text-slate-500 border-slate-200";
    }
  }

  static dot(status: ExpiryStatus): string {
    switch (status) {
      case "vigente":
        return "bg-emerald-500";
      case "por-vencer":
        return "bg-amber-500";
      case "vencido":
        return "bg-red-500";
      case "no-registrado":
        return "bg-slate-400";
    }
  }
}
