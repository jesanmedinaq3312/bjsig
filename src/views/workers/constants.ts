import { Check, X, Clock, FileCheck, CalendarOff } from "lucide-react";
import type {
  CloudProvider,
  AttendanceStatus,
  ShiftCycle,
  ContractStatus,
  WorkerStatus,
} from "@/lib/types";

export const QUICK_ATT: {
  value: AttendanceStatus;
  label: string;
  icon: typeof Check;
  title: string;
  activeClass: string;
}[] = [
  {
    value: "Presente",
    label: "P",
    icon: Check,
    title: "Marcar Presente",
    activeClass: "bg-emerald-600 text-white border-emerald-600",
  },
  {
    value: "Ausente",
    label: "A",
    icon: X,
    title: "Marcar Ausente",
    activeClass: "bg-red-600 text-white border-red-600",
  },
  {
    value: "Licencia",
    label: "L",
    icon: Clock,
    title: "Marcar Licencia",
    activeClass: "bg-amber-500 text-white border-amber-500",
  },
  {
    value: "Permiso",
    label: "PE",
    icon: FileCheck,
    title: "Marcar Permiso",
    activeClass: "bg-blue-600 text-white border-blue-600",
  },
  {
    value: "Descanso",
    label: "D",
    icon: CalendarOff,
    title: "Marcar Descanso",
    activeClass: "bg-slate-500 text-white border-slate-500",
  },
];

export const CLOUD_PROVIDERS: CloudProvider[] = [
  "Google Drive",
  "OneDrive",
  "TeraBox",
  "Dropbox",
  "URL Directa",
];

export const PROVIDER_COLORS: Record<CloudProvider, string> = {
  "Google Drive": "bg-blue-50 text-blue-700 border-blue-200",
  OneDrive: "bg-cyan-50 text-cyan-700 border-cyan-200",
  TeraBox: "bg-violet-50 text-violet-700 border-violet-200",
  Dropbox: "bg-indigo-50 text-indigo-700 border-indigo-200",
  "URL Directa": "bg-slate-50 text-slate-700 border-slate-200",
};

export const DOC_CATEGORIES = [
  "Cédula de Identidad",
  "Licencia de Conducir (A1/A2/A4/B/D)",
  "Examen Ocupacional / Preocupacional",
  "Inducción ODI / IRL (DS 44)",
  "Certificación de Competencias (Rigger, Soldador, Electricista SEC)",
  "Contrato de Trabajo / Anexos",
  "Currículum Vitae",
  "Certificado de Antecedentes",
  "Ficha de Salud",
  "Otro",
];

export const QR_LABELS: Record<string, string> = {
  entrada: "Entrada",
  salida: "Salida",
  almuerzo_inicio: "Inicio Almuerzo",
  almuerzo_termino: "Fin Almuerzo",
  terreno_salida: "Salida Terreno",
  terreno_llegada: "Llegada Terreno",
};

export const QR_SHORT: Record<string, string> = {
  entrada: "E",
  salida: "S",
  almuerzo_inicio: "AI",
  almuerzo_termino: "AF",
  terreno_salida: "TS",
  terreno_llegada: "TL",
};

export type WorkerFormState = {
  rut: string;
  full_name: string;
  nombres: string;
  apellidos: string;
  position: string;
  shift_cycle: ShiftCycle;
  contract_status: ContractStatus;
  contract_type: string;
  status: WorkerStatus;
  occupational_exam_exp_date: string;
  driver_license_exp_date: string;
  irl_signed_date: string;
  phone: string;
  email: string;
  address: string;
  birth_date: string;
  hire_date: string;
  contract_start_date: string;
  contract_end_date: string;
  contract_url: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  afp: string;
  health_insurance: string;
  nationality: string;
  notes: string;
  photo_url: string;
  department_id: string;
  reports_to: string;
  bank_name: string;
  bank_account_number: string;
  account_type: string;
  base_salary: string;
  hourly_rate: string;
  overtime_rate: string;
  meal_allowance: string;
  mobility_allowance: string;
};

export type DocLinkForm = {
  category: string;
  provider: CloudProvider;
  url: string;
  expiration_date: string;
};

export function emptyDocLink(): DocLinkForm {
  return { category: DOC_CATEGORIES[0], provider: "Google Drive", url: "", expiration_date: "" };
}
