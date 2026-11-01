/**
 * Backup & restore service — exports all app data as JSON backup, and
 * exports a full SQLite-compatible .db dump via SQL statements.
 * Also supports Excel export of every table.
 */
import type { AppData } from "@/hooks/useAppData";
import { getCompanyName } from "./logo";

export interface BackupPayload {
  exported_at: string;
  app: string;
  version: string;
  tables: Record<string, unknown[]>;
}

export class BackupService {
  /** Export all data as a JSON backup file. */
  static async toJSON(data: AppData): Promise<void> {
    const { saveAs } = await import("file-saver");
    const payload: BackupPayload = {
      exported_at: new Date().toISOString(),
      app: `${getCompanyName()} SIG`,
      version: "Pro Edition",
      tables: {
        workers: data.workers as unknown[],
        epp_logs: data.eppLogs as unknown[],
        incidents_ds44: data.incidents as unknown[],
        trainings_ds44: data.trainings as unknown[],
        daily_shifts: data.shifts as unknown[],
        ast_logs: data.astLogs as unknown[],
        cphs_meetings: data.cphsMeetings as unknown[],
        iso_audits: data.isoAudits as unknown[],
        hhc_plan: data.hhcPlans as unknown[],
        cloud_documents: data.cloudDocs as unknown[],
        qr_scan_events: data.qrScans as unknown[],
        shift_definitions: data.shiftDefs as unknown[],
        training_attendance: data.trainingAttendance as unknown[],
        payroll_periods: data.payrollPeriods as unknown[],
        payroll_items: data.payrollItems as unknown[],
        performance_objectives: data.objectives as unknown[],
        performance_evaluations: data.evaluations as unknown[],
        performance_feedback: data.feedback as unknown[],
        worker_documents: data.workerDocs as unknown[],
        worker_requests: data.workerRequests as unknown[],
        shift_assignments: data.shiftAssignments as unknown[],
        shift_change_logs: data.shiftChangeLogs as unknown[],
        vacation_requests: data.vacationRequests as unknown[],
        vacation_balances: data.vacationBalances as unknown[],
        finiquitos: data.finiquitos as unknown[],
        security_talks: data.securityTalks as unknown[],
        iper_entries: data.iperEntries as unknown[],
        departments: data.departments as unknown[],
        correction_requests: data.correctionRequests as unknown[],
        security_alerts: data.securityAlerts as unknown[],
        medical_licenses: data.medicalLicenses as unknown[],
      },
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    saveAs(blob, `backup_${new Date().toISOString().slice(0, 10)}.json`);
  }

  /** Export every table as a multi-sheet Excel workbook. */
  static async toExcel(data: AppData): Promise<void> {
    const ExcelJS = await import("exceljs");
    const { saveAs } = await import("file-saver");
    const wb = new ExcelJS.Workbook();
    const sheets: Record<string, unknown[]> = {
      Trabajadores: data.workers as unknown[],
      EPP: data.eppLogs as unknown[],
      Incidentes: data.incidents as unknown[],
      Capacitaciones: data.trainings as unknown[],
      Asistencia: data.shifts as unknown[],
      Charlas_AST: data.astLogs as unknown[],
      CPHS: data.cphsMeetings as unknown[],
      ISO: data.isoAudits as unknown[],
      HHC: data.hhcPlans as unknown[],
      Docs_Nube: data.cloudDocs as unknown[],
      QR_Scans: data.qrScans as unknown[],
      Shift_Defs: data.shiftDefs as unknown[],
      Training_Att: data.trainingAttendance as unknown[],
      Payroll_Periods: data.payrollPeriods as unknown[],
      Payroll_Items: data.payrollItems as unknown[],
      Objectives: data.objectives as unknown[],
      Evaluations: data.evaluations as unknown[],
      Feedback: data.feedback as unknown[],
      Worker_Docs: data.workerDocs as unknown[],
      Worker_Requests: data.workerRequests as unknown[],
      Shift_Assignments: data.shiftAssignments as unknown[],
      Shift_Change_Logs: data.shiftChangeLogs as unknown[],
      Vacation_Requests: data.vacationRequests as unknown[],
      Vacation_Balances: data.vacationBalances as unknown[],
      Finiquitos: data.finiquitos as unknown[],
      Security_Talks: data.securityTalks as unknown[],
      IPER_Entries: data.iperEntries as unknown[],
      Departments: data.departments as unknown[],
      Correction_Requests: data.correctionRequests as unknown[],
      Security_Alerts: data.securityAlerts as unknown[],
      Medical_Licenses: data.medicalLicenses as unknown[],
    };
    for (const [name, rows] of Object.entries(sheets)) {
      const ws = wb.addWorksheet(name.slice(0, 31));
      const source = rows.length > 0 ? rows : [{}];
      const keys = Object.keys(source[0] as Record<string, unknown>);
      ws.columns = keys.map((k) => ({ header: k, key: k }));
      for (const row of source) {
        ws.addRow(row);
      }
    }
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(blob, `backup_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  /**
   * Export a SQLite-compatible .sql dump (CREATE TABLE + INSERT statements)
   * that can be imported into any SQLite3 client to reconstruct the database.
   */
  static async toSQLite(data: AppData): Promise<void> {
    const { saveAs } = await import("file-saver");
    const lines: string[] = [];
    lines.push(`-- ${getCompanyName()} SIG — SQLite3 Backup Dump`);
    lines.push(`-- Generated: ${new Date().toISOString()}`);
    lines.push(`-- Import: sqlite3 app.db < backup.sql`);
    lines.push("");

    const tables: [string, string, Record<string, unknown>[]][] = [
      [
        "workers",
        `CREATE TABLE IF NOT EXISTS workers (
  id TEXT PRIMARY KEY,
  rut TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  position TEXT NOT NULL,
  shift_cycle TEXT NOT NULL DEFAULT '7x7',
  contract_status TEXT NOT NULL DEFAULT 'Vigente',
  contract_type TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVO',
  occupational_exam_exp_date TEXT,
  driver_license_exp_date TEXT,
  irl_signed_date TEXT,
  created_at TEXT
);`,
        data.workers as unknown[] as Record<string, unknown>[],
      ],
      [
        "epp_logs",
        `CREATE TABLE IF NOT EXISTS epp_logs (
  id TEXT PRIMARY KEY,
  worker_rut TEXT NOT NULL,
  epp_item_name TEXT NOT NULL,
  certification_code_ds18 TEXT,
  delivery_date TEXT NOT NULL,
  expiration_date TEXT,
  condition TEXT NOT NULL DEFAULT 'Bueno',
  digital_signature TEXT,
  created_at TEXT
);`,
        data.eppLogs as unknown[] as Record<string, unknown>[],
      ],
      [
        "incidents_ds44",
        `CREATE TABLE IF NOT EXISTS incidents_ds44 (
  id TEXT PRIMARY KEY,
  incident_code TEXT,
  event_date TEXT NOT NULL,
  type TEXT NOT NULL,
  category TEXT,
  severity TEXT NOT NULL,
  location TEXT,
  description TEXT NOT NULL,
  root_cause_analysis TEXT,
  corrective_action TEXT,
  reported_to_achs INTEGER NOT NULL DEFAULT 0,
  diat_dieg_required INTEGER NOT NULL DEFAULT 0,
  worker_rut TEXT,
  days_lost INTEGER NOT NULL DEFAULT 0,
  days_charge INTEGER NOT NULL DEFAULT 0,
  created_at TEXT
);`,
        data.incidents as unknown[] as Record<string, unknown>[],
      ],
      [
        "trainings_ds44",
        `CREATE TABLE IF NOT EXISTS trainings_ds44 (
  id TEXT PRIMARY KEY,
  topic TEXT NOT NULL,
  hours REAL NOT NULL DEFAULT 1,
  trainer TEXT NOT NULL,
  date TEXT NOT NULL,
  attendees_rut_list TEXT,
  created_at TEXT
);`,
        data.trainings.map((t) => ({ ...t, attendees_rut_list: t.attendees_rut_list.join(",") })),
      ],
      [
        "daily_shifts",
        `CREATE TABLE IF NOT EXISTS daily_shifts (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  worker_rut TEXT NOT NULL,
  attendance_status TEXT NOT NULL DEFAULT 'Presente',
  shift_name TEXT NOT NULL,
  ast_signed INTEGER NOT NULL DEFAULT 0,
  calculated_hht REAL NOT NULL DEFAULT 8,
  created_at TEXT
);`,
        data.shifts.map((s) => ({ ...s, ast_signed: s.ast_signed ? 1 : 0 })),
      ],
      [
        "ast_logs",
        `CREATE TABLE IF NOT EXISTS ast_logs (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  topic TEXT NOT NULL,
  attendees_rut_list TEXT,
  signatures TEXT,
  created_at TEXT
);`,
        data.astLogs.map((a) => ({
          ...a,
          attendees_rut_list: a.attendees_rut_list.join(","),
          signatures: a.signatures.join(","),
        })),
      ],
      [
        "cphs_meetings",
        `CREATE TABLE IF NOT EXISTS cphs_meetings (
  id TEXT PRIMARY KEY,
  meeting_date TEXT NOT NULL,
  month_label TEXT NOT NULL,
  attendees_count INTEGER NOT NULL DEFAULT 0,
  topics TEXT NOT NULL,
  agreements TEXT,
  created_at TEXT
);`,
        data.cphsMeetings as unknown[] as Record<string, unknown>[],
      ],
      [
        "iso_audits",
        `CREATE TABLE IF NOT EXISTS iso_audits (
  id TEXT PRIMARY KEY,
  iso_standard TEXT NOT NULL,
  finding_type TEXT NOT NULL,
  description TEXT NOT NULL,
  area TEXT NOT NULL,
  corrective_action TEXT,
  status TEXT NOT NULL DEFAULT 'Abierta',
  due_date TEXT,
  created_at TEXT
);`,
        data.isoAudits as unknown[] as Record<string, unknown>[],
      ],
      [
        "hhc_plan",
        `CREATE TABLE IF NOT EXISTS hhc_plan (
  id TEXT PRIMARY KEY,
  year INTEGER NOT NULL,
  planned_hours REAL NOT NULL DEFAULT 0,
  executed_hours REAL NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TEXT
);`,
        data.hhcPlans as unknown[] as Record<string, unknown>[],
      ],
      [
        "cloud_documents",
        `CREATE TABLE IF NOT EXISTS cloud_documents (
  id TEXT PRIMARY KEY,
  worker_id TEXT,
  worker_rut TEXT,
  category TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'Google Drive',
  url TEXT NOT NULL,
  expiration_date TEXT,
  status TEXT NOT NULL DEFAULT 'VIGENTE',
  created_at TEXT
);`,
        data.cloudDocs as unknown[] as Record<string, unknown>[],
      ],
    ];

    for (const [name, ddl, rows] of tables) {
      lines.push(ddl);
      lines.push("");
      for (const row of rows) {
        const cols = Object.keys(row).filter((k) => row[k] !== undefined);
        const vals = cols.map((c) => {
          const v = row[c];
          if (v === null) return "NULL";
          if (typeof v === "number") return String(v);
          if (typeof v === "boolean") return v ? "1" : "0";
          return `'${String(v).replace(/'/g, "''")}'`;
        });
        lines.push(`INSERT INTO ${name} (${cols.join(", ")}) VALUES (${vals.join(", ")});`);
      }
      lines.push("");
    }

    const blob = new Blob([lines.join("\n")], { type: "application/sql" });
    saveAs(blob, `backup_${new Date().toISOString().slice(0, 10)}.sql`);
  }
}
