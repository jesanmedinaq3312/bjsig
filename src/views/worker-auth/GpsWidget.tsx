import { MapPin, MapPinOff, Loader2, LocateFixed } from "lucide-react";
import type { GpsPosition } from "@/lib/gps";

export type GpsStatus = "idle" | "loading" | "active" | "denied";

export function GpsWidget({
  gpsStatus,
  gpsPosition,
  onEnable,
  supported,
  accent = "cyan",
}: {
  gpsStatus: GpsStatus;
  gpsPosition: GpsPosition | null;
  onEnable: () => void;
  supported: boolean;
  accent?: "cyan" | "blue";
}) {
  const accentText = accent === "blue" ? "text-blue-300" : "text-cyan-300";
  const accentBorder =
    accent === "blue"
      ? "hover:border-blue-400/50 hover:bg-blue-500/10"
      : "hover:border-cyan-400/50 hover:bg-cyan-500/10";

  return (
    <div
      role={!supported || gpsStatus === "denied" ? "alert" : "status"}
      className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-md [box-shadow:inset_0_1px_0_0_rgba(255,255,255,0.05)] overflow-hidden"
    >
      <div className="flex items-center gap-2.5 p-3">
        {!supported || gpsStatus === "denied" ? (
          <MapPinOff size={16} className="shrink-0 text-amber-400" />
        ) : gpsStatus === "active" ? (
          <MapPin size={16} className="shrink-0 text-emerald-400" />
        ) : (
          <MapPin size={16} className="shrink-0 text-white/40" />
        )}
        <div className="flex-1 min-w-0">
          {!supported ? (
            <p className="text-xs font-medium text-amber-300/90">
              Este navegador no permite geolocalización. Usa un navegador compatible y habilita
              ubicación para acceder.
            </p>
          ) : gpsStatus === "active" ? (
            <p className="text-xs font-medium text-emerald-300">
              GPS activo. Los campos de acceso están habilitados.
            </p>
          ) : gpsStatus === "denied" ? (
            <p className="text-xs font-medium text-amber-300/90">
              No pudimos acceder al GPS. Permite ubicación en el navegador y reintenta; los campos
              seguirán bloqueados.
            </p>
          ) : gpsStatus === "loading" ? (
            <p className="text-xs font-medium text-white/60">
              Solicitando ubicación; los campos seguirán bloqueados hasta activarla.
            </p>
          ) : (
            <p className="text-xs font-medium text-white/60">
              Activa el GPS para habilitar los campos de acceso.
            </p>
          )}
          {supported && gpsStatus === "active" && gpsPosition && (
            <p className="text-[10px] text-white/40 mt-0.5">
              {gpsPosition.latitude.toFixed(4)}, {gpsPosition.longitude.toFixed(4)} (±
              {Math.round(gpsPosition.accuracy)}m)
            </p>
          )}
        </div>
      </div>
      {supported && gpsStatus !== "active" && (
        <button
          type="button"
          onClick={onEnable}
          disabled={gpsStatus === "loading"}
          className={`w-full flex items-center justify-center gap-2 py-2 text-[11px] font-semibold border-t border-white/10 transition-all duration-200 disabled:opacity-60 ${accentText} ${accentBorder}`}
        >
          {gpsStatus === "loading" ? (
            <>
              <Loader2 size={13} className="animate-spin" /> Solicitando ubicación...
            </>
          ) : gpsStatus === "denied" ? (
            <>
              <LocateFixed size={13} /> Reintentar activación GPS
            </>
          ) : (
            <>
              <LocateFixed size={13} /> Activar GPS
            </>
          )}
        </button>
      )}
    </div>
  );
}
