import { History, CheckCircle2, XCircle, AlertTriangle, MapPin } from "lucide-react";
import { getScanTypeMeta } from "./constants";
import type { ScanResult } from "./types";

export function ScanHistory({ history }: { history: ScanResult[] }) {
  if (history.length === 0) return null;
  return (
    <div className="mt-4">
      <p className="text-xs text-slate-400 mb-2 font-medium flex items-center gap-1.5">
        <History size={12} /> Registros recientes ({history.length}):
      </p>
      <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
        {history.map((r, i) => {
          const meta = getScanTypeMeta(r.scanType);
          const Icon = meta.icon;
          return (
            <div
              key={i}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border text-sm ${
                r.ok
                  ? "bg-slate-800 border-slate-700"
                  : r.duplicate
                    ? "bg-amber-900/20 border-amber-800"
                    : "bg-red-900/20 border-red-800"
              }`}
            >
              {r.ok ? (
                <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
              ) : r.duplicate ? (
                <AlertTriangle size={15} className="text-amber-400 shrink-0" />
              ) : (
                <XCircle size={15} className="text-red-400 shrink-0" />
              )}
              <Icon size={14} className={meta.color + " shrink-0"} />
              <span className="text-slate-300 flex-1 truncate">
                {r.worker ? r.worker.full_name : "Desconocido"}
              </span>
              {r.gpsMissing && <AlertTriangle size={11} className="text-amber-400 shrink-0" />}
              {!r.gpsMissing && r.gps && <MapPin size={11} className="text-emerald-400 shrink-0" />}
              <span className="text-xs text-slate-500">{meta.label}</span>
              <span className="text-xs text-slate-500">{r.time}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
