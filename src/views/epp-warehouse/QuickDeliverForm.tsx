import { useState, useMemo } from "react";
import { ArrowDownToLine, QrCode, Package, AlertCircle } from "lucide-react";
import { Input, Select, Button, Textarea } from "@/components/ui";
import { formatRut, normalizeRut } from "@/lib/rut";
import {
  type EppItem,
  type EppStock,
  type EppDelivery,
  type DeliverForm,
  CONDITIONS,
  normalizeSize,
} from "./types";

export function QuickDeliverForm({
  workers,
  items,
  stock,
  deliveries,
  delivering,
  onDeliverQr,
  onDeliverQuick,
}: {
  workers: { rut: string; full_name: string }[];
  items: EppItem[];
  stock: EppStock[];
  deliveries: EppDelivery[];
  delivering: boolean;
  onDeliverQr: (form: DeliverForm) => void;
  onDeliverQuick: (form: DeliverForm) => void;
}) {
  const [form, setForm] = useState({
    worker_rut: "",
    item_id: "",
    size_label: "",
    quantity: 1,
    justification: "",
    condition: "Nuevo",
    notes: "",
  });
  const valid = form.worker_rut && form.item_id && form.justification;

  const itemStock = useMemo(
    () => stock.filter((s) => s.item_id === form.item_id),
    [stock, form.item_id],
  );

  const stockRow = useMemo(() => {
    return itemStock.find((s) => normalizeSize(s.size_label) === normalizeSize(form.size_label));
  }, [itemStock, form.size_label]);
  const availableQty = stockRow?.quantity ?? 0;
  const insufficientStock = stockRow ? form.quantity > availableQty : true;

  const today = new Date().toISOString().slice(0, 10);
  const dupDeliveries = deliveries.filter(
    (d) =>
      d.worker_rut === normalizeRut(form.worker_rut) &&
      d.item_id === form.item_id &&
      d.delivery_date === today,
  );
  const hasDuplicate = dupDeliveries.length > 0;

  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <div className="space-y-4">
        <Select
          label="Trabajador"
          value={form.worker_rut}
          onChange={(e) => setForm({ ...form, worker_rut: e.target.value })}
        >
          <option value="">Seleccionar...</option>
          {workers.map((w) => (
            <option key={w.rut} value={w.rut}>
              {w.full_name} — {formatRut(w.rut)}
            </option>
          ))}
        </Select>
        <Select
          label="Item de EPP"
          value={form.item_id}
          onChange={(e) => setForm({ ...form, item_id: e.target.value, size_label: "" })}
        >
          <option value="">Seleccionar...</option>
          {items.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </Select>
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Talla"
            value={form.size_label}
            onChange={(e) => setForm({ ...form, size_label: e.target.value })}
          >
            <option value="">Seleccionar...</option>
            {itemStock.map((s) => (
              <option key={s.id} value={s.size_label}>
                {s.size_label} ({s.quantity} disp.)
              </option>
            ))}
          </Select>
          <Input
            label="Cantidad"
            type="number"
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value, 10) || 1 })}
          />
        </div>
        <Select
          label="Condicion"
          value={form.condition}
          onChange={(e) => setForm({ ...form, condition: e.target.value })}
        >
          {CONDITIONS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
        {form.item_id && (
          <div
            className={`flex items-center gap-2 p-2.5 rounded-lg text-xs ${insufficientStock ? "bg-red-50 border border-red-200 text-red-700" : "bg-emerald-50 border border-emerald-200 text-emerald-700"}`}
          >
            <Package size={14} className="shrink-0" />
            <span>
              Stock disponible: <strong>{availableQty}</strong> unidades
              {insufficientStock ? " — insuficiente para esta entrega" : ""}
            </span>
          </div>
        )}
        {form.item_id && itemStock.length === 0 && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
            <AlertCircle size={14} className="shrink-0" />
            <span>Este item no tiene stock registrado. No se puede entregar.</span>
          </div>
        )}
        {hasDuplicate && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs">
            <AlertCircle size={14} className="shrink-0" />
            <span>
              Este trabajador ya recibio este item hoy (
              {dupDeliveries
                .map((d) => `${d.quantity}u${d.confirmed_via_qr ? " QR" : ""}`)
                .join(", ")}
              ). Verifica antes de continuar.
            </span>
          </div>
        )}
      </div>
      <div className="space-y-4">
        <Textarea
          label="Justificacion"
          required
          rows={2}
          value={form.justification}
          onChange={(e) => setForm({ ...form, justification: e.target.value })}
          placeholder="Reposicion por desgaste, nuevo ingreso, cambio de talla..."
        />
        <Textarea
          label="Notas (opcional)"
          rows={2}
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
        <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => onDeliverQuick(form)}
            loading={delivering}
            disabled={!valid || insufficientStock}
          >
            <ArrowDownToLine size={16} /> Registro rapido
          </Button>
          <Button
            type="button"
            className="w-full"
            onClick={() => onDeliverQr(form)}
            disabled={delivering || !valid || insufficientStock}
          >
            <QrCode size={16} /> Confirmar con QR
          </Button>
          {insufficientStock && form.item_id && (
            <p className="text-[10px] text-red-500 text-center">
              No se puede entregar: stock insuficiente.
            </p>
          )}
          {!insufficientStock && (
            <p className="text-[10px] text-slate-400 text-center">
              El registro rapido queda marcado como excepcion y sera auditado.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
