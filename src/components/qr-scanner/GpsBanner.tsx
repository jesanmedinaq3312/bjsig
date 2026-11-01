import { AlertTriangle, Satellite } from "lucide-react";
import { Button } from "@/components/ui";
import type { GpsPosition } from "@/lib/gps";

interface GpsBannerProps {
  gpsBlocked: boolean;
  ensureGps: () => Promise<GpsPosition | null>;
}

export function GpsBanner({ gpsBlocked, ensureGps }: GpsBannerProps) {
  if (!gpsBlocked) return null;
  return (
    <div className="mb-3 flex items-start gap-2 px-3 py-2.5 bg-amber-900/40 border border-amber-600 rounded-lg text-sm text-amber-200 animate-fade-in">
      <AlertTriangle size={16} className="shrink-0 mt-0.5" />
      <div>
        <p className="font-medium">GPS desactivado</p>
        <p className="text-xs text-amber-300/80 mt-0.5">
          Los escaneos se registraran como "Marcaje sin GPS". Activa el GPS del dispositivo para
          registros con coordenadas.
        </p>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="ml-auto bg-amber-800 border-amber-600 text-amber-100 hover:bg-amber-700"
        onClick={() => ensureGps()}
      >
        <Satellite size={14} /> Reintentar
      </Button>
    </div>
  );
}
