import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card, Button } from "@/components/ui";
import type { CalendarEvent } from "@/lib/types";
import { EVENT_META } from "./constants";

export function MonthView({
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
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1);
  const startWeekday = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

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
            onClick={() => setCursor(new Date(year, month - 1, 1))}
            className="p-1.5 rounded hover:bg-slate-100"
          >
            <ChevronLeft size={18} />
          </button>
          <h3 className="font-semibold text-slate-800 capitalize">
            {cursor.toLocaleDateString("es-CL", { month: "long", year: "numeric" })}
          </h3>
          <button
            onClick={() => setCursor(new Date(year, month + 1, 1))}
            className="p-1.5 rounded hover:bg-slate-100"
          >
            <ChevronRight size={18} />
          </button>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setCursor(new Date())}>
          Hoy
        </Button>
      </div>
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
        {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
          <div
            key={d}
            className="px-2 py-2 text-center text-xs font-medium text-slate-500 uppercase"
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((date, i) => {
          if (!date)
            return (
              <div
                key={i}
                className="min-h-[96px] border-r border-b border-slate-100 bg-slate-50/50"
              />
            );
          const dateStr = date.toISOString().slice(0, 10);
          const dayEvents = byDate.get(dateStr) ?? [];
          const isToday = dateStr === todayStr;
          return (
            <div
              key={i}
              className="min-h-[96px] border-r border-b border-slate-100 p-1.5 cursor-pointer hover:bg-blue-50/50 transition-colors"
              onClick={() => onDayClick(dateStr, dayEvents)}
            >
              <div
                className={`text-xs font-medium mb-1 inline-flex items-center justify-center w-6 h-6 rounded-full ${isToday ? "bg-blue-600 text-white" : "text-slate-600"}`}
              >
                {date.getDate()}
              </div>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map((e) => {
                  const meta = EVENT_META[e.event_type];
                  return (
                    <div
                      key={e.id}
                      className={`text-[10px] px-1 py-0.5 rounded border truncate ${meta.bg} ${meta.color}`}
                      title={e.title}
                    >
                      {meta.icon} {e.title}
                    </div>
                  );
                })}
                {dayEvents.length > 3 && (
                  <div className="text-[10px] text-slate-400 px-1">+{dayEvents.length - 3} más</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
