import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { logger } from "@/lib/logger";
import {
  useWorkers,
  useEppLogs,
  useIncidents,
  useTrainings,
  useShifts,
  useAstLogs,
  useCphsMeetings,
  useIsoAudits,
  useHhcPlans,
  useCloudDocs,
  useQrScans,
  useShiftDefs,
  useTrainingAttendance,
  usePayrollPeriods,
  usePayrollItems,
  useObjectives,
  useEvaluations,
  useFeedback,
  useWorkerDocs,
  useWorkerRequests,
  useShiftAssignments,
  useShiftChangeLogs,
  useVacationRequests,
  useVacationBalances,
  useFiniquitos,
  useSecurityTalks,
  useIperEntries,
  useDepartments,
  useCorrectionRequests,
  useSecurityAlerts,
  useMedicalLicenses,
  useRealtimeForKeys,
} from "@/hooks/useModuleData";
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
  ShiftDefinition,
  Honeytoken,
  TrainingAttendance,
  PayrollPeriod,
  PayrollItem,
  PerformanceObjective,
  PerformanceEvaluation,
  PerformanceFeedback,
  WorkerDocument,
  WorkerRequest,
  ShiftAssignment,
  ShiftChangeLog,
  VacationRequest,
  VacationBalance,
  FiniquitoRecord,
  SecurityTalk,
  IperEntry,
  Department,
  CorrectionRequest,
  SecurityAlert,
  MedicalLicense,
} from "@/lib/types";
import type { ViewKey } from "@/components/Layout";

export interface AppData {
  workers: Worker[];
  eppLogs: EppLog[];
  incidents: Incident[];
  trainings: Training[];
  shifts: DailyShift[];
  astLogs: AstLog[];
  cphsMeetings: CphsMeeting[];
  isoAudits: IsoAudit[];
  hhcPlans: HhcPlan[];
  cloudDocs: CloudDocument[];
  qrScans: QrScanEvent[];
  shiftDefs: ShiftDefinition[];
  honeytokens: Honeytoken[];
  trainingAttendance: TrainingAttendance[];
  payrollPeriods: PayrollPeriod[];
  payrollItems: PayrollItem[];
  objectives: PerformanceObjective[];
  evaluations: PerformanceEvaluation[];
  feedback: PerformanceFeedback[];
  workerDocs: WorkerDocument[];
  workerRequests: WorkerRequest[];
  shiftAssignments: ShiftAssignment[];
  shiftChangeLogs: ShiftChangeLog[];
  vacationRequests: VacationRequest[];
  vacationBalances: VacationBalance[];
  finiquitos: FiniquitoRecord[];
  securityTalks: SecurityTalk[];
  iperEntries: IperEntry[];
  departments: Department[];
  correctionRequests: CorrectionRequest[];
  securityAlerts: SecurityAlert[];
  medicalLicenses: MedicalLicense[];
  loading: boolean;
  reloading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

// Map each view to the set of query keys it actually needs.
const VIEW_KEYS: Record<string, string[]> = {
  dashboard: [
    "workers",
    "incidents",
    "trainings",
    "shifts",
    "isoAudits",
    "eppLogs",
    "astLogs",
    "cphsMeetings",
    "qrScans",
    "cloudDocs",
    "medicalLicenses",
  ],
  calendar: [
    "workers",
    "shifts",
    "eppLogs",
    "incidents",
    "astLogs",
    "trainings",
    "isoAudits",
    "qrScans",
    "shiftDefs",
  ],
  workers: ["workers", "cloudDocs", "qrScans", "shifts", "shiftDefs", "departments"],
  terrain: ["shifts", "workers", "eppLogs", "astLogs"],
  eppwarehouse: ["workers", "eppLogs"],
  incidents: ["incidents", "workers"],
  docs: ["workers"],
  clouddocs: ["cloudDocs", "workers"],
  trainings: ["trainings", "workers", "hhcPlans", "trainingAttendance"],
  shifts: ["shiftDefs", "shiftAssignments", "shiftChangeLogs", "workers"],
  vacations: ["workers", "vacationRequests", "vacationBalances"],
  finiquitos: ["workers", "finiquitos"],
  securitytalks: ["workers", "securityTalks"],
  ipermatrix: ["iperEntries"],
  payroll: ["workers", "payrollPeriods", "payrollItems", "shifts"],
  performance: ["workers", "objectives", "evaluations", "feedback", "workerDocs", "workerRequests"],
  indicators: [
    "incidents",
    "shifts",
    "workers",
    "eppLogs",
    "cphsMeetings",
    "hhcPlans",
    "trainings",
    "astLogs",
  ],
  iso: ["isoAudits"],
  settings: [
    "workers",
    "eppLogs",
    "incidents",
    "trainings",
    "shifts",
    "astLogs",
    "cphsMeetings",
    "isoAudits",
    "hhcPlans",
    "cloudDocs",
    "departments",
    "securityAlerts",
  ],
  logs: [],
  compliancedocs: [],
  departments: ["workers", "departments"],
  organigrama: ["workers", "departments"],
  gdpr: ["workers", "correctionRequests", "securityAlerts"],
  medicallicenses: ["workers", "medicalLicenses"],
};

export function useAppData(
  view: ViewKey,
  sessionReady: boolean,
  tenantScope: string | null = null,
): AppData {
  const queryClient = useQueryClient();
  const [reloading, setReloading] = useState(false);

  const activeKeys = useMemo(() => VIEW_KEYS[view] ?? [], [view]);
  const keySet = useMemo(() => new Set(activeKeys), [activeKeys]);

  // Invalidate the whole cache once, right when a session becomes ready
  // (fresh login) — so a different user logging in on the same tab never
  // sees a previous session's cached rows. This must NOT re-run on every
  // view change: each query already has its own staleTime (30s for
  // dynamic data, up to 5min for stable data) and its `enabled` flag
  // already makes React Query fetch automatically the first time a view
  // needs a key it doesn't have fresh data for. Force-invalidating per
  // view (the old behavior) discarded that cache on every navigation and
  // was the main cause of the app feeling slow when moving between menus.
  const wasSessionReady = useRef(false);
  useEffect(() => {
    if (sessionReady && !wasSessionReady.current) {
      queryClient.invalidateQueries();
    }
    wasSessionReady.current = sessionReady;
  }, [sessionReady, queryClient]);

  // Each query key is shared by the modules, so tenant changes must evict the
  // previous tenant's rows before React Query can render the next company.
  const previousTenantId = useRef<string | null>(tenantScope);
  useEffect(() => {
    if (previousTenantId.current === tenantScope) return;
    previousTenantId.current = tenantScope;
    queryClient.removeQueries();
  }, [tenantScope, queryClient]);

  const workers = useWorkers(sessionReady && !!tenantScope && keySet.has("workers"), tenantScope);
  const eppLogs = useEppLogs(sessionReady && !!tenantScope && keySet.has("eppLogs"), tenantScope);
  const incidents = useIncidents(
    sessionReady && !!tenantScope && keySet.has("incidents"),
    tenantScope,
  );
  const trainings = useTrainings(
    sessionReady && !!tenantScope && keySet.has("trainings"),
    tenantScope,
  );
  const shifts = useShifts(sessionReady && !!tenantScope && keySet.has("shifts"), tenantScope);
  const astLogs = useAstLogs(sessionReady && !!tenantScope && keySet.has("astLogs"), tenantScope);
  const cphsMeetings = useCphsMeetings(
    sessionReady && !!tenantScope && keySet.has("cphsMeetings"),
    tenantScope,
  );
  const isoAudits = useIsoAudits(
    sessionReady && !!tenantScope && keySet.has("isoAudits"),
    tenantScope,
  );
  const hhcPlans = useHhcPlans(
    sessionReady && !!tenantScope && keySet.has("hhcPlans"),
    tenantScope,
  );
  const cloudDocs = useCloudDocs(
    sessionReady && !!tenantScope && keySet.has("cloudDocs"),
    tenantScope,
  );
  const qrScans = useQrScans(sessionReady && !!tenantScope && keySet.has("qrScans"), tenantScope);
  const shiftDefs = useShiftDefs(
    sessionReady && !!tenantScope && keySet.has("shiftDefs"),
    tenantScope,
  );
  const trainingAttendance = useTrainingAttendance(
    sessionReady && !!tenantScope && keySet.has("trainingAttendance"),
    tenantScope,
  );
  const payrollPeriods = usePayrollPeriods(
    sessionReady && !!tenantScope && keySet.has("payrollPeriods"),
    tenantScope,
  );
  const payrollItems = usePayrollItems(
    sessionReady && !!tenantScope && keySet.has("payrollItems"),
    tenantScope,
  );
  const objectives = useObjectives(
    sessionReady && !!tenantScope && keySet.has("objectives"),
    tenantScope,
  );
  const evaluations = useEvaluations(
    sessionReady && !!tenantScope && keySet.has("evaluations"),
    tenantScope,
  );
  const feedback = useFeedback(
    sessionReady && !!tenantScope && keySet.has("feedback"),
    tenantScope,
  );
  const workerDocs = useWorkerDocs(
    sessionReady && !!tenantScope && keySet.has("workerDocs"),
    tenantScope,
  );
  const workerRequests = useWorkerRequests(
    sessionReady && !!tenantScope && keySet.has("workerRequests"),
    tenantScope,
  );
  const shiftAssignments = useShiftAssignments(
    sessionReady && !!tenantScope && keySet.has("shiftAssignments"),
    tenantScope,
  );
  const shiftChangeLogs = useShiftChangeLogs(
    sessionReady && !!tenantScope && keySet.has("shiftChangeLogs"),
    tenantScope,
  );
  const vacationRequests = useVacationRequests(
    sessionReady && !!tenantScope && keySet.has("vacationRequests"),
    tenantScope,
  );
  const vacationBalances = useVacationBalances(
    sessionReady && !!tenantScope && keySet.has("vacationBalances"),
    tenantScope,
  );
  const finiquitos = useFiniquitos(
    sessionReady && !!tenantScope && keySet.has("finiquitos"),
    tenantScope,
  );
  const securityTalks = useSecurityTalks(
    sessionReady && !!tenantScope && keySet.has("securityTalks"),
    tenantScope,
  );
  const iperEntries = useIperEntries(
    sessionReady && !!tenantScope && keySet.has("iperEntries"),
    tenantScope,
  );
  const departments = useDepartments(
    sessionReady && !!tenantScope && keySet.has("departments"),
    tenantScope,
  );
  const correctionRequests = useCorrectionRequests(
    sessionReady && !!tenantScope && keySet.has("correctionRequests"),
    tenantScope,
  );
  const securityAlerts = useSecurityAlerts(
    sessionReady && !!tenantScope && keySet.has("securityAlerts"),
    tenantScope,
  );
  const medicalLicenses = useMedicalLicenses(
    sessionReady && !!tenantScope && keySet.has("medicalLicenses"),
    tenantScope,
  );

  useRealtimeForKeys(activeKeys, sessionReady && !!tenantScope, tenantScope);

  const queries = {
    workers,
    eppLogs,
    incidents,
    trainings,
    shifts,
    astLogs,
    cphsMeetings,
    isoAudits,
    hhcPlans,
    cloudDocs,
    qrScans,
    shiftDefs,
    trainingAttendance,
    payrollPeriods,
    payrollItems,
    objectives,
    evaluations,
    feedback,
    workerDocs,
    workerRequests,
    shiftAssignments,
    shiftChangeLogs,
    vacationRequests,
    vacationBalances,
    finiquitos,
    securityTalks,
    iperEntries,
    departments,
    correctionRequests,
    securityAlerts,
    medicalLicenses,
  };

  const activeQueries = activeKeys.map((k) => queries[k as keyof typeof queries]).filter(Boolean);
  const isLoading = activeQueries.some((q) => q.isLoading);
  const error = activeQueries.find((q) => q.error)?.error;

  const reload = useCallback(async () => {
    const hasData = !!(workers.data?.length || eppLogs.data?.length || incidents.data?.length);
    if (hasData) setReloading(true);
    try {
      await Promise.all(
        activeKeys.map(async (key) => {
          const scopedKey = ["tenant", tenantScope ?? "none", key];
          await queryClient.invalidateQueries({ queryKey: scopedKey });
          await queryClient.refetchQueries({ queryKey: scopedKey });
        }),
      );
    } catch (err) {
      logger.error("Reload failed:", err);
      throw err;
    } finally {
      setReloading(false);
    }
  }, [queryClient, activeKeys, workers.data, eppLogs.data, incidents.data]); // eslint-disable-line react-hooks/exhaustive-deps -- reviewed dependency set; unstable callback recreation is intentional to avoid loops

  return {
    workers: keySet.has("workers") ? (workers.data ?? []) : [],
    eppLogs: keySet.has("eppLogs") ? (eppLogs.data ?? []) : [],
    incidents: keySet.has("incidents") ? (incidents.data ?? []) : [],
    trainings: keySet.has("trainings") ? (trainings.data ?? []) : [],
    shifts: keySet.has("shifts") ? (shifts.data ?? []) : [],
    astLogs: keySet.has("astLogs") ? (astLogs.data ?? []) : [],
    cphsMeetings: keySet.has("cphsMeetings") ? (cphsMeetings.data ?? []) : [],
    isoAudits: keySet.has("isoAudits") ? (isoAudits.data ?? []) : [],
    hhcPlans: keySet.has("hhcPlans") ? (hhcPlans.data ?? []) : [],
    cloudDocs: keySet.has("cloudDocs") ? (cloudDocs.data ?? []) : [],
    qrScans: keySet.has("qrScans") ? (qrScans.data ?? []) : [],
    shiftDefs: keySet.has("shiftDefs") ? (shiftDefs.data ?? []) : [],
    honeytokens: [],
    trainingAttendance: keySet.has("trainingAttendance") ? (trainingAttendance.data ?? []) : [],
    payrollPeriods: keySet.has("payrollPeriods") ? (payrollPeriods.data ?? []) : [],
    payrollItems: keySet.has("payrollItems") ? (payrollItems.data ?? []) : [],
    objectives: keySet.has("objectives") ? (objectives.data ?? []) : [],
    evaluations: keySet.has("evaluations") ? (evaluations.data ?? []) : [],
    feedback: keySet.has("feedback") ? (feedback.data ?? []) : [],
    workerDocs: keySet.has("workerDocs") ? (workerDocs.data ?? []) : [],
    workerRequests: keySet.has("workerRequests") ? (workerRequests.data ?? []) : [],
    shiftAssignments: keySet.has("shiftAssignments") ? (shiftAssignments.data ?? []) : [],
    shiftChangeLogs: keySet.has("shiftChangeLogs") ? (shiftChangeLogs.data ?? []) : [],
    vacationRequests: keySet.has("vacationRequests") ? (vacationRequests.data ?? []) : [],
    vacationBalances: keySet.has("vacationBalances") ? (vacationBalances.data ?? []) : [],
    finiquitos: keySet.has("finiquitos") ? (finiquitos.data ?? []) : [],
    securityTalks: keySet.has("securityTalks") ? (securityTalks.data ?? []) : [],
    iperEntries: keySet.has("iperEntries") ? (iperEntries.data ?? []) : [],
    departments: keySet.has("departments") ? (departments.data ?? []) : [],
    correctionRequests: keySet.has("correctionRequests") ? (correctionRequests.data ?? []) : [],
    securityAlerts: keySet.has("securityAlerts") ? (securityAlerts.data ?? []) : [],
    medicalLicenses: keySet.has("medicalLicenses") ? (medicalLicenses.data ?? []) : [],
    loading: isLoading,
    reloading,
    error: error instanceof Error ? error.message : null,
    reload,
  };
}
