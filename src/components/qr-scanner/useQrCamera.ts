import { useState, useRef, useCallback, useEffect } from "react";
import type { Html5Qrcode as Html5QrcodeType } from "html5-qrcode";
import { CONTAINER_ID } from "./constants";

interface CameraInfo {
  id: string;
  label: string;
}

export function useQrCamera(
  onScan: (decodedText: string) => void,
  containerId: string = CONTAINER_ID,
) {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [activeCameraId, setActiveCameraId] = useState<string | undefined>(undefined);
  const [cameras, setCameras] = useState<CameraInfo[]>([]);
  const [showCameraSelect, setShowCameraSelect] = useState(false);
  const [loadingCameras, setLoadingCameras] = useState(false);

  const scannerRef = useRef<Html5QrcodeType | null>(null);
  const onScanRef = useRef(onScan);
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (scanner) {
      try {
        if (scanner.isScanning) await scanner.stop();
      } catch {
        // Camera may already have been stopped by the browser or component cleanup.
      }
      try {
        await scanner.clear();
      } catch {
        // The container may already have been cleared during an interrupted start.
      }
    }
    setScanning(false);
    setTorchOn(false);
    setTorchAvailable(false);
  }, []);

  const startScanner = useCallback(
    async (cameraId?: string) => {
      setError(null);
      if (scannerRef.current) {
        await stopScanner();
      }

      try {
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");
        const html5QrCode = new Html5Qrcode(containerId, {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          useBarCodeDetectorIfSupported: true,
          verbose: false,
        });
        scannerRef.current = html5QrCode;

        const config = {
          fps: 10,
          qrbox: { width: 240, height: 240 },
          aspectRatio: 1.0,
          disableFlip: false,
        };

        const cameraConfig = cameraId
          ? { deviceId: { exact: cameraId } }
          : { facingMode: "environment" };

        try {
          await html5QrCode.start(
            cameraConfig,
            config,
            (decodedText: string) => {
              onScanRef.current(decodedText);
            },
            () => {},
          );
        } catch (startErr) {
          if (!cameraId) {
            const { Html5Qrcode } = await import("html5-qrcode");
            const devices = await Html5Qrcode.getCameras();
            if (devices.length > 0) {
              await html5QrCode.start(
                { deviceId: { exact: devices[0].id } },
                config,
                (decodedText: string) => {
                  onScanRef.current(decodedText);
                },
                () => {},
              );
              setActiveCameraId(devices[0].id);
            } else {
              throw startErr;
            }
          } else {
            throw startErr;
          }
        }
        setScanning(true);
        setError(null);
        void (async () => {
          try {
            const devices = await Html5Qrcode.getCameras();
            setCameras(
              devices.map((device, index) => ({
                id: device.id,
                label: device.label || `Camara ${index + 1}`,
              })),
            );
          } catch {
            setCameras([]);
          }
        })();

        try {
          const capabilities = (
            html5QrCode as unknown as {
              getRunningTrackCameraCapabilities?: () => { torchFeatureAvailable?: () => boolean };
            }
          ).getRunningTrackCameraCapabilities?.();
          if (capabilities?.torchFeatureAvailable?.()) {
            setTorchAvailable(true);
          }
        } catch {
          setTorchAvailable(false);
        }
      } catch (e) {
        const msg = (e as Error).message || "";
        if (msg.includes("Permission") || msg.includes("NotAllowed") || msg.includes("denied")) {
          setError(
            "Permiso de camara denegado. Permite el acceso a la camara en tu navegador y vuelve a intentarlo.",
          );
        } else if (
          msg.includes("NotFound") ||
          msg.includes("NotReadable") ||
          msg.includes("device")
        ) {
          setError("No se encontro ninguna camara. Conecta una camara y vuelve a intentarlo.");
        } else if (msg.includes("Insecure") || msg.includes("HTTPS")) {
          setError("Se requiere conexion segura (HTTPS) para acceder a la camara.");
        } else {
          setError("No se pudo iniciar la camara: " + msg);
        }
      }
    },
    [stopScanner], // eslint-disable-line react-hooks/exhaustive-deps -- reviewed dependency set; unstable callback recreation is intentional to avoid loops
  );

  const toggleTorch = useCallback(async () => {
    if (!scannerRef.current) return;
    try {
      const capabilities = (
        scannerRef.current as unknown as {
          applyVideoConstraints?: (c: MediaTrackConstraints) => Promise<void>;
        }
      ).applyVideoConstraints;
      if (capabilities) {
        const newTorch = !torchOn;
        await capabilities.call(scannerRef.current, { torch: newTorch } as MediaTrackConstraints);
        setTorchOn(newTorch);
      }
    } catch {
      setTorchAvailable(false);
    }
  }, [torchOn]);

  const refreshCameras = useCallback(async () => {
    setLoadingCameras(true);
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const devices = await Html5Qrcode.getCameras();
      const labeled = devices.map((d, i) => ({
        id: d.id,
        label: d.label || `Camara ${i + 1}`,
      }));
      setCameras(labeled);
      return labeled;
    } catch (e) {
      setError("No se pudieron listar las camaras: " + (e as Error).message);
      return [];
    } finally {
      setLoadingCameras(false);
    }
  }, []);

  const selectCamera = useCallback(
    async (cameraId: string) => {
      setShowCameraSelect(false);
      setActiveCameraId(cameraId);
      await startScanner(cameraId);
    },
    [startScanner],
  );

  const switchCamera = useCallback(async () => {
    const devices = cameras.length > 0 ? cameras : await refreshCameras();
    if (devices.length === 0) {
      setError("No se encontraron camaras disponibles.");
      return;
    }
    const currentIdx = activeCameraId ? devices.findIndex((d) => d.id === activeCameraId) : -1;
    const nextIdx = (currentIdx + 1) % devices.length;
    const nextId = devices[nextIdx].id;
    setActiveCameraId(nextId);
    await startScanner(nextId);
  }, [activeCameraId, startScanner, cameras, refreshCameras]);

  useEffect(() => {
    return () => {
      void stopScanner();
    };
  }, [stopScanner]);

  return {
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
  };
}
