import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card, Button } from "@/components/ui";
import type { CalendarEvent } from "@/lib/types";
import { EVENT_META } from "./constants";

export function WeekView({
  events,
  cursor,
  setCursor,
  onDayClick,
}: {
  events: CalendarEvent[];
  cursor: Date;
  setCursor: (d: Date) => void;
  onDayClick: (date: string, events: CalendarEvent[]) => void;
}) {
  const weekStart = useMemo(() => {
    const d = new Date(cursor);
    const day = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - day);
    return d;
  }, [cursor]);

  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        return d;
      }),
    [weekStart],
  );

  const byDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach((e) => {
      const arr = map.get(e.event_date) ?? [];
      arr.push(e);
      map.set(e.event_date, arr);
    });
    return map;
  }, [events]);

  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <Card>
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const d = new Date(weekStart);
              d.setDate(d.getDate() - 7);
              setCursor(d);
            }}
            className="p-1.5 rounded hover:bg-slate-100"
          >
            <ChevronLeft size={18} />
          </button>
          <h3 className="font-semibold text-slate-800">
            {weekStart.toLocaleDateString("es-CL", { day: "numeric", month: "short" })} —{" "}
            {new Date(weekStart.getTime() + 6 * 86400000).toLocaleDateString("es-CL", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </h3>
          <button
            onClick={() => {
              const d = new Date(weekStart);
              d.setDate(d.getDate() + 7);
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
      <div className="grid grid-cols-1 md:grid-cols-7 divide-y md:divide-y-0 md:divide-x divide-slate-100">
        {days.map((date) => {
          const dateStr = date.toISOString().slice(0, 10);
          const dayEvents = byDate.get(dateStr) ?? [];
          const isToday = dateStr === todayStr;
          return (
            <div
              key={dateStr}
              className="min-h-[200px] p-2 cursor-pointer hover:bg-blue-50/30"
              onClick={() => onDayClick(dateStr, dayEvents)}
            >
              <div
                className={`text-xs font-semibold mb-2 ${isToday ? "text-blue-600" : "text-slate-600"}`}
              >
                {date.toLocaleDateString("es-CL", { weekday: "short", day: "numeric" })}
              </div>
              <div className="space-y-1">
                {dayEvents.map((e) => {
                  const meta = EVENT_META[e.event_type];
                  return (
                    <div
                      key={e.id}
                      className={`text-[11px] px-1.5 py-1 rounded border ${meta.bg} ${meta.color}`}
                      title={e.details}
                    >
                      <div className="flex items-center gap-1">
                        {meta.icon} <span className="truncate">{e.title}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
