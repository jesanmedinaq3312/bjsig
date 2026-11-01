import { useState, useEffect, useCallback } from "react";
import {
  ShieldAlert,
  Clock,
  AlertCircle,
  CheckCircle2,
  Eye,
  Search,
  Send,
  Megaphone,
  Timer,
} from "lucide-react";
import {
  Card,
  CardHeader,
  Button,
  Select,
  Textarea,
  Modal,
  Spinner,
  Badge,
  EmptyState,
  Input,
} from "@/components/ui";
import { securityBreachRepo, getCurrentUserEmail } from "@/lib/repositories";
import { audit } from "@/lib/audit";
import { useToast } from "@/components/Toast";
import {
  computeBreachDeadlines,
  formatCountdown,
  URGENCY_STYLES,
  progressPercent,
  type BreachDeadline,
} from "@/lib/breachAlerts";
import type { SecurityBreachReport, BreachSeverity, BreachStatus } from "@/lib/types";

const SEVERITY_LABELS: Record<BreachSeverity, string> = {
  baja: "Baja",
  media: "Media",
  alta: "Alta",
  critica: "Crítica",
};
const SEVERITY_BADGES: Record<BreachSeverity, string> = {
  baja: "bg-blue-50 text-blue-700 border-blue-300",
  media: "bg-amber-50 text-amber-700 border-amber-300",
  alta: "bg-orange-50 text-orange-700 border-orange-300",
  critica: "bg-red-50 text-red-700 border-red-300",
};
const STATUS_LABELS: Record<BreachStatus, string> = {
  detectada: "Detectada",
  en_investigacion: "En Investigación",
  notificada_csirt: "CSIRT Notificado",
  notificada_titulares: "Titulares Notificados",
  cerrada: "Cerrada",
};
const STATUS_FLOW: BreachStatus[] = [
  "detectada",
  "en_investigacion",
  "notificada_csirt",
  "notificada_titulares",
  "cerrada",
];
const DATA_TYPE_OPTIONS = [
  "Nombres",
  "RUT",
  "Email",
  "Teléfono",
  "Dirección",
  "Salud",
  "Financiero",
  "Biométrico",
  "Credenciales",
  "Otros",
];

function fmtDateTime(dt: string | null): string {
  if (!dt) return "—";
  try {
    return new Date(dt).toLocaleString("es-CL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dt;
  }
}

function CountdownTimer({ deadline }: { deadline: BreachDeadline }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (deadline.isNotified || !deadline.remainingMs) return;
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [deadline.isNotified, deadline.remainingMs]);

  const style = URGENCY_STYLES[deadline.urgency];
  const totalMs = deadline.type === "csirt" ? 72 * 3600_000 : 5 * 24 * 3600_000;
  const pct = deadline.isNotified ? 100 : progressPercent(deadline.remainingMs ?? 0, totalMs);
  const countdownText = deadline.isNotified
    ? "Completado"
    : deadline.remainingMs !== null
      ? formatCountdown(deadline.remainingMs)
      : "—";
  const isOverdue = deadline.urgency === "overdue";

  return (
    <div
      className={`rounded-xl border p-4 transition-all ${style.badge} ${deadline.urgency === "critical" || isOverdue ? "ring-2 " + style.ring : ""}`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {deadline.type === "csirt" ? <Megaphone size={16} /> : <Send size={16} />}
          <span className="text-sm font-semibold">{deadline.label}</span>
        </div>
        {deadline.isNotified ? <CheckCircle2 size={18} /> : <Timer size={18} />}
      </div>
      <div className="flex items-end gap-2 mb-2">
        <span className={`text-2xl font-bold tabular-nums ${isOverdue ? "animate-pulse" : ""}`}>
          {countdownText}
        </span>
        <span className="text-xs pb-1">
          {deadline.isNotified
            ? fmtDateTime(deadline.notifiedAt)
            : isOverdue
              ? "plazo vencido"
              : "restante"}
        </span>
      </div>
      <div className="w-full h-2 rounded-full bg-black/10 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${style.bar}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-xs font-medium">{style.label}</span>
        {deadline.deadline && (
          <span className="text-xs opacity-70">Límite: {fmtDateTime(deadline.deadline)}</span>
        )}
      </div>
    </div>
  );
}

export function SecurityBreachesView({
  userRole,
  permissions,
}: {
  userRole?: string;
  permissions?: Record<string, boolean>;
}) {
  const toast = useToast();
  const [breaches, setBreaches] = useState<SecurityBreachReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | BreachStatus>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<SecurityBreachReport | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [tick, setTick] = useState(0);

  // Live countdown refresh
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchBreaches = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setBreaches(await securityBreachRepo.getAll());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar brechas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchBreaches();
  }, [fetchBreaches]);

  // Reference tick to force re-render for countdowns
  void tick;

  const filtered = breaches.filter((b) => {
    if (statusFilter !== "all" && b.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return b.title.toLowerCase().includes(q) || b.description.toLowerCase().includes(q);
    }
    return true;
  });

  const stats = {
    total: breaches.length,
    active: breaches.filter((b) => b.status !== "cerrada").length,
    csirtPending: breaches.filter((b) => !b.csirt_notified_at && b.status !== "cerrada").length,
    subjectsPending: breaches.filter((b) => !b.subjects_notified_at && b.status !== "cerrada")
      .length,
  };

  async function markNotified(breach: SecurityBreachReport, type: "csirt" | "subjects") {
    const now = new Date().toISOString();
    const updates: Record<string, unknown> = {};
    if (type === "csirt") {
      updates.csirt_notified_at = now;
      if (breach.status === "detectada" || breach.status === "en_investigacion") {
        updates.status = "notificada_csirt";
      }
    } else {
      updates.subjects_notified_at = now;
      if (breach.status === "notificada_csirt") {
        updates.status = "notificada_titulares";
      }
    }
    try {
      await securityBreachRepo.patch(breach.id, updates as Partial<SecurityBreachReport>);
    } catch {
      toast.error("Error", "No se pudo registrar la notificación.");
      return;
    }
    void audit({
      action: `breach.notify_${type}`,
      entity: "security_breach_reports",
      entity_id: breach.id,
      entity_label: breach.title,
      details: { notified_at: now },
    });
    toast.success(
      "Notificado",
      type === "csirt"
        ? "Notificación a CSIRT/ANCI registrada."
        : "Notificación a titulares registrada.",
    );
    await fetchBreaches();
  }

  async function updateStatus(breach: SecurityBreachReport, status: BreachStatus) {
    try {
      await securityBreachRepo.setStatus(breach.id, status);
    } catch {
      toast.error("Error", "No se pudo actualizar el estado.");
      return;
    }
    void audit({
      action: "breach.update_status",
      entity: "security_breach_reports",
      entity_id: breach.id,
      entity_label: breach.title,
      details: { status },
    });
    toast.success("Actualizado", "Estado de la brecha actualizado.");
    await fetchBreaches();
  }

  if (loading) return <Spinner />;
  if (error) return <EmptyState message={`Error: ${error}`} icon={<AlertCircle size={32} />} />;

  return (
    <div className="space-y-6 animate-view-enter">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ShieldAlert size={24} className="text-red-600" />
            Notificación de Brechas de Seguridad — Ley 21.663
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Registro y gestión de brechas de datos personales con plazos legales de notificación al
            CSIRT/ANCI (72h) y titulares afectados (5 días).
          </p>
        </div>
        <Button variant="primary" onClick={() => setShowCreate(true)}>
          <AlertCircle size={16} /> Registrar Brecha
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
              <ShieldAlert size={20} className="text-slate-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Total Brechas</p>
              <p className="text-lg font-bold text-slate-800">{stats.total}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <Clock size={20} className="text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Activas</p>
              <p className="text-lg font-bold text-slate-800">{stats.active}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
              <Megaphone size={20} className="text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">CSIRT Pendiente</p>
              <p className="text-lg font-bold text-slate-800">{stats.csirtPending}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
              <Send size={20} className="text-red-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Titulares Pend.</p>
              <p className="text-lg font-bold text-slate-800">{stats.subjectsPending}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Brechas Registradas"
          action={<ShieldAlert size={18} className="text-slate-400" />}
        />
        <div className="px-5 pb-4 flex flex-col sm:flex-row gap-3">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título o descripción..."
            className="flex-1"
          />
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | BreachStatus)}
            className="sm:w-48"
          >
            <option value="all">Todos los estados</option>
            {STATUS_FLOW.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
        </div>
        <div className="px-5 pb-5">
          {filtered.length === 0 ? (
            <EmptyState message="No hay brechas registradas." icon={<ShieldAlert size={28} />} />
          ) : (
            <div className="space-y-3">
              {filtered.map((b) => {
                const deadlines = computeBreachDeadlines(
                  b.csirt_deadline,
                  b.csirt_notified_at,
                  b.subjects_deadline,
                  b.subjects_notified_at,
                );
                const hasOverdue = deadlines.some((d) => d.urgency === "overdue");
                const hasCritical = deadlines.some((d) => d.urgency === "critical");
                return (
                  <div
                    key={b.id}
                    className={`rounded-xl border p-4 transition-all ${hasOverdue ? "border-red-300 bg-red-50/30" : hasCritical ? "border-orange-300 bg-orange-50/20" : "border-slate-200 bg-white"}`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="text-sm font-semibold text-slate-800">{b.title}</h3>
                          <Badge className={SEVERITY_BADGES[b.severity]}>
                            {SEVERITY_LABELS[b.severity]}
                          </Badge>
                          <Badge className="bg-slate-100 text-slate-600 border-slate-200">
                            {STATUS_LABELS[b.status]}
                          </Badge>
                          {hasOverdue && (
                            <Badge className="bg-red-100 text-red-700 border-red-300 animate-pulse">
                              Plazo Vencido
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mb-2">
                          {b.description.slice(0, 150)}
                          {b.description.length > 150 ? "..." : ""}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-slate-400">
                          <span>Detectada: {fmtDateTime(b.breach_detected_at)}</span>
                          <span>Afectados: {b.affected_subjects_count}</span>
                          {b.affected_data_types.length > 0 && (
                            <span>Datos: {b.affected_data_types.join(", ")}</span>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:w-[480px] shrink-0">
                        {deadlines.map((d) => (
                          <div
                            key={d.type}
                            className={`rounded-lg border p-3 ${URGENCY_STYLES[d.urgency].badge}`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-semibold flex items-center gap-1">
                                {d.type === "csirt" ? <Megaphone size={12} /> : <Send size={12} />}{" "}
                                {d.type === "csirt" ? "CSIRT (72h)" : "Titulares (5d)"}
                              </span>
                              {d.isNotified ? <CheckCircle2 size={14} /> : <Timer size={14} />}
                            </div>
                            <p
                              className={`text-lg font-bold tabular-nums ${d.urgency === "overdue" ? "animate-pulse" : ""}`}
                            >
                              {d.isNotified
                                ? "OK"
                                : d.remainingMs !== null
                                  ? formatCountdown(d.remainingMs)
                                  : "—"}
                            </p>
                            {!d.isNotified && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="mt-2 w-full !py-1 !text-xs"
                                onClick={() => markNotified(b, d.type)}
                              >
                                Marcar notificado
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                      <Button variant="outline" size="sm" onClick={() => setSelected(b)}>
                        <Eye size={14} /> Ver detalle
                      </Button>
                      <Select
                        value={b.status}
                        onChange={(e) => updateStatus(b, e.target.value as BreachStatus)}
                        className="!w-auto !text-xs !py-1"
                      >
                        {STATUS_FLOW.map((s) => (
                          <option key={s} value={s}>
                            {STATUS_LABELS[s]}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      {/* Detail modal */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Detalle de Brecha de Seguridad"
        size="lg"
      >
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500 font-medium">Detectada</p>
                <p className="text-sm text-slate-700">{fmtDateTime(selected.breach_detected_at)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Ocurrida</p>
                <p className="text-sm text-slate-700">{fmtDateTime(selected.breach_occurred_at)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Severidad</p>
                <Badge className={SEVERITY_BADGES[selected.severity]}>
                  {SEVERITY_LABELS[selected.severity]}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Titulares afectados</p>
                <p className="text-sm text-slate-700">{selected.affected_subjects_count}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium mb-1">Descripción</p>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-700 whitespace-pre-wrap">
                {selected.description}
              </div>
            </div>
            {selected.affected_data_types.length > 0 && (
              <div>
                <p className="text-xs text-slate-500 font-medium mb-1">Tipos de datos afectados</p>
                <div className="flex flex-wrap gap-1.5">
                  {selected.affected_data_types.map((t) => (
                    <Badge key={t} className="bg-slate-100 text-slate-600 border-slate-200">
                      {t}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {computeBreachDeadlines(
                selected.csirt_deadline,
                selected.csirt_notified_at,
                selected.subjects_deadline,
                selected.subjects_notified_at,
              ).map((d) => (
                <CountdownTimer key={d.type} deadline={d} />
              ))}
            </div>
            {selected.containment_measures && (
              <div>
                <p className="text-xs text-slate-500 font-medium mb-1">Medidas de contención</p>
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-slate-700 whitespace-pre-wrap">
                  {selected.containment_measures}
                </div>
              </div>
            )}
            {selected.investigation_notes && (
              <div>
                <p className="text-xs text-slate-500 font-medium mb-1">Notas de investigación</p>
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-slate-700 whitespace-pre-wrap">
                  {selected.investigation_notes}
                </div>
              </div>
            )}
            {selected.resolution_notes && (
              <div>
                <p className="text-xs text-slate-500 font-medium mb-1">Resolución</p>
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-slate-700 whitespace-pre-wrap">
                  {selected.resolution_notes}
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2">
              {!selected.csirt_notified_at && (
                <Button
                  variant="outline"
                  onClick={() => {
                    void markNotified(selected, "csirt");
                  }}
                >
                  <Megaphone size={14} /> Marcar CSIRT
                </Button>
              )}
              {!selected.subjects_notified_at && (
                <Button
                  variant="outline"
                  onClick={() => {
                    void markNotified(selected, "subjects");
                  }}
                >
                  <Send size={14} /> Marcar Titulares
                </Button>
              )}
              <Button variant="primary" onClick={() => setSelected(null)}>
                Cerrar
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create modal */}
      <CreateBreachModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => {
          setShowCreate(false);
          void fetchBreaches();
        }}
      />
    </div>
  );
}

function CreateBreachModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState({
    title: "",
    description: "",
    severity: "media" as BreachSeverity,
    affected_subjects_count: 0,
    breach_occurred_at: "",
    containment_measures: "",
  });
  const [dataTypes, setDataTypes] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) {
      toast.error("Campos obligatorios", "Título y descripción son requeridos.");
      return;
    }
    setSaving(true);
    try {
      const createdByEmail = await getCurrentUserEmail();
      await securityBreachRepo.create({
        title: form.title.trim(),
        description: form.description.trim(),
        severity: form.severity,
        affected_subjects_count: form.affected_subjects_count,
        affected_data_types: dataTypes,
        breach_occurred_at: form.breach_occurred_at || null,
        containment_measures: form.containment_measures.trim() || null,
        created_by_email: createdByEmail,
        status: "detectada",
      });
      void audit({
        action: "breach.create",
        entity: "security_breach_reports",
        entity_label: form.title.trim(),
        details: { severity: form.severity, affected: form.affected_subjects_count },
      });
      toast.success(
        "Brecha registrada",
        "La brecha ha sido registrada. Los plazos de notificación inician automáticamente.",
      );
      setForm({
        title: "",
        description: "",
        severity: "media",
        affected_subjects_count: 0,
        breach_occurred_at: "",
        containment_measures: "",
      });
      setDataTypes([]);
      onCreated();
    } catch {
      toast.error("Error", "No se pudo registrar la brecha.");
    } finally {
      setSaving(false);
    }
  }

  function toggleDataType(dt: string) {
    setDataTypes((prev) => (prev.includes(dt) ? prev.filter((x) => x !== dt) : [...prev, dt]));
  }

  return (
    <Modal open={open} onClose={onClose} title="Registrar Brecha de Seguridad" size="lg">
      <form onSubmit={submit} className="space-y-4">
        <Input
          label="Título"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value.slice(0, 200) })}
          placeholder="Resumen breve de la brecha"
          maxLength={200}
        />
        <Textarea
          label="Descripción"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value.slice(0, 5000) })}
          rows={4}
          placeholder="Describe qué ocurrió, qué datos se vieron comprometidos, causa raíz conocida..."
          maxLength={5000}
        />
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Severidad"
            value={form.severity}
            onChange={(e) => setForm({ ...form, severity: e.target.value as BreachSeverity })}
          >
            <option value="baja">Baja</option>
            <option value="media">Media</option>
            <option value="alta">Alta</option>
            <option value="critica">Crítica</option>
          </Select>
          <Input
            label="Titulares afectados"
            type="number"
            value={form.affected_subjects_count}
            onChange={(e) =>
              setForm({ ...form, affected_subjects_count: parseInt(e.target.value) || 0 })
            }
            min={0}
          />
        </div>
        <Input
          label="Fecha/hora de ocurrencia (opcional)"
          type="datetime-local"
          value={form.breach_occurred_at}
          onChange={(e) => setForm({ ...form, breach_occurred_at: e.target.value })}
        />
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-2">
            Tipos de datos afectados
          </label>
          <div className="flex flex-wrap gap-2">
            {DATA_TYPE_OPTIONS.map((dt) => (
              <button
                key={dt}
                type="button"
                onClick={() => toggleDataType(dt)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${dataTypes.includes(dt) ? "border-red-400 bg-red-50 text-red-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
              >
                {dt}
              </button>
            ))}
          </div>
        </div>
        <Textarea
          label="Medidas de contención (opcional)"
          value={form.containment_measures}
          onChange={(e) =>
            setForm({ ...form, containment_measures: e.target.value.slice(0, 3000) })
          }
          rows={3}
          placeholder="Acciones tomadas para contener y mitigar la brecha..."
          maxLength={3000}
        />
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
          <ShieldAlert size={16} className="text-red-600 shrink-0 mt-0.5" />
          <p className="text-xs text-red-700 leading-relaxed">
            Al registrar la brecha, los plazos legales de notificación inician automáticamente: 72
            horas para CSIRT/ANCI y 5 días para titulares afectados (Ley 21.663, Arts. 26-27).
          </p>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" loading={saving}>
            Registrar Brecha
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default SecurityBreachesView;
