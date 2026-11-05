import { useState } from "react";
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

const views = [
  {
    label: "Panorama",
    icon: BarChart3,
    title: "La operación, en contexto",
    description: "Consulta la actividad y los pendientes visibles para la empresa seleccionada.",
    modules: ["Dashboard", "Historial y Calendario", "Indicadores ACHS / CPHS"],
  },
  {
    label: "Empresas",
    icon: BriefcaseBusiness,
    title: "La gestión, organizada por empresa",
    description: "Ordena sucursales, equipos y responsables dentro de cada organización.",
    modules: ["Empresas y sucursales", "Departamentos", "Organigrama", "Roles y permisos"],
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
  },
  {
    label: "Trazabilidad",
    icon: LockKeyhole,
    title: "Permisos claros y actividad trazable",
    description: "Separa accesos por rol y conserva contexto para controles internos.",
    modules: ["Configuración", "Registro de Actividad", "MFA administrativo", "Datos por empresa"],
  },
];

export function DashboardPreview() {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeView = views[activeIndex];
  const ActiveIcon = activeView.icon;

  return (
    <div
      className="landing-preview-wrap"
      role="group"
      aria-label="Vista demostrativa e interactiva de BJSIGAPP en laptop"
    >
      <div className="landing-device-frame landing-device-frame--laptop">
        <div className="landing-preview">
          <div className="landing-window-bar flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-white/75">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 font-bold text-white">
                B
              </span>
              <span className="font-semibold">BJSIGAPP · panel de gestión</span>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-2.5 py-1 text-[10px] text-white/70">
              <Laptop size={12} aria-hidden="true" /> Vista en laptop
            </span>
          </div>

          <div className="grid min-h-[360px] grid-cols-1 bg-slate-100 sm:grid-cols-[150px_1fr]">
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
                  Alcance ilustrativo. Los módulos y accesos se configuran por empresa.
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
