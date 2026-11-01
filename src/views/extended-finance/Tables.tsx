import {
  CheckCircle,
  XCircle,
  Trash2,
  Eye,
  HandCoins,
  Wallet,
  Percent,
  FileSpreadsheet,
} from "lucide-react";
import { Card, Button, Badge, EmptyState } from "@/components/ui";
import type {
  SalaryAdvance,
  InternalLoan,
  WorkerDiscount,
  WorkerPaymentStatement,
  Worker,
} from "@/lib/types";
import {
  ADVANCE_STATUS_LABELS,
  ADVANCE_STATUS_COLORS,
  LOAN_STATUS_LABELS,
  LOAN_STATUS_COLORS,
  DISCOUNT_STATUS_LABELS,
  DISCOUNT_STATUS_COLORS,
  fmtCL,
  fmtDate,
} from "./constants";

interface AdvanceTableProps {
  advances: SalaryAdvance[];
  workerMap: Map<string, string>;
  canManage: boolean;
  canDelete: boolean;
  onStatusChange: (a: SalaryAdvance, status: string) => void;
  onDelete: (a: SalaryAdvance) => void;
}

export function AdvanceTable({
  advances,
  workerMap,
  canManage,
  canDelete,
  onStatusChange,
  onDelete,
}: AdvanceTableProps) {
  if (advances.length === 0)
    return (
      <EmptyState
        message="No hay anticipos registrados"
        icon={<HandCoins size={28} className="text-slate-300" />}
      />
    );
  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-slate-500 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Trabajador</th>
              <th className="text-left px-4 py-2 font-medium">Fecha solicitud</th>
              <th className="text-right px-4 py-2 font-medium">Monto</th>
              <th className="text-center px-4 py-2 font-medium">Estado</th>
              <th className="text-left px-4 py-2 font-medium">Notas</th>
              {canManage && <th className="text-center px-4 py-2 font-medium">Acciones</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {advances.map((a) => (
              <tr key={a.id} className="hover:bg-slate-50">
                <td className="px-4 py-2.5">
                  <p className="font-medium text-slate-700">
                    {workerMap.get(a.worker_rut) ?? a.worker_rut}
                  </p>
                  <p className="text-xs text-slate-400">{a.worker_rut}</p>
                </td>
                <td className="px-4 py-2.5 text-slate-600">{fmtDate(a.request_date)}</td>
                <td className="px-4 py-2.5 text-right font-semibold text-slate-800">
                  {fmtCL(Number(a.amount))}
                </td>
                <td className="px-4 py-2.5 text-center">
                  <Badge className={ADVANCE_STATUS_COLORS[a.status]}>
                    {ADVANCE_STATUS_LABELS[a.status]}
                  </Badge>
                </td>
                <td className="px-4 py-2.5 text-xs text-slate-500 max-w-[200px] truncate">
                  {a.notes ?? "—"}
                </td>
                {canManage && (
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-center gap-1">
                      {a.status === "pendiente" && (
                        <>
                          <Button
                            size="sm"
                            variant="success"
                            onClick={() => onStatusChange(a, "aprobado")}
                          >
                            <CheckCircle size={12} />
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => onStatusChange(a, "rechazado")}
                          >
                            <XCircle size={12} />
                          </Button>
                        </>
                      )}
                      {a.status === "aprobado" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onStatusChange(a, "descontado")}
                        >
                          Marcar descontado
                        </Button>
                      )}
                      {canDelete && (
                        <Button size="sm" variant="ghost" onClick={() => onDelete(a)}>
                          <Trash2 size={12} className="text-red-500" />
                        </Button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

interface LoanTableProps {
  loans: InternalLoan[];
  workerMap: Map<string, string>;
  canManage: boolean;
  canDelete: boolean;
  balances: Map<string, number>;
  onStatusChange: (l: InternalLoan, status: string) => void;
  onInstallment: (l: InternalLoan) => void;
  onDelete: (l: InternalLoan) => void;
}

export function LoanTable({
  loans,
  workerMap,
  canManage,
  canDelete,
  balances,
  onStatusChange,
  onInstallment,
  onDelete,
}: LoanTableProps) {
  if (loans.length === 0)
    return (
      <EmptyState
        message="No hay préstamos registrados"
        icon={<Wallet size={28} className="text-slate-300" />}
      />
    );
  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-slate-500 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Trabajador</th>
              <th className="text-right px-4 py-2 font-medium">Monto total</th>
              <th className="text-center px-4 py-2 font-medium">Cuotas</th>
              <th className="text-right px-4 py-2 font-medium">Descuento mensual</th>
              <th className="text-right px-4 py-2 font-medium">Saldo pendiente</th>
              <th className="text-center px-4 py-2 font-medium">Estado</th>
              {canManage && <th className="text-center px-4 py-2 font-medium">Acciones</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loans.map((l) => {
              const balance = balances.get(l.id) ?? Number(l.outstanding_balance);
              return (
                <tr key={l.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-slate-700">
                      {workerMap.get(l.worker_rut) ?? l.worker_rut}
                    </p>
                    <p className="text-xs text-slate-400">{l.worker_rut}</p>
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold text-slate-800">
                    {fmtCL(Number(l.principal_amount))}
                  </td>
                  <td className="px-4 py-2.5 text-center text-slate-600">{l.installments}</td>
                  <td className="px-4 py-2.5 text-right text-slate-600">
                    {fmtCL(Number(l.monthly_deduction))}
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold text-amber-700">
                    {fmtCL(balance)}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <Badge className={LOAN_STATUS_COLORS[l.status]}>
                      {LOAN_STATUS_LABELS[l.status]}
                    </Badge>
                  </td>
                  {canManage && (
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-center gap-1">
                        {l.status === "activo" && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => onInstallment(l)}>
                              Descontar cuota
                            </Button>
                            <Button
                              size="sm"
                              variant="success"
                              onClick={() => onStatusChange(l, "pagado")}
                            >
                              <CheckCircle size={12} /> Saldar
                            </Button>
                          </>
                        )}
                        {canDelete && (
                          <Button size="sm" variant="ghost" onClick={() => onDelete(l)}>
                            <Trash2 size={12} className="text-red-500" />
                          </Button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

interface DiscountTableProps {
  discounts: WorkerDiscount[];
  workerMap: Map<string, string>;
  canManage: boolean;
  canDelete: boolean;
  onStatusChange: (d: WorkerDiscount, status: string) => void;
  onDelete: (d: WorkerDiscount) => void;
}

export function DiscountTable({
  discounts,
  workerMap,
  canManage,
  canDelete,
  onStatusChange,
  onDelete,
}: DiscountTableProps) {
  if (discounts.length === 0)
    return (
      <EmptyState
        message="No hay descuentos registrados"
        icon={<Percent size={28} className="text-slate-300" />}
      />
    );
  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-slate-500 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Trabajador</th>
              <th className="text-left px-4 py-2 font-medium">Concepto</th>
              <th className="text-left px-4 py-2 font-medium">Fecha</th>
              <th className="text-right px-4 py-2 font-medium">Monto</th>
              <th className="text-center px-4 py-2 font-medium">Estado</th>
              {canManage && <th className="text-center px-4 py-2 font-medium">Acciones</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {discounts.map((d) => (
              <tr key={d.id} className="hover:bg-slate-50">
                <td className="px-4 py-2.5">
                  <p className="font-medium text-slate-700">
                    {workerMap.get(d.worker_rut) ?? d.worker_rut}
                  </p>
                  <p className="text-xs text-slate-400">{d.worker_rut}</p>
                </td>
                <td className="px-4 py-2.5 text-slate-600">{d.concept}</td>
                <td className="px-4 py-2.5 text-slate-600">{fmtDate(d.discount_date)}</td>
                <td className="px-4 py-2.5 text-right font-semibold text-red-700">
                  {fmtCL(Number(d.amount))}
                </td>
                <td className="px-4 py-2.5 text-center">
                  <Badge className={DISCOUNT_STATUS_COLORS[d.status]}>
                    {DISCOUNT_STATUS_LABELS[d.status]}
                  </Badge>
                </td>
                {canManage && (
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-center gap-1">
                      {d.status === "pendiente" && (
                        <Button
                          size="sm"
                          variant="success"
                          onClick={() => onStatusChange(d, "aprobado")}
                        >
                          <CheckCircle size={12} />
                        </Button>
                      )}
                      {d.status === "aprobado" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onStatusChange(d, "descontado")}
                        >
                          Marcar descontado
                        </Button>
                      )}
                      {canDelete && (
                        <Button size="sm" variant="ghost" onClick={() => onDelete(d)}>
                          <Trash2 size={12} className="text-red-500" />
                        </Button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

interface StatementTableProps {
  workers: Worker[];
  statements: WorkerPaymentStatement[];
  onView: (w: Worker) => void;
}

export function StatementTable({ workers, statements, onView }: StatementTableProps) {
  if (workers.length === 0)
    return (
      <EmptyState
        message="No hay trabajadores activos"
        icon={<FileSpreadsheet size={28} className="text-slate-300" />}
      />
    );
  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-slate-500 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Trabajador</th>
              <th className="text-right px-4 py-2 font-medium">Movimientos</th>
              <th className="text-right px-4 py-2 font-medium">Total pagado</th>
              <th className="text-right px-4 py-2 font-medium">Total descontado</th>
              <th className="text-right px-4 py-2 font-medium">Saldo neto</th>
              <th className="text-center px-4 py-2 font-medium">Ver</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {workers.map((w) => {
              const ws = statements.filter((s) => s.worker_rut === w.rut);
              const paid = ws
                .filter((s) => s.amount > 0)
                .reduce((sum, s) => sum + Number(s.amount), 0);
              const deducted = ws
                .filter((s) => s.amount < 0)
                .reduce((sum, s) => sum + Math.abs(Number(s.amount)), 0);
              const net = paid - deducted;
              return (
                <tr key={w.rut} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-slate-700">{w.full_name}</p>
                    <p className="text-xs text-slate-400">{w.rut}</p>
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-600">{ws.length}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-emerald-700">
                    {fmtCL(paid)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold text-red-700">
                    {fmtCL(deducted)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-bold text-slate-800">{fmtCL(net)}</td>
                  <td className="px-4 py-2.5 text-center">
                    <Button size="sm" variant="ghost" onClick={() => onView(w)}>
                      <Eye size={14} />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
