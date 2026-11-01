import { useMemo } from "react";
import type { AppData } from "@/hooks/useAppData";
import type { CalendarEvent } from "@/lib/types";
import { getChileHolidays } from "@/lib/holidays";

export function useCalendarEvents(data: AppData, cursorYear?: number): CalendarEvent[] {
  return useMemo(() => {
    const events: CalendarEvent[] = [];
    const workerName = (rut: string) => data.workers.find((w) => w.rut === rut)?.full_name ?? rut;

    data.shifts.forEach((s) => {
      events.push({
        id: `shift-${s.id}`,
        event_date: s.date,
        event_type: "asistencia",
        worker_rut: s.worker_rut,
        severity_level:
          s.attendance_status === "Presente"
            ? "verde"
            : s.attendance_status === "Ausente"
              ? "rojo"
              : "amarillo",
        title: `${workerName(s.worker_rut)} — ${s.attendance_status}`,
        details: `Turno: ${s.shift_name} | AST: ${s.ast_signed ? "Firmada" : "Pendiente"}`,
      });
    });

    data.eppLogs.forEach((e) => {
      events.push({
        id: `epp-${e.id}`,
        event_date: e.delivery_date,
        event_type: "epp",
        worker_rut: e.worker_rut,
        severity_level:
          e.condition === "Bueno" ? "verde" : e.condition === "Regular" ? "amarillo" : "rojo",
        title: `EPP: ${e.epp_item_name} → ${workerName(e.worker_rut)}`,
        details: `Cod DS18: ${e.certification_code_ds18 ?? "—"} | Estado: ${e.condition}`,
      });
    });

    data.incidents.forEach((i) => {
      events.push({
        id: `inc-${i.id}`,
        event_date: i.event_date,
        event_type: "incidente",
        worker_rut: i.worker_rut,
        severity_level:
          i.severity === "Grave" || i.severity === "Fatal"
            ? "rojo"
            : i.severity === "Moderado"
              ? "amarillo"
              : "verde",
        title: `${i.type}: ${i.description.slice(0, 50)}`,
        details: `Severidad: ${i.severity} | Días perdidos: ${i.days_lost}${i.reported_to_achs ? " | ACHS" : ""}`,
      });
    });

    data.astLogs.forEach((a) => {
      events.push({
        id: `ast-${a.id}`,
        event_date: a.date,
        event_type: "charla",
        worker_rut: null,
        severity_level: "azul",
        title: `Charla AST: ${a.topic}`,
        details: `${a.attendees_rut_list.length} asistentes`,
      });
    });

    data.trainings.forEach((t) => {
      events.push({
        id: `train-${t.id}`,
        event_date: t.date,
        event_type: "capacitacion",
        worker_rut: null,
        severity_level: "azul",
        title: `Capacitación: ${t.topic}`,
        details: `${t.hours}h | Instructor: ${t.trainer} | ${t.attendees_rut_list.length} asistentes`,
      });
    });

    data.isoAudits.forEach((a) => {
      events.push({
        id: `iso-${a.id}`,
        event_date:
          a.created_at?.slice(0, 10) ?? a.due_date ?? new Date().toISOString().slice(0, 10),
        event_type: "iso",
        worker_rut: null,
        severity_level:
          a.status === "Cerrada" ? "verde" : a.status === "En proceso" ? "amarillo" : "rojo",
        title: `${a.iso_standard}: ${a.finding_type}`,
        details: `Área: ${a.area} | Estado: ${a.status}`,
      });
    });

    const qrTypeLabels: Record<string, string> = {
      entrada: "Entrada",
      salida: "Salida",
      almuerzo_inicio: "Inicio Almuerzo",
      almuerzo_termino: "Fin Almuerzo",
      terreno_salida: "Salida Terreno",
      terreno_llegada: "Llegada Terreno",
    };
    data.qrScans.forEach((q) => {
      if (!q.validated) return;
      events.push({
        id: `qr-${q.id}`,
        event_date: q.scan_date,
        event_type: "qr",
        worker_rut: q.worker_rut,
        severity_level: "azul",
        title: `${workerName(q.worker_rut)} — ${qrTypeLabels[q.scan_type] ?? q.scan_type}`,
        details: `Registro QR | ${new Date(q.scan_time).toLocaleTimeString("es-CL")}`,
      });
    });

    const currentYear = new Date().getFullYear();
    const years = new Set([currentYear, cursorYear ?? currentYear]);
    years.forEach((y) => {
      getChileHolidays(y).forEach((holiday) => {
        events.push({
          id: `holiday-${holiday.date}`,
          event_date: holiday.date,
          event_type: "feriado",
          worker_rut: null,
          severity_level: "amarillo",
          title: holiday.name,
          details:
            holiday.type === "irrenunciable"
              ? "Feriado irrenunciable de Chile"
              : "Feriado legal de Chile",
        });
      });
    });

    data.workers.forEach((w) => {
      [
        ["occupational_exam_exp_date", "Examen Ocupacional"],
        ["driver_license_exp_date", "Licencia Conducir"],
        ["irl_signed_date", "IRL/ODI"],
      ].forEach(([field, label]) => {
        const dateStr = (w as unknown as Record<string, string | null>)[field];
        if (dateStr) {
          events.push({
            id: `venc-${w.id}-${field}`,
            event_date: dateStr,
            event_type: "vencimiento",
            worker_rut: w.rut,
            severity_level: "amarillo",
            title: `Vence: ${label} — ${w.full_name}`,
            details: `RUT: ${w.rut} | Fecha: ${dateStr}`,
          });
        }
      });
    });

    return events;
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps -- reviewed dependency set; unstable callback recreation is intentional to avoid loops
}
