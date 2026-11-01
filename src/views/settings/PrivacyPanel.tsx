import { useState, useEffect } from "react";
import {
  Lock,
  FileText,
  ShieldCheck,
  Plus,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  UserX,
  Ban,
  Eye,
  Edit3,
  Download,
  Trash2,
} from "lucide-react";
import { Button, Badge, Input, Select } from "@/components/ui";
import { audit } from "@/lib/audit";
import { consentRepo, rightsRequestRepo } from "@/lib/repositories";
import { callEdgeFunction } from "@/lib/edgeFunctions";
import { DATA_PROTECTION_DISCLAIMER } from "@/lib/legal";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/hooks/useConfirm";
import { useLoading } from "@/components/LoadingProvider";
import type {
  DataConsent,
  DataRightsRequest,
  DataRightsRequestType,
  DataRightsRequestStatus,
} from "@/lib/types";
import { logger } from "@/lib/logger";

const CONSENT_LABELS: Record<string, string> = {
  tratamiento_general: "Tratamiento General",
  datos_salud: "Datos de Salud",
  datos_sensibles: "Datos Sensibles",
  comunicacion_terceros: "Comunicación a Terceros",
  transferencia_internacional: "Transferencia Internacional",
};

const RIGHTS_LABELS: Record<DataRightsRequestType, string> = {
  acceso: "Acceso",
  rectificacion: "Rectificación",
  cancelacion: "Cancelación",
  oposicion: "Oposición",
  portabilidad: "Portabilidad",
};

const RIGHTS_ICONS: Record<DataRightsRequestType, typeof Eye> = {
  acceso: Eye,
  rectificacion: Edit3,
  cancelacion: UserX,
  oposicion: Ban,
  portabilidad: Download,
};

const RIGHTS_STATUS_STYLES: Record<DataRightsRequestStatus, string> = {
  pendiente: "bg-amber-100 text-amber-700 border-amber-200",
  en_proceso: "bg-blue-100 text-blue-700 border-blue-200",
  completada: "bg-emerald-100 text-emerald-700 border-emerald-200",
  rechazada: "bg-red-100 text-red-700 border-red-200",
};

export function PrivacyPanel({
  isAdmin,
  currentEmail,
}: {
  isAdmin: boolean;
  currentEmail: string;
}) {
  const [consents, setConsents] = useState<DataConsent[]>([]);
  const [requests, setRequests] = useState<DataRightsRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConsentForm, setShowConsentForm] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [newConsent, setNewConsent] = useState({
    worker_rut: "",
    consent_type: "tratamiento_general",
    purpose: "",
  });
  const [newRequest, setNewRequest] = useState<{
    worker_rut: string;
    request_type: DataRightsRequestType;
    requester_name: string;
    description: string;
  }>({
    worker_rut: "",
    request_type: "acceso",
    requester_name: "",
    description: "",
  });
  const [actionRut, setActionRut] = useState("");
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const { confirm } = useConfirm();
  const { runWithLoading } = useLoading();

  async function loadData() {
    setLoading(true);
    try {
      const [c, r] = await Promise.all([consentRepo.getAll(), rightsRequestRepo.getAll()]);
      setConsents(c);
      setRequests(r);
    } catch (e) {
      logger.error("Error cargando datos de privacidad:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleAddConsent() {
    if (!newConsent.worker_rut.trim()) {
      toast.error("Falta RUT", "Ingresa el RUT del trabajador");
      return;
    }
    setBusy(true);
    try {
      await runWithLoading(async () => {
        await consentRepo.insert({
          worker_rut: newConsent.worker_rut.trim(),
          consent_type: newConsent.consent_type,
          granted: true,
          granted_at: new Date().toISOString(),
          granted_by_email: currentEmail,
          purpose: newConsent.purpose.trim() || null,
          expires_at: null,
        });
        await audit({
          action: "privacy.consent_grant",
          entity: "data_consent",
          entity_label: newConsent.worker_rut.trim(),
          details: { type: newConsent.consent_type },
        });
        toast.success("Consentimiento registrado", `RUT: ${newConsent.worker_rut.trim()}`);
        setNewConsent({ worker_rut: "", consent_type: "tratamiento_general", purpose: "" });
        setShowConsentForm(false);
        await loadData();
      });
    } catch (e) {
      toast.error("Error", (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleAddRequest() {
    if (!newRequest.worker_rut.trim()) {
      toast.error("Falta RUT", "Ingresa el RUT del trabajador");
      return;
    }
    setBusy(true);
    try {
      await runWithLoading(async () => {
        await rightsRequestRepo.insert({
          request_type: newRequest.request_type,
          worker_rut: newRequest.worker_rut.trim(),
          requester_name: newRequest.requester_name.trim() || null,
          requester_email: currentEmail,
          description: newRequest.description.trim() || null,
          status: "pendiente",
        } as Omit<DataRightsRequest, "id" | "created_at">);
        await audit({
          action: "privacy.arco_request",
          entity: "data_rights_requests",
          entity_label: `${newRequest.request_type} — ${newRequest.worker_rut.trim()}`,
        });
        toast.success(
          "Solicitud ARCO creada",
          `${RIGHTS_LABELS[newRequest.request_type]} — RUT: ${newRequest.worker_rut.trim()}`,
        );
        setNewRequest({
          worker_rut: "",
          request_type: "acceso",
          requester_name: "",
          description: "",
        });
        setShowRequestForm(false);
        await loadData();
      });
    } catch (e) {
      toast.error("Error", (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleUpdateRequestStatus(
    req: DataRightsRequest,
    status: DataRightsRequestStatus,
  ) {
    setBusy(true);
    try {
      await runWithLoading(async () => {
        await rightsRequestRepo.update(req.id, {
          status,
          resolved_by_email: currentEmail,
          resolved_at: new Date().toISOString(),
        });
        await audit({
          action: "privacy.arco_status",
          entity: "data_rights_requests",
          entity_id: req.id,
          entity_label: `${req.request_type} — ${req.worker_rut}`,
          details: { status },
        });
        toast.success("Solicitud actualizada", `Estado: ${status}`);
        await loadData();
      });
    } catch (e) {
      toast.error("Error", (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleAnonymize() {
    if (!actionRut.trim()) {
      toast.error("Falta RUT", "Ingresa el RUT del trabajador");
      return;
    }
    const ok = await confirm({
      title: "Anonimizar Trabajador",
      message: `Anonimiza datos personales de ${actionRut.trim()} preservando registros operacionales. ¿Continuar?`,
      confirmText: "Anonimizar",
      type: "danger",
    });
    if (!ok) return;
    setBusy(true);
    try {
      await runWithLoading(async () => {
        const { error } = await callEdgeFunction("worker-gdpr", {
          action: "anonymize",
          worker_rut: actionRut.trim(),
        });
        if (error) throw new Error(error);
        toast.success("Trabajador anonimizado", `RUT: ${actionRut.trim()}`);
        setActionRut("");
      });
    } catch (e) {
      toast.error("Error", (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteGdpr() {
    if (!actionRut.trim()) {
      toast.error("Falta RUT", "Ingresa el RUT del trabajador");
      return;
    }
    const ok = await confirm({
      title: "Eliminación Total (Derecho al Olvido)",
      message: `Elimina PERMANENTEMENTE todos los datos de ${actionRut.trim()}. No se puede deshacer. ¿Seguro?`,
      confirmText: "Eliminar",
      type: "danger",
    });
    if (!ok) return;
    setBusy(true);
    try {
      await runWithLoading(async () => {
        const { error } = await callEdgeFunction("worker-gdpr", {
          action: "delete",
          worker_rut: actionRut.trim(),
        });
        if (error) throw new Error(error);
        toast.success("Datos eliminados", `RUT: ${actionRut.trim()}`);
        setActionRut("");
      });
    } catch (e) {
      toast.error("Error", (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="p-5 space-y-5">
      <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <Lock size={20} className="text-blue-600 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-semibold mb-0.5">
            Cumplimiento Ley 19.628 (Protección de Datos Personales)
          </p>
          <p className="text-xs text-blue-700">
            Gestión de consentimientos, derechos ARCO y anonimización.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <FileText size={16} className="text-slate-500" /> Consentimientos
              <Badge className="bg-slate-100 text-slate-600 border-slate-200">
                {consents.length}
              </Badge>
            </h4>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowConsentForm(!showConsentForm)}
              disabled={busy}
            >
              <Plus size={14} /> Registrar
            </Button>
          </div>
          {showConsentForm && (
            <div className="border border-slate-200 rounded-lg p-3 space-y-2 bg-slate-50">
              <Input
                placeholder="RUT del trabajador"
                value={newConsent.worker_rut}
                onChange={(e) => setNewConsent({ ...newConsent, worker_rut: e.target.value })}
              />
              <Select
                value={newConsent.consent_type}
                onChange={(e) => setNewConsent({ ...newConsent, consent_type: e.target.value })}
              >
                {Object.entries(CONSENT_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
              <Input
                placeholder="Propósito (opcional)"
                value={newConsent.purpose}
                onChange={(e) => setNewConsent({ ...newConsent, purpose: e.target.value })}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAddConsent} disabled={busy}>
                  <CheckCircle2 size={14} /> Guardar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowConsentForm(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {consents.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">
                No hay consentimientos registrados
              </p>
            ) : (
              consents.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between px-3 py-2 border border-slate-100 rounded-lg text-xs"
                >
                  <div>
                    <span className="font-mono text-slate-700">{c.worker_rut}</span>
                    <span className="text-slate-400 mx-1">·</span>
                    <span className="text-slate-600">
                      {CONSENT_LABELS[c.consent_type] ?? c.consent_type}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {c.granted ? (
                      <CheckCircle2 size={14} className="text-emerald-500" />
                    ) : (
                      <XCircle size={14} className="text-red-400" />
                    )}
                    <span className="text-slate-400">
                      {new Date(c.granted_at).toLocaleDateString("es-CL")}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <ShieldCheck size={16} className="text-slate-500" /> Solicitudes ARCO
              <Badge className="bg-slate-100 text-slate-600 border-slate-200">
                {requests.length}
              </Badge>
            </h4>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowRequestForm(!showRequestForm)}
              disabled={busy}
            >
              <Plus size={14} /> Nueva
            </Button>
          </div>
          {showRequestForm && (
            <div className="border border-slate-200 rounded-lg p-3 space-y-2 bg-slate-50">
              <Input
                placeholder="RUT del trabajador"
                value={newRequest.worker_rut}
                onChange={(e) => setNewRequest({ ...newRequest, worker_rut: e.target.value })}
              />
              <Select
                value={newRequest.request_type}
                onChange={(e) =>
                  setNewRequest({
                    ...newRequest,
                    request_type: e.target.value as DataRightsRequestType,
                  })
                }
              >
                {Object.entries(RIGHTS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
              <Input
                placeholder="Nombre del solicitante (opcional)"
                value={newRequest.requester_name}
                onChange={(e) => setNewRequest({ ...newRequest, requester_name: e.target.value })}
              />
              <Input
                placeholder="Descripción (opcional)"
                value={newRequest.description}
                onChange={(e) => setNewRequest({ ...newRequest, description: e.target.value })}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAddRequest} disabled={busy}>
                  <CheckCircle2 size={14} /> Crear
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowRequestForm(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {requests.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No hay solicitudes ARCO</p>
            ) : (
              requests.map((r) => {
                const Icon = RIGHTS_ICONS[r.request_type] ?? Eye;
                return (
                  <div
                    key={r.id}
                    className="px-3 py-2 border border-slate-100 rounded-lg text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon size={14} className="text-slate-400" />
                        <span className="font-mono text-slate-700">{r.worker_rut}</span>
                        <span className="text-slate-600">{RIGHTS_LABELS[r.request_type]}</span>
                      </div>
                      <Badge className={RIGHTS_STATUS_STYLES[r.status]}>{r.status}</Badge>
                    </div>
                    {r.description && (
                      <p className="text-slate-400 pl-6 truncate">{r.description}</p>
                    )}
                    {r.status === "pendiente" && isAdmin && (
                      <div className="flex gap-1.5 pl-6 pt-1">
                        <button
                          onClick={() => handleUpdateRequestStatus(r, "en_proceso")}
                          className="px-2 py-0.5 text-[10px] font-medium bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                        >
                          En proceso
                        </button>
                        <button
                          onClick={() => handleUpdateRequestStatus(r, "completada")}
                          className="px-2 py-0.5 text-[10px] font-medium bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200"
                        >
                          Completar
                        </button>
                        <button
                          onClick={() => handleUpdateRequestStatus(r, "rechazada")}
                          className="px-2 py-0.5 text-[10px] font-medium bg-red-100 text-red-700 rounded hover:bg-red-200"
                        >
                          Rechazar
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {isAdmin && (
        <div className="border border-red-200 rounded-xl p-4 bg-red-50/30 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-600" />
            <h4 className="text-sm font-semibold text-red-800">
              Herramientas de Datos Personales — Solo Administrador
            </h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600">RUT del trabajador</label>
              <Input
                placeholder="12.345.678-9"
                value={actionRut}
                onChange={(e) => setActionRut(e.target.value)}
                disabled={busy}
              />
            </div>
            <div className="flex items-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleAnonymize}
                disabled={busy || !actionRut.trim()}
                className="border-amber-300 text-amber-700 hover:bg-amber-50"
              >
                <UserX size={14} /> Anonimizar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeleteGdpr}
                disabled={busy || !actionRut.trim()}
                className="border-red-300 text-red-700 hover:bg-red-50"
              >
                <Trash2 size={14} /> Eliminar total
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-2">
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck size={16} className="text-slate-500" />
          <h4 className="text-sm font-semibold text-slate-700">
            Descargo de Responsabilidad — Tratamiento de Datos
          </h4>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
          {DATA_PROTECTION_DISCLAIMER}
        </p>
      </div>
    </div>
  );
}
