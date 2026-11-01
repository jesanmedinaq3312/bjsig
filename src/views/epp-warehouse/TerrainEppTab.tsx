import { useState } from "react";
import {
  Plus,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  HardHat,
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
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/hooks/useConfirm";
import { useLoading } from "@/components/LoadingProvider";
import { useEppLogsPaginated } from "@/hooks/useModuleData";
import { ExportService } from "@/lib/export";
import { ExportPdf } from "@/lib/exportPdf";
import { DocumentPreview } from "@/components/DocumentPreview";
import { eppRepo } from "@/lib/repositories";
import { audit } from "@/lib/audit";
import type { AppData } from "@/hooks/useAppData";
import type { EppLog, EppCondition } from "@/lib/types";

const TERRAIN_EPP_PAGE_SIZE = 50;

export function TerrainEppTab({
  data,
  canDeliver,
  canDeleteEpp,
}: {
  data: AppData;
  canDeliver: boolean;
  canDeleteEpp: boolean;
}) {
  const { workers, loading: appLoading } = data;
  const [modalOpen, setModalOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [page, setPage] = useState(1);
  const workerName = (rut: string) => workers.find((w) => w.rut === rut)?.full_name ?? rut;
  const toast = useToast();
  const { confirm } = useConfirm();
  const { runWithLoading } = useLoading();

  const { data: pageData, isLoading: pageLoading } = useEppLogsPaginated(
    page,
    TERRAIN_EPP_PAGE_SIZE,
  );
  const eppLogs = pageData?.rows ?? [];
  const total = pageData?.total ?? 0;
  const hasMore = pageData?.hasMore ?? false;
  const loading = appLoading || pageLoading;

  async function addEpp(form: Omit<EppLog, "id" | "created_at">) {
    try {
      await runWithLoading(async () => {
        await eppRepo.insert(form);
        await audit({
          action: "epp.create",
          entity: "epp_logs",
          entity_label: `${form.epp_item_name} → ${form.worker_rut}`,
        });
        setModalOpen(false);
        toast.success("EPP registrado", form.epp_item_name);
        await data.reload();
      });
    } catch (e) {
      toast.error("Error", "Ocurrió un error inesperado. Intenta nuevamente.");
    }
  }
  async function delEpp(e: EppLog) {
    const ok = await confirm({
      title: "Eliminar registro",
      message: `¿Eliminar el registro de EPP "${e.epp_item_name}"?`,
      confirmText: "Eliminar",
      type: "danger",
    });
    if (!ok) return;
    try {
      await runWithLoading(async () => {
        await eppRepo.remove(e.id);
        await audit({
          action: "epp.delete",
          entity: "epp_logs",
          entity_id: e.id,
          entity_label: e.epp_item_name,
        });
        toast.success("Registro EPP eliminado");
        await data.reload();
      });
    } catch (err) {
      toast.error("Error", "Ocurrió un error inesperado. Intenta nuevamente.");
    }
  }
  function exportExcel() {
    ExportService.toExcel(
      eppLogs.map((e) => ({
        Trabajador: workerName(e.worker_rut),
        RUT: e.worker_rut,
        EPP: e.epp_item_name,
        "Código DS 18": e.certification_code_ds18 ?? "",
        "Fecha Entrega": e.delivery_date,
        Estado: e.condition,
        "Firma Digital": e.digital_signature ?? "",
      })),
      "EPP",
      "epp_gyc",
    );
  }

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        {eppLogs.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)}>
            <Eye size={15} /> Vista Previa
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={exportExcel}>
          <FileSpreadsheet size={15} /> Excel
        </Button>
        {canDeliver && (
          <Button size="sm" onClick={() => setModalOpen(true)}>
            <Plus size={15} /> Registrar Entrega EPP
          </Button>
        )}
      </div>
      <Card>
        <CardHeader
          title="Registro de Entrega de EPP — Terreno"
          subtitle="Trazabilidad DS 594 / DS 18 — certificación de elementos"
        />
        {eppLogs.length === 0 ? (
          <EmptyState message="No hay entregas de EPP registradas" icon={<HardHat size={32} />} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs text-slate-500 uppercase">
                  <th className="px-4 py-2.5 font-medium">Trabajador</th>
                  <th className="px-4 py-2.5 font-medium">Elemento EPP</th>
                  <th className="px-4 py-2.5 font-medium">Código DS 18</th>
                  <th className="px-4 py-2.5 font-medium">Fecha Entrega</th>
                  <th className="px-4 py-2.5 font-medium">Estado</th>
                  <th className="px-4 py-2.5 font-medium">Firma</th>
                  <th className="px-4 py-2.5 font-medium text-right">Acción</th>
                </tr>
              </thead>
              <tbody>
                {eppLogs.map((e) => (
                  <tr key={e.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {workerName(e.worker_rut)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{e.epp_item_name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">
                      {e.certification_code_ds18 ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{e.delivery_date}</td>
                    <td className="px-4 py-3">
                      <Badge
                        className={
                          e.condition === "Bueno"
                            ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                            : e.condition === "Regular"
                              ? "bg-amber-100 text-amber-700 border-amber-200"
                              : "bg-red-100 text-red-700 border-red-200"
                        }
                      >
                        {e.condition}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-600 italic text-xs">
                      {e.digital_signature ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {canDeliver && canDeleteEpp && (
                        <button
                          onClick={() => delEpp(e)}
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
        {(total > TERRAIN_EPP_PAGE_SIZE || page > 1) && (
          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-slate-500">
              Página {page} · {eppLogs.length} de {total} registros
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
        <TerrainEppModal workers={workers} onClose={() => setModalOpen(false)} onSave={addEpp} />
      )}
      <DocumentPreview
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="Comprobantes de Entrega de EPP"
        fileName="comprobantes_epp"
        generatePdf={async () => {
          const headers = [
            "Trabajador",
            "RUT",
            "Elemento EPP",
            "Código DS 18",
            "Fecha Entrega",
            "Estado",
            "Firma",
          ];
          const body = eppLogs.map((e) => [
            workerName(e.worker_rut),
            e.worker_rut,
            e.epp_item_name,
            e.certification_code_ds18 ?? "—",
            e.delivery_date,
            e.condition,
            e.digital_signature ?? "—",
          ]);
          return ExportPdf.toPdfBlob(
            "Comprobantes de Entrega de EPP",
            headers,
            body,
            "comprobantes_epp",
            "Registro DS 594 / DS 18",
          );
        }}
      />
    </div>
  );
}

function TerrainEppModal({
  workers,
  onClose,
  onSave,
}: {
  workers: AppData["workers"];
  onClose: () => void;
  onSave: (f: Omit<EppLog, "id" | "created_at">) => void;
}) {
  const [form, setForm] = useState({
    worker_rut: workers[0]?.rut ?? "",
    epp_item_name: "",
    certification_code_ds18: "",
    delivery_date: new Date().toISOString().slice(0, 10),
    expiration_date: "",
    condition: "Bueno" as EppCondition,
    digital_signature: "",
  });
  return (
    <Modal open onClose={onClose} title="Registrar Entrega de EPP">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave({ ...form, expiration_date: form.expiration_date || null });
        }}
        className="space-y-4"
      >
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
        <Input
          label="Elemento EPP"
          required
          value={form.epp_item_name}
          onChange={(e) => setForm({ ...form, epp_item_name: e.target.value })}
          placeholder="Casco de Seguridad"
        />
        <Input
          label="Código de Certificación DS 18"
          value={form.certification_code_ds18}
          onChange={(e) => setForm({ ...form, certification_code_ds18: e.target.value })}
          placeholder="DS18-001-2024"
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Fecha de Entrega"
            type="date"
            required
            value={form.delivery_date}
            onChange={(e) => setForm({ ...form, delivery_date: e.target.value })}
          />
          <Input
            label="Fecha Vencimiento"
            type="date"
            value={form.expiration_date}
            onChange={(e) => setForm({ ...form, expiration_date: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Estado del Elemento"
            value={form.condition}
            onChange={(e) => setForm({ ...form, condition: e.target.value as EppCondition })}
          >
            <option value="Bueno">Bueno</option>
            <option value="Regular">Regular</option>
            <option value="Malo">Malo</option>
          </Select>
          <Input
            label="Firma Digital (iniciales)"
            value={form.digital_signature}
            onChange={(e) => setForm({ ...form, digital_signature: e.target.value })}
            placeholder="C.Muñoz"
          />
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
