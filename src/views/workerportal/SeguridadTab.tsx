import { HardHat, AlertTriangle, Shield } from "lucide-react";
import { Badge, EmptyState } from "@/components/ui";
import type { WorkerPortalData } from "@/hooks/useWorkerData";
import { Section } from "./components";

export function SeguridadTab({ data }: { data: WorkerPortalData }) {
  return (
    <div className="space-y-6">
      <Section icon={<HardHat size={18} className="text-slate-400" />} title="Mi Entrega de EPP">
        {data.epp.length === 0 ? (
          <EmptyState message="No hay registros de EPP." icon={<HardHat size={28} />} />
        ) : (
          <div className="space-y-2">
            {data.epp.slice(0, 6).map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50 border border-slate-100"
              >
                <div>
                  <p className="text-sm font-medium text-slate-700">{e.epp_item_name}</p>
                  <p className="text-xs text-slate-400">{e.delivery_date}</p>
                </div>
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                  Entregado
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section icon={<AlertTriangle size={18} className="text-slate-400" />} title="Mis Incidentes">
        {data.incidents.length === 0 ? (
          <EmptyState message="No tienes incidentes registrados." icon={<Shield size={28} />} />
        ) : (
          <div className="space-y-2">
            {data.incidents.slice(0, 6).map((inc) => (
              <div
                key={inc.id}
                className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50 border border-slate-100"
              >
                <div>
                  <p className="text-sm font-medium text-slate-700">
                    {inc.incident_code ?? inc.description}
                  </p>
                  <p className="text-xs text-slate-400">{inc.event_date}</p>
                </div>
                <Badge
                  className={
                    inc.severity === "Grave" || inc.severity === "Fatal"
                      ? "bg-red-50 text-red-700 border-red-200"
                      : "bg-amber-50 text-amber-700 border-amber-200"
                  }
                >
                  {inc.severity}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
