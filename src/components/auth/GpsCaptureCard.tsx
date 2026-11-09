import { CheckCircle2, LocateFixed, Loader2, MapPin } from "lucide-react";
import type { GpsCaptureStatus } from "@/hooks/useGpsCapture";
import type { GpsPosition } from "@/lib/gps";

interface GpsCaptureCardProps {
  status: GpsCaptureStatus;
  position: GpsPosition | null;
  error: string | null;
  onCapture: () => void;
  variant?: "dark" | "light";
}

export function GpsCaptureCard({
  status,
  position,
  error,
  onCapture,
  variant = "light",
}: GpsCaptureCardProps) {
  const dark = variant === "dark";
  const ready = status === "ready";

  return (
    <section
      aria-label="Verificación de ubicación GPS"
      className={`rounded-xl border p-3.5 ${dark ? "border-white/15 bg-white/5 text-white" : "border-slate-200 bg-slate-50 text-slate-800"}`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${dark ? "bg-cyan-400/10 text-cyan-200" : "bg-blue-100 text-blue-700"}`}
        >
          {ready ? <CheckCircle2 size={18} /> : <MapPin size={18} />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">
            {ready ? "Ubicación lista" : "Verifica tu ubicación"}
          </p>
          <p className={`mt-0.5 text-xs leading-5 ${dark ? "text-white/60" : "text-slate-600"}`}>
            Captura GPS reciente para asociarla a esta sesión. No se actualiza en segundo plano.
          </p>
          {ready && position && (
            <p
              className={`mt-1 text-xs ${dark ? "text-cyan-200" : "text-emerald-700"}`}
              role="status"
            >
              Precisión reportada: ±{Math.round(position.accuracy)} m
            </p>
          )}
          {error && (
            <p className="mt-1 text-xs text-red-600" role="alert">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={onCapture}
            disabled={status === "capturing"}
            className={`mt-2 inline-flex min-h-9 items-center gap-2 rounded-lg px-3 text-xs font-semibold transition disabled:cursor-wait disabled:opacity-60 ${dark ? "bg-cyan-300/15 text-cyan-100 hover:bg-cyan-300/25" : "bg-blue-700 text-white hover:bg-blue-800"}`}
          >
            {status === "capturing" ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Capturando…
              </>
            ) : (
              <>
                <LocateFixed size={14} /> {ready ? "Actualizar ubicación" : "Compartir ubicación"}
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  );
}
