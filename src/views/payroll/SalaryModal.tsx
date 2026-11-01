import { useState, useEffect } from "react";
import { Save, AlertCircle } from "lucide-react";
import { Modal, Button, Input } from "@/components/ui";
import type { Worker } from "@/lib/types";

interface Props {
  worker: Worker | null;
  onClose: () => void;
  onSave: (w: Worker, params: Partial<Worker>) => void;
}

export function SalaryModal({ worker, onClose, onSave }: Props) {
  const [baseSalary, setBaseSalary] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [overtimeRate, setOvertimeRate] = useState("1.5");
  const [mealAllowance, setMealAllowance] = useState("");
  const [mobilityAllowance, setMobilityAllowance] = useState("");
  const [afpRate, setAfpRate] = useState("10");
  const [healthRate, setHealthRate] = useState("7");
  const [bonusTarget, setBonusTarget] = useState("");

  useEffect(() => {
    if (worker) {
      setBaseSalary(String(worker.base_salary ?? ""));
      setHourlyRate(String(worker.hourly_rate ?? ""));
      setOvertimeRate(String(worker.overtime_rate ?? "1.5"));
      setMealAllowance(String(worker.meal_allowance ?? ""));
      setMobilityAllowance(String(worker.mobility_allowance ?? ""));
      setAfpRate(String(worker.afp_rate ?? "10"));
      setHealthRate(String(worker.health_rate ?? "7"));
      setBonusTarget(String(worker.bonus_target ?? ""));
    }
  }, [worker]);

  if (!worker) return null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!worker) return;
    onSave(worker, {
      base_salary: baseSalary ? Number(baseSalary) : null,
      hourly_rate: hourlyRate ? Number(hourlyRate) : null,
      overtime_rate: overtimeRate ? Number(overtimeRate) : null,
      meal_allowance: mealAllowance ? Number(mealAllowance) : null,
      mobility_allowance: mobilityAllowance ? Number(mobilityAllowance) : null,
      afp_rate: afpRate ? Number(afpRate) : null,
      health_rate: healthRate ? Number(healthRate) : null,
      bonus_target: bonusTarget ? Number(bonusTarget) : null,
    });
  }

  return (
    <Modal
      open={!!worker}
      onClose={onClose}
      title={`Parámetros Salariales — ${worker.full_name}`}
      size="lg"
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Sueldo Base (CLP/mes)"
            type="number"
            min={0}
            value={baseSalary}
            onChange={(e) => setBaseSalary(e.target.value)}
            placeholder="800000"
          />
          <Input
            label="Tasa por Hora (CLP)"
            type="number"
            min={0}
            value={hourlyRate}
            onChange={(e) => setHourlyRate(e.target.value)}
            placeholder="5000"
          />
          <Input
            label="Multiplicador Horas Extras"
            type="number"
            step="0.1"
            min={0}
            value={overtimeRate}
            onChange={(e) => setOvertimeRate(e.target.value)}
          />
          <Input
            label="Bono Productividad (CLP)"
            type="number"
            min={0}
            value={bonusTarget}
            onChange={(e) => setBonusTarget(e.target.value)}
            placeholder="50000"
          />
          <Input
            label="Colación Diaria (CLP)"
            type="number"
            min={0}
            value={mealAllowance}
            onChange={(e) => setMealAllowance(e.target.value)}
            placeholder="2000"
          />
          <Input
            label="Locomoción Mensual (CLP)"
            type="number"
            min={0}
            value={mobilityAllowance}
            onChange={(e) => setMobilityAllowance(e.target.value)}
            placeholder="45000"
          />
          <Input
            label="Tasa AFP (%)"
            type="number"
            step="0.1"
            min={0}
            max={100}
            value={afpRate}
            onChange={(e) => setAfpRate(e.target.value)}
          />
          <Input
            label="Tasa Salud (%)"
            type="number"
            step="0.1"
            min={0}
            max={100}
            value={healthRate}
            onChange={(e) => setHealthRate(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
          <AlertCircle size={14} className="shrink-0" />
          Si "Tasa por Hora" es mayor a 0, el sueldo se calcula por horas trabajadas en lugar del
          sueldo base fijo.
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">
            <Save size={15} /> Guardar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
