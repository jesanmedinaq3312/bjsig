import { useEffect, useState } from "react";
import { HardHat, Save, TrendingUp } from "lucide-react";
import { systemConfigRepo } from "@/lib/repositories";
import { getCompanyName } from "@/lib/logo";
import { audit } from "@/lib/audit";
import { useToast } from "@/components/Toast";
import { useLoading } from "@/components/LoadingProvider";
import { Input, Button } from "@/components/ui";

export function SystemPanel({ isAdmin: _isAdmin }: { isAdmin: boolean }) {
  void _isAdmin;
  const toast = useToast();
  const { runWithLoading } = useLoading();
  const [utmValue, setUtmValue] = useState("");
  const [stdHours, setStdHours] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [utm, hours] = await Promise.all([
          systemConfigRepo.getValue("utm_value"),
          systemConfigRepo.getValue("standard_daily_hours"),
        ]);
        setUtmValue(utm ?? "67995");
        setStdHours(hours ?? "8");
      } catch {
        setUtmValue("67995");
        setStdHours("8");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function saveUtm() {
    const val = Number(utmValue);
    if (!val || val < 1000) {
      toast.error("Valor inválido", "La UTM debe ser un número mayor a 1.000");
      return;
    }
    try {
      await runWithLoading(async () => {
        await systemConfigRepo.setValue("utm_value", String(Math.round(val)));
        await audit({
          action: "settings.utm_update",
          entity: "system_config",
          entity_label: "utm_value",
          details: { value: Math.round(val) },
        });
        toast.success("UTM actualizada", `$${Math.round(val).toLocaleString("es-CL")}`);
      });
    } catch (e) {
      toast.error("Error", (e as Error).message);
    }
  }

  async function saveStdHours() {
    const val = Number(stdHours);
    if (!val || val < 1 || val > 24) {
      toast.error("Valor inválido", "Las horas deben estar entre 1 y 24");
      return;
    }
    try {
      await runWithLoading(async () => {
        await systemConfigRepo.setValue("standard_daily_hours", String(Math.round(val)));
        await audit({
          action: "settings.std_hours_update",
          entity: "system_config",
          entity_label: "standard_daily_hours",
          details: { value: Math.round(val) },
        });
        toast.success("Horas actualizadas", `${Math.round(val)} horas/día`);
      });
    } catch (e) {
      toast.error("Error", (e as Error).message);
    }
  }

  if (loading) return <div className="p-5 text-sm text-slate-500">Cargando...</div>;

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
        <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
          <HardHat size={20} className="text-white" />
        </div>
        <div>
          <p className="font-semibold text-slate-800 text-sm">
            {getCompanyName()} — Sistema Integrado de Gestión (SIG) Pro Edition
          </p>
          <p className="text-xs text-slate-500">
            BJ Servicios Informáticos SpA · DS 44 · DS 594 · Ley 16.744 · ISO 9001/14001/45001
          </p>
        </div>
      </div>

      <div className="p-4 rounded-xl border border-slate-200 space-y-3">
        <div className="flex items-center gap-2">
          <TrendingUp size={18} className="text-blue-600" />
          <h3 className="font-semibold text-slate-800 text-sm">Parámetros de Nómina</h3>
        </div>
        <p className="text-xs text-slate-500">
          La UTM se actualiza mensualmente según el SII. El valor ingresado aquí se usa en el
          cálculo del Impuesto Único de Segunda Categoría en cada liquidación.
        </p>

        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-600 mb-1">Valor UTM (CLP)</label>
            <Input
              type="number"
              value={utmValue}
              onChange={(e) => setUtmValue(e.target.value)}
              placeholder="67995"
            />
          </div>
          <Button size="sm" onClick={saveUtm} className="shrink-0">
            <Save size={15} /> Guardar UTM
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Horas estándar por día
            </label>
            <Input
              type="number"
              value={stdHours}
              onChange={(e) => setStdHours(e.target.value)}
              placeholder="8"
            />
          </div>
          <Button size="sm" onClick={saveStdHours} className="shrink-0">
            <Save size={15} /> Guardar
          </Button>
        </div>
      </div>
    </div>
  );
}
