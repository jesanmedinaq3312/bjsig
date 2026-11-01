import { useState, useRef, useEffect, useCallback } from "react";
import { ScanLine, X, Satellite, SatelliteDish } from "lucide-react";
import { getServerDeviceId } from "@/lib/gps";
import type { QrScanType } from "@/lib/types";
import type { AppData } from "@/hooks/useAppData";
import { useGpsTracking } from "./qr-scanner/useGpsTracking";
import { useQrCamera } from "./qr-scanner/useQrCamera";
import { useScanProcessor } from "./qr-scanner/useScanProcessor";
import { GpsBanner } from "./qr-scanner/GpsBanner";
import { ScanTypeSelector } from "./qr-scanner/ScanTypeSelector";
import { ScannerViewport } from "./qr-scanner/ScannerViewport";
import { ScanResultCard } from "./qr-scanner/ScanResultCard";
import { ScanHistory } from "./qr-scanner/ScanHistory";

interface QrScannerProps {
  data: AppData;
  onClose: () => void;
}

export function QrScanner({ data, onClose }: QrScannerProps) {
  const { workers } = data;
  const [selectedType, setSelectedType] = useState<QrScanType>("entrada");
  const deviceIdRef = useRef<string>("");

  useEffect(() => {
    getServerDeviceId().then((id) => {
      deviceIdRef.current = id;
    });
  }, []);

  const { gpsStatus, gpsBlocked, ensureGps } = useGpsTracking();

  const { lastResult, scanHistory, saving, processScan } = useScanProcessor({
    workers,
    selectedType,
    ensureGps,
    deviceIdRef,
    data,
  });

  const {
    scanning,
    error,
    torchOn,
    torchAvailable,
    activeCameraId,
    cameras,
    showCameraSelect,
    loadingCameras,
    setError,
    setShowCameraSelect,
    startScanner,
    stopScanner,
    toggleTorch,
    refreshCameras,
    selectCamera,
    switchCamera,
  } = useQrCamera(processScan);

  const handleClose = useCallback(() => {
    stopScanner();
    onClose();
  }, [stopScanner, onClose]);

  return (
    <div className="fixed inset-0 z-[90] bg-slate-900/95 backdrop-blur-sm flex flex-col animate-fade-in">
      <style>{`
        .swal2-confirm-gyc {
          background: #1d4ed8 !important; color: #fff !important;
          padding: 8px 20px !important; border-radius: 8px !important;
          font-size: 14px !important; font-weight: 600 !important; margin: 0 4px !important;
        }
        .swal2-cancel-gyc {
          background: #e2e8f0 !important; color: #334155 !important;
          padding: 8px 20px !important; border-radius: 8px !important;
          font-size: 14px !important; font-weight: 600 !important; margin: 0 4px !important;
        }
        .swal2-popup-gyc { border-radius: 16px !important; font-family: inherit !important; }
      `}</style>

      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <ScanLine size={22} className="text-blue-400" />
          <h2 className="text-white font-semibold">Escanner QR de Asistencia</h2>
        </div>
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
              gpsStatus === "ok"
                ? "bg-emerald-900/50 border-emerald-600 text-emerald-300"
                : gpsStatus === "acquiring"
                  ? "bg-amber-900/50 border-amber-600 text-amber-300"
                  : "bg-red-900/50 border-red-600 text-red-300"
            }`}
          >
            {gpsStatus === "ok" ? <SatelliteDish size={13} /> : <Satellite size={13} />}
            {gpsStatus === "ok"
              ? "GPS Activo"
              : gpsStatus === "acquiring"
                ? "Obteniendo GPS..."
                : "GPS Desactivado"}
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 max-w-2xl w-full mx-auto">
        <GpsBanner gpsBlocked={gpsBlocked} ensureGps={ensureGps} />

        <ScanTypeSelector
          selectedType={selectedType}
          scanning={scanning}
          onSelect={setSelectedType}
        />

        <ScannerViewport
          scanning={scanning}
          saving={saving}
          error={error}
          torchOn={torchOn}
          torchAvailable={torchAvailable}
          cameras={cameras}
          activeCameraId={activeCameraId}
          showCameraSelect={showCameraSelect}
          loadingCameras={loadingCameras}
          onStart={() => startScanner()}
          onStop={stopScanner}
          onToggleTorch={toggleTorch}
          onRefreshCameras={refreshCameras}
          onShowCameraSelect={() => setShowCameraSelect(true)}
          onSelectCamera={selectCamera}
          onSwitchCamera={switchCamera}
          onCloseCameraSelect={() => setShowCameraSelect(false)}
        />

        {lastResult && <ScanResultCard result={lastResult} />}

        <ScanHistory history={scanHistory} />

        <div className="mt-4 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
          <p className="text-xs text-slate-400">
            <strong className="text-slate-300">Como usar:</strong> Selecciona el tipo de registro
            (entrada, salida, almuerzo, etc.), activa la camara y apunta al codigo QR de la tarjeta
            del trabajador. La app valida automaticamente al trabajador y registra el evento con
            fecha, hora, coordenadas GPS y el identificador del dispositivo. Si el GPS esta
            desactivado, el registro se marca como "Marcaje sin GPS" para auditoria.
          </p>
        </div>
      </div>
    </div>
  );
}
