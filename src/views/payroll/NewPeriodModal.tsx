import { useState } from "react";
import { Save } from "lucide-react";
import { Modal, Button, Input, Select, Textarea } from "@/components/ui";
import { MONTHS } from "./utils";

interface PeriodForm {
  period_label: string;
  period_month: number;
  period_year: number;
  start_date: string;
  end_date: string;
  notes: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onCreate: (form: PeriodForm) => void;
}

export function NewPeriodModal({ open, onClose, onCreate }: Props) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [notes, setNotes] = useState("");

  const label = `${MONTHS[month - 1]} ${year}`;
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onCreate({
      period_label: label,
      period_month: month,
      period_year: year,
      start_date: startDate,
      end_date: endDate,
      notes,
    });
    setNotes("");
  }

  return (
    <Modal open={open} onClose={onClose} title="Nuevo Período de Nómina" size="md">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Select label="Mes" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {MONTHS.map((m, i) => (
              <option key={i} value={i + 1}>
                {m}
              </option>
            ))}
          </Select>
          <Input
            label="Año"
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          />
        </div>
        <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600 space-y-1">
          <p>
            <strong>Etiqueta:</strong> {label}
          </p>
          <p>
            <strong>Desde:</strong> {startDate}
          </p>
          <p>
            <strong>Hasta:</strong> {endDate}
          </p>
        </div>
        <Textarea
          label="Notas (opcional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">
            <Save size={15} /> Crear Período
          </Button>
        </div>
      </form>
    </Modal>
  );
}
