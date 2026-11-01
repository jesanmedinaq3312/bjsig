/**
 * Domain service for ACHS / SUSESO / DS 44 indicators.
 * All formulas per ACHS/SUSESO methodology.
 *
 * The authoritative computation runs as a Postgres RPC (compute_indicators)
 * so it operates on complete data, not the truncated client-side fetch.
 * The static methods below remain for the manual HHT override editor.
 */
import { supabase } from "./supabase";
import { logger } from "./logger";
import type { Incident, DailyShift, Worker, EppLog } from "./types";

export interface IndicatorResult {
  accidentCount: number;
  accidentCTPCount: number;
  daysLost: number;
  daysCharge: number;
  manHours: number;
  tf: number;
  tg: number;
  ia: number;
  cumplimientoDS44: number;
  coberturaEpp: number;
}

export interface ServerIndicatorResult extends IndicatorResult {
  activeWorkers: number;
  totalWorkers: number;
}

export async function fetchServerIndicators(
  startDate?: string,
  endDate?: string,
): Promise<ServerIndicatorResult | null> {
  const { data, error } = await supabase
    .rpc("compute_indicators", {
      p_start_date: startDate ?? null,
      p_end_date: endDate ?? null,
    })
    .maybeSingle();
  if (error) {
    logger.warn("[indicators] RPC failed:", error.message);
    return null;
  }
  if (!data) return null;
  const r = data as Record<string, number>;
  return {
    accidentCount: r.accident_count ?? 0,
    accidentCTPCount: r.accident_ctp_count ?? 0,
    daysLost: r.days_lost ?? 0,
    daysCharge: r.days_charge ?? 0,
    manHours: r.man_hours ?? 0,
    tf: r.tf ?? 0,
    tg: r.tg ?? 0,
    ia: r.ia ?? 0,
    cumplimientoDS44: r.cumplimiento_ds44 ?? 0,
    coberturaEpp: r.cobertura_epp ?? 0,
    activeWorkers: r.active_workers ?? 0,
    totalWorkers: r.total_workers ?? 0,
  };
}

export class IndicatorService {
  /** TF = (N° Accidentes CTP × 1.000.000) / HHT */
  static frequency(accidentsCTP: number, manHours: number): number {
    if (manHours <= 0) return 0;
    return (accidentsCTP * 1_000_000) / manHours;
  }

  /** TG = ((Días Perdidos + Días Carga) × 1.000.000) / HHT */
  static severity(daysLost: number, daysCharge: number, manHours: number): number {
    if (manHours <= 0) return 0;
    return ((daysLost + daysCharge) * 1_000_000) / manHours;
  }

  /** IA = (N° Accidentes Total × 100) / Dotación Promedio */
  static accidentability(totalAccidents: number, avgHeadcount: number): number {
    if (avgHeadcount <= 0) return 0;
    return (totalAccidents * 100) / avgHeadcount;
  }

  /** Cumplimiento DS44 = (Actividades Ejecutadas / Actividades Programadas) × 100 */
  static complianceDS44(executed: number, planned: number): number {
    if (planned <= 0) return 0;
    return (executed / planned) * 100;
  }

  /** Cobertura EPP = (Trabajadores EPP Vigente Y Firmado / Total Trabajadores Activos) × 100 */
  static eppCoverage(workersWithEpp: number, totalActiveWorkers: number): number {
    if (totalActiveWorkers <= 0) return 0;
    return (workersWithEpp / totalActiveWorkers) * 100;
  }

  /** HHT = Suma de (Trabajadores Activos por Turno × Horas Diarias × Días Trabajados) */
  static calculateHHT(shifts: DailyShift[]): number {
    return shifts
      .filter((s) => s.attendance_status === "Presente")
      .reduce((sum, s) => sum + (s.calculated_hht || 8), 0);
  }

  static countAccidents(incidents: Incident[]): number {
    return incidents.filter((i) => i.type === "Accidente").length;
  }

  static countCTP(incidents: Incident[]): number {
    return incidents.filter(
      (i) => i.type === "Accidente" && (i.category === "CTP" || i.category === null),
    ).length;
  }

  static totalDaysLost(incidents: Incident[]): number {
    return incidents.reduce((sum, i) => sum + (i.days_lost || 0), 0);
  }

  static totalDaysCharge(incidents: Incident[]): number {
    return incidents.reduce((sum, i) => sum + (i.days_charge || 0), 0);
  }

  static compute(
    incidents: Incident[],
    shifts: DailyShift[],
    workers: Worker[],
    eppLogs: EppLog[],
    plannedActivities: number,
    executedActivities: number,
  ): IndicatorResult {
    const manHours = this.calculateHHT(shifts) || workers.length * 22 * 8;
    const accidentCount = this.countAccidents(incidents);
    const accidentCTPCount = this.countCTP(incidents);
    const daysLost = this.totalDaysLost(incidents);
    const daysCharge = this.totalDaysCharge(incidents);
    const activeWorkers = workers.filter((w) => w.status === "ACTIVO");
    const avgHeadcount = activeWorkers.length || workers.length;

    // EPP coverage: workers who have at least one EPP log with Bueno condition and signature
    const workersWithEpp = new Set(
      eppLogs
        .filter((e) => e.condition === "Bueno" && e.digital_signature)
        .map((e) => e.worker_rut),
    ).size;

    return {
      accidentCount,
      accidentCTPCount,
      daysLost,
      daysCharge,
      manHours,
      tf: this.frequency(accidentCTPCount, manHours),
      tg: this.severity(daysLost, daysCharge, manHours),
      ia: this.accidentability(accidentCount, avgHeadcount),
      cumplimientoDS44: this.complianceDS44(executedActivities, plannedActivities),
      coberturaEpp: this.eppCoverage(workersWithEpp, avgHeadcount),
    };
  }
}
