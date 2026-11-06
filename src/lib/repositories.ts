import { supabase } from "./supabase";
import { isOptionalHttpUrl } from "./validation/httpUrl";
import type {
  Worker,
  EppLog,
  Incident,
  Training,
  DailyShift,
  AstLog,
  CphsMeeting,
  IsoAudit,
  HhcPlan,
  CloudDocument,
  QrScanEvent,
  ActivityLog,
  ShiftDefinition,
  Honeytoken,
  SystemConfig,
  TrainingAttendance,
  PayrollPeriod,
  PayrollItem,
  PerformanceObjective,
  PerformanceEvaluation,
  PerformanceFeedback,
  WorkerDocument,
  DataConsent,
  DataRightsRequest,
  WorkerRequest,
  ShiftAssignment,
  ShiftChangeLog,
  VacationRequest,
  VacationRequestStatus,
  VacationBalance,
  FiniquitoRecord,
  SecurityTalk,
  IperEntry,
  Department,
  CorrectionRequest,
  SecurityAlert,
  MedicalLicense,
  Customer,
  Quote,
  QuoteItem,
  Invoice,
  InvoiceItem,
  PurchaseOrder,
  PurchaseOrderItem,
  Circular,
  CircularAcknowledgment,
  SalaryAdvance,
  InternalLoan,
  WorkerDiscount,
  WorkerPaymentStatement,
  HarassmentReport,
  SecurityBreachReport,
  WorkerBankAccount,
  AllowedEmail,
  BackupConfig,
  BackupHistory,
  Supplier,
  EppDelivery,
} from "./types";

function normalizeOptionalHttpUrl(value: unknown, field: string): unknown {
  if (value == null) return value;
  if (typeof value !== "string") throw new Error(`${field} debe ser una URL http(s) válida.`);
  const normalized = value.trim();
  if (!normalized) return null;
  if (!isOptionalHttpUrl(normalized)) throw new Error(`${field} debe ser una URL http(s) válida.`);
  return normalized;
}

function normalizeUrlField<T extends Record<string, unknown>>(
  input: T,
  key: string,
  label: string,
): T {
  if (!(key in input)) return input;
  return { ...input, [key]: normalizeOptionalHttpUrl(input[key], label) };
}

export class VersionConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VersionConflictError";
  }
}

/**
 * Base repository class providing CRUD operations over a Supabase table.
 * Subclasses bind the table name and row type.
 */
abstract class BaseRepository<T extends { id: string }> {
  protected abstract table: string;
  protected defaultLimit = 1000;
  protected async resolveTenant(): Promise<string> {
    const { data, error } = await supabase.rpc("current_tenant_id");
    if (error || !data) throw new Error(error?.message ?? "No hay tenant activo");
    return data as string;
  }
  async getAll(): Promise<T[]> {
    const scope = await this.resolveTenant();
    const { data, error } = await supabase
      .from(this.table)
      .select("*")
      .eq("tenant_id", scope)
      .order("created_at", { ascending: false })
      .limit(this.defaultLimit);
    if (error) throw new Error(error.message);
    return (data ?? []) as T[];
  }
  async getPaginated(page: number, pageSize: number): Promise<{ rows: T[]; hasMore: boolean }> {
    const scope = await this.resolveTenant();
    const offset = (page - 1) * pageSize;
    const { data, error } = await supabase
      .from(this.table)
      .select("*")
      .eq("tenant_id", scope)
      .order("created_at", { ascending: false })
      .range(offset, offset + pageSize - 1);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as T[];
    return { rows, hasMore: rows.length === pageSize };
  }
  async getByDateRange(dateColumn: string, startDate: string, endDate: string): Promise<T[]> {
    const scope = await this.resolveTenant();
    const { data, error } = await supabase
      .from(this.table)
      .select("*")
      .eq("tenant_id", scope)
      .gte(dateColumn, startDate)
      .lte(dateColumn, endDate)
      .order(dateColumn, { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as T[];
  }
  async getPaginatedWithDateRange(
    page: number,
    pageSize: number,
    dateColumn: string,
    startDate?: string,
    endDate?: string,
  ): Promise<{ rows: T[]; hasMore: boolean; total: number }> {
    const scope = await this.resolveTenant();
    const offset = (page - 1) * pageSize;
    let query = supabase
      .from(this.table)
      .select("*", { count: "exact" })
      .eq("tenant_id", scope)
      .order(dateColumn, { ascending: false });
    if (startDate) query = query.gte(dateColumn, startDate);
    if (endDate) query = query.lte(dateColumn, endDate);
    const { data, error, count } = await query.range(offset, offset + pageSize - 1);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as T[];
    return { rows, hasMore: rows.length === pageSize, total: count ?? 0 };
  }
  async count(): Promise<number> {
    const scope = await this.resolveTenant();
    const { count, error } = await supabase
      .from(this.table)
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", scope);
    if (error) throw new Error(error.message);
    return count ?? 0;
  }
  async getRecent(limit = 300): Promise<T[]> {
    const scope = await this.resolveTenant();
    const { data, error } = await supabase
      .from(this.table)
      .select("*")
      .eq("tenant_id", scope)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return (data ?? []) as T[];
  }
  async insert(row: Omit<T, "id" | "created_at" | "tenant_id">): Promise<T> {
    const scope = await this.resolveTenant();
    const { data, error } = await supabase
      .from(this.table)
      .insert({ ...row, tenant_id: scope } as never)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as T;
  }
  async insertMany(rows: Omit<T, "id" | "created_at" | "tenant_id">[]): Promise<T[]> {
    const scope = await this.resolveTenant();
    if (!rows.length) return [];
    const { data, error } = await supabase
      .from(this.table)
      .insert(rows.map((r) => ({ ...r, tenant_id: scope })) as never[])
      .select();
    if (error) throw new Error(error.message);
    return (data ?? []) as T[];
  }
  async update(id: string, patch: Partial<Omit<T, "tenant_id">>): Promise<T> {
    const scope = await this.resolveTenant();
    const { data, error } = await supabase
      .from(this.table)
      .update(patch as never)
      .eq("tenant_id", scope)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as T;
  }
  async updateWithVersion(
    id: string,
    patch: Partial<Omit<T, "tenant_id">>,
    expectedUpdatedAt: string,
  ): Promise<T> {
    const scope = await this.resolveTenant();
    const { data, error } = await supabase
      .from(this.table)
      .update(patch as never)
      .eq("tenant_id", scope)
      .eq("id", id)
      .eq("updated_at", expectedUpdatedAt)
      .select()
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data)
      throw new VersionConflictError(
        "Este registro fue modificado por otra persona. Recarga la página antes de guardar.",
      );
    return data as T;
  }
  async remove(id: string): Promise<void> {
    const scope = await this.resolveTenant();
    const { error } = await supabase.from(this.table).delete().eq("tenant_id", scope).eq("id", id);
    if (error) throw new Error(error.message);
  }
}

export class WorkerRepository extends BaseRepository<Worker> {
  protected table = "workers";

  private toWorkerRow(input: Record<string, unknown>): Record<string, unknown> {
    const normalizedInput = normalizeUrlField(input, "contract_url", "La URL del contrato");
    const columns = new Set([
      "rut",
      "full_name",
      "nombres",
      "apellidos",
      "position",
      "shift_cycle",
      "contract_status",
      "status",
      "occupational_exam_exp_date",
      "driver_license_exp_date",
      "irl_signed_date",
      "contract_type",
      "phone",
      "email",
      "address",
      "birth_date",
      "hire_date",
      "contract_start_date",
      "contract_end_date",
      "contract_url",
      "emergency_contact_name",
      "emergency_contact_phone",
      "afp",
      "health_insurance",
      "nationality",
      "notes",
      "photo_url",
      "base_salary",
      "hourly_rate",
      "overtime_rate",
      "meal_allowance",
      "mobility_allowance",
      "afp_rate",
      "health_rate",
      "bonus_target",
      "department_id",
      "reports_to",
    ]);
    return Object.fromEntries(Object.entries(normalizedInput).filter(([key]) => columns.has(key)));
  }

  async insert(row: Omit<Worker, "id" | "created_at" | "tenant_id">): Promise<Worker> {
    return super.insert(this.toWorkerRow(row as unknown as Record<string, unknown>) as never);
  }

  async update(id: string, patch: Partial<Omit<Worker, "tenant_id">>): Promise<Worker> {
    return super.update(id, this.toWorkerRow(patch as unknown as Record<string, unknown>) as never);
  }

  async updateWithVersion(
    id: string,
    patch: Partial<Omit<Worker, "tenant_id">>,
    expectedUpdatedAt: string,
  ): Promise<Worker> {
    return super.updateWithVersion(
      id,
      this.toWorkerRow(patch as unknown as Record<string, unknown>) as never,
      expectedUpdatedAt,
    );
  }

  async getRutNameMap(): Promise<Map<string, string>> {
    const { data, error } = await supabase.from(this.table).select("rut, full_name");
    if (error) throw new Error(error.message);
    return new Map(
      (data ?? []).map((w: { rut: string; full_name: string }) => [w.rut, w.full_name]),
    );
  }
}

export class EppRepository extends BaseRepository<EppLog> {
  protected table = "epp_logs";
  protected dateColumn = "delivery_date";
}

export class IncidentRepository extends BaseRepository<Incident> {
  protected table = "incidents_ds44";
}

export class TrainingRepository extends BaseRepository<Training> {
  protected table = "trainings_ds44";
}

export class ShiftRepository extends BaseRepository<DailyShift> {
  protected table = "daily_shifts";
  protected dateColumn = "date";

  async getAll(): Promise<DailyShift[]> {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const since = threeMonthsAgo.toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from(this.table)
      .select("*")
      .gte("date", since)
      .order("date", { ascending: false })
      .limit(2000);
    if (error) throw new Error(error.message);
    return (data ?? []) as DailyShift[];
  }

  async upsertMany(rows: Omit<DailyShift, "id" | "created_at">[]): Promise<DailyShift[]> {
    const { data: tenantId, error: tenantError } = await supabase.rpc("current_tenant_id");
    if (tenantError || !tenantId) throw new Error(tenantError?.message ?? "No active tenant");
    const { data, error } = await supabase
      .from(this.table)
      .upsert(
        rows.map((row) => ({ ...row, tenant_id: tenantId })),
        { onConflict: "tenant_id,worker_rut,date" },
      )
      .select();
    if (error) throw new Error(error.message);
    return (data ?? []) as DailyShift[];
  }

  async deleteByWorkerDate(workerRut: string, date: string): Promise<void> {
    const { error } = await supabase
      .from(this.table)
      .delete()
      .eq("worker_rut", workerRut)
      .eq("date", date);
    if (error) throw new Error(error.message);
  }

  async generateForWorker(workerRut: string, shiftCycle: string, hireDate: string): Promise<void> {
    const today = new Date().toISOString().slice(0, 10);
    if (hireDate > today) return;
    const rows: Omit<DailyShift, "id" | "created_at">[] = [];
    const cycleDays =
      shiftCycle === "7x7" ? 14 : shiftCycle === "5x2" ? 7 : shiftCycle === "4x3" ? 7 : 7;
    const workDays =
      shiftCycle === "7x7" ? 7 : shiftCycle === "5x2" ? 5 : shiftCycle === "4x3" ? 4 : 5;
    const start = new Date(hireDate);
    const end = new Date(today);
    let dayIdx = 0;
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dayInCycle = dayIdx % cycleDays;
      const isWorkDay = dayInCycle < workDays;
      rows.push({
        date: d.toISOString().slice(0, 10),
        worker_rut: workerRut,
        attendance_status: isWorkDay ? "Presente" : "Descanso",
        shift_name: shiftCycle,
        ast_signed: false,
        calculated_hht: 0,
        epp_inicio: {},
        epp_termino: {},
        notes: null,
      });
      dayIdx++;
      if (rows.length >= 400) break;
    }
    if (rows.length > 0) {
      await this.upsertMany(rows);
    }
  }
}

export class AstRepository extends BaseRepository<AstLog> {
  protected table = "ast_logs";
}

export class CphsRepository extends BaseRepository<CphsMeeting> {
  protected table = "cphs_meetings";
}

export class IsoAuditRepository extends BaseRepository<IsoAudit> {
  protected table = "iso_audits";
}

export class HhcRepository extends BaseRepository<HhcPlan> {
  protected table = "hhc_plan";
}

export class CloudDocumentRepository extends BaseRepository<CloudDocument> {
  protected table = "cloud_documents";
}

export class QrScanRepository extends BaseRepository<QrScanEvent> {
  protected table = "qr_scan_events";
  protected dateColumn = "scan_date";

  async getAll(): Promise<QrScanEvent[]> {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const since = threeMonthsAgo.toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from(this.table)
      .select("*")
      .gte("scan_date", since)
      .order("scan_date", { ascending: false })
      .order("scan_time", { ascending: false })
      .limit(2000);
    if (error) throw new Error(error.message);
    return (data ?? []) as QrScanEvent[];
  }

  async findByWorkerDate(rut: string, date: string): Promise<QrScanEvent[]> {
    const { data, error } = await supabase
      .from(this.table)
      .select("*")
      .eq("worker_rut", rut)
      .eq("scan_date", date)
      .order("scan_time", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as QrScanEvent[];
  }

  async hasValidatedScan(rut: string, scanType: string, date: string): Promise<boolean> {
    const { data, error } = await supabase
      .from(this.table)
      .select("id")
      .eq("worker_rut", rut)
      .eq("scan_type", scanType)
      .eq("scan_date", date)
      .eq("validated", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return !!data;
  }

  async insertValidated(
    row: Omit<QrScanEvent, "id" | "created_at">,
  ): Promise<{ data: QrScanEvent | null; duplicate: boolean }> {
    const { data, error } = await supabase.from(this.table).insert(row).select().maybeSingle();
    if (error) {
      if (error.code === "23505") return { data: null, duplicate: true };
      throw new Error(error.message);
    }
    return { data: data as QrScanEvent, duplicate: false };
  }

  async markUnvalidated(rut: string, scanType: string, date: string): Promise<void> {
    const { error } = await supabase
      .from(this.table)
      .update({ validated: false })
      .eq("worker_rut", rut)
      .eq("scan_type", scanType)
      .eq("scan_date", date)
      .eq("validated", true);
    if (error) throw new Error(error.message);
  }
}

export class ActivityLogRepository extends BaseRepository<ActivityLog> {
  protected table = "activity_logs";
  protected dateColumn = "created_at";

  async getAll(): Promise<ActivityLog[]> {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const since = threeMonthsAgo.toISOString();
    const { data, error } = await supabase
      .from(this.table)
      .select("*")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(2000);
    if (error) throw new Error(error.message);
    return (data ?? []) as ActivityLog[];
  }

  async getFiltered(opts: {
    tenantId?: string;
    action?: string;
    entity?: string;
    search?: string;
    limit?: number;
  }): Promise<{ rows: ActivityLog[]; total: number }> {
    let query = supabase
      .from(this.table)
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });
    if (opts.tenantId) query = query.eq("tenant_id", opts.tenantId);
    if (opts.action) query = query.eq("action", opts.action);
    if (opts.entity) query = query.eq("entity", opts.entity);
    if (opts.search) {
      query = query.or(`user_email.ilike.%${opts.search}%,entity_label.ilike.%${opts.search}%`);
    }
    if (opts.limit) query = query.limit(opts.limit);
    const { data, error, count } = await query;
    if (error) throw new Error(error.message);
    return { rows: (data ?? []) as ActivityLog[], total: count ?? 0 };
  }

  async exportFiltered(opts: {
    tenantId?: string;
    action?: string;
    entity?: string;
    search?: string;
  }): Promise<ActivityLog[]> {
    let query = supabase.from(this.table).select("*").order("created_at", { ascending: false });
    if (opts.tenantId) query = query.eq("tenant_id", opts.tenantId);
    if (opts.action) query = query.eq("action", opts.action);
    if (opts.entity) query = query.eq("entity", opts.entity);
    if (opts.search) {
      query = query.or(`user_email.ilike.%${opts.search}%,entity_label.ilike.%${opts.search}%`);
    }
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []) as ActivityLog[];
  }
}

export class ShiftDefinitionRepository extends BaseRepository<ShiftDefinition> {
  protected table = "shift_definitions";
}

export class HoneytokenRepository extends BaseRepository<Honeytoken> {
  protected table = "honeytokens";
}

export class TrainingAttendanceRepository extends BaseRepository<TrainingAttendance> {
  protected table = "training_attendance";

  async getByTraining(trainingId: string): Promise<TrainingAttendance[]> {
    const { data, error } = await supabase
      .from(this.table)
      .select("*")
      .eq("training_id", trainingId)
      .order("attendance_date", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as TrainingAttendance[];
  }

  async getByWorker(rut: string): Promise<TrainingAttendance[]> {
    const { data, error } = await supabase
      .from(this.table)
      .select("*")
      .eq("worker_rut", rut)
      .order("attendance_date", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as TrainingAttendance[];
  }
}

export class SystemConfigRepository {
  private table = "system_config";

  async getAll(): Promise<SystemConfig[]> {
    const { data, error } = await supabase.from(this.table).select("*");
    if (error) throw new Error(error.message);
    return (data ?? []) as SystemConfig[];
  }

  async getValue(key: string): Promise<string | null> {
    const { data, error } = await supabase
      .from(this.table)
      .select("value")
      .eq("key", key)
      .maybeSingle();
    if (error) return null;
    return data?.value ?? null;
  }

  /** Reads several keys at once and returns them as a key → value map. */
  async getValues(keys: string[]): Promise<Record<string, string>> {
    const { data, error } = await supabase.from(this.table).select("key, value").in("key", keys);
    if (error) throw new Error(error.message);
    return Object.fromEntries(
      ((data ?? []) as { key: string; value: string }[]).map((r) => [r.key, r.value]),
    );
  }

  async setValue(key: string, value: string): Promise<void> {
    const { error } = await supabase
      .from(this.table)
      .upsert(
        { key, value, updated_at: new Date().toISOString() },
        { onConflict: "tenant_id,key" },
      );
    if (error) throw new Error(error.message);
  }
}

export const workerRepo = new WorkerRepository();
export const eppRepo = new EppRepository();
export const incidentRepo = new IncidentRepository();
export const trainingRepo = new TrainingRepository();
export const shiftRepo = new ShiftRepository();
export const astRepo = new AstRepository();
export const cphsRepo = new CphsRepository();
export const isoAuditRepo = new IsoAuditRepository();
export const hhcRepo = new HhcRepository();
export const cloudDocRepo = new CloudDocumentRepository();
export const qrScanRepo = new QrScanRepository();
export const activityLogRepo = new ActivityLogRepository();
export const shiftDefRepo = new ShiftDefinitionRepository();
export const honeytokenRepo = new HoneytokenRepository();
export const trainingAttRepo = new TrainingAttendanceRepository();
export const systemConfigRepo = new SystemConfigRepository();

// ═══════════════════════════════════════════════════════════════════════
// HR — Payroll & Performance repositories
// ═══════════════════════════════════════════════════════════════════════

export class PayrollPeriodRepository extends BaseRepository<PayrollPeriod> {
  protected table = "payroll_periods";
}

export class PayrollItemRepository extends BaseRepository<PayrollItem> {
  protected table = "payroll_items";
  protected dateColumn = "created_at";

  async getByPeriod(periodId: string): Promise<PayrollItem[]> {
    const { data, error } = await supabase
      .from(this.table)
      .select("*")
      .eq("period_id", periodId)
      .order("worker_rut", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as PayrollItem[];
  }

  async upsertByPeriodWorker(row: Omit<PayrollItem, "id" | "created_at">): Promise<PayrollItem> {
    const { data, error } = await supabase
      .from(this.table)
      .upsert(row, { onConflict: "period_id,worker_rut" })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as PayrollItem;
  }

  async deleteByPeriod(periodId: string): Promise<void> {
    const { error } = await supabase.from(this.table).delete().eq("period_id", periodId);
    if (error) throw new Error(error.message);
  }
}

export class PerformanceObjectiveRepository extends BaseRepository<PerformanceObjective> {
  protected table = "performance_objectives";

  async getByWorker(rut: string): Promise<PerformanceObjective[]> {
    const { data, error } = await supabase
      .from(this.table)
      .select("*")
      .eq("worker_rut", rut)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as PerformanceObjective[];
  }
}

export class PerformanceEvaluationRepository extends BaseRepository<PerformanceEvaluation> {
  protected table = "performance_evaluations";

  async getByWorker(rut: string): Promise<PerformanceEvaluation[]> {
    const { data, error } = await supabase
      .from(this.table)
      .select("*")
      .eq("worker_rut", rut)
      .order("evaluation_date", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as PerformanceEvaluation[];
  }
}

export class PerformanceFeedbackRepository extends BaseRepository<PerformanceFeedback> {
  protected table = "performance_feedback";

  async getByWorker(rut: string): Promise<PerformanceFeedback[]> {
    const { data, error } = await supabase
      .from(this.table)
      .select("*")
      .eq("worker_rut", rut)
      .order("feedback_date", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as PerformanceFeedback[];
  }
}

export class WorkerDocumentRepository extends BaseRepository<WorkerDocument> {
  protected table = "worker_documents";

  async insert(
    row: Omit<WorkerDocument, "id" | "created_at" | "tenant_id">,
  ): Promise<WorkerDocument> {
    const normalized = normalizeUrlField(
      row as unknown as Record<string, unknown>,
      "document_url",
      "La URL del documento",
    );
    return super.insert(
      normalized as unknown as Omit<WorkerDocument, "id" | "created_at" | "tenant_id">,
    );
  }

  async update(
    id: string,
    patch: Partial<Omit<WorkerDocument, "tenant_id">>,
  ): Promise<WorkerDocument> {
    const normalized = normalizeUrlField(
      patch as unknown as Record<string, unknown>,
      "document_url",
      "La URL del documento",
    );
    return super.update(id, normalized as unknown as Partial<Omit<WorkerDocument, "tenant_id">>);
  }

  async getByWorker(rut: string): Promise<WorkerDocument[]> {
    const { data, error } = await supabase
      .from(this.table)
      .select("*")
      .eq("worker_rut", rut)
      .order("document_date", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as WorkerDocument[];
  }
}

export const payrollPeriodRepo = new PayrollPeriodRepository();
export const payrollItemRepo = new PayrollItemRepository();
export const objectiveRepo = new PerformanceObjectiveRepository();
export const evaluationRepo = new PerformanceEvaluationRepository();
export const feedbackRepo = new PerformanceFeedbackRepository();
export const workerDocRepo = new WorkerDocumentRepository();

// ═══════════════════════════════════════════════════════════════════════
// Ley 19.628 — Protección de Datos Personales
// ═══════════════════════════════════════════════════════════════════════

export class DataConsentRepository extends BaseRepository<DataConsent> {
  protected table = "data_consent";

  async getByWorker(rut: string): Promise<DataConsent[]> {
    const { data, error } = await supabase
      .from(this.table)
      .select("*")
      .eq("worker_rut", rut)
      .order("granted_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as DataConsent[];
  }
}

export class DataRightsRequestRepository extends BaseRepository<DataRightsRequest> {
  protected table = "data_rights_requests";

  async getByWorker(rut: string): Promise<DataRightsRequest[]> {
    const { data, error } = await supabase
      .from(this.table)
      .select("*")
      .eq("worker_rut", rut)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as DataRightsRequest[];
  }
}

export const consentRepo = new DataConsentRepository();
export const rightsRequestRepo = new DataRightsRequestRepository();

// ═══════════════════════════════════════════════════════════════════════
// Worker Portal — Worker Requests
// ═══════════════════════════════════════════════════════════════════════

export class WorkerRequestRepository extends BaseRepository<WorkerRequest> {
  protected table = "worker_requests";

  async getByWorker(rut: string): Promise<WorkerRequest[]> {
    const { data, error } = await supabase
      .from(this.table)
      .select("*")
      .eq("worker_rut", rut)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as WorkerRequest[];
  }
}

export const workerRequestRepo = new WorkerRequestRepository();

// Server-side functions for anonymization and deletion (SECURITY DEFINER)
export async function anonymizeWorker(rut: string): Promise<void> {
  const { error } = await supabase.rpc("anonymize_worker", { p_rut: rut });
  if (error) throw new Error(error.message);
}

export async function deleteWorkerGdpr(rut: string): Promise<void> {
  const { error } = await supabase.rpc("delete_worker_gdpr", { p_rut: rut });
  if (error) throw new Error(error.message);
}

// ═══════════════════════════════════════════════════════════════════════
// Shift Assignments & Change Logs
// ═══════════════════════════════════════════════════════════════════════

export class ShiftAssignmentRepository extends BaseRepository<ShiftAssignment> {
  protected table = "shift_assignments";

  async getActiveByWorker(rut: string): Promise<ShiftAssignment | null> {
    const { data, error } = await supabase
      .from(this.table)
      .select("*")
      .eq("worker_rut", rut)
      .eq("active", true)
      .order("created_at", { ascending: false })
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data as ShiftAssignment | null;
  }

  async getAllActive(): Promise<ShiftAssignment[]> {
    const { data, error } = await supabase
      .from(this.table)
      .select("*")
      .eq("active", true)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as ShiftAssignment[];
  }

  async getHistoryByWorker(rut: string): Promise<ShiftAssignment[]> {
    const { data, error } = await supabase
      .from(this.table)
      .select("*")
      .eq("worker_rut", rut)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as ShiftAssignment[];
  }

  async deactivateByWorker(rut: string): Promise<void> {
    const { error } = await supabase
      .from(this.table)
      .update({ active: false, end_date: new Date().toISOString().slice(0, 10) })
      .eq("worker_rut", rut)
      .eq("active", true);
    if (error) throw new Error(error.message);
  }
}

export class ShiftChangeLogRepository extends BaseRepository<ShiftChangeLog> {
  protected table = "shift_change_logs";

  async getByWorker(rut: string): Promise<ShiftChangeLog[]> {
    const { data, error } = await supabase
      .from(this.table)
      .select("*")
      .eq("worker_rut", rut)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as ShiftChangeLog[];
  }

  async getAll(): Promise<ShiftChangeLog[]> {
    const { data, error } = await supabase
      .from(this.table)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) throw new Error(error.message);
    return (data ?? []) as ShiftChangeLog[];
  }
}

export const shiftAssignmentRepo = new ShiftAssignmentRepository();
export const shiftChangeLogRepo = new ShiftChangeLogRepository();

// ═══════════════════════════════════════════════════════════════════════
// Vacaciones, Finiquitos, Charlas DIT, Matriz IPER
// ═══════════════════════════════════════════════════════════════════════

export class VacationRequestRepository extends BaseRepository<VacationRequest> {
  protected table = "vacation_requests";

  async getByWorker(rut: string): Promise<VacationRequest[]> {
    const { data, error } = await supabase
      .from(this.table)
      .select("*")
      .eq("worker_rut", rut)
      .order("start_date", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as VacationRequest[];
  }

  async getByYear(year: number): Promise<VacationRequest[]> {
    const { data, error } = await supabase
      .from(this.table)
      .select("*")
      .eq("year", year)
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return (data ?? []) as VacationRequest[];
  }

  /**
   * Conditional status transition: only applies when the row is still in one of
   * `allowedFrom`. Returns null when another admin already moved the request.
   */
  async updateStatusIfIn(
    id: string,
    allowedFrom: VacationRequestStatus[],
    patch: {
      status: VacationRequestStatus;
      approved_by_email: string | null;
      approved_at: string | null;
    },
  ): Promise<VacationRequest | null> {
    const { data, error } = await supabase
      .from(this.table)
      .update(patch)
      .eq("id", id)
      .in("status", allowedFrom)
      .select()
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data ?? null) as VacationRequest | null;
  }
}

export class VacationBalanceRepository extends BaseRepository<VacationBalance> {
  protected table = "vacation_balances";

  async getByWorkerYear(rut: string, year: number): Promise<VacationBalance | null> {
    const { data, error } = await supabase
      .from(this.table)
      .select("*")
      .eq("worker_rut", rut)
      .eq("year", year)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data as VacationBalance | null;
  }

  /**
   * Optimistic usage update: applies only when `used_days` still equals
   * `expectedUsedDays`. Returns null on a concurrent modification.
   */
  async updateUsageIfUnchanged(
    id: string,
    expectedUsedDays: number,
    usedDays: number,
    remainingDays: number,
  ): Promise<VacationBalance | null> {
    const { data, error } = await supabase
      .from(this.table)
      .update({ used_days: usedDays, remaining_days: remainingDays })
      .eq("id", id)
      .eq("used_days", expectedUsedDays)
      .select()
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data ?? null) as VacationBalance | null;
  }

  /** Unconditional usage write, used to revert a previously applied deduction. */
  async setUsage(id: string, usedDays: number, remainingDays: number): Promise<void> {
    const { error } = await supabase
      .from(this.table)
      .update({ used_days: usedDays, remaining_days: remainingDays })
      .eq("id", id);
    if (error) throw new Error(error.message);
  }
}

export class FiniquitoRepository extends BaseRepository<FiniquitoRecord> {
  protected table = "finiquito_records";

  async getAll(): Promise<FiniquitoRecord[]> {
    const { data, error } = await supabase
      .from(this.table)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return (data ?? []) as FiniquitoRecord[];
  }

  async getPage(
    page: number,
    pageSize: number,
  ): Promise<{ data: FiniquitoRecord[]; count: number }> {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const { data, error, count } = await supabase
      .from(this.table)
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);
    if (error) throw new Error(error.message);
    return { data: (data ?? []) as FiniquitoRecord[], count: count ?? 0 };
  }
}

export class SecurityTalkRepository extends BaseRepository<SecurityTalk> {
  protected table = "security_talks";

  async getAll(): Promise<SecurityTalk[]> {
    const { data, error } = await supabase
      .from(this.table)
      .select("*")
      .order("talk_date", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return (data ?? []) as SecurityTalk[];
  }
}

export class IperEntryRepository extends BaseRepository<IperEntry> {
  protected table = "iper_entries";

  async getAll(): Promise<IperEntry[]> {
    const { data, error } = await supabase
      .from(this.table)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return (data ?? []) as IperEntry[];
  }
}

export const vacationRequestRepo = new VacationRequestRepository();
export const vacationBalanceRepo = new VacationBalanceRepository();
export const finiquitoRepo = new FiniquitoRepository();
export const securityTalkRepo = new SecurityTalkRepository();
export const iperEntryRepo = new IperEntryRepository();

// ═══════════════════════════════════════════════════════════════════════
// FEAT-003/004: Departments & GDPR repositories
// ═══════════════════════════════════════════════════════════════════════

export class DepartmentRepository extends BaseRepository<Department> {
  protected table = "departments";

  async getAllByName(): Promise<Department[]> {
    const { data, error } = await supabase.from(this.table).select("*").order("name");
    if (error) throw new Error(error.message);
    return (data ?? []) as Department[];
  }
}

export class CorrectionRequestRepository extends BaseRepository<CorrectionRequest> {
  protected table = "correction_requests";
}

export class SecurityAlertRepository extends BaseRepository<SecurityAlert> {
  protected table = "security_alerts";

  async getUnacknowledged(): Promise<SecurityAlert[]> {
    const { data, error } = await supabase
      .from(this.table)
      .select("*")
      .eq("acknowledged", false)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return (data ?? []) as SecurityAlert[];
  }
}

export const departmentRepo = new DepartmentRepository();
export const correctionRequestRepo = new CorrectionRequestRepository();
export const securityAlertRepo = new SecurityAlertRepository();

export class MedicalLicenseRepository extends BaseRepository<MedicalLicense> {
  protected table = "medical_licenses";
  protected dateColumn = "start_date";

  async insert(
    row: Omit<MedicalLicense, "id" | "created_at" | "tenant_id">,
  ): Promise<MedicalLicense> {
    const normalized = normalizeUrlField(
      row as unknown as Record<string, unknown>,
      "document_url",
      "La URL del documento",
    );
    return super.insert(
      normalized as unknown as Omit<MedicalLicense, "id" | "created_at" | "tenant_id">,
    );
  }

  async update(
    id: string,
    patch: Partial<Omit<MedicalLicense, "tenant_id">>,
  ): Promise<MedicalLicense> {
    const normalized = normalizeUrlField(
      patch as unknown as Record<string, unknown>,
      "document_url",
      "La URL del documento",
    );
    return super.update(id, normalized as unknown as Partial<Omit<MedicalLicense, "tenant_id">>);
  }
}

export const medicalLicenseRepo = new MedicalLicenseRepository();

// ═══════════════════════════════════════════════════════════════════════
// Comercial & Facturacion
// ═══════════════════════════════════════════════════════════════════════

export class CustomerRepository extends BaseRepository<Customer> {
  protected table = "customers";

  async getAllByName(): Promise<Customer[]> {
    const { data, error } = await supabase.from(this.table).select("*").order("name");
    if (error) throw new Error(error.message);
    return (data ?? []) as Customer[];
  }
}

export class QuoteRepository extends BaseRepository<Quote> {
  protected table = "quotes";
  protected dateColumn = "issue_date";

  async getAllWithItems(): Promise<Quote[]> {
    const { data, error } = await supabase
      .from(this.table)
      .select("*, items:quote_items(*)")
      .order("issue_date", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return (data ?? []) as Quote[];
  }

  async getByIdWithItems(id: string): Promise<Quote | null> {
    const { data, error } = await supabase
      .from(this.table)
      .select("*, items:quote_items(*)")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data as Quote | null;
  }

  /** Next correlative document number, e.g. COT-2026-0007. */
  async nextQuoteNumber(year = new Date().getFullYear()): Promise<string> {
    const total = await this.count();
    return `COT-${year}-${String(total + 1).padStart(4, "0")}`;
  }
}

export class InvoiceRepository extends BaseRepository<Invoice> {
  protected table = "invoices";
  protected dateColumn = "issue_date";

  async getAllWithItems(): Promise<Invoice[]> {
    const { data, error } = await supabase
      .from(this.table)
      .select("*, items:invoice_items(*)")
      .order("issue_date", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return (data ?? []) as Invoice[];
  }

  async getByIdWithItems(id: string): Promise<Invoice | null> {
    const { data, error } = await supabase
      .from(this.table)
      .select("*, items:invoice_items(*)")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data as Invoice | null;
  }

  /** Highest folio currently stored (0 when there are no folios yet). */
  async getMaxFolio(): Promise<number> {
    const { data, error } = await supabase
      .from(this.table)
      .select("folio")
      .not("folio", "is", null)
      .order("folio", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data as { folio: number | null } | null)?.folio ?? 0;
  }

  async nextFolio(): Promise<number> {
    return (await this.getMaxFolio()) + 1;
  }
}

export class PurchaseOrderRepository extends BaseRepository<PurchaseOrder> {
  protected table = "purchase_orders";
  protected dateColumn = "issue_date";

  async getAllWithItems(): Promise<PurchaseOrder[]> {
    const { data, error } = await supabase
      .from(this.table)
      .select("*, items:purchase_order_items(*)")
      .order("issue_date", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return (data ?? []) as PurchaseOrder[];
  }

  /** Next correlative purchase order number, e.g. OC-2026-0007. */
  async nextPoNumber(year = new Date().getFullYear()): Promise<string> {
    const total = await this.count();
    return `OC-${year}-${String(total + 1).padStart(4, "0")}`;
  }
}

export class QuoteItemRepository extends BaseRepository<QuoteItem> {
  protected table = "quote_items";

  async getByQuote(quoteId: string): Promise<QuoteItem[]> {
    const { data, error } = await supabase
      .from(this.table)
      .select("*")
      .eq("quote_id", quoteId)
      .order("line_number");
    if (error) throw new Error(error.message);
    return (data ?? []) as QuoteItem[];
  }
}

export class InvoiceItemRepository extends BaseRepository<InvoiceItem> {
  protected table = "invoice_items";

  async getByInvoice(invoiceId: string): Promise<InvoiceItem[]> {
    const { data, error } = await supabase
      .from(this.table)
      .select("*")
      .eq("invoice_id", invoiceId)
      .order("line_number");
    if (error) throw new Error(error.message);
    return (data ?? []) as InvoiceItem[];
  }
}

export class PurchaseOrderItemRepository extends BaseRepository<PurchaseOrderItem> {
  protected table = "purchase_order_items";

  async getByPurchaseOrder(purchaseOrderId: string): Promise<PurchaseOrderItem[]> {
    const { data, error } = await supabase
      .from(this.table)
      .select("*")
      .eq("purchase_order_id", purchaseOrderId)
      .order("line_number");
    if (error) throw new Error(error.message);
    return (data ?? []) as PurchaseOrderItem[];
  }
}

export const customerRepo = new CustomerRepository();
export const quoteRepo = new QuoteRepository();
export const invoiceRepo = new InvoiceRepository();
export const purchaseOrderRepo = new PurchaseOrderRepository();
export const quoteItemRepo = new QuoteItemRepository();
export const invoiceItemRepo = new InvoiceItemRepository();
export const purchaseOrderItemRepo = new PurchaseOrderItemRepository();

// ═══════════════════════════════════════════════════════════════════════
// Communications & Onboarding — Circulares con acuse de recibo
// ═══════════════════════════════════════════════════════════════════════

export class CircularRepository extends BaseRepository<Circular> {
  protected table = "circulars";

  async getAllWithAcks(): Promise<(Circular & { acks?: CircularAcknowledgment[] })[]> {
    const { data, error } = await supabase
      .from(this.table)
      .select("*, acks:circular_acknowledgments(*)")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return (data ?? []) as (Circular & { acks?: CircularAcknowledgment[] })[];
  }

  async createWithAcks(
    row: Partial<Circular>,
  ): Promise<Circular & { acks?: CircularAcknowledgment[] }> {
    const { data, error } = await supabase
      .from(this.table)
      .insert(row)
      .select("*, acks:circular_acknowledgments(*)")
      .single();
    if (error) throw new Error(error.message);
    return data as Circular & { acks?: CircularAcknowledgment[] };
  }

  async removeById(id: string): Promise<void> {
    const { error } = await supabase.from(this.table).delete().eq("id", id);
    if (error) throw new Error(error.message);
  }
}

export class CircularAcknowledgmentRepository extends BaseRepository<CircularAcknowledgment> {
  protected table = "circular_acknowledgments";

  async getByCircular(circularId: string): Promise<CircularAcknowledgment[]> {
    const { data, error } = await supabase
      .from(this.table)
      .select("*")
      .eq("circular_id", circularId)
      .order("acknowledged_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as CircularAcknowledgment[];
  }

  async ackCircular(circularId: string, workerRut: string): Promise<CircularAcknowledgment> {
    const { data, error } = await supabase
      .from(this.table)
      .upsert(
        { circular_id: circularId, worker_rut: workerRut },
        { onConflict: "circular_id,worker_rut" },
      )
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as CircularAcknowledgment;
  }
}

export const circularRepo = new CircularRepository();
export const circularAckRepo = new CircularAcknowledgmentRepository();

// ═══════════════════════════════════════════════════════════════════════
// Finanzas Extendidas — Anticipos, Préstamos, Descuentos, Cartola
// ═══════════════════════════════════════════════════════════════════════

export class SalaryAdvanceRepository extends BaseRepository<SalaryAdvance> {
  protected table = "salary_advances";

  async getByWorker(rut: string): Promise<SalaryAdvance[]> {
    const { data, error } = await supabase
      .from(this.table)
      .select("*")
      .eq("worker_rut", rut)
      .order("request_date", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as SalaryAdvance[];
  }
}

export class InternalLoanRepository extends BaseRepository<InternalLoan> {
  protected table = "internal_loans";

  async getByWorker(rut: string): Promise<InternalLoan[]> {
    const { data, error } = await supabase
      .from(this.table)
      .select("*")
      .eq("worker_rut", rut)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as InternalLoan[];
  }
}

export class WorkerDiscountRepository extends BaseRepository<WorkerDiscount> {
  protected table = "worker_discounts";

  async getByWorker(rut: string): Promise<WorkerDiscount[]> {
    const { data, error } = await supabase
      .from(this.table)
      .select("*")
      .eq("worker_rut", rut)
      .order("discount_date", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as WorkerDiscount[];
  }
}

export class WorkerPaymentStatementRepository extends BaseRepository<WorkerPaymentStatement> {
  protected table = "worker_payment_statements";

  async getByWorker(rut: string): Promise<WorkerPaymentStatement[]> {
    const { data, error } = await supabase
      .from(this.table)
      .select("*")
      .eq("worker_rut", rut)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as WorkerPaymentStatement[];
  }
}

export const salaryAdvanceRepo = new SalaryAdvanceRepository();
export const internalLoanRepo = new InternalLoanRepository();
export const workerDiscountRepo = new WorkerDiscountRepository();
export const workerPaymentStatementRepo = new WorkerPaymentStatementRepository();

// ═══════════════════════════════════════════════════════════════════════
// Ley Karin — Denuncias de acoso
// ═══════════════════════════════════════════════════════════════════════

export class HarassmentReportRepository extends BaseRepository<HarassmentReport> {
  protected table = "harassment_reports";

  async getAll(): Promise<HarassmentReport[]> {
    const { data, error } = await supabase
      .from(this.table)
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as HarassmentReport[];
  }

  async updateInvestigation(
    id: string,
    patch: {
      status: HarassmentReport["status"];
      investigation_notes: string | null;
      result_notification: string | null;
    },
  ): Promise<void> {
    const { error } = await supabase.from(this.table).update(patch).eq("id", id);
    if (error) throw new Error(error.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Ley 21.663 — Brechas de seguridad
// ═══════════════════════════════════════════════════════════════════════

export class SecurityBreachRepository extends BaseRepository<SecurityBreachReport> {
  protected table = "security_breach_reports";

  async getAll(): Promise<SecurityBreachReport[]> {
    const { data, error } = await supabase
      .from(this.table)
      .select("*")
      .order("breach_detected_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as SecurityBreachReport[];
  }

  async patch(id: string, updates: Partial<SecurityBreachReport>): Promise<void> {
    const { error } = await supabase.from(this.table).update(updates).eq("id", id);
    if (error) throw new Error(error.message);
  }

  async setStatus(id: string, status: SecurityBreachReport["status"]): Promise<void> {
    await this.patch(id, { status });
  }

  async create(row: Partial<SecurityBreachReport>): Promise<void> {
    const { error } = await supabase.from(this.table).insert(row);
    if (error) throw new Error(error.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Cuentas bancarias de trabajadores
// ═══════════════════════════════════════════════════════════════════════

export class WorkerBankAccountRepository extends BaseRepository<WorkerBankAccount> {
  protected table = "worker_bank_accounts";

  async getActiveByWorker(rut: string): Promise<WorkerBankAccount | null> {
    const { data, error } = await supabase
      .from(this.table)
      .select("*")
      .eq("worker_rut", rut)
      .eq("is_active", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data ?? null) as WorkerBankAccount | null;
  }

  async getByWorker(rut: string): Promise<WorkerBankAccount | null> {
    const { data, error } = await supabase
      .from(this.table)
      .select("*")
      .eq("worker_rut", rut)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data ?? null) as WorkerBankAccount | null;
  }

  async upsertForWorker(
    row: Partial<WorkerBankAccount> & { worker_rut: string; account_number: string },
  ): Promise<WorkerBankAccount> {
    const { data, error } = await supabase
      .from(this.table)
      .upsert(row, { onConflict: "worker_rut,account_number" })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as WorkerBankAccount;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Control de acceso — correos autorizados
// ═══════════════════════════════════════════════════════════════════════

export class AllowedEmailRepository extends BaseRepository<AllowedEmail> {
  protected table = "allowed_emails";

  async getAll(): Promise<AllowedEmail[]> {
    const tenantId = await this.resolveTenant();
    const { data, error } = await supabase
      .from(this.table)
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as AllowedEmail[];
  }

  async setActive(id: string, active: boolean): Promise<void> {
    const tenantId = await this.resolveTenant();
    const { error } = await supabase
      .from(this.table)
      .update({ active })
      .eq("tenant_id", tenantId)
      .eq("id", id);
    if (error) throw new Error(error.message);
  }

  async setRoleAndPermissions(
    id: string,
    role: string,
    permissions: Record<string, boolean>,
  ): Promise<void> {
    const tenantId = await this.resolveTenant();
    const { error } = await supabase
      .from(this.table)
      .update({ role, permissions })
      .eq("tenant_id", tenantId)
      .eq("id", id);
    if (error) throw new Error(error.message);
  }

  async removeById(id: string): Promise<void> {
    const tenantId = await this.resolveTenant();
    const { error } = await supabase
      .from(this.table)
      .delete()
      .eq("tenant_id", tenantId)
      .eq("id", id);
    if (error) throw new Error(error.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Respaldos
// ═══════════════════════════════════════════════════════════════════════

export class BackupConfigRepository extends BaseRepository<BackupConfig> {
  protected table = "backup_config";

  async getCurrent(): Promise<BackupConfig | null> {
    const { data, error } = await supabase.from(this.table).select("*").limit(1).maybeSingle();
    if (error) throw new Error(error.message);
    return (data ?? null) as BackupConfig | null;
  }

  async create(patch: Partial<BackupConfig>): Promise<BackupConfig> {
    const { data, error } = await supabase.from(this.table).insert(patch).select().single();
    if (error) throw new Error(error.message);
    return data as BackupConfig;
  }

  async patch(id: string, updates: Partial<BackupConfig>): Promise<void> {
    const { error } = await supabase
      .from(this.table)
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new Error(error.message);
  }
}

export class BackupHistoryRepository extends BaseRepository<BackupHistory> {
  protected table = "backup_history";

  async getRecent(limit = 10): Promise<BackupHistory[]> {
    const { data, error } = await supabase
      .from(this.table)
      .select("*")
      .order("backup_date", { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return (data ?? []) as BackupHistory[];
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Proveedores y entregas de EPP
// ═══════════════════════════════════════════════════════════════════════

export class SupplierRepository extends BaseRepository<Supplier> {
  protected table = "suppliers";

  async getAllByName(): Promise<Supplier[]> {
    const { data, error } = await supabase.from(this.table).select("*").order("name");
    if (error) throw new Error(error.message);
    return (data ?? []) as Supplier[];
  }

  async getLite(): Promise<{ id: string; name: string }[]> {
    const { data, error } = await supabase.from(this.table).select("id, name").order("name");
    if (error) throw new Error(error.message);
    return (data ?? []) as { id: string; name: string }[];
  }
}

export class EppDeliveryRepository extends BaseRepository<EppDelivery> {
  protected table = "epp_deliveries";
  protected dateColumn = "delivery_date";

  async getRecent(limit = 200): Promise<EppDelivery[]> {
    const { data, error } = await supabase
      .from(this.table)
      .select("*")
      .order("delivery_date", { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return (data ?? []) as EppDelivery[];
  }

  async getWorkerRuts(limit = 5000): Promise<string[]> {
    const { data, error } = await supabase.from(this.table).select("worker_rut").limit(limit);
    if (error) throw new Error(error.message);
    return ((data ?? []) as { worker_rut: string }[]).map((r) => r.worker_rut);
  }
}

export const harassmentReportRepo = new HarassmentReportRepository();
export const securityBreachRepo = new SecurityBreachRepository();
export const workerBankAccountRepo = new WorkerBankAccountRepository();
export const allowedEmailRepo = new AllowedEmailRepository();
export const backupConfigRepo = new BackupConfigRepository();
export const backupHistoryRepo = new BackupHistoryRepository();
export const supplierRepo = new SupplierRepository();
export const eppDeliveryRepo = new EppDeliveryRepository();

// ═══════════════════════════════════════════════════════════════════════
// Storage — fotos de trabajadores
// ═══════════════════════════════════════════════════════════════════════

export class WorkerPhotoStorage {
  private bucket = "worker-photos";

  async getSignedUrl(path: string, expiresIn = 3600): Promise<string | null> {
    const { data, error } = await supabase.storage
      .from(this.bucket)
      .createSignedUrl(path, expiresIn);
    if (error) return null;
    return data?.signedUrl ?? null;
  }

  async upload(path: string, file: File): Promise<void> {
    const { error } = await supabase.storage
      .from(this.bucket)
      .upload(path, file, { cacheControl: "3600", contentType: file.type, upsert: true });
    if (error) throw new Error(error.message);
  }
}

export const workerPhotoStorage = new WorkerPhotoStorage();

// ═══════════════════════════════════════════════════════════════════════
// Helpers de lectura usados por vistas
// ═══════════════════════════════════════════════════════════════════════

export type WorkerLite = { rut: string; full_name: string; department_id: string | null };

export async function getActiveWorkersLite(): Promise<WorkerLite[]> {
  const { data, error } = await supabase
    .from("workers")
    .select("rut, full_name, department_id")
    .eq("status", "ACTIVO");
  if (error) throw new Error(error.message);
  return (data ?? []) as WorkerLite[];
}

export async function getDepartmentsByName(): Promise<Department[]> {
  const { data, error } = await supabase.from("departments").select("*").order("name");
  if (error) throw new Error(error.message);
  return (data ?? []) as Department[];
}

export async function getConfigValues(keys: string[]): Promise<Record<string, string>> {
  const { data, error } = await supabase.from("system_config").select("key, value").in("key", keys);
  if (error) throw new Error(error.message);
  const out: Record<string, string> = {};
  for (const row of (data ?? []) as { key: string; value: string }[]) out[row.key] = row.value;
  return out;
}

// ═══════════════════════════════════════════════════════════════════════
// Sesión — acceso al usuario autenticado sin exponer el cliente Supabase
// ═══════════════════════════════════════════════════════════════════════

/** Email del usuario autenticado, o null si no hay sesión. */
export async function getCurrentUserEmail(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data?.user?.email ?? null;
}

/** Id del usuario autenticado, o null si no hay sesión. */
export async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data?.user?.id ?? null;
}
