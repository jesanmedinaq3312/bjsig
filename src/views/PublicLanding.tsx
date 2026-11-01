import { CookieConsent, openCookieSettings } from "@/components/CookieConsent";
import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  FileCheck2,
  HardHat,
  LockKeyhole,
  Menu,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

const modules = [
  { icon: Users, label: "Personas y RR.HH.", accent: "from-sky-500/20 to-blue-500/5" },
  { icon: CalendarDays, label: "Asistencia y turnos", accent: "from-cyan-500/20 to-sky-500/5" },
  {
    icon: ShieldCheck,
    label: "Prevención de riesgos",
    accent: "from-emerald-500/20 to-cyan-500/5",
  },
  { icon: HardHat, label: "EPP y seguridad", accent: "from-amber-500/20 to-orange-500/5" },
  { icon: BookOpenCheck, label: "Capacitaciones", accent: "from-violet-500/20 to-blue-500/5" },
  { icon: FileCheck2, label: "Documentación", accent: "from-blue-500/20 to-indigo-500/5" },
  { icon: Users, label: "Portal del Trabajador", accent: "from-fuchsia-500/20 to-violet-500/5" },
  { icon: ShieldCheck, label: "Canal de denuncias", accent: "from-rose-500/20 to-orange-500/5" },
  { icon: FileCheck2, label: "Ley Karin y protocolos", accent: "from-red-500/20 to-rose-500/5" },
  { icon: BarChart3, label: "Indicadores y alertas", accent: "from-teal-500/20 to-cyan-500/5" },
  { icon: Briefcase, label: "Operación multempresa", accent: "from-indigo-500/20 to-sky-500/5" },
];

const benefits = [
  {
    icon: ShieldCheck,
    eyebrow: "01 / Control",
    title: "Menos riesgos operativos",
    text: "Centraliza incidentes, vencimientos, EPP y acciones correctivas en un solo lugar.",
  },
  {
    icon: BarChart3,
    eyebrow: "02 / Contexto",
    title: "Decisiones con contexto",
    text: "Convierte la información de personas y cumplimiento en indicadores accionables.",
  },
  {
    icon: LockKeyhole,
    eyebrow: "03 / Confianza",
    title: "Cada empresa, aislada",
    text: "Portales, permisos, branding y datos separados por organización.",
  },
];

const capabilities = [
  [
    "RR. HH. y personas",
    "Reduce tiempos administrativos con fichas, documentos, vacaciones, nómina y solicitudes en un solo flujo.",
  ],
  [
    "Asistencia y turnos",
    "Ordena jornadas, ciclos, asistencia, horas extra y cambios de turno con trazabilidad.",
  ],
  [
    "Prevención y cumplimiento",
    "Gestiona incidentes DS 44, inspecciones, matrices IPER, auditorías ISO y acciones correctivas.",
  ],
  [
    "EPP e inventario",
    "Controla stock, entregas, firmas digitales, bodegas y reposición de elementos de protección personal.",
  ],
  [
    "Capacitaciones",
    "Planifica actividades, registra asistencia y mide el avance de competencias y obligaciones.",
  ],
  [
    "Documentos y portal colaborador",
    "Entrega un Portal del Trabajador simple y seguro para revisar documentos, licencias, solicitudes, capacitaciones y comunicaciones.",
  ],
  [
    "Canal de denuncias",
    "Habilita un canal formal, confidencial y trazable para recibir, gestionar y dar seguimiento a denuncias y reportes internos.",
  ],
  [
    "Ley Karin y convivencia laboral",
    "Apoya la gestión preventiva y la trazabilidad de protocolos, denuncias, investigaciones, medidas y evidencias asociadas a la Ley Karin.",
  ],
  [
    "Solicitudes y comunicación interna",
    "Ordena requerimientos de colaboradores, aprobaciones, avisos y respuestas, reduciendo correos y tareas dispersas.",
  ],
  [
    "Auditoría y trazabilidad",
    "Conserva historial de acciones, responsables, vencimientos y respaldos para responder con evidencia ante auditorías.",
  ],
  [
    "Operación multempresa",
    "Administra empresas, sucursales, permisos, branding, planes y consumo desde un control SaaS.",
  ],
  [
    "Datos y decisiones",
    "Convierte la operación en indicadores, paneles, exportaciones y alertas para actuar antes.",
  ],
] as const;

const faqs = [
  [
    "¿Cómo se implementa BJSIGAPP en una empresa?",
    "La implementación se realiza por etapas: configuración de la empresa, carga o registro del personal, definición de roles y activación de los módulos necesarios. El equipo puede comenzar con RR. HH. y asistencia, y luego sumar seguridad, EPP, capacitaciones, denuncias, finanzas e indicadores.",
  ],
  [
    "¿Cómo funciona el Portal del Trabajador?",
    "Cada colaborador accede a su espacio para consultar documentos, asistencia, turnos, capacitaciones, solicitudes, comunicaciones y asignaciones. Así la información deja de depender de carpetas, mensajes dispersos o consultas presenciales.",
  ],
  [
    "¿Es fácil registrar al personal y asignar turnos?",
    "Sí. La empresa registra trabajadores con sus datos y documentos, los organiza por áreas, cargos o sucursales y asigna turnos desde una vista centralizada. Los cambios quedan ordenados y visibles para quienes corresponda.",
  ],
  [
    "¿Qué mejora frente a los libros o registros físicos?",
    "La plataforma transforma datos lentos y confusos en información consultable, filtrable y trazable. Permite encontrar antecedentes, vencimientos, asistencia, incidentes e indicadores sin revisar carpetas ni consolidar planillas manualmente.",
  ],
  [
    "¿Cómo ayuda al trabajo en terreno?",
    "Los equipos pueden registrar actividades, inspecciones, entregas de EPP, hallazgos e incidentes desde una experiencia diseñada para operar con rapidez en terreno, manteniendo responsables, evidencias y estados centralizados.",
  ],
  [
    "¿Cómo se reportan incidentes y accidentes?",
    "Los incidentes pueden registrarse con un flujo estructurado, evidencias y responsables. BJSIGAPP ayuda a ordenar el reporte, seguimiento y cierre de acciones, incluyendo el apoyo a la gestión de reportes ASCH según los procedimientos definidos por la empresa.",
  ],
  [
    "¿Puedo asignar capacitaciones y evaluaciones por trabajador?",
    "Sí. Se pueden planificar actividades, asignarlas a trabajadores o grupos, controlar asistencia, registrar evaluaciones y consultar el avance de competencias y obligaciones pendientes.",
  ],
  [
    "¿La app permite visualizar un organigrama empresarial?",
    "Sí. La organización puede representarse en una estructura jerárquica visible, con áreas, cargos, responsables y relaciones de dependencia para comprender rápidamente cómo está conformada la empresa.",
  ],
  [
    "¿Incluye control de caja y visualización financiera?",
    "BJSIGAPP puede centralizar el control operativo de caja, pagos de servicios, compromisos e indicadores financieros configurados para la empresa, entregando una vista más clara que múltiples registros separados.",
  ],
  [
    "¿Cómo funcionan el QR de asistencia, el inventario y el EPP?",
    "Cada trabajador puede contar con un QR único para agilizar el registro de asistencia. Además, la empresa controla stock, entregas, firmas, reposición, bodegas y trazabilidad de EPP desde un mismo entorno.",
  ],
  [
    "¿Qué información muestra el dashboard?",
    "El dashboard reúne indicadores de personas, asistencia, cumplimiento, incidentes, capacitaciones, vencimientos, inventario y actividad. Sus widgets permiten detectar pendientes y tomar decisiones sin esperar cierres manuales.",
  ],
  [
    "¿Puedo auditar la actividad de los usuarios?",
    "La plataforma registra actividad relevante, responsables y contexto de acceso, incluyendo trazabilidad por IP cuando está habilitada en la configuración de seguridad, para apoyar auditorías y controles internos.",
  ],
] as const;

const whatsappDemoUrl =
  "https://wa.me/56941228089?text=Hola%2C%20quiero%20solicitar%20una%20demo%20de%20BJSIGAPP.";

const previewViews = [
  {
    label: "Panorama",
    icon: BarChart3,
    title: "La operación, en contexto",
    description:
      "Relaciona personas, prevención y compromisos para orientar las decisiones del día.",
    modules: ["Dashboard", "Historial y Calendario", "Indicadores ACHS / CPHS"],
  },
  {
    label: "Sucursales",
    icon: Briefcase,
    title: "La gestión, organizada por sucursal",
    description: "Ordena la estructura de la empresa, sus sedes, equipos y responsables.",
    modules: ["Empresas y sucursales", "Departamentos", "Organigrama", "Roles y permisos"],
  },
  {
    label: "Personas",
    icon: Users,
    title: "Cada persona, con su contexto",
    description:
      "Conecta los procesos de RR. HH. con la información disponible para cada colaborador.",
    modules: [
      "Trabajadores",
      "Gestión de Turnos",
      "Nómina & Liquidaciones",
      "Desempeño & Desarrollo",
      "Capacitaciones",
      "Vacaciones",
      "Finiquitos",
      "Licencias Médicas (SIL)",
      "Comunicaciones",
      "Documentos en la Nube",
      "Portal del Trabajador",
    ],
  },
  {
    label: "Terreno",
    icon: HardHat,
    title: "La seguridad ocurre en terreno",
    description: "Da seguimiento a tareas, incidentes, equipos de protección y evidencias.",
    modules: [
      "Control Diario de Terreno",
      "Incidentes DS 44",
      "EPP & Bodega",
      "Charlas de Seguridad DIT",
    ],
  },
  {
    label: "Cumplimiento",
    icon: ShieldCheck,
    title: "Obligaciones y evidencias relacionadas",
    description: "Agrupa protocolos, documentación y auditorías para facilitar su seguimiento.",
    modules: [
      "Matriz IPER",
      "Auditoría ISO",
      "Documentación Normativa",
      "Privacidad y GDPR",
      "Canal de Denuncias Ley Karin",
      "Brechas de Seguridad Ley 21.663",
    ],
  },
  {
    label: "Finanzas",
    icon: Briefcase,
    title: "Finanzas y proveedores en la misma operación",
    description:
      "Mantén cerca los procesos financieros y comerciales configurados para la empresa.",
    modules: ["Tesorería & Proveedores", "Comercial & Facturación", "Finanzas Extendidas"],
  },
  {
    label: "Trazabilidad",
    icon: LockKeyhole,
    title: "Permisos claros y actividad trazable",
    description: "Separa accesos por rol y conserva contexto para los controles internos.",
    modules: ["Configuración", "Registro de Actividad", "MFA administrativo", "Datos por empresa"],
  },
] as const;

function PreviewNavigation({
  activeIndex,
  compact = false,
  onSelect,
}: {
  activeIndex: number;
  compact?: boolean;
  onSelect: (index: number) => void;
}) {
  return (
    <nav
      aria-label="Vistas de la demostración"
      className={
        compact ? "flex gap-1 overflow-x-auto pb-2 sm:hidden" : "hidden space-y-1 sm:block"
      }
    >
      {previewViews.map(({ label, icon: Icon }, index) => (
        <button
          key={label}
          type="button"
          aria-pressed={activeIndex === index}
          onClick={() => onSelect(index)}
          className={`${compact ? "min-h-9 shrink-0 rounded-lg px-2.5" : "min-h-9 w-full rounded-md px-2"} flex items-center gap-2 text-left text-[11px] font-medium transition-colors ${activeIndex === index ? "bg-blue-100 text-blue-800" : "text-slate-600 hover:bg-white/70 hover:text-slate-900"}`}
        >
          <Icon size={14} aria-hidden="true" />
          {label}
        </button>
      ))}
    </nav>
  );
}

function DashboardPreview() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [scope, setScope] = useState("all");
  const activeView = previewViews[activeIndex];
  const scopeLabel =
    scope === "north"
      ? "Sucursal de ejemplo Norte"
      : scope === "center"
        ? "Sucursal de ejemplo Centro"
        : "Todas las sucursales";

  return (
    <div
      className="landing-preview-wrap"
      aria-label="Demostración interactiva de módulos BJSIGAPP"
      data-ui="dashboard-preview"
    >
      <div className="landing-preview-glow" />
      <div className="landing-preview">
        <div className="landing-window-bar">
          <div className="flex gap-1.5" aria-hidden="true">
            <span className="h-2 w-2 rounded-full bg-rose-400" />
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
          </div>
          <span className="ml-3 text-[10px] font-semibold tracking-wide text-white/45">
            bjsigapp · panel de administración
          </span>
          <span className="ml-auto rounded-full border border-white/15 px-2 py-1 text-[11px] font-semibold text-white/65">
            Demo · datos ilustrativos
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-[118px_1fr]">
          <aside className="hidden border-r border-white/10 bg-slate-950/70 p-3 sm:block">
            <div className="mb-7 flex items-center gap-1.5 text-[10px] font-black text-white">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-blue-500">
                <ShieldCheck size={12} />
              </span>
              BJSIGAPP
            </div>
            <PreviewNavigation activeIndex={activeIndex} onSelect={setActiveIndex} />
          </aside>
          <main className="min-w-0 bg-slate-100 p-3 sm:p-5">
            <PreviewNavigation compact activeIndex={activeIndex} onSelect={setActiveIndex} />
            <div className="mb-3 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
              <div>
                <p className="text-[11px] font-semibold text-blue-700">
                  Centro de control · demostración
                </p>
                <h3
                  className="mt-1 text-base font-bold text-slate-900 sm:text-lg"
                  aria-live="polite"
                >
                  {activeView.title}
                </h3>
              </div>
              <label className="grid gap-1 text-[11px] font-medium text-slate-600">
                Alcance de ejemplo
                <select
                  value={scope}
                  onChange={(event) => setScope(event.target.value)}
                  className="min-h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                >
                  <option value="all">Todas las sucursales</option>
                  <option value="north">Sucursal de ejemplo Norte</option>
                  <option value="center">Sucursal de ejemplo Centro</option>
                </select>
              </label>
            </div>
            <div
              className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5"
              aria-live="polite"
            >
              <div className="flex items-center gap-2 text-slate-800">
                <activeView.icon size={18} className="text-blue-700" aria-hidden="true" />
                <h4 className="text-sm font-semibold">{activeView.label}</h4>
              </div>
              <p className="mt-2 text-sm leading-5 text-slate-600">{activeView.description}</p>
              <p className="mt-4 text-xs font-semibold text-slate-700">Módulos relacionados</p>
              <ul className="mt-2 grid gap-x-4 gap-y-2 sm:grid-cols-2">
                {activeView.modules.map((module) => (
                  <li
                    key={module}
                    className="flex items-start gap-2 text-xs leading-4 text-slate-600"
                  >
                    <CheckCircle2
                      size={14}
                      className="mt-0.5 shrink-0 text-blue-700"
                      aria-hidden="true"
                    />
                    {module}
                  </li>
                ))}
              </ul>
            </div>
            <p className="mt-3 text-[11px] leading-4 text-slate-600">
              Alcance mostrado: <strong>{scopeLabel}</strong>. Las sucursales y textos de esta pieza
              son demostrativos.
            </p>
          </main>
        </div>
      </div>
    </div>
  );
}

export function PublicLanding() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState(0);
  const landingSections = [
    "Inicio",
    "Solución",
    "Módulos",
    "Capacidades",
    "Preguntas frecuentes",
    "Seguridad",
    "Contacto",
  ];
  const goToSection = (index: number) => {
    setActiveSection(Math.max(0, Math.min(index, landingSections.length - 1)));
    setMenuOpen(false);
  };
  useEffect(() => {
    document.title = "BJSIGAPP — Personas, Seguridad y Cumplimiento";
  }, []);

  return (
    <div className="landing-shell min-h-screen overflow-hidden bg-slate-950 text-white">
      <header className="landing-header fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-slate-950/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <a href="/" className="flex items-center gap-2.5" aria-label="BJSIGAPP inicio">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-400 to-blue-700 shadow-lg shadow-blue-500/30">
              <ShieldCheck size={22} />
            </span>
            <span className="text-lg font-black tracking-tight">BJSIGAPP</span>
          </a>
          <nav
            className="hidden items-center gap-7 text-sm text-white/65 lg:flex"
            aria-label="Navegación principal"
          >
            <button type="button" onClick={() => goToSection(1)} className="hover:text-white">
              Solución
            </button>
            <button type="button" onClick={() => goToSection(2)} className="hover:text-white">
              Módulos
            </button>
            <button type="button" onClick={() => goToSection(4)} className="hover:text-white">
              Preguntas frecuentes
            </button>
            <button type="button" onClick={() => goToSection(5)} className="hover:text-white">
              Seguridad
            </button>
            <button type="button" onClick={() => goToSection(6)} className="hover:text-white">
              Contacto
            </button>
          </nav>
          <div className="hidden items-center gap-2 lg:flex">
            <a
              href="/trabajador"
              className="rounded-xl px-3 py-2 text-xs font-semibold text-white/70 hover:bg-white/10 hover:text-white"
            >
              Colaborador
            </a>
            <a
              href="/admin"
              className="rounded-xl border border-blue-400/50 bg-blue-500/15 px-3 py-2 text-xs font-bold text-blue-100 hover:bg-blue-500/25"
            >
              Acceso administrador
            </a>
          </div>
          <button
            className="min-h-11 min-w-11 rounded-lg p-2 text-white/75 lg:hidden"
            onClick={() => setMenuOpen((value) => !value)}
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        {menuOpen && (
          <div className="border-t border-white/10 bg-slate-950 px-5 py-4 lg:hidden">
            <div className="flex flex-col gap-3 text-sm">
              <button type="button" onClick={() => goToSection(1)}>
                Solución
              </button>
              <button type="button" onClick={() => goToSection(2)}>
                Módulos
              </button>
              <button type="button" onClick={() => goToSection(4)}>
                Preguntas frecuentes
              </button>
              <button type="button" onClick={() => goToSection(5)}>
                Seguridad
              </button>
              <a href="/trabajador">Ingresar como colaborador</a>
              <a href="/admin">Ingresar como administrador</a>
            </div>
          </div>
        )}
      </header>

      <main className="relative min-h-[calc(100vh-72px)] overflow-hidden pt-16">
        <div className="absolute inset-x-0 top-0 z-30 flex items-center justify-center gap-2 border-b border-white/10 bg-slate-950/80 px-4 py-3 backdrop-blur-xl">
          <button
            type="button"
            aria-label="Sección anterior"
            onClick={() => goToSection(activeSection - 1)}
            disabled={activeSection === 0}
            className="rounded-full border border-white/15 px-3 py-1 text-xs font-bold text-white/70 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
          >
            ←
          </button>
          <div className="flex items-center gap-1.5">
            {landingSections.map((label, index) => (
              <button
                key={label}
                type="button"
                aria-label={`Ir a ${label}`}
                onClick={() => goToSection(index)}
                className={`h-2 rounded-full transition-all ${activeSection === index ? "w-7 bg-cyan-300" : "w-2 bg-white/25 hover:bg-white/50"}`}
              />
            ))}
          </div>
          <span className="hidden min-w-20 text-center text-[10px] font-bold uppercase tracking-[0.15em] text-white/45 sm:inline">
            {landingSections[activeSection]}
          </span>
          <button
            type="button"
            aria-label="Siguiente sección"
            onClick={() => goToSection(activeSection + 1)}
            disabled={activeSection === landingSections.length - 1}
            className="rounded-full border border-white/15 px-3 py-1 text-xs font-bold text-white/70 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
          >
            →
          </button>
        </div>
        <section data-landing=""
          className={`${activeSection === 0 ? "" : "hidden"} relative isolate min-h-[calc(100vh-136px)] px-5 pb-20 pt-20 sm:pb-28 sm:pt-28 lg:px-8 lg:pb-36 lg:pt-32`}
        >
          <div className="landing-orb landing-orb-one" />
          <div className="landing-orb landing-orb-two" />
          <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[0.86fr_1.14fr] lg:gap-16">
            <div className="max-w-xl">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-400/25 bg-blue-400/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-200">
                <Sparkles size={12} className="text-cyan-300" />
                Gestión operacional para empresas
              </div>
              <h1 className="landing-title text-4xl font-black leading-[1.04] tracking-tight sm:text-6xl">
                Personas, seguridad y{" "}
                <span className="landing-shimmer bg-gradient-to-r from-blue-300 via-cyan-300 to-blue-500 bg-clip-text text-transparent">
                  cumplimiento
                </span>{" "}
                en una sola plataforma.
              </h1>
              <p className="mt-7 max-w-lg text-base leading-7 text-white/60 sm:text-lg">
                BJSIGAPP conecta la operación diaria de tu empresa con la prevención de riesgos, los
                documentos y las decisiones que mantienen a tus equipos avanzando.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <a
                  href="#contacto"
                  onClick={(event) => {
                    event.preventDefault();
                    goToSection(6);
                  }}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-500 px-5 py-3.5 text-sm font-bold shadow-xl shadow-blue-600/25 hover:-translate-y-0.5 hover:bg-blue-400"
                >
                  Solicitar una demo <ArrowRight size={16} />
                </a>
                <a
                  href="/trabajador"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/15 px-5 py-3.5 text-sm font-semibold text-white/80 hover:bg-white/10"
                >
                  <Users size={16} /> Soy colaborador
                </a>
              </div>
              <button
                type="button"
                onClick={() => goToSection(4)}
                className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-cyan-200 underline decoration-cyan-300/40 underline-offset-4 hover:text-white"
              >
                ¿Quieres saber cómo funciona? Consulta las preguntas frecuentes{" "}
                <ArrowRight size={14} />
              </button>
              <p className="mt-6 text-xs text-white/35">
                Acceso administrativo separado · Datos por empresa · MFA para cuentas privilegiadas
              </p>
            </div>
            <DashboardPreview />
          </div>
        </section>
        <section data-landing=""
          className={
            activeSection === 1
              ? "border-y border-white/10 bg-white/[0.035] px-5 py-12 lg:px-8 lg:py-14"
              : "hidden"
          }
          id="solucion"
        >
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">
                Mucho más que un software de RR. HH.
              </p>
              <h2 className="mt-3 max-w-md text-3xl font-black tracking-tight sm:text-4xl">
                Más control. Menos riesgos. Mejores decisiones.
              </h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {benefits.map(({ icon: Icon, eyebrow, title, text }) => (
                <div
                  key={title}
                  className="landing-card rounded-2xl border border-white/10 bg-white/[0.04] p-5"
                >
                  <Icon size={22} className="text-cyan-300" />
                  <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">
                    {eyebrow}
                  </p>
                  <h3 className="mt-2 text-sm font-bold">{title}</h3>
                  <p className="mt-2 text-xs leading-5 text-white/50">{text}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="mx-auto mt-10 max-w-7xl border-t border-white/10 pt-8">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">
                  Suite completa de soluciones
                </p>
                <h3 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
                  Todo lo que tu empresa necesita para operar mejor.
                </h3>
              </div>
              <p className="max-w-md text-sm leading-6 text-white/50">
                Un ecosistema empresarial que une personas, prevención, denuncias, Ley Karin,
                inventario, documentos y cumplimiento en una sola experiencia.
              </p>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {capabilities.map(([title, text], index) => (
                <article
                  key={title}
                  className="rounded-2xl border border-white/10 bg-white/[0.045] p-4 transition hover:-translate-y-1 hover:border-cyan-300/30 hover:bg-white/[0.08]"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-300/15 text-[10px] font-black text-cyan-200">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <h4 className="text-xs font-black text-white">{title}</h4>
                  </div>
                  <p className="mt-3 text-[11px] leading-5 text-white/50">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section data-landing=""
          id="modulos"
          className={
            activeSection === 2 ? "bg-slate-100 px-5 py-16 text-slate-900 lg:px-8" : "hidden"
          }
        >
          <div className="mx-auto max-w-7xl">
            <div className="max-w-xl">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">
                Todo lo que necesitas
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
                Una vista clara de cada frente de trabajo.
              </h2>
              <p className="mt-4 text-sm leading-6 text-slate-500">
                Menos pestañas abiertas. Más continuidad entre personas, prevención y operación.
              </p>
            </div>
            <div className="mt-10 grid grid-cols-1 gap-3 min-[380px]:grid-cols-2 sm:grid-cols-4 lg:grid-cols-7">
              {modules.map(({ icon: Icon, label, accent }) => (
                <div
                  key={label}
                  className={`group rounded-2xl border border-slate-200 bg-gradient-to-br ${accent} bg-white p-4 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg`}
                >
                  <Icon size={24} className="text-blue-700 transition group-hover:text-cyan-600" />
                  <p className="mt-4 text-xs font-bold leading-4 text-slate-700">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section data-landing=""
          className={activeSection === 3 ? "bg-white px-5 py-20 text-slate-900 lg:px-8" : "hidden"}
        >
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
              <div className="max-w-2xl">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">
                  Una operación que trabaja mejor
                </p>
                <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
                  Menos trabajo repetido. Más tiempo para dirigir la empresa.
                </h2>
              </div>
              <p className="max-w-md text-sm leading-6 text-slate-500">
                BJSIGAPP conecta personas, seguridad, inventario y cumplimiento para que cada área
                encuentre la información correcta en segundos.
              </p>
            </div>
            <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {capabilities.map(([title, text], index) => (
                <article
                  key={title}
                  className="group rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-xs font-black text-white shadow-lg shadow-blue-600/20">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-5 text-sm font-black text-slate-900">{title}</h3>
                  <p className="mt-2 text-xs leading-5 text-slate-500">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section data-landing=""
          className={
            activeSection === 4 ? "bg-slate-50 px-5 py-14 text-slate-900 lg:px-8" : "hidden"
          }
          id="preguntas-frecuentes"
        >
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">
                Preguntas frecuentes
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
                Una plataforma fácil de implementar y fácil de usar.
              </h2>
              <p className="mt-4 text-sm leading-6 text-slate-500">
                Respuestas rápidas para entender cómo BJSIGAPP simplifica la operación diaria y
                convierte información dispersa en control para la empresa.
              </p>
            </div>
            <div className="mt-8 grid gap-3 md:grid-cols-2">
              {faqs.map(([question, answer]) => (
                <article
                  key={question}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
                >
                  <h3 className="text-sm font-black leading-5 text-slate-900">{question}</h3>
                  <p className="mt-2 text-xs leading-5 text-slate-500">{answer}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section data-landing=""
          id="seguridad"
          className={activeSection === 5 ? "bg-slate-950 px-5 py-20 lg:px-8" : "hidden"}
        >
          <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">
                Diseñada para crecer contigo
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
                Cada empresa con su identidad, sus permisos y sus datos.
              </h2>
              <p className="mt-5 max-w-lg text-sm leading-7 text-white/55">
                La experiencia se adapta a cada organización: branding por empresa, roles,
                auditoría, exportación y portales diferenciados para administración y colaboradores.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                "Aislamiento por empresa",
                "MFA administrativo",
                "Auditoría de acciones",
                "Exportación por tenant",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-4 text-sm font-semibold"
                >
                  <CheckCircle2 size={18} className="text-emerald-300" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>
        <section data-landing=""
          className={
            activeSection === 6
              ? "landing-contact bg-gradient-to-br from-blue-700 to-slate-900 px-5 py-20 lg:px-8"
              : "hidden"
          }
          id="contacto"
        >
          <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 md:flex-row md:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-100">
                Conversemos
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
                Lleva tu operación a un lugar más claro.
              </h2>
              <p className="mt-3 max-w-xl text-sm text-blue-100/75">
                Solicita una demostración y revisemos qué módulos necesita tu empresa.
              </p>
            </div>
            <a
              href={whatsappDemoUrl}
              target="_blank"
              rel="noreferrer"
              aria-label="Solicitar demo por WhatsApp"
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-3.5 text-sm font-bold text-blue-800 shadow-xl hover:-translate-y-0.5 hover:bg-blue-50 sm:w-auto"
            >
              Solicitar demo por WhatsApp <ArrowRight size={16} />
            </a>
          </div>
        </section>
      </main>
      <footer className="border-t border-white/10 bg-slate-950 px-5 py-8 text-white/45 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 text-xs sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 font-bold text-white/75">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600">
              <ShieldCheck size={15} />
            </span>
            BJSIGAPP
          </div>
          <div className="flex flex-wrap gap-4">
            <a href="/privacidad" className="hover:text-white">
              Privacidad
            </a>
            <a href="/terminos" className="hover:text-white">
              Términos
            </a>
            <button type="button" onClick={openCookieSettings} className="hover:text-white">
              Cookies
            </button>
            <a href="/admin" className="hover:text-white">
              Administradores
            </a>
            <a href="/trabajador" className="hover:text-white">
              Colaboradores
            </a>
          </div>
          <div className="text-right">
            <span className="block">Personas · Seguridad · Cumplimiento</span>
            <span className="mt-1 block text-[10px] text-white/30">
              Desarrollado por BJ Soluciones Informáticas SpA
            </span>
          </div>
        </div>
      </footer>
      <CookieConsent />
    </div>
  );
}

export function PublicDocument({ kind }: { kind: "privacy" | "terms" | "contact" }) {
  const content =
    kind === "privacy"
      ? {
          title: "Política de privacidad",
          intro:
            "Información sobre cómo BJSIGAPP trata datos de usuarios, trabajadores y empresas.",
          items: [
            "Finalidades y categorías de datos",
            "Bases y derechos de las personas",
            "Seguridad, conservación y encargados",
            "Canales de contacto y solicitudes",
          ],
        }
      : kind === "terms"
        ? {
            title: "Términos y condiciones",
            intro: "Condiciones generales para el uso de BJSIGAPP y sus portales empresariales.",
            items: [
              "Cuenta y responsabilidades del cliente",
              "Módulos, límites y soporte",
              "Uso aceptable y seguridad",
              "Vigencia, suspensión y terminación",
            ],
          }
        : {
            title: "Contacto comercial",
            intro: "Cuéntanos sobre tu empresa y coordinemos una demostración de BJSIGAPP.",
            items: [
              "Demostraciones para empresas",
              "Configuración de módulos",
              "Onboarding y soporte",
              "Consultas sobre seguridad",
            ],
          };
  return (
    <div className="min-h-screen bg-slate-950 px-5 py-10 text-white">
      <div className="mx-auto max-w-3xl">
        <a href="/" className="text-sm font-bold text-blue-300 hover:text-white">
          ← Volver a BJSIGAPP
        </a>
        <div className="mt-16 rounded-3xl border border-white/10 bg-white/[0.05] p-8 sm:p-12">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/20 text-blue-300">
            <ShieldCheck />
          </div>
          <h1 className="mt-7 text-3xl font-black">{content.title}</h1>
          <p className="mt-4 text-white/60">{content.intro}</p>
          <div className="mt-8 space-y-3">
            {content.items.map((item) => (
              <div
                key={item}
                className="flex gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm"
              >
                <CheckCircle2 size={18} className="shrink-0 text-emerald-300" />
                {item}
              </div>
            ))}
          </div>
          <p className="mt-10 border-t border-white/10 pt-6 text-xs leading-5 text-white/40">
            Documento sujeto a la versión contractual y legal vigente. Para solicitudes formales
            utiliza el canal de contacto indicado en tu contrato SaaS.
          </p>
        </div>
      </div>
    </div>
  );
}

export default PublicLanding;
