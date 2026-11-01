import { useState } from "react";
import { Target, Star, MessageSquare, Inbox, FileText } from "lucide-react";
import { Card, Select, Spinner } from "@/components/ui";
import type { AppData } from "@/hooks/useAppData";
import { type Tab } from "./performance/constants";
import { ObjectivesTab } from "./performance/ObjectivesTab";
import { EvaluationsTab } from "./performance/EvaluationsTab";
import { FeedbackTab } from "./performance/FeedbackTab";
import { RequestsTab } from "./performance/RequestsTab";
import { DocumentsTab } from "./performance/DocumentsTab";

export function PerformanceView({
  data,
  userRole,
  permissions,
}: {
  data: AppData;
  userRole?: string;
  permissions?: Record<string, boolean>;
}) {
  const { workers, objectives, evaluations, feedback, workerDocs, workerRequests, loading } = data;
  const canDelete =
    userRole === "superadmin" || userRole === "developer" || !!permissions?.can_delete_performance;
  const [tab, setTab] = useState<Tab>("objectives");
  const [selectedWorker, setSelectedWorker] = useState<string>("all");

  if (loading) return <Spinner />;

  const workerName = (rut: string) => workers.find((w) => w.rut === rut)?.full_name ?? rut;

  const filteredObjectives =
    selectedWorker === "all"
      ? objectives
      : objectives.filter((o) => o.worker_rut === selectedWorker);
  const filteredEvaluations =
    selectedWorker === "all"
      ? evaluations
      : evaluations.filter((e) => e.worker_rut === selectedWorker);
  const filteredFeedback =
    selectedWorker === "all" ? feedback : feedback.filter((f) => f.worker_rut === selectedWorker);
  const filteredRequests =
    selectedWorker === "all"
      ? workerRequests
      : workerRequests.filter((r) => r.worker_rut === selectedWorker);
  const filteredDocs =
    selectedWorker === "all"
      ? workerDocs
      : workerDocs.filter((d) => d.worker_rut === selectedWorker);

  const avgScore =
    evaluations.length > 0
      ? (evaluations.reduce((s, e) => s + Number(e.score), 0) / evaluations.length).toFixed(1)
      : "—";
  const completedObj = objectives.filter((o) => o.status === "completado").length;
  const objCompletion =
    objectives.length > 0 ? Math.round((completedObj / objectives.length) * 100) : 0;

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "objectives", label: "Objetivos", icon: <Target size={15} /> },
    { key: "evaluations", label: "Evaluaciones", icon: <Star size={15} /> },
    { key: "feedback", label: "Feedback", icon: <MessageSquare size={15} /> },
    { key: "requests", label: "Solicitudes", icon: <Inbox size={15} /> },
    { key: "documents", label: "Documentos", icon: <FileText size={15} /> },
  ];

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Card className="p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-1">
            <Target size={18} className="text-blue-600" />
            <span className="text-xs text-slate-500">Objetivos</span>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-slate-800">{objectives.length}</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {completedObj} completados ({objCompletion}%)
          </p>
        </Card>
        <Card className="p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-1">
            <Star size={18} className="text-amber-600" />
            <span className="text-xs text-slate-500">Promedio Nota</span>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-slate-800">{avgScore}</p>
          <p className="text-xs text-slate-400 mt-0.5">{evaluations.length} evaluaciones</p>
        </Card>
        <Card className="p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-1">
            <MessageSquare size={18} className="text-emerald-600" />
            <span className="text-xs text-slate-500">Feedback</span>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-slate-800">{feedback.length}</p>
        </Card>
        <Card className="p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-1">
            <Inbox size={18} className="text-cyan-600" />
            <span className="text-xs text-slate-500">Solicitudes</span>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-slate-800">
            {workerRequests.filter((r) => r.status === "pendiente").length}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">{workerRequests.length} en total</p>
        </Card>
        <Card className="p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-1">
            <FileText size={18} className="text-red-600" />
            <span className="text-xs text-slate-500">Documentos</span>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-slate-800">{workerDocs.length}</p>
        </Card>
      </div>

      {/* Worker filter */}
      <div className="flex items-center gap-3">
        <Select
          value={selectedWorker}
          onChange={(e) => setSelectedWorker(e.target.value)}
          className="w-full sm:max-w-xs"
        >
          <option value="all">Todos los trabajadores</option>
          {workers.map((w) => (
            <option key={w.id} value={w.rut}>
              {w.full_name}
            </option>
          ))}
        </Select>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 overflow-x-auto -mx-1 px-1 pb-px">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              tab === t.key
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.icon} <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {tab === "objectives" && (
        <ObjectivesTab
          objectives={filteredObjectives}
          workers={workers}
          workerName={workerName}
          data={data}
          canDelete={canDelete}
        />
      )}
      {tab === "evaluations" && (
        <EvaluationsTab
          evaluations={filteredEvaluations}
          workers={workers}
          workerName={workerName}
          data={data}
          canDelete={canDelete}
        />
      )}
      {tab === "feedback" && (
        <FeedbackTab
          feedback={filteredFeedback}
          workers={workers}
          workerName={workerName}
          data={data}
          canDelete={canDelete}
        />
      )}
      {tab === "requests" && (
        <RequestsTab requests={filteredRequests} workerName={workerName} data={data} />
      )}
      {tab === "documents" && (
        <DocumentsTab
          docs={filteredDocs}
          workers={workers}
          workerName={workerName}
          data={data}
          canDelete={canDelete}
        />
      )}
    </div>
  );
}
