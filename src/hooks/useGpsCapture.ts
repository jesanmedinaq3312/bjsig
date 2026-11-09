import { useCallback, useEffect, useState } from "react";
import {
  GPS_CAPTURE_MAX_AGE_MS,
  isFreshGpsCapture,
  refreshGpsCache,
  type GpsPosition,
} from "@/lib/gps";

export type GpsCaptureStatus = "idle" | "capturing" | "ready" | "denied";

export function useGpsCapture() {
  const [position, setPosition] = useState<GpsPosition | null>(null);
  const [status, setStatus] = useState<GpsCaptureStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const capture = useCallback(async () => {
    setStatus("capturing");
    setError(null);
    const next = await refreshGpsCache();
    if (!next || !isFreshGpsCapture(next)) {
      setPosition(null);
      setStatus("denied");
      setError(
        "No se obtuvo una ubicación reciente. Activa la ubicación del navegador y vuelve a intentarlo.",
      );
      return null;
    }
    setPosition(next);
    setStatus("ready");
    return next;
  }, []);

  useEffect(() => {
    if (!position || status !== "ready") return;
    const expiresIn = Math.max(0, position.capturedAt + GPS_CAPTURE_MAX_AGE_MS - Date.now() + 1);
    const timeout = window.setTimeout(() => {
      setStatus("idle");
      setError("La captura GPS tiene más de 2 minutos; vuelve a compartir tu ubicación.");
    }, expiresIn);
    return () => window.clearTimeout(timeout);
  }, [position, status]);

  return { position, status, error, capture };
}
