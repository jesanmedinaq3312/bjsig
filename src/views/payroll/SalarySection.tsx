import { Wallet } from "lucide-react";
import { Card, CardHeader, Button, EmptyState } from "@/components/ui";
import { fmtCLP } from "./utils";
import type { Worker } from "@/lib/types";

interface Props {
  workers: Worker[];
  onConfigure: (w: Worker) => void;
}

export function SalarySection({ workers, onConfigure }: Props) {
  return (
    <Card>
      <CardHeader
        title="Parámetros Salariales por Trabajador"
        subtitle="Configura sueldo base, tasas AFP/Salud, bonos y asignaciones para el cálculo de liquidaciones"
      />
      {workers.length === 0 ? (
        <EmptyState message="No hay trabajadores registrados" />
      ) : (
        <div className="divide-y divide-slate-100">
          {workers.map((w) => (
            <div key={w.id} className="px-5 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-slate-700 truncate">{w.full_name}</p>
                <p className="text-xs text-slate-500">
                  {w.rut} · {w.position ?? "Sin cargo"}
                </p>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-slate-500 hidden sm:inline">
                  {fmtCLP(Number(w.base_salary ?? 0))}
                </span>
                <Button size="sm" variant="outline" onClick={() => onConfigure(w)}>
                  <Wallet size={13} /> Configurar
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
