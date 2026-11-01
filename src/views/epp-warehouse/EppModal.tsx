import { useState, useMemo } from "react";
import { Modal, Input, Select, Button, Textarea } from "@/components/ui";
import {
  type EppItem,
  type EppStock,
  type EppDelivery,
  type ModalMode,
  CATEGORIES,
  RETURN_CONDITIONS,
} from "./types";

export interface EppModalProps {
  mode: ModalMode;
  items: EppItem[];
  workers: { rut: string; full_name: string }[];
  deliveries: EppDelivery[];
  stock: EppStock[];
  onClose: () => void;
  onSaveItem: (form: {
    name: string;
    category: string;
    sku: string;
    size_required: boolean;
    min_stock: number;
    unit_cost: number;
    notes: string;
  }) => Promise<void>;
  onReturn: (form: {
    delivery_id: string;
    return_condition: string;
    quantity: number;
    restocked: boolean;
    notes: string;
  }) => Promise<void>;
  onRestock: (form: { item_id: string; size_label: string; quantity: number }) => Promise<void>;
  delivering: boolean;
}

export function EppModal({
  mode,
  items,
  workers,
  deliveries,
  stock,
  onClose,
  onSaveItem,
  onReturn,
  onRestock,
  delivering,
}: EppModalProps) {
  const [saving, setSaving] = useState(false);
  const [itemForm, setItemForm] = useState({
    name: "",
    category: "General",
    sku: "",
    size_required: false,
    min_stock: 5,
    unit_cost: 0,
    notes: "",
  });
  const [returnForm, setReturnForm] = useState({
    delivery_id: "",
    return_condition: "Bueno",
    quantity: 1,
    restocked: false,
    notes: "",
  });
  const [restockForm, setRestockForm] = useState({ item_id: "", size_label: "", quantity: 10 });

  const restockItemStock = useMemo(
    () => stock.filter((s) => s.item_id === restockForm.item_id),
    [stock, restockForm.item_id],
  );

  const titles: Record<ModalMode, string> = {
    item: "Nuevo Item de EPP",
    return: "Registrar Devolución",
    restock: "Reabastecer Stock",
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (mode === "item") await onSaveItem(itemForm);
      else if (mode === "return") await onReturn(returnForm);
      else if (mode === "restock") await onRestock(restockForm);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={titles[mode]} size="md">
      <form onSubmit={submit} className="space-y-4">
        {mode === "item" && (
          <>
            <Input
              label="Nombre del item"
              required
              value={itemForm.name}
              onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
              placeholder="Casco de seguridad"
            />
            <Select
              label="Categoría"
              value={itemForm.category}
              onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
            <Input
              label="SKU (opcional)"
              value={itemForm.sku}
              onChange={(e) => setItemForm({ ...itemForm, sku: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Stock mínimo"
                type="number"
                value={itemForm.min_stock}
                onChange={(e) =>
                  setItemForm({ ...itemForm, min_stock: parseInt(e.target.value, 10) || 0 })
                }
              />
              <Input
                label="Costo unitario ($)"
                type="number"
                value={itemForm.unit_cost}
                onChange={(e) =>
                  setItemForm({ ...itemForm, unit_cost: parseInt(e.target.value, 10) || 0 })
                }
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={itemForm.size_required}
                onChange={(e) => setItemForm({ ...itemForm, size_required: e.target.checked })}
              />{" "}
              Requiere talla
            </label>
          </>
        )}

        {mode === "return" && (
          <>
            <Select
              label="Entrega a devolver"
              required
              value={returnForm.delivery_id}
              onChange={(e) => setReturnForm({ ...returnForm, delivery_id: e.target.value })}
            >
              <option value="">Seleccionar...</option>
              {deliveries.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.delivery_date} — {d.worker_rut}
                </option>
              ))}
            </Select>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Cantidad"
                type="number"
                value={returnForm.quantity}
                onChange={(e) =>
                  setReturnForm({ ...returnForm, quantity: parseInt(e.target.value, 10) || 1 })
                }
              />
              <Select
                label="Condición"
                value={returnForm.return_condition}
                onChange={(e) => setReturnForm({ ...returnForm, return_condition: e.target.value })}
              >
                {RETURN_CONDITIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={returnForm.restocked}
                onChange={(e) => setReturnForm({ ...returnForm, restocked: e.target.checked })}
              />{" "}
              Reingresar al inventario
            </label>
            <Textarea
              label="Notas (opcional)"
              rows={2}
              value={returnForm.notes}
              onChange={(e) => setReturnForm({ ...returnForm, notes: e.target.value })}
            />
          </>
        )}

        {mode === "restock" && (
          <>
            <Select
              label="Item"
              required
              value={restockForm.item_id}
              onChange={(e) =>
                setRestockForm({ ...restockForm, item_id: e.target.value, size_label: "" })
              }
            >
              <option value="">Seleccionar...</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </Select>
            <Select
              label="Talla existente (opcional)"
              value={restockForm.size_label}
              onChange={(e) => setRestockForm({ ...restockForm, size_label: e.target.value })}
            >
              <option value="">Nueva talla...</option>
              {restockItemStock.map((s) => (
                <option key={s.id} value={s.size_label}>
                  {s.size_label} ({s.quantity} act.)
                </option>
              ))}
            </Select>
            {restockForm.size_label === "" && (
              <Input
                label="Nueva talla"
                value={restockForm.size_label}
                onChange={(e) => setRestockForm({ ...restockForm, size_label: e.target.value })}
                placeholder="Único, S, M, L, XL"
              />
            )}
            <Input
              label="Cantidad a agregar"
              type="number"
              required
              value={restockForm.quantity}
              onChange={(e) =>
                setRestockForm({ ...restockForm, quantity: parseInt(e.target.value, 10) || 0 })
              }
            />
          </>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <Button type="button" variant="secondary" onClick={onClose} disabled={delivering}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            Guardar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
