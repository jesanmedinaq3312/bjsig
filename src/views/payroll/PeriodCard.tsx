import { useQuery } from "@tanstack/react-query";
import {
  Calculator,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  DollarSign,
  Eye,
  FileSpreadsheet,
  Trash2,
} from "lucide-react";
import { Card, Button } from "@/components/ui";
import { ExportService } from "@/lib/export";
import { payrollItemRepo } from "@/lib/repositories";
import type { PayrollPeriod, PayrollItem } from "@/lib/types";
import { fmtCLP, statusBadge, totalDeductions } from "./utils";

interface Props {
  period: PayrollPeriod;
  items: PayrollItem[];
  isExpanded: boolean;
  workerName: (rut: string) => string;
  onToggleExpand: () => void;
  onCalculate: () => void;
  onApprove: () => void;
  onMarkPaid: () => void;
  onPreview: () => void;
  onDelete?: () => void;
}

export function PeriodCard({
  period,
  items,
  isExpanded,
  workerName,
  onToggleExpand,
  onCalculate,
  onApprove,
  onMarkPaid,
  onPreview,
  onDelete,
}: Props) {
  // Fetch a lightweight summary (count + total) for this period so collapsed
  // cards display correct numbers without needing the full items list in memory.
  const { data: summaryData } = useQuery({
    queryKey: ["payrollPeriodSummary", period.id],
    queryFn: async () => {
      const periodItems = await payrollItemRepo.getByPeriod(period.id);
      return {
        count: periodItems.length,
        total: periodItems.reduce((s, i) => s + Number(i.net_pay), 0),
        hasItems: periodItems.length > 0,
      };
    },
    staleTime: 120_000,
  });

  const itemCount = summaryData?.count ?? 0;
  const periodTotal = summaryData?.total ?? 0;
  const hasItems = summaryData?.hasItems ?? false;

  async function handleExport() {
    const periodItems = await payrollItemRepo.getByPeriod(period.id);
    exportPeriodToExcel(period, periodItems, workerName);
  }

  return (
    <Card>
      <div className="px-5 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="font-semibold text-slate-800 text-lg">{period.period_label}</span>
              {statusBadge(period.status)}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
              <span>
                {period.start_date} → {period.end_date}
              </span>
              <span>·</span>
              <span>{itemCount} liquidaciones</span>
              <span>·</span>
              <span className="font-semibold text-slate-700">{fmtCLP(periodTotal)}</span>
            </div>
            {period.notes && <p className="text-xs text-slate-400 mt-1">{period.notes}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {period.status === "borrador" && (
              <Button size="sm" variant="outline" onClick={onCalculate}>
                <Calculator size={14} /> Calcular
              </Button>
            )}
            {period.status === "calculado" && (
              <Button size="sm" variant="outline" onClick={onApprove}>
                <CheckCircle2 size={14} /> Aprobar
              </Button>
            )}
            {period.status === "aprobado" && (
              <Button size="sm" variant="success" onClick={onMarkPaid}>
                <DollarSign size={14} /> Marcar Pagado
              </Button>
            )}
            {hasItems && (
              <>
                <Button size="sm" variant="ghost" onClick={onPreview}>
                  <Eye size={14} /> Vista Previa
                </Button>
                <Button size="sm" variant="ghost" onClick={handleExport}>
                  <FileSpreadsheet size={14} /> Excel
                </Button>
              </>
            )}
            <button
              onClick={onToggleExpand}
              className="flex items-center gap-1 px-2 py-1.5 text-xs text-blue-600 hover:bg-blue-50 rounded font-medium"
            >
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              {isExpanded ? "Ocultar" : "Ver liquidaciones"}
            </button>
            {onDelete && (
              <button
                onClick={onDelete}
                className="p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 rounded"
                title="Eliminar período"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        </div>

        {isExpanded && (
          <div className="mt-4 overflow-x-auto">
            {items.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">
                No hay liquidaciones calculadas. Presiona "Calcular" para generar.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs text-slate-500">
                    <th className="text-left py-2 px-2 font-medium">Trabajador</th>
                    <th className="text-center py-2 px-2 font-medium">Días Pres.</th>
                    <th className="text-center py-2 px-2 font-medium">Hrs Reg.</th>
                    <th className="text-center py-2 px-2 font-medium">Hrs Ext.</th>
                    <th className="text-right py-2 px-2 font-medium">Base</th>
                    <th className="text-right py-2 px-2 font-medium">Bonos</th>
                    <th className="text-right py-2 px-2 font-medium">Descuentos</th>
                    <th className="text-right py-2 px-2 font-medium">Líquido</th>
                    <th className="text-center py-2 px-2 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {items.map((i) => (
                    <tr key={i.id} className="hover:bg-slate-50">
                      <td className="py-2 px-2 font-medium text-slate-700">
                        {workerName(i.worker_rut)}
                      </td>
                      <td className="text-center py-2 px-2 text-slate-600">{i.days_present}</td>
                      <td className="text-center py-2 px-2 text-slate-600">{i.regular_hours}h</td>
                      <td className="text-center py-2 px-2 text-slate-600">{i.overtime_hours}h</td>
                      <td className="text-right py-2 px-2 text-slate-600">
                        {fmtCLP(i.base_salary_amount)}
                      </td>
                      <td className="text-right py-2 px-2 text-slate-600">
                        {fmtCLP(i.bonus_amount)}
                      </td>
                      <td className="text-right py-2 px-2 text-red-600">
                        -{fmtCLP(totalDeductions(i))}
                      </td>
                      <td className="text-right py-2 px-2 font-bold text-slate-800">
                        {fmtCLP(i.net_pay)}
                      </td>
                      <td className="text-center py-2 px-2">{statusBadge(i.status)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200 font-semibold">
                    <td colSpan={7} className="py-2 px-2 text-right text-slate-600">
                      Total líquido:
                    </td>
                    <td className="text-right py-2 px-2 text-slate-800">{fmtCLP(periodTotal)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- mixed component and stable API export is intentional here
export function exportPeriodToExcel(
  period: PayrollPeriod,
  items: PayrollItem[],
  workerName: (rut: string) => string,
) {
  ExportService.toExcel(
    items.map((i) => ({
      RUT: i.worker_rut,
      Trabajador: workerName(i.worker_rut),
      "Días Presentes": i.days_present,
      "Días Ausente": i.days_absent,
      "Días Licencia": i.days_license,
      "Días Permiso": i.days_permission,
      "Horas Regulares": i.regular_hours,
      "Horas Extras": i.overtime_hours,
      "Sueldo Base": i.base_salary_amount,
      "Horas Extras $": i.overtime_amount,
      Colación: i.meal_allowance_amount,
      Locomoción: i.mobility_allowance_amount,
      Bonos: i.bonus_amount,
      Bruto: i.gross_income,
      Imponible: i.taxable_income,
      AFP: i.afp_deduction,
      Salud: i.health_deduction,
      Impuesto: i.tax_deduction,
      Líquido: i.net_pay,
      Estado: i.status,
    })),
    `Nómina ${period.period_label}`,
    `nomina_${period.period_year}_${period.period_month}`,
  );
}
