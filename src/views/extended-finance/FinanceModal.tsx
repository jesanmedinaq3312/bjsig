import { Modal, Input, Select, Button, Textarea } from "@/components/ui";
import type { Worker } from "@/lib/types";
import { DISCOUNT_CONCEPTS, fmtCL } from "./constants";

export type ModalMode = "advance" | "loan" | "discount" | "statement";

export function FinanceModal({
  mode,
  form,
  setForm,
  workers,
  saving,
  onClose,
  onSave,
}: {
  mode: ModalMode;
  form: Record<string, string>;
  setForm: (f: Record<string, string>) => void;
  workers: Worker[];
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
}) {
  const title =
    mode === "advance"
      ? "Nuevo Anticipo"
      : mode === "loan"
        ? "Nuevo Préstamo"
        : mode === "discount"
          ? "Nuevo Descuento"
          : "Nuevo Movimiento";

  return (
    <Modal open onClose={onClose} title={title} size="md">
      <div className="space-y-4">
        <Select
          label="Trabajador"
          value={form.worker_rut ?? ""}
          onChange={(e) => setForm({ ...form, worker_rut: e.target.value })}
        >
          <option value="">Seleccionar...</option>
          {workers.map((w) => (
            <option key={w.rut} value={w.rut}>
              {w.full_name} — {w.rut}
            </option>
          ))}
        </Select>

        {mode === "advance" && (
          <>
            <Input
              label="Monto (CLP)"
              type="number"
              value={form.amount ?? ""}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
            <Input
              label="Fecha de solicitud"
              type="date"
              value={form.request_date ?? ""}
              onChange={(e) => setForm({ ...form, request_date: e.target.value })}
            />
            <Textarea
              label="Notas"
              rows={2}
              value={form.notes ?? ""}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </>
        )}

        {mode === "loan" && (
          <>
            <Input
              label="Monto total (CLP)"
              type="number"
              value={form.principal_amount ?? ""}
              onChange={(e) => setForm({ ...form, principal_amount: e.target.value })}
            />
            <Input
              label="Número de cuotas"
              type="number"
              value={form.installments ?? ""}
              onChange={(e) => setForm({ ...form, installments: e.target.value })}
            />
            <Input
              label="Fecha inicio descuento"
              type="date"
              value={form.start_date ?? ""}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
            />
            <Textarea
              label="Notas"
              rows={2}
              value={form.notes ?? ""}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
            {form.principal_amount && form.installments && Number(form.installments) > 0 && (
              <div className="text-xs text-slate-500 bg-slate-50 rounded-lg p-3">
                Descuento mensual estimado:{" "}
                <span className="font-bold text-slate-700">
                  {fmtCL(Math.ceil(Number(form.principal_amount) / Number(form.installments)))}
                </span>
              </div>
            )}
          </>
        )}

        {mode === "discount" && (
          <>
            <Select
              label="Concepto"
              value={form.concept ?? ""}
              onChange={(e) => setForm({ ...form, concept: e.target.value })}
            >
              <option value="">Seleccionar...</option>
              {DISCOUNT_CONCEPTS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
            <Input
              label="Monto (CLP)"
              type="number"
              value={form.amount ?? ""}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
            <Input
              label="Fecha"
              type="date"
              value={form.discount_date ?? ""}
              onChange={(e) => setForm({ ...form, discount_date: e.target.value })}
            />
            <Textarea
              label="Notas"
              rows={2}
              value={form.notes ?? ""}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </>
        )}

        {mode === "statement" && (
          <>
            <Select
              label="Tipo de movimiento"
              value={form.entry_type ?? ""}
              onChange={(e) => setForm({ ...form, entry_type: e.target.value })}
            >
              <option value="">Seleccionar...</option>
              <option value="pago">Pago</option>
              <option value="anticipo">Anticipo</option>
              <option value="descuento">Descuento</option>
              <option value="prestamo">Préstamo</option>
              <option value="ajuste">Ajuste</option>
            </Select>
            <Input
              label="Período (ej: 2026-08)"
              value={form.period_label ?? ""}
              onChange={(e) => setForm({ ...form, period_label: e.target.value })}
            />
            <Input
              label="Monto (CLP) — negativo para descuentos"
              type="number"
              value={form.amount ?? ""}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
            <Input
              label="Descripción"
              value={form.description ?? ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button loading={saving} onClick={onSave}>
            Guardar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
