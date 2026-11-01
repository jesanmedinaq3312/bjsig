export type ShiftCycle = "7x7" | "5x2" | "4x3";
export type ContractStatus = "Vigente" | "Vencido" | "Finiquito" | "Desvinculado";
export type WorkerStatus = "ACTIVO" | "INACTIVO";
export type EppCondition = "Bueno" | "Regular" | "Malo";
export type AttendanceStatus = "Presente" | "Ausente" | "Licencia" | "Permiso" | "Descanso";
export type IncidentType =
  "Accidente" | "Casi-accidente" | "Condición insegura" | "Enfermedad profesional";
export type IncidentCategory =
  "CTP" | "STP" | "CUASI" | "CONDICION" | "ENF_PROF" | "Sin consecuencias";
export type IncidentSeverity = "Leve" | "Moderado" | "Grave" | "Fatal";
export type IsoStandard = "ISO 9001" | "ISO 14001" | "ISO 45001";
export type IsoStatus = "Abierta" | "En proceso" | "Cerrada";
export type CloudProvider = "Google Drive" | "OneDrive" | "TeraBox" | "Dropbox" | "URL Directa";
export type CloudDocStatus = "VIGENTE" | "POR_VENCER" | "VENCIDO" | "FALTANTE";
export type QrScanType =
  | "entrada"
  | "salida"
  | "almuerzo_inicio"
  | "almuerzo_termino"
  | "terreno_salida"
  | "terreno_llegada";

export interface Worker {
  id: string;
  rut: string;
  full_name: string;
  nombres: string;
  apellidos: string;
  position: string;
  shift_cycle: ShiftCycle;
  contract_status: ContractStatus;
  contract_type: string | null;
  status: WorkerStatus | null;
  occupational_exam_exp_date: string | null;
  driver_license_exp_date: string | null;
  irl_signed_date: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  birth_date: string | null;
  hire_date: string | null;
  contract_start_date: string | null;
  contract_end_date: string | null;
  contract_url: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  afp: string | null;
  health_insurance: string | null;
  nationality: string | null;
  notes: string | null;
  photo_url: string | null;
  base_salary: number | null;
  hourly_rate: number | null;
  overtime_rate: number | null;
  meal_allowance: number | null;
  mobility_allowance: number | null;
  afp_rate: number | null;
  health_rate: number | null;
  bonus_target: number | null;
  bank_name: string | null;
  bank_account_number: string | null;
  account_type: string | null;
  department_id: string | null;
  reports_to: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface EppLog {
  id: string;
  worker_rut: string;
  epp_item_name: string;
  certification_code_ds18: string | null;
  delivery_date: string;
  expiration_date: string | null;
  condition: EppCondition;
  digital_signature: string | null;
  created_at?: string;
}

export interface Incident {
  id: string;
  incident_code: string | null;
  event_date: string;
  type: IncidentType;
  category: IncidentCategory | null;
  severity: IncidentSeverity;
  location: string | null;
  description: string;
  root_cause_analysis: string | null;
  corrective_action: string | null;
  reported_to_achs: boolean;
  diat_dieg_required: boolean;
  worker_rut: string | null;
  days_lost: number;
  days_charge: number | null;
  consent_given_at: string | null;
  created_at?: string;
}

export interface Training {
  id: string;
  topic: string;
  hours: number;
  completed_hours: number;
  trainer: string;
  date: string;
  location: string | null;
  scheduled_time: string | null;
  attendees_rut_list: string[];
  created_at?: string;
}

export interface DailyShift {
  id: string;
  date: string;
  worker_rut: string;
  attendance_status: AttendanceStatus;
  shift_name: string;
  ast_signed: boolean;
  calculated_hht: number | null;
  epp_inicio: Record<string, boolean> | null;
  epp_termino: Record<string, boolean> | null;
  notes: string | null;
  /** Legacy alias fields present in some rows */
  status?: string | null;
  epp_compliant?: boolean | null;
  created_at?: string;
}

export interface AstLog {
  id: string;
  date: string;
  topic: string;
  attendees_rut_list: string[];
  signatures: string[];
  created_at?: string;
}

export interface CphsMeeting {
  id: string;
  meeting_date: string;
  month_label: string;
  attendees_count: number;
  topics: string;
  agreements: string | null;
  created_at?: string;
}

export interface IsoAudit {
  id: string;
  iso_standard: IsoStandard;
  finding_type: string;
  description: string;
  area: string;
  corrective_action: string | null;
  status: IsoStatus;
  due_date: string | null;
  created_at?: string;
}

export interface HhcPlan {
  id: string;
  year: number;
  planned_hours: number;
  executed_hours: number;
  notes: string | null;
  created_at?: string;
}

export interface CloudDocument {
  id: string;
  worker_id: string | null;
  worker_rut: string | null;
  category: string;
  provider: CloudProvider;
  url: string;
  expiration_date: string | null;
  status: CloudDocStatus;
  created_at?: string;
}

export interface QrScanEvent {
  id: string;
  worker_rut: string;
  scan_type: QrScanType;
  scan_date: string;
  scan_time: string;
  validated: boolean;
  notes: string | null;
  latitude: number | null;
  longitude: number | null;
  gps_accuracy: number | null;
  device_id: string | null;
  gps_missing: boolean;
  idempotency_key?: string | null;
  created_at?: string;
}

export interface ActivityLog {
  id: string;
  tenant_id: string | null;
  user_email: string;
  action: string;
  entity: string;
  entity_id: string | null;
  entity_label: string | null;
  details: Record<string, unknown> | null;
  ip_hint: string | null;
  user_agent: string | null;
  user_role: string | null;
  session_id: string | null;
  session_duration: number | null;
  page_path: string | null;
  device_id: string | null;
  latitude: number | null;
  longitude: number | null;
  fingerprint: string | null;
  cookie_data: Record<string, unknown> | null;
  referrer: string | null;
  viewport: string | null;
  created_at?: string;
}

export interface ShiftDefinition {
  id: string;
  name: string;
  cycle: ShiftCycle | "custom";
  start_time: string | null;
  end_time: string | null;
  color: string | null;
  active: boolean;
  created_at?: string;
}

// ═══════════════════════════════════════════════════════════════════════
// Shift Assignments & Change Logs
// ═══════════════════════════════════════════════════════════════════════

export type ShiftDurationType = "indefinido" | "temporal" | "semanal" | "mensual" | "personalizado";
export type ShiftChangeType =
  "creacion" | "modificacion" | "intercambio" | "desactivacion" | "reactivacion";

export interface ShiftAssignment {
  id: string;
  worker_rut: string;
  shift_definition_id: string | null;
  shift_name: string;
  duration_type: ShiftDurationType;
  start_date: string;
  end_date: string | null;
  swap_with_rut: string | null;
  change_reason: string | null;
  assigned_by_email: string;
  active: boolean;
  days_of_week?: number[] | null;
  created_at?: string;
}

export interface ShiftChangeLog {
  id: string;
  worker_rut: string;
  old_shift_name: string | null;
  new_shift_name: string | null;
  old_duration_type: string | null;
  new_duration_type: string | null;
  old_end_date: string | null;
  new_end_date: string | null;
  change_type: ShiftChangeType;
  swap_with_rut: string | null;
  reason: string | null;
  changed_by_email: string;
  data?: {
    reason?: string | null;
    changed_by_email?: string | null;
    assignment_id?: string;
  } | null;
  created_at?: string;
}

export interface Honeytoken {
  id: string;
  token_type: string;
  label: string;
  payload: Record<string, unknown> | null;
  triggered: boolean;
  triggered_at: string | null;
  triggered_by: string | null;
  created_at?: string;
}

export interface SystemConfig {
  key: string;
  value: string;
  description: string | null;
  updated_at?: string;
}

export interface TrainingAttendance {
  id: string;
  training_id: string;
  worker_rut: string;
  completed_hours: number;
  attendance_date: string;
  notes: string | null;
  created_at?: string;
}

/** Unified calendar event derived from all operational tables. */
export interface CalendarEvent {
  id: string;
  event_date: string;
  event_type:
    | "asistencia"
    | "epp"
    | "incidente"
    | "charla"
    | "capacitacion"
    | "iso"
    | "vencimiento"
    | "qr"
    | "feriado";
  worker_rut: string | null;
  severity_level: "verde" | "amarillo" | "rojo" | "azul";
  title: string;
  details: string;
}

// ═══════════════════════════════════════════════════════════════════════
// HR — Payroll (Nómina & Liquidaciones)
// ═══════════════════════════════════════════════════════════════════════

export type PayrollPeriodStatus = "borrador" | "calculado" | "aprobado" | "pagado";

export interface PayrollPeriod {
  id: string;
  period_label: string;
  period_month: number;
  period_year: number;
  start_date: string;
  end_date: string;
  status: PayrollPeriodStatus;
  notes: string | null;
  created_at?: string;
}

export type PayrollItemStatus = "pendiente" | "calculado" | "pagado";

export interface BonusDetail {
  label: string;
  amount: number;
}

export interface DeductionDetail {
  label: string;
  amount: number;
}

export interface PayrollItem {
  id: string;
  period_id: string;
  worker_rut: string;
  days_present: number;
  days_absent: number;
  days_license: number;
  days_permission: number;
  regular_hours: number;
  overtime_hours: number;
  base_salary_amount: number;
  overtime_amount: number;
  meal_allowance_amount: number;
  mobility_allowance_amount: number;
  bonus_amount: number;
  gross_income: number;
  taxable_income: number;
  afp_deduction: number;
  health_deduction: number;
  tax_deduction: number;
  other_deductions: number;
  net_pay: number;
  bonuses_detail: BonusDetail[] | null;
  deductions_detail: DeductionDetail[] | null;
  status: PayrollItemStatus;
  generated_at: string | null;
  created_at?: string;
}

// ═══════════════════════════════════════════════════════════════════════
// HR — Performance (Desarrollo y Desempeño)
// ═══════════════════════════════════════════════════════════════════════

export type ObjectiveType = "OKR" | "KPI" | "META" | "TAREA";
export type ObjectiveStatus = "pendiente" | "en_progreso" | "completado" | "vencido";
export type ObjectivePriority = "baja" | "media" | "alta";

export interface PerformanceObjective {
  id: string;
  worker_rut: string;
  title: string;
  description: string | null;
  type: ObjectiveType;
  target_value: number;
  current_value: number;
  unit: string | null;
  start_date: string;
  due_date: string | null;
  status: ObjectiveStatus;
  priority: ObjectivePriority;
  progress: number;
  created_at?: string;
}

export interface EvaluationCategory {
  category: string;
  score: number;
}

export interface PerformanceEvaluation {
  id: string;
  worker_rut: string;
  evaluation_date: string;
  period_label: string | null;
  evaluator: string | null;
  score: number;
  categories: EvaluationCategory[] | null;
  strengths: string | null;
  improvements: string | null;
  summary: string | null;
  status: "borrador" | "completada";
  created_at?: string;
}

export type FeedbackType = "positivo" | "constructivo" | "oportunidad_mejora";

export interface PerformanceFeedback {
  id: string;
  worker_rut: string;
  feedback_date: string;
  type: FeedbackType;
  author: string | null;
  content: string;
  action_items: string | null;
  created_at?: string;
}

export type WorkerDocType = "amonestacion" | "carta" | "nota" | "reconocimiento" | "advertencia";
export type WorkerDocSeverity = "leve" | "grave" | "muy_grave" | "informativa";
export type WorkerDocStatus = "borrador" | "emitida" | "enviada";

export interface WorkerDocument {
  id: string;
  worker_rut: string;
  document_type: WorkerDocType;
  document_date: string;
  subject: string;
  body: string;
  severity: WorkerDocSeverity;
  issued_by: string | null;
  sent_to_email: boolean;
  sent_at: string | null;
  status: WorkerDocStatus;
  created_at?: string;
}

// ═══════════════════════════════════════════════════════════════════════
// Ley 19.628 — Protección de Datos Personales
// ═══════════════════════════════════════════════════════════════════════

export type ConsentType =
  | "tratamiento_general"
  | "datos_salud"
  | "datos_sensibles"
  | "comunicacion_terceros"
  | "transferencia_internacional";

export interface DataConsent {
  id: string;
  worker_rut: string;
  consent_type: ConsentType | string;
  granted: boolean;
  granted_at: string;
  granted_by_email: string;
  expires_at: string | null;
  purpose: string | null;
  created_at?: string;
}

export type DataRightsRequestType =
  "acceso" | "rectificacion" | "cancelacion" | "oposicion" | "portabilidad";
export type DataRightsRequestStatus = "pendiente" | "en_proceso" | "completada" | "rechazada";

export interface DataRightsRequest {
  id: string;
  request_type: DataRightsRequestType;
  worker_rut: string;
  requester_name: string | null;
  requester_email: string | null;
  description: string | null;
  status: DataRightsRequestStatus;
  resolved_by_email: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  created_at?: string;
}

// ═══════════════════════════════════════════════════════════════════════
// Worker Portal — Worker Requests (Solicitudes)
// ═══════════════════════════════════════════════════════════════════════

export type WorkerRequestCategory =
  "permiso" | "consulta" | "reclamo" | "sugerencia" | "cambio_bancario" | "otro";
export type WorkerRequestStatus = "pendiente" | "en_proceso" | "respondida" | "cerrada";
export type WorkerRequestValidity = "pendiente" | "valida" | "invalida";

export interface WorkerRequest {
  id: string;
  worker_rut: string;
  category: WorkerRequestCategory;
  subject: string;
  message: string;
  status: WorkerRequestStatus;
  validity: WorkerRequestValidity | null;
  validity_note: string | null;
  admin_reply: string | null;
  replied_by_email: string | null;
  replied_at: string | null;
  created_at?: string;
}

// ═══════════════════════════════════════════════════════════════════════
// Vacaciones (Holidays / Annual Leave)
// ═══════════════════════════════════════════════════════════════════════

export type VacationRequestStatus = "pendiente" | "aprobada" | "rechazada" | "gozada";

export interface VacationRequest {
  id: string;
  worker_rut: string;
  start_date: string;
  end_date: string;
  days_requested: number;
  year: number;
  status: VacationRequestStatus;
  notes: string | null;
  approved_by_email: string | null;
  approved_at: string | null;
  created_at?: string;
}

export interface VacationBalance {
  id: string;
  worker_rut: string;
  year: number;
  total_days: number;
  used_days: number;
  remaining_days: number;
  carryover_days: number;
  created_at?: string;
}

// ═══════════════════════════════════════════════════════════════════════
// Finiquitos (Severance Calculator)
// ═══════════════════════════════════════════════════════════════════════

export type FiniquitoReason =
  | "renuncia"
  | "despido_justificado"
  | "despido_injustificado"
  | "mutuo_acuerdo"
  | "necesidades_empresa"
  | "vencimiento_contrato"
  | "fallecimiento";

export interface FiniquitoRecord {
  id: string;
  worker_rut: string;
  worker_name: string;
  hire_date: string;
  end_date: string;
  reason: FiniquitoReason;
  base_salary: number;
  years_of_service: number;
  months_of_service: number;
  vacation_days_pending: number;
  indemnizacion_anios_servicio: number;
  indemnizacion_sustitutiva: number;
  vacaciones_no_gozadas: number;
  gratificacion: number;
  total_finiquito: number;
  notes: string | null;
  created_by_email: string;
  created_at?: string;
}

// ═══════════════════════════════════════════════════════════════════════
// Charlas de Seguridad DIT (Daily Safety Talks)
// ═══════════════════════════════════════════════════════════════════════

export interface SecurityTalk {
  id: string;
  talk_date: string;
  topic: string;
  area: string;
  speaker: string;
  attendees_rut_list: string[];
  duration_minutes: number;
  observations: string | null;
  digital_signature: string | null;
  created_at?: string;
}

// ═══════════════════════════════════════════════════════════════════════
// Matriz IPER (Identificación de Peligros y Evaluación de Riesgos)
// ═══════════════════════════════════════════════════════════════════════

export type IperRiskLevel = "trivial" | "tolerable" | "moderado" | "importante" | "intolerable";

export interface IperEntry {
  id: string;
  area: string;
  activity: string;
  hazard: string;
  risk_description: string;
  probability: number;
  severity: number;
  risk_level: IperRiskLevel;
  control_measures: string;
  residual_risk_level: IperRiskLevel;
  responsible: string | null;
  review_date: string | null;
  created_at?: string;
}

// ═══════════════════════════════════════════════════════════════════════
// FEAT-003/004: Departments & Org Chart
// ═══════════════════════════════════════════════════════════════════════

export interface Department {
  id: string;
  name: string;
  parent_department_id: string | null;
  created_at?: string;
}

// ═══════════════════════════════════════════════════════════════════════
// GDPR-002: Correction Requests
// ═══════════════════════════════════════════════════════════════════════

export type CorrectionRequestStatus = "pending" | "approved" | "rejected";

export interface CorrectionRequest {
  id: string;
  worker_rut: string;
  field_name: string;
  current_value: string | null;
  requested_value: string | null;
  status: CorrectionRequestStatus;
  requested_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at?: string;
}

// ═══════════════════════════════════════════════════════════════════════
// GDPR-004: Security Alerts (anomaly detection)
// ═══════════════════════════════════════════════════════════════════════

export type SecurityAlertSeverity = "low" | "medium" | "high";

export interface SecurityAlert {
  id: string;
  alert_type: string;
  severity: SecurityAlertSeverity;
  description: string;
  related_email: string | null;
  ip_hint: string | null;
  details: Record<string, unknown> | null;
  acknowledged: boolean;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  created_at?: string;
}

// ═══════════════════════════════════════════════════════════════════════
// SIL — Licencias Médicas (Subsidio por Incapacidad Laboral)
// ═══════════════════════════════════════════════════════════════════════

export type MedicalLicenseType =
  "enfermedad" | "accidente" | "maternal" | "postnatal" | "patologia_grave" | "licencia_preventiva";
export type MedicalLicenseStatus = "vigente" | "vencida" | "ampliada" | "rechazada";

export interface MedicalLicense {
  id: string;
  worker_rut: string;
  license_type: MedicalLicenseType;
  start_date: string;
  end_date: string;
  days: number;
  diagnosis: string | null;
  provider: string | null;
  document_url: string | null;
  status: MedicalLicenseStatus;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
}

// ═══════════════════════════════════════════════════════════════════════
// Comercial & Facturacion
// ═══════════════════════════════════════════════════════════════════════

export interface Customer {
  id: string;
  rut: string;
  name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  city: string | null;
  is_active: boolean;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
}

export type QuoteStatus =
  "borrador" | "enviada" | "aprobada" | "rechazada" | "vencida" | "convertida";

export interface QuoteItem {
  id: string;
  quote_id: string;
  line_number: number;
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  created_at?: string;
}

export interface Quote {
  id: string;
  quote_number: string;
  customer_id: string;
  issue_date: string;
  expiry_date: string | null;
  status: QuoteStatus;
  subtotal: number;
  discount: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  notes: string | null;
  created_by: string | null;
  items?: QuoteItem[];
  created_at?: string;
  updated_at?: string;
}

export type InvoiceDocumentType =
  "factura_electronica" | "factura_exenta" | "boleta_electronica" | "nota_credito" | "nota_debito";
export type InvoiceStatus = "emitida" | "pagada" | "vencida" | "anulada" | "borrador";
export type SiiStatus = "no_enviada" | "enviada" | "aceptada" | "rechazada" | "anulada";

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  line_number: number;
  description: string;
  quantity: number;
  unit_price: number;
  exemption_flag: boolean;
  line_subtotal: number;
  created_at?: string;
}

export interface Invoice {
  id: string;
  document_type: InvoiceDocumentType;
  folio: number | null;
  customer_id: string | null;
  quote_id: string | null;
  issue_date: string;
  due_date: string | null;
  status: InvoiceStatus;
  subtotal: number;
  exempt_amount: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  payment_method: string | null;
  sii_track_code: string | null;
  sii_status: SiiStatus;
  notes: string | null;
  created_by: string | null;
  items?: InvoiceItem[];
  created_at?: string;
  updated_at?: string;
}

export type PurchaseOrderStatus = "pendiente" | "enviada" | "parcial" | "recibida" | "anulada";

export interface PurchaseOrderItem {
  id: string;
  purchase_order_id: string;
  line_number: number;
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  received_qty: number;
  created_at?: string;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_id: string | null;
  issue_date: string;
  expected_date: string | null;
  status: PurchaseOrderStatus;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  received_amount: number;
  notes: string | null;
  created_by: string | null;
  items?: PurchaseOrderItem[];
  created_at?: string;
  updated_at?: string;
}

// ═══════════════════════════════════════════════════════════════════════
// Communications & Onboarding — Circulares con acuse de recibo
// ═══════════════════════════════════════════════════════════════════════

export type CircularAudience = "todos" | "departamento";
export type CircularCategory =
  "informacion" | "descuentos" | "entretencion" | "caja_compensacion" | "beneficios";

export interface Circular {
  id: string;
  title: string;
  body: string;
  target_audience: CircularAudience;
  department_id: string | null;
  published_by: string | null;
  published_at: string;
  ack_required: boolean;
  category: CircularCategory | null;
  created_at?: string;
}

export interface CircularAcknowledgment {
  id: string;
  circular_id: string;
  worker_rut: string;
  acknowledged_at: string;
  created_at?: string;
}

// ═══════════════════════════════════════════════════════════════════════
// Finanzas Extendidas — Anticipos, Préstamos, Descuentos, Cartola
// ═══════════════════════════════════════════════════════════════════════

export type AdvanceStatus = "pendiente" | "aprobado" | "rechazado" | "descontado";

export interface SalaryAdvance {
  id: string;
  worker_rut: string;
  amount: number;
  request_date: string;
  status: AdvanceStatus;
  approved_by: string | null;
  approved_at: string | null;
  deducted_in_period: string | null;
  notes: string | null;
  created_at?: string;
}

export type LoanStatus = "activo" | "pagado" | "anulado";

export interface InternalLoan {
  id: string;
  worker_rut: string;
  principal_amount: number;
  installments: number;
  monthly_deduction: number;
  outstanding_balance: number;
  start_date: string;
  status: LoanStatus;
  notes: string | null;
  created_by: string | null;
  created_at?: string;
}

export type DiscountStatus = "pendiente" | "aprobado" | "descontado";

export interface WorkerDiscount {
  id: string;
  worker_rut: string;
  concept: string;
  amount: number;
  discount_date: string;
  status: DiscountStatus;
  approved_by: string | null;
  notes: string | null;
  created_at?: string;
}

// ═══════════════════════════════════════════════════════════════════════
// Ley Karin — Canal de Denuncias (Harassment Reports)
// ═══════════════════════════════════════════════════════════════════════

export type HarassmentCategory = "acoso_laboral" | "acoso_sexual" | "violencia" | "otro";
export type HarassmentReportStatus = "recibida" | "en_investigacion" | "cerrada";

export interface HarassmentReport {
  id: string;
  tenant_id: string | null;
  reporter_worker_rut: string | null;
  category: HarassmentCategory;
  description: string;
  status: HarassmentReportStatus;
  legal_deadline: string | null;
  investigation_notes: string | null;
  result_notification: string | null;
  created_at: string | null;
  updated_at: string | null;
}

// ═══════════════════════════════════════════════════════════════════════
// Ley 21.663 — Notificación de Brechas de Seguridad
// ═══════════════════════════════════════════════════════════════════════

export type BreachSeverity = "baja" | "media" | "alta" | "critica";
export type BreachStatus =
  "detectada" | "en_investigacion" | "notificada_csirt" | "notificada_titulares" | "cerrada";

export interface SecurityBreachReport {
  id: string;
  tenant_id: string | null;
  title: string;
  description: string;
  breach_detected_at: string;
  breach_occurred_at: string | null;
  affected_subjects_count: number;
  affected_data_types: string[];
  severity: BreachSeverity;
  status: BreachStatus;
  csirt_notified_at: string | null;
  csirt_deadline: string | null;
  subjects_notified_at: string | null;
  subjects_deadline: string | null;
  containment_measures: string | null;
  investigation_notes: string | null;
  resolution_notes: string | null;
  created_by_email: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export type PaymentEntryType = "pago" | "anticipo" | "descuento" | "prestamo" | "ajuste";

export interface WorkerPaymentStatement {
  id: string;
  worker_rut: string;
  period_label: string;
  entry_type: PaymentEntryType;
  amount: number;
  description: string | null;
  reference_id: string | null;
  created_at?: string;
}

// ═══════════════════════════════════════════════════════════════════════
// Cuentas bancarias de trabajadores
// ═══════════════════════════════════════════════════════════════════════

export type BankAccountType =
  "Cuenta Corriente" | "Cuenta Vista" | "Cuenta Rut" | "Cuenta de Ahorro";

export interface WorkerBankAccount {
  id: string;
  worker_rut: string;
  bank_name: string;
  account_type: string;
  account_number: string;
  holder_name: string;
  holder_rut: string | null;
  email_for_payments: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

// ═══════════════════════════════════════════════════════════════════════
// Control de acceso — correos autorizados
// ═══════════════════════════════════════════════════════════════════════

export type AccessRole =
  | "superadmin"
  | "developer"
  | "company_owner"
  | "human_resources"
  | "admin"
  | "manager"
  | "prevencionista"
  | "operador"
  | "worker";

export interface AllowedEmail {
  id: string;
  email: string;
  role: AccessRole;
  active: boolean;
  worker_rut: string | null;
  created_at: string;
  permissions?: Record<string, boolean> | null;
  must_change_password?: boolean | null;
  password_set_at?: string | null;
  ad_synced?: boolean | null;
  tenant_id?: string | null;
  /** Enriquecido en cliente desde workers.full_name */
  worker_name?: string | null;
}

// ═══════════════════════════════════════════════════════════════════════
// Respaldos automáticos
// ═══════════════════════════════════════════════════════════════════════

export interface BackupConfig {
  id: string;
  enabled: boolean;
  frequency: string;
  retention_days: number;
  last_backup_at: string | null;
  last_backup_status: string | null;
  last_backup_size_kb: number | null;
  notify_email: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface BackupHistory {
  id: string;
  backup_date: string;
  status: string;
  record_count: number | null;
  size_kb: number | null;
  format?: string;
  notes: string | null;
  created_at?: string;
}

// ═══════════════════════════════════════════════════════════════════════
// Proveedores
// ═══════════════════════════════════════════════════════════════════════

export interface Supplier {
  id: string;
  name: string;
  rut: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address?: string | null;
  category: string;
  payment_terms: string | null;
  bank_account?: string | null;
  is_active: boolean;
  notes: string | null;
  created_at?: string;
}

// ═══════════════════════════════════════════════════════════════════════
// Entregas de EPP (bodega)
// ═══════════════════════════════════════════════════════════════════════

export interface EppDelivery {
  id: string;
  worker_rut: string;
  item_id: string;
  size_label: string;
  quantity: number;
  justification: string;
  condition: string;
  delivery_date: string;
  delivered_by: string | null;
  signature_url?: string | null;
  notes: string | null;
  created_at: string;
  confirmed_via_qr?: boolean;
  confirmed_at?: string | null;
  confirmed_scan_rut?: string | null;
}
