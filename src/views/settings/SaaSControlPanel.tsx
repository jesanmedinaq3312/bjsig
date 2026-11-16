import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Archive,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  ChevronRight,
  Container,
  Copy,
  Crown,
  Edit3,
  Loader2,
  Plus,
  PauseCircle,
  RefreshCw,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Trash2,
  Zap,
  UserPlus,
  WalletCards,
  Send,
  Eye,
  Palette,
  Download,
  FileJson,
  FileSpreadsheet,
  FileText,
  Bell,
  Check,
  Clock3,
  ExternalLink,
  Globe2,
  ImageOff,
  Link2,
  Mail,
  MessageSquare,
  X,
  ShieldCheck,
  LockKeyhole,
} from "lucide-react";
import { Button, Modal, Select, Spinner } from "@/components/ui";
import { Switch } from "@/components/ui/switch";
import { isFirstPartyImageUrl } from "@/components/IdentityAvatar";
import { SlidingNumber } from "@/components/animate-ui/primitives/texts/sliding-number";
import { supabase } from "@/lib/supabase";
import {
  addCalendarDays,
  calculateBillingCollectionTotals,
  getEffectiveBillingNoticeStatus,
  toLocalDateString,
} from "@/lib/saasBilling";
import { audit } from "@/lib/audit";
import { setActiveTenant } from "@/lib/tenant";
import { buildAdminPath, navigateTo } from "@/lib/appRoute";
import { ExportService } from "@/lib/export";
import { buildTenantBackupSql } from "@/lib/tenantBackup";
import { provisionTenantUser } from "@/lib/tenantUsers";
import { DEFAULT_PERMISSIONS } from "./constants";
import { authorizationErrorMessage } from "@/lib/authorization";
import { callEdgeFunction } from "@/lib/edgeFunctions";
import { isHttpUrl, isOptionalHttpUrl } from "@/lib/validation/httpUrl";
import { useConfirm } from "@/hooks/useConfirm";
import {
  OnboardingWelcomeModal,
  type OnboardingForm,
} from "@/components/saas/OnboardingWelcomeModal";
import { DataGovernancePanel } from "@/components/saas/DataGovernancePanel";
import { PublicLandingSettingsEditor } from "./PublicLandingSettingsEditor";
import { HeroImagesEditor } from "./HeroImagesEditor";
import { SaasLandingEditor } from "@/components/saas/SaasLandingEditor";

const WorkerPortal = lazy(() =>
  import("@/views/WorkerPortal").then((module) => ({
    default: module.WorkerPortal,
  })),
);
const LogsView = lazy(() =>
  import("@/views/Logs").then((module) => ({ default: module.LogsView })),
);

interface TenantOverview {
  tenant_id: string;
  tenant_name: string;
  tenant_slug: string;
  tenant_active: boolean;
  tenant_status: "pendiente" | "activa" | "suspendida" | "cortada" | string | null;
  tenant_type: "company" | "branch" | null;
  parent_tenant_id: string | null;
  branch_manager_name: string | null;
  branch_manager_worker_id: string | null;
  plan_code: string | null;
  plan_name: string | null;
  subscription_status: string | null;
  isolation_mode: string | null;
  deployment_status: string | null;
  max_users: number | null;
  member_count: number;
}
interface TenantStorageUsage {
  tenant_id: string;
  usage_date: string;
  records_count: number | null;
  files_count: number | null;
  storage_bytes: number | null;
  plan_storage_limit_bytes: number | null;
  usage_breakdown?: Record<string, { records: number; bytes: number }> | null;
}
interface Plan {
  id: string;
  code: string;
  name: string;
  description: string | null;
  max_users: number | null;
  storage_limit_bytes?: number | null;
  feature_keys: Record<string, boolean>;
}
interface CarteraForm {
  id?: string;
  tenant_id: string;
  payment_status: string;
  next_payment_date: string;
  monthly_amount: string;
  iva_amount: string;
  notes: string;
  company_rut: string;
  legal_representative_name: string;
  legal_representative_rut: string;
  billing_email: string;
  billing_phone: string;
  billing_address: string;
  payment_day: string;
}

interface SaasBillingNotice {
  id: string;
  tenant_id: string;
  account_id: string | null;
  folio: string;
  period_start: string;
  period_end: string;
  issue_date: string;
  due_date: string;
  status: "draft" | "pending" | "paid" | "overdue" | "cancelled" | string;
  description: string;
  net_amount: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  recipient_name: string | null;
  recipient_rut: string | null;
  recipient_email: string | null;
  notes: string | null;
  pdf_generated_at: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface SaasInternalNotification {
  id: string;
  tenant_id: string;
  template_key: string;
  title: string;
  message: string;
  priority: string;
  created_at: string;
  read_at: string | null;
}

interface SaasTenantContract {
  id: string;
  tenant_id: string;
  title: string;
  contract_url: string;
  status: "draft" | "active" | "expired" | "cancelled" | string;
  counterparty_name: string | null;
  counterparty_rut: string | null;
  signed_at: string | null;
  expires_at: string | null;
  notes: string | null;
}

interface SaasOnboardingProfile {
  tenant_id: string;
  contact_name: string | null;
  primary_email: string | null;
  alternate_email: string | null;
  access_path: string | null;
  help_path: string | null;
  manual_url: string | null;
  support_email: string | null;
  support_phone: string | null;
  support_whatsapp: string | null;
  support_hours: string | null;
  support_url: string | null;
  provider_legal_name: string | null;
  provider_rut: string | null;
  bank_name: string | null;
  account_type: string | null;
  account_number: string | null;
  account_holder: string | null;
  account_holder_rut: string | null;
  billing_email: string | null;
  billing_legal_notice: string | null;
}

interface SaasOnboardingDelivery {
  id: string;
  tenant_id: string;
  recipient_name: string | null;
  recipient_email: string;
  subject: string;
  status: "draft" | "queued" | "sent" | "failed" | string;
  provider: string | null;
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
}

const CARTERA_COLUMNS =
  "id, tenant_id, payment_status, next_payment_date, monthly_amount, iva_amount, notes, company_rut, legal_representative_name, legal_representative_rut, billing_email, billing_phone, billing_address, payment_day";
const BILLING_NOTICE_COLUMNS =
  "id, tenant_id, account_id, folio, period_start, period_end, issue_date, due_date, status, description, net_amount, tax_rate, tax_amount, total_amount, recipient_name, recipient_rut, recipient_email, notes, pdf_generated_at, metadata, created_at";
const CONTRACT_COLUMNS =
  "id, tenant_id, title, contract_url, status, counterparty_name, counterparty_rut, signed_at, expires_at, notes";
const NOTIFICATION_COLUMNS =
  "id, tenant_id, template_key, title, message, priority, created_at, read_at";
const ONBOARDING_PROFILE_COLUMNS =
  "tenant_id, contact_name, primary_email, alternate_email, access_path, help_path, manual_url, support_email, support_phone, support_whatsapp, support_hours, support_url, provider_legal_name, provider_rut, bank_name, account_type, account_number, account_holder, account_holder_rut, billing_email, billing_legal_notice";
const ONBOARDING_DELIVERY_COLUMNS =
  "id, tenant_id, recipient_name, recipient_email, subject, status, provider, error_message, sent_at, created_at";

interface OperationalEvent {
  action: string;
  entity: string | null;
  entity_label: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
  tenant_id: string | null;
}

interface TenantBranding {
  tenant_id: string;
  tenant_name: string;
  company_name: string;
  logo_url: string;
  color_theme: string;
  glass_opacity: string;
  visual_assets: {
    favicon_url?: string;
    header_image_url?: string;
    hero_image_url?: string;
    hero_opacity?: number;
    navigation?: {
      layout?: "sidebar" | "bottom";
      opacity?: number;
    };
    icon_urls?: {
      brand?: string;
      hero?: string;
      feature?: string;
      cta?: string;
    };
    landing?: {
      hero_title?: string;
      hero_description?: string;
      cta_label?: string;
    };
  };
  landing_enabled?: boolean;
  landing_cta_label?: string;
}

const FEATURE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  workers: "Trabajadores",
  incidents: "Incidentes",
  trainings: "Capacitaciones",
  shifts: "Turnos",
  calendar: "Calendario",
  docs: "Documentación",
  clouddocs: "Documentos nube",
  indicators: "Indicadores",
  iso: "Auditoría ISO",
  performance: "Desempeño",
  vacations: "Vacaciones",
  eppwarehouse: "Bodega EPP",
  communications: "Comunicaciones",
  treasury: "Tesorería",
  commercial: "Comercial",
  payroll: "Nómina",
  medicallicenses: "Licencias médicas",
  extendedfinance: "Finanzas extendidas",
  gdpr: "Privacidad y GDPR",
  terrain: "Control diario de terreno",
  departments: "Departamentos",
  organigrama: "Organigrama",
  finiquitos: "Finiquitos",
  securitytalks: "Charlas de seguridad",
  ipermatrix: "Matriz IPER",
  compliancedocs: "Cumplimiento",
  harassmentreports: "Canal de denuncias",
  securitybreaches: "Brechas de seguridad",
};
const BRANDING_PREVIEW_COLORS: Record<string, string> = {
  blue: "#2563eb",
  cyan: "#0891b2",
  indigo: "#4f46e5",
  amber: "#d97706",
  orange: "#ea580c",
  emerald: "#059669",
  violet: "#7c3aed",
  green: "#16a34a",
  rose: "#e11d48",
};
function getBrandingPreviewColor(theme: string): string {
  return /^#[\da-f]{6}$/i.test(theme)
    ? theme
    : (BRANDING_PREVIEW_COLORS[theme] ?? BRANDING_PREVIEW_COLORS.blue);
}
function normalizeFeatureKeys(
  value: Record<string, boolean> | null | undefined,
): Record<string, boolean> {
  const normalized: Record<string, boolean> = {};
  for (const [key, enabled] of Object.entries(value ?? {})) {
    normalized[key] = enabled;
    if (key.startsWith("can_view_")) normalized[key.slice("can_view_".length)] = enabled;
  }
  if (normalized.finance !== undefined && normalized.extendedfinance === undefined)
    normalized.extendedfinance = normalized.finance;
  return normalized;
}
const FALLBACK_PLAN_FEATURES: Record<string, string[]> = {
  basico: ["dashboard", "workers", "incidents", "trainings", "calendar", "docs", "indicators"],
  profesional: [
    "dashboard",
    "workers",
    "incidents",
    "trainings",
    "shifts",
    "calendar",
    "docs",
    "clouddocs",
    "indicators",
    "iso",
    "performance",
    "vacations",
    "eppwarehouse",
    "communications",
    "gdpr",
  ],
  enterprise: Object.keys(FEATURE_LABELS),
};
const FALLBACK_PLANS: Plan[] = Object.entries(FALLBACK_PLAN_FEATURES).map(([code, keys]) => ({
  id: `fallback-${code}`,
  code,
  name: code === "basico" ? "Básico" : code === "profesional" ? "Profesional" : "Enterprise",
  description:
    "Recomendación de vista previa; RLS y la configuración persistida siguen siendo la autoridad.",
  max_users: code === "basico" ? 10 : null,
  feature_keys: Object.fromEntries(keys.map((key) => [key, true])),
}));

const isPersistedPlanId = (value: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

function statusTone(status: string | null) {
  if (status === "healthy" || status === "active" || status === "activa")
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (status === "planned" || status === "trial" || status === "provisioning")
    return "bg-amber-50 text-amber-700 ring-amber-200";
  if (status === "failed" || status === "degraded" || status === "stopped")
    return "bg-red-50 text-red-700 ring-red-200";
  return "bg-slate-100 text-slate-600 ring-slate-200";
}

function tenantLifecycleLabel(status: TenantOverview["tenant_status"]): string {
  if (status === "suspendida") return "Suspendida";
  if (status === "cortada") return "Archivada";
  if (status === "pendiente") return "Pendiente";
  return "Activa";
}

function tenantLifecycleTone(status: TenantOverview["tenant_status"]): string {
  if (status === "suspendida") return "bg-amber-50 text-amber-700 ring-amber-200";
  if (status === "cortada") return "bg-slate-100 text-slate-600 ring-slate-300";
  if (status === "pendiente") return "bg-blue-50 text-blue-700 ring-blue-200";
  return "bg-emerald-50 text-emerald-700 ring-emerald-200";
}

function formatClp(value: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatShortDate(value: string | null | undefined): string {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short" }).format(
    new Date(`${value}T12:00:00`),
  );
}

function billingNoticeStatusPresentation(status: string): { label: string; className: string } {
  if (status === "paid") return { label: "Pagado", className: "bg-emerald-50 text-emerald-700" };
  if (status === "overdue") return { label: "Vencido", className: "bg-red-50 text-red-700" };
  if (status === "draft") return { label: "Borrador", className: "bg-slate-100 text-slate-600" };
  if (status === "cancelled") return { label: "Anulado", className: "bg-slate-100 text-slate-500" };
  return { label: "Pendiente", className: "bg-amber-50 text-amber-700" };
}

function formatBytes(value: number | null | undefined): string {
  const bytes = Number(value ?? 0);
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`;
}

function formatUsageLabel(tableName: string): string {
  const labels: Record<string, string> = {
    workers: "Trabajadores",
    departments: "Departamentos",
    daily_shifts: "Turnos diarios",
    incidents_ds44: "Incidentes",
    worker_documents: "Documentos de trabajadores",
    payroll_items: "Ítems de nómina",
    payroll_periods: "Períodos de nómina",
    training_attendance: "Asistencia a capacitaciones",
    activity_logs: "Auditoría",
    data_consent: "Consentimientos",
    vacation_balances: "Saldos de vacaciones",
  };
  return labels[tableName] ?? tableName.replaceAll("_", " ");
}

function CompanyIdentityAvatar({
  name,
  logoUrl,
  size = 48,
}: {
  name: string;
  logoUrl?: string | null;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  const logo = isFirstPartyImageUrl(logoUrl) ? logoUrl!.trim() : null;
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0])
      .join("")
      .toUpperCase() || "E";
  return (
    <div
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-blue-100 bg-gradient-to-br from-blue-600 to-cyan-500 font-black text-white shadow-sm"
      style={{ width: size, height: size }}
    >
      {logo && !failed ? (
        <img
          src={logo}
          alt={`Avatar de ${name}`}
          className="h-full w-full object-cover bg-white"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="text-xs tracking-tight">{initials}</span>
      )}
    </div>
  );
}

function TenantAvatar({
  tenant,
  branding,
  size = 48,
}: {
  tenant: TenantOverview;
  branding: TenantBranding[];
  size?: number;
}) {
  return (
    <CompanyIdentityAvatar
      name={tenant.tenant_name}
      logoUrl={branding.find((item) => item.tenant_id === tenant.tenant_id)?.logo_url}
      size={size}
    />
  );
}

export function SaaSControlPanel() {
  const { confirm } = useConfirm();
  const [showTrash, setShowTrash] = useState(false);
  const [tenants, setTenants] = useState<TenantOverview[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [events, setEvents] = useState<OperationalEvent[]>([]);
  const [storageUsage, setStorageUsage] = useState<TenantStorageUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [showLandingPreview, setShowLandingPreview] = useState(false);
  const [activeSection, setActiveSection] = useState<
    | "overview"
    | "containers"
    | "settings"
    | "monitoring"
    | "audit"
    | "portal"
    | "captadores"
    | "devteam"
    | "cartera"
    | "branding"
    | "landing"
    | "main-landing"
    | "backup"
    | "governance"
  >("overview");
  const [enteringTenantId, setEnteringTenantId] = useState<string | null>(null);
  const [captadores, setCaptadores] = useState<
    Array<{
      id: string;
      full_name: string;
      email: string;
      active: boolean;
      demo_tenant_id: string | null;
    }>
  >([]);
  const [devOperators, setDevOperators] = useState<
    Array<{
      id: string;
      email: string;
      active: boolean;
      permissions: Record<string, boolean | string[]>;
      tenant_ids: string[];
    }>
  >([]);
  const [devTeamForm, setDevTeamForm] = useState<{
    id?: string;
    email: string;
    password: string;
    active: boolean;
    permissions: Record<string, boolean | string[]>;
    tenant_ids: string[];
  } | null>(null);
  const [cartera, setCartera] = useState<
    Array<{
      id: string;
      tenant_id: string;
      payment_status: string;
      next_payment_date: string | null;
      monthly_amount: number | null;
      iva_amount: number | null;
      notes: string | null;
      company_rut: string | null;
      legal_representative_name: string | null;
      legal_representative_rut: string | null;
      billing_email: string | null;
      billing_phone: string | null;
      billing_address: string | null;
      payment_day: number | null;
    }>
  >([]);
  const [billingNotices, setBillingNotices] = useState<SaasBillingNotice[]>([]);
  const [onboardingProfiles, setOnboardingProfiles] = useState<SaasOnboardingProfile[]>([]);
  const [onboardingDeliveries, setOnboardingDeliveries] = useState<SaasOnboardingDelivery[]>([]);
  const [internalNotifications, setInternalNotifications] = useState<SaasInternalNotification[]>(
    [],
  );
  const [contracts, setContracts] = useState<SaasTenantContract[]>([]);
  const [carteraForm, setCarteraForm] = useState<CarteraForm | null>(null);
  const [contractForm, setContractForm] = useState<{
    id?: string;
    tenant_id: string;
    title: string;
    contract_url: string;
    status: string;
    counterparty_name: string;
    counterparty_rut: string;
    signed_at: string;
    expires_at: string;
    notes: string;
  } | null>(null);
  const [eventTenant, setEventTenant] = useState("all");
  const [eventType, setEventType] = useState("all");
  const [eventSearch, setEventSearch] = useState("");
  const [branding, setBranding] = useState<TenantBranding[]>([]);
  const [brandingTenantId, setBrandingTenantId] = useState<string | null>(null);
  const [brandingSaving, setBrandingSaving] = useState(false);
  const [expandedPortalTenants, setExpandedPortalTenants] = useState<Set<string>>(new Set());
  const [portalWorkers, setPortalWorkers] = useState<
    Record<
      string,
      Array<{
        id: string;
        rut: string;
        full_name: string;
        email: string | null;
        position: string | null;
      }>
    >
  >({});
  const [portalWorkerErrors, setPortalWorkerErrors] = useState<Record<string, string>>({});
  const [portalLoadingTenantId, setPortalLoadingTenantId] = useState<string | null>(null);
  const [portalPreview, setPortalPreview] = useState<{
    tenant: TenantOverview;
    worker: { rut: string; full_name: string; email: string | null };
  } | null>(null);
  const [portalWorkerSearch, setPortalWorkerSearch] = useState("");
  const [backupLoading, setBackupLoading] = useState<string | null>(null);
  const [cloneSource, setCloneSource] = useState<TenantOverview | null>(null);
  const [cloneDraft, setCloneDraft] = useState({ name: "", slug: "", ownerEmail: "" });
  const [cloneRoleTemplates, setCloneRoleTemplates] = useState(true);
  const [detailTenantId, setDetailTenantId] = useState<string | null>(null);
  const [notificationForm, setNotificationForm] = useState<{
    tenant_id: string;
    template_key: string;
    title: string;
    priority: string;
    message: string;
  } | null>(null);
  const [communicationTenantId, setCommunicationTenantId] = useState("");
  const [onboardingForm, setOnboardingForm] = useState<OnboardingForm | null>(null);

  // Empresas vigentes: las archivadas ("cortada") solo se ven en la papelera.
  const liveTenants = useMemo(
    () => tenants.filter((t) => t.tenant_status !== "cortada"),
    [tenants],
  );
  const selected = tenants.find((t) => t.tenant_id === selectedId) ?? null;
  const communicationTargetId = communicationTenantId || tenants[0]?.tenant_id || "";
  const unreadNotifications = internalNotifications.filter(
    (notification) => !notification.read_at,
  ).length;
  const activeContracts = contracts.filter((contract) => contract.status === "active").length;
  const selectedPlan =
    plans.find((p) => {
      const planCode = selected?.plan_code?.toLowerCase();
      return p.code.toLowerCase() === planCode || (planCode === "pro" && p.code === "profesional");
    }) ?? null;
  const featureKeys = useMemo(() => Object.keys(FEATURE_LABELS), []);
  const healthyCount = tenants.filter(
    (t) => t.deployment_status === "healthy" || t.deployment_status === "active",
  ).length;
  const alertCount = tenants.filter(
    (t) =>
      ["failed", "degraded", "stopped"].includes(t.deployment_status ?? "") ||
      ["suspendida", "cortada", "pendiente"].includes(t.tenant_status ?? ""),
  ).length;
  const eventTypes = useMemo(
    () => Array.from(new Set(events.map((e) => e.action))).sort(),
    [events],
  );
  const filteredEvents = useMemo(
    () =>
      events.filter((event) => {
        const matchesTenant = eventTenant === "all" || event.tenant_id === eventTenant;
        const matchesType = eventType === "all" || event.action === eventType;
        const haystack =
          `${event.action} ${event.entity ?? ""} ${event.entity_label ?? ""}`.toLowerCase();
        return (
          matchesTenant &&
          matchesType &&
          (!eventSearch || haystack.includes(eventSearch.toLowerCase()))
        );
      }),
    [events, eventSearch, eventTenant, eventType],
  );
  const monitoringRows = useMemo(() => {
    const now = Date.now();
    const dayAgo = now - 24 * 60 * 60 * 1000;
    return tenants
      .map((tenant) => {
        const tenantEvents = events
          .filter((event) => event.tenant_id === tenant.tenant_id)
          .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
        const recentEvents = tenantEvents.filter((event) => +new Date(event.created_at) >= dayAgo);
        const errorEvents = tenantEvents.filter((event) =>
          /error|fail|exception|denied|degraded|stopped/i.test(event.action),
        );
        const deploymentProblem = ["failed", "degraded", "stopped"].includes(
          tenant.deployment_status ?? "",
        );
        const lifecycleProblem = ["suspendida", "cortada", "pendiente"].includes(
          tenant.tenant_status ?? "",
        );
        return {
          tenant,
          latestEvent: tenantEvents[0] ?? null,
          recentCount: recentEvents.length,
          errorCount: errorEvents.length,
          status: deploymentProblem || lifecycleProblem ? "attention" : "healthy",
        } as const;
      })
      .sort((a, b) => {
        if (a.status !== b.status) return a.status === "attention" ? -1 : 1;
        return b.errorCount - a.errorCount;
      });
  }, [events, tenants]);
  const monitoringSummary = useMemo(
    () => ({
      attention: monitoringRows.filter((row) => row.status === "attention").length,
      healthy: monitoringRows.filter((row) => row.status === "healthy").length,
      errors: monitoringRows.reduce((total, row) => total + row.errorCount, 0),
      active24h: monitoringRows.reduce((total, row) => total + row.recentCount, 0),
    }),
    [monitoringRows],
  );
  const billingMetrics = useMemo(() => {
    const today = new Date();
    const todayDate = toLocalDateString(today);
    const horizonDate = toLocalDateString(addCalendarDays(today, 30));
    const activeAccounts = cartera.filter((account) => account.payment_status !== "paused");
    const monthlyNet = activeAccounts.reduce(
      (total, account) => total + Number(account.monthly_amount ?? 0),
      0,
    );
    const monthlyTax = activeAccounts.reduce(
      (total, account) => total + Number(account.iva_amount ?? 0),
      0,
    );
    const monthlyGross = monthlyNet + monthlyTax;
    const upcoming = billingNotices
      .filter(
        (notice) =>
          notice.status === "pending" &&
          notice.due_date >= todayDate &&
          notice.due_date <= horizonDate,
      )
      .sort((left, right) => left.due_date.localeCompare(right.due_date));
    const overdue = billingNotices.filter(
      (notice) => ["pending", "overdue"].includes(notice.status) && notice.due_date < todayDate,
    );
    const collectionTotals = calculateBillingCollectionTotals(billingNotices);
    return {
      activeAccounts: activeAccounts.length,
      monthlyNet,
      monthlyTax,
      monthlyGross,
      upcoming,
      overdue,
      paidTotal: collectionTotals.paidTotal,
      collectionRate: collectionTotals.collectionRate,
      projection90: monthlyGross * 3,
      projection365: monthlyGross * 12,
    };
  }, [billingNotices, cartera]);
  const storageByTenant = useMemo(
    () =>
      tenants.map((tenant) => {
        const latest = storageUsage.find((row) => row.tenant_id === tenant.tenant_id) ?? null;
        const usedBytes = Number(latest?.storage_bytes ?? 0);
        const limitBytes = latest?.plan_storage_limit_bytes
          ? Number(latest.plan_storage_limit_bytes)
          : null;
        const percentage = limitBytes && limitBytes > 0 ? (usedBytes / limitBytes) * 100 : null;
        return { tenant, latest, usedBytes, limitBytes, percentage };
      }),
    [storageUsage, tenants],
  );
  // Solo empresas vigentes: excluye registros huérfanos (empresa eliminada) y archivadas.
  const visibleBranding = useMemo(() => {
    const live = new Set(liveTenants.map((t) => t.tenant_id));
    return branding.filter((item) => live.has(item.tenant_id));
  }, [branding, liveTenants]);
  const selectedBranding =
    visibleBranding.find((item) => item.tenant_id === brandingTenantId) ??
    visibleBranding[0] ??
    null;
  const configuredNavigationOpacity = Number(
    selectedBranding?.visual_assets?.navigation?.opacity ?? selectedBranding?.glass_opacity ?? 0.8,
  );
  const navigationOpacity = Number.isFinite(configuredNavigationOpacity)
    ? Math.min(1, Math.max(0.4, configuredNavigationOpacity))
    : 0.8;
  const navigationLayout = selectedBranding?.visual_assets.navigation?.layout ?? "sidebar";

  const BACKUP_TABLES = [
    "workers",
    "departments",
    "daily_shifts",
    "shift_definitions",
    "shift_assignments",
    "shift_change_logs",
    "incidents_ds44",
    "trainings_ds44",
    "training_attendance",
    "epp_items",
    "epp_stock",
    "epp_deliveries",
    "epp_returns",
    "epp_logs",
    "cloud_documents",
    "worker_documents",
    "payroll_periods",
    "payroll_items",
    "performance_objectives",
    "performance_evaluations",
    "performance_feedback",
    "vacation_requests",
    "vacation_balances",
    "finiquito_records",
    "security_talks",
    "iper_entries",
    "correction_requests",
    "security_alerts",
    "medical_licenses",
    "customers",
    "quotes",
    "invoices",
    "purchase_orders",
    "quote_items",
    "invoice_items",
    "purchase_order_items",
    "circulars",
    "circular_acknowledgments",
    "salary_advances",
    "internal_loans",
    "worker_discounts",
    "worker_payment_statements",
    "harassment_reports",
    "security_breach_reports",
    "worker_bank_accounts",
    "suppliers",
    "treasury_transactions",
  ];

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      // Refresh the server-side logical usage snapshot before reading it. The
      // physical Supabase quota remains project-wide; this is an allocation
      // signal used to compare companies and future application plans.
      const { error: usageRefreshError } = await supabase.rpc("refresh_tenant_usage_daily", {
        _tenant_id: null,
      });
      if (usageRefreshError) {
        console.warn("No se pudo actualizar el snapshot de consumo SaaS", usageRefreshError);
      }
      const [
        { data: tenantData, error: tenantError },
        { data: planData, error: planError },
        { data: eventData, error: eventError },
        { data: brandingData, error: brandingError },
        { data: devData },
        { data: billingNoticeData, error: billingNoticeError },
        { data: notificationData, error: notificationError },
        { data: contractData, error: contractError },
        { data: onboardingProfileData, error: onboardingProfileError },
        { data: onboardingDeliveryData, error: onboardingDeliveryError },
        { data: storageData, error: storageError },
      ] = await Promise.all([
        supabase.rpc("fetch_saas_tenant_overview"),
        supabase.rpc("fetch_saas_plans"),
        supabase.rpc("fetch_saas_operational_events"),
        supabase.rpc("fetch_saas_tenant_branding"),
        supabase.rpc("fetch_platform_operators"),
        supabase
          .from("saas_billing_notices")
          .select(BILLING_NOTICE_COLUMNS)
          .order("created_at", { ascending: false })
          .limit(1000),
        supabase
          .from("saas_customer_notifications")
          .select(NOTIFICATION_COLUMNS)
          .order("created_at", { ascending: false })
          .limit(1000),
        supabase
          .from("saas_tenant_contracts")
          .select(CONTRACT_COLUMNS)
          .order("expires_at", { ascending: true, nullsFirst: false })
          .limit(1000),
        supabase.from("saas_onboarding_profiles").select(ONBOARDING_PROFILE_COLUMNS).limit(1000),
        supabase
          .from("saas_onboarding_deliveries")
          .select(ONBOARDING_DELIVERY_COLUMNS)
          .order("created_at", { ascending: false })
          .limit(1000),
        supabase
          .from("saas_tenant_usage_daily")
          .select(
            "tenant_id,usage_date,records_count,files_count,storage_bytes,plan_storage_limit_bytes,usage_breakdown",
          )
          .order("usage_date", { ascending: false })
          .limit(5000),
      ]);
      if (tenantError)
        setMessage(
          "No se pudo cargar el plano SaaS. Esta vista requiere una sesión autenticada como dueño u operador autorizado.",
        );
      else {
        const rows = (tenantData ?? []) as TenantOverview[];
        setTenants(rows);
        const loadedPlans = (planData?.length ? planData : FALLBACK_PLANS) as Plan[];
        setPlans(
          loadedPlans.map((plan) => ({
            ...plan,
            feature_keys: normalizeFeatureKeys(plan.feature_keys),
          })),
        );
        setEvents((eventData ?? []) as OperationalEvent[]);
        setBranding((brandingData ?? []) as TenantBranding[]);
        setBillingNotices((billingNoticeData ?? []) as SaasBillingNotice[]);
        setInternalNotifications((notificationData ?? []) as SaasInternalNotification[]);
        setContracts((contractData ?? []) as SaasTenantContract[]);
        setOnboardingProfiles((onboardingProfileData ?? []) as SaasOnboardingProfile[]);
        setOnboardingDeliveries((onboardingDeliveryData ?? []) as SaasOnboardingDelivery[]);
        setStorageUsage((storageData ?? []) as TenantStorageUsage[]);
        const operatorRows = (devData ?? []) as Array<{
          id: string;
          email: string;
          active: boolean;
          permissions: Record<string, boolean | string[]>;
          tenant_ids: string[];
        }>;
        setDevOperators(
          operatorRows.map((operator) => ({
            ...operator,
            tenant_ids: operator.tenant_ids ?? [],
          })),
        );

        // Un "permission denied" / tabla inexistente en catálogos opcionales no es
        // un error: simplemente se usa el catálogo local y no se alerta al usuario.
        const isExpectedCatalogIssue = (err: unknown) => {
          const details =
            typeof err === "object" && err !== null
              ? (err as { code?: unknown; message?: unknown })
              : {};
          const code = String(details.code ?? "");
          const msg = String(details.message ?? "").toLowerCase();
          return (
            code === "42501" ||
            code === "42P01" ||
            code === "PGRST116" ||
            code === "PGRST205" ||
            msg.includes("permission denied") ||
            msg.includes("does not exist") ||
            msg.includes("row-level security")
          );
        };

        const notices: string[] = [];
        if (planError && !isExpectedCatalogIssue(planError))
          notices.push("no se pudo leer el catálogo de planes");
        if (eventError && !isExpectedCatalogIssue(eventError))
          notices.push("el monitoreo operacional no está disponible");
        if (brandingError && !isExpectedCatalogIssue(brandingError))
          notices.push("la identidad visual no pudo cargarse");
        if (billingNoticeError && !isExpectedCatalogIssue(billingNoticeError))
          notices.push("los avisos de cobro no pudieron cargarse");
        if (notificationError && !isExpectedCatalogIssue(notificationError))
          notices.push("las comunicaciones no pudieron cargarse");
        if (contractError && !isExpectedCatalogIssue(contractError))
          notices.push("los contratos no pudieron cargarse");
        if (onboardingProfileError && !isExpectedCatalogIssue(onboardingProfileError))
          notices.push("el perfil de onboarding no pudo cargarse");
        if (onboardingDeliveryError && !isExpectedCatalogIssue(onboardingDeliveryError))
          notices.push("el historial de onboarding no pudo cargarse");
        if (storageError && !isExpectedCatalogIssue(storageError))
          notices.push("el consumo de almacenamiento no pudo cargarse");
        if (notices.length) setMessage(`Empresas cargadas; ${notices.join(" y ")}.`);
        setSelectedId((current) =>
          current && rows.some((r) => r.tenant_id === current)
            ? current
            : (rows.find((row) => row.tenant_status !== "cortada")?.tenant_id ??
              rows[0]?.tenant_id ??
              null),
        );
        setBrandingTenantId((current) =>
          current && (brandingData ?? []).some((r: TenantBranding) => r.tenant_id === current)
            ? current
            : ((brandingData ?? [])[0]?.tenant_id ?? null),
        );
        setLastRefresh(new Date());
      }
    } catch (error) {
      console.error("Error cargando el plano SaaS", error);
      setMessage(authorizationErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  async function saveBranding() {
    if (!selectedBranding) return;
    setBrandingSaving(true);
    setMessage(null);
    const { error } = await supabase.rpc("update_saas_tenant_branding", {
      _tenant_id: selectedBranding.tenant_id,
      _company_name: selectedBranding.company_name.trim(),
      _logo_url: selectedBranding.logo_url.trim(),
      _color_theme: selectedBranding.color_theme,
      _glass_opacity: selectedBranding.glass_opacity,
      _landing_enabled: selectedBranding.landing_enabled ?? true,
      _landing_cta_label: selectedBranding.landing_cta_label || "Solicitar una demo",
      _visual_assets: selectedBranding.visual_assets ?? {},
    });
    if (error) setMessage(error.message);
    else {
      setMessage(`Identidad visual actualizada para ${selectedBranding.tenant_name}.`);
      await load();
    }
    setBrandingSaving(false);
  }

  async function sendDeveloperNotification() {
    if (
      !notificationForm?.tenant_id ||
      !notificationForm.title.trim() ||
      !notificationForm.message.trim()
    )
      return;
    setBusy(true);
    const { error } = await supabase.rpc("publish_saas_notification", {
      _tenant_id: notificationForm.tenant_id,
      _template_key: notificationForm.template_key,
      _title: notificationForm.title.trim(),
      _message: notificationForm.message.trim(),
      _priority: notificationForm.priority,
      _metadata: { source: "dev_team", issued_at: new Date().toISOString() },
    });
    if (error) setMessage(error.message);
    else {
      const tenant = tenants.find((item) => item.tenant_id === notificationForm.tenant_id);
      setMessage(`Aviso publicado para ${tenant?.tenant_name ?? "la empresa"}.`);
      setNotificationForm(null);
    }
    setBusy(false);
  }

  function openOnboarding(
    tenant: Pick<TenantOverview, "tenant_id" | "tenant_name">,
    email = "",
    temporaryPassword?: string,
  ) {
    const profile = onboardingProfiles.find((item) => item.tenant_id === tenant.tenant_id);
    const origin = window.location.origin;
    setOnboardingForm({
      tenant_id: tenant.tenant_id,
      company_name: tenant.tenant_name,
      contact_name: profile?.contact_name ?? "",
      primary_email: email || profile?.primary_email || "",
      alternate_email: profile?.alternate_email ?? "",
      access_path: profile?.access_path || `${origin}/admin`,
      help_path: profile?.help_path || `${origin}/terminos`,
      manual_url: profile?.manual_url ?? "",
      support_email: profile?.support_email ?? "",
      support_phone: profile?.support_phone ?? "",
      support_whatsapp: profile?.support_whatsapp ?? "",
      support_hours: profile?.support_hours ?? "",
      support_url: profile?.support_url ?? "",
      provider_legal_name: profile?.provider_legal_name ?? "",
      provider_rut: profile?.provider_rut ?? "",
      bank_name: profile?.bank_name ?? "",
      account_type: profile?.account_type ?? "",
      account_number: profile?.account_number ?? "",
      account_holder: profile?.account_holder ?? "",
      account_holder_rut: profile?.account_holder_rut ?? "",
      billing_email: profile?.billing_email ?? "",
      billing_legal_notice:
        profile?.billing_legal_notice ||
        "Los avisos de cobro no reemplazan una factura electrónica ni un DTE.",
      subject: `Bienvenido a ${tenant.tenant_name} — acceso inicial`,
      temporary_password: temporaryPassword,
    });
  }

  async function saveOnboardingProfile(form: OnboardingForm): Promise<{ error?: string }> {
    if (
      !isHttpUrl(form.access_path) ||
      !isOptionalHttpUrl(form.help_path) ||
      !isOptionalHttpUrl(form.manual_url)
    ) {
      return { error: "Las rutas de acceso, ayuda y manual deben ser URLs http(s) válidas." };
    }
    setBusy(true);
    const { data: userData } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("saas_onboarding_profiles")
      .upsert(
        {
          tenant_id: form.tenant_id,
          contact_name: form.contact_name.trim() || null,
          primary_email: form.primary_email.trim().toLowerCase(),
          alternate_email: form.alternate_email.trim().toLowerCase() || null,
          access_path: form.access_path.trim(),
          help_path: form.help_path.trim() || null,
          manual_url: form.manual_url.trim() || null,
          support_email: form.support_email.trim().toLowerCase() || null,
          support_phone: form.support_phone.trim() || null,
          support_whatsapp: form.support_whatsapp.trim() || null,
          support_hours: form.support_hours.trim() || null,
          support_url: form.support_url.trim() || null,
          provider_legal_name: form.provider_legal_name.trim() || null,
          provider_rut: form.provider_rut.trim() || null,
          bank_name: form.bank_name.trim() || null,
          account_type: form.account_type.trim() || null,
          account_number: form.account_number.trim() || null,
          account_holder: form.account_holder.trim() || null,
          account_holder_rut: form.account_holder_rut.trim() || null,
          billing_email: form.billing_email.trim().toLowerCase() || null,
          billing_legal_notice: form.billing_legal_notice.trim() || null,
          updated_by_email: userData.user?.email ?? null,
        },
        { onConflict: "tenant_id" },
      )
      .select(ONBOARDING_PROFILE_COLUMNS)
      .single();
    if (error) {
      setBusy(false);
      return { error: error.message };
    }
    setOnboardingProfiles((rows) => [
      ...(rows.filter((row) => row.tenant_id !== form.tenant_id) as SaasOnboardingProfile[]),
      data as SaasOnboardingProfile,
    ]);
    setBusy(false);
    return {};
  }

  async function saveOnboardingDraft(form: OnboardingForm): Promise<{ error?: string }> {
    const profileResult = await saveOnboardingProfile(form);
    if (profileResult.error) return profileResult;
    const { data: userData } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("saas_onboarding_deliveries")
      .insert({
        tenant_id: form.tenant_id,
        recipient_name: form.contact_name.trim() || null,
        recipient_email: form.primary_email.trim().toLowerCase(),
        subject: form.subject.trim(),
        status: "draft",
        provider: "draft",
        created_by_email: userData.user?.email ?? null,
      })
      .select(ONBOARDING_DELIVERY_COLUMNS)
      .single();
    if (error) return { error: error.message };
    setOnboardingDeliveries((rows) => [data as SaasOnboardingDelivery, ...rows]);
    setMessage("Onboarding guardado como borrador. La credencial temporal no se persistió.");
    return {};
  }

  async function sendOnboarding(form: OnboardingForm): Promise<{ error?: string }> {
    const profileResult = await saveOnboardingProfile(form);
    if (profileResult.error) return profileResult;
    const {
      temporary_password: _temporaryPassword,
      access_path,
      help_path,
      manual_url,
      ...otherEmailFields
    } = form;
    void _temporaryPassword;
    const emailPayload = {
      ...otherEmailFields,
      access_path: access_path.trim(),
      help_path: help_path.trim() || undefined,
      manual_url: manual_url.trim() || undefined,
    };
    const { data, error } = await callEdgeFunction<{ ok: boolean; delivery_id?: string }>(
      "send-tenant-onboarding",
      emailPayload,
    );
    if (error) {
      await saveOnboardingDraft(form);
      return { error: `${error}. Se guardó un borrador sin credenciales.` };
    }
    setMessage(data?.ok ? "Bienvenida enviada y registrada." : "Bienvenida procesada.");
    await load();
    return {};
  }

  function openContractForm(contract?: SaasTenantContract) {
    setContractForm({
      id: contract?.id,
      tenant_id: contract?.tenant_id ?? tenants[0]?.tenant_id ?? "",
      title: contract?.title ?? "Contrato SaaS",
      contract_url: contract?.contract_url ?? "https://",
      status: contract?.status ?? "active",
      counterparty_name: contract?.counterparty_name ?? "",
      counterparty_rut: contract?.counterparty_rut ?? "",
      signed_at: contract?.signed_at ?? "",
      expires_at: contract?.expires_at ?? "",
      notes: contract?.notes ?? "",
    });
  }

  async function saveContractForm() {
    if (!contractForm?.tenant_id || !contractForm.title.trim()) {
      setMessage("Selecciona una empresa y completa el título del contrato.");
      return;
    }
    if (!isHttpUrl(contractForm.contract_url)) {
      setMessage("El contrato debe tener un enlace http(s) válido.");
      return;
    }
    setBusy(true);
    const payload = {
      tenant_id: contractForm.tenant_id,
      title: contractForm.title.trim(),
      contract_url: contractForm.contract_url.trim(),
      status: contractForm.status,
      counterparty_name: contractForm.counterparty_name.trim() || null,
      counterparty_rut: contractForm.counterparty_rut.trim() || null,
      signed_at: contractForm.signed_at || null,
      expires_at: contractForm.expires_at || null,
      notes: contractForm.notes.trim() || null,
      updated_at: new Date().toISOString(),
    };
    const query = contractForm.id
      ? supabase.from("saas_tenant_contracts").update(payload).eq("id", contractForm.id)
      : supabase.from("saas_tenant_contracts").insert(payload);
    const { data, error } = await query.select(CONTRACT_COLUMNS).maybeSingle();
    if (error) {
      setMessage(`No se pudo guardar el contrato: ${error.message}`);
    } else if (data) {
      const saved = data as SaasTenantContract;
      setContracts((rows) =>
        contractForm.id ? rows.map((row) => (row.id === saved.id ? saved : row)) : [saved, ...rows],
      );
      setMessage(contractForm.id ? "Contrato actualizado." : "Contrato vinculado a la empresa.");
      setContractForm(null);
    }
    setBusy(false);
  }

  const loadOverrides = useCallback(async (tenantId: string) => {
    const { data } = await supabase
      .from("saas_tenant_feature_overrides")
      .select("feature_key, enabled")
      .eq("tenant_id", tenantId);
    setOverrides(
      Object.fromEntries(
        ((data ?? []) as { feature_key: string; enabled: boolean }[]).map((row) => [
          row.feature_key,
          row.enabled,
        ]),
      ),
    );
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 60000);
    return () => window.clearInterval(timer);
  }, [load]);
  useEffect(() => {
    if (selected?.tenant_id) void loadOverrides(selected.tenant_id);
  }, [selected?.tenant_id, loadOverrides]);
  useEffect(() => {
    if (activeSection === "captadores")
      void (async () => {
        const { data } = await supabase
          .from("saas_demo_operators")
          .select("id, full_name, email, active, demo_tenant_id")
          .order("full_name");
        setCaptadores((data ?? []) as typeof captadores);
      })();
    if (activeSection === "cartera" || activeSection === "overview")
      void (async () => {
        const { data } = await supabase
          .from("saas_customer_accounts")
          .select(CARTERA_COLUMNS)
          .order("next_payment_date");
        setCartera((data ?? []) as typeof cartera);
      })();
  }, [activeSection]);

  async function assignPlan(planId: string) {
    if (!selected) return;
    if (!isPersistedPlanId(planId)) {
      setMessage(
        "Este plan es sólo una recomendación visual. Carga un plan real desde Supabase o usa las vistas manuales para aplicar excepciones.",
      );
      return;
    }
    setBusy(true);
    setMessage(null);
    const plan = plans.find((p) => p.id === planId);
    const { data, error } = await supabase.rpc("apply_saas_plan", {
      _tenant_id: selected.tenant_id,
      _plan_id: planId,
      _reason: "Cambio de plan desde Control SaaS",
    });
    if (!error && plan) {
      const effective = Array.isArray(data) ? data[0] : data;
      await audit({
        action: "saas.subscription.plan_change",
        entity: "tenant",
        entity_id: selected.tenant_id,
        entity_label: selected.tenant_name,
        details: {
          plan: plan.code,
          tenant_id: selected.tenant_id,
          effective_modules: effective?.effective_modules ?? null,
          overrides_preserved: true,
        },
        tenant_id: selected.tenant_id,
      });
      const preserved = effective?.overrides && Object.keys(effective.overrides).length > 0;
      setMessage(
        `Plan actualizado para ${selected.tenant_name}.${preserved ? " Los overrides manuales se conservaron como excepciones." : ""}`,
      );
      await load();
    } else setMessage(authorizationErrorMessage(error ?? "No se pudo actualizar el plan."));
    setBusy(false);
  }

  async function toggleOverride(featureKey: string) {
    if (!selected) return;
    setBusy(true);
    const next = !(overrides[featureKey] ?? selectedPlan?.feature_keys?.[featureKey] === true);
    const { error } = await supabase.rpc("set_saas_tenant_feature_override", {
      _tenant_id: selected.tenant_id,
      _feature_key: featureKey,
      _enabled: next,
      _reason: "Configuración manual del dueño del SaaS",
    });
    if (!error) {
      setOverrides((current) => ({ ...current, [featureKey]: next }));
      setMessage(
        `Vista ${FEATURE_LABELS[featureKey]} ${next ? "habilitada" : "bloqueada"} para ${selected.tenant_name}.`,
      );
    } else setMessage(error.message);
    setBusy(false);
  }

  async function createTenant() {
    const name = window.prompt("Nombre de la nueva empresa o sucursal:");
    if (!name?.trim()) return;
    const slug = window.prompt(
      "Identificador corto (slug):",
      name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-"),
    );
    if (!slug?.trim()) return;
    const ownerEmail = window.prompt("Correo del jefe o responsable de la empresa:");
    if (!ownerEmail?.trim()) {
      setMessage(
        "Debes indicar el correo del responsable para completar la provisión de la empresa.",
      );
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.rpc("create_saas_tenant", {
      _name: name.trim(),
      _slug: slug.trim(),
      _owner_email: ownerEmail.trim().toLowerCase(),
      _owner_permissions: DEFAULT_PERMISSIONS.company_owner,
    });
    const tenantRow = Array.isArray(data) ? data[0] : data;
    if (error || !tenantRow?.id) {
      setMessage(
        error?.message ??
          "No se pudo crear la empresa. Aplica la migración de jerarquía de roles antes de continuar.",
      );
      setBusy(false);
      return;
    }
    try {
      const owner = await provisionTenantUser({
        tenantId: tenantRow.id,
        email: ownerEmail,
        role: "company_owner",
        permissions: DEFAULT_PERMISSIONS.company_owner,
      });
      await audit({
        action: "saas.tenant.create",
        entity: "tenant",
        entity_id: tenantRow.id,
        entity_label: name.trim(),
        tenant_id: tenantRow.id,
        details: { owner_email: ownerEmail.trim().toLowerCase(), owner_provisioned: true },
      });
      setMessage(
        owner.temporary_password
          ? `Empresa creada y responsable provisionado. Entrega la contraseña temporal de forma segura.`
          : `Empresa creada y responsable ${ownerEmail.trim().toLowerCase()} provisionado.`,
      );
      openOnboarding(
        { tenant_id: tenantRow.id, tenant_name: name.trim() },
        ownerEmail,
        owner.temporary_password,
      );
      await load();
    } catch (provisionError) {
      setMessage(
        provisionError instanceof Error
          ? `Empresa creada, pero falta completar el acceso del responsable: ${provisionError.message}`
          : "Empresa creada, pero falta completar el acceso del responsable.",
      );
    }
    setBusy(false);
  }

  function openCloneTenant(tenant: TenantOverview) {
    const baseSlug = tenant.tenant_slug.replace(/-copia(?:-\d+)?$/, "");
    setCloneSource(tenant);
    setCloneDraft({
      name: `${tenant.tenant_name} · Copia`,
      slug: `${baseSlug}-copia`,
      ownerEmail: "",
    });
    setCloneRoleTemplates(true);
    setMessage(null);
  }

  async function cloneTenant() {
    if (!cloneSource) return;
    const name = cloneDraft.name.trim();
    const slug = cloneDraft.slug.trim().toLowerCase();
    const ownerEmail = cloneDraft.ownerEmail.trim().toLowerCase();
    if (!name || !slug) {
      setMessage("Indica el nombre y el identificador de la nueva empresa.");
      return;
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      setMessage("El identificador sólo puede usar minúsculas, números y guiones.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const { data, error } = await supabase.rpc("create_saas_tenant", {
        _name: name,
        _slug: slug,
        _owner_email: ownerEmail || null,
        _owner_permissions: DEFAULT_PERMISSIONS.company_owner,
      });
      const tenantRow = Array.isArray(data) ? data[0] : data;
      if (error || !tenantRow?.id)
        throw new Error(error?.message ?? "No se pudo crear la empresa clonada.");

      const sourcePlan = plans.find(
        (plan) =>
          plan.code.toLowerCase() === cloneSource.plan_code?.toLowerCase() ||
          (cloneSource.plan_code === "pro" && plan.code === "profesional"),
      );
      if (sourcePlan && isPersistedPlanId(sourcePlan.id)) {
        await supabase
          .from("saas_tenant_subscriptions")
          .upsert(
            { tenant_id: tenantRow.id, plan_id: sourcePlan.id, status: "active" },
            { onConflict: "tenant_id" },
          );
        await supabase.from("tenant_settings").upsert(
          {
            tenant_id: tenantRow.id,
            plan: sourcePlan.code,
            modules: sourcePlan.feature_keys,
            max_users: sourcePlan.max_users,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "tenant_id" },
        );
      }

      const { data: sourceOverrides } = await supabase
        .from("saas_tenant_feature_overrides")
        .select("feature_key, enabled")
        .eq("tenant_id", cloneSource.tenant_id);
      if (sourceOverrides?.length) {
        await supabase.from("saas_tenant_feature_overrides").insert(
          sourceOverrides.map((row: { feature_key: string; enabled: boolean }) => ({
            tenant_id: tenantRow.id,
            feature_key: row.feature_key,
            enabled: row.enabled,
          })),
        );
      }

      if (cloneRoleTemplates) {
        const { data: sourceTemplates } = await supabase.rpc("fetch_tenant_role_templates", {
          _tenant_id: cloneSource.tenant_id,
        });
        const templates =
          Array.isArray(sourceTemplates) && sourceTemplates.length
            ? sourceTemplates.map(
                (row: { role: string; permissions: Record<string, boolean> }) => ({
                  role: row.role,
                  permissions: row.permissions ?? {},
                }),
              )
            : Object.entries(DEFAULT_PERMISSIONS)
                .filter(([role]) => role !== "superadmin" && role !== "developer")
                .map(([role, permissions]) => ({ role, permissions }));
        const { error: templateError } = await supabase.rpc("replace_tenant_role_templates", {
          _tenant_id: tenantRow.id,
          _templates: templates,
        });
        if (templateError) throw templateError;
      }

      const sourceBranding = branding.find((item) => item.tenant_id === cloneSource.tenant_id);
      if (sourceBranding) {
        await supabase.from("saas_tenant_branding").upsert(
          {
            tenant_id: tenantRow.id,
            company_name: name,
            logo_url: sourceBranding.logo_url,
            color_theme: sourceBranding.color_theme,
            glass_opacity: sourceBranding.glass_opacity,
          },
          { onConflict: "tenant_id" },
        );
      }

      let ownerMessage = "sin responsable provisionado";
      let provisionedOwner: { temporary_password?: string } | null = null;
      if (ownerEmail) {
        const owner = await provisionTenantUser({
          tenantId: tenantRow.id,
          email: ownerEmail,
          role: "company_owner",
          permissions: DEFAULT_PERMISSIONS.company_owner,
        });
        provisionedOwner = owner;
        ownerMessage = owner.temporary_password
          ? "responsable creado con contraseña temporal"
          : "responsable vinculado";
      }
      await audit({
        action: "saas.tenant.clone",
        entity: "tenant",
        entity_id: tenantRow.id,
        entity_label: name,
        tenant_id: tenantRow.id,
        details: {
          source_tenant_id: cloneSource.tenant_id,
          source_tenant_name: cloneSource.tenant_name,
          copied: ["plan", "feature_overrides", "branding"],
          role_templates_cloned: cloneRoleTemplates,
          excluded: ["workers", "operational_data", "memberships"],
          owner_email: ownerEmail || null,
        },
      });
      setCloneSource(null);
      setMessage(`Empresa clonada correctamente: ${name} · ${ownerMessage}.`);
      if (ownerEmail) {
        openOnboarding(
          { tenant_id: tenantRow.id, tenant_name: name },
          ownerEmail,
          provisionedOwner?.temporary_password,
        );
      }
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo completar la clonación.");
    } finally {
      setBusy(false);
    }
  }

  async function editTenant(tenant: TenantOverview) {
    const name = window.prompt("Nombre de la empresa:", tenant.tenant_name);
    if (!name?.trim()) return;
    const slug = window.prompt("Identificador corto (slug):", tenant.tenant_slug);
    if (!slug?.trim()) return;
    setBusy(true);
    const { error } = await supabase
      .from("tenants")
      .update({ name: name.trim(), slug: slug.trim() })
      .eq("id", tenant.tenant_id);
    if (error) setMessage(error.message);
    else {
      await audit({
        action: "saas.tenant.update",
        entity: "tenant",
        entity_id: tenant.tenant_id,
        entity_label: name.trim(),
        tenant_id: tenant.tenant_id,
      });
      setMessage("Empresa actualizada.");
      await load();
    }
    setBusy(false);
  }

  async function setTenantLifecycle(
    tenant: TenantOverview,
    nextStatus: "activa" | "suspendida" | "cortada",
  ) {
    const actionLabel =
      nextStatus === "activa"
        ? "reactivar"
        : nextStatus === "suspendida"
          ? "suspender"
          : "archivar";
    const ok = await confirm({
      title:
        nextStatus === "cortada"
          ? "Enviar a la papelera"
          : `¿${actionLabel[0].toUpperCase()}${actionLabel.slice(1)} empresa?`,
      message:
        nextStatus === "cortada"
          ? `${tenant.tenant_name} dejará de aparecer en el directorio y quedará en la Papelera. Sus datos se conservan y puedes restaurarla.`
          : `¿Quieres ${actionLabel} ${tenant.tenant_name}? No se borrarán sus datos.`,
      confirmText: nextStatus === "cortada" ? "Mover a papelera" : "Confirmar",
      type: nextStatus === "activa" ? "info" : "warning",
    });
    if (!ok) return;
    const reason: string | null =
      nextStatus === "cortada"
        ? "Enviada a papelera"
        : nextStatus === "suspendida"
          ? "Suscripción impaga"
          : "Restaurada";
    if (reason === null) return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc("set_saas_tenant_lifecycle", {
        _tenant_id: tenant.tenant_id,
        _status: nextStatus,
        _reason: reason.trim() || null,
      });
      if (error) {
        const detail = [error.code, error.message, error.details, error.hint]
          .filter(Boolean)
          .join(" · ");
        setMessage(`No se pudo mover la empresa a la papelera: ${detail}`);
        return;
      }
      setTenants((current) =>
        current.map((item) =>
          item.tenant_id === tenant.tenant_id
            ? {
                ...item,
                tenant_active: nextStatus === "activa",
                tenant_status: nextStatus,
                deployment_status: nextStatus === "activa" ? "active" : "stopped",
              }
            : item,
        ),
      );
      await audit({
        action: `saas.tenant.${nextStatus === "cortada" ? "archive" : nextStatus === "suspendida" ? "suspend" : "reactivate"}`,
        entity: "tenant",
        entity_id: tenant.tenant_id,
        entity_label: tenant.tenant_name,
        tenant_id: tenant.tenant_id,
        details: { status: nextStatus, reason: reason.trim() },
      });
      if (nextStatus === "cortada") {
        setShowTrash(true);
        setActiveSection("containers");
      } else if (nextStatus === "activa") {
        setShowTrash(false);
      }
      setMessage(
        `${tenant.tenant_name} ${nextStatus === "activa" ? "fue restaurada" : nextStatus === "suspendida" ? "quedó suspendida" : "se movió a la Papelera"}. Los datos se conservaron.`,
      );
      await load();
    } catch (error) {
      setMessage(authorizationErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function setTenantLandingEnabled(tenant: TenantOverview, enabled: boolean) {
    if (!enabled) {
      const ok = await confirm({
        title: "¿Desactivar landing pública?",
        message: `La página /empresa/${tenant.tenant_slug} dejará de estar disponible. El acceso al sistema se controla por separado.`,
        confirmText: "Desactivar landing",
        type: "warning",
      });
      if (!ok) return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const { error } = await supabase.rpc("set_saas_tenant_landing_enabled", {
        _tenant_id: tenant.tenant_id,
        _enabled: enabled,
      });
      if (error) throw error;
      setBranding((rows) =>
        rows.map((row) =>
          row.tenant_id === tenant.tenant_id ? { ...row, landing_enabled: enabled } : row,
        ),
      );
      setMessage(
        `Landing de ${tenant.tenant_name}: ${enabled ? "activada" : "desactivada"}. El sistema operativo no cambió.`,
      );
    } catch (error) {
      setMessage(authorizationErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function enterCompany(tenant: TenantOverview) {
    setBusy(true);
    setEnteringTenantId(tenant.tenant_id);
    setMessage(`Entrando a ${tenant.tenant_name}…`);
    try {
      await setActiveTenant(tenant.tenant_id, "platform_enter_company", true);
      navigateTo(buildAdminPath(tenant.tenant_slug, "dashboard"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo abrir la empresa.");
      setEnteringTenantId(null);
      setBusy(false);
    }
  }

  async function togglePortalTenant(tenant: TenantOverview) {
    setExpandedPortalTenants((current) => {
      const next = new Set(current);
      if (next.has(tenant.tenant_id)) next.delete(tenant.tenant_id);
      else next.add(tenant.tenant_id);
      return next;
    });
    if (portalWorkers[tenant.tenant_id]) return;
    setPortalLoadingTenantId(tenant.tenant_id);
    setPortalWorkerErrors((current) => {
      const next = { ...current };
      delete next[tenant.tenant_id];
      return next;
    });
    try {
      await setActiveTenant(tenant.tenant_id, "platform_open_worker_portal_monitor", true);
      const { data, error } = await supabase.rpc("fetch_saas_tenant_workers", {
        _tenant_id: tenant.tenant_id,
      });
      if (error) throw new Error(error.message);
      setPortalWorkers((current) => ({
        ...current,
        [tenant.tenant_id]: (data ?? []) as Array<{
          id: string;
          rut: string;
          full_name: string;
          email: string | null;
          position: string | null;
        }>,
      }));
    } catch (error) {
      setPortalWorkerErrors((current) => ({
        ...current,
        [tenant.tenant_id]:
          error instanceof Error ? error.message : "No se pudieron cargar los trabajadores.",
      }));
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar los trabajadores de la empresa.",
      );
    } finally {
      setPortalLoadingTenantId(null);
    }
  }

  function openPortalPreviewInNewTab(
    tenant: TenantOverview,
    worker: { rut: string; full_name: string; email: string | null },
  ) {
    const url = new URL(`/${tenant.tenant_slug}`, window.location.origin);
    url.searchParams.set("preview", "worker");
    url.searchParams.set("worker_rut", worker.rut);
    url.searchParams.set("preview_email", worker.email ?? "");
    window.open(url.toString(), "_blank", "noopener,noreferrer");
  }

  async function openPortalPreview(
    tenant: TenantOverview,
    worker: { rut: string; full_name: string; email: string | null },
  ) {
    setBusy(true);
    try {
      await setActiveTenant(tenant.tenant_id, "platform_preview_worker_portal", true);
      setPortalPreview({ tenant, worker });
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "No se pudo abrir la vista previa del portal.",
      );
    } finally {
      setBusy(false);
    }
  }

  function downloadText(content: string, filename: string, mime = "application/octet-stream") {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function exportTenantBackup(
    tenant: TenantOverview,
    format: "json" | "sql" | "excel" | "pdf",
  ) {
    setBackupLoading(`${tenant.tenant_id}:${format}`);
    setMessage(null);
    try {
      await setActiveTenant(tenant.tenant_id, "platform_tenant_backup", true);
      const backup: Record<string, unknown[]> = {
        tenants: [
          {
            id: tenant.tenant_id,
            name: tenant.tenant_name,
            slug: tenant.tenant_slug,
          },
        ],
      };
      for (const table of BACKUP_TABLES) {
        const pageSize = 1000;
        let pageOffset = 0;
        const rows: unknown[] = [];
        while (true) {
          const { data, error } = await supabase
            .from(table)
            .select("*")
            .eq("tenant_id", tenant.tenant_id)
            .range(pageOffset, pageOffset + pageSize - 1);
          if (error) throw new Error(`${table}: ${error.message}`);
          const page = data ?? [];
          rows.push(...page);
          if (page.length < pageSize) break;
          pageOffset += pageSize;
        }
        backup[table] = rows;
      }
      const stamp = new Date().toISOString().replaceAll(":", "-").replace(/\..+/, "");
      const base = `exportacion-${tenant.tenant_slug}-${stamp}`;
      if (format === "json")
        downloadText(
          JSON.stringify(
            { exported_at: new Date().toISOString(), tenant, tables: backup },
            null,
            2,
          ),
          `${base}.json`,
          "application/json",
        );
      if (format === "sql")
        downloadText(
          buildTenantBackupSql(backup, tenant.tenant_id, new Date().toISOString()),
          `${base}.sql`,
          "application/sql",
        );
      if (format === "excel") {
        const rows = Object.entries(backup).flatMap(([table, records]) =>
          (records as Record<string, unknown>[]).map((record) => ({
            table,
            ...Object.fromEntries(
              Object.entries(record).map(([key, value]) => [
                key,
                typeof value === "object" ? JSON.stringify(value) : value,
              ]),
            ),
          })),
        );
        await ExportService.toExcel(rows, "Respaldo", `${base}.xlsx`);
      }
      if (format === "pdf") {
        const rows = Object.entries(backup).map(([table, records]) => [table, records.length]);
        await ExportService.toPdf(
          `Exportación de datos · ${tenant.tenant_name}`,
          ["Tabla", "Registros"],
          rows,
          `${base}.pdf`,
          "Exportación tenant-scoped desde Dev Team",
        );
      }
      await audit({
        action: "saas.tenant.backup_export",
        entity: "tenant",
        entity_id: tenant.tenant_id,
        entity_label: tenant.tenant_name,
        tenant_id: tenant.tenant_id,
        details: {
          format,
          tables: Object.keys(backup),
          record_counts: Object.fromEntries(
            Object.entries(backup).map(([table, records]) => [table, records.length]),
          ),
        },
      });
      setMessage(`Exportación ${format.toUpperCase()} generada para ${tenant.tenant_name}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo generar el respaldo.");
    } finally {
      setBackupLoading(null);
    }
  }

  async function createCartera() {
    const tenantId = window.prompt(
      `ID de empresa para vincular (${tenants.map((t) => `${t.tenant_name}: ${t.tenant_id}`).join("\n")}):`,
    );
    if (!tenantId || !tenants.some((t) => t.tenant_id === tenantId.trim())) {
      setMessage("Selecciona un tenant_id válido de la lista de empresas.");
      return;
    }
    const amount = Number(window.prompt("Monto mensual sin IVA:", "0") ?? "0");
    const iva = Number(window.prompt("IVA:", String(Math.round(amount * 0.19))) ?? "0");
    const date = window.prompt("Próxima fecha de pago (YYYY-MM-DD):");
    const notes = window.prompt("Notas de cartera:", "") ?? "";
    setBusy(true);
    const { error } = await supabase.from("saas_customer_accounts").insert({
      tenant_id: tenantId.trim(),
      monthly_amount: amount,
      iva_amount: iva,
      next_payment_date: date || null,
      notes,
      payment_status: "pending",
    });
    setMessage(error?.message ?? "Cuenta de cartera creada y vinculada a la empresa.");
    if (!error) {
      const { data } = await supabase
        .from("saas_customer_accounts")
        .select(CARTERA_COLUMNS)
        .order("next_payment_date");
      setCartera((data ?? []) as typeof cartera);
    }
    setBusy(false);
  }

  function openCarteraForm(account?: (typeof cartera)[number]) {
    const amount = account?.monthly_amount ?? 0;
    setCarteraForm({
      id: account?.id,
      tenant_id: account?.tenant_id ?? tenants[0]?.tenant_id ?? "",
      payment_status: account?.payment_status ?? "pending",
      next_payment_date:
        account?.next_payment_date ?? toLocalDateString(addCalendarDays(new Date(), 30)),
      monthly_amount: String(amount),
      iva_amount: String(account?.iva_amount ?? Math.round(Number(amount) * 0.19)),
      notes: account?.notes ?? "",
      company_rut: account?.company_rut ?? "",
      legal_representative_name: account?.legal_representative_name ?? "",
      legal_representative_rut: account?.legal_representative_rut ?? "",
      billing_email: account?.billing_email ?? "",
      billing_phone: account?.billing_phone ?? "",
      billing_address: account?.billing_address ?? "",
      payment_day: account?.payment_day ? String(account.payment_day) : "",
    });
  }

  async function saveCarteraForm() {
    if (!carteraForm?.tenant_id) {
      setMessage("Selecciona la empresa que quedará vinculada.");
      return;
    }
    const monthly = Number(carteraForm.monthly_amount);
    const iva = Number(carteraForm.iva_amount);
    if (!Number.isFinite(monthly) || monthly < 0 || !Number.isFinite(iva) || iva < 0) {
      setMessage("Ingresa montos válidos.");
      return;
    }
    setBusy(true);
    const payload = {
      tenant_id: carteraForm.tenant_id,
      monthly_amount: monthly,
      iva_amount: iva,
      next_payment_date: carteraForm.next_payment_date || null,
      payment_status: carteraForm.payment_status,
      notes: carteraForm.notes.trim() || null,
      company_rut: carteraForm.company_rut.trim() || null,
      legal_representative_name: carteraForm.legal_representative_name.trim() || null,
      legal_representative_rut: carteraForm.legal_representative_rut.trim() || null,
      billing_email: carteraForm.billing_email.trim() || null,
      billing_phone: carteraForm.billing_phone.trim() || null,
      billing_address: carteraForm.billing_address.trim() || null,
      payment_day: carteraForm.payment_day ? Number(carteraForm.payment_day) : null,
      updated_at: new Date().toISOString(),
    };
    const query = carteraForm.id
      ? supabase.from("saas_customer_accounts").update(payload).eq("id", carteraForm.id)
      : supabase.from("saas_customer_accounts").insert(payload);
    const { data, error } = await query.select(CARTERA_COLUMNS).maybeSingle();
    if (error) setMessage(`No se pudo guardar: ${error.message}`);
    else if (data) {
      const saved = data as (typeof cartera)[number];
      setCartera((rows) =>
        carteraForm.id ? rows.map((row) => (row.id === saved.id ? saved : row)) : [...rows, saved],
      );
      setMessage(carteraForm.id ? "Cuenta actualizada." : "Cliente vinculado y calendario creado.");
      setCarteraForm(null);
    }
    setBusy(false);
  }

  async function generateBillingNotice(account: (typeof cartera)[number]) {
    const tenant = tenants.find((item) => item.tenant_id === account.tenant_id);
    if (!tenant) {
      setMessage("No se encontró la empresa vinculada a esta cuenta.");
      return;
    }
    const issueDate = new Date();
    const periodStart = new Date(issueDate.getFullYear(), issueDate.getMonth(), 1);
    const periodEnd = new Date(issueDate.getFullYear(), issueDate.getMonth() + 1, 0);
    const dueDate = account.next_payment_date ?? toLocalDateString(addCalendarDays(issueDate, 30));
    const net = Number(account.monthly_amount ?? 0);
    const tax = Number(account.iva_amount ?? Math.round(net * 0.19));
    const total = net + tax;
    const folio = `AV-${issueDate.getFullYear()}-${String(Date.now()).slice(-6)}`;
    const payload = {
      tenant_id: account.tenant_id,
      account_id: account.id,
      folio,
      period_start: toLocalDateString(periodStart),
      period_end: toLocalDateString(periodEnd),
      issue_date: toLocalDateString(issueDate),
      due_date: dueDate,
      status: "pending",
      description: "Servicio SaaS y soporte mensual",
      net_amount: net,
      tax_rate: 0.19,
      tax_amount: tax,
      total_amount: total,
      recipient_name: tenant.tenant_name,
      recipient_rut: account.company_rut,
      recipient_email: account.billing_email,
      notes: account.notes,
      metadata: {
        company_rut: account.company_rut,
        legal_representative_name: account.legal_representative_name,
        legal_representative_rut: account.legal_representative_rut,
        billing_phone: account.billing_phone,
        billing_address: account.billing_address,
        source: "saas_cartera",
      },
    };
    setBusy(true);
    const { data, error } = await supabase
      .from("saas_billing_notices")
      .insert(payload)
      .select(BILLING_NOTICE_COLUMNS)
      .single();
    if (error) {
      setMessage(`No se pudo crear el aviso: ${error.message}`);
      setBusy(false);
      return;
    }
    const notice = data as SaasBillingNotice;
    await ExportService.toPdf(
      `AVISO DE COBRO ${notice.folio}`,
      ["Concepto", "Detalle"],
      [
        ["Cliente", tenant.tenant_name],
        ["RUT", account.company_rut || "Pendiente de completar"],
        ["Representante legal", account.legal_representative_name || "Pendiente de completar"],
        ["RUT representante", account.legal_representative_rut || "Pendiente de completar"],
        [
          "Período",
          `${formatShortDate(payload.period_start)} al ${formatShortDate(payload.period_end)}`,
        ],
        ["Vencimiento", formatShortDate(payload.due_date)],
        ["Servicio", payload.description],
        ["Neto", formatClp(net)],
        ["IVA (19%)", formatClp(tax)],
        ["Total", formatClp(total)],
      ],
      `${notice.folio}-${tenant.tenant_slug}.pdf`,
      "Documento preliminar de cobro SaaS. No constituye por sí solo una factura electrónica o DTE.",
    );
    await supabase
      .from("saas_billing_notices")
      .update({ pdf_generated_at: new Date().toISOString() })
      .eq("id", notice.id);
    setBillingNotices((rows) => [
      { ...notice, pdf_generated_at: new Date().toISOString() },
      ...rows,
    ]);
    setMessage(`Aviso ${notice.folio} generado en PDF. Revisa los datos antes de enviarlo.`);
    setBusy(false);
  }

  async function editCartera(account: (typeof cartera)[number]) {
    const tenantId =
      window.prompt("Empresa vinculada (tenant_id):", account.tenant_id) ?? account.tenant_id;
    const status =
      window.prompt("Estado: paid, pending, overdue o paused:", account.payment_status) ??
      account.payment_status;
    const date =
      window.prompt("Próxima fecha de pago (YYYY-MM-DD):", account.next_payment_date ?? "") ??
      account.next_payment_date;
    const notes = window.prompt("Notas:", account.notes ?? "") ?? account.notes;
    const { error } = await supabase
      .from("saas_customer_accounts")
      .update({
        tenant_id: tenantId.trim(),
        payment_status: status,
        next_payment_date: date || null,
        notes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", account.id);
    setMessage(error?.message ?? "Cuenta de cartera actualizada.");
    if (!error)
      setCartera((rows) =>
        rows.map((row) =>
          row.id === account.id
            ? {
                ...row,
                tenant_id: tenantId.trim(),
                payment_status: status,
                next_payment_date: date || null,
                notes,
              }
            : row,
        ),
      );
  }

  async function deleteCartera(account: (typeof cartera)[number]) {
    if (!window.confirm("¿Eliminar esta cuenta de cartera?")) return;
    const { error } = await supabase.from("saas_customer_accounts").delete().eq("id", account.id);
    setMessage(error?.message ?? "Cuenta de cartera eliminada.");
    if (!error) setCartera((rows) => rows.filter((row) => row.id !== account.id));
  }

  async function saveDevOperator() {
    if (!devTeamForm?.email.trim()) {
      setMessage("Ingresa el correo del desarrollador.");
      return;
    }
    setBusy(true);
    const email = devTeamForm.email.trim().toLowerCase();
    try {
      const { data: authData, error: authListError } = await callEdgeFunction<{
        auth_users: { email: string; banned: boolean }[];
      }>("admin-user-manage", { action: "list_users" });
      if (authListError) throw new Error(authListError);
      const authUser = authData?.auth_users?.find((user) => user.email.toLowerCase() === email);
      if (!authUser) {
        const { error } = await callEdgeFunction("admin-user-manage", {
          action: "create_user",
          email,
          role: "developer",
          ...(devTeamForm.password.trim() ? { password: devTeamForm.password.trim() } : {}),
          permissions: devTeamForm.permissions,
        });
        if (error) throw new Error(error);
      } else if (devTeamForm.password.trim()) {
        const { error } = await callEdgeFunction("admin-user-manage", {
          action: "set_password",
          email,
          password: devTeamForm.password.trim(),
        });
        if (error) throw new Error(error);
      }
      const authAction = devTeamForm.active ? "unban" : "ban";
      const { error: banError } = await callEdgeFunction("admin-user-manage", {
        action: authAction,
        email,
      });
      if (banError) throw new Error(banError);
      const { error } = await supabase.rpc("upsert_platform_operator", {
        _email: email,
        _permissions: devTeamForm.permissions,
        _tenant_ids: devTeamForm.tenant_ids,
        _active: devTeamForm.active,
      });
      if (error) throw error;
      setMessage(
        `${devTeamForm.active ? "Desarrollador provisionado/activado" : "Desarrollador suspendido"}. Memberships y permisos actualizados con auditoría.`,
      );
      setDevTeamForm(null);
      await load();
    } catch (error) {
      setMessage(authorizationErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  const navGroups = [
    {
      key: "home",
      label: "Inicio",
      icon: Activity,
      items: [{ key: "overview", label: "Resumen" }],
    },
    {
      key: "public-site",
      label: "Sitio público",
      icon: Globe2,
      items: [{ key: "main-landing", label: "Landing principal" }],
    },
    {
      key: "companies",
      label: "Empresas",
      icon: Container,
      items: [
        { key: "containers", label: "Directorio" },
        { key: "settings", label: "Planes y módulos" },
        { key: "branding", label: "Identidad visual" },
        { key: "landing", label: "Edición de landing" },
      ],
    },
    {
      key: "operations",
      label: "Operación",
      icon: Zap,
      items: [
        { key: "monitoring", label: "Monitoreo" },
        { key: "audit", label: "Auditoría" },
        { key: "portal", label: "Portales trabajadores" },
        { key: "backup", label: "Respaldos" },
      ],
    },
    {
      key: "access",
      label: "Equipo y acceso",
      icon: ShieldCheck,
      items: [
        { key: "devteam", label: "Equipo Dev" },
        { key: "captadores", label: "Captadores" },
      ],
    },
    {
      key: "billing",
      label: "Facturación",
      icon: WalletCards,
      items: [{ key: "cartera", label: "Cartera" }],
    },
    {
      key: "governance",
      label: "Gobierno de datos",
      icon: LockKeyhole,
      items: [{ key: "governance", label: "Gobierno de datos" }],
    },
  ] as const;
  const activeNavGroup =
    navGroups.find((group) => group.items.some((item) => item.key === activeSection)) ??
    navGroups[0];

  return (
    <div className="min-h-full bg-slate-50/70 px-3 py-4 sm:px-5 sm:py-6 lg:px-8">
      <div className="mx-auto max-w-[1480px] space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              title={`Empresas · ${tenants.length} instancias bajo gestión`}
              className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2 py-1.5 text-xs font-bold text-blue-800"
            >
              <Building2 size={14} />
              <SlidingNumber number={tenants.length} fromNumber={0} />
            </span>
            <span
              title={`Operativas · ${healthyCount} salud normal`}
              className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-xs font-bold text-emerald-800"
            >
              <CheckCircle2 size={14} />
              <SlidingNumber number={healthyCount} fromNumber={0} />
            </span>
            <span
              title={`Alertas · ${alertCount} requieren revisión`}
              className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs font-bold text-amber-800"
            >
              <AlertTriangle size={14} />
              <SlidingNumber number={alertCount} fromNumber={0} />
            </span>
            <span
              title={`Eventos · ${events.length} actividad de empresas`}
              className="flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-2 py-1.5 text-xs font-bold text-violet-800"
            >
              <Activity size={14} />
              <SlidingNumber number={events.length} fromNumber={0} />
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void load()}
            disabled={loading}
            className="bg-white"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Actualizar
            {lastRefresh ? ` · ${lastRefresh.toLocaleTimeString()}` : ""}
          </Button>
        </div>
        {message && (
          <div
            role="status"
            className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs font-medium text-blue-800"
          >
            {message}
          </div>
        )}
        <nav
          className="sticky top-0 z-10 rounded-2xl border border-slate-200 bg-white/95 p-1.5 shadow-sm backdrop-blur"
          aria-label="Secciones del control SaaS"
        >
          <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:flex">
            {navGroups.map(({ key, label, icon: Icon, items }) => (
              <button
                key={key}
                onClick={() => setActiveSection(items[0].key as typeof activeSection)}
                title={label}
                aria-label={label}
                className={`group flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 lg:flex-1 ${activeNavGroup.key === key ? "bg-slate-950 text-white shadow-sm" : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"}`}
              >
                <Icon size={14} />
                <span>{label}</span>
              </button>
            ))}
          </div>
          {activeNavGroup.items.length > 1 && (
            <div className="mt-1 flex gap-1 overflow-x-auto border-t border-slate-100 pt-1">
              {activeNavGroup.items.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setActiveSection(item.key as typeof activeSection)}
                  className={`min-h-10 shrink-0 rounded-lg px-3 py-2 text-[11px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${activeSection === item.key ? "bg-blue-50 text-blue-700" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </nav>

        {activeSection === "overview" && (
          <section className="space-y-5">
            <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-blue-600">
                      Centro de control
                    </p>
                    <h2 className="mt-1 text-xl font-black text-slate-950">
                      Salud de tu operación
                    </h2>
                    <p className="mt-1 max-w-xl text-sm text-slate-500">
                      Una vista rápida de lo que requiere atención. El directorio de empresas vive
                      en su propia sección.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveSection("containers")}
                    className="bg-white"
                  >
                    <Building2 size={14} /> Ver empresas
                  </Button>
                </div>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setActiveSection("containers")}
                    className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 text-left transition hover:border-emerald-300 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                  >
                    <div className="flex items-center justify-between text-emerald-700">
                      <span className="text-xs font-bold">Empresas operativas</span>
                      <CheckCircle2 size={17} />
                    </div>
                    <strong className="mt-2 block text-3xl font-black text-emerald-950">
                      {healthyCount}
                    </strong>
                    <span className="mt-1 block text-xs text-emerald-800/70">
                      deployment saludable o activo
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSection("monitoring")}
                    className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4 text-left transition hover:border-amber-300 hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                  >
                    <div className="flex items-center justify-between text-amber-700">
                      <span className="text-xs font-bold">Requieren revisión</span>
                      <AlertTriangle size={17} />
                    </div>
                    <strong className="mt-2 block text-3xl font-black text-amber-950">
                      {alertCount}
                    </strong>
                    <span className="mt-1 block text-xs text-amber-800/70">
                      errores, degradadas o detenidas
                    </span>
                  </button>
                </div>
              </div>
              <div className="rounded-3xl border border-blue-100 bg-blue-50/70 p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-blue-700">
                      Cobros próximos
                    </p>
                    <h2 className="mt-2 text-lg font-black text-slate-950">
                      {formatClp(
                        billingMetrics.upcoming.reduce(
                          (total, notice) => total + Number(notice.total_amount ?? 0),
                          0,
                        ),
                      )}
                    </h2>
                    <p className="mt-1 text-xs text-slate-600">
                      {billingMetrics.upcoming.length} aviso(s) vencen en los próximos 30 días.
                    </p>
                  </div>
                  <WalletCards size={19} className="text-blue-700" />
                </div>
                <div className="mt-4 space-y-2">
                  {billingMetrics.upcoming.slice(0, 3).map((notice) => {
                    const tenant = tenants.find((item) => item.tenant_id === notice.tenant_id);
                    return (
                      <div
                        key={notice.id}
                        className="flex items-center gap-2 rounded-xl border border-blue-100 bg-white/80 px-3 py-2"
                      >
                        <span className="min-w-0 flex-1 truncate text-[11px] font-bold text-slate-700">
                          {tenant?.tenant_name ?? notice.recipient_name ?? "Empresa"}
                        </span>
                        <span className="text-[10px] font-bold text-blue-700">
                          {formatShortDate(notice.due_date)}
                        </span>
                        <span className="text-[10px] font-black text-slate-900">
                          {formatClp(Number(notice.total_amount))}
                        </span>
                      </div>
                    );
                  })}
                  {billingMetrics.upcoming.length === 0 && (
                    <p className="rounded-xl border border-dashed border-blue-200 bg-white/60 p-3 text-[11px] text-slate-500">
                      No hay avisos próximos. Genera el primero desde Cartera.
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setActiveSection("cartera")}
                  className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700"
                >
                  Administrar cartera <ChevronRight size={14} />
                </button>
              </div>
            </div>
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-700">
                    Finanzas SaaS
                  </p>
                  <h2 className="mt-1 text-lg font-black text-slate-950">Proyección y cobranza</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Calculado con cartera y avisos persistidos. La proyección base supone que no hay
                    altas ni bajas nuevas.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveSection("cartera")}
                  className="text-xs font-bold text-blue-700 hover:text-blue-900"
                >
                  Ver cartera <ArrowUpRight size={13} className="inline" />
                </button>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                  <span className="text-[11px] font-bold text-slate-500">MRR bruto</span>
                  <strong className="mt-1 block text-xl font-black text-slate-950">
                    {formatClp(billingMetrics.monthlyGross)}
                  </strong>
                  <span className="mt-1 block text-[10px] text-slate-500">
                    {billingMetrics.activeAccounts} clientes recurrentes
                  </span>
                </div>
                <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                  <span className="text-[11px] font-bold text-blue-700">Proyección 90 días</span>
                  <strong className="mt-1 block text-xl font-black text-blue-950">
                    {formatClp(billingMetrics.projection90)}
                  </strong>
                  <span className="mt-1 block text-[10px] text-blue-800/70">
                    escenario base sin cambios
                  </span>
                </div>
                <div className="rounded-2xl border border-red-100 bg-red-50/60 p-4">
                  <span className="text-[11px] font-bold text-red-700">Cartera vencida</span>
                  <strong className="mt-1 block text-xl font-black text-red-950">
                    {formatClp(
                      billingMetrics.overdue.reduce(
                        (total, notice) => total + Number(notice.total_amount ?? 0),
                        0,
                      ),
                    )}
                  </strong>
                  <span className="mt-1 block text-[10px] text-red-800/70">
                    {billingMetrics.overdue.length} aviso(s) vencido(s)
                  </span>
                </div>
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
                  <span className="text-[11px] font-bold text-emerald-700">Tasa cobrada</span>
                  <strong className="mt-1 block text-xl font-black text-emerald-950">
                    {billingMetrics.collectionRate === null
                      ? "—"
                      : `${Math.round(billingMetrics.collectionRate * 100)}%`}
                  </strong>
                  <span className="mt-1 block text-[10px] text-emerald-800/70">
                    {billingMetrics.collectionRate === null
                      ? "sin avisos emitidos"
                      : `pagado acumulado ${formatClp(billingMetrics.paidTotal)}`}
                  </span>
                </div>
              </div>
            </section>
            <section className="rounded-3xl border border-violet-100 bg-violet-50/60 p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 text-white">
                    <LockKeyhole size={18} />
                  </span>
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-violet-700">
                      Gobierno de datos
                    </p>
                    <h2 className="mt-1 text-lg font-black text-slate-950">
                      Inventario, consumo y riesgo por empresa
                    </h2>
                    <p className="mt-1 max-w-2xl text-xs text-slate-600">
                      Registra qué datos custodias, quién está autorizado, qué debe conservarse y
                      qué solicitudes requieren revisión. Las métricas sin snapshot se mostrarán
                      como pendientes, no como valores inventados.
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveSection("governance")}
                  className="border-violet-200 bg-white"
                >
                  Abrir gobierno <ArrowUpRight size={13} />
                </Button>
              </div>
            </section>
            <section className="rounded-3xl border border-cyan-100 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-cyan-700">
                    Capacidad de base de datos
                  </p>
                  <h2 className="mt-1 text-lg font-black text-slate-950">
                    Uso de almacenamiento por empresa
                  </h2>
                  <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500">
                    Se muestra el snapshot lógico calculado por empresa desde
                    <code> saas_tenant_usage_daily</code>. Supabase Free mantiene una cuota
                    compartida de 500 MB por proyecto; las cuotas por empresa son asignaciones
                    internas para comparar volumen y preparar futuros planes.
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => void load()}>
                  <RefreshCw size={14} /> Actualizar
                </Button>
              </div>
              <div className="mt-5 grid gap-3 lg:grid-cols-2">
                {storageByTenant.map(({ tenant, latest, usedBytes, limitBytes, percentage }) => {
                  const danger = percentage !== null && percentage >= 90;
                  const warning = percentage !== null && percentage >= 75;
                  const breakdown = Object.entries(latest?.usage_breakdown ?? {})
                    .sort(([, left], [, right]) => Number(right.bytes) - Number(left.bytes))
                    .slice(0, 6);
                  return (
                    <div key={tenant.tenant_id} className="rounded-2xl border border-slate-200 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-black text-slate-900">
                            {tenant.tenant_name}
                          </h3>
                          <p className="mt-1 text-[10px] text-slate-500">
                            Snapshot: {latest?.usage_date ?? "Pendiente de sincronización"}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2 py-1 text-[10px] font-black ${danger ? "bg-red-100 text-red-800" : warning ? "bg-amber-100 text-amber-800" : limitBytes ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}
                        >
                          {danger
                            ? "Crítico"
                            : warning
                              ? "Vigilar"
                              : limitBytes
                                ? "Normal"
                                : "Cuota pendiente"}
                        </span>
                      </div>
                      <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                        <div className="rounded-xl bg-cyan-50 p-3">
                          <span className="block text-[10px] font-bold text-cyan-700">Usado</span>
                          <strong className="mt-1 block text-base font-black text-cyan-950">
                            {formatBytes(usedBytes)}
                          </strong>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-3">
                          <span className="block text-[10px] font-bold text-slate-500">
                            Asignación de plan
                          </span>
                          <strong className="mt-1 block text-base font-black text-slate-900">
                            {limitBytes ? formatBytes(limitBytes) : "No configurada"}
                          </strong>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-3">
                          <span className="block text-[10px] font-bold text-slate-500">
                            Ocupación
                          </span>
                          <strong className="mt-1 block text-base font-black text-slate-900">
                            {percentage === null ? "—" : `${percentage.toFixed(1)}%`}
                          </strong>
                        </div>
                      </div>
                      <p className="mt-3 text-[11px] text-slate-500">
                        {Number(latest?.records_count ?? 0).toLocaleString("es-CL")} registros ·{" "}
                        {Number(latest?.files_count ?? 0).toLocaleString("es-CL")} archivos lógicos
                      </p>
                      <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                            Uso por tipo
                          </span>
                          <span className="text-[10px] font-semibold text-slate-400">
                            widget de capacidad
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                          {breakdown.map(([tableName, usage]) => (
                            <div
                              key={tableName}
                              className="rounded-xl border border-white bg-white p-2.5 shadow-sm"
                            >
                              <span className="block truncate text-[10px] font-bold text-slate-600">
                                {formatUsageLabel(tableName)}
                              </span>
                              <strong className="mt-1 block text-sm font-black text-slate-950">
                                {formatBytes(Number(usage.bytes))}
                              </strong>
                              <span className="text-[9px] text-slate-400">
                                {Number(usage.records).toLocaleString("es-CL")} registros
                              </span>
                            </div>
                          ))}
                        </div>
                        {breakdown.length === 0 && (
                          <p className="text-[10px] text-slate-400">
                            Desglose pendiente de sincronización.
                          </p>
                        )}
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${danger ? "bg-red-500" : warning ? "bg-amber-500" : "bg-cyan-500"}`}
                          style={{ width: `${Math.min(percentage ?? 0, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                {storageByTenant.length === 0 && (
                  <p className="rounded-xl border border-dashed border-cyan-200 bg-cyan-50/50 p-4 text-xs text-slate-500 lg:col-span-2">
                    No hay empresas activas para mostrar.
                  </p>
                )}
              </div>
            </section>
            <div className="grid gap-5 xl:grid-cols-2">
              <section className="overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-blue-100 bg-blue-50/60 px-5 py-4">
                  <div>
                    <div className="flex items-center gap-2 text-blue-700">
                      <MessageSquare size={16} />
                      <h2 className="text-sm font-black text-slate-900">Avisos internos</h2>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Publica comunicaciones por empresa y ve si ya fueron leídas.
                    </p>
                  </div>
                  <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-black text-amber-800">
                    {unreadNotifications} sin leer
                  </span>
                </div>
                <div className="space-y-3 p-5">
                  <label className="block text-xs font-bold text-slate-700">
                    Empresa destinataria
                    <select
                      value={communicationTargetId}
                      onChange={(event) => setCommunicationTenantId(event.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs"
                    >
                      {liveTenants.map((tenant) => (
                        <option key={tenant.tenant_id} value={tenant.tenant_id}>
                          {tenant.tenant_name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setNotificationForm({
                        tenant_id: communicationTargetId,
                        template_key: "announcement",
                        title: "",
                        priority: "normal",
                        message: "",
                      })
                    }
                    disabled={!communicationTargetId}
                    className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Bell size={14} /> Nuevo aviso para esta empresa
                  </button>
                  <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100">
                    {internalNotifications
                      .filter((notification) => notification.tenant_id === communicationTargetId)
                      .slice(0, 4)
                      .map((notification) => (
                        <div key={notification.id} className="flex items-start gap-3 px-3 py-3">
                          <span
                            className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${notification.read_at ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}
                          >
                            {notification.read_at ? <Check size={14} /> : <Clock3 size={14} />}
                          </span>
                          <div className="min-w-0 flex-1">
                            <strong className="block truncate text-xs text-slate-800">
                              {notification.title}
                            </strong>
                            <p className="mt-1 line-clamp-2 text-[11px] text-slate-500">
                              {notification.message}
                            </p>
                            <span className="mt-1 block text-[10px] text-slate-400">
                              {notification.read_at
                                ? `Leído · ${formatShortDate(notification.read_at.slice(0, 10))}`
                                : "Pendiente de lectura"}
                            </span>
                          </div>
                        </div>
                      ))}
                    {!internalNotifications.some(
                      (notification) => notification.tenant_id === communicationTargetId,
                    ) && (
                      <p className="p-4 text-center text-[11px] text-slate-500">
                        Aún no hay avisos para esta empresa.
                      </p>
                    )}
                  </div>
                </div>
              </section>
              <section className="overflow-hidden rounded-3xl border border-violet-100 bg-white shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-violet-100 bg-violet-50/60 px-5 py-4">
                  <div>
                    <div className="flex items-center gap-2 text-violet-700">
                      <Link2 size={16} />
                      <h2 className="text-sm font-black text-slate-900">Contratos por empresa</h2>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Centraliza enlaces comerciales, vigencias y contraparte.
                    </p>
                  </div>
                  <span className="rounded-full bg-violet-100 px-2 py-1 text-[10px] font-black text-violet-800">
                    {activeContracts} activos
                  </span>
                </div>
                <div className="space-y-3 p-5">
                  <button
                    type="button"
                    onClick={() => openContractForm()}
                    disabled={!communicationTargetId}
                    className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-3 py-2 text-xs font-bold text-white hover:bg-violet-700 disabled:opacity-50"
                  >
                    <Plus size={14} /> Vincular contrato a la empresa seleccionada
                  </button>
                  <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100">
                    {contracts
                      .filter((contract) => contract.tenant_id === communicationTargetId)
                      .slice(0, 4)
                      .map((contract) => (
                        <div key={contract.id} className="flex items-center gap-3 px-3 py-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
                            <Link2 size={14} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <strong className="block truncate text-xs text-slate-800">
                              {contract.title}
                            </strong>
                            <span className="text-[10px] text-slate-500">
                              {contract.status === "active" ? "Activo" : contract.status} · vence{" "}
                              {formatShortDate(contract.expires_at)}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => openContractForm(contract)}
                            className="rounded-lg border border-slate-200 px-2 py-1.5 text-[10px] font-bold text-slate-600"
                          >
                            Editar
                          </button>
                          <a
                            href={contract.contract_url}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-lg border border-violet-200 p-2 text-violet-700"
                            aria-label={`Abrir ${contract.title}`}
                          >
                            <ExternalLink size={13} />
                          </a>
                        </div>
                      ))}
                    {!contracts.some(
                      (contract) => contract.tenant_id === communicationTargetId,
                    ) && (
                      <p className="p-4 text-center text-[11px] text-slate-500">
                        No hay contrato enlazado para esta empresa.
                      </p>
                    )}
                  </div>
                </div>
              </section>
            </div>
            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Zap size={16} className="text-amber-500" />
                    <h2 className="text-sm font-black text-slate-900">Estado por empresa</h2>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Señal basada en deployment, ciclo comercial y eventos operativos. Últimas 24
                    horas: {monitoringSummary.active24h} eventos.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveSection("monitoring")}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Abrir logs <ArrowUpRight size={13} />
                </button>
              </div>
              <div className="grid gap-3 border-b border-slate-100 bg-slate-50/60 p-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-emerald-100 bg-white p-3">
                  <span className="text-[11px] font-bold text-slate-500">Salud normal</span>
                  <strong className="mt-1 block text-2xl font-black text-emerald-700">
                    {monitoringSummary.healthy}
                  </strong>
                </div>
                <div className="rounded-2xl border border-amber-100 bg-white p-3">
                  <span className="text-[11px] font-bold text-slate-500">Requieren atención</span>
                  <strong className="mt-1 block text-2xl font-black text-amber-700">
                    {monitoringSummary.attention}
                  </strong>
                </div>
                <div className="rounded-2xl border border-red-100 bg-white p-3">
                  <span className="text-[11px] font-bold text-slate-500">Señales de error</span>
                  <strong className="mt-1 block text-2xl font-black text-red-700">
                    {monitoringSummary.errors}
                  </strong>
                </div>
              </div>
              <div className="divide-y divide-slate-100">
                {monitoringRows.map(({ tenant, latestEvent, recentCount, errorCount, status }) => (
                  <button
                    key={tenant.tenant_id}
                    type="button"
                    onClick={() => {
                      setSelectedId(tenant.tenant_id);
                      setActiveSection("monitoring");
                      setEventTenant(tenant.tenant_id);
                    }}
                    className="flex min-h-16 w-full items-center gap-3 px-5 py-3 text-left transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${status === "attention" ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"}`}
                    >
                      {status === "attention" ? (
                        <AlertTriangle size={16} />
                      ) : (
                        <CheckCircle2 size={16} />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <strong className="block truncate text-xs font-black text-slate-800">
                        {tenant.tenant_name}
                      </strong>
                      <span className="block truncate text-[11px] text-slate-500">
                        {latestEvent
                          ? `${latestEvent.action || latestEvent.entity_label || "Actividad registrada"} · ${new Date(latestEvent.created_at).toLocaleString()}`
                          : "Sin eventos registrados"}
                      </span>
                    </span>
                    <span className="hidden text-right text-[10px] text-slate-500 sm:block">
                      <strong className="block text-xs text-slate-700">{recentCount}</strong>{" "}
                      eventos / 24 h
                    </span>
                    {errorCount > 0 && (
                      <span className="rounded-full bg-red-50 px-2 py-1 text-[10px] font-bold text-red-700">
                        {errorCount} errores
                      </span>
                    )}
                    <span
                      className={`rounded-full px-2 py-1 text-[10px] font-bold ${status === "attention" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}
                    >
                      {status === "attention" ? "Revisar" : "Operativa"}
                    </span>
                    <ChevronRight size={15} className="shrink-0 text-slate-400" />
                  </button>
                ))}
              </div>
            </section>
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-black text-slate-900">Actividad reciente</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {events.length} eventos registrados en el control SaaS.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveSection("monitoring")}
                  className="text-xs font-bold text-blue-700 hover:text-blue-900"
                >
                  Ver monitoreo <ArrowUpRight size={13} className="inline" />
                </button>
              </div>
              {events.length === 0 ? (
                <p className="mt-5 rounded-2xl bg-slate-50 p-4 text-xs text-slate-500">
                  No hay actividad reciente para mostrar.
                </p>
              ) : (
                <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {events.slice(0, 6).map((event, index) => (
                    <div
                      key={`${event.created_at}-${index}`}
                      className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3"
                    >
                      <p className="truncate text-xs font-bold text-slate-800">
                        {event.entity_label || event.action || "Actividad registrada"}
                      </p>
                      <p className="mt-1 truncate text-[11px] text-slate-500">
                        {event.action || "Señal operativa"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </section>
        )}

        {activeSection === "governance" && (
          <DataGovernancePanel
            tenants={liveTenants.map((tenant) => ({
              tenant_id: tenant.tenant_id,
              tenant_name: tenant.tenant_name,
              plan_name: tenant.plan_name,
              max_users: tenant.max_users,
            }))}
          />
        )}

        {activeSection === "containers" && (
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-sm font-black text-slate-900">Directorio de empresas</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Selecciona una empresa para administrar acceso, suscripción y operación.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void createTenant()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700"
              >
                <Plus size={14} /> Nueva empresa
              </button>
            </div>
            <div className="flex gap-1 border-b border-slate-100 px-5 py-2">
              <button
                type="button"
                onClick={() => setShowTrash(false)}
                className={`rounded-lg px-3 py-1.5 text-[11px] font-bold ${!showTrash ? "bg-blue-50 text-blue-700" : "text-slate-500 hover:bg-slate-50"}`}
              >
                Empresas ({tenants.filter((t) => t.tenant_status !== "cortada").length})
              </button>
              <button
                type="button"
                onClick={() => setShowTrash(true)}
                className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-[11px] font-bold ${showTrash ? "bg-blue-50 text-blue-700" : "text-slate-500 hover:bg-slate-50"}`}
              >
                <Trash2 size={13} /> Papelera (
                {tenants.filter((t) => t.tenant_status === "cortada").length})
              </button>
            </div>
            <div className="divide-y divide-slate-100">
              {showTrash && !tenants.some((t) => t.tenant_status === "cortada") && (
                <p className="px-5 py-8 text-center text-xs text-slate-500">
                  La papelera está vacía.
                </p>
              )}
              {tenants
                .filter((t) => (t.tenant_status === "cortada") === showTrash)
                .map((tenant) => (
                  <div
                    key={tenant.tenant_id}
                    className="flex min-h-16 flex-wrap items-center gap-3 px-5 py-3"
                  >
                    <TenantAvatar tenant={tenant} branding={branding} size={40} />
                    <div className="min-w-[180px] flex-1">
                      <strong className="block text-sm text-slate-800">{tenant.tenant_name}</strong>
                      <span className="text-[11px] text-slate-500">
                        {tenant.tenant_slug} · {tenant.member_count} usuarios ·{" "}
                        {tenant.isolation_mode ?? "tenant"}
                      </span>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">
                      {tenant.plan_name ?? "Sin plan"}
                    </span>
                    <span
                      className={`rounded-full px-2 py-1 text-[10px] font-bold ring-1 ${statusTone(tenant.deployment_status)}`}
                    >
                      {tenant.deployment_status ?? "sin estado"}
                    </span>
                    <span
                      className={`rounded-full px-2 py-1 text-[10px] font-bold ring-1 ${tenantLifecycleTone(tenant.tenant_status)}`}
                    >
                      {tenantLifecycleLabel(tenant.tenant_status)}
                    </span>
                    <button
                      onClick={() => {
                        setSelectedId(tenant.tenant_id);
                        setActiveSection("settings");
                      }}
                      className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50"
                    >
                      Configurar
                    </button>
                    <button
                      onClick={() => openOnboarding(tenant)}
                      disabled={busy}
                      className="inline-flex items-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1.5 text-[11px] font-bold text-violet-700 hover:bg-violet-100 disabled:opacity-50"
                    >
                      <Mail size={13} /> Bienvenida
                    </button>
                    <button
                      onClick={() => openCloneTenant(tenant)}
                      disabled={busy}
                      title="Crear una empresa nueva con la misma configuración"
                      className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[11px] font-bold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                    >
                      <Copy size={13} /> Clonar
                    </button>
                    <button
                      onClick={() => void editTenant(tenant)}
                      disabled={busy}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    >
                      <Edit3 size={13} /> Editar
                    </button>
                    {!showTrash && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            void setTenantLifecycle(
                              tenant,
                              tenant.tenant_active ? "suspendida" : "activa",
                            )
                          }
                          disabled={busy}
                          title={
                            tenant.tenant_active
                              ? "Suspender sistema por impago o pausa manual"
                              : "Reactivar sistema y accesos de la empresa"
                          }
                          className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold disabled:opacity-50 ${tenant.tenant_active ? "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100" : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"}`}
                        >
                          {tenant.tenant_active ? (
                            <PauseCircle size={13} />
                          ) : (
                            <RotateCcw size={13} />
                          )}
                          {tenant.tenant_active ? "Pausar sistema" : "Reactivar sistema"}
                        </button>
                      </>
                    )}
                    {tenant.tenant_status === "cortada" ? (
                      <button
                        type="button"
                        onClick={() => void setTenantLifecycle(tenant, "activa")}
                        disabled={busy}
                        className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                      >
                        <RotateCcw size={13} /> Restaurar
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void setTenantLifecycle(tenant, "cortada")}
                        disabled={busy}
                        title="Mover a la papelera sin borrar datos"
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] font-bold text-red-700 hover:bg-red-100 disabled:opacity-50"
                      >
                        <Trash2 size={13} /> Mover a papelera
                      </button>
                    )}
                    <button
                      onClick={() => void enterCompany(tenant)}
                      disabled={busy || !tenant.tenant_active}
                      className="inline-flex min-w-[92px] items-center justify-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      {enteringTenantId === tenant.tenant_id ? (
                        <>
                          <Loader2 size={13} className="animate-spin" /> Entrando…
                        </>
                      ) : (
                        <>
                          <ArrowUpRight size={13} /> Entrar
                        </>
                      )}
                    </button>
                  </div>
                ))}
            </div>
          </section>
        )}

        {activeSection === "settings" && (
          <section className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(360px,1.1fr)]">
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="text-sm font-black text-slate-900">Planes y módulos</h2>
                <p className="mt-1 text-xs text-slate-500">
                  El plan define la base; las excepciones manuales se gestionan por separado.
                </p>
              </div>
              <div className="divide-y divide-slate-100">
                {liveTenants.map((tenant) => (
                  <button
                    key={tenant.tenant_id}
                    onClick={() => {
                      setSelectedId(tenant.tenant_id);
                      setDetailTenantId(tenant.tenant_id);
                    }}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left ${selected?.tenant_id === tenant.tenant_id ? "bg-blue-50" : "hover:bg-slate-50"}`}
                  >
                    <TenantAvatar tenant={tenant} branding={branding} size={36} />
                    <span className="min-w-0 flex-1">
                      <strong className="block truncate text-xs text-slate-800">
                        {tenant.tenant_name}
                      </strong>
                      <span className="text-[10px] text-slate-500">
                        {tenant.plan_name ?? "Sin plan"} · {tenant.member_count} usuarios
                      </span>
                    </span>
                    <ChevronRight size={15} className="text-slate-400" />
                  </button>
                ))}
              </div>
            </div>
            {selected && detailTenantId === selected.tenant_id ? (
              <Modal
                open={detailTenantId === selected.tenant_id}
                onClose={() => setDetailTenantId(null)}
                title={`Planes y módulos · ${selected.tenant_name}`}
                size="xl"
              >
                <div className="space-y-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <TenantAvatar tenant={selected} branding={branding} size={52} />
                      <div>
                        <h3 className="text-base font-black text-slate-900">
                          {selected.tenant_name}
                        </h3>
                        <p className="text-xs text-slate-500">
                          {selected.tenant_slug} · {selected.member_count} usuarios ·{" "}
                          {selected.isolation_mode ?? "Tenant"}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() =>
                          setNotificationForm({
                            tenant_id: selected.tenant_id,
                            template_key: "announcement",
                            title: "Aviso del desarrollador",
                            priority: "normal",
                            message: "",
                          })
                        }
                        className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[10px] font-bold text-blue-700 hover:bg-blue-100"
                      >
                        <Bell size={13} /> Avisar
                      </button>
                      <button
                        onClick={() => void editTenant(selected)}
                        disabled={busy}
                        className="rounded-lg p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-700"
                        aria-label="Editar empresa"
                      >
                        <Edit3 size={15} />
                      </button>
                      {selected.tenant_status === "activa" ? (
                        <>
                          <button
                            onClick={() => void setTenantLifecycle(selected, "suspendida")}
                            disabled={busy}
                            className="rounded-lg p-2 text-slate-400 hover:bg-amber-50 hover:text-amber-700"
                            aria-label="Suspender empresa"
                            title="Suspender acceso por impago"
                          >
                            <PauseCircle size={15} />
                          </button>
                          <button
                            onClick={() => void setTenantLifecycle(selected, "cortada")}
                            disabled={busy}
                            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            aria-label="Archivar empresa"
                            title="Archivar empresa sin borrar datos"
                          >
                            <Archive size={15} />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => void setTenantLifecycle(selected, "activa")}
                          disabled={busy}
                          className="rounded-lg p-2 text-slate-400 hover:bg-emerald-50 hover:text-emerald-700"
                          aria-label="Reactivar empresa"
                          title="Reactivar empresa"
                        >
                          <RotateCcw size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="mt-5">
                    <label className="mb-1.5 block text-xs font-bold text-slate-700">
                      Plan comercial
                    </label>
                    <Select
                      value={plans.find((p) => p.code === selected.plan_code)?.id ?? ""}
                      onChange={(e) => void assignPlan(e.target.value)}
                      disabled={busy}
                    >
                      {plans.map((plan) => (
                        <option
                          key={plan.id}
                          value={plan.id}
                          disabled={!isPersistedPlanId(plan.id)}
                        >
                          {plan.name}
                          {plan.max_users ? ` · ${plan.max_users} usuarios` : " · sin límite"}
                          {plan.storage_limit_bytes
                            ? ` · ${(Number(plan.storage_limit_bytes) / 1024 / 1024 / 1024).toFixed(plan.storage_limit_bytes < 1073741824 ? 0 : 1)} GB`
                            : " · cuota pendiente"}
                          {!isPersistedPlanId(plan.id) ? " · sólo vista previa" : ""}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="mt-5">
                    <div className="mb-2 flex items-center gap-2">
                      <SlidersHorizontal size={15} className="text-blue-600" />
                      <span className="text-xs font-bold text-slate-700">
                        Sidebar y módulos de la empresa
                      </span>
                    </div>
                    <p className="mb-3 text-[11px] leading-5 text-slate-500">
                      Activa u oculta cada módulo del menú lateral. Al desactivarlo también se
                      bloquea su acceso para esa empresa.
                    </p>
                    {Object.keys(overrides).length > 0 && (
                      <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-800">
                        Las etiquetas “excepción manual” prevalecen sobre el plan y se conservan al
                        cambiarlo.
                      </p>
                    )}
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {featureKeys.map((key) => {
                        const base =
                          selectedPlan?.feature_keys?.["*"] === true ||
                          selectedPlan?.feature_keys?.[key] === true;
                        const effective = overrides[key] ?? base;
                        return (
                          <div
                            key={key}
                            className={`flex min-h-14 items-center justify-between gap-3 rounded-xl border px-3 py-2.5 transition ${effective ? "border-emerald-200 bg-emerald-50/70" : "border-slate-200 bg-slate-50"}`}
                          >
                            <div className="min-w-0 text-left">
                              <p
                                className={`truncate text-xs font-semibold ${effective ? "text-emerald-900" : "text-slate-600"}`}
                              >
                                {FEATURE_LABELS[key]}
                              </p>
                              <p className="mt-0.5 text-[10px] font-medium text-slate-500">
                                {overrides[key] !== undefined
                                  ? "Excepción manual"
                                  : effective
                                    ? "Incluido en el plan"
                                    : "No incluido en el plan"}
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              <span
                                className={`w-12 text-right text-[10px] font-bold ${effective ? "text-emerald-700" : "text-slate-500"}`}
                              >
                                {effective ? "Activo" : "Inactivo"}
                              </span>
                              <Switch
                                checked={effective}
                                disabled={busy}
                                onCheckedChange={() => void toggleOverride(key)}
                                aria-label={`${effective ? "Desactivar" : "Activar"} ${FEATURE_LABELS[key]}`}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </Modal>
            ) : null}
          </section>
        )}
        {activeSection === "backup" && (
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-sm font-black text-slate-900">Respaldos por empresa</h2>
              <p className="mt-1 text-xs text-slate-500">
                Selecciona una empresa y exporta sólo sus datos tenant-scoped. Cada exportación
                queda auditada.
              </p>
            </div>
            <div className="divide-y divide-slate-100">
              {liveTenants.map((tenant) => (
                <div
                  key={tenant.tenant_id}
                  className={`flex flex-wrap items-center gap-3 px-5 py-4 ${selected?.tenant_id === tenant.tenant_id ? "bg-blue-50/50" : ""}`}
                >
                  <div className="min-w-[220px] flex-1">
                    <strong className="block text-sm text-slate-800">{tenant.tenant_name}</strong>
                    <span className="text-[10px] text-slate-500">
                      {tenant.tenant_slug} · {tenant.member_count} usuarios
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedId(tenant.tenant_id)}
                    className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-white"
                  >
                    Seleccionar
                  </button>
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      [
                        ["json", "JSON", FileJson],
                        ["sql", "SQL", FileText],
                        ["excel", "Excel", FileSpreadsheet],
                        ["pdf", "PDF", FileText],
                      ] as const
                    ).map(([format, label, Icon]) => (
                      <button
                        key={format}
                        type="button"
                        onClick={() => void exportTenantBackup(tenant, format)}
                        disabled={backupLoading !== null}
                        className="inline-flex items-center gap-1 rounded-lg border border-blue-200 px-2.5 py-1.5 text-[10px] font-bold text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                      >
                        <Icon size={12} />
                        {backupLoading === `${tenant.tenant_id}:${format}` ? "Generando…" : label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeSection === "main-landing" && (
          <section className="space-y-5">
            <SaasLandingEditor />
            <PublicLandingSettingsEditor />
          </section>
        )}

        {activeSection === "landing" && (
          <section className="space-y-5">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-blue-600">
                    Editor público
                  </p>
                  <h2 className="mt-1 text-xl font-black text-slate-950">Edición de landing</h2>
                  <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                    Controla los recursos visuales que se propagan a la landing principal y al
                    acceso de cada empresa. Los enlaces se guardan en la identidad visual activa.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLandingPreview((visible) => !visible)}
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                >
                  <Eye size={15} aria-hidden="true" />
                  {showLandingPreview ? "Ocultar vista previa" : "Previsualizar landing"}
                </button>
              </div>
            </div>
            <div className="grid gap-5 lg:grid-cols-[minmax(220px,0.7fr)_minmax(0,1.3fr)]">
              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-5 py-4">
                  <h3 className="text-sm font-black text-slate-900">Empresa</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Selecciona el contexto que quieres editar.
                  </p>
                </div>
                <div className="divide-y divide-slate-100">
                  {visibleBranding.map((item) => (
                    <button
                      key={item.tenant_id}
                      type="button"
                      onClick={() => setBrandingTenantId(item.tenant_id)}
                      className={`flex w-full items-center gap-3 px-4 py-3 text-left ${selectedBranding?.tenant_id === item.tenant_id ? "bg-blue-50" : "hover:bg-slate-50"}`}
                    >
                      <CompanyIdentityAvatar
                        name={item.tenant_name}
                        logoUrl={item.logo_url}
                        size={36}
                      />
                      <span className="min-w-0 flex-1">
                        <strong className="block truncate text-xs text-slate-800">
                          {item.tenant_name}
                        </strong>
                        <span className="text-[10px] text-slate-500">
                          {item.landing_enabled === false
                            ? "Landing desactivada"
                            : "Landing activa"}
                        </span>
                      </span>
                      <ChevronRight size={15} className="text-slate-400" />
                    </button>
                  ))}
                </div>
              </div>
              {selectedBranding ? (
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                    <CompanyIdentityAvatar
                      name={selectedBranding.tenant_name}
                      logoUrl={selectedBranding.logo_url}
                      size={48}
                    />
                    <div>
                      <h3 className="text-base font-black text-slate-900">
                        {selectedBranding.tenant_name}
                      </h3>
                      <p className="text-xs text-slate-500">
                        Recursos visuales de la landing pública
                      </p>
                    </div>
                  </div>
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <label className="block text-xs font-bold text-slate-700 md:col-span-2">
                      Título principal de la landing
                      <input
                        value={selectedBranding.visual_assets?.landing?.hero_title ?? ""}
                        maxLength={160}
                        placeholder="Software multiempresa de RR. HH. y operaciones"
                        onChange={(e) =>
                          setBranding((rows) =>
                            rows.map((row) =>
                              row.tenant_id === selectedBranding.tenant_id
                                ? {
                                    ...row,
                                    visual_assets: {
                                      ...(row.visual_assets ?? {}),
                                      landing: {
                                        ...(row.visual_assets?.landing ?? {}),
                                        hero_title: e.target.value,
                                      },
                                    },
                                  }
                                : row,
                            ),
                          )
                        }
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="block text-xs font-bold text-slate-700 md:col-span-2">
                      Descripción principal de la landing
                      <textarea
                        value={selectedBranding.visual_assets?.landing?.hero_description ?? ""}
                        maxLength={400}
                        rows={3}
                        placeholder="Administra personas, asistencia, turnos, prevención, documentos y procesos internos desde una plataforma SaaS."
                        onChange={(e) =>
                          setBranding((rows) =>
                            rows.map((row) =>
                              row.tenant_id === selectedBranding.tenant_id
                                ? {
                                    ...row,
                                    visual_assets: {
                                      ...(row.visual_assets ?? {}),
                                      landing: {
                                        ...(row.visual_assets?.landing ?? {}),
                                        hero_description: e.target.value,
                                      },
                                    },
                                  }
                                : row,
                            ),
                          )
                        }
                        className="mt-1 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm leading-6"
                      />
                    </label>
                    {(
                      [
                        ["favicon_url", "Favicon del sitio", "https://.../favicon.png"],
                        ["header_image_url", "Imagen del header", "https://.../header.jpg"],
                        ["hero_image_url", "Imagen del hero", "https://.../hero.jpg"],
                      ] as const
                    ).map(([key, label, placeholder]) => (
                      <label key={key} className="block text-xs font-bold text-slate-700">
                        {label}
                        <input
                          type="url"
                          value={selectedBranding.visual_assets?.[key] ?? ""}
                          onChange={(e) =>
                            setBranding((rows) =>
                              rows.map((row) =>
                                row.tenant_id === selectedBranding.tenant_id
                                  ? {
                                      ...row,
                                      visual_assets: {
                                        ...(row.visual_assets ?? {}),
                                        [key]: e.target.value,
                                      },
                                    }
                                  : row,
                              ),
                            )
                          }
                          placeholder={placeholder}
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                        />
                      </label>
                    ))}
                  </div>
                  <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
                    <h4 className="text-xs font-black text-slate-800">Iconos propagados</h4>
                    <p className="mt-1 text-[11px] leading-5 text-slate-500">
                      Cada URL reemplaza el icono de respaldo en el componente indicado; si queda
                      vacío se mantiene el icono del sistema.
                    </p>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      {(
                        [
                          ["brand", "Icono de marca / header"],
                          ["hero", "Icono del hero"],
                          ["feature", "Icono de beneficios"],
                          ["cta", "Icono de llamada a la acción"],
                        ] as const
                      ).map(([key, label]) => (
                        <label key={key} className="block text-xs font-bold text-slate-700">
                          {label}
                          <input
                            type="url"
                            value={selectedBranding.visual_assets?.icon_urls?.[key] ?? ""}
                            onChange={(e) =>
                              setBranding((rows) =>
                                rows.map((row) =>
                                  row.tenant_id === selectedBranding.tenant_id
                                    ? {
                                        ...row,
                                        visual_assets: {
                                          ...(row.visual_assets ?? {}),
                                          icon_urls: {
                                            ...(row.visual_assets?.icon_urls ?? {}),
                                            [key]: e.target.value,
                                          },
                                        },
                                      }
                                    : row,
                                ),
                              )
                            }
                            placeholder="https://.../icon.svg"
                            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                  <label className="mt-4 block text-xs font-bold text-slate-700">
                    Opacidad de la imagen hero
                    <div className="mt-1 flex items-center gap-3">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={selectedBranding.visual_assets?.hero_opacity ?? 0.8}
                        onChange={(e) =>
                          setBranding((rows) =>
                            rows.map((row) =>
                              row.tenant_id === selectedBranding.tenant_id
                                ? {
                                    ...row,
                                    visual_assets: {
                                      ...(row.visual_assets ?? {}),
                                      hero_opacity: Number(e.target.value),
                                    },
                                  }
                                : row,
                            ),
                          )
                        }
                        className="min-w-0 flex-1 accent-blue-600"
                      />
                      <span className="w-10 text-right font-mono text-[11px] text-slate-500">
                        {Math.round((selectedBranding.visual_assets?.hero_opacity ?? 0.8) * 100)}%
                      </span>
                    </div>
                  </label>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <label className="block text-xs font-bold text-slate-700">
                      Texto del botón principal
                      <input
                        value={
                          selectedBranding.visual_assets?.landing?.cta_label ??
                          selectedBranding.landing_cta_label ??
                          ""
                        }
                        maxLength={100}
                        onChange={(e) =>
                          setBranding((rows) =>
                            rows.map((row) =>
                              row.tenant_id === selectedBranding.tenant_id
                                ? {
                                    ...row,
                                    landing_cta_label: e.target.value,
                                    visual_assets: {
                                      ...(row.visual_assets ?? {}),
                                      landing: {
                                        ...(row.visual_assets?.landing ?? {}),
                                        cta_label: e.target.value,
                                      },
                                    },
                                  }
                                : row,
                            ),
                          )
                        }
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      />
                    </label>
                  </div>
                  <Button
                    className="mt-5"
                    onClick={() => void saveBranding()}
                    disabled={brandingSaving}
                  >
                    {brandingSaving ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <CheckCircle2 size={14} />
                    )}{" "}
                    Guardar edición de landing
                  </Button>
                </div>
              ) : (
                <div className="flex min-h-64 items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white text-sm text-slate-500">
                  No hay empresas con identidad visual disponible.
                </div>
              )}
            </div>
            {showLandingPreview && selectedBranding && (
              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">
                      Vista previa en tiempo real
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Muestra los cambios actuales del formulario. Todavía no se publican hasta
                      guardar.
                    </p>
                  </div>
                  <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700">
                    Borrador local
                  </span>
                </div>
                <div
                  className="relative min-h-[380px] overflow-hidden bg-slate-950 bg-cover bg-center px-6 py-8 text-white sm:px-10 sm:py-12"
                  style={{
                    backgroundImage: `linear-gradient(rgba(2,6,23,${selectedBranding.visual_assets?.hero_opacity ?? 0.8}),rgba(2,6,23,${selectedBranding.visual_assets?.hero_opacity ?? 0.8})), ${selectedBranding.visual_assets?.hero_image_url ? `url("${selectedBranding.visual_assets.hero_image_url}")` : "none"}`,
                  }}
                >
                  <div className="absolute inset-x-0 top-0 flex min-h-14 items-center border-b border-white/10 bg-slate-950/80 px-6 backdrop-blur-sm sm:px-10">
                    <span className="flex items-center gap-2 text-sm font-bold">
                      {selectedBranding.visual_assets?.icon_urls?.brand ? (
                        <img
                          src={selectedBranding.visual_assets.icon_urls.brand}
                          alt=""
                          className="h-7 w-7 rounded-lg object-cover"
                        />
                      ) : (
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600">
                          B
                        </span>
                      )}
                      {selectedBranding.company_name || selectedBranding.tenant_name}
                    </span>
                  </div>
                  <div className="relative z-10 mt-14 max-w-2xl">
                    {selectedBranding.visual_assets?.icon_urls?.hero && (
                      <img
                        src={selectedBranding.visual_assets.icon_urls.hero}
                        alt=""
                        className="mb-4 h-10 w-10 rounded-xl object-cover"
                      />
                    )}
                    <h4 className="text-3xl font-black leading-tight sm:text-4xl">
                      {selectedBranding.visual_assets?.landing?.hero_title ||
                        "Software multiempresa de RR. HH. y operaciones"}
                    </h4>
                    <p className="mt-4 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">
                      {selectedBranding.visual_assets?.landing?.hero_description ||
                        "Administra personas, asistencia, turnos, prevención, documentos y procesos internos desde una plataforma SaaS. Configura módulos, permisos e identidad para cada empresa."}
                    </p>
                    <div className="mt-6 flex flex-wrap gap-3">
                      <span className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-xs font-bold">
                        {selectedBranding.visual_assets?.landing?.cta_label ||
                          selectedBranding.landing_cta_label ||
                          "Solicitar una demo"}
                        <ArrowUpRight size={14} aria-hidden="true" />
                      </span>
                      <span className="inline-flex min-h-10 items-center rounded-xl border border-white/20 px-4 py-2 text-xs font-semibold text-white/85">
                        Acceso trabajador
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}
        {activeSection === "branding" && (
          <section className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(360px,1.1fr)]">
            <HeroImagesEditor />
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="text-sm font-black text-slate-900">Identidad visual por empresa</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Personaliza el panel y el portal de cada empresa, incluido Dev Team.
                </p>
              </div>
              <div className="divide-y divide-slate-100">
                {visibleBranding.map((item) => (
                  <button
                    key={item.tenant_id}
                    onClick={() => setBrandingTenantId(item.tenant_id)}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left ${selectedBranding?.tenant_id === item.tenant_id ? "bg-blue-50" : "hover:bg-slate-50"}`}
                  >
                    <CompanyIdentityAvatar
                      name={item.tenant_name}
                      logoUrl={item.logo_url}
                      size={36}
                    />
                    <span className="min-w-0 flex-1">
                      <strong className="block truncate text-xs text-slate-800">
                        {item.tenant_name}
                      </strong>
                      <span className="text-[10px] text-slate-500">
                        {item.company_name || "Sin nombre configurado"}
                      </span>
                    </span>
                    <ChevronRight size={15} className="text-slate-400" />
                  </button>
                ))}
              </div>
            </div>
            {selectedBranding ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <CompanyIdentityAvatar
                    name={selectedBranding.tenant_name}
                    logoUrl={selectedBranding.logo_url}
                    size={56}
                  />
                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      {selectedBranding.tenant_name}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Logo, paleta y nombre aplicados a su panel
                    </p>
                  </div>
                </div>
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h4 className="text-xs font-bold text-slate-700">Vista previa del panel</h4>
                    <span className="text-[10px] text-slate-500">Se actualiza al editar</span>
                  </div>
                  <div className="flex min-h-36 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white">
                    {navigationLayout === "sidebar" ? (
                      <div className="flex min-h-36">
                        <div
                          className="w-[42%] shrink-0 border-r border-white/10 p-2 text-white"
                          style={{ backgroundColor: `rgba(15, 23, 42, ${navigationOpacity})` }}
                        >
                          <div className="mb-3 flex min-w-0 items-center gap-1.5">
                            <CompanyIdentityAvatar
                              name={selectedBranding.company_name || selectedBranding.tenant_name}
                              logoUrl={selectedBranding.logo_url}
                              size={24}
                            />
                            <span className="truncate text-[10px] font-bold">
                              {selectedBranding.company_name || selectedBranding.tenant_name}
                            </span>
                          </div>
                          {(["Dashboard", "Trabajadores", "Configuración"] as const).map(
                            (label, index) => (
                              <div
                                key={label}
                                className="mb-1 truncate rounded-md px-2 py-1.5 text-[10px]"
                                style={
                                  index === 0
                                    ? {
                                        backgroundColor: getBrandingPreviewColor(
                                          selectedBranding.color_theme,
                                        ),
                                        color: "#fff",
                                      }
                                    : { color: "#cbd5e1" }
                                }
                              >
                                {label}
                              </div>
                            ),
                          )}
                        </div>
                        <div className="min-w-0 flex-1 p-3">
                          <p className="truncate text-[10px] text-slate-500">
                            {selectedBranding.company_name || selectedBranding.tenant_name}
                          </p>
                          <p className="mt-2 text-xs font-bold text-slate-800">Panel de empresa</p>
                          <div
                            className="mt-3 inline-flex rounded-md px-2.5 py-1 text-[10px] font-semibold text-white"
                            style={{
                              backgroundColor: getBrandingPreviewColor(
                                selectedBranding.color_theme,
                              ),
                            }}
                          >
                            Acción principal
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="min-h-24 flex-1 p-3">
                          <div className="flex items-center gap-1.5">
                            <CompanyIdentityAvatar
                              name={selectedBranding.company_name || selectedBranding.tenant_name}
                              logoUrl={selectedBranding.logo_url}
                              size={24}
                            />
                            <span className="truncate text-[10px] text-slate-500">
                              {selectedBranding.company_name || selectedBranding.tenant_name}
                            </span>
                          </div>
                          <p className="mt-2 text-xs font-bold text-slate-800">Panel de empresa</p>
                        </div>
                        <nav
                          aria-label="Vista previa del bottom navbar"
                          className="flex h-12 items-center justify-around border-t border-white/10 text-[9px] text-slate-200"
                          style={{
                            backgroundColor: `rgba(15, 23, 42, ${navigationOpacity})`,
                          }}
                        >
                          {(["Dashboard", "Trabajadores", "Configuración"] as const).map(
                            (label, index) => (
                              <span
                                key={label}
                                className="rounded px-2 py-1"
                                style={
                                  index === 0
                                    ? {
                                        backgroundColor: getBrandingPreviewColor(
                                          selectedBranding.color_theme,
                                        ),
                                        color: "#fff",
                                      }
                                    : undefined
                                }
                              >
                                {label}
                              </span>
                            ),
                          )}
                        </nav>
                      </>
                    )}
                  </div>
                </div>
                <div className="mt-5 space-y-3">
                  <label className="block text-xs font-bold text-slate-700">
                    Nombre visible
                    <input
                      value={selectedBranding.company_name}
                      onChange={(e) =>
                        setBranding((rows) =>
                          rows.map((row) =>
                            row.tenant_id === selectedBranding.tenant_id
                              ? { ...row, company_name: e.target.value }
                              : row,
                          ),
                        )
                      }
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block text-xs font-bold text-slate-700">
                    URL del logo
                    <input
                      value={selectedBranding.logo_url}
                      onChange={(e) =>
                        setBranding((rows) =>
                          rows.map((row) =>
                            row.tenant_id === selectedBranding.tenant_id
                              ? { ...row, logo_url: e.target.value }
                              : row,
                          ),
                        )
                      }
                      placeholder="https://..."
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    />
                  </label>
                  <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
                    <div className="mb-3">
                      <h4 className="text-xs font-black text-slate-800">Recursos visuales</h4>
                      <p className="mt-1 text-[11px] font-normal leading-5 text-slate-500">
                        Enlaza imágenes públicas por componente. Se guardan por empresa y se aplican
                        al entrar a su panel.
                      </p>
                    </div>
                    {(
                      [
                        ["favicon_url", "Favicon", "https://.../favicon.png"],
                        ["header_image_url", "Imagen del header", "https://.../header.jpg"],
                        ["hero_image_url", "Imagen del hero", "https://.../hero.jpg"],
                      ] as const
                    ).map(([key, label, placeholder]) => (
                      <label
                        key={key}
                        className="mb-3 block text-xs font-bold text-slate-700 last:mb-0"
                      >
                        {label}
                        <input
                          type="url"
                          value={selectedBranding.visual_assets?.[key] ?? ""}
                          onChange={(e) =>
                            setBranding((rows) =>
                              rows.map((row) =>
                                row.tenant_id === selectedBranding.tenant_id
                                  ? {
                                      ...row,
                                      visual_assets: {
                                        ...(row.visual_assets ?? {}),
                                        [key]: e.target.value,
                                      },
                                    }
                                  : row,
                              ),
                            )
                          }
                          placeholder={placeholder}
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                        />
                      </label>
                    ))}
                    <label className="mt-3 block text-xs font-bold text-slate-700">
                      Opacidad de imagen hero
                      <div className="mt-1 flex items-center gap-3">
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={selectedBranding.visual_assets?.hero_opacity ?? 0.8}
                          onChange={(e) =>
                            setBranding((rows) =>
                              rows.map((row) =>
                                row.tenant_id === selectedBranding.tenant_id
                                  ? {
                                      ...row,
                                      visual_assets: {
                                        ...(row.visual_assets ?? {}),
                                        hero_opacity: Number(e.target.value),
                                      },
                                    }
                                  : row,
                              ),
                            )
                          }
                          className="min-w-0 flex-1 accent-blue-600"
                        />
                        <span className="w-10 text-right font-mono text-[11px] text-slate-500">
                          {Math.round((selectedBranding.visual_assets?.hero_opacity ?? 0.8) * 100)}%
                        </span>
                      </div>
                    </label>
                  </div>
                  <label className="block text-xs font-bold text-slate-700">
                    Paleta de color
                    <select
                      value={selectedBranding.color_theme}
                      onChange={(e) =>
                        setBranding((rows) =>
                          rows.map((row) =>
                            row.tenant_id === selectedBranding.tenant_id
                              ? { ...row, color_theme: e.target.value }
                              : row,
                          ),
                        )
                      }
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    >
                      <option value="blue">Azul</option>
                      <option value="cyan">Cian</option>
                      <option value="indigo">Índigo</option>
                      <option value="amber">Ámbar</option>
                      <option value="orange">Naranja</option>
                      <option value="emerald">Esmeralda</option>
                      <option value="violet">Violeta</option>
                      <option value="green">Verde</option>
                      <option value="rose">Rosa</option>
                    </select>
                  </label>
                  <label className="block text-xs font-bold text-slate-700">
                    Color primario personalizado
                    <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
                      <input
                        type="color"
                        value={
                          selectedBranding.color_theme.startsWith("#")
                            ? selectedBranding.color_theme
                            : "#2563eb"
                        }
                        onChange={(e) =>
                          setBranding((rows) =>
                            rows.map((row) =>
                              row.tenant_id === selectedBranding.tenant_id
                                ? { ...row, color_theme: e.target.value }
                                : row,
                            ),
                          )
                        }
                        className="h-9 w-12 cursor-pointer rounded-lg border-0 bg-transparent p-0"
                        aria-label="Elegir color primario"
                      />
                      <span className="font-mono text-xs text-slate-500">
                        {selectedBranding.color_theme.startsWith("#")
                          ? selectedBranding.color_theme
                          : "Preset " + selectedBranding.color_theme}
                      </span>
                    </div>
                  </label>
                  <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
                    <h4 className="text-xs font-black text-slate-800">Navegación del panel</h4>
                    <p className="mt-1 text-[11px] leading-5 text-slate-500">
                      Elige el menú para esta empresa y ajusta su transparencia. El bottom navbar
                      aparece abajo en móvil y escritorio.
                    </p>
                    <label className="mt-3 block text-xs font-bold text-slate-700">
                      Diseño del menú
                      <select
                        value={navigationLayout}
                        onChange={(e) =>
                          setBranding((rows) =>
                            rows.map((row) =>
                              row.tenant_id === selectedBranding.tenant_id
                                ? {
                                    ...row,
                                    visual_assets: {
                                      ...(row.visual_assets ?? {}),
                                      navigation: {
                                        ...(row.visual_assets?.navigation ?? {}),
                                        layout: e.target.value as "sidebar" | "bottom",
                                      },
                                    },
                                  }
                                : row,
                            ),
                          )
                        }
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                      >
                        <option value="sidebar">Sidebar lateral</option>
                        <option value="bottom">Bottom navbar</option>
                      </select>
                    </label>
                    <label className="mt-3 block text-xs font-bold text-slate-700">
                      Opacidad de navegación
                      <div className="mt-1 flex items-center gap-3">
                        <input
                          type="range"
                          min="0.4"
                          max="1"
                          step="0.05"
                          value={navigationOpacity}
                          onChange={(e) =>
                            setBranding((rows) =>
                              rows.map((row) =>
                                row.tenant_id === selectedBranding.tenant_id
                                  ? {
                                      ...row,
                                      visual_assets: {
                                        ...(row.visual_assets ?? {}),
                                        navigation: {
                                          ...(row.visual_assets?.navigation ?? {}),
                                          opacity: Number(e.target.value),
                                        },
                                      },
                                    }
                                  : row,
                              ),
                            )
                          }
                          className="min-w-0 flex-1 accent-blue-600"
                        />
                        <span className="w-10 text-right font-mono text-[11px] text-slate-500">
                          {Math.round(navigationOpacity * 100)}%
                        </span>
                      </div>
                    </label>
                    <div
                      className="mt-3 rounded-lg px-3 py-2 text-[10px] font-semibold text-white"
                      style={{
                        backgroundColor: `rgba(15, 23, 42, ${navigationOpacity})`,
                        borderLeft: `4px solid ${getBrandingPreviewColor(selectedBranding.color_theme)}`,
                      }}
                    >
                      Vista rápida de la barra · {Math.round(navigationOpacity * 100)}% opacidad
                    </div>
                  </div>
                  <label className="block text-xs font-bold text-slate-700">
                    Opacidad visual
                    <input
                      type="number"
                      min="0.4"
                      max="1"
                      step="0.05"
                      value={selectedBranding.glass_opacity}
                      onChange={(e) =>
                        setBranding((rows) =>
                          rows.map((row) =>
                            row.tenant_id === selectedBranding.tenant_id
                              ? { ...row, glass_opacity: e.target.value }
                              : row,
                          ),
                        )
                      }
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs font-bold text-slate-700">
                    <span>
                      <span className="block">Landing de la empresa</span>
                      <span className="mt-0.5 block font-normal text-slate-400">
                        Controla si esta identidad puede mostrar la landing pública.
                      </span>
                    </span>
                    <input
                      type="checkbox"
                      checked={selectedBranding.landing_enabled ?? true}
                      onChange={(e) => {
                        const tenant = tenants.find(
                          (item) => item.tenant_id === selectedBranding.tenant_id,
                        );
                        if (tenant) void setTenantLandingEnabled(tenant, e.target.checked);
                      }}
                      className="h-5 w-5 accent-blue-600"
                    />
                  </label>
                  <label className="block text-xs font-bold text-slate-700">
                    Texto del botón de la landing
                    <input
                      value={selectedBranding.landing_cta_label || "Solicitar una demo"}
                      onChange={(e) =>
                        setBranding((rows) =>
                          rows.map((row) =>
                            row.tenant_id === selectedBranding.tenant_id
                              ? { ...row, landing_cta_label: e.target.value }
                              : row,
                          ),
                        )
                      }
                      maxLength={100}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    />
                  </label>
                  <Button onClick={() => void saveBranding()} disabled={brandingSaving}>
                    {brandingSaving ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <CheckCircle2 size={14} />
                    )}{" "}
                    Guardar identidad visual
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex min-h-64 items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white text-sm text-slate-500">
                No hay empresas con identidad visual disponible.
              </div>
            )}
          </section>
        )}

        {activeSection === "portal" && (
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Eye size={17} className="text-emerald-600" />
                  <div>
                    <h2 className="text-sm font-black text-slate-900">
                      Monitoreo de Portales del Trabajador
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      Despliega una empresa, selecciona un trabajador y abre su portal aislado para
                      monitoreo Dev Team.
                    </p>
                  </div>
                </div>
                <div className="relative w-full sm:w-72">
                  <Search
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    value={portalWorkerSearch}
                    onChange={(e) => setPortalWorkerSearch(e.target.value)}
                    placeholder="Buscar trabajador por nombre…"
                    aria-label="Buscar trabajador por nombre"
                    className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>
            <div className="divide-y divide-slate-100">
              {liveTenants.map((tenant) => {
                const expanded = expandedPortalTenants.has(tenant.tenant_id);
                const workers = (portalWorkers[tenant.tenant_id] ?? []).filter((worker) =>
                  `${worker.full_name} ${worker.rut} ${worker.email ?? ""}`
                    .toLowerCase()
                    .includes(portalWorkerSearch.trim().toLowerCase()),
                );
                const workerError = portalWorkerErrors[tenant.tenant_id];
                return (
                  <div key={tenant.tenant_id}>
                    <button
                      type="button"
                      onClick={() => void togglePortalTenant(tenant)}
                      className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-slate-50"
                    >
                      <ChevronRight
                        size={16}
                        className={`text-slate-400 transition-transform ${expanded ? "rotate-90" : ""}`}
                      />
                      <TenantAvatar tenant={tenant} branding={branding} size={36} />
                      <span className="min-w-0 flex-1">
                        <strong className="block truncate text-sm text-slate-800">
                          {tenant.tenant_name}
                        </strong>
                        <span className="text-[11px] text-slate-500">
                          {tenant.tenant_slug} · {tenant.member_count} usuarios ·{" "}
                          {tenant.isolation_mode ?? "tenant"}
                        </span>
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">
                        {portalWorkers[tenant.tenant_id]?.length ?? "—"} trabajadores
                      </span>
                    </button>
                    {expanded && (
                      <div className="bg-slate-50/70 px-5 pb-4 pl-12">
                        {portalLoadingTenantId === tenant.tenant_id ? (
                          <div className="flex items-center gap-2 py-4 text-xs text-slate-500">
                            <Spinner /> Cargando trabajadores…
                          </div>
                        ) : workerError ? (
                          <p className="py-4 text-xs text-red-700">
                            No se pudo cargar la lista: {workerError}
                          </p>
                        ) : workers.length === 0 ? (
                          <p className="py-4 text-xs text-slate-500">
                            No hay trabajadores registrados en esta empresa.
                          </p>
                        ) : (
                          <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
                            {workers.map((worker) => (
                              <div
                                key={worker.id}
                                className="flex flex-wrap items-center gap-3 px-3 py-2.5"
                              >
                                <CompanyIdentityAvatar name={worker.full_name} size={34} />
                                <div className="min-w-[180px] flex-1">
                                  <strong className="block text-xs text-slate-800">
                                    {worker.full_name}
                                  </strong>
                                  <span className="text-[10px] text-slate-500">
                                    {worker.rut} · {worker.position ?? "Sin cargo"} ·{" "}
                                    {worker.email ?? "Sin correo"}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => void openPortalPreview(tenant, worker)}
                                    disabled={busy || !worker.email}
                                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[10px] font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    <Eye size={12} /> Previsualizar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => openPortalPreviewInNewTab(tenant, worker)}
                                    disabled={!worker.email}
                                    className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 px-2.5 py-1.5 text-[10px] font-bold text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    <ArrowUpRight size={12} /> Nueva pestaña
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {!loading && tenants.length === 0 && (
                <div className="p-10 text-center text-sm text-slate-500">
                  No hay empresas cargadas.
                </div>
              )}
            </div>
          </section>
        )}

        {activeSection === "monitoring" && (
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-2">
                <Zap size={17} className="text-amber-500" />
                <div>
                  <h2 className="text-sm font-black text-slate-900">Monitoreo operativo</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Logs exclusivamente de empresas, filtrados por empresa y tipo. Los eventos del
                    Dev Team no aparecen aquí.
                  </p>
                </div>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <div className="relative">
                  <Search
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    value={eventSearch}
                    onChange={(e) => setEventSearch(e.target.value)}
                    placeholder="Buscar evento..."
                    className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-xs outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <select
                  value={eventTenant}
                  onChange={(e) => setEventTenant(e.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-xs"
                >
                  <option value="all">Todas las empresas</option>
                  {liveTenants.map((tenant) => (
                    <option key={tenant.tenant_id} value={tenant.tenant_id}>
                      {tenant.tenant_name}
                    </option>
                  ))}
                </select>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-xs"
                >
                  <option value="all">Todos los tipos</option>
                  {eventTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="divide-y divide-slate-100">
              {filteredEvents.slice(0, 100).map((event, index) => {
                const tenant = tenants.find((item) => item.tenant_id === event.tenant_id);
                const failed = /error|fail|exception|denied/i.test(event.action);
                return (
                  <div
                    key={`${event.created_at}-${index}`}
                    className="flex items-center gap-3 px-5 py-3"
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${failed ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-500"}`}
                    >
                      {failed ? <AlertTriangle size={15} /> : <Activity size={15} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className="truncate text-xs text-slate-700">
                          {event.action || event.entity_label || "Actividad registrada"}
                        </strong>
                        {tenant && (
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                            {tenant.tenant_name}
                          </span>
                        )}
                      </div>
                      <div className="truncate text-[10px] text-slate-500">
                        {event.entity_label ?? event.entity ?? "evento"} ·{" "}
                        {new Date(event.created_at).toLocaleString()}
                      </div>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${failed ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}
                    >
                      {failed ? "Revisar" : "OK"}
                    </span>
                  </div>
                );
              })}
              {!loading && filteredEvents.length === 0 && (
                <div className="p-10 text-center text-sm text-slate-500">
                  No hay logs para los filtros seleccionados.
                </div>
              )}
            </div>
          </section>
        )}
        {activeSection === "audit" && (
          <section className="space-y-3">
            <div className="rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3">
              <h2 className="text-sm font-black text-slate-900">Auditoría de actividad</h2>
              <p className="mt-1 text-xs text-slate-600">
                Eventos de acceso, roles, recorridos y tiempo estimado en pantalla. El alcance entre
                empresas depende de las políticas de acceso de la sesión Dev Team.
              </p>
            </div>
            <Suspense
              fallback={
                <div className="flex justify-center rounded-2xl bg-white p-10">
                  <Spinner />
                </div>
              }
            >
              <LogsView />
            </Suspense>
          </section>
        )}
        {activeSection === "devteam" && (
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-sm font-black text-slate-900">Equipo Dev</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Asigna desarrolladores a múltiples empresas y vistas. MFA TOTP es opcional y
                  compatible con Microsoft Authenticator.
                </p>
              </div>
              <button
                onClick={() =>
                  setDevTeamForm({
                    email: "",
                    password: "",
                    active: true,
                    permissions: {
                      ...Object.fromEntries(featureKeys.map((key) => [key, true])),
                      mfa_required: false,
                      mfa_required_tenant_ids: [],
                    },
                    tenant_ids: [],
                  })
                }
                className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-3 py-2 text-xs font-bold text-white"
              >
                <UserPlus size={14} /> Agregar desarrollador
              </button>
            </div>
            <div className="divide-y divide-slate-100">
              {devOperators.map((operator) => (
                <div key={operator.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                  <CompanyIdentityAvatar name={operator.email} size={40} />
                  <div className="min-w-0 flex-1">
                    <strong className="block truncate text-xs text-slate-800">
                      {operator.email}
                    </strong>
                    <span className="text-[10px] text-slate-500">
                      {operator.tenant_ids.length} empresa(s) asignada(s) ·{" "}
                      {Object.values(operator.permissions ?? {}).filter(Boolean).length} módulo(s)
                    </span>
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-[10px] font-bold ${operator.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
                  >
                    {operator.active ? "Activo" : "Suspendido"}
                  </span>
                  <button
                    onClick={() =>
                      setDevTeamForm({
                        id: operator.id,
                        email: operator.email,
                        password: "",
                        active: operator.active,
                        permissions: operator.permissions ?? {},
                        tenant_ids: operator.tenant_ids,
                      })
                    }
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-[10px] font-bold"
                  >
                    Editar acceso
                  </button>
                </div>
              ))}
              {!devOperators.length && (
                <div className="p-10 text-center text-sm text-slate-500">
                  No hay desarrolladores adicionales configurados.
                </div>
              )}
            </div>
          </section>
        )}
        {activeSection === "captadores" && (
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-sm font-black text-slate-900">
                  Captadores y vendedores de software
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Usuarios de solo lectura para demos, sin acceso a datos operativos de clientes.
                </p>
              </div>
              <button
                onClick={async () => {
                  const email = window.prompt("Correo del captador:");
                  const name = window.prompt("Nombre completo:");
                  if (!email || !name) return;
                  const { error } = await supabase.from("saas_demo_operators").insert({
                    email: email.trim().toLowerCase(),
                    full_name: name.trim(),
                    active: true,
                    access_mode: "readonly",
                  });
                  setMessage(error?.message ?? "Captador creado en modo solo lectura.");
                  if (!error) setActiveSection("captadores");
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white"
              >
                <UserPlus size={14} /> Agregar captador
              </button>
            </div>
            <div className="divide-y divide-slate-100">
              {captadores.map((person) => (
                <div key={person.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                    <Eye size={15} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <strong className="block text-xs text-slate-800">{person.full_name}</strong>
                    <span className="text-[10px] text-slate-500">
                      {person.email} · Solo lectura
                    </span>
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-[10px] font-bold ${person.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
                  >
                    {person.active ? "Activo" : "Suspendido"}
                  </span>
                  <button
                    onClick={async () => {
                      await supabase
                        .from("saas_demo_operators")
                        .update({ active: !person.active })
                        .eq("id", person.id);
                      setCaptadores((rows) =>
                        rows.map((row) =>
                          row.id === person.id ? { ...row, active: !person.active } : row,
                        ),
                      );
                    }}
                    className="rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-bold"
                  >
                    {person.active ? "Suspender" : "Activar"}
                  </button>
                </div>
              ))}
              {captadores.length === 0 && (
                <div className="p-10 text-center text-sm text-slate-500">
                  Aún no hay captadores.
                </div>
              )}
            </div>
          </section>
        )}
        {activeSection === "cartera" && (
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-2">
                <WalletCards size={17} className="text-blue-600" />
                <div>
                  <h2 className="text-sm font-black text-slate-900">Cartera de clientes</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Cada cuenta está vinculada por tenant_id a una empresa.
                  </p>
                </div>
              </div>
              <button
                onClick={() => openCarteraForm()}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
              >
                <Plus size={14} /> Nueva cuenta
              </button>
            </div>
            <div className="grid gap-3 border-b border-slate-100 bg-slate-50/60 p-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-blue-100 bg-white p-3">
                <span className="text-[11px] font-bold text-slate-500">MRR bruto</span>
                <strong className="mt-1 block text-lg font-black text-slate-900">
                  {formatClp(billingMetrics.monthlyGross)}
                </strong>
              </div>
              <div className="rounded-2xl border border-amber-100 bg-white p-3">
                <span className="text-[11px] font-bold text-slate-500">Próximos 30 días</span>
                <strong className="mt-1 block text-lg font-black text-amber-700">
                  {formatClp(
                    billingMetrics.upcoming.reduce(
                      (total, notice) => total + Number(notice.total_amount ?? 0),
                      0,
                    ),
                  )}
                </strong>
              </div>
              <div className="rounded-2xl border border-red-100 bg-white p-3">
                <span className="text-[11px] font-bold text-slate-500">Vencido</span>
                <strong className="mt-1 block text-lg font-black text-red-700">
                  {formatClp(
                    billingMetrics.overdue.reduce(
                      (total, notice) => total + Number(notice.total_amount ?? 0),
                      0,
                    ),
                  )}
                </strong>
              </div>
            </div>
            {billingNotices.length > 0 && (
              <div className="border-b border-slate-100 px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xs font-black text-slate-900">Avisos generados</h3>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Documentos preliminares para revisar y enviar por el canal de cobranza.
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">
                    {billingNotices.length} avisos
                  </span>
                </div>
                <div className="mt-3 grid gap-2 lg:grid-cols-2">
                  {billingNotices.slice(0, 6).map((notice) => {
                    const tenant = tenants.find((item) => item.tenant_id === notice.tenant_id);
                    const effectiveStatus = getEffectiveBillingNoticeStatus(
                      notice.status,
                      notice.due_date,
                      toLocalDateString(new Date()),
                    );
                    const statusPresentation = billingNoticeStatusPresentation(effectiveStatus);
                    return (
                      <div
                        key={notice.id}
                        className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2"
                      >
                        <div className="min-w-0 flex-1">
                          <strong className="block truncate text-[11px] text-slate-800">
                            {notice.folio} · {tenant?.tenant_name ?? "Empresa"}
                          </strong>
                          <span className="text-[10px] text-slate-500">
                            Vence {formatShortDate(notice.due_date)} ·{" "}
                            {formatClp(Number(notice.total_amount))}
                          </span>
                        </div>
                        <span
                          className={`rounded-full px-2 py-1 text-[10px] font-bold ${statusPresentation.className}`}
                        >
                          {statusPresentation.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="divide-y divide-slate-100">
              {cartera.map((account) => {
                const tenant = tenants.find((item) => item.tenant_id === account.tenant_id);
                return (
                  <div key={account.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                    <div className="min-w-[180px] flex-1">
                      <strong className="block text-xs text-slate-800">
                        {tenant?.tenant_name ?? "Empresa no encontrada"}
                      </strong>
                      <span className="text-[10px] text-slate-500">
                        {account.company_rut ?? "RUT pendiente"} · próximo pago:{" "}
                        {formatShortDate(account.next_payment_date)} ·{" "}
                        {account.legal_representative_name ?? "representante pendiente"}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-slate-700">
                      ${account.monthly_amount ?? 0} + IVA ${account.iva_amount ?? 0}
                    </span>
                    <span
                      className={`rounded-full px-2 py-1 text-[10px] font-bold ${statusTone(account.payment_status)}`}
                    >
                      {account.payment_status}
                    </span>
                    <button
                      onClick={() => openCarteraForm(account)}
                      className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10px] font-bold"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => void deleteCartera(account)}
                      className="rounded-lg border border-red-200 px-2.5 py-1.5 text-[10px] font-bold text-red-700"
                    >
                      Eliminar
                    </button>
                    <button
                      onClick={() => void generateBillingNotice(account)}
                      disabled={busy}
                      className="inline-flex items-center gap-1 rounded-lg border border-blue-200 px-2.5 py-1.5 text-[10px] font-bold text-blue-700 disabled:opacity-50"
                    >
                      <FileText size={12} /> Aviso PDF
                    </button>
                    <button
                      onClick={async () => {
                        await supabase.rpc("publish_saas_notification", {
                          _tenant_id: account.tenant_id,
                          _template_key: "plan_due_soon",
                          _title: "Plan próximo a vencer",
                          _message: "Tu plan está próximo a vencer. Revisa tu calendario de pagos.",
                          _priority: "high",
                          _metadata: { source: "cartera" },
                        });
                        setMessage(`Aviso enviado a ${tenant?.tenant_name ?? "la empresa"}.`);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10px] font-bold text-slate-700"
                    >
                      <Send size={12} /> Avisar
                    </button>
                  </div>
                );
              })}
              {cartera.length === 0 && (
                <div className="p-10 text-center text-sm text-slate-500">
                  Aún no hay cuentas de cartera.
                </div>
              )}
            </div>
          </section>
        )}

        {carteraForm && (
          <Modal
            open
            onClose={() => setCarteraForm(null)}
            title={carteraForm.id ? "Editar cliente y calendario" : "Vincular nuevo cliente"}
          >
            <div className="space-y-4">
              <p className="text-xs text-slate-500">
                Selecciona la empresa, define el monto y programa el próximo pago.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-bold text-slate-700">
                  Empresa
                  <select
                    value={carteraForm.tenant_id}
                    onChange={(e) =>
                      setCarteraForm({
                        ...carteraForm,
                        tenant_id: e.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
                  >
                    <option value="">Seleccionar empresa</option>
                    {liveTenants.map((tenant) => (
                      <option key={tenant.tenant_id} value={tenant.tenant_id}>
                        {tenant.tenant_name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-bold text-slate-700">
                  Estado
                  <select
                    value={carteraForm.payment_status}
                    onChange={(e) =>
                      setCarteraForm({
                        ...carteraForm,
                        payment_status: e.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
                  >
                    <option value="pending">Pendiente</option>
                    <option value="paid">Pagado</option>
                    <option value="overdue">Vencido</option>
                    <option value="paused">Pausado</option>
                  </select>
                </label>
                <label className="text-xs font-bold text-slate-700">
                  RUT empresa
                  <input
                    value={carteraForm.company_rut}
                    onChange={(e) =>
                      setCarteraForm({ ...carteraForm, company_rut: e.target.value })
                    }
                    placeholder="77.401.522-1"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                  />
                </label>
                <label className="text-xs font-bold text-slate-700">
                  Representante legal
                  <input
                    value={carteraForm.legal_representative_name}
                    onChange={(e) =>
                      setCarteraForm({ ...carteraForm, legal_representative_name: e.target.value })
                    }
                    placeholder="Nombre completo"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                  />
                </label>
                <label className="text-xs font-bold text-slate-700">
                  RUT representante
                  <input
                    value={carteraForm.legal_representative_rut}
                    onChange={(e) =>
                      setCarteraForm({ ...carteraForm, legal_representative_rut: e.target.value })
                    }
                    placeholder="12.345.678-9"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                  />
                </label>
                <label className="text-xs font-bold text-slate-700">
                  Email de cobro
                  <input
                    type="email"
                    value={carteraForm.billing_email}
                    onChange={(e) =>
                      setCarteraForm({ ...carteraForm, billing_email: e.target.value })
                    }
                    placeholder="cobranzas@empresa.cl"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                  />
                </label>
                <label className="text-xs font-bold text-slate-700">
                  Monto mensual sin IVA
                  <input
                    type="number"
                    min="0"
                    value={carteraForm.monthly_amount}
                    onChange={(e) =>
                      setCarteraForm({
                        ...carteraForm,
                        monthly_amount: e.target.value,
                        iva_amount: String(Math.round(Number(e.target.value || 0) * 0.19)),
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                  />
                </label>
                <label className="text-xs font-bold text-slate-700">
                  IVA
                  <input
                    type="number"
                    min="0"
                    value={carteraForm.iva_amount}
                    onChange={(e) =>
                      setCarteraForm({
                        ...carteraForm,
                        iva_amount: e.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                  />
                </label>
                <label className="text-xs font-bold text-slate-700">
                  Próximo pago
                  <input
                    type="date"
                    value={carteraForm.next_payment_date}
                    onChange={(e) =>
                      setCarteraForm({
                        ...carteraForm,
                        next_payment_date: e.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                  />
                </label>
                <label className="text-xs font-bold text-slate-700">
                  Día habitual de pago
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={carteraForm.payment_day}
                    onChange={(e) =>
                      setCarteraForm({ ...carteraForm, payment_day: e.target.value })
                    }
                    placeholder="30"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                  />
                </label>
                <label className="text-xs font-bold text-slate-700 sm:col-span-2">
                  Dirección de facturación
                  <input
                    value={carteraForm.billing_address}
                    onChange={(e) =>
                      setCarteraForm({ ...carteraForm, billing_address: e.target.value })
                    }
                    placeholder="Dirección comercial"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                  />
                </label>
                <label className="text-xs font-bold text-slate-700 sm:col-span-2">
                  Notas
                  <input
                    value={carteraForm.notes}
                    onChange={(e) => setCarteraForm({ ...carteraForm, notes: e.target.value })}
                    placeholder="Contacto, condiciones o recordatorio"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                  />
                </label>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setCarteraForm(null)}>
                  Cancelar
                </Button>
                <Button
                  onClick={() => void saveCarteraForm()}
                  disabled={busy || !carteraForm.tenant_id}
                >
                  {busy ? "Guardando…" : "Guardar calendario"}
                </Button>
              </div>
            </div>
          </Modal>
        )}
        {cloneSource && (
          <Modal
            open
            onClose={() => !busy && setCloneSource(null)}
            title="Clonar empresa"
            size="lg"
          >
            <div className="space-y-5">
              <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
                <div className="rounded-xl bg-blue-600 p-2 text-white">
                  <Copy size={18} />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-blue-700">
                    Plantilla de origen
                  </p>
                  <h3 className="mt-1 text-base font-black text-slate-900">
                    {cloneSource.tenant_name}
                  </h3>
                  <p className="mt-1 text-xs text-slate-600">
                    Se copiarán el plan, módulos, overrides e identidad visual. No se copiarán
                    trabajadores, usuarios ni datos operativos.
                  </p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-bold text-slate-700 sm:col-span-2">
                  Nombre de la nueva empresa
                  <input
                    autoFocus
                    value={cloneDraft.name}
                    onChange={(e) =>
                      setCloneDraft((current) => ({ ...current, name: e.target.value }))
                    }
                    placeholder="Ej. Empresa Norte"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none ring-blue-500 focus:ring-2"
                  />
                </label>
                <label className="text-xs font-bold text-slate-700">
                  Identificador interno
                  <input
                    value={cloneDraft.slug}
                    onChange={(e) =>
                      setCloneDraft((current) => ({
                        ...current,
                        slug: e.target.value.toLowerCase().replace(/\s+/g, "-"),
                      }))
                    }
                    placeholder="empresa-norte"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none ring-blue-500 focus:ring-2"
                  />
                  <span className="mt-1 block font-normal text-slate-400">
                    minúsculas, números y guiones
                  </span>
                </label>
                <label className="text-xs font-bold text-slate-700">
                  Responsable inicial <span className="font-normal text-slate-400">(opcional)</span>
                  <input
                    type="email"
                    value={cloneDraft.ownerEmail}
                    onChange={(e) =>
                      setCloneDraft((current) => ({ ...current, ownerEmail: e.target.value }))
                    }
                    placeholder="responsable@empresa.cl"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none ring-blue-500 focus:ring-2"
                  />
                </label>
              </div>
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-violet-200 bg-violet-50/70 p-4">
                <input
                  type="checkbox"
                  checked={cloneRoleTemplates}
                  onChange={(e) => setCloneRoleTemplates(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-violet-600"
                />
                <span>
                  <strong className="block text-sm text-violet-900">
                    Clonar estructura de roles y permisos predeterminados
                  </strong>
                  <span className="mt-1 block text-xs font-normal text-violet-700">
                    Copia las plantillas de Jefe, RR. HH., Admin, Gerente, Prevención, Operador y
                    Trabajador. No copia usuarios, correos ni membresías.
                  </span>
                </span>
              </label>
              <div className="grid gap-2 sm:grid-cols-4">
                {["Plan y límites", "Módulos y permisos", "Branding", "Roles predeterminados"].map(
                  (item) => (
                    <div
                      key={item}
                      className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700"
                    >
                      <CheckCircle2 size={14} className="mb-1" /> {item}
                    </div>
                  ),
                )}
              </div>
              <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                <Button variant="outline" onClick={() => setCloneSource(null)} disabled={busy}>
                  Cancelar
                </Button>
                <Button
                  onClick={() => void cloneTenant()}
                  loading={busy}
                  disabled={!cloneDraft.name.trim() || !cloneDraft.slug.trim()}
                >
                  <Copy size={15} /> Crear copia
                </Button>
              </div>
            </div>
          </Modal>
        )}
        {portalPreview && (
          <Modal
            open
            onClose={() => setPortalPreview(null)}
            title={`Portal · ${portalPreview.worker.full_name} · ${portalPreview.tenant.tenant_name}`}
            size="xl"
          >
            <div className="flex items-center justify-end border-b border-slate-100 px-4 py-2">
              <button
                type="button"
                onClick={() =>
                  portalPreview &&
                  openPortalPreviewInNewTab(portalPreview.tenant, portalPreview.worker)
                }
                className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 px-2.5 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50"
              >
                <ArrowUpRight size={14} /> Abrir portal completo
              </button>
            </div>
            <div className="max-h-[78vh] overflow-y-auto">
              <Suspense
                fallback={
                  <div className="flex justify-center py-10">
                    <Spinner />
                  </div>
                }
              >
                <WorkerPortal
                  workerRut={portalPreview.worker.rut}
                  previewEmail={portalPreview.worker.email ?? ""}
                />
              </Suspense>
            </div>
          </Modal>
        )}
        {devTeamForm && (
          <Modal
            open
            onClose={() => !busy && setDevTeamForm(null)}
            title="Permisos del Equipo Dev"
            size="lg"
          >
            <div className="space-y-4">
              <label className="block text-xs font-bold text-slate-700">
                Correo del desarrollador
                <input
                  type="email"
                  value={devTeamForm.email}
                  onChange={(e) => setDevTeamForm({ ...devTeamForm, email: e.target.value })}
                  placeholder="dev@empresa.com"
                  disabled={Boolean(devTeamForm.id)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-100"
                />
                <label className="mt-3 block text-xs font-bold text-slate-700">
                  Contraseña nueva (opcional)
                  <input
                    type="password"
                    value={devTeamForm.password}
                    onChange={(e) => setDevTeamForm({ ...devTeamForm, password: e.target.value })}
                    placeholder="Déjala vacía para generar una temporal"
                    minLength={8}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="mt-3 flex items-center gap-2 text-xs font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={devTeamForm.active}
                    onChange={(e) => setDevTeamForm({ ...devTeamForm, active: e.target.checked })}
                  />{" "}
                  Cuenta y memberships activas
                </label>
              </label>
              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-slate-700">Empresas que podrá administrar</p>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      className="text-[10px] font-bold text-violet-700"
                      onClick={() =>
                        setDevTeamForm({
                          ...devTeamForm,
                          tenant_ids: liveTenants.map((tenant) => tenant.tenant_id),
                        })
                      }
                    >
                      Todas
                    </button>
                    <button
                      type="button"
                      className="text-[10px] font-bold text-slate-500"
                      onClick={() => setDevTeamForm({ ...devTeamForm, tenant_ids: [] })}
                    >
                      Ninguna
                    </button>
                  </div>
                </div>
                <div className="grid max-h-44 gap-2 overflow-y-auto rounded-xl border border-slate-200 p-3 sm:grid-cols-2">
                  {liveTenants.map((tenant) => (
                    <label
                      key={tenant.tenant_id}
                      className="flex items-center gap-2 text-xs text-slate-700"
                    >
                      <input
                        type="checkbox"
                        checked={devTeamForm.tenant_ids.includes(tenant.tenant_id)}
                        onChange={(e) =>
                          setDevTeamForm({
                            ...devTeamForm,
                            tenant_ids: e.target.checked
                              ? [...devTeamForm.tenant_ids, tenant.tenant_id]
                              : devTeamForm.tenant_ids.filter((id) => id !== tenant.tenant_id),
                          })
                        }
                      />
                      {tenant.tenant_name}
                    </label>
                  ))}
                </div>
              </div>
              <label className="flex items-start gap-2 rounded-xl border border-violet-200 bg-violet-50/60 p-3 text-xs text-slate-700">
                <span>
                  <strong className="block text-violet-900">
                    Microsoft Authenticator por empresa
                  </strong>
                  <span className="mt-0.5 block text-[11px] text-slate-500">
                    Actívalo sólo para empresas que necesiten doble factor. Las demás pueden operar
                    sin MFA; el usuario escaneará el QR una sola vez al iniciar su acceso protegido.
                  </span>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {liveTenants.map((tenant) => {
                      const selectedTenantIds = Array.isArray(
                        devTeamForm.permissions.mfa_required_tenant_ids,
                      )
                        ? (devTeamForm.permissions.mfa_required_tenant_ids as string[])
                        : [];
                      const checked = selectedTenantIds.includes(tenant.tenant_id);
                      return (
                        <label
                          key={tenant.tenant_id}
                          className="flex items-center gap-2 text-[11px]"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(event) =>
                              setDevTeamForm({
                                ...devTeamForm,
                                permissions: {
                                  ...devTeamForm.permissions,
                                  mfa_required: false,
                                  mfa_required_tenant_ids: event.target.checked
                                    ? [...selectedTenantIds, tenant.tenant_id]
                                    : selectedTenantIds.filter((id) => id !== tenant.tenant_id),
                                },
                              })
                            }
                          />
                          {tenant.tenant_name}
                        </label>
                      );
                    })}
                  </div>
                </span>
              </label>
              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-slate-700">Vistas y módulos permitidos</p>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      className="text-[10px] font-bold text-violet-700"
                      onClick={() =>
                        setDevTeamForm({
                          ...devTeamForm,
                          permissions: {
                            ...devTeamForm.permissions,
                            ...Object.fromEntries(featureKeys.map((key) => [key, true])),
                          },
                        })
                      }
                    >
                      Todas
                    </button>
                    <button
                      type="button"
                      className="text-[10px] font-bold text-slate-500"
                      onClick={() =>
                        setDevTeamForm({
                          ...devTeamForm,
                          permissions: {
                            ...devTeamForm.permissions,
                            ...Object.fromEntries(featureKeys.map((key) => [key, false])),
                          },
                        })
                      }
                    >
                      Ninguna
                    </button>
                  </div>
                </div>
                <div className="grid max-h-52 gap-2 overflow-y-auto rounded-xl border border-slate-200 p-3 sm:grid-cols-2">
                  {featureKeys.map((key) => (
                    <label key={key} className="flex items-center gap-2 text-xs text-slate-700">
                      <input
                        type="checkbox"
                        checked={devTeamForm.permissions[key] === true}
                        onChange={(e) =>
                          setDevTeamForm({
                            ...devTeamForm,
                            permissions: { ...devTeamForm.permissions, [key]: e.target.checked },
                          })
                        }
                      />
                      {FEATURE_LABELS[key]}
                    </label>
                  ))}
                </div>
              </div>
              <label className="flex items-start gap-3 rounded-xl border border-violet-200 bg-violet-50 p-3 text-xs text-violet-950">
                <span>
                  <strong className="block">Compatibilidad TOTP</strong>
                  Microsoft Authenticator puede escanear el QR; también funcionan otras aplicaciones
                  TOTP. Los roles no desarrollador siguen protegidos por MFA obligatorio.
                </span>
              </label>
              <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                <Button variant="outline" onClick={() => setDevTeamForm(null)} disabled={busy}>
                  Cancelar
                </Button>
                <Button
                  onClick={() => void saveDevOperator()}
                  disabled={busy || !devTeamForm.email.trim()}
                >
                  <Check size={14} /> {busy ? "Guardando…" : "Guardar acceso"}
                </Button>
              </div>
            </div>
          </Modal>
        )}
        {onboardingForm && (
          <OnboardingWelcomeModal
            open
            form={onboardingForm}
            busy={busy}
            onChange={setOnboardingForm}
            onClose={() => setOnboardingForm(null)}
            onSave={saveOnboardingDraft}
            onSend={sendOnboarding}
          />
        )}
        {contractForm && (
          <Modal
            open
            onClose={() => !busy && setContractForm(null)}
            title={contractForm.id ? "Editar contrato vinculado" : "Vincular contrato"}
            size="lg"
          >
            <div className="space-y-4">
              <p className="rounded-2xl border border-violet-100 bg-violet-50 p-4 text-xs text-violet-900">
                Guarda un enlace al contrato comercial y sus fechas de vigencia. El archivo
                permanece en el proveedor donde está alojado; aquí sólo se administra el vínculo y
                sus metadatos.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-bold text-slate-700 sm:col-span-2">
                  Empresa
                  <select
                    value={contractForm.tenant_id}
                    onChange={(event) =>
                      setContractForm({ ...contractForm, tenant_id: event.target.value })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  >
                    {liveTenants.map((tenant) => (
                      <option key={tenant.tenant_id} value={tenant.tenant_id}>
                        {tenant.tenant_name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-bold text-slate-700">
                  Título
                  <input
                    value={contractForm.title}
                    onChange={(event) =>
                      setContractForm({ ...contractForm, title: event.target.value })
                    }
                    maxLength={200}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    placeholder="Contrato SaaS 2026"
                  />
                </label>
                <label className="text-xs font-bold text-slate-700">
                  Estado
                  <select
                    value={contractForm.status}
                    onChange={(event) =>
                      setContractForm({ ...contractForm, status: event.target.value })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  >
                    <option value="draft">Borrador</option>
                    <option value="active">Activo</option>
                    <option value="expired">Vencido</option>
                    <option value="cancelled">Cancelado</option>
                  </select>
                </label>
                <label className="text-xs font-bold text-slate-700 sm:col-span-2">
                  Enlace al contrato
                  <input
                    type="url"
                    value={contractForm.contract_url}
                    onChange={(event) =>
                      setContractForm({ ...contractForm, contract_url: event.target.value })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    placeholder="https://drive.google.com/..."
                  />
                </label>
                <label className="text-xs font-bold text-slate-700">
                  Contraparte
                  <input
                    value={contractForm.counterparty_name}
                    onChange={(event) =>
                      setContractForm({ ...contractForm, counterparty_name: event.target.value })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    placeholder="Representante legal"
                  />
                </label>
                <label className="text-xs font-bold text-slate-700">
                  RUT contraparte
                  <input
                    value={contractForm.counterparty_rut}
                    onChange={(event) =>
                      setContractForm({ ...contractForm, counterparty_rut: event.target.value })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    placeholder="12.345.678-9"
                  />
                </label>
                <label className="text-xs font-bold text-slate-700">
                  Fecha firma
                  <input
                    type="date"
                    value={contractForm.signed_at}
                    onChange={(event) =>
                      setContractForm({ ...contractForm, signed_at: event.target.value })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-xs font-bold text-slate-700">
                  Fecha vencimiento
                  <input
                    type="date"
                    value={contractForm.expires_at}
                    onChange={(event) =>
                      setContractForm({ ...contractForm, expires_at: event.target.value })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-xs font-bold text-slate-700 sm:col-span-2">
                  Notas
                  <textarea
                    value={contractForm.notes}
                    onChange={(event) =>
                      setContractForm({ ...contractForm, notes: event.target.value })
                    }
                    rows={3}
                    className="mt-1 w-full resize-y rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    placeholder="Renovación, anexos, condiciones especiales…"
                  />
                </label>
              </div>
              <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                <Button variant="outline" onClick={() => setContractForm(null)} disabled={busy}>
                  Cancelar
                </Button>
                <Button
                  onClick={() => void saveContractForm()}
                  disabled={busy || !contractForm.title.trim() || !contractForm.contract_url.trim()}
                >
                  <Link2 size={14} /> {busy ? "Guardando…" : "Guardar contrato"}
                </Button>
              </div>
            </div>
          </Modal>
        )}
        {notificationForm && (
          <Modal
            open
            onClose={() => !busy && setNotificationForm(null)}
            title={`Aviso del desarrollador · ${tenants.find((item) => item.tenant_id === notificationForm.tenant_id)?.tenant_name ?? "Empresa"}`}
            size="lg"
          >
            <div className="space-y-4">
              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-xs text-blue-900">
                El aviso aparecerá arriba del portal de la empresa, con fecha, hora, prioridad y
                opción de marcarlo como leído.
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-bold text-slate-700">
                  Plantilla
                  <select
                    value={notificationForm.template_key}
                    onChange={(e) =>
                      setNotificationForm({ ...notificationForm, template_key: e.target.value })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  >
                    <option value="announcement">Aviso general</option>
                    <option value="payment_due">Aviso de pago</option>
                    <option value="gift">Regalo o beneficio</option>
                    <option value="note">Nota personalizada</option>
                  </select>
                </label>
                <label className="text-xs font-bold text-slate-700">
                  Prioridad
                  <select
                    value={notificationForm.priority}
                    onChange={(e) =>
                      setNotificationForm({ ...notificationForm, priority: e.target.value })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  >
                    <option value="normal">Normal</option>
                    <option value="high">Alta</option>
                    <option value="urgent">Urgente</option>
                  </select>
                </label>
              </div>
              <label className="block text-xs font-bold text-slate-700">
                Título
                <input
                  value={notificationForm.title}
                  onChange={(e) =>
                    setNotificationForm({ ...notificationForm, title: e.target.value })
                  }
                  maxLength={160}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  placeholder="Ej. Actualización importante"
                />
              </label>
              <label className="block text-xs font-bold text-slate-700">
                Detalle del aviso
                <textarea
                  value={notificationForm.message}
                  onChange={(e) =>
                    setNotificationForm({ ...notificationForm, message: e.target.value })
                  }
                  rows={6}
                  maxLength={4000}
                  className="mt-1 w-full resize-y rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  placeholder="Escribe el aviso, instrucciones, regalo, nota o detalle libre…"
                />
              </label>
              <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                <Button variant="outline" onClick={() => setNotificationForm(null)} disabled={busy}>
                  Cancelar
                </Button>
                <Button
                  onClick={() => void sendDeveloperNotification()}
                  disabled={
                    busy || !notificationForm.title.trim() || !notificationForm.message.trim()
                  }
                >
                  <Bell size={14} /> {busy ? "Publicando…" : "Publicar aviso"}
                </Button>
              </div>
            </div>
          </Modal>
        )}
        {loading && (
          <div className="fixed bottom-5 right-5 flex items-center gap-2 rounded-xl bg-slate-950 px-3 py-2 text-xs font-semibold text-white shadow-lg">
            <Loader2 size={14} className="animate-spin" /> Sincronizando empresas
          </div>
        )}
      </div>
    </div>
  );
}

export default SaaSControlPanel;
