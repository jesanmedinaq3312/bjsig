import { useMemo } from "react";
import { Card } from "@/components/ui";
import type { CalendarEvent } from "@/lib/types";
import { EVENT_META, SEVERITY_DOT } from "./constants";

export function AgendaView({
  events,
}: {
  events: CalendarEvent[];
  cursor: Date;
  setCursor: (d: Date) => void;
}) {
  const sorted = useMemo(
    () => [...events].sort((a, b) => b.event_date.localeCompare(a.event_date)),
    [events],
  );
  const grouped = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    sorted.forEach((e) => {
      const arr = map.get(e.event_date) ?? [];
      arr.push(e);
      map.set(e.event_date, arr);
    });
    return Array.from(map.entries());
  }, [sorted]);

  return (
    <Card>
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
        <h3 className="font-semibold text-slate-800">Línea de Tiempo / Agenda</h3>
        <span className="text-xs text-slate-500">{sorted.length} eventos · orden descendente</span>
      </div>
      <div className="max-h-[600px] overflow-y-auto">
        {grouped.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">Sin eventos</p>
        ) : (
          grouped.map(([date, evs]) => (
            <div key={date} className="flex gap-4 px-5 py-3 border-b border-slate-100">
              <div className="w-24 shrink-0">
                <p className="text-xs font-semibold text-slate-700">
                  {new Date(date + "T00:00").toLocaleDateString("es-CL", {
                    day: "numeric",
                    month: "short",
                  })}
                </p>
                <p className="text-[10px] text-slate-400">
                  {new Date(date + "T00:00").toLocaleDateString("es-CL", { weekday: "short" })}
                </p>
              </div>
              <div className="flex-1 space-y-1.5">
                {evs.map((e) => {
                  const meta = EVENT_META[e.event_type];
                  return (
                    <div key={e.id} className="flex items-start gap-2">
                      <span
                        className={`mt-1 w-2 h-2 rounded-full shrink-0 ${SEVERITY_DOT[e.severity_level]}`}
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] ${meta.color}`}>{meta.icon}</span>
                          <span className="text-sm text-slate-700">{e.title}</span>
                        </div>
                        <p className="text-xs text-slate-400">{e.details}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
