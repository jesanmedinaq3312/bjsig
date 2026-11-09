import { useState, useRef, useCallback, useEffect } from "react";
import { getGpsPosition, isFreshGpsCapture, type GpsPosition } from "@/lib/gps";

export type GpsStatus = "idle" | "acquiring" | "ok" | "missing";

export function useGpsTracking() {
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>("idle");
  const [gpsPos, setGpsPos] = useState<GpsPosition | null>(null);
  const [gpsBlocked, setGpsBlocked] = useState(false);
  const gpsPosRef = useRef<GpsPosition | null>(null);
  const gpsRequestRef = useRef<Promise<GpsPosition | null> | null>(null);

  useEffect(() => {
    gpsPosRef.current = gpsPos;
  }, [gpsPos]);

  const ensureGps = useCallback(async (): Promise<GpsPosition | null> => {
    const current = gpsPosRef.current;
    if (current && isFreshGpsCapture(current)) return current;

    if (gpsRequestRef.current) return gpsRequestRef.current;

    gpsPosRef.current = null;
    setGpsPos(null);
    setGpsStatus("acquiring");

    const request = getGpsPosition(8000)
      .then((pos) => (pos && isFreshGpsCapture(pos) ? pos : null))
      .catch(() => null);
    gpsRequestRef.current = request;

    try {
      const pos = await request;
      gpsPosRef.current = pos;
      setGpsPos(pos);
      setGpsStatus(pos ? "ok" : "missing");
      setGpsBlocked(!pos);
      return pos;
    } finally {
      if (gpsRequestRef.current === request) gpsRequestRef.current = null;
    }
  }, []);

  return { gpsStatus, gpsPos, gpsBlocked, ensureGps };
}
