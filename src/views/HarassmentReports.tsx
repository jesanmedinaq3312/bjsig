import { useState, useEffect, useCallback } from "react";
import { ShieldAlert, FileText, Clock, CheckCircle2, AlertCircle, Search, Eye } from "lucide-react";
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
import { harassmentReportRepo } from "@/lib/repositories";
import { audit } from "@/lib/audit";
import type { HarassmentReport, HarassmentReportStatus, HarassmentCategory } from "@/lib/types";

const CATEGORY_LABELS: Record<HarassmentCategory, string> = {
  acoso_laboral: "Acoso Laboral",
  acoso_sexual: "Acoso Sexual",
  violencia: "Violencia en el Trabajo",
  otro: "Otro",
};

const STATUS_LABELS: Record<HarassmentReportStatus, string> = {
  recibida: "Recibida",
  en_investigacion: "En Investigación",
  cerrada: "Cerrada",
};

const STATUS_BADGES: Record<HarassmentReportStatus, string> = {
  recibida: "bg-amber-50 text-amber-700 border-amber-300",
  en_investigacion: "bg-blue-50 text-blue-700 border-blue-300",
  cerrada: "bg-emerald-50 text-emerald-700 border-emerald-300",
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("es-CL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function daysUntilDeadline(deadline: string | null): number | null {
  if (!deadline) return null;
  try {
    const diff = new Date(deadline).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
}

export function HarassmentReportsView({
  userRole,
  permissions,
}: {
  userRole?: string;
  permissions?: Record<string, boolean>;
}) {
  const [reports, setReports] = useState<HarassmentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | HarassmentReportStatus>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<HarassmentReport | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [editStatus, setEditStatus] = useState<HarassmentReportStatus>("recibida");
  const [editNotification, setEditNotification] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setReports(await harassmentReportRepo.getAll());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar denuncias");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchReports();
  }, [fetchReports]);

  const filtered = reports.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        r.description.toLowerCase().includes(q) || (r.reporter_worker_rut ?? "").includes(search)
      );
    }
    return true;
  });

  const stats = {
    total: reports.length,
    recibida: reports.filter((r) => r.status === "recibida").length,
    en_investigacion: reports.filter((r) => r.status === "en_investigacion").length,
    cerrada: reports.filter((r) => r.status === "cerrada").length,
  };

  function openDetail(r: HarassmentReport) {
    setSelected(r);
    setEditNotes(r.investigation_notes ?? "");
    setEditStatus(r.status);
    setEditNotification(r.result_notification ?? "");
  }

  async function saveUpdate() {
    if (!selected) return;
    setSaving(true);
    try {
      await harassmentReportRepo.updateInvestigation(selected.id, {
        status: editStatus,
        investigation_notes: editNotes.trim() || null,
        result_notification: editNotification.trim() || null,
      });
      void audit({
        action: "harassment.update",
        entity: "harassment_reports",
        entity_id: selected.id,
        entity_label: `Denuncia ${selected.id.slice(0, 8)}`,
        details: { status: editStatus },
      });
      setSelected(null);
      await fetchReports();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Spinner />;
  if (error) return <EmptyState message={`Error: ${error}`} icon={<AlertCircle size={32} />} />;

  return (
    <div className="space-y-6 animate-view-enter">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <ShieldAlert size={24} className="text-rose-600" />
          Canal de Denuncias — Ley Karin
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Gestión de denuncias por acoso laboral, acoso sexual y violencia en el trabajo (Ley
          21.643).
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
              <FileText size={20} className="text-slate-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Total</p>
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
              <p className="text-xs text-slate-500 font-medium">Recibidas</p>
              <p className="text-lg font-bold text-slate-800">{stats.recibida}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Search size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">En Investigación</p>
              <p className="text-lg font-bold text-slate-800">{stats.en_investigacion}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 size={20} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Cerradas</p>
              <p className="text-lg font-bold text-slate-800">{stats.cerrada}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Denuncias Recibidas"
          action={<ShieldAlert size={18} className="text-slate-400" />}
        />
        <div className="px-5 pb-4 flex flex-col sm:flex-row gap-3">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por descripción o RUT..."
            className="flex-1"
          />
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | HarassmentReportStatus)}
            className="sm:w-48"
          >
            <option value="all">Todos los estados</option>
            <option value="recibida">Recibidas</option>
            <option value="en_investigacion">En Investigación</option>
            <option value="cerrada">Cerradas</option>
          </Select>
        </div>
        <div className="px-5 pb-5">
          {filtered.length === 0 ? (
            <EmptyState
              message="No hay denuncias que coincidan con el filtro."
              icon={<ShieldAlert size={28} />}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs text-slate-500 uppercase tracking-wider">
                    <th className="py-2 pr-4 font-semibold">Fecha</th>
                    <th className="py-2 pr-4 font-semibold">Categoría</th>
                    <th className="py-2 pr-4 font-semibold">Denunciante</th>
                    <th className="py-2 pr-4 font-semibold">Descripción</th>
                    <th className="py-2 pr-4 font-semibold">Plazo Legal</th>
                    <th className="py-2 pr-4 font-semibold">Estado</th>
                    <th className="py-2 pr-4 font-semibold"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => {
                    const days = daysUntilDeadline(r.legal_deadline);
                    const overdue = days !== null && days < 0 && r.status !== "cerrada";
                    const urgent =
                      days !== null && days >= 0 && days <= 5 && r.status !== "cerrada";
                    return (
                      <tr
                        key={r.id}
                        className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors"
                      >
                        <td className="py-3 pr-4 text-slate-600 whitespace-nowrap">
                          {formatDate(r.created_at ?? null)}
                        </td>
                        <td className="py-3 pr-4">
                          <Badge className="bg-slate-100 text-slate-700 border-slate-200">
                            {CATEGORY_LABELS[r.category]}
                          </Badge>
                        </td>
                        <td className="py-3 pr-4 text-slate-600">
                          {r.reporter_worker_rut ? "Identificado" : "Anónimo"}
                        </td>
                        <td className="py-3 pr-4 text-slate-600 max-w-xs truncate">
                          {r.description}
                        </td>
                        <td className="py-3 pr-4 whitespace-nowrap">
                          {r.status === "cerrada" ? (
                            <span className="text-slate-400">{formatDate(r.legal_deadline)}</span>
                          ) : overdue ? (
                            <span className="text-red-600 font-medium">Vencido ({days}d)</span>
                          ) : urgent ? (
                            <span className="text-amber-600 font-medium">{days}d restantes</span>
                          ) : (
                            <span className="text-slate-500">
                              {days !== null ? `${days}d` : "—"}
                            </span>
                          )}
                        </td>
                        <td className="py-3 pr-4">
                          <Badge className={STATUS_BADGES[r.status]}>
                            {STATUS_LABELS[r.status]}
                          </Badge>
                        </td>
                        <td className="py-3 pr-4">
                          <Button variant="outline" size="sm" onClick={() => openDetail(r)}>
                            <Eye size={14} /> Ver
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Detalle de Denuncia"
        size="lg"
      >
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500 font-medium">Fecha de Recepción</p>
                <p className="text-sm text-slate-700">{formatDate(selected.created_at ?? null)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Plazo Legal (30 días)</p>
                <p className="text-sm text-slate-700">{formatDate(selected.legal_deadline)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Categoría</p>
                <p className="text-sm text-slate-700">{CATEGORY_LABELS[selected.category]}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Denunciante</p>
                <p className="text-sm text-slate-700">
                  {selected.reporter_worker_rut
                    ? `RUT: ${selected.reporter_worker_rut}`
                    : "Anónimo"}
                </p>
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium mb-1">Descripción de la Denuncia</p>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-700 whitespace-pre-wrap">
                {selected.description}
              </div>
            </div>
            <Select
              label="Estado de la Investigación"
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value as HarassmentReportStatus)}
            >
              <option value="recibida">Recibida</option>
              <option value="en_investigacion">En Investigación</option>
              <option value="cerrada">Cerrada</option>
            </Select>
            <Textarea
              label="Notas de Investigación (confidencial)"
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value.slice(0, 5000))}
              rows={4}
              placeholder="Registro de la investigación, entrevistas, evidencia..."
              maxLength={5000}
            />
            <Textarea
              label="Notificación de Resultado al Denunciante"
              value={editNotification}
              onChange={(e) => setEditNotification(e.target.value.slice(0, 2000))}
              rows={3}
              placeholder="Resumen del resultado que se comunicará al denunciante..."
              maxLength={2000}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSelected(null)}>
                Cancelar
              </Button>
              <Button variant="primary" loading={saving} onClick={saveUpdate}>
                Guardar Cambios
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default HarassmentReportsView;
