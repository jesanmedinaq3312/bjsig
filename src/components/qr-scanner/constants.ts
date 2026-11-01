import { LogIn, LogOut, Coffee, Truck, MapPin, type LucideIcon } from "lucide-react";
import type { QrScanType } from "@/lib/types";

export const SCAN_COOLDOWN_MS = 4000;
export const CONTAINER_ID = "qr-reader-container";

export interface ScanTypeMeta {
  value: QrScanType;
  label: string;
  icon: LucideIcon;
  color: string;
  bg: string;
  swalColor: string;
}

export const SCAN_TYPES: ScanTypeMeta[] = [
  {
    value: "entrada",
    label: "Entrada",
    icon: LogIn,
    color: "text-emerald-600",
    bg: "bg-emerald-50 border-emerald-200",
    swalColor: "#059669",
  },
  {
    value: "salida",
    label: "Salida",
    icon: LogOut,
    color: "text-red-600",
    bg: "bg-red-50 border-red-200",
    swalColor: "#dc2626",
  },
  {
    value: "almuerzo_inicio",
    label: "Inicio Almuerzo",
    icon: Coffee,
    color: "text-amber-600",
    bg: "bg-amber-50 border-amber-200",
    swalColor: "#d97706",
  },
  {
    value: "almuerzo_termino",
    label: "Fin Almuerzo",
    icon: Coffee,
    color: "text-amber-600",
    bg: "bg-amber-50 border-amber-200",
    swalColor: "#d97706",
  },
  {
    value: "terreno_salida",
    label: "Salida a Terreno",
    icon: Truck,
    color: "text-blue-600",
    bg: "bg-blue-50 border-blue-200",
    swalColor: "#2563eb",
  },
  {
    value: "terreno_llegada",
    label: "Llegada de Terreno",
    icon: MapPin,
    color: "text-blue-600",
    bg: "bg-blue-50 border-blue-200",
    swalColor: "#2563eb",
  },
];

export function getScanTypeMeta(value: QrScanType): ScanTypeMeta {
  return SCAN_TYPES.find((s) => s.value === value) ?? SCAN_TYPES[0];
}
