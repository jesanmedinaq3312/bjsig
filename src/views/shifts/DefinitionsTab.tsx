import { useState } from "react";
import { Plus, Pencil, Trash2, Power, Calendar } from "lucide-react";
import { Card, CardHeader, Button, Modal, Input, Select, Badge, EmptyState } from "@/components/ui";
import { shiftDefRepo } from "@/lib/repositories";
import { audit } from "@/lib/audit";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/hooks/useConfirm";
import { useLoading } from "@/components/LoadingProvider";
import type { ShiftDefinition, ShiftCycle } from "@/lib/types";
import { CYCLES, COLORS } from "./constants";

export function DefinitionsTab({
  shiftDefs,
  onReload,
  toast,
  confirm,
  runWithLoading,
  canDelete,
}: {
  shiftDefs: ShiftDefinition[];
  onReload: () => Promise<void>;
  toast: ReturnType<typeof useToast>;
  confirm: ReturnType<typeof useConfirm>;
  runWithLoading: ReturnType<typeof useLoading>["runWithLoading"];
  canDelete?: boolean;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ShiftDefinition | null>(null);
  const [saving, setSaving] = useState(false);

  async function save(form: Omit<ShiftDefinition, "id" | "created_at">) {
    setSaving(true);
    try {
      await runWithLoading(async () => {
        if (editing) {
          await shiftDefRepo.update(editing.id, form);
          await audit({
            action: "shift.update",
            entity: "shift_definitions",
            entity_id: editing.id,
            entity_label: form.name,
            details: form as Record<string, unknown>,
          });
        } else {
          await shiftDefRepo.insert(form);
          await audit({
            action: "shift.create",
            entity: "shift_definitions",
            entity_label: form.name,
            details: form as Record<string, unknown>,
          });
        }
        setModalOpen(false);
        setEditing(null);
        toast.success(editing ? "Turno actualizado" : "Turno creado", form.name);
        await onReload();
      });
    } catch (e) {
      toast.error("Error", (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(def: ShiftDefinition) {
    try {
      await runWithLoading(async () => {
        await shiftDefRepo.update(def.id, { active: !def.active });
        await audit({
          action: "shift.toggle",
          entity: "shift_definitions",
          entity_id: def.id,
          entity_label: def.name,
          details: { active: !def.active },
        });
        toast.success(def.active ? "Turno desactivado" : "Turno activado", def.name);
        await onReload();
      });
    } catch (e) {
      toast.error("Error", (e as Error).message);
    }
  }

  async function remove(def: ShiftDefinition) {
    const ok = await confirm.confirm({
      title: "Eliminar turno",
      message: `¿Seguro que deseas eliminar el turno "${def.name}"?`,
      confirmText: "Eliminar",
      type: "danger",
    });
    if (!ok) return;
    try {
      await runWithLoading(async () => {
        await shiftDefRepo.remove(def.id);
        await audit({
          action: "shift.delete",
          entity: "shift_definitions",
          entity_id: def.id,
          entity_label: def.name,
        });
        toast.success("Turno eliminado", def.name);
        await onReload();
      });
    } catch (e) {
      toast.error("Error", (e as Error).message);
    }
  }

  return (
    <Card>
      <CardHeader
        title="Definiciones de Turnos"
        subtitle="Crea y administra los tipos de turno disponibles para asignar a trabajadores."
        action={
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            <Plus size={15} /> Nuevo Turno
          </Button>
        }
      />
      {shiftDefs.length === 0 ? (
        <EmptyState message="No hay turnos definidos" icon={<Calendar size={32} />} />
      ) : (
        <div className="divide-y divide-slate-100">
          {shiftDefs.map((def) => (
            <div key={def.id} className="px-5 py-4 flex items-center gap-4">
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: def.color ?? "#3b82f6" }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-slate-800">{def.name}</p>
                  <Badge className="bg-slate-100 text-slate-600 border-slate-200">
                    {def.cycle}
                  </Badge>
                  {!def.active && (
                    <Badge className="bg-red-50 text-red-600 border-red-200">Inactivo</Badge>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {def.start_time && def.end_time
                    ? `${def.start_time} – ${def.end_time}`
                    : "Sin horario fijo"}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => toggleActive(def)}
                  className={`p-1.5 rounded ${def.active ? "text-amber-600 hover:bg-amber-50" : "text-emerald-600 hover:bg-emerald-50"}`}
                  title={def.active ? "Desactivar" : "Activar"}
                >
                  <Power size={16} />
                </button>
                <button
                  onClick={() => {
                    setEditing(def);
                    setModalOpen(true);
                  }}
                  className="p-1.5 text-slate-500 hover:bg-slate-100 rounded"
                  title="Editar"
                >
                  <Pencil size={15} />
                </button>
                {canDelete && (
                  <button
                    onClick={() => remove(def)}
                    className="p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded"
                    title="Eliminar"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <ShiftDefModal
          editing={editing}
          onClose={() => {
            setModalOpen(false);
            setEditing(null);
          }}
          onSave={save}
          saving={saving}
        />
      )}
    </Card>
  );
}

function ShiftDefModal({
  editing,
  onClose,
  onSave,
  saving,
}: {
  editing: ShiftDefinition | null;
  onClose: () => void;
  onSave: (f: Omit<ShiftDefinition, "id" | "created_at">) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState({
    name: editing?.name ?? "",
    cycle: editing?.cycle ?? "7x7",
    start_time: editing?.start_time ?? "07:00",
    end_time: editing?.end_time ?? "19:00",
    color: editing?.color ?? "#3b82f6",
    active: editing?.active ?? true,
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      name: form.name,
      cycle: form.cycle as ShiftCycle | "custom",
      start_time: form.start_time || null,
      end_time: form.end_time || null,
      color: form.color,
      active: form.active,
    });
  }

  return (
    <Modal open onClose={onClose} title={editing ? "Editar Turno" : "Nuevo Turno"}>
      <form onSubmit={submit} className="space-y-4">
        <Input
          label="Nombre del Turno"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label="Ciclo"
            value={form.cycle}
            onChange={(e) => setForm({ ...form, cycle: e.target.value as ShiftCycle | "custom" })}
          >
            {CYCLES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1.5 block">Color</label>
            <div className="flex flex-wrap gap-1.5">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm({ ...form, color: c })}
                  className={`w-7 h-7 rounded-full border-2 ${form.color === c ? "border-slate-800" : "border-transparent"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Hora de Inicio"
            type="time"
            value={form.start_time ?? ""}
            onChange={(e) => setForm({ ...form, start_time: e.target.value })}
          />
          <Input
            label="Hora de Término"
            type="time"
            value={form.end_time ?? ""}
            onChange={(e) => setForm({ ...form, end_time: e.target.value })}
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => setForm({ ...form, active: e.target.checked })}
            className="rounded"
          />
          Turno activo
        </label>
        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving} className="w-full sm:w-auto">
            Guardar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
