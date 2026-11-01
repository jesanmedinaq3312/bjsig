import { CheckCircle2, XCircle, AlertTriangle, Clock, MapPin } from "lucide-react";
import { Badge } from "@/components/ui";
import { getScanTypeMeta } from "./constants";
import type { ScanResult } from "./types";

export function ScanResultCard({ result }: { result: ScanResult }) {
  const meta = getScanTypeMeta(result.scanType);

  return (
    <div
      className={`mt-4 p-4 rounded-xl border animate-scale-in ${
        result.ok
          ? "bg-emerald-900/30 border-emerald-700"
          : result.duplicate
            ? "bg-amber-900/30 border-amber-700"
            : "bg-red-900/30 border-red-700"
      }`}
    >
      <div className="flex items-start gap-3">
        {result.ok ? (
          <CheckCircle2 size={28} className="text-emerald-400 shrink-0" />
        ) : result.duplicate ? (
          <AlertTriangle size={28} className="text-amber-400 shrink-0" />
        ) : (
          <XCircle size={28} className="text-red-400 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p
            className={`font-semibold ${result.ok ? "text-emerald-300" : result.duplicate ? "text-amber-300" : "text-red-300"}`}
          >
            {result.ok ? "Registro exitoso" : result.duplicate ? "Registro duplicado" : "Error"}
          </p>
          {result.worker && (
            <p className="text-sm text-white mt-0.5">
              {result.worker.full_name} · {result.worker.rut}
            </p>
          )}
          <p className="text-xs text-slate-400 mt-0.5">{result.message}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <Badge className={`${meta.bg} ${meta.color} border`}>{meta.label}</Badge>
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Clock size={11} /> {result.time}
            </span>
            {result.gpsMissing ? (
              <span
                className="text-xs text-amber-400 flex items-center gap-1"
                title="Marcaje sin GPS"
              >
                <AlertTriangle size={11} /> Sin GPS
              </span>
            ) : result.gps ? (
              <span
                className="text-xs text-emerald-400 flex items-center gap-1"
                title={`${result.gps.latitude.toFixed(5)}, ${result.gps.longitude.toFixed(5)}`}
              >
                <MapPin size={11} /> {result.gps.latitude.toFixed(4)},{" "}
                {result.gps.longitude.toFixed(4)}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
