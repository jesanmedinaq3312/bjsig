import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Archive,
  Database,
  FileClock,
  FilePlus2,
  Globe2,
  HardDrive,
  History,
  LockKeyhole,
  Plus,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  Users,
  X,
} from "lucide-react";
import { Button, EmptyState, Input, Modal, Select, Spinner, Textarea } from "@/components/ui";
import { supabase } from "@/lib/supabase";

export interface GovernanceTenant {
  tenant_id: string;
  tenant_name: string;
  plan_name?: string | null;
  max_users?: number | null;
}

type Tab =
  | "summary"
  | "catalog"
  | "compliance"
  | "assets"
  | "contacts"
  | "usage"
  | "requests"
  | "audit"
  | "incidents"
  | "network";
type Asset = {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  source_system: string | null;
  data_category: string;
  sensitivity_level: string;
  owner_name: string | null;
  location: string | null;
  record_count: number;
  storage_bytes: number;
  sync_frequency: string | null;
  retention_days: number | null;
  status: string;
  contains_personal_data: boolean;
  contains_sensitive_data: boolean;
  has_backup: boolean;
  legal_hold: boolean;
};
type Contact = {
  id: string;
  tenant_id: string;
  full_name: string;
  job_title: string | null;
  email: string;
  phone: string | null;
  whatsapp: string | null;
  contact_type: string;
  is_primary: boolean;
  can_authorize_changes: boolean;
  can_view_data: boolean;
  verified_at: string | null;
  status: string;
};
type Usage = {
  tenant_id: string;
  usage_date: string;
  active_users: number;
  records_count: number;
  files_count: number;
  storage_bytes: number;
  processing_jobs: number;
  imports_count: number;
  exports_count: number;
  api_calls: number;
  processing_errors: number;
  plan_storage_limit_bytes: number | null;
};
type Request = {
  id: string;
  tenant_id: string;
  request_type: string;
  status: string;
  asset_id: string | null;
  requested_by: string | null;
  reason: string;
  scheduled_for: string | null;
  created_at: string;
};
type Incident = {
  id: string;
  tenant_id: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  asset_id: string | null;
  assigned_to: string | null;
  detected_at: string;
  resolved_at: string | null;
};
type AuditEvent = {
  id: string;
  tenant_id: string | null;
  action: string;
  resource_type: string;
  classification: string | null;
  outcome: string;
  created_at: string;
};
type IpRule = {
  id: string;
  tenant_id: string | null;
  label: string;
  mode: "whitelist" | "blacklist";
  network: string;
  active: boolean;
  priority: number;
  expires_at: string | null;
  notes: string | null;
};
type CatalogRow = {
  tenant_id: string;
  table_name: string;
  row_count: number;
};
type IpHistory = {
  tenant_id: string;
  ip_address: string;
  observed_at: string;
  source: string;
  outcome: string;
};
type GovernanceProfile = {
  tenant_id: string;
  maturity_level: string;
  treatment_owner: string | null;
  security_contact: string | null;
  storage_region: string | null;
  default_retention_days: number | null;
  has_personal_data: boolean;
  has_sensitive_data: boolean;
  document_review_status: string;
  last_reviewed_at: string | null;
};

const tabItems: Array<{ id: Tab; label: string }> = [
  { id: "summary", label: "Resumen" },
  { id: "catalog", label: "Datos empresariales" },
  { id: "compliance", label: "Cumplimiento Chile" },
  { id: "assets", label: "Inventario" },
  { id: "contacts", label: "Contactos" },
  { id: "usage", label: "Uso" },
  { id: "requests", label: "Retención" },
  { id: "audit", label: "Auditoría" },
  { id: "incidents", label: "Incidentes" },
  { id: "network", label: "IPs y aislamiento" },
];

const emptyAsset = {
  name: "",
  description: "",
  source_system: "",
  data_category: "other",
  sensitivity_level: "internal",
  owner_name: "",
  location: "",
  record_count: "0",
  storage_bytes: "0",
  sync_frequency: "",
  retention_days: "",
  status: "pending_review",
  contains_personal_data: false,
  contains_sensitive_data: false,
  has_backup: false,
  legal_hold: false,
};
const emptyContact = {
  full_name: "",
  job_title: "",
  email: "",
  phone: "",
  whatsapp: "",
  contact_type: "support",
  is_primary: false,
  can_authorize_changes: false,
  can_view_data: false,
};
const emptyIncident = {
  title: "",
  description: "",
  severity: "medium",
  status: "open",
  asset_id: "",
  assigned_to: "",
  actions_taken: "",
};
const emptyIpRule = {
  label: "",
  mode: "whitelist" as "whitelist" | "blacklist",
  network: "",
  priority: "100",
  expires_at: "",
  notes: "",
  tenant_id: "",
};

function formatBytes(value: number | null | undefined) {
  const bytes = Number(value ?? 0);
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`;
}
function tenantName(tenants: GovernanceTenant[], id: string | null) {
  return tenants.find((tenant) => tenant.tenant_id === id)?.tenant_name ?? "Empresa";
}
function tone(value: string) {
  if (["sensitive", "critical", "high", "open"].includes(value))
    return "border-red-200 bg-red-50 text-red-700";
  if (["personal", "confidential", "medium", "under_review"].includes(value))
    return "border-amber-200 bg-amber-50 text-amber-700";
  if (["active", "verified", "completed", "contained"].includes(value))
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

export function DataGovernancePanel({ tenants }: { tenants: GovernanceTenant[] }) {
  const [tab, setTab] = useState<Tab>("summary");
  const [tenantId, setTenantId] = useState("all");
  const [assets, setAssets] = useState<Asset[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [usage, setUsage] = useState<Usage[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [profiles, setProfiles] = useState<GovernanceProfile[]>([]);
  const [ipRules, setIpRules] = useState<IpRule[]>([]);
  const [catalog, setCatalog] = useState<CatalogRow[]>([]);
  const [ipHistory, setIpHistory] = useState<IpHistory[]>([]);
  const [isolationChecks, setIsolationChecks] = useState<
    Array<{ check_name: string; passed: boolean; detail: string }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [assetForm, setAssetForm] = useState<typeof emptyAsset | null>(null);
  const [contactForm, setContactForm] = useState<typeof emptyContact | null>(null);
  const [incidentForm, setIncidentForm] = useState<typeof emptyIncident | null>(null);
  const [ipRuleForm, setIpRuleForm] = useState<typeof emptyIpRule | null>(null);

  const scoped = useCallback(
    <T extends { tenant_id: string }>(rows: T[]) =>
      tenantId === "all" ? rows : rows.filter((row) => row.tenant_id === tenantId),
    [tenantId],
  );
  const scopedAssets = useMemo(
    () =>
      scoped(assets).filter(
        (item) =>
          !search ||
          `${item.name} ${item.source_system ?? ""} ${item.data_category}`
            .toLowerCase()
            .includes(search.toLowerCase()),
      ),
    [assets, scoped, search],
  );
  const scopedContacts = useMemo(
    () =>
      scoped(contacts).filter(
        (item) =>
          !search ||
          `${item.full_name} ${item.email} ${item.contact_type}`
            .toLowerCase()
            .includes(search.toLowerCase()),
      ),
    [contacts, scoped, search],
  );
  const scopedRequests = useMemo(() => scoped(requests), [requests, scoped]);
  const scopedIncidents = useMemo(() => scoped(incidents), [incidents, scoped]);
  const scopedUsage = useMemo(() => scoped(usage), [usage, scoped]);
  const scopedAudit = useMemo(
    () => auditEvents.filter((item) => tenantId === "all" || item.tenant_id === tenantId),
    [auditEvents, tenantId],
  );
  const selectedProfile = profiles.find((profile) => profile.tenant_id === tenantId) ?? null;
  const summary = useMemo(() => {
    const assetsInScope = scoped(assets);
    const usageInScope = scoped(usage);
    return {
      totalAssets: assetsInScope.length,
      sensitiveAssets: assetsInScope.filter(
        (asset) => asset.contains_sensitive_data || asset.sensitivity_level === "sensitive",
      ).length,
      pendingAssets: assetsInScope.filter((asset) => asset.status === "pending_review").length,
      storage: usageInScope.reduce((total, item) => total + Number(item.storage_bytes ?? 0), 0),
      openIncidents: scoped(incidents).filter(
        (item) => !["resolved", "closed"].includes(item.status),
      ).length,
      pendingRequests: scoped(requests).filter(
        (item) => !["completed", "rejected", "cancelled"].includes(item.status),
      ).length,
      missingRetention: assetsInScope.filter(
        (asset) => asset.retention_days == null && !asset.legal_hold,
      ).length,
    };
  }, [assets, incidents, requests, scoped, usage]);
  const complianceChecks = useMemo(() => {
    const hasSecurityIsolation =
      isolationChecks.length > 0 && isolationChecks.every((item) => item.passed);
    const hasUsageSnapshot = scopedUsage.length > 0;
    const hasResponsible = Boolean(
      selectedProfile?.treatment_owner || selectedProfile?.security_contact,
    );
    const hasRightsChannel = scopedContacts.some((contact) =>
      ["legal_representative", "administrator", "security", "hr_prevention"].includes(
        contact.contact_type,
      ),
    );
    const hasSensitiveControls =
      summary.sensitiveAssets === 0 || scopedAssets.every((asset) => asset.has_backup);
    const hasReviewedProfile = selectedProfile?.document_review_status === "verified";
    const hasAuditTrail = scopedAudit.length > 0;
    const hasOpenRiskOwner =
      scopedIncidents.length === 0 || scopedIncidents.every((incident) => incident.assigned_to);
    return [
      {
        title: "Alcance y clasificación regulatoria",
        reference: "Ley 21.663 · servicios esenciales y operadores de importancia vital",
        status: "review",
        detail:
          "Revisa con asesoría jurídica si la empresa o algún cliente cae en el ámbito de servicio esencial u operador de importancia vital.",
      },
      {
        title: "Inventario de tratamientos y activos",
        reference: "Ley 21.719 · transparencia y responsabilidad proactiva",
        status: summary.totalAssets > 0 ? "evidence" : "pending",
        detail:
          summary.totalAssets > 0
            ? `${summary.totalAssets} activo(s) registrado(s) para el alcance seleccionado.`
            : "Registra sistemas, categorías, finalidades, responsables y conjuntos de datos tratados.",
      },
      {
        title: "Finalidad y base de licitud",
        reference: "Ley 21.719 · principios y deber de información",
        status: "pending",
        detail:
          "Falta modelar por activo la finalidad, base jurídica, categorías de titulares y fuente de los datos.",
      },
      {
        title: "Política de privacidad y transparencia",
        reference: "Ley 21.719 · información pública permanente",
        status: hasReviewedProfile ? "evidence" : "pending",
        detail: hasReviewedProfile
          ? "El perfil indica revisión documental verificada."
          : "Publica versión, fecha, finalidades, bases, seguridad, retención, transferencias y decisiones automatizadas.",
      },
      {
        title: "Responsable y canal para titulares",
        reference:
          "Ley 21.719 · acceso, rectificación, supresión, oposición, portabilidad y bloqueo",
        status: hasResponsible && hasRightsChannel ? "evidence" : "pending",
        detail:
          hasResponsible && hasRightsChannel
            ? "Existe responsable y contacto operativo registrado."
            : "Declara responsable y canal para solicitudes; parametriza SLA y evidencia de respuesta.",
      },
      {
        title: "Retención, bloqueo y eliminación controlada",
        reference: "Ley 21.719 · conservación limitada y derechos del titular",
        status: summary.totalAssets > 0 && summary.missingRetention === 0 ? "evidence" : "pending",
        detail:
          summary.totalAssets > 0 && summary.missingRetention === 0
            ? "Todos los activos tienen retención o una justificación de conservación."
            : "Cada activo debe tener plazo, bloqueo, legal hold y procedimiento de eliminación verificable.",
      },
      {
        title: "Datos sensibles, niños y perfiles de alto riesgo",
        reference: "Ley 21.719 · categorías especiales y decisiones automatizadas",
        status: summary.sensitiveAssets > 0 ? "pending" : "review",
        detail:
          summary.sensitiveAssets > 0
            ? "Hay datos sensibles declarados; documenta salvaguardas, base legal y evaluación reforzada."
            : "Confirma si existen datos sensibles, de menores o perfilamiento con efectos significativos.",
      },
      {
        title: "Evaluación de impacto (DPIA)",
        reference: "Ley 21.719 · tratamientos de alto riesgo y artículo 15 ter",
        status: "pending",
        detail:
          "La aplicación aún no registra DPIA, aprobación, riesgos, medidas mitigadoras ni revisión posterior.",
      },
      {
        title: "Encargados, proveedores y transferencias",
        reference: "Ley 21.719 · contratos de encargo y transferencias internacionales",
        status: "pending",
        detail:
          "Falta registrar proveedor, país, mecanismo de transferencia, cláusulas, subencargados y fecha de revisión.",
      },
      {
        title: "Seguridad, mínimo privilegio y aislamiento",
        reference: "Ley 21.719 y Ley 21.663 · seguridad y privacidad desde el diseño",
        status: hasSecurityIsolation ? "evidence" : "pending",
        detail: hasSecurityIsolation
          ? "Las verificaciones de aislamiento disponibles están aprobadas."
          : "Conserva evidencia de RLS, MFA, mínimo privilegio, cifrado, logs y pruebas de aislamiento.",
      },
      {
        title: "Backups, restauración y continuidad",
        reference: "Ley 21.719 · capacidad de restaurar; Ley 21.663 · resiliencia",
        status: hasSensitiveControls ? "evidence" : "pending",
        detail: hasSensitiveControls
          ? "Los activos declarados no sensibles o cuentan con backup registrado."
          : "Hay activos sensibles sin backup declarado; documenta RPO/RTO y pruebas de restauración.",
      },
      {
        title: "Gestión y notificación de incidentes",
        reference: "Ley 21.719 · vulneraciones; Ley 21.663 · prevención, contención y respuesta",
        status: hasAuditTrail && hasOpenRiskOwner ? "evidence" : "pending",
        detail:
          hasAuditTrail && hasOpenRiskOwner
            ? "Existe trazabilidad y los incidentes registrados tienen responsable."
            : "Configura playbook, severidad, responsable, línea de tiempo, evidencia y comunicaciones.",
      },
      {
        title: "Registro de evidencias y auditoría",
        reference: "Ley 21.719 · responsabilidad demostrable",
        status: hasAuditTrail ? "evidence" : "pending",
        detail: hasAuditTrail
          ? `${scopedAudit.length} evento(s) de gobierno registrados para el alcance seleccionado.`
          : "Registra revisiones, accesos, decisiones, excepciones y aprobaciones sin secretos.",
      },
      {
        title: "Gestión de vulnerabilidades y cambios",
        reference: "Ley 21.663 · gestión de riesgos y seguridad operacional",
        status: "pending",
        detail:
          "Falta integrar evidencia de parches, dependencias, pruebas de penetración, cambios y remediación.",
      },
      {
        title: "Modelo de prevención y delegado",
        reference: "Ley 21.719 · delegado y modelo de prevención voluntarios",
        status: hasResponsible ? "review" : "pending",
        detail: hasResponsible
          ? "Hay responsable técnico declarado; valida si la empresa adoptará un modelo de prevención certificado."
          : "Define si se designará delegado o se adoptará un modelo de prevención; requiere revisión jurídica.",
      },
      {
        title: "Snapshots de operación y capacidad",
        reference: "Ley 21.663 · disponibilidad, resiliencia y monitoreo",
        status: hasUsageSnapshot ? "evidence" : "pending",
        detail: hasUsageSnapshot
          ? "Existe snapshot de uso para el alcance seleccionado."
          : "Configura captura periódica de usuarios, registros, archivos, almacenamiento y errores.",
      },
    ] as const;
  }, [
    isolationChecks,
    scopedAudit,
    scopedAssets,
    scopedContacts,
    scopedIncidents,
    scopedUsage,
    selectedProfile,
    summary,
  ]);

  const load = useCallback(async () => {
    setLoading(true);
    const [
      assetResult,
      contactResult,
      usageResult,
      requestResult,
      incidentResult,
      auditResult,
      profileResult,
      ipRuleResult,
      isolationResult,
      catalogResult,
      ipHistoryResult,
    ] = await Promise.all([
      supabase
        .from("saas_data_assets")
        .select(
          "id,tenant_id,name,description,source_system,data_category,sensitivity_level,owner_name,location,record_count,storage_bytes,sync_frequency,last_synced_at,retention_days,status,contains_personal_data,contains_sensitive_data,has_backup,legal_hold",
        )
        .order("created_at", { ascending: false })
        .limit(1000),
      supabase
        .from("saas_tenant_contacts")
        .select(
          "id,tenant_id,full_name,job_title,email,phone,whatsapp,contact_type,is_primary,can_authorize_changes,can_view_data,verified_at,status",
        )
        .order("created_at", { ascending: false })
        .limit(1000),
      supabase
        .from("saas_tenant_usage_daily")
        .select(
          "tenant_id,usage_date,active_users,records_count,files_count,storage_bytes,processing_jobs,imports_count,exports_count,api_calls,processing_errors,plan_storage_limit_bytes",
        )
        .order("usage_date", { ascending: false })
        .limit(1000),
      supabase
        .from("saas_data_requests")
        .select(
          "id,tenant_id,request_type,status,asset_id,requested_by,reason,scheduled_for,created_at",
        )
        .order("created_at", { ascending: false })
        .limit(1000),
      supabase
        .from("saas_data_incidents")
        .select(
          "id,tenant_id,title,description,severity,status,asset_id,assigned_to,detected_at,resolved_at",
        )
        .order("detected_at", { ascending: false })
        .limit(1000),
      supabase
        .from("saas_data_audit_events")
        .select("id,tenant_id,action,resource_type,classification,outcome,created_at")
        .order("created_at", { ascending: false })
        .limit(1000),
      supabase
        .from("saas_data_governance_profiles")
        .select(
          "tenant_id,maturity_level,treatment_owner,security_contact,storage_region,default_retention_days,has_personal_data,has_sensitive_data,document_review_status,last_reviewed_at",
        )
        .limit(1000),
      supabase
        .from("saas_ip_access_rules")
        .select("id,tenant_id,label,mode,network,active,priority,expires_at,notes")
        .order("priority", { ascending: true })
        .order("created_at", { ascending: false })
        .limit(1000),
      supabase.rpc("verify_saas_log_isolation"),
      supabase.rpc("fetch_saas_tenant_data_catalog", { _tenant_id: null }),
      supabase.rpc("fetch_saas_tenant_ip_history", { _tenant_id: null }).limit(1000),
    ]);
    type ResultWithError = { error?: { code?: string; message?: string } | null };
    const errors = (
      [
        ["activos", assetResult],
        ["contactos", contactResult],
        ["uso", usageResult],
        ["solicitudes", requestResult],
        ["incidentes", incidentResult],
        ["auditoría", auditResult],
        ["perfiles", profileResult],
        ["reglas IP", ipRuleResult],
        ["aislamiento", isolationResult],
        ["catálogo operativo", catalogResult],
        ["historial IP", ipHistoryResult],
      ] as Array<[string, ResultWithError]>
    ).filter(([, result]) => result.error && result.error.code !== "42P01");
    if (errors.length)
      setMessage(
        `No se pudieron cargar todos los datos de Gobierno de Datos: ${errors.map(([label, result]) => `${label}: ${result.error?.message ?? "error desconocido"}`).join(" · ")}`,
      );
    setAssets((assetResult.data ?? []) as Asset[]);
    setContacts((contactResult.data ?? []) as Contact[]);
    setUsage((usageResult.data ?? []) as Usage[]);
    setRequests((requestResult.data ?? []) as Request[]);
    setIncidents((incidentResult.data ?? []) as Incident[]);
    setAuditEvents((auditResult.data ?? []) as AuditEvent[]);
    setProfiles((profileResult.data ?? []) as GovernanceProfile[]);
    setIpRules((ipRuleResult.data ?? []) as IpRule[]);
    setCatalog((catalogResult.data ?? []) as CatalogRow[]);
    setIpHistory((ipHistoryResult.data ?? []) as IpHistory[]);
    setIsolationChecks(
      (isolationResult.data ?? []) as Array<{
        check_name: string;
        passed: boolean;
        detail: string;
      }>,
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    if (tenantId !== "all" && !tenants.some((tenant) => tenant.tenant_id === tenantId))
      setTenantId(tenants[0]?.tenant_id ?? "all");
  }, [tenantId, tenants]);

  async function recordAudit(
    action: string,
    resourceType: string,
    resourceId?: string,
    classification?: string,
  ) {
    if (!tenantId || tenantId === "all") return;
    await supabase.rpc("record_saas_data_audit", {
      _tenant_id: tenantId,
      _action: action,
      _resource_type: resourceType,
      _resource_id: resourceId ?? null,
      _classification: classification ?? null,
      _metadata: {},
    });
  }
  async function saveIpRule() {
    if (!ipRuleForm) return;
    setBusy(true);
    const { data, error } = await supabase
      .from("saas_ip_access_rules")
      .insert({
        label: ipRuleForm.label.trim(),
        mode: ipRuleForm.mode,
        network: ipRuleForm.network.trim(),
        priority: Number(ipRuleForm.priority) || 100,
        expires_at: ipRuleForm.expires_at || null,
        notes: ipRuleForm.notes.trim() || null,
        tenant_id: ipRuleForm.tenant_id || null,
      })
      .select("id,tenant_id,label,mode,network,active,priority,expires_at,notes")
      .single();
    if (error) setMessage(error.message);
    else {
      setIpRules((rows) => [...rows, data as IpRule].sort((a, b) => a.priority - b.priority));
      setIpRuleForm(null);
      setMessage("Regla IP registrada. La blacklist se evalúa antes que cualquier whitelist.");
    }
    setBusy(false);
  }
  async function deactivateIpRule(rule: IpRule) {
    setBusy(true);
    const { error } = await supabase
      .from("saas_ip_access_rules")
      .update({ active: false })
      .eq("id", rule.id);
    if (error) setMessage(error.message);
    else {
      setIpRules((rows) =>
        rows.map((item) => (item.id === rule.id ? { ...item, active: false } : item)),
      );
      setMessage("Regla IP desactivada; no se eliminó la trazabilidad.");
    }
    setBusy(false);
  }
  async function saveAsset() {
    if (!assetForm || tenantId === "all") return;
    setBusy(true);
    const { data, error } = await supabase
      .from("saas_data_assets")
      .insert({
        ...assetForm,
        tenant_id: tenantId,
        record_count: Number(assetForm.record_count) || 0,
        storage_bytes: Number(assetForm.storage_bytes) || 0,
        retention_days: assetForm.retention_days ? Number(assetForm.retention_days) : null,
      })
      .select("*")
      .single();
    if (error) setMessage(error.message);
    else {
      setAssets((rows) => [data as Asset, ...rows]);
      await recordAudit("data_asset.create", "data_asset", data.id, assetForm.sensitivity_level);
      setAssetForm(null);
      setMessage("Activo de datos registrado.");
    }
    setBusy(false);
  }
  async function saveContact() {
    if (!contactForm || tenantId === "all") return;
    setBusy(true);
    const { data, error } = await supabase
      .from("saas_tenant_contacts")
      .insert({
        ...contactForm,
        tenant_id: tenantId,
        email: contactForm.email.trim().toLowerCase(),
      })
      .select("*")
      .single();
    if (error) setMessage(error.message);
    else {
      setContacts((rows) => [data as Contact, ...rows]);
      await recordAudit("tenant_contact.create", "tenant_contact", data.id);
      setContactForm(null);
      setMessage("Contacto autorizado registrado.");
    }
    setBusy(false);
  }
  async function saveIncident() {
    if (!incidentForm || tenantId === "all") return;
    setBusy(true);
    const { data, error } = await supabase
      .from("saas_data_incidents")
      .insert({ ...incidentForm, tenant_id: tenantId, asset_id: incidentForm.asset_id || null })
      .select("*")
      .single();
    if (error) setMessage(error.message);
    else {
      setIncidents((rows) => [data as Incident, ...rows]);
      await recordAudit("data_incident.create", "data_incident", data.id);
      setIncidentForm(null);
      setMessage("Incidente registrado.");
    }
    setBusy(false);
  }
  async function createRequest(type: Request["request_type"], asset?: Asset) {
    if (tenantId === "all") {
      setMessage("Selecciona una empresa antes de crear una solicitud.");
      return;
    }
    const reason = window.prompt(
      `Motivo de la solicitud de ${type}:`,
      asset ? `Revisión del activo ${asset.name}` : "",
    );
    if (!reason?.trim()) return;
    const { data, error } = await supabase
      .from("saas_data_requests")
      .insert({
        tenant_id: tenantId,
        request_type: type,
        asset_id: asset?.id ?? null,
        reason: reason.trim(),
        requested_by: "Operador de plataforma",
      })
      .select(
        "id,tenant_id,request_type,status,asset_id,requested_by,reason,scheduled_for,created_at",
      )
      .single();
    if (error) setMessage(error.message);
    else {
      setRequests((rows) => [data as Request, ...rows]);
      await recordAudit(`data_request.${type}`, "data_request", data.id, asset?.sensitivity_level);
      setMessage("Solicitud registrada para revisión.");
    }
  }

  if (loading) return <Spinner />;
  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-3xl border border-violet-100 bg-gradient-to-br from-violet-50 to-white p-5 shadow-sm">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-violet-700">
            Gobierno de datos
          </p>
          <h2 className="mt-1 text-xl font-black text-slate-950">
            Control de los datos que custodia tu SaaS
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Inventario, consumo, responsables, retención y riesgos por empresa. Las solicitudes
            sensibles requieren revisión; no se elimina información automáticamente.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()}>
          <RefreshCw size={14} /> Actualizar
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
      <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm lg:flex-row lg:items-center">
        <Select
          value={tenantId}
          onChange={(event) => setTenantId(event.target.value)}
          className="lg:max-w-xs"
        >
          <option value="all">Todas las empresas</option>
          {tenants.map((tenant) => (
            <option key={tenant.tenant_id} value={tenant.tenant_id}>
              {tenant.tenant_name}
            </option>
          ))}
        </Select>
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar activos, contactos o categorías…"
          className="flex-1"
        />
        <div className="flex gap-1 overflow-x-auto">
          {tabItems.map((item) => (
            <button
              type="button"
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`min-h-10 shrink-0 rounded-xl px-3 py-2 text-xs font-bold ${tab === item.id ? "bg-slate-950 text-white" : "text-slate-500 hover:bg-slate-100"}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "catalog" && (
        <Panel
          title="Datos operativos por empresa"
          subtitle="Conteo de registros por tabla con tenant_id. Se muestran metadatos y cantidades, no filas personales ni contenido sensible."
        >
          <div className="mb-4 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-xs text-blue-900">
            El DevTeam puede verificar qué módulos contienen datos en cada empresa sin convertir
            esta pantalla en un exportador masivo. Para revisar o editar registros, utiliza el
            módulo operativo correspondiente con el selector de empresa.
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-xs">
              <thead className="border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-3 py-3">Empresa</th>
                  <th>Tabla / módulo</th>
                  <th className="text-right">Registros</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {catalog
                  .filter(
                    (row) =>
                      (tenantId === "all" || row.tenant_id === tenantId) &&
                      row.row_count > 0 &&
                      (!search || row.table_name.toLowerCase().includes(search.toLowerCase())),
                  )
                  .map((row) => (
                    <tr key={`${row.tenant_id}-${row.table_name}`}>
                      <td className="px-3 py-3 font-bold text-slate-700">
                        {tenantName(tenants, row.tenant_id)}
                      </td>
                      <td className="font-mono text-[11px] text-slate-600">{row.table_name}</td>
                      <td className="text-right font-black text-slate-900">
                        {Number(row.row_count).toLocaleString()}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
            {!catalog.some(
              (row) => (tenantId === "all" || row.tenant_id === tenantId) && row.row_count > 0,
            ) && (
              <EmptyState
                icon={<Database size={28} />}
                message="No hay registros operativos para este filtro o el catálogo aún no se ha sincronizado."
              />
            )}
          </div>
        </Panel>
      )}

      {tab === "compliance" && (
        <div className="space-y-4">
          <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 shrink-0 text-amber-700" size={20} />
              <div>
                <h3 className="text-sm font-black text-amber-950">
                  Cumplimiento Chile · hoja de ruta
                </h3>
                <p className="mt-1 text-xs leading-5 text-amber-900">
                  Esta subsección organiza evidencia técnica y operativa; no constituye
                  certificación ni asesoría jurídica. La Ley 21.719 es de protección de datos
                  personales, no la Ley Marco de Ciberseguridad. La versión oficial consultada
                  indica vigencia diferida al 1 de diciembre de 2026; existe una propuesta pública
                  para postergarla a 2027, aún sujeta a tramitación.
                </p>
                <div className="mt-3 flex flex-wrap gap-3 text-[11px] font-bold">
                  <a
                    className="text-amber-800 underline"
                    href="https://www.bcn.cl/leychile/navegar?idNorma=1209272"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Texto oficial Ley 21.719
                  </a>
                  <a
                    className="text-amber-800 underline"
                    href="https://www.bcn.cl/leychile/navegar?idNorma=1202434"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Ley 21.663 · ciberseguridad
                  </a>
                </div>
              </div>
            </div>
          </section>
          <Panel
            title="Checklist de evidencia"
            subtitle="El estado refleja datos disponibles en BJSIGAPP para la empresa seleccionada; pendiente no significa automáticamente incumplimiento legal."
          >
            <div className="grid gap-3 lg:grid-cols-2">
              {complianceChecks.map((check) => {
                const evidenced = check.status === "evidence";
                const needsReview = check.status === "review";
                return (
                  <div
                    key={check.title}
                    className={`rounded-2xl border p-4 ${evidenced ? "border-emerald-200 bg-emerald-50/60" : needsReview ? "border-blue-200 bg-blue-50/60" : "border-amber-200 bg-amber-50/40"}`}
                  >
                    <div className="flex items-start gap-3">
                      {evidenced ? (
                        <ShieldCheck className="mt-0.5 shrink-0 text-emerald-600" size={18} />
                      ) : (
                        <ShieldAlert
                          className={`mt-0.5 shrink-0 ${needsReview ? "text-blue-600" : "text-amber-600"}`}
                          size={18}
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h4 className="text-xs font-black text-slate-900">{check.title}</h4>
                          <span
                            className={`rounded-full px-2 py-1 text-[10px] font-black ${evidenced ? "bg-emerald-100 text-emerald-800" : needsReview ? "bg-blue-100 text-blue-800" : "bg-amber-100 text-amber-800"}`}
                          >
                            {evidenced
                              ? "Evidencia disponible"
                              : needsReview
                                ? "Revisión jurídica"
                                : "Pendiente"}
                          </span>
                        </div>
                        <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          {check.reference}
                        </p>
                        <p className="mt-2 text-xs leading-5 text-slate-600">{check.detail}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>
          <div className="grid gap-4 lg:grid-cols-3">
            <Panel
              title="Brechas de producto"
              subtitle="Capacidades aún no modeladas en el módulo."
            >
              <ul className="space-y-2 text-xs text-slate-600">
                <li>• Evaluaciones de impacto de alto riesgo (DPIA).</li>
                <li>• Registro de bases de licitud y finalidades por activo.</li>
                <li>• Encargados, contratos y transferencias internacionales.</li>
              </ul>
            </Panel>
            <Panel
              title="Operación de incidentes"
              subtitle="Evidencia que debe mantenerse vigente."
            >
              <ul className="space-y-2 text-xs text-slate-600">
                <li>• Responsable, severidad, línea de tiempo y acciones tomadas.</li>
                <li>• Registro de comunicaciones a autoridad y titulares cuando corresponda.</li>
                <li>• Pruebas de restauración y continuidad.</li>
              </ul>
            </Panel>
            <Panel title="Gobernanza" subtitle="Responsabilidades y revisión periódica.">
              <ul className="space-y-2 text-xs text-slate-600">
                <li>• Responsable de tratamiento y contacto para titulares.</li>
                <li>• Revisión de perfil, retención y proveedores.</li>
                <li>• Evidencia exportable para auditoría interna.</li>
              </ul>
            </Panel>
          </div>
        </div>
      )}

      {tab === "summary" && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric
              icon={<Database size={17} />}
              label="Activos registrados"
              value={summary.totalAssets}
              detail={`${summary.pendingAssets} pendientes de revisión`}
            />
            <Metric
              icon={<LockKeyhole size={17} />}
              label="Datos sensibles"
              value={summary.sensitiveAssets}
              detail="requieren control reforzado"
              tone="red"
            />
            <Metric
              icon={<HardDrive size={17} />}
              label="Almacenamiento"
              value={formatBytes(summary.storage)}
              detail="último snapshot disponible"
              tone="blue"
            />
            <Metric
              icon={<AlertTriangle size={17} />}
              label="Riesgo pendiente"
              value={summary.openIncidents + summary.pendingRequests}
              detail={`${summary.openIncidents} incidentes · ${summary.pendingRequests} solicitudes`}
              tone="amber"
            />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Cobertura por empresa</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Empresas con perfil y activos declarados.
                  </p>
                </div>
                <ShieldCheck className="text-violet-600" size={19} />
              </div>
              <div className="mt-4 space-y-2">
                {tenants.slice(0, 8).map((tenant) => {
                  const profile = profiles.find((item) => item.tenant_id === tenant.tenant_id);
                  const count = assets.filter(
                    (asset) => asset.tenant_id === tenant.tenant_id,
                  ).length;
                  return (
                    <div
                      key={tenant.tenant_id}
                      className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-2"
                    >
                      <span className="min-w-0 flex-1 truncate text-xs font-bold text-slate-700">
                        {tenant.tenant_name}
                      </span>
                      <span
                        className={`rounded-full border px-2 py-1 text-[10px] font-bold ${profile ? tone(profile.document_review_status) : "border-amber-200 bg-amber-50 text-amber-700"}`}
                      >
                        {profile ? profile.document_review_status : "sin perfil"}
                      </span>
                      <span className="text-[10px] text-slate-500">{count} activos</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="rounded-3xl border border-amber-100 bg-amber-50/60 p-5 shadow-sm">
              <div className="flex items-center gap-2 text-amber-800">
                <FileClock size={18} />
                <h3 className="text-sm font-black">Retención y próximos controles</h3>
              </div>
              <div className="mt-4 space-y-3 text-xs text-amber-950">
                <p>
                  <strong>{summary.missingRetention}</strong> activos no tienen política de
                  retención definida.
                </p>
                <p>
                  <strong>{summary.sensitiveAssets}</strong> activos contienen o declaran datos
                  sensibles.
                </p>
                <p>La retención legal bloquea la eliminación hasta que se libere expresamente.</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setTab("requests")}
                  className="border-amber-200 bg-white"
                >
                  Revisar solicitudes
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "assets" && (
        <Panel
          title="Inventario de activos de datos"
          subtitle="Declara qué datos custodias por empresa y cómo deben tratarse."
          action={
            <Button
              size="sm"
              onClick={() => {
                if (tenantId === "all")
                  setMessage("Selecciona una empresa para registrar un activo.");
                else setAssetForm({ ...emptyAsset });
              }}
            >
              <Plus size={14} /> Registrar activo
            </Button>
          }
        >
          <div className="space-y-3">
            {scopedAssets.length ? (
              scopedAssets.map((asset) => (
                <div key={asset.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-black text-slate-900">{asset.name}</h3>
                        <span
                          className={`rounded-full border px-2 py-1 text-[10px] font-bold ${tone(asset.sensitivity_level)}`}
                        >
                          {asset.sensitivity_level}
                        </span>
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-600">
                          {asset.status}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {tenantName(tenants, asset.tenant_id)} ·{" "}
                        {asset.source_system || "Origen no indicado"} ·{" "}
                        {asset.location || "Ubicación no indicada"}
                      </p>
                      <p className="mt-2 text-xs text-slate-600">
                        {asset.description || "Sin descripción operativa."}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-x-5 gap-y-1 text-right text-[10px] text-slate-500">
                      <span>
                        Registros
                        <strong className="ml-1 text-slate-800">
                          {asset.record_count.toLocaleString()}
                        </strong>
                      </span>
                      <span>
                        Uso
                        <strong className="ml-1 text-slate-800">
                          {formatBytes(asset.storage_bytes)}
                        </strong>
                      </span>
                      <span>
                        Retención
                        <strong className="ml-1 text-slate-800">
                          {asset.retention_days == null
                            ? "Pendiente"
                            : `${asset.retention_days} días`}
                        </strong>
                      </span>
                      <span>
                        Backup
                        <strong className="ml-1 text-slate-800">
                          {asset.has_backup ? "Sí" : "No"}
                        </strong>
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void createRequest("export", asset)}
                      disabled={asset.sensitivity_level === "sensitive"}
                    >
                      Solicitar exportación
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void createRequest("deletion", asset)}
                      disabled={asset.legal_hold}
                    >
                      Programar revisión/eliminación
                    </Button>
                    {asset.legal_hold && (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2 py-1 text-[10px] font-bold text-red-700">
                        <LockKeyhole size={12} /> Legal hold activo
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <EmptyState
                icon={<Database size={28} />}
                message="No hay activos registrados para este filtro."
              />
            )}
          </div>
        </Panel>
      )}

      {tab === "contacts" && (
        <Panel
          title="Contactos autorizados"
          subtitle="Separa representantes, TI, seguridad, facturación y soporte."
          action={
            <Button
              size="sm"
              onClick={() => {
                if (tenantId === "all")
                  setMessage("Selecciona una empresa para registrar un contacto.");
                else setContactForm({ ...emptyContact });
              }}
            >
              <UserPlusIcon /> Agregar contacto
            </Button>
          }
        >
          <div className="grid gap-3 md:grid-cols-2">
            {scopedContacts.length ? (
              scopedContacts.map((contact) => (
                <div key={contact.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                      <Users size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-sm font-black text-slate-900">
                          {contact.full_name}
                        </h3>
                        {contact.is_primary && (
                          <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700">
                            Principal
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">
                        {contact.job_title || contact.contact_type} ·{" "}
                        {tenantName(tenants, contact.tenant_id)}
                      </p>
                      <p className="mt-2 text-xs text-slate-700">
                        {contact.email} · {contact.phone || contact.whatsapp || "Sin teléfono"}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1 text-[10px] font-bold">
                        <span
                          className={`rounded-full border px-2 py-1 ${contact.can_authorize_changes ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-500"}`}
                        >
                          {contact.can_authorize_changes
                            ? "Autoriza cambios"
                            : "No autoriza cambios"}
                        </span>
                        <span
                          className={`rounded-full border px-2 py-1 ${contact.can_view_data ? "border-violet-200 bg-violet-50 text-violet-700" : "border-slate-200 bg-slate-50 text-slate-500"}`}
                        >
                          {contact.can_view_data ? "Puede ver datos" : "Acceso no declarado"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState
                icon={<Users size={28} />}
                message="No hay contactos registrados para este filtro."
              />
            )}
          </div>
        </Panel>
      )}

      {tab === "usage" && (
        <Panel
          title="Uso y almacenamiento"
          subtitle="Snapshots diarios para medir consumo, límites y crecimiento."
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-3 py-3">Empresa</th>
                  <th>Fecha</th>
                  <th>Usuarios</th>
                  <th>Registros</th>
                  <th>Archivos</th>
                  <th>Almacenamiento</th>
                  <th>Errores</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {scopedUsage.length ? (
                  scopedUsage.map((item) => (
                    <tr key={`${item.tenant_id}-${item.usage_date}`}>
                      <td className="px-3 py-3 font-bold text-slate-700">
                        {tenantName(tenants, item.tenant_id)}
                      </td>
                      <td>{item.usage_date}</td>
                      <td>{item.active_users}</td>
                      <td>{item.records_count.toLocaleString()}</td>
                      <td>{item.files_count.toLocaleString()}</td>
                      <td className="font-bold">
                        {formatBytes(item.storage_bytes)}
                        {item.plan_storage_limit_bytes
                          ? ` / ${formatBytes(item.plan_storage_limit_bytes)}`
                          : ""}
                      </td>
                      <td
                        className={
                          item.processing_errors ? "font-bold text-red-600" : "text-slate-500"
                        }
                      >
                        {item.processing_errors}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7}>
                      <EmptyState
                        icon={<HardDrive size={28} />}
                        message="Aún no hay snapshots de uso. Se mostrará 'pendiente de sincronización' hasta que exista una fuente confiable."
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {tab === "requests" && (
        <Panel
          title="Retención y solicitudes"
          subtitle="Gestiona acceso, rectificación, supresión, oposición, portabilidad y bloqueo, además de retención y eliminación."
          action={
            <div className="flex max-w-2xl flex-wrap justify-end gap-1">
              {[
                ["access", "Acceso"],
                ["rectification", "Rectificación"],
                ["suppression", "Supresión"],
                ["opposition", "Oposición"],
                ["portability", "Portabilidad"],
                ["blocking", "Bloqueo"],
                ["retention_review", "Retención"],
              ].map(([type, label]) => (
                <Button
                  key={type}
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (tenantId === "all")
                      setMessage("Selecciona una empresa antes de crear una solicitud.");
                    else void createRequest(type as Request["request_type"]);
                  }}
                >
                  <FilePlus2 size={13} /> {label}
                </Button>
              ))}
            </div>
          }
        >
          <div className="space-y-2">
            {scopedRequests.length ? (
              scopedRequests.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3"
                >
                  <FileClock size={17} className="text-violet-600" />
                  <div className="min-w-[180px] flex-1">
                    <strong className="block text-xs text-slate-800">
                      {item.request_type} · {tenantName(tenants, item.tenant_id)}
                    </strong>
                    <span className="text-[11px] text-slate-500">{item.reason}</span>
                  </div>
                  <span
                    className={`rounded-full border px-2 py-1 text-[10px] font-bold ${tone(item.status)}`}
                  >
                    {item.status}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(item.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))
            ) : (
              <EmptyState icon={<FileClock size={28} />} message="No hay solicitudes pendientes." />
            )}
          </div>
        </Panel>
      )}

      {tab === "audit" && (
        <Panel
          title="Auditoría de datos"
          subtitle="Eventos mínimos y sanitizados de inventario, solicitudes y accesos."
        >
          <div className="space-y-2">
            {scopedAudit.length ? (
              scopedAudit.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-100 px-3 py-2"
                >
                  <History size={15} className="text-slate-400" />
                  <span className="min-w-[180px] flex-1 text-xs font-bold text-slate-700">
                    {item.action}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {item.resource_type} · {item.classification || "sin clasificación"}
                  </span>
                  <span
                    className={`rounded-full border px-2 py-1 text-[10px] font-bold ${tone(item.outcome)}`}
                  >
                    {item.outcome}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(item.created_at).toLocaleString()}
                  </span>
                </div>
              ))
            ) : (
              <EmptyState
                icon={<History size={28} />}
                message="No hay eventos de gobierno registrados."
              />
            )}
          </div>
        </Panel>
      )}

      {tab === "network" && (
        <div className="space-y-4">
          <Panel
            title="Whitelist y blacklist de IP"
            subtitle="Reglas administrativas por alcance global o empresa. La blacklist siempre gana; una whitelist activa convierte el resto en denegado."
            action={
              <Button size="sm" onClick={() => setIpRuleForm({ ...emptyIpRule })}>
                <Plus size={14} /> Nueva regla
              </Button>
            }
          >
            <div className="mb-4 grid gap-3 sm:grid-cols-3">
              <Metric
                icon={<Globe2 size={17} />}
                label="Reglas activas"
                value={ipRules.filter((rule) => rule.active).length}
                detail={`${ipRules.filter((rule) => rule.mode === "whitelist" && rule.active).length} whitelist · ${ipRules.filter((rule) => rule.mode === "blacklist" && rule.active).length} blacklist`}
                tone="blue"
              />
              <Metric
                icon={<ShieldAlert size={17} />}
                label="Bloqueos definidos"
                value={ipRules.filter((rule) => rule.mode === "blacklist" && rule.active).length}
                detail="se evalúan antes que permitir"
                tone="red"
              />
              <Metric
                icon={<ShieldCheck size={17} />}
                label="Aislamiento de logs"
                value={
                  isolationChecks.length
                    ? `${isolationChecks.filter((check) => check.passed).length}/${isolationChecks.length}`
                    : "—"
                }
                detail="checks de RLS y frontera tenant"
                tone="violet"
              />
            </div>
            <div className="space-y-2">
              {ipRules.length ? (
                ipRules.map((rule) => (
                  <div
                    key={rule.id}
                    className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3"
                  >
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-xl ${rule.mode === "blacklist" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}
                    >
                      {rule.mode === "blacklist" ? (
                        <ShieldAlert size={16} />
                      ) : (
                        <ShieldCheck size={16} />
                      )}
                    </span>
                    <div className="min-w-[180px] flex-1">
                      <strong className="block text-xs text-slate-800">{rule.label}</strong>
                      <span className="text-[11px] font-mono text-slate-500">{rule.network}</span>
                      <span className="ml-2 text-[10px] text-slate-400">
                        {rule.tenant_id
                          ? tenantName(tenants, rule.tenant_id)
                          : "Todas las empresas"}
                      </span>
                    </div>
                    <span
                      className={`rounded-full border px-2 py-1 text-[10px] font-bold ${rule.mode === "blacklist" ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}
                    >
                      {rule.mode === "blacklist" ? "BLACKLIST" : "WHITELIST"}
                    </span>
                    <span
                      className={`rounded-full border px-2 py-1 text-[10px] font-bold ${rule.active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-500"}`}
                    >
                      {rule.active ? "Activa" : "Inactiva"}
                    </span>
                    {rule.active && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busy}
                        onClick={() => void deactivateIpRule(rule)}
                      >
                        Desactivar
                      </Button>
                    )}
                  </div>
                ))
              ) : (
                <EmptyState
                  icon={<Globe2 size={28} />}
                  message="No hay reglas IP activas. El acceso se mantiene permitido por defecto hasta definir una whitelist."
                />
              )}
            </div>
          </Panel>
          <Panel
            title="Historial de IPs observadas"
            subtitle="IPs registradas por auditoría, intentos de inicio de sesión y actividad; el historial no reemplaza un firewall ni una whitelist."
          >
            <div className="space-y-2">
              {ipHistory
                .filter((item) => tenantId === "all" || item.tenant_id === tenantId)
                .map((item, index) => (
                  <div
                    key={`${item.tenant_id}-${item.ip_address}-${item.observed_at}-${index}`}
                    className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-100 px-3 py-3"
                  >
                    <Globe2 size={15} className="text-slate-400" />
                    <span className="min-w-[150px] flex-1 font-mono text-xs font-bold text-slate-800">
                      {item.ip_address}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {tenantName(tenants, item.tenant_id)} · {item.source}
                    </span>
                    <span
                      className={`rounded-full border px-2 py-1 text-[10px] font-bold ${item.outcome === "failed" || item.outcome === "denied" ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}
                    >
                      {item.outcome}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(item.observed_at).toLocaleString()}
                    </span>
                  </div>
                ))}
              {!ipHistory.some((item) => tenantId === "all" || item.tenant_id === tenantId) && (
                <EmptyState
                  icon={<Globe2 size={28} />}
                  message="No hay IPs históricas registradas para este alcance."
                />
              )}
            </div>
          </Panel>
          <Panel
            title="Verificación de aislamiento de actividad"
            subtitle="Checklist ejecutado en Supabase. El dueño de plataforma puede auditar globalmente; cada tenant sólo debe ver sus propios logs."
            action={
              <Button variant="outline" size="sm" onClick={() => void load()}>
                <RefreshCw size={14} /> Ejecutar check
              </Button>
            }
          >
            <div className="space-y-2">
              {isolationChecks.map((check) => (
                <div
                  key={check.check_name}
                  className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-3"
                >
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-lg ${check.passed ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}
                  >
                    {check.passed ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <strong className="block text-xs text-slate-800">{check.check_name}</strong>
                    <span className="text-[11px] text-slate-500">{check.detail}</span>
                  </div>
                  <span
                    className={`rounded-full border px-2 py-1 text-[10px] font-bold ${check.passed ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}
                  >
                    {check.passed ? "OK" : "Revisar"}
                  </span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      )}

      {tab === "incidents" && (
        <Panel
          title="Incidentes de datos"
          subtitle="Registra riesgos, brechas potenciales y acciones de contención."
          action={
            <Button
              size="sm"
              onClick={() => {
                if (tenantId === "all")
                  setMessage("Selecciona una empresa para registrar un incidente.");
                else setIncidentForm({ ...emptyIncident });
              }}
            >
              <AlertTriangle size={14} /> Registrar incidente
            </Button>
          }
        >
          <div className="space-y-2">
            {scopedIncidents.length ? (
              scopedIncidents.map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="min-w-0 flex-1 text-sm font-black text-slate-900">
                      {item.title}
                    </h3>
                    <span
                      className={`rounded-full border px-2 py-1 text-[10px] font-bold ${tone(item.severity)}`}
                    >
                      {item.severity}
                    </span>
                    <span
                      className={`rounded-full border px-2 py-1 text-[10px] font-bold ${tone(item.status)}`}
                    >
                      {item.status}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-600">{item.description}</p>
                  <p className="mt-2 text-[10px] text-slate-400">
                    {tenantName(tenants, item.tenant_id)} · Detectado{" "}
                    {new Date(item.detected_at).toLocaleString()} · Responsable:{" "}
                    {item.assigned_to || "sin asignar"}
                  </p>
                </div>
              ))
            ) : (
              <EmptyState
                icon={<AlertTriangle size={28} />}
                message="No hay incidentes registrados."
              />
            )}
          </div>
        </Panel>
      )}

      {assetForm && (
        <AssetModal
          form={assetForm}
          setForm={setAssetForm}
          busy={busy}
          onClose={() => setAssetForm(null)}
          onSave={() => void saveAsset()}
        />
      )}
      {contactForm && (
        <ContactModal
          form={contactForm}
          setForm={setContactForm}
          busy={busy}
          onClose={() => setContactForm(null)}
          onSave={() => void saveContact()}
        />
      )}
      {incidentForm && (
        <IncidentModal
          form={incidentForm}
          setForm={setIncidentForm}
          assets={scopedAssets}
          busy={busy}
          onClose={() => setIncidentForm(null)}
          onSave={() => void saveIncident()}
        />
      )}
      {ipRuleForm && (
        <IpRuleModal
          form={ipRuleForm}
          tenants={tenants}
          busy={busy}
          setForm={setIpRuleForm}
          onClose={() => setIpRuleForm(null)}
          onSave={() => void saveIpRule()}
        />
      )}
    </section>
  );
}

function Metric({
  icon,
  label,
  value,
  detail,
  tone: color = "violet",
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  detail: string;
  tone?: "violet" | "red" | "blue" | "amber";
}) {
  const tones = {
    violet: "border-violet-100 bg-violet-50/60 text-violet-700",
    red: "border-red-100 bg-red-50/60 text-red-700",
    blue: "border-blue-100 bg-blue-50/60 text-blue-700",
    amber: "border-amber-100 bg-amber-50/60 text-amber-700",
  };
  return (
    <div className={`rounded-2xl border p-4 ${tones[color]}`}>
      <div className="flex items-center justify-between text-xs font-bold">
        <span>{label}</span>
        {icon}
      </div>
      <strong className="mt-2 block text-2xl font-black text-slate-950">{value}</strong>
      <span className="mt-1 block text-[10px] text-slate-600">{detail}</span>
    </div>
  );
}
function Panel({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-black text-slate-900">{title}</h2>
          <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}
function UserPlusIcon() {
  return <Users size={14} />;
}
function FieldGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2">{children}</div>;
}
function CheckField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs font-bold text-slate-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 accent-violet-600"
      />
      {label}
    </label>
  );
}
function AssetModal({
  form,
  setForm,
  busy,
  onClose,
  onSave,
}: {
  form: typeof emptyAsset;
  setForm: (form: typeof emptyAsset) => void;
  busy: boolean;
  onClose: () => void;
  onSave: () => void;
}) {
  const update = (key: keyof typeof emptyAsset, value: string | boolean) =>
    setForm({ ...form, [key]: value as never });
  return (
    <Modal open onClose={onClose} title="Registrar activo de datos" size="lg">
      <div className="space-y-4">
        <p className="rounded-xl border border-violet-100 bg-violet-50 p-3 text-xs text-violet-900">
          No subas documentos aquí. Registra sólo metadatos del conjunto de datos y referencias a su
          ubicación privada.
        </p>
        <FieldGrid>
          <Input
            label="Nombre"
            value={form.name}
            onChange={(event) => update("name", event.target.value)}
          />
          <Input
            label="Sistema de origen"
            value={form.source_system}
            onChange={(event) => update("source_system", event.target.value)}
          />
          <Input
            label="Categoría"
            value={form.data_category}
            onChange={(event) => update("data_category", event.target.value)}
            placeholder="trabajadores, documentos…"
          />
          <Input
            label="Responsable"
            value={form.owner_name}
            onChange={(event) => update("owner_name", event.target.value)}
          />
          <Input
            label="Ubicación lógica"
            value={form.location}
            onChange={(event) => update("location", event.target.value)}
            placeholder="Base principal, storage…"
          />
          <Input
            label="Frecuencia"
            value={form.sync_frequency}
            onChange={(event) => update("sync_frequency", event.target.value)}
            placeholder="Diaria, tiempo real…"
          />
          <Input
            label="Registros"
            type="number"
            min="0"
            value={form.record_count}
            onChange={(event) => update("record_count", event.target.value)}
          />
          <Input
            label="Bytes"
            type="number"
            min="0"
            value={form.storage_bytes}
            onChange={(event) => update("storage_bytes", event.target.value)}
          />
          <Input
            label="Retención en días"
            type="number"
            min="0"
            placeholder="Vacío = indefinida"
            value={form.retention_days}
            onChange={(event) => update("retention_days", event.target.value)}
          />
          <Select
            label="Clasificación"
            value={form.sensitivity_level}
            onChange={(event) => update("sensitivity_level", event.target.value)}
          >
            <option value="public">Público</option>
            <option value="internal">Interno</option>
            <option value="confidential">Confidencial</option>
            <option value="personal">Personal</option>
            <option value="sensitive">Sensible/restringido</option>
          </Select>
        </FieldGrid>
        <Textarea
          label="Descripción"
          rows={3}
          value={form.description}
          onChange={(event) => update("description", event.target.value)}
        />
        <div className="grid gap-2 sm:grid-cols-2">
          <CheckField
            label="Contiene datos personales"
            checked={form.contains_personal_data}
            onChange={(value) => update("contains_personal_data", value)}
          />
          <CheckField
            label="Contiene datos sensibles"
            checked={form.contains_sensitive_data}
            onChange={(value) => update("contains_sensitive_data", value)}
          />
          <CheckField
            label="Tiene respaldo conocido"
            checked={form.has_backup}
            onChange={(value) => update("has_backup", value)}
          />
          <CheckField
            label="Retención legal activa"
            checked={form.legal_hold}
            onChange={(value) => update("legal_hold", value)}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={onSave} disabled={busy || form.name.trim().length < 2}>
            Guardar activo
          </Button>
        </div>
      </div>
    </Modal>
  );
}
function ContactModal({
  form,
  setForm,
  busy,
  onClose,
  onSave,
}: {
  form: typeof emptyContact;
  setForm: (form: typeof emptyContact) => void;
  busy: boolean;
  onClose: () => void;
  onSave: () => void;
}) {
  const update = (key: keyof typeof emptyContact, value: string | boolean) =>
    setForm({ ...form, [key]: value as never });
  return (
    <Modal open onClose={onClose} title="Agregar contacto autorizado">
      <div className="space-y-4">
        <FieldGrid>
          <Input
            label="Nombre completo"
            value={form.full_name}
            onChange={(event) => update("full_name", event.target.value)}
          />
          <Input
            label="Cargo"
            value={form.job_title}
            onChange={(event) => update("job_title", event.target.value)}
          />
          <Input
            label="Correo"
            type="email"
            value={form.email}
            onChange={(event) => update("email", event.target.value)}
          />
          <Input
            label="Teléfono"
            value={form.phone}
            onChange={(event) => update("phone", event.target.value)}
          />
          <Input
            label="WhatsApp"
            value={form.whatsapp}
            onChange={(event) => update("whatsapp", event.target.value)}
          />
          <Select
            label="Tipo de contacto"
            value={form.contact_type}
            onChange={(event) => update("contact_type", event.target.value)}
          >
            <option value="legal_representative">Representante legal</option>
            <option value="administrator">Administrador</option>
            <option value="it">TI</option>
            <option value="security">Seguridad</option>
            <option value="billing">Facturación</option>
            <option value="hr_prevention">RR. HH./Prevención</option>
            <option value="emergency">Emergencia</option>
            <option value="support">Soporte</option>
          </Select>
        </FieldGrid>
        <div className="grid gap-2">
          <CheckField
            label="Contacto principal"
            checked={form.is_primary}
            onChange={(value) => update("is_primary", value)}
          />
          <CheckField
            label="Puede autorizar cambios"
            checked={form.can_authorize_changes}
            onChange={(value) => update("can_authorize_changes", value)}
          />
          <CheckField
            label="Puede ver datos"
            checked={form.can_view_data}
            onChange={(value) => update("can_view_data", value)}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={onSave}
            disabled={busy || form.full_name.trim().length < 2 || !form.email.includes("@")}
          >
            Guardar contacto
          </Button>
        </div>
      </div>
    </Modal>
  );
}
function IncidentModal({
  form,
  setForm,
  assets,
  busy,
  onClose,
  onSave,
}: {
  form: typeof emptyIncident;
  setForm: (form: typeof emptyIncident) => void;
  assets: Asset[];
  busy: boolean;
  onClose: () => void;
  onSave: () => void;
}) {
  const update = (key: keyof typeof emptyIncident, value: string) =>
    setForm({ ...form, [key]: value });
  return (
    <Modal open onClose={onClose} title="Registrar incidente de datos">
      <div className="space-y-4">
        <Input
          label="Título"
          value={form.title}
          onChange={(event) => update("title", event.target.value)}
        />
        <Textarea
          label="Descripción"
          rows={4}
          value={form.description}
          onChange={(event) => update("description", event.target.value)}
        />
        <FieldGrid>
          <Select
            label="Severidad"
            value={form.severity}
            onChange={(event) => update("severity", event.target.value)}
          >
            <option value="low">Baja</option>
            <option value="medium">Media</option>
            <option value="high">Alta</option>
            <option value="critical">Crítica</option>
          </Select>
          <Input
            label="Responsable"
            value={form.assigned_to}
            onChange={(event) => update("assigned_to", event.target.value)}
          />
          <Select
            label="Activo afectado"
            value={form.asset_id}
            onChange={(event) => update("asset_id", event.target.value)}
          >
            <option value="">No especificado</option>
            {assets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.name}
              </option>
            ))}
          </Select>
          <Input
            label="Acciones tomadas"
            value={form.actions_taken}
            onChange={(event) => update("actions_taken", event.target.value)}
          />
        </FieldGrid>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={onSave}
            disabled={busy || form.title.trim().length < 3 || form.description.trim().length < 5}
          >
            Guardar incidente
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function IpRuleModal({
  form,
  tenants,
  busy,
  setForm,
  onClose,
  onSave,
}: {
  form: typeof emptyIpRule;
  tenants: GovernanceTenant[];
  busy: boolean;
  setForm: (form: typeof emptyIpRule) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const update = (key: keyof typeof emptyIpRule, value: string) =>
    setForm({ ...form, [key]: value });
  const looksLikeCidr =
    /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/.test(form.network.trim()) || form.network.includes(":/");
  return (
    <Modal open onClose={onClose} title="Nueva regla de acceso IP" size="lg">
      <div className="space-y-4">
        <p className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs text-amber-900">
          Define redes CIDR, por ejemplo <strong>203.0.113.10/32</strong> para una IP o{" "}
          <strong>203.0.113.0/24</strong> para un rango. La aplicación no sustituye el firewall, VPN
          o gateway de producción.
        </p>
        <FieldGrid>
          <Input
            label="Nombre de la regla"
            value={form.label}
            onChange={(event) => update("label", event.target.value)}
            placeholder="Oficina principal"
          />
          <Select
            label="Tipo"
            value={form.mode}
            onChange={(event) => update("mode", event.target.value)}
          >
            <option value="whitelist">Whitelist · permitir</option>
            <option value="blacklist">Blacklist · bloquear</option>
          </Select>
          <Input
            label="Red CIDR"
            value={form.network}
            onChange={(event) => update("network", event.target.value)}
            placeholder="203.0.113.10/32"
          />
          <Input
            label="Prioridad"
            type="number"
            min="0"
            max="10000"
            value={form.priority}
            onChange={(event) => update("priority", event.target.value)}
          />
          <Input
            label="Expira (opcional)"
            type="datetime-local"
            value={form.expires_at}
            onChange={(event) => update("expires_at", event.target.value)}
          />
          <Select
            label="Alcance"
            value={form.tenant_id}
            onChange={(event) => update("tenant_id", event.target.value)}
          >
            <option value="">Todas las empresas</option>
            {tenants.map((tenant) => (
              <option key={tenant.tenant_id} value={tenant.tenant_id}>
                {tenant.tenant_name}
              </option>
            ))}
          </Select>
        </FieldGrid>
        <Textarea
          label="Notas"
          rows={3}
          value={form.notes}
          onChange={(event) => update("notes", event.target.value)}
          placeholder="Motivo, responsable y ventana de cambio"
        />
        {!looksLikeCidr && form.network.trim() && (
          <p className="text-xs font-bold text-red-600">
            Usa una red CIDR válida antes de guardar.
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={onSave}
            disabled={busy || form.label.trim().length < 2 || !looksLikeCidr}
          >
            Guardar regla
          </Button>
        </div>
      </div>
    </Modal>
  );
}
