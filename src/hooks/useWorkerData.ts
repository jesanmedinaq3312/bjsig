import { useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { workerRequestRepo } from "@/lib/repositories";
import { useTenantOptional } from "@/components/TenantProvider";
import type { Database } from "@/integrations/supabase/types";
import type {
  WorkerRequest,
  WorkerRequestCategory,
  DailyShift,
  QrScanEvent,
  Training,
  TrainingAttendance,
  PayrollItem,
  PayrollPeriod,
  PerformanceObjective,
  PerformanceEvaluation,
  PerformanceFeedback,
  WorkerDocument,
  EppLog,
  Incident,
  ShiftAssignment,
  ShiftChangeLog,
  ShiftDefinition,
  Circular,
  CircularAcknowledgment,
} from "@/lib/types";

type AttendanceRectification = Pick<
  Database["public"]["Tables"]["attendance_rectifications"]["Row"],
  | "id"
  | "scan_event_id"
  | "proposed_scan_type"
  | "proposed_at"
  | "reason"
  | "status"
  | "worker_response_at"
  | "worker_comment"
  | "created_at"
>;

export interface WorkerPortalData {
  profile: {
    rut: string;
    full_name: string;
    position: string;
    department_id: string | null;
    department_name: string | null;
    photo_url: string | null;
    phone: string | null;
    email: string | null;
    hire_date: string | null;
    contract_type: string | null;
    birth_date: string | null;
  } | null;
  shifts: DailyShift[];
  qr_scans: QrScanEvent[];
  trainings: Training[];
  attendance: TrainingAttendance[];
  payroll_items: PayrollItem[];
  payroll_periods: PayrollPeriod[];
  objectives: PerformanceObjective[];
  evaluations: PerformanceEvaluation[];
  feedback: PerformanceFeedback[];
  documents: WorkerDocument[];
  epp: EppLog[];
  incidents: Incident[];
  assignments: ShiftAssignment[];
  shift_change_logs: ShiftChangeLog[];
  requests: WorkerRequest[];
  shift_definitions: ShiftDefinition[];
  circulars: (Circular & { acked?: boolean })[];
  rectifications: AttendanceRectification[];
  rectificationsError: string | null;
}

const STALE_TIME = 60_000;

export function useWorkerData(workerRut: string | null) {
  const queryClient = useQueryClient();
  const tenantContext = useTenantOptional();
  const tenantId = tenantContext?.tenantId ?? null;
  const enabled = !!workerRut && !!tenantId && tenantContext?.loading !== true;

  useEffect(() => {
    if (!tenantId) return;
    queryClient.removeQueries({
      predicate: (query) => {
        const key = query.queryKey;
        return typeof key[0] === "string" && key[0].startsWith("worker_") && key[1] !== tenantId;
      },
    });
  }, [queryClient, tenantId]);

  const profileQuery = useQuery({
    queryKey: ["worker_profile", tenantId, workerRut],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workers")
        .select(
          "rut, full_name, position, department_id, departments(name), photo_url, phone, email, hire_date, contract_type, birth_date",
        )
        .eq("tenant_id", tenantId!)
        .eq("rut", workerRut!)
        .maybeSingle();
      if (error) throw new Error(error.message);
      const raw = data as Record<string, unknown> | null;
      if (!raw) return null;
      const { departments, ...rest } = raw;
      return {
        ...rest,
        department_name: (departments as Record<string, unknown> | null)?.name ?? null,
      } as WorkerPortalData["profile"];
    },
    enabled,
    staleTime: STALE_TIME,
  });

  const shiftsQuery = useQuery({
    queryKey: ["worker_shifts", tenantId, workerRut],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_shifts")
        .select("*")
        .eq("tenant_id", tenantId!)
        .eq("worker_rut", workerRut!)
        .order("date", { ascending: false })
        .limit(200);
      if (error) throw new Error(error.message);
      return (data ?? []) as DailyShift[];
    },
    enabled,
    staleTime: STALE_TIME,
  });

  const qrScansQuery = useQuery({
    queryKey: ["worker_qr_scans", tenantId, workerRut],
    queryFn: async () => {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      const since = threeMonthsAgo.toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("qr_scan_events")
        .select("*")
        .eq("tenant_id", tenantId!)
        .eq("worker_rut", workerRut!)
        .gte("scan_date", since)
        .order("scan_date", { ascending: false })
        .order("scan_time", { ascending: false })
        .limit(200);
      if (error) throw new Error(error.message);
      return (data ?? []) as QrScanEvent[];
    },
    enabled,
    staleTime: STALE_TIME,
  });

  const rectificationsQuery = useQuery({
    queryKey: ["worker_attendance_rectifications", tenantId, workerRut],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance_rectifications")
        .select(
          "id, scan_event_id, proposed_scan_type, proposed_at, reason, status, worker_response_at, worker_comment, created_at",
        )
        .eq("tenant_id", tenantId!)
        .eq("worker_rut", workerRut!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw new Error(error.message);
      return (data ?? []) as AttendanceRectification[];
    },
    enabled,
    staleTime: STALE_TIME,
  });

  const trainingsQuery = useQuery({
    queryKey: ["worker_trainings", tenantId, workerRut],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trainings_ds44")
        .select("*")
        .eq("tenant_id", tenantId!)
        .contains("attendees_rut_list", [workerRut])
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw new Error(error.message);
      return (data ?? []) as Training[];
    },
    enabled,
    staleTime: STALE_TIME,
  });

  const attendanceQuery = useQuery({
    queryKey: ["worker_attendance", tenantId, workerRut],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_attendance")
        .select("*")
        .eq("tenant_id", tenantId!)
        .eq("worker_rut", workerRut!)
        .order("date", { ascending: false })
        .limit(200);
      if (error) throw new Error(error.message);
      return ((data ?? []) as (TrainingAttendance & { date?: string | null })[]).map((row) => ({
        ...row,
        attendance_date: row.attendance_date ?? row.date ?? "",
      }));
    },
    enabled,
    staleTime: STALE_TIME,
  });

  const payrollItemsQuery = useQuery({
    queryKey: ["worker_payroll_items", tenantId, workerRut],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payroll_items")
        .select("*")
        .eq("tenant_id", tenantId!)
        .eq("worker_rut", workerRut!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw new Error(error.message);
      return (data ?? []) as PayrollItem[];
    },
    enabled,
    staleTime: STALE_TIME,
  });

  const payrollPeriodsQuery = useQuery({
    queryKey: ["worker_payroll_periods", tenantId, workerRut],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payroll_periods")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("start_date", { ascending: false })
        .limit(50);
      if (error) throw new Error(error.message);
      return (data ?? []) as PayrollPeriod[];
    },
    enabled,
    staleTime: STALE_TIME,
  });

  const objectivesQuery = useQuery({
    queryKey: ["worker_objectives", tenantId, workerRut],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("performance_objectives")
        .select("*")
        .eq("tenant_id", tenantId!)
        .eq("worker_rut", workerRut!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw new Error(error.message);
      return (data ?? []) as PerformanceObjective[];
    },
    enabled,
    staleTime: STALE_TIME,
  });

  const evaluationsQuery = useQuery({
    queryKey: ["worker_evaluations", tenantId, workerRut],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("performance_evaluations")
        .select("*")
        .eq("tenant_id", tenantId!)
        .eq("worker_rut", workerRut!)
        .order("evaluation_date", { ascending: false })
        .limit(50);
      if (error) throw new Error(error.message);
      return (data ?? []) as PerformanceEvaluation[];
    },
    enabled,
    staleTime: STALE_TIME,
  });

  const feedbackQuery = useQuery({
    queryKey: ["worker_feedback", tenantId, workerRut],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("performance_feedback")
        .select("*")
        .eq("tenant_id", tenantId!)
        .eq("worker_rut", workerRut!)
        .order("feedback_date", { ascending: false })
        .limit(50);
      if (error) throw new Error(error.message);
      return (data ?? []) as PerformanceFeedback[];
    },
    enabled,
    staleTime: STALE_TIME,
  });

  const documentsQuery = useQuery({
    queryKey: ["worker_documents_portal", tenantId, workerRut],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("worker_documents")
        .select("*")
        .eq("tenant_id", tenantId!)
        .eq("worker_rut", workerRut!)
        .order("document_date", { ascending: false })
        .limit(100);
      if (error) throw new Error(error.message);
      return (data ?? []) as WorkerDocument[];
    },
    enabled,
    staleTime: STALE_TIME,
  });

  const eppQuery = useQuery({
    queryKey: ["worker_epp", tenantId, workerRut],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("epp_logs")
        .select("*")
        .eq("tenant_id", tenantId!)
        .eq("worker_rut", workerRut!)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw new Error(error.message);
      return (data ?? []) as EppLog[];
    },
    enabled,
    staleTime: STALE_TIME,
  });

  const incidentsQuery = useQuery({
    queryKey: ["worker_incidents", tenantId, workerRut],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("incidents_ds44")
        .select("*")
        .eq("tenant_id", tenantId!)
        .eq("worker_rut", workerRut!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw new Error(error.message);
      return (data ?? []) as Incident[];
    },
    enabled,
    staleTime: STALE_TIME,
  });

  const assignmentsQuery = useQuery({
    queryKey: ["worker_assignments", tenantId, workerRut],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shift_assignments")
        .select("*")
        .eq("tenant_id", tenantId!)
        .eq("worker_rut", workerRut!)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw new Error(error.message);
      return (data ?? []) as ShiftAssignment[];
    },
    enabled,
    staleTime: STALE_TIME,
  });

  const changeLogsQuery = useQuery({
    queryKey: ["worker_change_logs", tenantId, workerRut],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shift_change_logs")
        .select("*")
        .eq("tenant_id", tenantId!)
        .eq("worker_rut", workerRut!)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw new Error(error.message);
      return (data ?? []) as ShiftChangeLog[];
    },
    enabled,
    staleTime: STALE_TIME,
  });

  const requestsQuery = useQuery({
    queryKey: ["worker_requests_portal", tenantId, workerRut],
    queryFn: async () => {
      if (!workerRut) return [];
      return workerRequestRepo.getByWorker(workerRut);
    },
    enabled,
    staleTime: STALE_TIME,
  });

  const shiftDefsQuery = useQuery({
    queryKey: ["worker_shift_defs", tenantId, workerRut],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shift_definitions")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("name", { ascending: true })
        .limit(50);
      if (error) throw new Error(error.message);
      return (data ?? []) as ShiftDefinition[];
    },
    enabled,
    staleTime: STALE_TIME,
  });

  const circularsQuery = useQuery({
    queryKey: ["worker_circulars", tenantId, workerRut],
    queryFn: async () => {
      const { data: workerData, error: workerError } = await supabase
        .from("workers")
        .select("department_id")
        .eq("tenant_id", tenantId!)
        .eq("rut", workerRut!)
        .maybeSingle();
      if (workerError) throw new Error(workerError.message);
      const deptId = (workerData as Record<string, unknown> | null)?.department_id as string | null;

      const { data, error } = await supabase
        .from("circulars")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw new Error(error.message);

      const all = (data ?? []) as Circular[];
      const ackedCircularIds = new Set<string>();
      const circularIds = all.map((circular) => circular.id);
      if (circularIds.length > 0) {
        const { data: acknowledgments, error: acknowledgmentsError } = await supabase
          .from("circular_acknowledgments")
          .select("circular_id")
          .eq("tenant_id", tenantId!)
          .eq("worker_rut", workerRut!)
          .in("circular_id", circularIds)
          .limit(100);
        if (acknowledgmentsError) throw new Error(acknowledgmentsError.message);
        for (const acknowledgment of acknowledgments ?? []) {
          if (acknowledgment.circular_id) ackedCircularIds.add(acknowledgment.circular_id);
        }
      }
      const visible = all.filter((c) => {
        if (c.target_audience === "todos") return true;
        return c.department_id === deptId;
      });
      return visible.map((c) => ({
        ...c,
        acked: ackedCircularIds.has(c.id),
      })) as (Circular & { acked?: boolean })[];
    },
    enabled,
    staleTime: STALE_TIME,
  });
  // Los módulos secundarios pueden no estar habilitados o tener esquemas distintos
  // entre tenants; no deben bloquear el flujo principal de solicitudes del trabajador.
  const waitingForTenant = !!workerRut && tenantContext?.loading === true;
  const loading = waitingForTenant || profileQuery.isLoading || requestsQuery.isLoading;
  const tenantResolutionError =
    workerRut !== null && workerRut.length > 0 && !tenantContext?.loading && !tenantId
      ? new Error("No se pudo determinar la empresa activa para cargar tu perfil.")
      : null;
  const error = profileQuery.error ?? requestsQuery.error ?? tenantResolutionError;

  const data: WorkerPortalData | null = workerRut
    ? {
        profile: profileQuery.data ?? null,
        shifts: shiftsQuery.data ?? [],
        qr_scans: qrScansQuery.data ?? [],
        rectifications: rectificationsQuery.data ?? [],
        rectificationsError:
          rectificationsQuery.error instanceof Error ? rectificationsQuery.error.message : null,
        trainings: trainingsQuery.data ?? [],
        attendance: attendanceQuery.data ?? [],
        payroll_items: payrollItemsQuery.data ?? [],
        payroll_periods: payrollPeriodsQuery.data ?? [],
        objectives: objectivesQuery.data ?? [],
        evaluations: evaluationsQuery.data ?? [],
        feedback: feedbackQuery.data ?? [],
        documents: documentsQuery.data ?? [],
        epp: eppQuery.data ?? [],
        incidents: incidentsQuery.data ?? [],
        assignments: assignmentsQuery.data ?? [],
        shift_change_logs: changeLogsQuery.data ?? [],
        requests: requestsQuery.data ?? [],
        shift_definitions: shiftDefsQuery.data ?? [],
        circulars: circularsQuery.data ?? [],
      }
    : null;

  const reload = useCallback(async () => {
    if (!workerRut) return;
    await queryClient.invalidateQueries({ queryKey: ["worker_profile", tenantId, workerRut] });
    await queryClient.invalidateQueries({ queryKey: ["worker_shifts", tenantId, workerRut] });
    await queryClient.invalidateQueries({ queryKey: ["worker_qr_scans", tenantId, workerRut] });
    await queryClient.invalidateQueries({
      queryKey: ["worker_attendance_rectifications", tenantId, workerRut],
    });
    await queryClient.invalidateQueries({ queryKey: ["worker_trainings", tenantId, workerRut] });
    await queryClient.invalidateQueries({ queryKey: ["worker_attendance", tenantId, workerRut] });
    await queryClient.invalidateQueries({
      queryKey: ["worker_payroll_items", tenantId, workerRut],
    });
    await queryClient.invalidateQueries({
      queryKey: ["worker_payroll_periods", tenantId, workerRut],
    });
    await queryClient.invalidateQueries({ queryKey: ["worker_objectives", tenantId, workerRut] });
    await queryClient.invalidateQueries({ queryKey: ["worker_evaluations", tenantId, workerRut] });
    await queryClient.invalidateQueries({ queryKey: ["worker_feedback", tenantId, workerRut] });
    await queryClient.invalidateQueries({
      queryKey: ["worker_documents_portal", tenantId, workerRut],
    });
    await queryClient.invalidateQueries({ queryKey: ["worker_epp", tenantId, workerRut] });
    await queryClient.invalidateQueries({ queryKey: ["worker_incidents", tenantId, workerRut] });
    await queryClient.invalidateQueries({ queryKey: ["worker_assignments", tenantId, workerRut] });
    await queryClient.invalidateQueries({ queryKey: ["worker_change_logs", tenantId, workerRut] });
    await queryClient.invalidateQueries({
      queryKey: ["worker_requests_portal", tenantId, workerRut],
    });
    await queryClient.invalidateQueries({ queryKey: ["worker_shift_defs", tenantId, workerRut] });
    await queryClient.invalidateQueries({ queryKey: ["worker_circulars", tenantId, workerRut] });
  }, [queryClient, tenantId, workerRut]);

  const createRequest = useCallback(
    async (
      category: WorkerRequestCategory,
      subject: string,
      message: string,
    ): Promise<{ error: string | null }> => {
      try {
        await workerRequestRepo.insert({
          worker_rut: workerRut!,
          category,
          subject,
          message,
          status: "pendiente",
          validity: null,
          validity_note: null,
          admin_reply: null,
          replied_by_email: null,
          replied_at: null,
        });
        await queryClient.invalidateQueries({
          queryKey: ["worker_requests_portal", tenantId, workerRut],
        });
        return { error: null };
      } catch (e) {
        return { error: e instanceof Error ? e.message : "Error al crear solicitud" };
      }
    },
    [queryClient, tenantId, workerRut],
  );

  const respondToAttendanceRectification = useCallback(
    async (id: string, accept: boolean, comment: string): Promise<{ error: string | null }> => {
      try {
        const { error } = await supabase.rpc("respond_attendance_rectification", {
          _id: id,
          _accept: accept,
          _comment: comment.trim() || null,
          _ip: null,
        });
        if (error) throw error;
        await queryClient.invalidateQueries({
          queryKey: ["worker_attendance_rectifications", tenantId, workerRut],
        });
        return { error: null };
      } catch (e) {
        return {
          error: e instanceof Error ? e.message : "No se pudo registrar tu respuesta.",
        };
      }
    },
    [queryClient, tenantId, workerRut],
  );

  return {
    data,
    loading,
    error: error instanceof Error ? error.message : null,
    reload,
    createRequest,
    respondToAttendanceRectification,
  };
}
