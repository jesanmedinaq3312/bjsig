import { useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  FileSpreadsheet,
  FileText,
  Search,
  Users,
  ScanLine,
  Camera,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Eye,
} from "lucide-react";
import { Card, CardHeader, Button, Badge, EmptyState, Spinner } from "@/components/ui";
import type { Worker, AttendanceStatus, ShiftDefinition } from "@/lib/types";
import { usePagination } from "@/hooks/usePagination";
import { ExpiryBadge } from "./components";
import { WorkerDetailRow } from "./WorkerDetailRow";
import { QUICK_ATT, QR_LABELS, QR_SHORT } from "./constants";

interface WorkerTableProps {
  workers: Worker[];
  loading: boolean;
  qrByWorker: Map<string, { type: string; time: string }[]>;
  todayAtt: Map<string, AttendanceStatus>;
  shiftDefs: ShiftDefinition[];
  canEditWorkers: boolean;
  canDeleteWorker: boolean;
  search: string;
  setSearch: (v: string) => void;
  onEdit: (w: Worker) => void;
  onPreview: (w: Worker) => void;
  onDelete: (w: Worker) => void;
  onQuickAtt: (w: Worker, status: AttendanceStatus) => void;
  onPhotoUpload?: (w: Worker, file: File) => void;
  resolvePhotoUrl: (url: string | null | undefined) => string | null;
  onExportExcel: () => void;
  onExportPdf: () => void;
  onNew: () => void;
}

function ShiftBadge({ worker, shiftDefs }: { worker: Worker; shiftDefs: ShiftDefinition[] }) {
  const def = shiftDefs.find((d) => d.cycle === worker.shift_cycle);
  return (
    <Badge
      className="border whitespace-nowrap"
      style={
        def?.color
          ? { backgroundColor: def.color + "15", color: def.color, borderColor: def.color + "40" }
          : undefined
      }
    >
      {def ? def.name : worker.shift_cycle}
    </Badge>
  );
}

function blobatarUrl(seed: string, size = 72): string {
  return `https://blobatar.dev/avatar/${encodeURIComponent(seed.trim().toLowerCase())}?size=${size}&background=squircle&gen=1`;
}

function PhotoAvatar({
  worker,
  resolvePhotoUrl,
  onPhotoUpload,
}: {
  worker: Worker;
  resolvePhotoUrl: (url: string | null | undefined) => string | null;
  onPhotoUpload?: (w: Worker, file: File) => void;
}) {
  const [avatarFailed, setAvatarFailed] = useState(false);
  const photoSrc = resolvePhotoUrl(worker.photo_url);
  const fallbackSrc = blobatarUrl(`${worker.full_name}-${worker.rut}`);
  const initials = worker.full_name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div className="relative w-9 h-9 shrink-0">
      {!avatarFailed ? (
        <img
          src={photoSrc || fallbackSrc}
          alt={worker.full_name}
          onError={() => setAvatarFailed(true)}
          className="w-9 h-9 rounded-full object-cover border border-slate-200 bg-slate-100"
        />
      ) : (
        <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500">
          {initials}
        </div>
      )}
      {onPhotoUpload && (
        <label
          className="absolute -bottom-1 -right-1 w-4 h-4 bg-white rounded-full border border-slate-200 flex items-center justify-center cursor-pointer shadow-sm hover:bg-blue-50 hover:border-blue-300 transition-colors"
          title="Cambiar foto"
        >
          <Camera size={9} className="text-slate-500" />
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onPhotoUpload(worker, f);
              e.target.value = "";
            }}
          />
        </label>
      )}
    </div>
  );
}

function QuickAttButtons({
  worker,
  todayAtt,
  onQuickAtt,
}: {
  worker: Worker;
  todayAtt: Map<string, AttendanceStatus>;
  onQuickAtt: (w: Worker, status: AttendanceStatus) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      {QUICK_ATT.map((q) => {
        const Icon = q.icon;
        const isActive = todayAtt.get(worker.rut) === q.value;
        return (
          <button
            key={q.value}
            onClick={() => onQuickAtt(worker, q.value)}
            title={q.title}
            className="w-7 h-7 flex items-center justify-center rounded-md border text-xs font-bold transition-all bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
          >
            <Icon size={12} />
          </button>
        );
      })}
    </div>
  );
}

function QrToday({
  worker,
  qrByWorker,
}: {
  worker: Worker;
  qrByWorker: Map<string, { type: string; time: string }[]>;
}) {
  const scans = qrByWorker.get(worker.rut) ?? [];
  if (scans.length === 0) return <span className="text-slate-400">—</span>;
  return (
    <div className="flex flex-wrap gap-0.5">
      {scans.map((qr, qi) => (
        <span
          key={qi}
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-medium border bg-violet-50 text-violet-700 border-violet-200 whitespace-nowrap"
          title={`${QR_LABELS[qr.type] ?? qr.type} ${qr.time}`}
        >
          <ScanLine size={9} />
          {QR_SHORT[qr.type] ?? qr.type} {qr.time}
        </span>
      ))}
    </div>
  );
}

export function WorkerTable({
  workers,
  loading,
  qrByWorker,
  todayAtt,
  shiftDefs,
  canEditWorkers,
  canDeleteWorker,
  search,
  setSearch,
  onEdit,
  onPreview,
  onDelete,
  onQuickAtt,
  onPhotoUpload,
  resolvePhotoUrl,
  onExportExcel,
  onExportPdf,
  onNew,
}: WorkerTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const today = new Date();

  const filtered = (() => {
    const q = search.toLowerCase().trim();
    if (!q) return workers;
    return workers.filter(
      (w) =>
        w.full_name.toLowerCase().includes(q) ||
        w.rut.toLowerCase().includes(q) ||
        w.position.toLowerCase().includes(q),
    );
  })();

  const { page, totalPages, pageItems, setPage, total } = usePagination(filtered, 50);

  function toggleExpand(id: string) {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (loading) return <Spinner />;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, RUT o cargo..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={onExportExcel}>
            <FileSpreadsheet size={15} /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={onExportPdf}>
            <FileText size={15} /> PDF
          </Button>
          {canEditWorkers && (
            <Button size="sm" onClick={onNew}>
              <Plus size={15} /> Nuevo Trabajador
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader
          title="Dotación de Trabajadores"
          subtitle={`${total} registros · Semáforo de documentos por vencer`}
        />
        {filtered.length === 0 ? (
          <EmptyState message="No hay trabajadores registrados" icon={<Users size={32} />} />
        ) : (
          <>
            {/* ── Mobile: card layout (< 640px) ── */}
            <div className="sm:hidden divide-y divide-slate-100">
              {pageItems.flatMap((w) => {
                const isExpanded = expandedRows.has(w.id);
                return [
                  <div key={w.id} className="p-3">
                    <div className="flex items-start gap-2.5">
                      <button
                        onClick={() => toggleExpand(w.id)}
                        className="p-1 -ml-1 rounded hover:bg-slate-100 transition-colors shrink-0 mt-1"
                        title={isExpanded ? "Ocultar detalles" : "Ver detalles"}
                      >
                        {isExpanded ? (
                          <ChevronUp size={16} className="text-slate-400" />
                        ) : (
                          <ChevronDown size={16} className="text-slate-400" />
                        )}
                      </button>
                      <PhotoAvatar
                        worker={w}
                        resolvePhotoUrl={resolvePhotoUrl}
                        onPhotoUpload={onPhotoUpload}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-slate-800 truncate">
                            {w.full_name}
                          </p>
                          <ShiftBadge worker={w} shiftDefs={shiftDefs} />
                        </div>
                        <p className="text-[11px] text-slate-500 font-mono mt-0.5">{w.rut}</p>
                        <p className="text-xs text-slate-600 truncate mt-0.5">{w.position}</p>
                        <div className="flex items-center gap-3 mt-1.5">
                          <div className="flex items-center gap-1" title="Examen ocupacional">
                            <span className="text-[10px] text-slate-400">Ex</span>
                            <ExpiryBadge
                              date={w.occupational_exam_exp_date}
                              today={today}
                              compact
                            />
                          </div>
                          <div className="flex items-center gap-1" title="Licencia de conducir">
                            <span className="text-[10px] text-slate-400">Lic</span>
                            <ExpiryBadge date={w.driver_license_exp_date} today={today} compact />
                          </div>
                          <div className="flex items-center gap-1" title="IRL firmada">
                            <span className="text-[10px] text-slate-400">IRL</span>
                            <ExpiryBadge date={w.irl_signed_date} today={today} compact />
                          </div>
                          <div className="flex items-center gap-1 ml-auto">
                            <QrToday worker={w} qrByWorker={qrByWorker} />
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-2.5">
                          <QuickAttButtons worker={w} todayAtt={todayAtt} onQuickAtt={onQuickAtt} />
                          <div className="flex gap-1 shrink-0">
                            <button
                              onClick={() => onPreview(w)}
                              className="p-1.5 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 rounded"
                              title="Abrir Portal del Trabajador"
                            >
                              <Eye size={15} />
                            </button>
                            {canEditWorkers && (
                              <button
                                onClick={() => onEdit(w)}
                                className="p-1.5 text-slate-500 hover:bg-blue-50 hover:text-blue-600 rounded"
                              >
                                <Pencil size={15} />
                              </button>
                            )}
                            {canDeleteWorker && (
                              <button
                                onClick={() => onDelete(w)}
                                className="p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 rounded"
                                title="Eliminar"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <WorkerDetailRow w={w} />
                      </div>
                    )}
                  </div>,
                ];
              })}
            </div>

            {/* ── Desktop: compact table (≥ 640px) ── */}
            <div className="hidden sm:block overflow-x-auto -mx-1 px-1">
              <table className="w-full text-xs min-w-[900px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-500 uppercase">
                    <th className="px-3 py-2.5 w-10 font-medium"></th>
                    <th className="px-3 py-2.5 font-medium whitespace-nowrap">RUT</th>
                    <th className="px-3 py-2.5 font-medium whitespace-nowrap">Nombre</th>
                    <th className="px-3 py-2.5 font-medium whitespace-nowrap">Cargo</th>
                    <th className="px-3 py-2.5 font-medium whitespace-nowrap">Turno</th>
                    <th className="px-3 py-2.5 font-medium whitespace-nowrap">Examen</th>
                    <th className="px-3 py-2.5 font-medium whitespace-nowrap">Lic.</th>
                    <th className="px-3 py-2.5 font-medium whitespace-nowrap">IRL</th>
                    <th className="px-3 py-2.5 font-medium whitespace-nowrap">QR Hoy</th>
                    <th className="px-3 py-2.5 font-medium text-center whitespace-nowrap">Lista</th>
                    <th className="px-3 py-2.5 font-medium text-right sticky right-0 bg-slate-50 z-10 whitespace-nowrap">
                      Acc.
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.flatMap((w) => {
                    const isExpanded = expandedRows.has(w.id);
                    return [
                      <tr key={w.id} className="group border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => toggleExpand(w.id)}
                              className="p-1 rounded hover:bg-slate-200 transition-colors"
                              title={isExpanded ? "Ocultar detalles" : "Ver detalles"}
                            >
                              {isExpanded ? (
                                <ChevronUp size={14} className="text-slate-400" />
                              ) : (
                                <ChevronDown size={14} className="text-slate-400" />
                              )}
                            </button>
                            <PhotoAvatar
                              worker={w}
                              resolvePhotoUrl={resolvePhotoUrl}
                              onPhotoUpload={onPhotoUpload}
                            />
                          </div>
                        </td>
                        <td className="px-3 py-2 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                          {w.rut}
                        </td>
                        <td
                          className="px-3 py-2 font-medium text-slate-800 whitespace-nowrap"
                          title={w.full_name}
                        >
                          {w.full_name}
                        </td>
                        <td
                          className="px-3 py-2 text-slate-600 whitespace-nowrap"
                          title={w.position}
                        >
                          {w.position}
                        </td>
                        <td className="px-3 py-2">
                          <ShiftBadge worker={w} shiftDefs={shiftDefs} />
                        </td>
                        <td className="px-3 py-2">
                          <ExpiryBadge date={w.occupational_exam_exp_date} today={today} />
                        </td>
                        <td className="px-3 py-2">
                          <ExpiryBadge date={w.driver_license_exp_date} today={today} />
                        </td>
                        <td className="px-3 py-2">
                          <ExpiryBadge date={w.irl_signed_date} today={today} />
                        </td>
                        <td className="px-3 py-2">
                          <QrToday worker={w} qrByWorker={qrByWorker} />
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center justify-center gap-1">
                            {QUICK_ATT.map((q) => {
                              const Icon = q.icon;
                              const isActive = todayAtt.get(w.rut) === q.value;
                              return (
                                <button
                                  key={q.value}
                                  onClick={() => onQuickAtt(w, q.value)}
                                  title={q.title}
                                  className={`w-7 h-7 flex items-center justify-center rounded-md border text-xs font-bold transition-all ${isActive ? q.activeClass : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"}`}
                                >
                                  <Icon size={12} />
                                </button>
                              );
                            })}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right sticky right-0 bg-white z-10 border-l border-slate-100 group-hover:bg-slate-50">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => onPreview(w)}
                              className="p-1.5 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 rounded"
                              title="Abrir Portal del Trabajador"
                            >
                              <Eye size={15} />
                            </button>
                            {canEditWorkers && (
                              <button
                                onClick={() => onEdit(w)}
                                className="p-1.5 text-slate-500 hover:bg-blue-50 hover:text-blue-600 rounded"
                              >
                                <Pencil size={15} />
                              </button>
                            )}
                            {canDeleteWorker && (
                              <button
                                onClick={() => onDelete(w)}
                                className="p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 rounded"
                                title="Eliminar"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>,
                      isExpanded && (
                        <tr
                          key={w.id + "-detail"}
                          className="bg-slate-50/60 border-b border-slate-100"
                        >
                          <td colSpan={11} className="px-4 sm:px-8 py-4">
                            <WorkerDetailRow w={w} />
                          </td>
                        </tr>
                      ),
                    ];
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
                <span className="text-xs text-slate-500">
                  Página {page} de {totalPages} · {total} trabajadores
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="px-3 text-xs font-medium text-slate-700">
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
