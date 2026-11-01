/**
 * Proactive expiration alert service.
 *
 * Scans all data sources for items that are expired or expiring soon,
 * producing a unified alert list that can be shown on the Dashboard
 * and pushed via the browser Notifications API.
 */

import type { Worker, EppLog, CloudDocument, MedicalLicense, IsoAudit } from "./types";

export type AlertSeverity = "vencido" | "por-vencer";
export type AlertCategory =
  | "examen_ocupacional"
  | "licencia_conducir"
  | "epp"
  | "documento_nube"
  | "licencia_medica"
  | "iso_audit";

export interface ExpirationAlert {
  id: string;
  category: AlertCategory;
  severity: AlertSeverity;
  title: string;
  detail: string;
  workerRut: string | null;
  workerName: string | null;
  expiryDate: string;
  daysRemaining: number;
  view: string;
}

const THRESHOLD_DAYS = 30;

function daysUntil(dateStr: string, today: Date): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - today.getTime()) / 86400000);
}

function classify(days: number | null): AlertSeverity | null {
  if (days === null) return null;
  if (days < 0) return "vencido";
  if (days <= THRESHOLD_DAYS) return "por-vencer";
  return null;
}

function severityLabel(s: AlertSeverity): string {
  return s === "vencido" ? "Vencido" : "Por vencer";
}

export class ExpirationAlertService {
  static scan(opts: {
    workers: Worker[];
    eppLogs: EppLog[];
    cloudDocs: CloudDocument[];
    medicalLicenses: MedicalLicense[];
    isoAudits: IsoAudit[];
    today?: Date;
  }): ExpirationAlert[] {
    const today = opts.today ?? new Date();
    const alerts: ExpirationAlert[] = [];

    // Occupational exams
    for (const w of opts.workers) {
      if (w.status !== "ACTIVO") continue;
      const days = daysUntil(w.occupational_exam_exp_date ?? "", today);
      const sev = classify(days);
      if (!sev) continue;
      alerts.push({
        id: `exam-${w.id}`,
        category: "examen_ocupacional",
        severity: sev,
        title: `Examen ocupacional — ${w.full_name}`,
        detail: severityLabel(sev),
        workerRut: w.rut,
        workerName: w.full_name,
        expiryDate: w.occupational_exam_exp_date!,
        daysRemaining: days!,
        view: "docs",
      });
    }

    // Driver licenses
    for (const w of opts.workers) {
      if (w.status !== "ACTIVO") continue;
      const days = daysUntil(w.driver_license_exp_date ?? "", today);
      const sev = classify(days);
      if (!sev) continue;
      alerts.push({
        id: `license-${w.id}`,
        category: "licencia_conducir",
        severity: sev,
        title: `Licencia de conducir — ${w.full_name}`,
        detail: severityLabel(sev),
        workerRut: w.rut,
        workerName: w.full_name,
        expiryDate: w.driver_license_exp_date!,
        daysRemaining: days!,
        view: "docs",
      });
    }

    // EPP expiration
    for (const e of opts.eppLogs) {
      const days = daysUntil(e.expiration_date ?? "", today);
      const sev = classify(days);
      if (!sev) continue;
      const w = opts.workers.find((x) => x.rut === e.worker_rut);
      alerts.push({
        id: `epp-${e.id}`,
        category: "epp",
        severity: sev,
        title: `EPP "${e.epp_item_name}" — ${w?.full_name ?? e.worker_rut}`,
        detail: severityLabel(sev),
        workerRut: e.worker_rut,
        workerName: w?.full_name ?? null,
        expiryDate: e.expiration_date!,
        daysRemaining: days!,
        view: "eppwarehouse",
      });
    }

    // Cloud documents
    for (const c of opts.cloudDocs) {
      const days = daysUntil(c.expiration_date ?? "", today);
      const sev = classify(days);
      if (!sev) continue;
      const w = c.worker_rut ? opts.workers.find((x) => x.rut === c.worker_rut) : undefined;
      alerts.push({
        id: `cloud-${c.id}`,
        category: "documento_nube",
        severity: sev,
        title: `Documento: ${c.category}${w ? ` — ${w.full_name}` : ""}`,
        detail: severityLabel(sev),
        workerRut: c.worker_rut,
        workerName: w?.full_name ?? null,
        expiryDate: c.expiration_date!,
        daysRemaining: days!,
        view: "clouddocs",
      });
    }

    // Medical licenses (SIL)
    for (const m of opts.medicalLicenses) {
      if (m.status === "rechazada") continue;
      const days = daysUntil(m.end_date, today);
      const sev = classify(days);
      if (!sev) continue;
      const w = opts.workers.find((x) => x.rut === m.worker_rut);
      alerts.push({
        id: `med-${m.id}`,
        category: "licencia_medica",
        severity: sev,
        title: `Licencia médica — ${w?.full_name ?? m.worker_rut}`,
        detail: severityLabel(sev),
        workerRut: m.worker_rut,
        workerName: w?.full_name ?? null,
        expiryDate: m.end_date,
        daysRemaining: days!,
        view: "medicallicenses",
      });
    }

    // ISO audit due dates
    for (const a of opts.isoAudits) {
      if (a.status === "Cerrada") continue;
      const days = daysUntil(a.due_date ?? "", today);
      const sev = classify(days);
      if (!sev) continue;
      alerts.push({
        id: `iso-${a.id}`,
        category: "iso_audit",
        severity: sev,
        title: `Hallazgo ISO ${a.iso_standard} — ${a.area}`,
        detail: severityLabel(sev),
        workerRut: null,
        workerName: null,
        expiryDate: a.due_date!,
        daysRemaining: days!,
        view: "iso",
      });
    }

    // Sort: vencidos first, then by daysRemaining ascending
    alerts.sort((a, b) => {
      if (a.severity !== b.severity) return a.severity === "vencido" ? -1 : 1;
      return a.daysRemaining - b.daysRemaining;
    });

    return alerts;
  }

  static summary(alerts: ExpirationAlert[]): {
    vencidos: number;
    porVencer: number;
    total: number;
  } {
    let vencidos = 0,
      porVencer = 0;
    for (const a of alerts) {
      if (a.severity === "vencido") vencidos++;
      else porVencer++;
    }
    return { vencidos, porVencer, total: alerts.length };
  }

  static categoryLabel(c: AlertCategory): string {
    switch (c) {
      case "examen_ocupacional":
        return "Examen ocupacional";
      case "licencia_conducir":
        return "Licencia de conducir";
      case "epp":
        return "EPP";
      case "documento_nube":
        return "Documento en la nube";
      case "licencia_medica":
        return "Licencia médica";
      case "iso_audit":
        return "Hallazgo ISO";
    }
  }

  // Browser notification helpers
  static async requestPermission(): Promise<boolean> {
    if (!("Notification" in window)) return false;
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") return false;
    const result = await Notification.requestPermission();
    return result === "granted";
  }

  static notify(alerts: ExpirationAlert[]): void {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    const vencidos = alerts.filter((a) => a.severity === "vencido");
    const porVencer = alerts.filter((a) => a.severity === "por-vencer");

    if (vencidos.length > 0) {
      new Notification("Documentos vencidos", {
        body: `${vencidos.length} documento(s) vencido(s) requieren atención inmediata.`,
        icon: "/icons/icon-192.png",
        tag: "expiry-vencidos",
      });
    }
    if (porVencer.length > 0) {
      new Notification("Documentos por vencer", {
        body: `${porVencer.length} documento(s) vencerán en los próximos 30 días.`,
        icon: "/icons/icon-192.png",
        tag: "expiry-por-vencer",
      });
    }
  }
}
