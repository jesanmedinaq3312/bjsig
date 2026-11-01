import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import {
  workerRepo,
  eppRepo,
  incidentRepo,
  trainingRepo,
  shiftRepo,
  astRepo,
  cphsRepo,
  isoAuditRepo,
  hhcRepo,
  cloudDocRepo,
  qrScanRepo,
  shiftDefRepo,
  trainingAttRepo,
  payrollPeriodRepo,
  payrollItemRepo,
  objectiveRepo,
  evaluationRepo,
  feedbackRepo,
  workerDocRepo,
  workerRequestRepo,
  shiftAssignmentRepo,
  shiftChangeLogRepo,
  vacationRequestRepo,
  vacationBalanceRepo,
  finiquitoRepo,
  securityTalkRepo,
  iperEntryRepo,
  departmentRepo,
  correctionRequestRepo,
  securityAlertRepo,
  activityLogRepo,
  medicalLicenseRepo,
} from "@/lib/repositories";
import { subscribeRealtime } from "@/lib/realtime";
import { supabase } from "@/lib/supabase";

// Stable data (rarely changes): ISO audits, IPER matrix, compliance docs, security talks
const STALE_STABLE = 5 * 60_000; // 5 minutes
// Semi-stable data (changes weekly): trainings, payroll periods, evaluations, objectives
const STALE_SEMI = 2 * 60_000; // 2 minutes
// Dynamic data (changes frequently): shifts, incidents, QR scans, worker requests
const STALE_DYNAMIC = 30_000; // 30 seconds
// Default
const STALE_TIME = 60_000;

function tenantQueryKey(
  tenantId: string | null,
  key: string,
  ...parts: unknown[]
): readonly string[] {
  return ["tenant", tenantId ?? "none", key, ...parts.map(String)];
}

// ─── Individual query hooks (lazy: only fire when mounted & enabled) ────

export function useWorkers(enabled: boolean, tenantId: string | null = null) {
  return useQuery({
    queryKey: tenantQueryKey(tenantId, "workers"),
    queryFn: async () => {
      if (!tenantId) return [];
      const isUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(tenantId);
      const resolvedTenantId = isUuid
        ? tenantId
        : (await supabase.from("tenants").select("id").eq("slug", tenantId).maybeSingle()).data?.id;
      if (!resolvedTenantId) return [];
      const { data, error } = await supabase
        .from("workers")
        .select("*")
        .eq("tenant_id", resolvedTenantId)
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    staleTime: STALE_TIME,
    enabled,
  });
}
export function useEppLogs(enabled: boolean, tenantId: string | null = null) {
  return useQuery({
    queryKey: tenantQueryKey(tenantId, "eppLogs"),
    queryFn: () => eppRepo.getAll(),
    staleTime: STALE_TIME,
    enabled,
  });
}
export function useIncidents(enabled: boolean, tenantId: string | null = null) {
  return useQuery({
    queryKey: tenantQueryKey(tenantId, "incidents"),
    queryFn: () => incidentRepo.getAll(),
    staleTime: STALE_DYNAMIC,
    enabled,
  });
}
export function useTrainings(enabled: boolean, tenantId: string | null = null) {
  return useQuery({
    queryKey: tenantQueryKey(tenantId, "trainings"),
    queryFn: () => trainingRepo.getAll(),
    staleTime: STALE_SEMI,
    enabled,
  });
}
export function useShifts(enabled: boolean, tenantId: string | null = null) {
  return useQuery({
    queryKey: tenantQueryKey(tenantId, "shifts"),
    queryFn: () => shiftRepo.getAll(),
    staleTime: STALE_DYNAMIC,
    enabled,
  });
}
export function useAstLogs(enabled: boolean, tenantId: string | null = null) {
  return useQuery({
    queryKey: tenantQueryKey(tenantId, "astLogs"),
    queryFn: () => astRepo.getAll(),
    staleTime: STALE_TIME,
    enabled,
  });
}
export function useCphsMeetings(enabled: boolean, tenantId: string | null = null) {
  return useQuery({
    queryKey: tenantQueryKey(tenantId, "cphsMeetings"),
    queryFn: () => cphsRepo.getAll(),
    staleTime: STALE_TIME,
    enabled,
  });
}
export function useIsoAudits(enabled: boolean, tenantId: string | null = null) {
  return useQuery({
    queryKey: tenantQueryKey(tenantId, "isoAudits"),
    queryFn: () => isoAuditRepo.getAll(),
    staleTime: STALE_STABLE,
    enabled,
  });
}
export function useHhcPlans(enabled: boolean, tenantId: string | null = null) {
  return useQuery({
    queryKey: tenantQueryKey(tenantId, "hhcPlans"),
    queryFn: () => hhcRepo.getAll(),
    staleTime: STALE_TIME,
    enabled,
  });
}
export function useCloudDocs(enabled: boolean, tenantId: string | null = null) {
  return useQuery({
    queryKey: tenantQueryKey(tenantId, "cloudDocs"),
    queryFn: () => cloudDocRepo.getAll(),
    staleTime: STALE_TIME,
    enabled,
  });
}
export function useQrScans(enabled: boolean, tenantId: string | null = null) {
  return useQuery({
    queryKey: tenantQueryKey(tenantId, "qrScans"),
    queryFn: () => qrScanRepo.getAll(),
    staleTime: STALE_DYNAMIC,
    enabled,
  });
}
export function useShiftDefs(enabled: boolean, tenantId: string | null = null) {
  return useQuery({
    queryKey: tenantQueryKey(tenantId, "shiftDefs"),
    queryFn: () => shiftDefRepo.getAll(),
    staleTime: STALE_TIME,
    enabled,
  });
}
export function useTrainingAttendance(enabled: boolean, tenantId: string | null = null) {
  return useQuery({
    queryKey: tenantQueryKey(tenantId, "trainingAttendance"),
    queryFn: () => trainingAttRepo.getAll(),
    staleTime: STALE_SEMI,
    enabled,
  });
}
export function usePayrollPeriods(enabled: boolean, tenantId: string | null = null) {
  return useQuery({
    queryKey: tenantQueryKey(tenantId, "payrollPeriods"),
    queryFn: () => payrollPeriodRepo.getAll(),
    staleTime: STALE_SEMI,
    enabled,
  });
}
export function usePayrollItems(enabled: boolean, tenantId: string | null = null) {
  return useQuery({
    queryKey: tenantQueryKey(tenantId, "payrollItems"),
    queryFn: () => payrollItemRepo.getAll(),
    staleTime: STALE_SEMI,
    enabled,
  });
}
export function useObjectives(enabled: boolean, tenantId: string | null = null) {
  return useQuery({
    queryKey: tenantQueryKey(tenantId, "objectives"),
    queryFn: () => objectiveRepo.getAll(),
    staleTime: STALE_SEMI,
    enabled,
  });
}
export function useEvaluations(enabled: boolean, tenantId: string | null = null) {
  return useQuery({
    queryKey: tenantQueryKey(tenantId, "evaluations"),
    queryFn: () => evaluationRepo.getAll(),
    staleTime: STALE_SEMI,
    enabled,
  });
}
export function useFeedback(enabled: boolean, tenantId: string | null = null) {
  return useQuery({
    queryKey: tenantQueryKey(tenantId, "feedback"),
    queryFn: () => feedbackRepo.getAll(),
    staleTime: STALE_SEMI,
    enabled,
  });
}
export function useWorkerDocs(enabled: boolean, tenantId: string | null = null) {
  return useQuery({
    queryKey: tenantQueryKey(tenantId, "workerDocs"),
    queryFn: () => workerDocRepo.getAll(),
    staleTime: STALE_TIME,
    enabled,
  });
}
export function useWorkerRequests(enabled: boolean, tenantId: string | null = null) {
  return useQuery({
    queryKey: tenantQueryKey(tenantId, "workerRequests"),
    queryFn: () => workerRequestRepo.getAll(),
    staleTime: STALE_DYNAMIC,
    enabled,
  });
}
export function useShiftAssignments(enabled: boolean, tenantId: string | null = null) {
  return useQuery({
    queryKey: tenantQueryKey(tenantId, "shiftAssignments"),
    queryFn: () => shiftAssignmentRepo.getAll(),
    staleTime: STALE_DYNAMIC,
    enabled,
  });
}
export function useShiftChangeLogs(enabled: boolean, tenantId: string | null = null) {
  return useQuery({
    queryKey: tenantQueryKey(tenantId, "shiftChangeLogs"),
    queryFn: () => shiftChangeLogRepo.getAll(),
    staleTime: STALE_DYNAMIC,
    enabled,
  });
}
export function useVacationRequests(enabled: boolean, tenantId: string | null = null) {
  return useQuery({
    queryKey: tenantQueryKey(tenantId, "vacationRequests"),
    queryFn: () => vacationRequestRepo.getAll(),
    staleTime: STALE_DYNAMIC,
    enabled,
  });
}
export function useVacationBalances(enabled: boolean, tenantId: string | null = null) {
  return useQuery({
    queryKey: tenantQueryKey(tenantId, "vacationBalances"),
    queryFn: () => vacationBalanceRepo.getAll(),
    staleTime: STALE_SEMI,
    enabled,
  });
}
export function useFiniquitos(enabled: boolean, tenantId: string | null = null) {
  return useQuery({
    queryKey: tenantQueryKey(tenantId, "finiquitos"),
    queryFn: () => finiquitoRepo.getAll(),
    staleTime: STALE_SEMI,
    enabled,
  });
}
export function useSecurityTalks(enabled: boolean, tenantId: string | null = null) {
  return useQuery({
    queryKey: tenantQueryKey(tenantId, "securityTalks"),
    queryFn: () => securityTalkRepo.getAll(),
    staleTime: STALE_STABLE,
    enabled,
  });
}
export function useIperEntries(enabled: boolean, tenantId: string | null = null) {
  return useQuery({
    queryKey: tenantQueryKey(tenantId, "iperEntries"),
    queryFn: () => iperEntryRepo.getAll(),
    staleTime: STALE_STABLE,
    enabled,
  });
}
export function useDepartments(enabled: boolean, tenantId: string | null = null) {
  return useQuery({
    queryKey: tenantQueryKey(tenantId, "departments"),
    queryFn: () => departmentRepo.getAll(),
    staleTime: STALE_STABLE,
    enabled,
  });
}
export function useCorrectionRequests(enabled: boolean, tenantId: string | null = null) {
  return useQuery({
    queryKey: tenantQueryKey(tenantId, "correctionRequests"),
    queryFn: () => correctionRequestRepo.getAll(),
    staleTime: STALE_TIME,
    enabled,
  });
}
export function useSecurityAlerts(enabled: boolean, tenantId: string | null = null) {
  return useQuery({
    queryKey: tenantQueryKey(tenantId, "securityAlerts"),
    queryFn: () => securityAlertRepo.getUnacknowledged(),
    staleTime: STALE_DYNAMIC,
    enabled,
  });
}

export function useMedicalLicenses(enabled: boolean, tenantId: string | null = null) {
  return useQuery({
    queryKey: tenantQueryKey(tenantId, "medicalLicenses"),
    queryFn: () => medicalLicenseRepo.getAll(),
    staleTime: STALE_DYNAMIC,
    enabled,
  });
}

// ─── Paginated / date-filtered hooks for high-volume tables ─────────────

export function useShiftsPaginated(
  page: number,
  pageSize: number,
  startDate?: string,
  endDate?: string,
  tenantId: string | null = null,
) {
  return useQuery({
    queryKey: tenantQueryKey(
      tenantId,
      "shifts",
      "paginated",
      page,
      pageSize,
      startDate ?? "",
      endDate ?? "",
    ),
    queryFn: () => shiftRepo.getPaginatedWithDateRange(page, pageSize, "date", startDate, endDate),
    staleTime: STALE_DYNAMIC,
  });
}

export function useQrScansPaginated(
  page: number,
  pageSize: number,
  startDate?: string,
  endDate?: string,
  tenantId: string | null = null,
) {
  return useQuery({
    queryKey: tenantQueryKey(
      tenantId,
      "qrScans",
      "paginated",
      page,
      pageSize,
      startDate ?? "",
      endDate ?? "",
    ),
    queryFn: () =>
      qrScanRepo.getPaginatedWithDateRange(page, pageSize, "scan_date", startDate, endDate),
    staleTime: STALE_DYNAMIC,
  });
}

export function useEppLogsPaginated(
  page: number,
  pageSize: number,
  startDate?: string,
  endDate?: string,
  tenantId: string | null = null,
) {
  return useQuery({
    queryKey: tenantQueryKey(
      tenantId,
      "eppLogs",
      "paginated",
      page,
      pageSize,
      startDate ?? "",
      endDate ?? "",
    ),
    queryFn: () =>
      eppRepo.getPaginatedWithDateRange(page, pageSize, "delivery_date", startDate, endDate),
    staleTime: STALE_TIME,
  });
}

export function usePayrollItemsPaginated(
  page: number,
  pageSize: number,
  startDate?: string,
  endDate?: string,
  tenantId: string | null = null,
) {
  return useQuery({
    queryKey: tenantQueryKey(
      tenantId,
      "payrollItems",
      "paginated",
      page,
      pageSize,
      startDate ?? "",
      endDate ?? "",
    ),
    queryFn: () =>
      payrollItemRepo.getPaginatedWithDateRange(page, pageSize, "created_at", startDate, endDate),
    staleTime: STALE_SEMI,
  });
}

export function useActivityLogsPaginated(
  page: number,
  pageSize: number,
  startDate?: string,
  endDate?: string,
  tenantId: string | null = null,
) {
  return useQuery({
    queryKey: tenantQueryKey(
      tenantId,
      "activityLogs",
      "paginated",
      page,
      pageSize,
      startDate ?? "",
      endDate ?? "",
    ),
    queryFn: () =>
      activityLogRepo.getPaginatedWithDateRange(page, pageSize, "created_at", startDate, endDate),
    staleTime: STALE_TIME,
  });
}

export function usePayrollItemsByPeriod(periodId: string | null, tenantId: string | null = null) {
  return useQuery({
    queryKey: tenantQueryKey(tenantId, "payrollItems", "period", periodId),
    queryFn: () => payrollItemRepo.getByPeriod(periodId!),
    enabled: !!periodId,
    staleTime: STALE_SEMI,
  });
}

export function usePayrollStats(tenantId: string | null = null) {
  return useQuery({
    queryKey: tenantQueryKey(tenantId, "payrollStats"),
    queryFn: async () => {
      const { supabase } = await import("@/lib/supabase");
      const { data, error } = await supabase.rpc("compute_payroll_stats").maybeSingle();
      if (error) throw new Error(error.message);
      return data as {
        total_payroll: number;
        workers_count: number;
        items_count: number;
        periods_count: number;
      } | null;
    },
    staleTime: STALE_SEMI,
  });
}

// ─── Realtime per-table subscription (only for tables currently in view) ─

const TABLE_BY_KEY: Record<string, string> = {
  workers: "workers",
  eppLogs: "epp_logs",
  incidents: "incidents_ds44",
  trainings: "trainings_ds44",
  shifts: "daily_shifts",
  astLogs: "ast_logs",
  cphsMeetings: "cphs_meetings",
  isoAudits: "iso_audits",
  hhcPlans: "hhc_plan",
  cloudDocs: "cloud_documents",
  qrScans: "qr_scan_events",
  shiftDefs: "shift_definitions",
  trainingAttendance: "training_attendance",
  payrollPeriods: "payroll_periods",
  payrollItems: "payroll_items",
  objectives: "performance_objectives",
  evaluations: "performance_evaluations",
  feedback: "performance_feedback",
  workerDocs: "worker_documents",
  workerRequests: "worker_requests",
  shiftAssignments: "shift_assignments",
  shiftChangeLogs: "shift_change_logs",
  vacationRequests: "vacation_requests",
  vacationBalances: "vacation_balances",
  finiquitos: "finiquito_records",
  securityTalks: "security_talks",
  iperEntries: "iper_entries",
  departments: "departments",
  correctionRequests: "correction_requests",
  securityAlerts: "security_alerts",
  medicalLicenses: "medical_licenses",
  customers: "customers",
  quotes: "quotes",
  invoices: "invoices",
  purchaseOrders: "purchase_orders",
};

export function useRealtimeForKeys(queryKeys: string[], enabled: boolean, tenantId: string | null) {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!enabled || !tenantId) return;
    const bindings = queryKeys
      .filter((k) => TABLE_BY_KEY[k])
      .map((k) => ({
        queryKey: tenantQueryKey(tenantId, k),
        table: TABLE_BY_KEY[k],
        tenantId: tenantId as string,
      }));
    if (bindings.length === 0) return;
    return subscribeRealtime(queryClient, bindings);
  }, [queryClient, queryKeys.join(","), enabled, tenantId]); // eslint-disable-line react-hooks/exhaustive-deps -- reviewed dependency set; unstable callback recreation is intentional to avoid loops
}
