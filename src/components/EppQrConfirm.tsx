import { useState, useEffect, useRef } from "react";
import {
  ScanLine,
  X,
  CheckCircle2,
  AlertCircle,
  Camera,
  CameraOff,
  Zap,
  ZapOff,
  Video,
  RefreshCw,
} from "lucide-react";
import { useQrCamera } from "@/components/qr-scanner/useQrCamera";
import { normalizeRut, formatRut } from "@/lib/rut";
import { Button } from "@/components/ui";

const EPP_QR_CONTAINER_ID = "epp-qr-reader";

interface EppQrConfirmProps {
  expectedRut: string;
  workerName: string;
  onConfirm: (scannedRut: string) => void;
  onSkip: () => void;
  onClose: () => void;
}

export function EppQrConfirm({
  expectedRut,
  workerName,
  onConfirm,
  onSkip,
  onClose,
}: EppQrConfirmProps) {
  const [scanError, setScanError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const expectedNorm = normalizeRut(expectedRut);

  const handleScan = (decodedText: string) => {
    try {
      const parsed = JSON.parse(decodedText);
      if (parsed.type !== "GYC_ATTENDANCE" || !parsed.rut) {
        setScanError("Este codigo QR no es una tarjeta de trabajador valida.");
        return;
      }
      const scannedRut = normalizeRut(parsed.rut);
      if (scannedRut !== expectedNorm) {
        setScanError(
          `Este QR pertenece a ${parsed.name ?? "otro trabajador"}, no a ${workerName}.`,
        );
        return;
      }
      setConfirmed(true);
      setScanError(null);
      setSubmitting(true);
      void stopScanner().then(() => onConfirm(scannedRut));
    } catch {
      setScanError("Codigo QR no reconocido. Asegurate de escanear la tarjeta del trabajador.");
    }
  };

  const {
    scanning,
    error,
    torchOn,
    torchAvailable,
    activeCameraId,
    cameras,
    showCameraSelect,
    loadingCameras,
    setShowCameraSelect,
    startScanner,
    stopScanner,
    toggleTorch,
    refreshCameras,
    selectCamera,
    switchCamera,
  } = useQrCamera(handleScan, EPP_QR_CONTAINER_ID);

  useEffect(() => {
    void startScanner();
    return () => {
      void stopScanner();
    };
  }, [startScanner, stopScanner]);

  return (
    <div className="fixed inset-0 z-[80] bg-slate-900/95 backdrop-blur-sm flex flex-col items-center animate-fade-in">
      <div className="flex items-center justify-between w-full max-w-md px-4 py-3 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <ScanLine size={20} className="text-blue-400" />
          <h2 className="text-white font-semibold text-sm">Confirmar Entrega con QR</h2>
        </div>
        <button
          onClick={() => {
            if (submitting) return;
            void stopScanner();
            onClose();
          }}
          disabled={submitting}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-40"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-md px-4 py-6 space-y-4">
        <div className="text-center">
          <p className="text-slate-300 text-sm">Escanea el QR de:</p>
          <p className="text-white font-bold text-lg">{workerName}</p>
          <p className="text-slate-400 text-xs font-mono">{formatRut(expectedRut)}</p>
        </div>

        <div className="relative w-full max-w-xs aspect-square rounded-xl overflow-hidden border-2 border-slate-700 bg-slate-950">
          <div id={EPP_QR_CONTAINER_ID} ref={containerRef} className="w-full h-full" />
          {!scanning && !confirmed && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 gap-2 pointer-events-none">
              <CameraOff size={32} />
              <span className="text-xs">Camara detenida</span>
              <div className="pointer-events-auto">
                <Button size="sm" variant="outline" onClick={() => startScanner()}>
                  <Camera size={14} /> Reintentar
                </Button>
              </div>
            </div>
          )}
          {confirmed && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-emerald-900/30 gap-2">
              <CheckCircle2 size={48} className="text-emerald-400" />
              <span className="text-emerald-300 font-semibold text-sm">Identidad confirmada</span>
            </div>
          )}
        </div>

        {error && (
          <div className="w-full p-3 rounded-lg bg-red-900/40 border border-red-700 text-red-300 text-xs flex items-start gap-2">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {scanError && (
          <div className="w-full p-3 rounded-lg bg-amber-900/40 border border-amber-700 text-amber-300 text-xs flex items-start gap-2">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <span>{scanError}</span>
          </div>
        )}

        {scanning && !confirmed && (
          <div className="w-full flex flex-wrap justify-center gap-2">
            <Button size="sm" variant="danger" onClick={stopScanner}>
              <CameraOff size={15} /> Detener
            </Button>
            {torchAvailable && (
              <Button
                size="sm"
                variant="outline"
                onClick={toggleTorch}
                className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
              >
                {torchOn ? <ZapOff size={15} /> : <Zap size={15} />}
                {torchOn ? "Apagar luz" : "Encender luz"}
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                refreshCameras();
                setShowCameraSelect(true);
              }}
              className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
            >
              <Video size={15} /> Elegir camara
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={switchCamera}
              className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
            >
              <RefreshCw size={15} /> Rotar camara
            </Button>
          </div>
        )}

        {showCameraSelect && !confirmed && (
          <div className="w-full p-3 bg-slate-700/50 rounded-lg border border-slate-600 animate-fade-in">
            <p className="text-xs text-slate-300 mb-2 font-medium flex items-center gap-1.5">
              <Video size={13} /> Selecciona una camara:
            </p>
            {loadingCameras ? (
              <p className="text-xs text-slate-400">Cargando camaras...</p>
            ) : cameras.length === 0 ? (
              <p className="text-xs text-red-400">No se encontraron camaras.</p>
            ) : (
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {cameras.map((cam) => (
                  <button
                    key={cam.id}
                    onClick={() => selectCamera(cam.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
                      activeCameraId === cam.id
                        ? "bg-blue-600 text-white"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-600"
                    }`}
                  >
                    <Camera size={13} className="shrink-0" />
                    <span className="truncate flex-1">{cam.label}</span>
                    {activeCameraId === cam.id && <CheckCircle2 size={13} className="shrink-0" />}
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={() => setShowCameraSelect(false)}
              className="mt-2 text-xs text-slate-400 hover:text-slate-200"
            >
              Cerrar
            </button>
          </div>
        )}

        <div className="w-full flex flex-col gap-2 pt-2">
          {confirmed ? (
            <Button
              onClick={() => {
                void stopScanner();
                onClose();
              }}
              disabled={submitting}
              className="w-full"
            >
              <CheckCircle2 size={16} /> Entrega confirmada
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                className="w-full"
                loading={submitting}
                onClick={() => {
                  setSubmitting(true);
                  void stopScanner().then(() => onSkip());
                }}
              >
                Registrar sin QR (excepcion)
              </Button>
              <p className="text-[10px] text-slate-500 text-center">
                La entrega sin QR quedara marcada como excepcion y sera auditada.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
