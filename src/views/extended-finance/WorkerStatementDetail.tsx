import { ArrowLeft, Wallet, TrendingUp, TrendingDown, FileSpreadsheet } from "lucide-react";
import { Card, CardHeader, Button, Badge, EmptyState } from "@/components/ui";
import type { WorkerPaymentStatement, Worker } from "@/lib/types";
import { ENTRY_TYPE_LABELS, ENTRY_TYPE_COLORS, fmtCL, fmtDate } from "./constants";

export function WorkerStatementDetail({
  worker,
  statements,
  onBack,
}: {
  worker: Worker;
  statements: WorkerPaymentStatement[];
  onBack: () => void;
}) {
  const workerStatements = statements.filter((s) => s.worker_rut === worker.rut);
  const totalPaid = workerStatements
    .filter((s) => s.amount > 0)
    .reduce((sum, s) => sum + Number(s.amount), 0);
  const totalDeducted = workerStatements
    .filter((s) => s.amount < 0)
    .reduce((sum, s) => sum + Math.abs(Number(s.amount)), 0);
  const netBalance = totalPaid - totalDeducted;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft size={16} /> Volver
        </Button>
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Cartola de {worker.full_name}</h2>
          <p className="text-xs text-slate-500">{worker.rut}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-emerald-600 text-xs font-medium mb-1">
            <TrendingUp size={14} /> Total pagado
          </div>
          <p className="text-xl font-bold text-emerald-700">{fmtCL(totalPaid)}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-red-600 text-xs font-medium mb-1">
            <TrendingDown size={14} /> Total descontado
          </div>
          <p className="text-xl font-bold text-red-700">{fmtCL(totalDeducted)}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-1">
            <Wallet size={14} /> Saldo neto
          </div>
          <p className="text-xl font-bold text-slate-800">{fmtCL(netBalance)}</p>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Historial completo"
          subtitle={`${workerStatements.length} movimientos`}
        />
        {workerStatements.length === 0 ? (
          <EmptyState
            message="Sin movimientos registrados"
            icon={<FileSpreadsheet size={28} className="text-slate-300" />}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Período</th>
                  <th className="text-left px-4 py-2 font-medium">Tipo</th>
                  <th className="text-left px-4 py-2 font-medium">Descripción</th>
                  <th className="text-right px-4 py-2 font-medium">Monto</th>
                  <th className="text-left px-4 py-2 font-medium">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {workerStatements.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-medium text-slate-700">{s.period_label}</td>
                    <td className="px-4 py-2.5">
                      <Badge className={ENTRY_TYPE_COLORS[s.entry_type]}>
                        {ENTRY_TYPE_LABELS[s.entry_type]}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">{s.description ?? "—"}</td>
                    <td
                      className={`px-4 py-2.5 text-right font-semibold ${Number(s.amount) >= 0 ? "text-emerald-700" : "text-red-700"}`}
                    >
                      {Number(s.amount) >= 0 ? "+" : ""}
                      {fmtCL(Number(s.amount))}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-400">
                      {fmtDate(s.created_at ?? null)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
