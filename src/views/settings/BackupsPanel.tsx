import { useState, useEffect, useCallback } from "react";
import {
  Database,
  FileSpreadsheet,
  FileJson,
  Download,
  ShieldCheck,
  Info,
  CheckCircle2,
  XCircle,
  Loader2,
  DatabaseBackup,
  History,
  CalendarClock,
  Zap,
} from "lucide-react";
import { Button, Badge, Input, Select } from "@/components/ui";
import { BackupService } from "@/lib/backup";
import { backupConfigRepo, backupHistoryRepo } from "@/lib/repositories";
import { callEdgeFunction } from "@/lib/edgeFunctions";
import { useLoading } from "@/components/LoadingProvider";
import type { AppData } from "@/hooks/useAppData";

interface BackupConfig {
  id: string;
  enabled: boolean;
  frequency: string;
  retention_days: number;
  last_backup_at: string | null;
  last_backup_status: string | null;
  last_backup_size_kb: number | null;
  notify_email: string | null;
}

interface BackupHistoryEntry {
  id: string;
  backup_date: string;
  status: string;
  record_count: number | null;
  size_kb: number | null;
  notes: string | null;
}

export function BackupsPanel({
  data,
  isAdmin,
  totalRecords,
}: {
  data: AppData;
  isAdmin: boolean;
  totalRecords: number;
}) {
  const [config, setConfig] = useState<BackupConfig | null>(null);
  const [history, setHistory] = useState<BackupHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [runningBackup, setRunningBackup] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const { runWithLoading } = useLoading();

  const load = useCallback(async () => {
    setLoading(true);
    const [cfgRes, histRes] = await Promise.all([
      backupConfigRepo.getCurrent(),
      backupHistoryRepo.getRecent(10),
    ]);
    if (cfgRes) setConfig(cfgRes as BackupConfig);
    if (histRes) setHistory(histRes as unknown as BackupHistoryEntry[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function saveConfig(patch: Partial<BackupConfig>) {
    if (!isAdmin) return;
    setSaving(true);
    setMsg(null);
    try {
      await runWithLoading(async () => {
        if (!config) {
          const newCfg = await backupConfigRepo.create(patch);
          setConfig(newCfg as BackupConfig);
        } else {
          await backupConfigRepo.patch(config.id, patch);
          setConfig({ ...config, ...patch });
        }
        setMsg({ type: "ok", text: "Configuración guardada correctamente." });
      });
    } catch (err) {
      setMsg({ type: "err", text: err instanceof Error ? err.message : "Error al guardar" });
    } finally {
      setSaving(false);
    }
  }

  async function runBackupNow() {
    if (!isAdmin) return;
    setRunningBackup(true);
    setMsg(null);
    try {
      await runWithLoading(async () => {
        const { data: json, error } = await callEdgeFunction<{
          ran: boolean;
          records: number;
          size_kb: number;
        }>("daily-backup", {});
        if (error) throw new Error(error);
        setMsg({
          type: "ok",
          text: json!.ran
            ? `Respaldo ejecutado: ${json!.records} registros, ${json!.size_kb} KB.`
            : "Los respaldos automáticos están desactivados.",
        });
        await load();
        await data.reload();
      });
    } catch (err) {
      setMsg({
        type: "err",
        text: err instanceof Error ? err.message : "Error al ejecutar respaldo",
      });
    } finally {
      setRunningBackup(false);
    }
  }

  return (
    <div className="p-5 space-y-5">
      <div className="flex items-center gap-2 mb-1">
        <DatabaseBackup size={18} className="text-blue-600" />
        <h3 className="text-sm font-semibold text-slate-800">Respaldos y Exportación</h3>
        <Badge className="bg-slate-100 text-slate-600 border-slate-200">
          {totalRecords} registros
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="border border-slate-200 rounded-xl p-4 hover:border-blue-300 transition-colors">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
              <Database size={18} className="text-slate-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-800 text-sm">SQLite (.sql)</p>
              <p className="text-xs text-slate-500">Dump completo SQL</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => BackupService.toSQLite(data)}
          >
            <Download size={15} /> Exportar
          </Button>
        </div>
        <div className="border border-slate-200 rounded-xl p-4 hover:border-emerald-300 transition-colors">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
              <FileSpreadsheet size={18} className="text-emerald-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-800 text-sm">Excel (.xlsx)</p>
              <p className="text-xs text-slate-500">Multi-hoja</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => BackupService.toExcel(data)}
          >
            <Download size={15} /> Exportar
          </Button>
        </div>
        <div className="border border-slate-200 rounded-xl p-4 hover:border-amber-300 transition-colors">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
              <FileJson size={18} className="text-amber-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-800 text-sm">JSON (Backup)</p>
              <p className="text-xs text-slate-500">Respaldo completo</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => BackupService.toJSON(data)}
          >
            <Download size={15} /> Exportar
          </Button>
        </div>
      </div>

      <div className="border border-slate-200 rounded-xl p-4 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-blue-600" />
          <h4 className="text-sm font-semibold text-slate-800">Respaldo Automático Diario</h4>
        </div>
        <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700">
            Los respaldos automáticos garantizan la trazabilidad exigida por la{" "}
            <strong>Ley 16.744</strong> e <strong>ISO 45001</strong>.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 size={20} className="animate-spin text-slate-400" />
          </div>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${config?.enabled ? "bg-emerald-50" : "bg-slate-100"}`}
                >
                  <DatabaseBackup
                    size={20}
                    className={config?.enabled ? "text-emerald-600" : "text-slate-400"}
                  />
                </div>
                <div>
                  <p className="font-semibold text-slate-800 text-sm">Respaldo automático</p>
                  <p className="text-xs text-slate-500">
                    {config?.enabled
                      ? `Activo · ${config.frequency === "daily" ? "Diario" : "Semanal"} · Retención ${config.retention_days} días`
                      : "Desactivado"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => saveConfig({ enabled: !config?.enabled })}
                  disabled={saving || !isAdmin}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${config?.enabled ? "bg-emerald-500" : "bg-slate-300"} ${!isAdmin ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${config?.enabled ? "translate-x-6" : "translate-x-1"}`}
                  />
                </button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={runBackupNow}
                  loading={runningBackup}
                  disabled={!isAdmin}
                >
                  <Zap size={14} /> Ejecutar ahora
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1.5 block">
                  Frecuencia
                </label>
                <Select
                  value={config?.frequency ?? "daily"}
                  onChange={(e) => saveConfig({ frequency: e.target.value })}
                  disabled={saving || !isAdmin}
                >
                  <option value="daily">Diario</option>
                  <option value="weekly">Semanal</option>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1.5 block">
                  Retención (días)
                </label>
                <Input
                  type="number"
                  value={config?.retention_days ?? 30}
                  onChange={(e) =>
                    saveConfig({ retention_days: parseInt(e.target.value, 10) || 30 })
                  }
                  disabled={saving || !isAdmin}
                />
              </div>
            </div>

            {config?.last_backup_at && (
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <CalendarClock size={16} className="text-slate-500 shrink-0" />
                <div className="flex-1 text-xs text-slate-600">
                  <span className="font-medium">Último respaldo:</span>{" "}
                  {new Date(config.last_backup_at).toLocaleString("es-CL")}
                  {config.last_backup_size_kb && (
                    <span className="ml-2">· {config.last_backup_size_kb} KB</span>
                  )}
                </div>
                <Badge
                  className={
                    config.last_backup_status === "success"
                      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                      : "bg-red-100 text-red-700 border-red-200"
                  }
                >
                  {config.last_backup_status === "success" ? "Exitoso" : "Fallido"}
                </Badge>
              </div>
            )}

            {msg && (
              <div
                className={`flex items-start gap-2 px-3 py-2 rounded-lg text-sm ${msg.type === "err" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}
              >
                {msg.type === "err" ? (
                  <XCircle size={16} className="shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                )}
                <span>{msg.text}</span>
              </div>
            )}

            <div>
              <div className="flex items-center gap-2 mb-2">
                <History size={15} className="text-slate-500" />
                <p className="text-sm font-semibold text-slate-700">Historial</p>
                <Badge className="bg-slate-100 text-slate-600 border-slate-200">
                  {history.length}
                </Badge>
              </div>
              {history.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-3">
                  No hay respaldos registrados.
                </p>
              ) : (
                <div className="border border-slate-200 rounded-lg overflow-hidden max-h-[200px] overflow-y-auto">
                  {history.map((h) => (
                    <div
                      key={h.id}
                      className="flex items-center gap-3 px-3 py-2 border-b border-slate-100 last:border-0 hover:bg-slate-50"
                    >
                      <div
                        className={`w-2 h-2 rounded-full shrink-0 ${h.status === "success" ? "bg-emerald-500" : "bg-red-500"}`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-700">
                          {new Date(h.backup_date).toLocaleDateString("es-CL", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">{h.notes ?? h.status}</p>
                      </div>
                      <div className="text-right shrink-0">
                        {h.record_count != null && (
                          <p className="text-[11px] text-slate-600 font-medium">
                            {h.record_count} regs
                          </p>
                        )}
                        {h.size_kb != null && (
                          <p className="text-[10px] text-slate-400">{h.size_kb} KB</p>
                        )}
                      </div>
                      <Badge
                        className={
                          h.status === "success"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-red-100 text-red-700 border-red-200"
                        }
                      >
                        {h.status === "success" ? "OK" : "Fallo"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
