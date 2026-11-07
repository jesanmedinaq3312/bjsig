import { useState, useMemo } from "react";
import {
  CheckCircle,
  Clock,
  Gift,
  Megaphone,
  Tag,
  Film,
  Banknote,
  Info,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Badge, Button, EmptyState } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { circularAckRepo } from "@/lib/repositories";
import type { WorkerPortalData } from "@/hooks/useWorkerData";
import type { CircularCategory } from "@/lib/types";
import { Section } from "./components";

const CATEGORY_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  descuentos: {
    label: "Descuentos y afiliados",
    icon: <Tag size={16} className="text-emerald-600" />,
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  entretencion: {
    label: "Cultura y entretención",
    icon: <Film size={16} className="text-amber-600" />,
    color: "bg-amber-50 text-amber-700 border-amber-200",
  },
  caja_compensacion: {
    label: "Caja de compensación",
    icon: <Banknote size={16} className="text-blue-600" />,
    color: "bg-blue-50 text-blue-700 border-blue-200",
  },
  beneficios: {
    label: "Beneficios",
    icon: <Gift size={16} className="text-rose-600" />,
    color: "bg-rose-50 text-rose-700 border-rose-200",
  },
  informacion: {
    label: "Información general",
    icon: <Info size={16} className="text-slate-500" />,
    color: "bg-slate-100 text-slate-600 border-slate-200",
  },
};

const SECTION_ORDER: CircularCategory[] = [
  "descuentos",
  "entretencion",
  "caja_compensacion",
  "beneficios",
  "informacion",
];

function resolveCategory(c: { category: string | null }): string {
  return c.category && CATEGORY_META[c.category] ? c.category : "informacion";
}

export function ComunicacionesTab({
  data,
  workerRut,
}: {
  data: WorkerPortalData;
  workerRut: string;
}) {
  const toast = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [localAcked, setLocalAcked] = useState<Set<string>>(
    () => new Set(data.circulars.filter((c) => c.acked).map((c) => c.id)),
  );

  const grouped = useMemo(() => {
    const map = new Map<string, typeof data.circulars>();
    for (const c of data.circulars) {
      const cat = resolveCategory(c);
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(c);
    }
    return map;
  }, [data.circulars]); // eslint-disable-line react-hooks/exhaustive-deps -- reviewed dependency set; unstable callback recreation is intentional to avoid loops

  const unackedCount = data.circulars.filter((c) => c.ack_required && !localAcked.has(c.id)).length;

  async function acknowledge(circularId: string) {
    setBusyId(circularId);
    try {
      await circularAckRepo.ackCircular(circularId, workerRut);
      setLocalAcked((previous) => new Set(previous).add(circularId));
    } catch {
      toast.error("No se pudo confirmar la lectura", "Intenta nuevamente en unos momentos.");
    } finally {
      setBusyId(null);
    }
  }

  function toggleCollapse(cat: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  if (data.circulars.length === 0) {
    return (
      <div className="space-y-6 animate-view-enter">
        <Section
          icon={<Megaphone size={18} className="text-slate-400" />}
          title="Comunicaciones y beneficios"
        >
          <EmptyState
            message="No tienes comunicaciones nuevas en este momento."
            icon={<Megaphone size={28} />}
          />
        </Section>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-view-enter">
      {unackedCount > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
          <Clock size={20} className="text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800">
            Tienes <strong>{unackedCount}</strong>{" "}
            {unackedCount === 1 ? "comunicación que requiere" : "comunicaciones que requieren"}{" "}
            confirmación de lectura.
          </p>
        </div>
      )}

      {SECTION_ORDER.map((cat) => {
        const items = grouped.get(cat);
        if (!items || items.length === 0) return null;
        const meta = CATEGORY_META[cat];
        const isCollapsed = collapsed.has(cat);
        const pendingInSection = items.filter(
          (c) => c.ack_required && !localAcked.has(c.id),
        ).length;

        return (
          <Section key={cat} icon={meta.icon} title={meta.label}>
            <button
              onClick={() => toggleCollapse(cat)}
              className="flex items-center justify-between w-full py-1 text-sm text-slate-500 hover:text-slate-700 transition-colors"
            >
              <span className="flex items-center gap-2">
                {pendingInSection > 0 && (
                  <Badge className="bg-amber-50 text-amber-700 border-amber-200">
                    {pendingInSection} pendiente{pendingInSection > 1 ? "s" : ""}
                  </Badge>
                )}
                <span className="text-xs">
                  {items.length} {items.length === 1 ? "mensaje" : "mensajes"}
                </span>
              </span>
              {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            </button>

            {!isCollapsed && (
              <div className="space-y-3 mt-3">
                {items.map((circular) => {
                  const acked = localAcked.has(circular.id);
                  return (
                    <article
                      key={circular.id}
                      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <Badge className={meta.color}>{meta.label}</Badge>
                            {circular.ack_required && (
                              <Badge
                                className={
                                  acked
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : "bg-amber-50 text-amber-700 border-amber-200"
                                }
                              >
                                {acked ? <CheckCircle size={11} /> : <Clock size={11} />}{" "}
                                {acked ? "Leída" : "Pendiente"}
                              </Badge>
                            )}
                          </div>
                          <h3 className="text-sm font-semibold text-slate-800 break-words">
                            {circular.title}
                          </h3>
                          <p className="mt-2 text-sm leading-relaxed text-slate-600 whitespace-pre-wrap break-words">
                            {circular.body}
                          </p>
                          <p className="mt-3 text-xs text-slate-400">
                            Publicado el{" "}
                            {new Date(circular.published_at).toLocaleDateString("es-CL")}
                          </p>
                        </div>
                        {circular.ack_required && !acked && (
                          <Button
                            size="sm"
                            variant="success"
                            className="w-full shrink-0 sm:w-auto"
                            loading={busyId === circular.id}
                            onClick={() => void acknowledge(circular.id)}
                          >
                            <CheckCircle size={14} /> Confirmar lectura
                          </Button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </Section>
        );
      })}
    </div>
  );
}
