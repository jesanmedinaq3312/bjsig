import { Wallet, Calculator, DollarSign, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui";
import { fmtCLP } from "./utils";

interface Props {
  totalPayroll: number;
  periodsCount: number;
  workersCount: number;
  itemsCount: number;
}

export function StatsCards({ totalPayroll, periodsCount, workersCount, itemsCount }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-1">
          <Wallet size={18} className="text-blue-600" />
          <span className="text-xs text-slate-500">Total Nómina</span>
        </div>
        <p className="text-xl font-bold text-slate-800">{fmtCLP(totalPayroll)}</p>
      </Card>
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-1">
          <Calculator size={18} className="text-emerald-600" />
          <span className="text-xs text-slate-500">Períodos</span>
        </div>
        <p className="text-2xl font-bold text-slate-800">{periodsCount}</p>
      </Card>
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-1">
          <DollarSign size={18} className="text-amber-600" />
          <span className="text-xs text-slate-500">Trabajadores</span>
        </div>
        <p className="text-2xl font-bold text-slate-800">{workersCount}</p>
      </Card>
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-1">
          <CheckCircle2 size={18} className="text-emerald-600" />
          <span className="text-xs text-slate-500">Liquidaciones</span>
        </div>
        <p className="text-2xl font-bold text-slate-800">{itemsCount}</p>
      </Card>
    </div>
  );
}
