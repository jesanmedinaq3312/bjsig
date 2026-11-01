import type { Worker, QrScanType } from "@/lib/types";
import type { GpsPosition } from "@/lib/gps";

export interface ScanResult {
  ok: boolean;
  worker?: Worker;
  message: string;
  scanType: QrScanType;
  time: string;
  duplicate?: boolean;
  gpsMissing?: boolean;
  gps?: GpsPosition | null;
}
