import type { PayrollItem, Worker, DailyShift, FiniquitoReason } from "./types";

export const MONTHS = [
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

export function fmtCLP(n: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(n);
}

export function totalDeductions(i: PayrollItem): number {
  return (
    Number(i.afp_deduction) +
    Number(i.health_deduction) +
    Number(i.tax_deduction) +
    Number(i.other_deductions)
  );
}

export interface FiniquitoCalcResult {
  indemnizacionAnios: number;
  indemnizacionSustitutiva: number;
  vacacionesNoGozadas: number;
  gratificacion: number;
  /** Años computables usados; los meses se conservan como fracción y los años completos se topan en 11. */
  aniosComputables: number;
  total: number;
}

const MAX_INDEMNIZACION_YEARS = 11;

/** Causales que generan indemnización por años de servicio (Art. 161 / despido injustificado). */
export function generatesIndemnizacion(reason: FiniquitoReason): boolean {
  return reason === "despido_injustificado" || reason === "necesidades_empresa";
}

/**
 * Cálculo único de finiquito. Es la misma función que alimenta la vista previa,
 * el registro guardado y el PDF: no debe existir otra fórmula en la app ni en la BD.
 */
export function calcFiniquito(
  baseSalary: number,
  years: number,
  months: number,
  vacationPending: number,
  reason: FiniquitoReason,
  gratificacion = 0,
): FiniquitoCalcResult {
  const base = Math.max(0, Number(baseSalary) || 0);
  const generates = generatesIndemnizacion(reason);
  // Mantener los meses como fracción evita perder remuneración en contratos
  // parciales y conserva el tope legal sobre los años completos.
  const fullYears = Math.min(Math.max(0, Math.floor(years)), MAX_INDEMNIZACION_YEARS);
  const fractionalMonths = Math.min(11, Math.max(0, Math.floor(months))) / 12;
  const aniosComputables = generates ? fullYears + fractionalMonths : 0;
  const indemnizacionAnios = Math.round(base * aniosComputables);
  // Indemnización sustitutiva del aviso previo: un mes de remuneración.
  const indemnizacionSustitutiva = generates ? Math.round(base) : 0;
  const vacacionesNoGozadas = vacationPending > 0 ? (base / 30) * vacationPending : 0;
  const grat = Math.max(0, Math.round(Number(gratificacion) || 0));
  const total = indemnizacionAnios + indemnizacionSustitutiva + vacacionesNoGozadas + grat;
  return {
    indemnizacionAnios,
    indemnizacionSustitutiva,
    vacacionesNoGozadas,
    gratificacion: grat,
    aniosComputables,
    total,
  };
}

const STANDARD_DAILY_HOURS = 8;
const DEFAULT_UTM = 67995;

const TAX_BRACKETS = [
  { fromUTM: 0, toUTM: 13.5, rate: 0, rebate: 0 },
  { fromUTM: 13.5, toUTM: 30, rate: 0.04, rebate: 0.54 },
  { fromUTM: 30, toUTM: 50, rate: 0.08, rebate: 1.74 },
  { fromUTM: 50, toUTM: 70, rate: 0.135, rebate: 4.49 },
  { fromUTM: 70, toUTM: 90, rate: 0.23, rebate: 11.14 },
  { fromUTM: 90, toUTM: 120, rate: 0.304, rebate: 17.8 },
  { fromUTM: 120, toUTM: 310, rate: 0.355, rebate: 23.92 },
  { fromUTM: 310, toUTM: Infinity, rate: 0.4, rebate: 39.42 },
];

export function calculateTax(taxableIncome: number, utmValue: number = DEFAULT_UTM): number {
  if (taxableIncome <= 0) return 0;
  const incomeInUTM = taxableIncome / utmValue;
  for (const bracket of TAX_BRACKETS) {
    if (incomeInUTM > bracket.fromUTM && incomeInUTM <= bracket.toUTM) {
      const tax = taxableIncome * bracket.rate - bracket.rebate * utmValue;
      return Math.max(0, Math.round(tax));
    }
  }
  return 0;
}

export function calculatePayrollItem(
  periodId: string,
  rut: string,
  w: Worker,
  wShifts: DailyShift[],
  utmValue: number = DEFAULT_UTM,
  shiftHoursMap?: Map<string, number>,
): Omit<PayrollItem, "id" | "created_at"> {
  const daysPresent = wShifts.filter((s) => s.attendance_status === "Presente").length;
  const daysAbsent = wShifts.filter((s) => s.attendance_status === "Ausente").length;
  const daysLicense = wShifts.filter((s) => s.attendance_status === "Licencia").length;
  const daysPermission = wShifts.filter((s) => s.attendance_status === "Permiso").length;

  let regularHours = 0;
  let overtimeHours = 0;
  for (const s of wShifts) {
    const hht = Number(s.calculated_hht ?? 0) || 0;
    if (s.attendance_status !== "Presente") continue;
    const threshold = shiftHoursMap?.get(`${rut}|${s.date}`) ?? STANDARD_DAILY_HOURS;
    if (hht > threshold) {
      regularHours += threshold;
      overtimeHours += hht - threshold;
    } else {
      regularHours += hht;
    }
  }

  const baseSalary = Number(w.base_salary ?? 0) || 0;
  const hourlyRate = Number(w.hourly_rate ?? 0) || 0;
  const overtimeRate = Number(w.overtime_rate ?? 1.5) || 1.5;
  const mealAllowance = Number(w.meal_allowance ?? 0) || 0;
  const mobilityAllowance = Number(w.mobility_allowance ?? 0) || 0;
  const afpRate = (Number(w.afp_rate ?? 10) || 10) / 100;
  const healthRate = (Number(w.health_rate ?? 7) || 7) / 100;
  const bonusTarget = Number(w.bonus_target ?? 0) || 0;

  const baseAmount =
    hourlyRate > 0
      ? regularHours * hourlyRate
      : Math.max(0, baseSalary - (baseSalary / 30) * daysAbsent);
  const impliedHourlyRate = hourlyRate > 0 ? hourlyRate : baseSalary / 30 / STANDARD_DAILY_HOURS;
  const overtimeAmount = overtimeHours * impliedHourlyRate * overtimeRate;
  const mealAmount = mealAllowance * daysPresent;
  const mobilityAmount = mobilityAllowance;
  const bonusAmount = bonusTarget;

  const rBase = Math.round(baseAmount);
  const rOvertime = Math.round(overtimeAmount);
  const rMeal = Math.round(mealAmount);
  const rMobility = Math.round(mobilityAmount);
  const rBonus = Math.round(bonusAmount);

  const rTaxable = rBase + rOvertime + rBonus;
  const rGross = rTaxable + rMeal + rMobility;

  const rAfp = Math.round(rTaxable * afpRate);
  const rHealth = Math.round(rTaxable * healthRate);
  const rTax = calculateTax(rTaxable, utmValue);
  const rOther = 0;

  const rTotalDeductions = rAfp + rHealth + rTax + rOther;
  const rNetPay = rGross - rTotalDeductions;

  return {
    period_id: periodId,
    worker_rut: rut,
    days_present: daysPresent,
    days_absent: daysAbsent,
    days_license: daysLicense,
    days_permission: daysPermission,
    regular_hours: regularHours,
    overtime_hours: overtimeHours,
    base_salary_amount: rBase,
    overtime_amount: rOvertime,
    meal_allowance_amount: rMeal,
    mobility_allowance_amount: rMobility,
    bonus_amount: rBonus,
    gross_income: rGross,
    taxable_income: rTaxable,
    afp_deduction: rAfp,
    health_deduction: rHealth,
    tax_deduction: rTax,
    other_deductions: rOther,
    net_pay: rNetPay,
    bonuses_detail: rBonus > 0 ? [{ label: "Bono productividad", amount: rBonus }] : [],
    deductions_detail: [
      { label: "AFP", amount: rAfp },
      { label: "Salud", amount: rHealth },
      ...(rTax > 0 ? [{ label: "Impuesto único", amount: rTax }] : []),
    ],
    status: "calculado",
    generated_at: new Date().toISOString(),
  };
}
