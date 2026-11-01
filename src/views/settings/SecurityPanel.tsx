import { useState, useEffect, useCallback } from "react";
import { Clock, Bug, Plus, AlertTriangle, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button, Badge, Input } from "@/components/ui";
import { audit } from "@/lib/audit";
import { systemConfigRepo, honeytokenRepo } from "@/lib/repositories";
import { fetchHoneytokens } from "@/lib/honeytoken";
import { useToast } from "@/components/Toast";
import { useLoading } from "@/components/LoadingProvider";
import type { Honeytoken } from "@/lib/types";

export function SecurityPanel({ isAdmin }: { isAdmin: boolean }) {
  const [honeytokens, setHoneytokens] = useState<Honeytoken[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeoutMinutes, setTimeoutMinutes] = useState("30");
  const [savingTimeout, setSavingTimeout] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const toast = useToast();
  const { runWithLoading } = useLoading();

  const load = useCallback(async () => {
    setLoading(true);
    const [tokens, timeoutVal] = await Promise.all([
      fetchHoneytokens(),
      systemConfigRepo.getValue("session_timeout_minutes"),
    ]);
    setHoneytokens(tokens);
    if (timeoutVal) setTimeoutMinutes(timeoutVal);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function saveTimeout() {
    setSavingTimeout(true);
    setMsg(null);
    try {
      await runWithLoading(async () => {
        await systemConfigRepo.setValue("session_timeout_minutes", timeoutMinutes);
        await audit({
          action: "security.session_timeout_update",
          entity: "system_config",
          entity_label: "session_timeout_minutes",
          details: { minutes: timeoutMinutes },
        });
        setMsg({ type: "ok", text: "Tiempo de sesión actualizado." });
      });
    } catch (e) {
      setMsg({ type: "err", text: (e as Error).message });
    } finally {
      setSavingTimeout(false);
    }
  }

  async function addHoneytoken() {
    const label = prompt("Etiqueta del honeytoken (ej: RUT Falso Auditoría):");
    if (!label) return;
    const rut = prompt("RUT falso a usar como señuelo (ej: 99.999.999-9):");
    if (!rut) return;
    try {
      await runWithLoading(async () => {
        await honeytokenRepo.insert({
          token_type: "fake_worker",
          label,
          payload: { rut, full_name: label, note: "REGISTRO SEÑUELO - NO USAR" },
          triggered: false,
          triggered_at: null,
          triggered_by: null,
        });
        await audit({
          action: "security.honeytoken_create",
          entity: "honeytokens",
          entity_label: label,
          details: { rut },
        });
        await load();
        toast.success("Honeytoken creado", label);
      });
    } catch (e) {
      toast.error("Error", (e as Error).message);
    }
  }

  return (
    <div className="p-5 space-y-5">
      <div className="border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-blue-600" />
          <h4 className="text-sm font-semibold text-slate-800">Tiempo de Sesión por Inactividad</h4>
        </div>
        {msg && (
          <div
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${msg.type === "err" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}
          >
            {msg.type === "err" ? <XCircle size={16} /> : <CheckCircle2 size={16} />}
            <span>{msg.text}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min="1"
            max="1440"
            value={timeoutMinutes}
            onChange={(e) => setTimeoutMinutes(e.target.value)}
            disabled={!isAdmin}
            className="max-w-[100px]"
          />
          <span className="text-sm text-slate-500">minutos</span>
          {isAdmin && (
            <Button size="sm" onClick={saveTimeout} loading={savingTimeout}>
              Guardar
            </Button>
          )}
        </div>
      </div>

      <div className="border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bug size={16} className="text-amber-600" />
            <h4 className="text-sm font-semibold text-slate-800">Honeytokens Activos</h4>
          </div>
          {isAdmin && (
            <Button size="sm" variant="outline" onClick={addHoneytoken}>
              <Plus size={14} /> Nuevo
            </Button>
          )}
        </div>
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 size={18} className="animate-spin text-slate-400" />
          </div>
        ) : honeytokens.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-3">
            No hay honeytokens configurados.
          </p>
        ) : (
          <div className="space-y-1.5">
            {honeytokens.map((ht) => (
              <div
                key={ht.id}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border ${ht.triggered ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"}`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${ht.triggered ? "bg-red-100" : "bg-amber-100"}`}
                >
                  {ht.triggered ? (
                    <AlertTriangle size={16} className="text-red-600" />
                  ) : (
                    <Bug size={16} className="text-amber-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{ht.label}</p>
                  <p className="text-xs text-slate-500">
                    {ht.token_type === "fake_worker" ? "Trabajador falso" : ht.token_type}
                    {Boolean(ht.payload?.rut) && ` · RUT: ${String(ht.payload?.rut)}`}
                  </p>
                </div>
                <Badge
                  className={
                    ht.triggered
                      ? "bg-red-100 text-red-700 border-red-200"
                      : "bg-emerald-50 text-emerald-700 border-emerald-200"
                  }
                >
                  {ht.triggered ? "Activado" : "Vigente"}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
