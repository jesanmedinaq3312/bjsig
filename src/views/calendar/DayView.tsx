import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card, Button, Badge } from "@/components/ui";
import type { CalendarEvent } from "@/lib/types";
import { EVENT_META, SEVERITY_DOT } from "./constants";

export function DayView({
  events,
  cursor,
  setCursor,
}: {
  events: CalendarEvent[];
  cursor: Date;
  setCursor: (d: Date) => void;
}) {
  const dateStr = cursor.toISOString().slice(0, 10);
  const dayEvents = useMemo(
    () => events.filter((e) => e.event_date === dateStr),
    [events, dateStr],
  );

  return (
    <Card>
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const d = new Date(cursor);
              d.setDate(d.getDate() - 1);
              setCursor(d);
            }}
            className="p-1.5 rounded hover:bg-slate-100"
          >
            <ChevronLeft size={18} />
          </button>
          <h3 className="font-semibold text-slate-800 capitalize">
            {cursor.toLocaleDateString("es-CL", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </h3>
          <button
            onClick={() => {
              const d = new Date(cursor);
              d.setDate(d.getDate() + 1);
              setCursor(d);
            }}
            className="p-1.5 rounded hover:bg-slate-100"
          >
            <ChevronRight size={18} />
          </button>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setCursor(new Date())}>
          Hoy
        </Button>
      </div>
      <div className="p-5">
        {dayEvents.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">No hay eventos para este día</p>
        ) : (
          <div className="space-y-2">
            {dayEvents.map((e) => {
              const meta = EVENT_META[e.event_type];
              return (
                <div
                  key={e.id}
                  className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 hover:bg-slate-50"
                >
                  <span
                    className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${SEVERITY_DOT[e.severity_level]}`}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge className={meta.bg + " " + meta.color + " border"}>
                        {meta.icon} {meta.label}
                      </Badge>
                      <span className="text-sm font-medium text-slate-800">{e.title}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{e.details}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}
