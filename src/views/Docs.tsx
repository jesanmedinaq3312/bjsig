import { useMemo, useState } from "react";
import { FileSpreadsheet, FileText, FileX, AlertTriangle } from "lucide-react";
import { Card, CardHeader, Button, Badge, Spinner, EmptyState } from "@/components/ui";
import { ExportService } from "@/lib/export";
import { ExpiryService, type ExpiryStatus } from "@/lib/expiry";
import type { AppData } from "@/hooks/useAppData";

export function DocsView({ data }: { data: AppData }) {
  const { workers, loading } = data;
  const [filter, setFilter] = useState<ExpiryStatus | "all">("all");
  const today = new Date();

  const matrix = useMemo(() => {
    return workers.map((w) => {
      const exam = ExpiryService.check(w.occupational_exam_exp_date, today);
      const lic = ExpiryService.check(w.driver_license_exp_date, today);
      const irl = ExpiryService.check(w.irl_signed_date, today);
      return { worker: w, exam, lic, irl };
    });
  }, [workers]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    if (filter === "all") return matrix;
    return matrix.filter(
      (m) => m.exam.status === filter || m.lic.status === filter || m.irl.status === filter,
    );
  }, [matrix, filter]);

  const counts = useMemo(() => {
    const c: Record<ExpiryStatus, number> = {
      vigente: 0,
      "por-vencer": 0,
      vencido: 0,
      "no-registrado": 0,
    };
    matrix.forEach((m) => {
      [m.exam, m.lic, m.irl].forEach((chk) => {
        c[chk.status]++;
      });
    });
    return c;
  }, [matrix]);

  function exportExcel() {
    ExportService.toExcel(
      filtered.map((m) => ({
        RUT: m.worker.rut,
        Nombre: m.worker.full_name,
        Cargo: m.worker.position,
        "Examen Ocup.": m.worker.occupational_exam_exp_date ?? "No registrado",
        "Estado Examen": m.exam.label,
        "Licencia Cond.": m.worker.driver_license_exp_date ?? "No registrado",
        "Estado Licencia": m.lic.label,
        "IRL/ODI": m.worker.irl_signed_date ?? "No registrado",
        "Estado IRL": m.irl.label,
      })),
      "Matriz Documentos",
      "matriz_documentos_gyc",
    );
  }

  function exportPdf() {
    ExportService.toPdf(
      "Matriz de Documentación y Alertas por Vencer",
      ["RUT", "Nombre", "Cargo", "Examen", "Licencia", "IRL/ODI", "Estado"],
      filtered.map((m) => [
        m.worker.rut,
        m.worker.full_name,
        m.worker.position,
        m.worker.occupational_exam_exp_date ?? "—",
        m.worker.driver_license_exp_date ?? "—",
        m.worker.irl_signed_date ?? "—",
        m.exam.status === "vencido" || m.lic.status === "vencido" || m.irl.status === "vencido"
          ? "Vencido"
          : "OK",
      ]),
      "matriz_documentos_gyc",
      "Semáforo de exámenes, licencias e IRL/ODI — DS 44",
    );
  }

  if (loading) return <Spinner />;

  const summaryCards = [
    {
      label: "Vigentes",
      value: counts.vigente,
      tone: "bg-emerald-50 text-emerald-700 border-emerald-200",
      dot: "bg-emerald-500",
    },
    {
      label: "Por Vencer (30 días)",
      value: counts["por-vencer"],
      tone: "bg-amber-50 text-amber-700 border-amber-200",
      dot: "bg-amber-500",
    },
    {
      label: "Vencidos",
      value: counts.vencido,
      tone: "bg-red-50 text-red-700 border-red-200",
      dot: "bg-red-500",
    },
    {
      label: "No Registrados",
      value: counts["no-registrado"],
      tone: "bg-slate-50 text-slate-600 border-slate-200",
      dot: "bg-slate-400",
    },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((c) => (
          <Card key={c.label} className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className={`w-2.5 h-2.5 rounded-full ${c.dot}`} />
              <span className="text-xs text-slate-500">{c.label}</span>
            </div>
            <p className="text-2xl font-bold text-slate-800">{c.value}</p>
          </Card>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <FilterBtn label="Todos" active={filter === "all"} onClick={() => setFilter("all")} />
          <FilterBtn
            label="Vencidos"
            active={filter === "vencido"}
            onClick={() => setFilter("vencido")}
            tone="red"
          />
          <FilterBtn
            label="Por vencer"
            active={filter === "por-vencer"}
            onClick={() => setFilter("por-vencer")}
            tone="amber"
          />
          <FilterBtn
            label="No registrados"
            active={filter === "no-registrado"}
            onClick={() => setFilter("no-registrado")}
            tone="slate"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportExcel}>
            <FileSpreadsheet size={15} /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={exportPdf}>
            <FileText size={15} /> PDF
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader
          title="Matriz de Documentación por Vencer"
          subtitle="IRL/ODI por cargo (DS 44), exámenes preocupacionales y ocupacionales, licencias y certificaciones"
        />
        {filtered.length === 0 ? (
          <EmptyState
            message="No hay trabajadores que coincidan con el filtro"
            icon={<FileX size={32} />}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs text-slate-500 uppercase">
                  <th className="px-4 py-2.5 font-medium">Trabajador</th>
                  <th className="px-4 py-2.5 font-medium">Cargo</th>
                  <th className="px-4 py-2.5 font-medium">Examen Ocupacional</th>
                  <th className="px-4 py-2.5 font-medium">Licencia Conducir</th>
                  <th className="px-4 py-2.5 font-medium">IRL / ODI</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => (
                  <tr key={m.worker.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{m.worker.full_name}</p>
                      <p className="text-xs text-slate-400 font-mono">{m.worker.rut}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{m.worker.position}</td>
                    <td className="px-4 py-3">
                      <DocCell date={m.worker.occupational_exam_exp_date} check={m.exam} />
                    </td>
                    <td className="px-4 py-3">
                      <DocCell date={m.worker.driver_license_exp_date} check={m.lic} />
                    </td>
                    <td className="px-4 py-3">
                      <DocCell date={m.worker.irl_signed_date} check={m.irl} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex gap-3">
          <AlertTriangle size={20} className="text-blue-600 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">Recordatorio normativo (DS 44 / DS 594)</p>
            <p className="text-blue-700">
              La IRL/ODI por cargo es la inducción específica que la empresa debe entregar al
              trabajador para su puesto. Los exámenes preocupacionales y ocupacionales (alturas,
              espacios confinados) deben mantenerse vigentes. La licencia de conducir y
              certificaciones (rigger, soldador) requieren control de vencimiento.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function DocCell({
  date,
  check,
}: {
  date: string | null;
  check: { status: ExpiryStatus; label: string; daysRemaining: number | null };
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-slate-600">{date ?? "—"}</p>
      <Badge className={ExpiryService.color(check.status)}>
        <span className={`w-1.5 h-1.5 rounded-full ${ExpiryService.dot(check.status)}`} />
        {check.label}
        {check.daysRemaining !== null && check.status !== "no-registrado" && (
          <span className="ml-1 opacity-70">({check.daysRemaining}d)</span>
        )}
      </Badge>
    </div>
  );
}

function FilterBtn({
  label,
  active,
  onClick,
  tone,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  tone?: "red" | "amber" | "slate";
}) {
  const tones = {
    red: "bg-red-600",
    amber: "bg-amber-500",
    slate: "bg-slate-500",
  };
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
        active
          ? tone
            ? `${tones[tone]} text-white border-transparent`
            : "bg-blue-600 text-white border-transparent"
          : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
      }`}
    >
      {label}
    </button>
  );
}
