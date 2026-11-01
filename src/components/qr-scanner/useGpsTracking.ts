import { useState, useRef, useCallback, useEffect } from "react";
import { getGpsPosition, gpsSupported, type GpsPosition } from "@/lib/gps";

export type GpsStatus = "idle" | "acquiring" | "ok" | "missing";

export function useGpsTracking() {
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>("idle");
  const [gpsPos, setGpsPos] = useState<GpsPosition | null>(null);
  const [gpsBlocked, setGpsBlocked] = useState(false);
  const gpsPosRef = useRef<GpsPosition | null>(null);

  useEffect(() => {
    gpsPosRef.current = gpsPos;
  }, [gpsPos]);

  useEffect(() => {
    if (!gpsSupported()) {
      setGpsStatus("missing");
      return;
    }
    setGpsStatus("acquiring");
    getGpsPosition(8000).then((pos) => {
      if (pos) {
        setGpsPos(pos);
        setGpsStatus("ok");
      } else {
        setGpsStatus("missing");
        setGpsBlocked(true);
      }
    });
  }, []);

  const ensureGps = useCallback(async (): Promise<GpsPosition | null> => {
    if (gpsPosRef.current) return gpsPosRef.current;
    setGpsStatus("acquiring");
    const pos = await getGpsPosition(8000);
    if (pos) {
      setGpsPos(pos);
      setGpsStatus("ok");
      setGpsBlocked(false);
    } else {
      setGpsStatus("missing");
      setGpsBlocked(true);
    }
    return pos;
  }, []);

  return { gpsStatus, gpsPos, gpsBlocked, ensureGps };
}
