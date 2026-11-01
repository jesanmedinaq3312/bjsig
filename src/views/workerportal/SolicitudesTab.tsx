import { MessageSquare, CheckCircle2, Clock, Eye, Archive, Info, ShieldCheck } from "lucide-react";
import { Badge, EmptyState } from "@/components/ui";
import type { WorkerPortalData } from "@/hooks/useWorkerData";
import { Section } from "./components";
import { CATEGORY_LABELS, STATUS_LABELS, STATUS_COLORS, STATUS_DESCRIPTIONS } from "./constants";

const STATUS_ICON: Record<string, React.ReactNode> = {
  pendiente: <Clock size={12} />,
  en_proceso: <Eye size={12} />,
  respondida: <CheckCircle2 size={12} />,
  cerrada: <Archive size={12} />,
};

const VALIDITY_LABELS: Record<string, string> = {
  pendiente: "Validez pendiente",
  valida: "Válida",
  invalida: "Inválida",
};

const VALIDITY_COLORS: Record<string, string> = {
  pendiente: "bg-slate-100 text-slate-600 border-slate-200",
  valida: "bg-teal-50 text-teal-700 border-teal-200",
  invalida: "bg-red-50 text-red-700 border-red-200",
};

const VALIDITY_DESCRIPTIONS: Record<string, string> = {
  pendiente: "Tu solicitud está siendo evaluada formalmente.",
  valida: "Tu solicitud cumple los requisitos formales y será procesada.",
  invalida: "Tu solicitud no cumple los requisitos formales. Revisa la nota del administrador.",
};

export function SolicitudesTab({ data }: { data: WorkerPortalData }) {
  return (
    <div className="space-y-6">
      <Section
        icon={<MessageSquare size={18} className="text-slate-400" />}
        title="Mis Solicitudes"
      >
        {data.requests.length === 0 ? (
          <EmptyState
            message="No has enviado solicitudes aún."
            icon={<MessageSquare size={28} />}
          />
        ) : (
          <div className="space-y-3">
            {data.requests.map((r) => (
              <div key={r.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge className="bg-blue-50 text-blue-700 border-blue-200">
                        {CATEGORY_LABELS[r.category]}
                      </Badge>
                      <Badge className={STATUS_COLORS[r.status]}>
                        <span className="flex items-center gap-1">
                          {STATUS_ICON[r.status]} {STATUS_LABELS[r.status]}
                        </span>
                      </Badge>
                    </div>
                    <p className="text-sm font-semibold text-slate-800">{r.subject}</p>
                    <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                      <Info size={11} /> {STATUS_DESCRIPTIONS[r.status]}
                    </p>
                  </div>
                  <span className="text-xs text-slate-400 shrink-0">
                    {r.created_at?.slice(0, 10)}
                  </span>
                </div>
                <p className="text-sm text-slate-600 mb-2">{r.message}</p>

                {r.validity && r.validity !== "pendiente" && (
                  <div className={`mt-2 p-3 rounded-lg border ${VALIDITY_COLORS[r.validity]}`}>
                    <p className="text-xs font-semibold flex items-center gap-1 mb-0.5">
                      <ShieldCheck size={12} /> {VALIDITY_LABELS[r.validity]}
                    </p>
                    <p className="text-xs text-slate-600">{VALIDITY_DESCRIPTIONS[r.validity]}</p>
                    {r.validity_note && (
                      <p className="text-xs italic text-slate-500 mt-1">{r.validity_note}</p>
                    )}
                  </div>
                )}

                {r.admin_reply && (
                  <div className="mt-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                    <p className="text-xs font-semibold text-emerald-700 mb-1 flex items-center gap-1">
                      <CheckCircle2 size={12} /> Respuesta del administrador
                      {r.replied_at && (
                        <span className="font-normal text-emerald-600">
                          · {new Date(r.replied_at).toLocaleDateString("es-CL")}
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-slate-700">{r.admin_reply}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
