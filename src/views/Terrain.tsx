import { useState } from "react";
import {
  Plus,
  Trash2,
  FileSpreadsheet,
  ClipboardCheck,
  FileSignature,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
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
import { ExportService } from "@/lib/export";
import { shiftRepo, astRepo } from "@/lib/repositories";
import { useShiftsPaginated } from "@/hooks/useModuleData";
import { audit } from "@/lib/audit";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/hooks/useConfirm";
import { useLoading } from "@/components/LoadingProvider";
import type { DailyShift, AstLog, AttendanceStatus } from "@/lib/types";
import type { AppData } from "@/hooks/useAppData";

const TERRAIN_PAGE_SIZE = 50;

type Tab = "shifts" | "ast";

export function TerrainView({
  data,
  userRole,
  permissions,
}: {
  data: AppData;
  userRole?: string;
  permissions?: Record<string, boolean>;
}) {
  const canDelete = userRole === "superadmin" || !!permissions?.can_delete_terrain;
  const [tab, setTab] = useState<Tab>("shifts");
  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "shifts", label: "Asistencia y Dotación", icon: <Calendar size={16} /> },
    { key: "ast", label: "Charla 5 min / AST", icon: <FileSignature size={16} /> },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2 border-b border-slate-200">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>
      {tab === "shifts" && <ShiftsTab data={data} canDelete={canDelete} />}
      {tab === "ast" && <AstTab data={data} canDelete={canDelete} />}
    </div>
  );
}

function ShiftsTab({ data, canDelete }: { data: AppData; canDelete: boolean }) {
  const { workers, loading: appLoading } = data;
  const [modalOpen, setModalOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState("");
  const [page, setPage] = useState(1);
  const toast = useToast();
  const { confirm } = useConfirm();
  const { runWithLoading } = useLoading();

  const startDate = dateFilter ? dateFilter : undefined;
  const endDate = dateFilter ? dateFilter : undefined;
  const { data: pageData, isLoading: pageLoading } = useShiftsPaginated(
    page,
    TERRAIN_PAGE_SIZE,
    startDate,
    endDate,
  );
  const shifts = pageData?.rows ?? [];
  const total = pageData?.total ?? 0;
  const hasMore = pageData?.hasMore ?? false;
  const loading = appLoading || pageLoading;

  const workerName = (rut: string) => workers.find((w) => w.rut === rut)?.full_name ?? rut;
  const present = shifts.filter((s) => s.attendance_status === "Presente").length;
  const absent = shifts.filter((s) => s.attendance_status !== "Presente").length;

  async function addShift(form: Omit<DailyShift, "id" | "created_at">) {
    try {
      await runWithLoading(async () => {
        await shiftRepo.insert(form);
        await audit({
          action: "shift.create",
          entity: "daily_shifts",
          entity_label: `${form.worker_rut} — ${form.date}`,
        });
        setModalOpen(false);
        toast.success("Asistencia registrada", `${form.worker_rut} — ${form.date}`);
        await data.reload();
      });
    } catch (e) {
      toast.error("Error", (e as Error).message);
    }
  }
  async function delShift(s: DailyShift) {
    const ok = await confirm({
      title: "Eliminar registro",
      message: "¿Eliminar este registro de asistencia?",
      confirmText: "Eliminar",
      type: "danger",
    });
    if (!ok) return;
    try {
      await runWithLoading(async () => {
        await shiftRepo.remove(s.id);
        await audit({
          action: "shift.delete",
          entity: "daily_shifts",
          entity_id: s.id,
          entity_label: `${s.worker_rut} — ${s.date}`,
        });
        toast.success("Registro eliminado");
        await data.reload();
      });
    } catch (e) {
      toast.error("Error", (e as Error).message);
    }
  }

  function exportExcel() {
    ExportService.toExcel(
      shifts.map((s) => ({
        Fecha: s.date,
        RUT: s.worker_rut,
        Trabajador: workerName(s.worker_rut),
        Turno: s.shift_name,
        Asistencia: s.attendance_status,
        "AST Firmada": s.ast_signed ? "Sí" : "No",
      })),
      "Asistencia",
      "asistencia_gyc",
    );
  }

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Input
            type="date"
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.target.value);
              setPage(1);
            }}
          />
          <div className="flex gap-2">
            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
              Presentes: {present}
            </Badge>
            <Badge className="bg-red-100 text-red-700 border-red-200">Ausentes: {absent}</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportExcel}>
            <FileSpreadsheet size={15} /> Excel
          </Button>
          <Button size="sm" onClick={() => setModalOpen(true)}>
            <Plus size={15} /> Registrar Turno
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader
          title="Registro Diario de Asistencia"
          subtitle="Control de dotación por turno (7x7, 4x3, 5x2)"
        />
        {shifts.length === 0 ? (
          <EmptyState
            message="No hay registros de asistencia"
            icon={<ClipboardCheck size={32} />}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs text-slate-500 uppercase">
                  <th className="px-4 py-2.5 font-medium">Fecha</th>
                  <th className="px-4 py-2.5 font-medium">Trabajador</th>
                  <th className="px-4 py-2.5 font-medium">Turno</th>
                  <th className="px-4 py-2.5 font-medium">Asistencia</th>
                  <th className="px-4 py-2.5 font-medium">AST</th>
                  <th className="px-4 py-2.5 font-medium text-right">Acción</th>
                </tr>
              </thead>
              <tbody>
                {shifts.map((s) => (
                  <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-600">{s.date}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {workerName(s.worker_rut)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{s.shift_name}</td>
                    <td className="px-4 py-3">
                      <Badge
                        className={
                          s.attendance_status === "Presente"
                            ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                            : "bg-red-100 text-red-700 border-red-200"
                        }
                      >
                        {s.attendance_status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {s.ast_signed ? (
                        <Badge className="bg-blue-100 text-blue-700 border-blue-200">Firmada</Badge>
                      ) : (
                        <Badge className="bg-slate-100 text-slate-500 border-slate-200">
                          Pendiente
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {canDelete && (
                        <button
                          onClick={() => delShift(s)}
                          className="p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 rounded"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {(total > TERRAIN_PAGE_SIZE || page > 1) && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
            <span className="text-xs text-slate-500">
              Página {page} · {shifts.length} de {total} registros
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft size={15} /> Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={!hasMore}
              >
                Siguiente <ChevronRight size={15} />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {modalOpen && (
        <ShiftModal workers={workers} onClose={() => setModalOpen(false)} onSave={addShift} />
      )}
    </div>
  );
}

function ShiftModal({
  workers,
  onClose,
  onSave,
}: {
  workers: AppData["workers"];
  onClose: () => void;
  onSave: (f: Omit<DailyShift, "id" | "created_at">) => void;
}) {
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    worker_rut: workers[0]?.rut ?? "",
    attendance_status: "Presente" as AttendanceStatus,
    shift_name: "Turno 1",
    ast_signed: false,
    calculated_hht: 8,
    epp_inicio: {} as Record<string, boolean>,
    epp_termino: {} as Record<string, boolean>,
    notes: null as string | null,
  });
  return (
    <Modal open onClose={onClose} title="Registrar Asistencia de Turno">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave(form);
        }}
        className="space-y-4"
      >
        <Input
          label="Fecha"
          type="date"
          required
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
        />
        <Select
          label="Trabajador"
          value={form.worker_rut}
          onChange={(e) => setForm({ ...form, worker_rut: e.target.value })}
        >
          {workers.map((w) => (
            <option key={w.rut} value={w.rut}>
              {w.full_name} — {w.rut}
            </option>
          ))}
        </Select>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Nombre del Turno"
            value={form.shift_name}
            onChange={(e) => setForm({ ...form, shift_name: e.target.value })}
          />
          <Select
            label="Asistencia"
            value={form.attendance_status}
            onChange={(e) =>
              setForm({ ...form, attendance_status: e.target.value as AttendanceStatus })
            }
          >
            <option value="Presente">Presente</option>
            <option value="Ausente">Ausente</option>
            <option value="Licencia">Licencia</option>
            <option value="Permiso">Permiso</option>
          </Select>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.ast_signed}
            onChange={(e) => setForm({ ...form, ast_signed: e.target.checked })}
            className="rounded"
          />
          AST firmada antes de iniciar turno
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">Guardar</Button>
        </div>
      </form>
    </Modal>
  );
}

function AstTab({ data, canDelete }: { data: AppData; canDelete: boolean }) {
  const { astLogs, workers, loading } = data;
  const [modalOpen, setModalOpen] = useState(false);
  const workerName = (rut: string) => workers.find((w) => w.rut === rut)?.full_name ?? rut;
  const toast = useToast();
  const { confirm } = useConfirm();
  const { runWithLoading } = useLoading();

  async function addAst(form: Omit<AstLog, "id" | "created_at">) {
    try {
      await runWithLoading(async () => {
        await astRepo.insert(form);
        await audit({
          action: "ast.create",
          entity: "ast_logs",
          entity_label: `${form.topic} — ${form.date}`,
        });
        setModalOpen(false);
        toast.success("Charla AST registrada", form.topic);
        await data.reload();
      });
    } catch (e) {
      toast.error("Error", (e as Error).message);
    }
  }
  async function delAst(a: AstLog) {
    const ok = await confirm({
      title: "Eliminar charla",
      message: `¿Eliminar la charla "${a.topic}"?`,
      confirmText: "Eliminar",
      type: "danger",
    });
    if (!ok) return;
    try {
      await runWithLoading(async () => {
        await astRepo.remove(a.id);
        await audit({
          action: "ast.delete",
          entity: "ast_logs",
          entity_id: a.id,
          entity_label: a.topic,
        });
        toast.success("Charla eliminada");
        await data.reload();
      });
    } catch (e) {
      toast.error("Error", (e as Error).message);
    }
  }
  function exportExcel() {
    ExportService.toExcel(
      astLogs.map((a) => ({
        Fecha: a.date,
        Tema: a.topic,
        "N° Asistentes": a.attendees_rut_list.length,
        Asistentes: a.attendees_rut_list.map(workerName).join(", "),
        Firmas: a.signatures.join(", "),
      })),
      "AST",
      "ast_gyc",
    );
  }

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={exportExcel}>
          <FileSpreadsheet size={15} /> Excel
        </Button>
        <Button size="sm" onClick={() => setModalOpen(true)}>
          <Plus size={15} /> Nueva Charla / AST
        </Button>
      </div>
      <Card>
        <CardHeader
          title="Charlas de 5 Minutos y AST"
          subtitle="Análisis Seguro de Trabajo — registro de asistencia y firmas"
        />
        {astLogs.length === 0 ? (
          <EmptyState message="No hay charlas AST registradas" icon={<FileSignature size={32} />} />
        ) : (
          <div className="divide-y divide-slate-100">
            {astLogs.map((a) => (
              <div
                key={a.id}
                className="px-5 py-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className="bg-blue-100 text-blue-700 border-blue-200">{a.date}</Badge>
                    <span className="text-xs text-slate-500">
                      {a.attendees_rut_list.length} asistentes
                    </span>
                  </div>
                  <p className="font-semibold text-slate-800">{a.topic}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {a.attendees_rut_list.map((rut, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 bg-slate-100 rounded text-xs text-slate-600"
                      >
                        {workerName(rut)}{" "}
                        <span className="text-slate-400">· {a.signatures[i] ?? "—"}</span>
                      </span>
                    ))}
                  </div>
                </div>
                {canDelete && (
                  <button
                    onClick={() => delAst(a)}
                    className="p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 rounded self-start"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
      {modalOpen && (
        <AstModal workers={workers} onClose={() => setModalOpen(false)} onSave={addAst} />
      )}
    </div>
  );
}

function AstModal({
  workers,
  onClose,
  onSave,
}: {
  workers: AppData["workers"];
  onClose: () => void;
  onSave: (f: Omit<AstLog, "id" | "created_at">) => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    topic: "",
    selected: [] as string[],
  });
  function toggle(rut: string) {
    setForm((f) => ({
      ...f,
      selected: f.selected.includes(rut)
        ? f.selected.filter((r) => r !== rut)
        : [...f.selected, rut],
    }));
  }
  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (form.selected.length === 0) {
      toast.warning("Selecciona asistentes", "Debes marcar al menos un trabajador");
      return;
    }
    const names = form.selected.map(
      (rut) =>
        workers
          .find((w) => w.rut === rut)
          ?.full_name?.split(" ")
          .map((p) => p[0])
          .join("") ?? rut,
    );
    onSave({
      date: form.date,
      topic: form.topic,
      attendees_rut_list: form.selected,
      signatures: names,
    });
  }
  return (
    <Modal open onClose={onClose} title="Nueva Charla de 5 Minutos / AST" size="lg">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Fecha"
            type="date"
            required
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
          <Input
            label="Tema de la Charla"
            required
            value={form.topic}
            onChange={(e) => setForm({ ...form, topic: e.target.value })}
            placeholder="Riesgos eléctricos en zona de trabajo"
          />
        </div>
        <div>
          <p className="text-xs font-medium text-slate-600 mb-2">Asistentes (marcar para firmar)</p>
          <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
            {workers.map((w) => (
              <label
                key={w.rut}
                className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={form.selected.includes(w.rut)}
                  onChange={() => toggle(w.rut)}
                  className="rounded"
                />
                <span className="text-sm text-slate-700">{w.full_name}</span>
                <span className="text-xs text-slate-400 font-mono">{w.rut}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">Guardar</Button>
        </div>
      </form>
    </Modal>
  );
}
