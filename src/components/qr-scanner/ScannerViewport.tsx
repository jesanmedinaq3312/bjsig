import { Camera, CameraOff, Zap, ZapOff, Video, RefreshCw, CheckCircle2 } from "lucide-react";
import { Card, Button } from "@/components/ui";
import { CONTAINER_ID } from "./constants";

interface CameraInfo {
  id: string;
  label: string;
}

interface ScannerViewportProps {
  scanning: boolean;
  saving: boolean;
  error: string | null;
  torchOn: boolean;
  torchAvailable: boolean;
  cameras: CameraInfo[];
  activeCameraId: string | undefined;
  showCameraSelect: boolean;
  loadingCameras: boolean;
  onStart: () => void;
  onStop: () => void;
  onToggleTorch: () => void;
  onRefreshCameras: () => void;
  onShowCameraSelect: () => void;
  onSelectCamera: (id: string) => void;
  onSwitchCamera: () => void;
  onCloseCameraSelect: () => void;
}

export function ScannerViewport({
  scanning,
  saving,
  error,
  torchOn,
  torchAvailable,
  cameras,
  activeCameraId,
  showCameraSelect,
  loadingCameras,
  onStart,
  onStop,
  onToggleTorch,
  onRefreshCameras,
  onShowCameraSelect,
  onSelectCamera,
  onSwitchCamera,
  onCloseCameraSelect,
}: ScannerViewportProps) {
  return (
    <Card className="p-4 bg-slate-800 border-slate-700">
      <div className="relative w-full max-w-sm mx-auto">
        <div
          id={CONTAINER_ID}
          className="w-full rounded-lg overflow-hidden bg-black min-h-[280px] relative"
        />
        {scanning && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="relative w-[240px] h-[240px]">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-[3px] border-l-[3px] border-blue-400 rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-[3px] border-r-[3px] border-blue-400 rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-[3px] border-l-[3px] border-blue-400 rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-[3px] border-r-[3px] border-blue-400 rounded-br-lg" />
              <div
                className="absolute left-0 right-0 top-1/2 h-0.5 bg-blue-400/70 animate-pulse"
                style={{ boxShadow: "0 0 8px rgba(96,165,250,0.8)" }}
              />
            </div>
          </div>
        )}
        {scanning && saving && (
          <div className="absolute top-2 right-2 bg-blue-600/90 text-white text-xs px-2.5 py-1 rounded-full flex items-center gap-1.5 animate-fade-in">
            <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />{" "}
            Procesando...
          </div>
        )}
        {scanning && !saving && (
          <div className="absolute top-2 right-2 bg-emerald-600/90 text-white text-xs px-2.5 py-1 rounded-full animate-fade-in">
            Listo para escanear
          </div>
        )}
      </div>

      {error && (
        <div className="mt-3 flex items-start gap-2 px-3 py-2 bg-red-900/40 border border-red-700 rounded-lg text-sm text-red-300 animate-fade-in">
          <span>{error}</span>
        </div>
      )}

      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {!scanning ? (
          <Button onClick={onStart} loading={saving}>
            <Camera size={16} /> Activar camara
          </Button>
        ) : (
          <>
            <Button variant="danger" onClick={onStop}>
              <CameraOff size={16} /> Detener
            </Button>
            {torchAvailable && (
              <Button
                variant="outline"
                size="sm"
                onClick={onToggleTorch}
                className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
              >
                {torchOn ? <ZapOff size={15} /> : <Zap size={15} />}
                {torchOn ? "Apagar luz" : "Encender luz"}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onRefreshCameras();
                onShowCameraSelect();
              }}
              className="bg-slate-700 border-slate-600 text-black hover:bg-slate-600"
            >
              <Video size={15} /> Elegir camara
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onSwitchCamera}
              className="bg-slate-700 border-slate-600 text-black hover:bg-slate-600"
            >
              <RefreshCw size={15} /> Rotar camara
            </Button>
          </>
        )}
      </div>

      {showCameraSelect && (
        <div className="mt-3 p-3 bg-slate-700/50 rounded-lg border border-slate-600 animate-fade-in">
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
                  onClick={() => onSelectCamera(cam.id)}
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
            onClick={onCloseCameraSelect}
            className="mt-2 text-xs text-slate-400 hover:text-slate-200"
          >
            Cerrar
          </button>
        </div>
      )}
    </Card>
  );
}
