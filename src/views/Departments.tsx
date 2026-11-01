import { useState } from "react";
import { Building2, Plus, Trash2 } from "lucide-react";
import {
  Card,
  CardHeader,
  Button,
  Modal,
  Input,
  Select,
  Badge,
  EmptyState,
  Spinner,
} from "@/components/ui";
import { useConfirm } from "@/hooks/useConfirm";
import { departmentRepo } from "@/lib/repositories";
import type { AppData } from "@/hooks/useAppData";
import type { Department } from "@/lib/types";

export function DepartmentsView({
  data,
  userRole,
  permissions,
}: {
  data: AppData;
  userRole?: string;
  permissions?: Record<string, boolean>;
}) {
  const { departments, workers, loading } = data;
  const canDelete = userRole === "superadmin" || !!permissions?.can_delete_departments;
  const [modalOpen, setModalOpen] = useState(false);
  const [editDept, setEditDept] = useState<Department | null>(null);
  const [form, setForm] = useState({ name: "", parent_department_id: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { confirm } = useConfirm();

  if (loading) return <Spinner />;

  function workerCount(deptId: string): number {
    return workers.filter((w) => w.department_id === deptId).length;
  }

  function childDepts(parentId: string | null): Department[] {
    return departments.filter((d) => d.parent_department_id === parentId);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: form.name.trim(),
        parent_department_id: form.parent_department_id || null,
      };
      if (editDept) {
        await departmentRepo.update(editDept.id, payload);
      } else {
        await departmentRepo.insert(payload);
      }
      setModalOpen(false);
      setEditDept(null);
      setForm({ name: "", parent_department_id: "" });
      await data.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function remove(dept: Department) {
    const count = workerCount(dept.id);
    const msg =
      count > 0
        ? `El departamento "${dept.name}" tiene ${count} trabajador(es) asignado(s). ¿Eliminar de todos modos?`
        : `¿Eliminar el departamento "${dept.name}"?`;
    const ok = await confirm({ message: msg, type: "danger" });
    if (!ok) return;
    try {
      await departmentRepo.remove(dept.id);
      await data.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar");
    }
  }

  function openEdit(dept: Department) {
    setEditDept(dept);
    setForm({ name: dept.name, parent_department_id: dept.parent_department_id ?? "" });
    setModalOpen(true);
  }

  function openCreate() {
    setEditDept(null);
    setForm({ name: "", parent_department_id: "" });
    setModalOpen(true);
  }

  function renderDeptTree(depts: Department[], level: number = 0): React.ReactNode {
    if (depts.length === 0) return null;
    return depts.map((d) => {
      const children = childDepts(d.id);
      return (
        <div key={d.id}>
          <div
            className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-slate-50 transition-colors"
            style={{ marginLeft: level * 24 }}
          >
            <Building2 size={16} className="text-slate-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">{d.name}</p>
              <p className="text-xs text-slate-400">{workerCount(d.id)} trabajador(es)</p>
            </div>
            {children.length > 0 && (
              <Badge className="bg-blue-50 text-blue-700 border-blue-200">
                {children.length} subdept.
              </Badge>
            )}
            <Button size="sm" variant="ghost" onClick={() => openEdit(d)}>
              Editar
            </Button>
            {canDelete && (
              <button onClick={() => remove(d)} className="text-slate-400 hover:text-red-500 p-1">
                <Trash2 size={15} />
              </button>
            )}
          </div>
          {children.length > 0 && (
            <div className="border-l border-slate-100 ml-4">
              {renderDeptTree(children, level + 1)}
            </div>
          )}
        </div>
      );
    });
  }

  const rootDepts = childDepts(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Departamentos</h2>
          <p className="text-sm text-slate-500">Organiza tus trabajadores por área operativa</p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={16} /> Nuevo Departamento
        </Button>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
          {error}
        </div>
      )}

      {rootDepts.length === 0 ? (
        <Card>
          <EmptyState
            message="No hay departamentos creados aún. Haz clic en Nuevo Departamento para comenzar."
            icon={<Building2 size={32} />}
          />
        </Card>
      ) : (
        <Card>
          <CardHeader
            title="Estructura de Departamentos"
            action={<Building2 size={18} className="text-slate-400" />}
          />
          <div className="px-5 pb-5">{renderDeptTree(rootDepts)}</div>
        </Card>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editDept ? "Editar Departamento" : "Nuevo Departamento"}
      >
        <form onSubmit={save} className="space-y-4">
          <Input
            label="Nombre del departamento"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Ej: Operaciones, Mantención, Administración..."
            required
          />
          <Select
            label="Departamento padre (opcional)"
            value={form.parent_department_id}
            onChange={(e) => setForm({ ...form, parent_department_id: e.target.value })}
          >
            <option value="">— Ninguno (departamento raíz) —</option>
            {departments
              .filter((d) => d.id !== editDept?.id)
              .map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
          </Select>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
