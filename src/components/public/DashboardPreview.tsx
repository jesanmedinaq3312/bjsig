import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  HardHat,
  Laptop,
  LockKeyhole,
  Smartphone,
  Tablet,
  Users,
} from "lucide-react";

type DemoRecord = {
  name: string;
  detail: string;
  status: string;
  tone: "ok" | "warn" | "info";
};

const views: Array<{
  label: string;
  icon: typeof BarChart3;
  title: string;
  description: string;
  modules: string[];
  stats: Array<{ label: string; value: string }>;
  records: DemoRecord[];
}> = [
  {
    label: "Panorama",
    icon: BarChart3,
    title: "La operación, en contexto",
    description: "Consulta la actividad y los pendientes visibles para la empresa seleccionada.",
    modules: ["Dashboard", "Historial y Calendario", "Indicadores ACHS / CPHS"],
    stats: [
      { label: "Asistencia hoy", value: "94%" },
      { label: "Alertas activas", value: "3" },
      { label: "Docs. por vencer", value: "7" },
    ],
    records: [
      {
        name: "Turno mañana · Planta Norte",
        detail: "38 de 40 trabajadores presentes",
        status: "Al día",
        tone: "ok",
      },
      {
        name: "Contrato de J. Pérez",
        detail: "Vence en 12 días · renovación pendiente",
        status: "Por vencer",
        tone: "warn",
      },
      {
        name: "Indicadores ACHS",
        detail: "Tasa de accidentalidad actualizada",
        status: "Informe",
        tone: "info",
      },
    ],
  },
  {
    label: "Empresas",
    icon: BriefcaseBusiness,
    title: "La gestión, organizada por empresa",
    description: "Ordena sucursales, equipos y responsables dentro de cada organización.",
    modules: ["Empresas y sucursales", "Departamentos", "Organigrama", "Roles y permisos"],
    stats: [
      { label: "Empresas activas", value: "4" },
      { label: "Sucursales", value: "11" },
      { label: "Trabajadores", value: "286" },
    ],
    records: [
      {
        name: "Constructora Andina SpA",
        detail: "5 sucursales · 142 trabajadores",
        status: "Activa",
        tone: "ok",
      },
      {
        name: "Logística del Sur Ltda.",
        detail: "3 sucursales · 89 trabajadores",
        status: "Activa",
        tone: "ok",
      },
      {
        name: "Organigrama · Planta Norte",
        detail: "Actualizado por RR. HH. esta semana",
        status: "Revisión",
        tone: "info",
      },
    ],
  },
  {
    label: "Personas",
    icon: Users,
    title: "Personas y procesos de RR. HH.",
    description: "Conecta trabajadores con los módulos de personas que la empresa habilite.",
    modules: [
      "Trabajadores",
      "Gestión de Turnos",
      "Vacaciones",
      "Capacitaciones",
      "Portal del Trabajador",
    ],
    stats: [
      { label: "Turnos esta semana", value: "312" },
      { label: "Vacaciones activas", value: "9" },
      { label: "Solicitudes", value: "5" },
    ],
    records: [
      {
        name: "María González · Vacaciones",
        detail: "12 al 26 de febrero · aprobada",
        status: "Aprobada",
        tone: "ok",
      },
      {
        name: "Turno noche · Faena 2",
        detail: "Falta asignar 1 reemplazo",
        status: "Pendiente",
        tone: "warn",
      },
      {
        name: "Capacitación altura física",
        detail: "24 inscritos · viernes 09:00",
        status: "Programada",
        tone: "info",
      },
    ],
  },
  {
    label: "Terreno",
    icon: HardHat,
    title: "Registros vinculados al trabajo en terreno",
    description: "Consulta actividades, EPP, incidentes y evidencias de seguimiento.",
    modules: [
      "Control Diario de Terreno",
      "Incidentes DS 44",
      "EPP & Bodega",
      "Charlas de Seguridad DIT",
    ],
    stats: [
      { label: "Controles hoy", value: "18" },
      { label: "EPP entregados", value: "46" },
      { label: "Incidentes abiertos", value: "1" },
    ],
    records: [
      {
        name: "Entrega EPP · Cuadrilla 3",
        detail: "12 cascos y guantes con firma digital",
        status: "Entregado",
        tone: "ok",
      },
      {
        name: "Incidente DS 44 · Faena 2",
        detail: "Investigación en curso · sin lesiones",
        status: "En curso",
        tone: "warn",
      },
      {
        name: "Charla DIT · Uso de arnés",
        detail: "15 asistentes registrados con QR",
        status: "Realizada",
        tone: "info",
      },
    ],
  },
  {
    label: "Cumplimiento",
    icon: CheckCircle2,
    title: "Documentos y procesos relacionados",
    description: "Agrupa protocolos, documentos y vistas de seguimiento por organización.",
    modules: [
      "Matriz IPER",
      "Auditoría ISO",
      "Documentación Normativa",
      "Canal de Denuncias Ley Karin",
    ],
    stats: [
      { label: "Documentos vigentes", value: "128" },
      { label: "Por vencer (30 días)", value: "6" },
      { label: "Denuncias activas", value: "2" },
    ],
    records: [
      {
        name: "Matriz IPER · Planta Norte",
        detail: "Versión 4 aprobada y vigente",
        status: "Vigente",
        tone: "ok",
      },
      {
        name: "Protocolo MINSAL",
        detail: "Vence en 18 días · actualizar firma",
        status: "Por vencer",
        tone: "warn",
      },
      {
        name: "Caso Ley Karin #2026-014",
        detail: "Derivado a investigación externa",
        status: "En curso",
        tone: "info",
      },
    ],
  },
  {
    label: "Trazabilidad",
    icon: LockKeyhole,
    title: "Permisos claros y actividad trazable",
    description: "Separa accesos por rol y conserva contexto para controles internos.",
    modules: ["Configuración", "Registro de Actividad", "MFA administrativo", "Datos por empresa"],
    stats: [
      { label: "Usuarios con MFA", value: "100%" },
      { label: "Roles definidos", value: "14" },
      { label: "Eventos hoy", value: "231" },
    ],
    records: [
      {
        name: "Admin. empresa · R. Soto",
        detail: "Aprobó 3 solicitudes de vacaciones",
        status: "09:42",
        tone: "info",
      },
      {
        name: "Prevencionista · L. Díaz",
        detail: "Cerró incidente DS 44 #118",
        status: "09:15",
        tone: "ok",
      },
      {
        name: "Intento de acceso sin MFA",
        detail: "Bloqueado · se notificó al usuario",
        status: "Bloqueado",
        tone: "warn",
      },
    ],
  },
];

const LID_CLOSED_DEG = -95;
const LID_SCROLL_RANGE = 560;

export function DashboardPreview() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [opening, setOpening] = useState(true);
  const lidRef = useRef<HTMLDivElement>(null);
  const activeView = views[activeIndex];
  const ActiveIcon = activeView.icon;

  // La tapa parte cerrada antes del primer pintado para que la transición la abra.
  useLayoutEffect(() => {
    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setOpening(false);
      return;
    }
    lidRef.current?.style.setProperty("transform", `rotateX(${LID_CLOSED_DEG}deg)`);
  }, []);

  useEffect(() => {
    const lid = lidRef.current;
    if (!lid || !opening) return;
    let raf = 0;
    const apply = () => {
      const t = Math.min(1, Math.max(0, window.scrollY / LID_SCROLL_RANGE));
      lid.style.transform = `rotateX(${LID_CLOSED_DEG * t}deg)`;
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(apply);
    };
    // Abre la tapa en el siguiente frame; luego el scroll la va cerrando.
    raf = requestAnimationFrame(() => requestAnimationFrame(apply));
    const timer = window.setTimeout(() => setOpening(false), 1500);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
    };
  }, [opening]);

  return (
    <div
      className="landing-preview-wrap"
      role="group"
      aria-label="Vista demostrativa e interactiva de BJSIGAPP en laptop"
    >
      <div
        className={`landing-device-frame landing-device-frame--laptop${opening ? " landing-laptop-opening" : ""}`}
      >
        <div className="landing-preview" ref={lidRef}>
          <div className="landing-laptop-viewport grid min-h-[360px] grid-cols-1 bg-slate-100 sm:grid-cols-[150px_1fr]">
            <nav
              aria-label="Vistas del panel ilustrativo"
              className="hidden border-r border-slate-200 bg-slate-50 p-3 sm:block"
            >
              <p className="px-2 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                Áreas
              </p>
              <div className="space-y-1">
                {views.map(({ label, icon: Icon }, index) => (
                  <button
                    key={label}
                    type="button"
                    aria-pressed={activeIndex === index}
                    onClick={() => setActiveIndex(index)}
                    className={`flex min-h-10 w-full items-center gap-2 rounded-lg px-2 text-left text-[11px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${activeIndex === index ? "bg-blue-100 text-blue-800" : "text-slate-600 hover:bg-white"}`}
                  >
                    <Icon size={14} aria-hidden="true" />
                    {label}
                  </button>
                ))}
              </div>
              <p className="mt-5 px-2 text-[10px] leading-4 text-slate-500">
                Datos ilustrativos. Las vistas dependen de la configuración.
              </p>
            </nav>

            <div className="min-w-0 p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <p className="truncate text-xs font-semibold text-slate-600">
                  Empresa de ejemplo · Todas las sucursales
                </p>
                <CalendarDays size={16} className="shrink-0 text-slate-400" aria-hidden="true" />
              </div>
              <nav
                aria-label="Secciones del panel ilustrativo"
                className="mb-4 flex gap-1 overflow-x-auto pb-1 sm:hidden"
              >
                {views.map(({ label }, index) => (
                  <button
                    key={label}
                    type="button"
                    aria-pressed={activeIndex === index}
                    onClick={() => setActiveIndex(index)}
                    className={`min-h-10 shrink-0 rounded-lg px-3 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${activeIndex === index ? "bg-blue-100 text-blue-800" : "text-slate-600 hover:bg-white"}`}
                  >
                    {label}
                  </button>
                ))}
              </nav>

              <section
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
                aria-live="polite"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                    <ActiveIcon size={18} aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 sm:text-base">
                      {activeView.title}
                    </h2>
                    <p className="mt-1 text-xs leading-5 text-slate-600">
                      {activeView.description}
                    </p>
                  </div>
                </div>
                <dl className="mt-4 grid grid-cols-3 gap-2">
                  {activeView.stats.map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2"
                    >
                      <dt className="text-[10px] font-medium leading-3 text-slate-500">
                        {stat.label}
                      </dt>
                      <dd className="mt-1 text-base font-bold leading-5 text-slate-900">
                        {stat.value}
                      </dd>
                    </div>
                  ))}
                </dl>

                <ul className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200">
                  {activeView.records.map((record) => (
                    <li key={record.name} className="flex items-center gap-2.5 px-3 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-slate-800">
                          {record.name}
                        </p>
                        <p className="truncate text-[11px] leading-4 text-slate-500">
                          {record.detail}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          record.tone === "ok"
                            ? "bg-emerald-50 text-emerald-700"
                            : record.tone === "warn"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-blue-50 text-blue-700"
                        }`}
                      >
                        {record.status}
                      </span>
                    </li>
                  ))}
                </ul>

                <ul className="mt-4 divide-y divide-slate-100 border-t border-slate-100">
                  {activeView.modules.map((module) => (
                    <li
                      key={module}
                      className="flex min-h-10 items-center gap-2 py-2 text-xs font-medium text-slate-700"
                    >
                      <CheckCircle2
                        size={14}
                        className="shrink-0 text-blue-600"
                        aria-hidden="true"
                      />
                      {module}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 border-t border-slate-100 pt-3 text-[10px] leading-4 text-slate-600">
                  Datos de demostración. Los módulos y accesos se configuran por empresa.
                </p>
              </section>
            </div>
          </div>
        </div>
        <div className="landing-laptop-hinge" aria-hidden="true" />
        <div className="landing-laptop-base" aria-hidden="true" />
      </div>

      <p
        className="landing-device-note"
        aria-label="Interfaz adaptable a laptop, teléfono y tablet"
      >
        <span>Interfaz adaptable a</span>
        <span>
          <Laptop size={14} aria-hidden="true" /> laptop
        </span>
        <span>
          <Smartphone size={14} aria-hidden="true" /> teléfono
        </span>
        <span>
          <Tablet size={14} aria-hidden="true" /> tablet
        </span>
      </p>
    </div>
  );
}
