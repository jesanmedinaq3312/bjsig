import { useState, useMemo } from "react";
import { History, FileDown } from "lucide-react";
import { Card, CardHeader, Button, Select, Badge, EmptyState } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { ExportPdf } from "@/lib/exportPdf";
import { ExportExcel } from "@/lib/exportExcel";
import type { ShiftChangeLog, ShiftChangeType, ShiftDurationType, Worker } from "@/lib/types";
import { CHANGE_TYPE_LABELS, DURATION_LABELS, fmtDate } from "./constants";

const TYPE_COLORS: Record<ShiftChangeType, string> = {
  creacion: "bg-emerald-50 text-emerald-700 border-emerald-200",
  modificacion: "bg-blue-50 text-blue-700 border-blue-200",
  intercambio: "bg-amber-50 text-amber-700 border-amber-200",
  desactivacion: "bg-red-50 text-red-600 border-red-200",
  reactivacion: "bg-teal-50 text-teal-700 border-teal-200",
};

export function HistoryTab({
  shiftChangeLogs,
  workerMap,
}: {
  shiftChangeLogs: ShiftChangeLog[];
  workerMap: Map<string, Worker>;
}) {
  const toast = useToast();
  const [filterRut, setFilterRut] = useState("");

  const filtered = useMemo(() => {
    if (!filterRut) return shiftChangeLogs;
    return shiftChangeLogs.filter((l) => l.worker_rut === filterRut);
  }, [shiftChangeLogs, filterRut]);

  async function exportHistory(format: "pdf" | "excel") {
    const rows = filtered.map((l) => {
      const w = workerMap.get(l.worker_rut);
      const swapW = l.swap_with_rut ? workerMap.get(l.swap_with_rut) : null;
      return {
        Fecha: l.created_at ? new Date(l.created_at).toLocaleString("es-CL") : "",
        Trabajador: w?.full_name ?? l.worker_rut,
        RUT: l.worker_rut,
        "Tipo Cambio": CHANGE_TYPE_LABELS[l.change_type],
        "Turno Anterior": l.old_shift_name ?? "—",
        "Turno Nuevo": l.new_shift_name ?? "—",
        "Duración Anterior": l.old_duration_type ?? "—",
        "Duración Nueva": l.new_duration_type ?? "—",
        "Término Anterior": fmtDate(l.old_end_date),
        "Término Nuevo": fmtDate(l.new_end_date),
        Intercambio: swapW?.full_name ?? "",
        Motivo: l.data?.reason ?? l.reason ?? "",
        "Modificado por": l.data?.changed_by_email ?? l.changed_by_email,
      };
    });

    if (rows.length === 0) {
      toast.error("Sin datos", "No hay historial para exportar");
      return;
    }

    try {
      if (format === "pdf") {
        const headers = [
          "Fecha",
          "Trabajador",
          "RUT",
          "Tipo",
          "Turno Ant.",
          "Turno Nuevo",
          "Intercambio",
          "Motivo",
          "Por",
        ];
        const body = rows.map((r) => [
          r.Fecha,
          r.Trabajador,
          r.RUT,
          r["Tipo Cambio"],
          r["Turno Anterior"],
          r["Turno Nuevo"],
          r.Intercambio,
          r.Motivo,
          r["Modificado por"],
        ]);
        await ExportPdf.toPdf(
          "Historial de Cambios de Turno",
          headers,
          body,
          "historial_turnos",
          "Registro de todos los cambios de asignación",
        );
      } else {
        await ExportExcel.toExcel(rows, "Historial", "historial_turnos");
      }
      toast.success("Exportado", `Historial exportado a ${format.toUpperCase()}`);
    } catch (e) {
      toast.error("Error al exportar", (e as Error).message);
    }
  }

  return (
    <Card>
      <CardHeader
        title="Historial de Cambios de Turno"
        subtitle="Registro completo de cada asignación, modificación, intercambio y desactivación."
        action={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => exportHistory("pdf")}>
              <FileDown size={15} /> PDF
            </Button>
            <Button size="sm" variant="outline" onClick={() => exportHistory("excel")}>
              <FileDown size={15} /> Excel
            </Button>
          </div>
        }
      />
      <div className="px-5 pb-3">
        <Select value={filterRut} onChange={(e) => setFilterRut(e.target.value)}>
          <option value="">Todos los trabajadores</option>
          {Array.from(workerMap.values())
            .sort((a, b) => a.full_name.localeCompare(b.full_name))
            .map((w) => (
              <option key={w.rut} value={w.rut}>
                {w.full_name} ({w.rut})
              </option>
            ))}
        </Select>
      </div>
      {filtered.length === 0 ? (
        <EmptyState message="No hay cambios registrados" icon={<History size={32} />} />
      ) : (
        <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
          {filtered.map((log) => {
            const w = workerMap.get(log.worker_rut);
            const swapW = log.swap_with_rut ? workerMap.get(log.swap_with_rut) : null;
            return (
              <div key={log.id} className="px-5 py-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={TYPE_COLORS[log.change_type]}>
                    {CHANGE_TYPE_LABELS[log.change_type]}
                  </Badge>
                  <p className="text-sm font-medium text-slate-800">
                    {w?.full_name ?? log.worker_rut}
                  </p>
                  <span className="text-xs text-slate-400">
                    {log.created_at ? new Date(log.created_at).toLocaleString("es-CL") : ""}
                  </span>
                </div>
                <div className="mt-1.5 text-xs text-slate-500 space-y-0.5">
                  {log.old_shift_name && log.new_shift_name && (
                    <p>
                      {log.old_shift_name} →{" "}
                      <span className="font-medium text-slate-700">{log.new_shift_name}</span>
                    </p>
                  )}
                  {log.old_shift_name && !log.new_shift_name && (
                    <p>
                      Desactivado:{" "}
                      <span className="font-medium text-slate-700">{log.old_shift_name}</span>
                    </p>
                  )}
                  {!log.old_shift_name && log.new_shift_name && (
                    <p>
                      Asignado:{" "}
                      <span className="font-medium text-slate-700">{log.new_shift_name}</span>
                    </p>
                  )}
                  {log.new_duration_type && (
                    <p>
                      Duración:{" "}
                      {DURATION_LABELS[log.new_duration_type as ShiftDurationType] ??
                        log.new_duration_type}
                    </p>
                  )}
                  {log.new_end_date && <p>Hasta: {fmtDate(log.new_end_date)}</p>}
                  {swapW && <p className="text-amber-600">Intercambio con {swapW.full_name}</p>}
                  {(log.data?.reason ?? log.reason) && (
                    <p className="italic text-slate-400 mt-1">
                      Motivo: {log.data?.reason ?? log.reason}
                    </p>
                  )}
                  <p className="text-slate-300">
                    Por: {log.data?.changed_by_email ?? log.changed_by_email}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
