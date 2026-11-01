import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { Card, Badge, InfoTooltip } from "@/components/ui";
import type { CalendarEvent } from "@/lib/types";
import { EVENT_META, SEVERITY_DOT } from "./constants";

export function VirtualizedTable({ events }: { events: CalendarEvent[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 50 });
  const ROW_HEIGHT = 40;
  const BUFFER = 10;

  const sorted = useMemo(
    () => [...events].sort((a, b) => b.event_date.localeCompare(a.event_date)),
    [events],
  );

  const updateRange = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const scrollTop = el.scrollTop;
    const viewportHeight = el.clientHeight;
    const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - BUFFER);
    const end = Math.min(
      sorted.length,
      Math.ceil((scrollTop + viewportHeight) / ROW_HEIGHT) + BUFFER,
    );
    setVisibleRange({ start, end });
  }, [sorted.length]);

  useEffect(() => {
    updateRange();
  }, [updateRange]);

  const visibleEvents = sorted.slice(visibleRange.start, visibleRange.end);
  const totalHeight = sorted.length * ROW_HEIGHT;
  const offsetY = visibleRange.start * ROW_HEIGHT;

  return (
    <Card>
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
        <h3 className="font-semibold text-slate-800">Tabla Virtualizada de Alto Rendimiento</h3>
        <InfoTooltip text="Renderizado virtualizado: solo se dibujan las filas visibles en pantalla, permitiendo manejar miles de eventos sin lag. Scroll fluido incluso con más de 10.000 registros." />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs text-slate-500 uppercase">
              <th className="px-4 py-2.5 font-medium">Fecha</th>
              <th className="px-4 py-2.5 font-medium">Tipo</th>
              <th className="px-4 py-2.5 font-medium">Severidad</th>
              <th className="px-4 py-2.5 font-medium">Título</th>
              <th className="px-4 py-2.5 font-medium">Detalle</th>
            </tr>
          </thead>
        </table>
      </div>
      <div ref={containerRef} onScroll={updateRange} className="overflow-y-auto max-h-[560px]">
        <div style={{ height: totalHeight, position: "relative" }}>
          <table
            className="w-full text-sm absolute top-0 left-0"
            style={{ transform: `translateY(${offsetY}px)` }}
          >
            <tbody>
              {visibleEvents.map((e) => {
                const meta = EVENT_META[e.event_type];
                return (
                  <tr
                    key={e.id}
                    className="border-b border-slate-100 hover:bg-slate-50"
                    style={{ height: ROW_HEIGHT }}
                  >
                    <td className="px-4 py-2 text-slate-600 whitespace-nowrap">{e.event_date}</td>
                    <td className="px-4 py-2">
                      <Badge className={meta.bg + " " + meta.color + " border"}>
                        {meta.icon} {meta.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`inline-block w-2.5 h-2.5 rounded-full ${SEVERITY_DOT[e.severity_level]}`}
                      />
                    </td>
                    <td className="px-4 py-2 text-slate-700 truncate max-w-xs">{e.title}</td>
                    <td className="px-4 py-2 text-slate-500 truncate max-w-md">{e.details}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <div className="px-5 py-2 border-t border-slate-200 text-xs text-slate-500">
        Mostrando {visibleEvents.length} de {sorted.length} eventos (filas {visibleRange.start + 1}–
        {visibleRange.end})
      </div>
    </Card>
  );
}
