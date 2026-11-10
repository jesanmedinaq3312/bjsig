import { type ReactNode, useEffect, useMemo, useState, useCallback, useRef } from "react";
import {
  LayoutDashboard,
  Users,
  ClipboardCheck,
  AlertTriangle,
  FileText,
  GraduationCap,
  BarChart3,
  ShieldCheck,
  HardHat,
  Menu,
  X,
  CalendarDays,
  Cloud,
  LogOut,
  Settings,
  ScrollText,
  Clock,
  Wallet,
  Target,
  User,
  Plane,
  Calculator,
  Megaphone,
  Grid3x3,
  Scale,
  Building2,
  Network,
  ShieldAlert,
  Package,
  Banknote,
  HeartPulse,
  Receipt,
  Mail,
  HandCoins,
  GripVertical,
} from "lucide-react";
import { loadCompanyBranding, useCompanyBranding } from "@/lib/logo";
import { CompanyLogo } from "@/components/CompanyLogo";
import { useTenantOptional } from "@/components/TenantProvider";
import { navigateTo, parseRoute } from "@/lib/appRoute";
import { canRenderNavItem, isPlatformRole } from "@/lib/roleAccess";

export type ViewKey =
  | "dashboard"
  | "workers"
  | "terrain"
  | "incidents"
  | "docs"
  | "trainings"
  | "indicators"
  | "iso"
  | "calendar"
  | "clouddocs"
  | "settings"
  | "logs"
  | "shifts"
  | "payroll"
  | "performance"
  | "workerportal"
  | "vacations"
  | "finiquitos"
  | "securitytalks"
  | "ipermatrix"
  | "compliancedocs"
  | "saas"
  | "departments"
  | "organigrama"
  | "gdpr"
  | "eppwarehouse"
  | "treasury"
  | "medicallicenses"
  | "commercial"
  | "communications"
  | "extendedfinance"
  | "harassmentreports"
  | "securitybreaches";

type SidebarPosition = "left" | "right" | "top" | "bottom";

const SIDEBAR_POSITION_KEY = "gyc_sidebar_position";
const MOBILE_OPEN_KEY = "gyc_mobile_sidebar_open";

function getInitialSidebarPosition(): SidebarPosition {
  try {
    const saved = localStorage.getItem(SIDEBAR_POSITION_KEY) as SidebarPosition | null;
    if (saved && ["left", "right", "top", "bottom"].includes(saved)) return saved;
  } catch {
    /* ignore */
  }
  return "left";
}

function getInitialMobileOpen(): boolean {
  try {
    return localStorage.getItem(MOBILE_OPEN_KEY) === "true";
  } catch {
    /* ignore */
  }
  return false;
}

interface NavItem {
  key: ViewKey;
  label: string;
  icon: ReactNode;
  group: string;
  permissionKey?: string;
}

const NAV: NavItem[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: <LayoutDashboard size={18} />,
    group: "General",
    permissionKey: "can_view_dashboard",
  },
  {
    key: "calendar",
    label: "Historial y Calendario",
    icon: <CalendarDays size={18} />,
    group: "General",
    permissionKey: "can_view_calendar",
  },
  {
    key: "terrain",
    label: "Control Diario de Terreno",
    icon: <ClipboardCheck size={18} />,
    group: "Terreno",
    permissionKey: "can_view_shifts",
  },
  {
    key: "incidents",
    label: "Incidentes DS 44",
    icon: <AlertTriangle size={18} />,
    group: "Terreno",
    permissionKey: "can_view_incidents",
  },
  {
    key: "workers",
    label: "Trabajadores",
    icon: <Users size={18} />,
    group: "Recursos Humanos",
    permissionKey: "can_view_workers",
  },
  {
    key: "shifts",
    label: "Gestión de Turnos",
    icon: <Clock size={18} />,
    group: "Recursos Humanos",
    permissionKey: "can_view_shifts",
  },
  {
    key: "payroll",
    label: "Nómina & Liquidaciones",
    icon: <Wallet size={18} />,
    group: "Recursos Humanos",
    permissionKey: "can_view_payroll",
  },
  {
    key: "performance",
    label: "Desempeño & Desarrollo",
    icon: <Target size={18} />,
    group: "Recursos Humanos",
    permissionKey: "can_view_performance",
  },
  {
    key: "trainings",
    label: "Capacitaciones",
    icon: <GraduationCap size={18} />,
    group: "Recursos Humanos",
    permissionKey: "can_view_trainings",
  },
  {
    key: "vacations",
    label: "Vacaciones",
    icon: <Plane size={18} />,
    group: "Recursos Humanos",
    permissionKey: "can_view_vacations",
  },
  {
    key: "finiquitos",
    label: "Finiquitos",
    icon: <Calculator size={18} />,
    group: "Recursos Humanos",
    permissionKey: "can_view_finiquitos",
  },
  {
    key: "medicallicenses",
    label: "Licencias Médicas (SIL)",
    icon: <HeartPulse size={18} />,
    group: "Recursos Humanos",
    permissionKey: "can_view_medical_licenses",
  },
  {
    key: "departments",
    label: "Departamentos",
    icon: <Building2 size={18} />,
    group: "Recursos Humanos",
    permissionKey: "can_view_departments",
  },
  {
    key: "organigrama",
    label: "Organigrama",
    icon: <Network size={18} />,
    group: "Recursos Humanos",
    permissionKey: "can_view_organigrama",
  },
  {
    key: "eppwarehouse",
    label: "EPP & Bodega",
    icon: <Package size={18} />,
    group: "Recursos Humanos",
    permissionKey: "can_view_epp_warehouse",
  },
  {
    key: "treasury",
    label: "Tesorería & Proveedores",
    icon: <Banknote size={18} />,
    group: "Finanzas",
    permissionKey: "can_view_treasury",
  },
  {
    key: "commercial",
    label: "Comercial & Facturación",
    icon: <Receipt size={18} />,
    group: "Finanzas",
    permissionKey: "can_view_commercial",
  },
  {
    key: "extendedfinance",
    label: "Finanzas Extendidas",
    icon: <HandCoins size={18} />,
    group: "Finanzas",
    permissionKey: "can_view_extended_finance",
  },
  {
    key: "communications",
    label: "Comunicaciones",
    icon: <Mail size={18} />,
    group: "Recursos Humanos",
    permissionKey: "can_view_communications",
  },
  {
    key: "docs",
    label: "Matriz de Documentación",
    icon: <FileText size={18} />,
    group: "Recursos Humanos",
    permissionKey: "can_view_docs",
  },
  {
    key: "clouddocs",
    label: "Documentos en la Nube",
    icon: <Cloud size={18} />,
    group: "Recursos Humanos",
    permissionKey: "can_view_clouddocs",
  },
  {
    key: "indicators",
    label: "Indicadores ACHS / CPHS",
    icon: <BarChart3 size={18} />,
    group: "Cumplimiento",
    permissionKey: "can_view_indicators",
  },
  {
    key: "iso",
    label: "Auditoría ISO",
    icon: <ShieldCheck size={18} />,
    group: "Cumplimiento",
    permissionKey: "can_view_iso",
  },
  {
    key: "securitytalks",
    label: "Charlas de Seguridad DIT",
    icon: <Megaphone size={18} />,
    group: "Cumplimiento",
    permissionKey: "can_view_security_talks",
  },
  {
    key: "ipermatrix",
    label: "Matriz IPER",
    icon: <Grid3x3 size={18} />,
    group: "Cumplimiento",
    permissionKey: "can_view_iper",
  },
  {
    key: "compliancedocs",
    label: "Documentación Normativa",
    icon: <Scale size={18} />,
    group: "Cumplimiento",
    permissionKey: "can_view_compliance",
  },
  {
    key: "gdpr",
    label: "Privacidad y GDPR",
    icon: <ShieldAlert size={18} />,
    group: "Cumplimiento",
    permissionKey: "can_view_gdpr",
  },
  {
    key: "harassmentreports",
    label: "Canal de Denuncias Ley Karin",
    icon: <ShieldAlert size={18} />,
    group: "Cumplimiento",
    permissionKey: "can_view_harassment_reports",
  },
  {
    key: "securitybreaches",
    label: "Brechas de Seguridad Ley 21.663",
    icon: <ShieldAlert size={18} />,
    group: "Cumplimiento",
    permissionKey: "can_view_security_breaches",
  },
  {
    key: "settings",
    label: "Configuración",
    icon: <Settings size={18} />,
    group: "Sistema",
    permissionKey: "can_view_settings",
  },
  {
    key: "logs",
    label: "Registro de Actividad",
    icon: <ScrollText size={18} />,
    group: "Sistema",
    permissionKey: "can_view_audit_logs",
  },
];

const PLATFORM_NAV: NavItem[] = [
  {
    key: "saas",
    label: "Dev Team · Control SaaS",
    icon: <ShieldAlert size={18} />,
    group: "Plataforma",
  },
];

const WORKER_NAV: NavItem[] = [
  {
    key: "workerportal",
    label: "Mi Portal",
    icon: <User size={18} />,
    group: "Mi Cuenta",
  },
];

const isHorizontal = (pos: SidebarPosition) => pos === "top" || pos === "bottom";

function detectEdge(x: number, y: number, w: number, h: number): SidebarPosition {
  const fromLeft = x;
  const fromRight = w - x;
  const fromTop = y;
  const fromBottom = h - y;
  const min = Math.min(fromLeft, fromRight, fromTop, fromBottom);
  if (min === fromLeft) return "left";
  if (min === fromRight) return "right";
  if (min === fromTop) return "top";
  return "bottom";
}

export function Layout({
  current,
  onNavigate,
  children,
  userEmail,
  onSignOut,
  isWorker: workerMode,
  isAdmin,
  permissions,
  userRole,
  hideSidebar = false,
}: {
  current: ViewKey;
  onNavigate: (v: ViewKey) => void;
  children: ReactNode;
  userEmail?: string;
  onSignOut: () => void;
  isWorker?: boolean;
  isAdmin?: boolean;
  permissions?: Record<string, boolean>;
  userRole?: string;
  hideSidebar?: boolean;
}) {
  const [mobileOpen, setMobileOpen] = useState(getInitialMobileOpen);
  const [sidebarPos, setSidebarPos] = useState<SidebarPosition>(getInitialSidebarPosition);
  const [dragging, setDragging] = useState(false);
  const [dragPreview, setDragPreview] = useState<SidebarPosition | null>(null);
  const dragOriginRef = useRef<{ x: number; y: number } | null>(null);
  const { logoUrl, companyName } = useCompanyBranding();
  const tenantContext = useTenantOptional();
  const unrestricted = isPlatformRole(userRole);
  const currentRoute = parseRoute();
  const isInsideCompany = currentRoute.kind === "admin" && Boolean(currentRoute.slug);
  const moduleEnabled =
    tenantContext?.moduleEnabled ?? ((key: string) => !isInsideCompany && key === "dashboard");
  const permissionEnabled =
    tenantContext?.permissionEnabled ??
    ((key?: string) => canRenderNavItem(key, permissions, userRole, true));
  const isPlatformOperator = unrestricted;
  const showPlatformNav = isPlatformOperator && !isInsideCompany;
  // El selector debe estar disponible para superadmin/developer cuando
  // están dentro de una ruta tenant-scoped; el panel SaaS lo oculta con
  // `hideSidebar` para mantener separado el contexto de plataforma.
  const showTenantSelector = !hideSidebar;
  const allNav = workerMode ? WORKER_NAV : showPlatformNav ? [...NAV, ...PLATFORM_NAV] : NAV;
  const navItems = useMemo(
    () =>
      workerMode
        ? allNav
        : allNav.filter((n) => permissionEnabled(n.permissionKey) && moduleEnabled(n.key)),
    [workerMode, allNav, unrestricted, permissions, moduleEnabled, permissionEnabled], // eslint-disable-line react-hooks/exhaustive-deps -- reviewed dependency set; unstable callback recreation is intentional to avoid loops
  );
  const groups = useMemo(() => Array.from(new Set(navItems.map((n) => n.group))), [navItems]);

  const isSuperadmin = userRole === "superadmin";
  const horizontal = isHorizontal(sidebarPos);

  useEffect(() => {
    void loadCompanyBranding();
  }, []);

  const handleDragStart = useCallback(
    (e: React.PointerEvent) => {
      if (!isSuperadmin) return;
      e.preventDefault();
      dragOriginRef.current = { x: e.clientX, y: e.clientY };
      setDragging(true);
    },
    [isSuperadmin],
  );

  useEffect(() => {
    if (!dragging) return;
    const handleMove = (e: PointerEvent) => {
      const edge = detectEdge(e.clientX, e.clientY, window.innerWidth, window.innerHeight);
      setDragPreview(edge);
    };
    const handleUp = (e: PointerEvent) => {
      const edge = detectEdge(e.clientX, e.clientY, window.innerWidth, window.innerHeight);
      setSidebarPos(edge);
      try {
        localStorage.setItem(SIDEBAR_POSITION_KEY, edge);
      } catch {
        /* ignore */
      }
      setDragging(false);
      setDragPreview(null);
      dragOriginRef.current = null;
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [dragging]);

  const handleNavigate = (key: ViewKey) => {
    onNavigate(key);
    setMobileOpen(false);
    try {
      localStorage.removeItem(MOBILE_OPEN_KEY);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    try {
      localStorage.setItem(MOBILE_OPEN_KEY, String(mobileOpen));
    } catch {
      /* ignore */
    }
  }, [mobileOpen]);

  // ── Sidebar content for vertical (left/right) ──────────────────────
  const VerticalContent = (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10">
        <div
          className="p-1 rounded-xl border border-white/10 shrink-0"
          style={{ background: "rgba(255,255,255,0.08)" }}
        >
          <CompanyLogo
            src={logoUrl}
            alt={`${companyName} Logo`}
            className="h-8 max-w-[150px] w-auto object-contain drop-shadow"
            fallbackClassName="h-8 w-8"
          />
        </div>
        <div className="min-w-0">
          <p className="text-white font-bold text-sm leading-tight truncate">{companyName}</p>
          <p className="text-blue-400 text-[10px] font-semibold leading-tight mt-0.5">
            SIG Pro Edition
          </p>
        </div>
      </div>
      {showTenantSelector && tenantContext && tenantContext.tenants.length > 0 && (
        <div className="px-4 py-3 border-b border-white/10 bg-slate-950/30">
          <label className="block text-[10px] uppercase tracking-wider text-slate-500 mb-1">
            Empresa activa
          </label>
          <select
            value={tenantContext.tenantId ?? ""}
            onChange={(e) => void tenantContext.switchTenant(e.target.value, "selector_layout")}
            className="w-full bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {tenantContext.tenants.map((tenant) => (
              <option key={tenant.id} value={tenant.id}>
                {tenant.name}
                {tenant.is_active ? "" : " · suspendida"}
              </option>
            ))}
          </select>
          {tenantContext.isImpersonating && (
            <p className="text-[10px] text-amber-300 mt-1.5">Modo soporte / impersonación</p>
          )}
        </div>
      )}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 space-y-4">
        {groups.map((g) => (
          <div key={g}>
            <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              {g}
            </p>
            <div className="space-y-0.5">
              {navItems
                .filter((n) => n.group === g)
                .map((item) => (
                  <button
                    key={item.key}
                    onClick={() => handleNavigate(item.key)}
                    className={`w-full min-h-11 flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
                      current === item.key
                        ? "bg-primary text-white shadow-md shadow-primary/20"
                        : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                    }`}
                  >
                    {item.icon}
                    <span className="truncate">{item.label}</span>
                  </button>
                ))}
            </div>
          </div>
        ))}
      </nav>
      <div
        className="px-5 py-3 border-t border-white/10 text-[10px] text-slate-400"
        style={{ background: "rgba(0,0,0,0.2)" }}
      >
        <div className="flex items-center gap-1.5 mb-1 text-slate-300 font-semibold">
          <HardHat size={12} className="text-blue-400 shrink-0" />
          <span>BJ Servicios Informáticos SpA</span>
        </div>
        <p className="text-slate-500">DS 44 · DS 594 · ISO 9001/14001/45001</p>
      </div>
    </div>
  );

  // ── Sidebar content for horizontal (top/bottom) ─────────────────────
  const HorizontalContent = (
    <div className="flex h-full">
      <div className="flex items-center gap-2.5 px-4 border-r border-white/10 shrink-0">
        <div
          className="p-1 rounded-lg border border-white/10 shrink-0"
          style={{ background: "rgba(255,255,255,0.08)" }}
        >
          <CompanyLogo
            src={logoUrl}
            alt={`${companyName} Logo`}
            className="h-7 max-w-[120px] w-auto object-contain drop-shadow"
            fallbackClassName="h-7 w-7"
          />
        </div>
        <div className="min-w-0 hidden xl:block">
          <p className="text-white font-bold text-xs leading-tight truncate">{companyName}</p>
          <p className="text-blue-400 text-[9px] font-semibold leading-tight">SIG Pro</p>
        </div>
      </div>
      <nav className="flex-1 overflow-x-auto overflow-y-hidden flex items-center gap-1 px-3 py-2 scrollbar-thin">
        {navItems.map((item) => (
          <button
            key={item.key}
            onClick={() => handleNavigate(item.key)}
            className={`flex min-h-11 items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
              current === item.key
                ? "bg-primary text-white shadow-md shadow-primary/20"
                : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
            }`}
          >
            {item.icon}
            <span className="truncate">{item.label}</span>
          </button>
        ))}
      </nav>
      <div className="flex items-center gap-2 px-4 border-l border-white/10 shrink-0 text-[10px] text-slate-400">
        <HardHat size={12} className="text-blue-400 shrink-0" />
        <span className="hidden 2xl:inline text-slate-300 font-semibold">BJ SpA</span>
      </div>
    </div>
  );

  // ── Drag handle (superadmin only) ──────────────────────────────────
  const DragHandle = isSuperadmin ? (
    <button
      onPointerDown={handleDragStart}
      className="absolute z-50 flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 border-2 border-blue-400 shadow-lg cursor-grab active:cursor-grabbing hover:bg-blue-500 transition-colors group"
      style={{
        ...(sidebarPos === "left"
          ? { right: "-14px", top: "50%", transform: "translateY(-50%)" }
          : {}),
        ...(sidebarPos === "right"
          ? { left: "-14px", top: "50%", transform: "translateY(-50%)" }
          : {}),
        ...(sidebarPos === "top"
          ? { bottom: "-14px", left: "50%", transform: "translateX(-50%)" }
          : {}),
        ...(sidebarPos === "bottom"
          ? { top: "-14px", left: "50%", transform: "translateX(-50%)" }
          : {}),
      }}
      title="Arrastra para mover el panel a cualquier borde"
    >
      <GripVertical size={16} className="text-white group-hover:text-white transition-colors" />
    </button>
  ) : null;

  // ── Drag overlay preview ───────────────────────────────────────────
  const DragOverlay = dragging ? (
    <div className="fixed inset-0 z-[60] pointer-events-none">
      {/* Highlight the target edge with strong visual feedback */}
      {dragPreview === "left" && (
        <div className="absolute inset-y-0 left-0 w-64 bg-blue-500/25 border-r-4 border-blue-400" />
      )}
      {dragPreview === "right" && (
        <div className="absolute inset-y-0 right-0 w-64 bg-blue-500/25 border-l-4 border-blue-400" />
      )}
      {dragPreview === "top" && (
        <div className="absolute inset-x-0 top-0 h-16 bg-blue-500/25 border-b-4 border-blue-400" />
      )}
      {dragPreview === "bottom" && (
        <div className="absolute inset-x-0 bottom-0 h-16 bg-blue-500/25 border-t-4 border-blue-400" />
      )}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 px-5 py-3 rounded-xl bg-blue-600 border-2 border-blue-400 text-sm font-bold text-white shadow-xl">
        {dragPreview
          ? `Suelta para colocar el panel ${dragPreview === "left" ? "a la izquierda" : dragPreview === "right" ? "a la derecha" : dragPreview === "top" ? "arriba" : "abajo"}`
          : "Arrastra hacia un borde del pantalla..."}
      </div>
    </div>
  ) : null;

  // ── Main content offset ────────────────────────────────────────────
  const mainOffsetClass = horizontal
    ? sidebarPos === "top"
      ? "lg:mt-16"
      : "lg:mb-16"
    : sidebarPos === "left"
      ? "lg:ml-64"
      : "lg:mr-64";

  // ── Desktop sidebar positioning ────────────────────────────────────
  const sidebarClasses = horizontal
    ? `hidden lg:flex glass-sidebar flex-col fixed inset-x-0 z-30 ${sidebarPos === "top" ? "top-0 h-16 border-b border-white/10" : "bottom-0 h-16 border-t border-white/10"}`
    : `hidden lg:flex glass-sidebar w-64 flex-col fixed inset-y-0 z-30 ${sidebarPos === "left" ? "left-0 border-r border-white/10" : "right-0 border-l border-white/10"}`;

  return (
    <div className="min-h-screen relative flex overflow-hidden">
      {/* Decorative gradient blobs */}
      <div className="fixed inset-0 -z-10 bg-slate-50 dark:bg-slate-950" />
      <div
        className="fixed top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full -z-10 opacity-30 dark:opacity-20 blur-3xl"
        style={{
          background: "radial-gradient(circle, #3b82f6 0%, transparent 70%)",
        }}
      />
      <div
        className="fixed top-[40%] right-[-10%] w-[600px] h-[600px] rounded-full -z-10 opacity-20 dark:opacity-15 blur-3xl"
        style={{
          background: "radial-gradient(circle, #06b6d4 0%, transparent 70%)",
        }}
      />
      <div
        className="fixed bottom-[-10%] left-[30%] w-[450px] h-[450px] rounded-full -z-10 opacity-20 dark:opacity-15 blur-3xl"
        style={{
          background: "radial-gradient(circle, #6366f1 0%, transparent 70%)",
        }}
      />

      {/* Desktop sidebar */}
      {!hideSidebar && (
        <aside className={sidebarClasses} style={horizontal ? { height: "4rem" } : undefined}>
          {horizontal ? HorizontalContent : VerticalContent}
          {DragHandle}
        </aside>
      )}

      {/* Mobile sidebar — always vertical on mobile regardless of desktop position */}
      {mobileOpen && !hideSidebar && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div
            className={`w-64 glass-sidebar flex-col flex relative ${sidebarPos === "right" ? "order-2 ml-auto animate-slide-in-right border-l border-white/10" : "animate-slide-in border-r border-white/10"}`}
          >
            {VerticalContent}
            {isSuperadmin && (
              <button
                onPointerDown={handleDragStart}
                className="absolute z-50 flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 border-2 border-blue-400 shadow-lg cursor-grab active:cursor-grabbing hover:bg-blue-500 transition-colors group"
                style={
                  sidebarPos === "right"
                    ? {
                        left: "-14px",
                        top: "50%",
                        transform: "translateY(-50%)",
                      }
                    : {
                        right: "-14px",
                        top: "50%",
                        transform: "translateY(-50%)",
                      }
                }
                title="Arrastra para mover el panel a cualquier borde"
              >
                <GripVertical
                  size={16}
                  className="text-white group-hover:text-white transition-colors"
                />
              </button>
            )}
          </div>
          <div
            className="flex-1 bg-slate-950/40 backdrop-blur-md"
            onClick={() => setMobileOpen(false)}
          />
        </div>
      )}

      <div className={`flex-1 ${hideSidebar ? "" : mainOffsetClass} flex flex-col min-w-0`}>
        {/* Topbar */}
        <header
          className="sticky top-0 z-20 glass-topbar bg-cover bg-center px-4 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-2"
          style={{ backgroundImage: "var(--brand-header-image)" }}
        >
          <div
            className={`min-w-0 flex-1 flex items-center gap-3 ${sidebarPos === "right" ? "order-2" : ""}`}
          >
            <div>
              <h1 className="text-base lg:text-lg font-semibold text-slate-800 dark:text-slate-100">
                {navItems.find((n) => n.key === current)?.label ?? "Mi Portal"}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                Prevención de Riesgos · Ley 16.744 · ACHS · SUSESO
              </p>
            </div>
          </div>
          <div
            className={`ml-auto flex max-w-full flex-wrap items-center justify-end gap-2 ${sidebarPos === "right" ? "order-1" : ""}`}
          >
            {!hideSidebar && (
              <button
                aria-label="Abrir menú de navegación"
                className="lg:hidden min-h-11 min-w-11 flex items-center justify-center text-slate-600 dark:text-slate-300 rounded-lg transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                onClick={() => setMobileOpen(true)}
              >
                <Menu size={22} />
              </button>
            )}
            <div
              className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-emerald-200/40"
              style={{ background: "rgba(16,185,129,0.12)" }}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-medium text-emerald-700">Sistema Operativo</span>
            </div>
            {userEmail && (
              <div className="hidden sm:flex flex-col items-end">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate max-w-[160px]">
                    {userEmail}
                  </span>
                  {userRole === "superadmin" ? (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-100 text-red-700 border border-red-200">
                      SUPERADMIN
                    </span>
                  ) : (
                    userRole === "developer" && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-700 border border-purple-200">
                        DEV
                      </span>
                    )
                  )}
                </div>
                <span className="text-[10px] text-slate-400 dark:text-slate-500">
                  {userRole === "superadmin"
                    ? "Super Administrador"
                    : userRole === "developer"
                      ? "Desarrollador"
                      : isAdmin
                        ? "Administrador"
                        : "Autenticado"}
                </span>
              </div>
            )}
            <button
              onClick={onSignOut}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 rounded-lg border border-slate-200 transition-colors"
              title="Cerrar sesión"
            >
              <LogOut size={14} /> Salir
            </button>
            {isPlatformOperator && isInsideCompany && (
              <button
                onClick={() => navigateTo("/admin-saas")}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 rounded-lg border border-blue-200 transition-colors"
                title="Volver al panel Dev Team"
              >
                <Grid3x3 size={14} /> Volver a Dev Team
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 max-w-[1400px] w-full mx-auto animate-fade-in">
          {children}
        </main>
      </div>

      {/* Mobile close button overlay — positioned on opposite side of sidebar */}
      {mobileOpen && !hideSidebar && (
        <button
          aria-label="Cerrar menú de navegación"
          className={`lg:hidden fixed top-3 z-50 min-h-11 min-w-11 flex items-center justify-center text-white rounded-full glass-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 ${sidebarPos === "right" ? "left-3" : "right-3"}`}
          onClick={() => setMobileOpen(false)}
        >
          <X size={20} />
        </button>
      )}

      {DragOverlay}
    </div>
  );
}
