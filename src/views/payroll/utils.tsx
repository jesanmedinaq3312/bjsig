import { Clock, Calculator, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui";
import { fmtCLP, totalDeductions, calculatePayrollItem } from "@/lib/payroll";

// eslint-disable-next-line react-refresh/only-export-components -- mixed component and stable API export is intentional here
export { fmtCLP, totalDeductions, calculatePayrollItem };
export { MONTHS } from "@/lib/payroll";

// eslint-disable-next-line react-refresh/only-export-components -- mixed component and stable API export is intentional here
export function statusBadge(status: string) {
  const map: Record<string, { cls: string; icon: React.ReactNode }> = {
    borrador: { cls: "bg-slate-100 text-slate-600 border-slate-200", icon: <Clock size={11} /> },
    pendiente: { cls: "bg-slate-100 text-slate-600 border-slate-200", icon: <Clock size={11} /> },
    calculado: { cls: "bg-blue-50 text-blue-700 border-blue-200", icon: <Calculator size={11} /> },
    aprobado: {
      cls: "bg-amber-50 text-amber-700 border-amber-200",
      icon: <CheckCircle2 size={11} />,
    },
    pagado: {
      cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
      icon: <CheckCircle2 size={11} />,
    },
  };
  const s = map[status] ?? map.borrador;
  return (
    <Badge className={s.cls}>
      {s.icon} {status}
    </Badge>
  );
}
