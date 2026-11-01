import { useState, useMemo, lazy, Suspense } from "react";
import { Clock } from "lucide-react";
import { Spinner } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/hooks/useConfirm";
import { useLoading } from "@/components/LoadingProvider";
import type { Worker } from "@/lib/types";
import type { AppData } from "@/hooks/useAppData";
import type { Tab } from "./shifts/constants";

const DefinitionsTab = lazy(() =>
  import("./shifts/DefinitionsTab").then((m) => ({ default: m.DefinitionsTab })),
);
const AssignmentsTab = lazy(() =>
  import("./shifts/AssignmentsTab").then((m) => ({ default: m.AssignmentsTab })),
);
const ScheduleTab = lazy(() =>
  import("./shifts/ScheduleTab").then((m) => ({ default: m.ScheduleTab })),
);
const HistoryTab = lazy(() =>
  import("./shifts/HistoryTab").then((m) => ({ default: m.HistoryTab })),
);

export function ShiftsView({
  data,
  userRole,
  permissions,
}: {
  data: AppData;
  userRole?: string;
  permissions?: Record<string, boolean>;
}) {
  const { shiftDefs, shiftAssignments, shiftChangeLogs, workers, loading } = data;
  const canDelete =
    userRole === "superadmin" || userRole === "developer" || !!permissions?.can_delete_shifts;
  const [tab, setTab] = useState<Tab>("definitions");
  const toast = useToast();
  const confirmCtx = useConfirm();
  const { confirm } = confirmCtx;
  const { runWithLoading } = useLoading();

  const workerMap = useMemo(() => {
    const m = new Map<string, Worker>();
    workers.forEach((w) => m.set(w.rut, w));
    return m;
  }, [workers]);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Clock size={22} className="text-blue-600" />
        <h2 className="text-lg font-semibold text-slate-800">Gestión de Turnos</h2>
      </div>

      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
        {(
          [
            ["definitions", "Definiciones"],
            ["assignments", "Asignaciones"],
            ["schedule", "Calendario"],
            ["history", "Historial"],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${tab === key ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <Suspense
          fallback={
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          }
        >
          {tab === "definitions" && (
            <DefinitionsTab
              shiftDefs={shiftDefs}
              onReload={data.reload}
              toast={toast}
              confirm={confirmCtx}
              runWithLoading={runWithLoading}
              canDelete={canDelete}
            />
          )}
          {tab === "assignments" && (
            <AssignmentsTab
              shiftDefs={shiftDefs}
              shiftAssignments={shiftAssignments}
              workers={workers}
              workerMap={workerMap}
              onReload={data.reload}
              toast={toast}
              runWithLoading={runWithLoading}
            />
          )}
          {tab === "schedule" && (
            <ScheduleTab
              shiftDefs={shiftDefs}
              shiftAssignments={shiftAssignments}
              workers={workers}
              workerMap={workerMap}
            />
          )}
          {tab === "history" && (
            <HistoryTab shiftChangeLogs={shiftChangeLogs} workerMap={workerMap} />
          )}
        </Suspense>
      )}
    </div>
  );
}
