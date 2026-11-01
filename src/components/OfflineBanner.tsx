import { useState, useEffect } from "react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { syncQueuedScans } from "@/lib/offlineQueue";
import { useToast } from "@/components/Toast";
import { Wifi, WifiOff, RefreshCw, Upload, CloudOff, AlertTriangle } from "lucide-react";

export function OfflineBanner() {
  const { online, wasOffline, queuedCount, syncInProgress } = useOnlineStatus();
  const [syncing, setSyncing] = useState(false);
  const toast = useToast();

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { discarded: number };
      toast.error(
        "Escaneos descartados",
        `${detail.discarded} escaneo(s) no pudieron sincronizarse tras varios intentos y fueron descartados. Revisa los registros de asistencia.`,
      );
    };
    window.addEventListener("offline-queue:discarded", handler);
    return () => window.removeEventListener("offline-queue:discarded", handler);
  }, [toast]);

  if (online && !wasOffline && queuedCount === 0) return null;

  const handleManualSync = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const result = await syncQueuedScans();
      if (result.discarded > 0) {
        toast.error(
          "Escaneos descartados",
          `${result.discarded} escaneo(s) no pudieron sincronizarse tras varios intentos y fueron descartados. Revisa los registros de asistencia para confirmar.`,
        );
      }
      if (result.synced > 0) {
        toast.success("Sincronización completa", `${result.synced} registro(s) sincronizado(s)`);
      }
    } finally {
      setSyncing(false);
    }
  };

  if (syncInProgress || syncing) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[60] bg-blue-600 text-white px-4 py-2 flex items-center justify-center gap-2 text-sm shadow-lg animate-slide-down">
        <Upload size={16} className="animate-pulse" />
        <span>Sincronizando {queuedCount > 0 ? `${queuedCount} ` : ""}registros encolados...</span>
      </div>
    );
  }

  if (!online) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[60] bg-amber-600 text-white px-4 py-2 flex items-center justify-center gap-2 text-sm shadow-lg">
        <WifiOff size={16} />
        <span>
          Sin conexion — los escaneos se guardaran localmente y se enviaran al recuperar la red.
        </span>
        {queuedCount > 0 && (
          <span className="bg-amber-800 rounded-full px-2 py-0.5 text-xs font-bold">
            {queuedCount} en cola
          </span>
        )}
      </div>
    );
  }

  if (wasOffline && queuedCount > 0) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[60] bg-blue-600 text-white px-4 py-2 flex items-center justify-center gap-2 text-sm shadow-lg animate-slide-down">
        <CloudOff size={16} />
        <span>
          {queuedCount} registro{queuedCount !== 1 ? "s" : ""} pendiente
          {queuedCount !== 1 ? "s" : ""} de sincronizar.
        </span>
        <button
          onClick={handleManualSync}
          className="ml-2 flex items-center gap-1 bg-blue-800 hover:bg-blue-700 rounded-full px-3 py-0.5 text-xs font-semibold transition-colors"
        >
          <RefreshCw size={12} /> Sincronizar ahora
        </button>
      </div>
    );
  }

  if (wasOffline && queuedCount === 0) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[60] bg-emerald-600 text-white px-4 py-2 flex items-center justify-center gap-2 text-sm shadow-lg animate-slide-down">
        <Wifi size={16} />
        <span>Conexion restablecida. Todos los datos sincronizados.</span>
      </div>
    );
  }

  return null;
}
