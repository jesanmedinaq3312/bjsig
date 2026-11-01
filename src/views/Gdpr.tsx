import { useState, useMemo } from "react";
import { ShieldAlert, CheckCircle2, XCircle, Clock, Download, FileWarning } from "lucide-react";
import { Card, CardHeader, Button, Badge, EmptyState, Spinner, Select } from "@/components/ui";
import type { AppData } from "@/hooks/useAppData";
import type { SecurityAlert, CorrectionRequest } from "@/lib/types";
import { securityAlertRepo, correctionRequestRepo } from "@/lib/repositories";
import { ExportPdf } from "@/lib/exportPdf";
import { DocumentPreview } from "@/components/DocumentPreview";
import { DATA_PROTECTION_DISCLAIMER } from "@/lib/legal";
import { logger } from "@/lib/logger";

const SEVERITY_COLORS: Record<string, string> = {
  high: "bg-red-50 text-red-700 border-red-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  low: "bg-blue-50 text-blue-700 border-blue-200",
};

const SEVERITY_LABELS: Record<string, string> = {
  high: "Alta",
  medium: "Media",
  low: "Baja",
};

const REQ_STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
};

const REQ_STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  approved: "Aprobada",
  rejected: "Rechazada",
};

export function GdprView({ data }: { data: AppData }) {
  const { workers, correctionRequests, securityAlerts, loading } = data;
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [previewOpen, setPreviewOpen] = useState(false);

  const workerName = (rut: string): string => {
    const w = workers.find((x) => x.rut === rut);
    return w?.full_name ?? rut;
  };

  const filteredRequests = useMemo(() => {
    if (filterStatus === "all") return correctionRequests;
    return correctionRequests.filter((r) => r.status === filterStatus);
  }, [correctionRequests, filterStatus]);

  async function resolveRequest(req: CorrectionRequest, approved: boolean) {
    try {
      await correctionRequestRepo.update(req.id, {
        status: approved ? "approved" : "rejected",
        resolved_at: new Date().toISOString(),
        resolved_by: "admin",
      });
      await data.reload();
    } catch (err) {
      logger.error("Failed to resolve request:", err);
    }
  }

  async function acknowledgeAlert(alert: SecurityAlert) {
    try {
      await securityAlertRepo.update(alert.id, {
        acknowledged: true,
        acknowledged_at: new Date().toISOString(),
        acknowledged_by: "admin",
      });
      await data.reload();
    } catch (err) {
      logger.error("Failed to acknowledge alert:", err);
    }
  }

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Privacidad y Protección de Datos</h2>
        <p className="text-sm text-slate-500">
          Gestión de solicitudes de derechos del trabajador y detección de accesos anomalos
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <Clock size={20} className="text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Solicitudes Pendientes</p>
              <p className="text-lg font-bold text-slate-800">
                {correctionRequests.filter((r) => r.status === "pending").length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
              <ShieldAlert size={20} className="text-red-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Alertas de Seguridad</p>
              <p className="text-lg font-bold text-slate-800">{securityAlerts.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 size={20} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Solicitudes Resueltas</p>
              <p className="text-lg font-bold text-slate-800">
                {correctionRequests.filter((r) => r.status !== "pending").length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Correction Requests */}
      <Card>
        <CardHeader
          title="Solicitudes de Rectificación de Datos"
          action={<FileWarning size={18} className="text-slate-400" />}
        />
        <div className="px-5 pb-5">
          <div className="flex items-center gap-3 mb-4">
            <Select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-48"
            >
              <option value="all">Todas</option>
              <option value="pending">Pendientes</option>
              <option value="approved">Aprobadas</option>
              <option value="rejected">Rechazadas</option>
            </Select>
            {filteredRequests.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)}>
                <Download size={14} /> Vista Previa PDF
              </Button>
            )}
          </div>

          {filteredRequests.length === 0 ? (
            <EmptyState
              message="No hay solicitudes de rectificación."
              icon={<FileWarning size={28} />}
            />
          ) : (
            <div className="space-y-2">
              {filteredRequests.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between py-3 px-4 rounded-xl border border-slate-100 bg-white"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-slate-800">
                        {workerName(req.worker_rut)}
                      </p>
                      <Badge className={REQ_STATUS_COLORS[req.status] ?? REQ_STATUS_COLORS.pending}>
                        {REQ_STATUS_LABELS[req.status] ?? req.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Campo: <span className="font-medium">{req.field_name}</span>
                      {req.current_value && <> · Valor actual: "{req.current_value}"</>}
                      {req.requested_value && <> · Solicita: "{req.requested_value}"</>}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Solicitada: {new Date(req.requested_at).toLocaleString("es-CL")}
                      {req.resolved_at && (
                        <> · Resuelta: {new Date(req.resolved_at).toLocaleString("es-CL")}</>
                      )}
                    </p>
                  </div>
                  {req.status === "pending" && (
                    <div className="flex items-center gap-2 shrink-0">
                      <Button size="sm" variant="outline" onClick={() => resolveRequest(req, true)}>
                        <CheckCircle2 size={14} className="text-emerald-600" /> Aprobar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => resolveRequest(req, false)}
                      >
                        <XCircle size={14} className="text-red-600" /> Rechazar
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Security Alerts */}
      <Card>
        <CardHeader
          title="Alertas de Acceso Anómalo"
          action={<ShieldAlert size={18} className="text-slate-400" />}
        />
        <div className="px-5 pb-5">
          {securityAlerts.length === 0 ? (
            <EmptyState
              message="No hay alertas de seguridad activas."
              icon={<ShieldAlert size={28} />}
            />
          ) : (
            <div className="space-y-2">
              {securityAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-start justify-between py-3 px-4 rounded-xl border border-slate-100 bg-white"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={SEVERITY_COLORS[alert.severity] ?? SEVERITY_COLORS.medium}>
                        {SEVERITY_LABELS[alert.severity] ?? alert.severity}
                      </Badge>
                      <p className="text-sm font-medium text-slate-800">{alert.description}</p>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Tipo: {alert.alert_type}
                      {alert.related_email && <> · Usuario: {alert.related_email}</>}
                      {alert.ip_hint && <> · IP: {alert.ip_hint}</>}
                      {" · "}
                      {new Date(alert.created_at ?? "").toLocaleString("es-CL")}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => acknowledgeAlert(alert)}>
                    <CheckCircle2 size={14} /> Reconocer
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      <DocumentPreview
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="Solicitudes de Rectificación de Datos"
        fileName="solicitudes_rectificacion"
        generatePdf={async () => {
          const headers = [
            "Trabajador",
            "RUT",
            "Campo",
            "Valor Actual",
            "Valor Solicitado",
            "Estado",
            "Fecha Solicitud",
          ];
          const body = filteredRequests.map((r) => [
            workerName(r.worker_rut),
            r.worker_rut,
            r.field_name,
            r.current_value ?? "—",
            r.requested_value ?? "—",
            REQ_STATUS_LABELS[r.status] ?? r.status,
            new Date(r.requested_at).toLocaleDateString("es-CL"),
          ]);
          return ExportPdf.toPdfBlob(
            "Solicitudes de Rectificación de Datos",
            headers,
            body,
            "solicitudes_rectificacion",
            "Registro GDPR — Ley 19.628 / Ley 21.719",
          );
        }}
      />

      <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-2">
        <div className="flex items-center gap-2 mb-1">
          <ShieldAlert size={16} className="text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-700">
            Descargo de Responsabilidad — Tratamiento de Datos
          </h3>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
          {DATA_PROTECTION_DISCLAIMER}
        </p>
      </div>
    </div>
  );
}
