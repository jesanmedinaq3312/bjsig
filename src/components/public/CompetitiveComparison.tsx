import { ArrowRight, ArrowUpRight, Check, CircleHelp } from "lucide-react";

type SourceLink = { label: string; url: string };
type Competitor = {
  id: string;
  name: string;
  category: string;
  focus: string;
  highlights: string[];
  bjsigDifference: string;
  sources: SourceLink[];
};

const workflowSteps = [
  {
    number: "01",
    title: "Personas",
    detail: "Fichas, procesos laborales, documentos y solicitudes.",
  },
  {
    number: "02",
    title: "Jornada",
    detail: "Asistencia y turnos vinculados a trabajadores y sucursales.",
  },
  {
    number: "03",
    title: "Prevención en terreno",
    detail: "EPP, incidentes, charlas, matrices IPER y auditoría ISO.",
  },
  {
    number: "04",
    title: "Seguimiento por empresa",
    detail: "Responsables, evidencias, permisos y módulos por organización.",
  },
];

const competitors: Competitor[] = [
  {
    id: "buk",
    name: "Buk",
    category: "Suite de gestión de personas",
    focus:
      "Automatización de procesos de RR. HH. con remuneraciones, asistencia y atención al colaborador.",
    highlights: [
      "Remuneraciones y control de asistencia.",
      "SST documental, requisitos y evidencias de cumplimiento.",
      "Entrega de EPP y charlas; las inspecciones en terreno aparecen como próximas.",
    ],
    bjsigDifference:
      "BJSIGAPP pone al mismo nivel la prevención operacional y el seguimiento en terreno —incluidos IPER e incidentes— dentro del contexto de cada empresa.",
    sources: [
      { label: "Administración de personas", url: "https://www.buk.cl/productos/administracion" },
      {
        label: "Remuneraciones",
        url: "https://www.buk.cl/productos/administracion/software-de-remuneraciones",
      },
      {
        label: "Control de asistencia",
        url: "https://www.buk.cl/productos/administracion/control-de-asistencia",
      },
      {
        label: "Seguridad y salud en el trabajo",
        url: "https://www.buk.cl/productos/administracion/seguridad-salud-en-el-trabajo-sst",
      },
      {
        label: "Servicio al colaborador",
        url: "https://www.buk.cl/productos/administracion/servicio-al-colaborador",
      },
    ],
  },
  {
    id: "talana",
    name: "Talana",
    category: "Gestión de RR. HH. all-in-one",
    focus: "Centraliza gestión de personas, remuneraciones, asistencia y autoservicio móvil.",
    highlights: [
      "Nómina, asistencia y planificación de turnos.",
      "Portal y app para documentos, permisos y vacaciones.",
      "Capacitaciones obligatorias con registros y trazabilidad.",
    ],
    bjsigDifference:
      "BJSIGAPP une la gestión de personas y turnos con EPP, incidentes e IPER, además de capacitaciones y seguimiento preventivo.",
    sources: [
      { label: "Sitio oficial", url: "https://web.talana.com/" },
      { label: "Remuneraciones", url: "https://web.talana.com/software-remuneraciones" },
      {
        label: "Asistencia de personal",
        url: "https://web.talana.com/software-de-asistencia-de-personal",
      },
      {
        label: "Administración de RR. HH.",
        url: "https://web.talana.com/software-administracion-recursos-humanos",
      },
      {
        label: "Capacitación en seguridad y salud",
        url: "https://web.talana.com/blog/capacitacion-en-seguridad-y-salud",
      },
    ],
  },
  {
    id: "geovictoria",
    name: "GeoVictoria",
    category: "Asistencia y gestión del tiempo",
    focus: "Marcación, planificación de turnos, control de acceso y operación en varias sedes.",
    highlights: [
      "Marcación por distintos medios y reportes de jornada.",
      "Planificador de turnos, permisos y vacaciones.",
      "Integra datos de asistencia con nómina; no se confirma procesamiento de nómina propio.",
    ],
    bjsigDifference:
      "BJSIGAPP agrega a la jornada de trabajo los procesos de personas y prevención operacional en el mismo contexto multiempresa configurable.",
    sources: [
      { label: "Sitio oficial Chile", url: "https://www.geovictoria.com/es-cl/" },
      {
        label: "Planificador inteligente",
        url: "https://www.geovictoria.com/es-cl/servicios/planificador-inteligente/",
      },
      {
        label: "Permisos y vacaciones",
        url: "https://www.geovictoria.com/es-cl/servicios/permisos-y-vacaciones/",
      },
      {
        label: "Control de acceso",
        url: "https://www.geovictoria.com/es-cl/servicios/control-de-acceso/",
      },
      {
        label: "Asistencia y cumplimiento de subcontratación",
        url: "https://www.geovictoria.com/es-cl/blog/control-de-asistencia-en-el-cumplimiento-de-la-ley-de-subcontratacion/",
      },
    ],
  },
  {
    id: "factorial",
    name: "Factorial",
    category: "RR. HH., nómina y tiempo",
    focus: "Procesos de personas y administración con herramientas de nómina, asistencia y turnos.",
    highlights: [
      "Nóminas y gestión de variables.",
      "Fichaje, turnos y planificación de horarios.",
      "Portal del empleado con documentos y solicitudes.",
    ],
    bjsigDifference:
      "BJSIGAPP pone el foco adicional en prevención, EPP e incidentes en terreno, organizados por empresa, sucursal y permisos.",
    sources: [
      { label: "Sitio oficial Chile", url: "https://factorialhr.cl/" },
      { label: "Nóminas", url: "https://factorialhr.cl/nominas" },
      { label: "Control de asistencia", url: "https://factorialhr.cl/control-asistencia" },
      { label: "Gestión de turnos", url: "https://factorial.com/cl/gestion-turnos" },
      { label: "Portal del empleado", url: "https://factorial.com/cl/portal-del-empleado" },
    ],
  },
  {
    id: "rex-plus",
    name: "Rex+",
    category: "Remuneraciones y gestión de personas",
    focus: "Gestión laboral con asistencia, múltiples empresas y autoservicio del colaborador.",
    highlights: [
      "Remuneraciones, personas y gestión de varios RUT.",
      "Control de asistencia y portal del colaborador.",
      "Canal de denuncias Ley Karin, una función distinta de la gestión de incidentes SST.",
    ],
    bjsigDifference:
      "BJSIGAPP conecta los procesos de personas con la prevención diaria: EPP, incidentes, charlas, IPER y seguimiento de terreno.",
    sources: [
      {
        label: "Software de recursos humanos",
        url: "https://rexmas.com/software-de-recursos-humanos/",
      },
      {
        label: "Software de remuneraciones",
        url: "https://rexmas.com/software-de-remuneraciones/",
      },
      { label: "Control de asistencia", url: "https://rexmas.com/control-de-asistencia/" },
      { label: "Portal del colaborador", url: "https://rexmas.com/portal-del-colaborador/" },
      {
        label: "Ley Karin y canal de denuncias",
        url: "https://rexmas.com/ley-karin-canal-de-denuncias/",
      },
    ],
  },
];

const bjsigSources: SourceLink[] = [
  { label: "Módulos públicos de BJSIGAPP", url: "/modulos" },
  { label: "Prevención y trabajo en terreno", url: "/modulos/prevencion-de-riesgos" },
  { label: "EPP e inventario", url: "/modulos/epp-e-inventario" },
  { label: "Plataforma multiempresa", url: "/modulos/plataforma-multiempresa" },
];

export function CompetitiveComparison() {
  return (
    <section
      id="comparativa"
      aria-labelledby="competitive-comparison-title"
      className="scroll-mt-20 bg-slate-50 px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
    >
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-end lg:gap-16">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-700">
              Comparativa por enfoque
            </p>
            <h2
              id="competitive-comparison-title"
              className="public-h2 mt-3 max-w-2xl text-3xl font-bold leading-tight tracking-tight sm:text-4xl"
            >
              BJSIGAPP conecta RR. HH. con prevención y terreno
            </h2>
          </div>
          <p className="public-body max-w-2xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
            Buk, Talana, GeoVictoria, Factorial y Rex+ tienen ofertas con focos distintos en gestión
            de personas, nómina o control del tiempo. La propuesta de BJSIGAPP es poner en primer
            plano el vínculo entre trabajador, jornada, prevención y operación de cada empresa.
          </p>
        </div>

        <article className="relative mt-8 overflow-hidden rounded-3xl bg-slate-950 p-5 text-white shadow-xl shadow-slate-900/10 sm:mt-10 sm:p-8 lg:p-10">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-blue-600/20 blur-3xl"
          />
          <div className="relative">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex min-h-8 items-center gap-2 rounded-full border border-cyan-200/25 bg-cyan-200/10 px-3 text-xs font-bold uppercase tracking-[0.12em] text-cyan-200">
                <Check size={14} aria-hidden="true" />
                Nuestra diferencia
              </span>
              <span className="text-sm text-slate-400">BJSIGAPP</span>
            </div>
            <div className="mt-5 grid gap-5 lg:grid-cols-[0.8fr_1.2fr] lg:items-end lg:gap-10">
              <div>
                <h3 className="max-w-xl text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
                  Una operación conectada, no solo una lista de módulos
                </h3>
                <p className="mt-4 max-w-xl text-sm leading-6 text-slate-300 sm:text-base sm:leading-7">
                  La diferenciación está en relacionar los procesos de personas y asistencia con
                  prevención y trabajo en terreno, conservando el contexto de la empresa en cada
                  etapa.
                </p>
              </div>
              <ol className="grid gap-3 sm:grid-cols-2">
                {workflowSteps.map((step) => (
                  <li
                    key={step.number}
                    className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 sm:p-5"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-cyan-300">
                        {step.number}
                      </span>
                      <h4 className="text-sm font-bold text-white sm:text-base">{step.title}</h4>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-slate-300 sm:text-sm sm:leading-6">
                      {step.detail}
                    </p>
                  </li>
                ))}
              </ol>
            </div>

            <div className="mt-6 flex flex-col gap-4 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-3xl text-xs leading-5 text-slate-300 sm:text-sm sm:leading-6">
                Empresas, sucursales, permisos, identidad y módulos se configuran según cada
                organización. La demostración permite confirmar el alcance habilitado para tu caso.
              </p>
              <a
                href="#contacto"
                className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              >
                Verlo en una demo <ArrowRight size={15} aria-hidden="true" />
              </a>
            </div>
          </div>
        </article>

        <div className="mt-12 sm:mt-16">
          <div className="flex flex-col gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                El panorama de otras plataformas
              </p>
              <h3 className="mt-2 text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
                Cada una comunica una fortaleza distinta
              </h3>
            </div>
            <p className="max-w-xl text-sm leading-6 text-slate-600">
              Comparamos su foco público, no la lista completa de lo que cada proveedor podría
              ofrecer en otros planes o configuraciones.
            </p>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {competitors.map((competitor) => (
              <article
                key={competitor.id}
                className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
              >
                <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">
                  {competitor.category}
                </span>
                <h4 className="mt-2 text-lg font-bold tracking-tight text-slate-950">
                  {competitor.name}
                </h4>
                <p className="mt-2 text-sm leading-6 text-slate-600">{competitor.focus}</p>

                <div className="mt-4 border-t border-slate-100 pt-4">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                    Lo que destaca públicamente
                  </p>
                  <ul className="mt-2 space-y-2">
                    {competitor.highlights.map((highlight) => (
                      <li key={highlight} className="flex gap-2 text-xs leading-5 text-slate-700">
                        <Check
                          size={14}
                          className="mt-0.5 shrink-0 text-slate-500"
                          aria-hidden="true"
                        />
                        <span>{highlight}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-4 rounded-xl bg-blue-50 p-3.5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-blue-800">
                    Dónde se distingue BJSIGAPP
                  </p>
                  <p className="mt-1.5 text-xs leading-5 text-slate-700">
                    {competitor.bjsigDifference}
                  </p>
                </div>

                <a
                  href={competitor.sources[0].url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-auto inline-flex min-h-10 items-center gap-1 pt-4 text-xs font-semibold text-blue-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"
                >
                  Ver enfoque oficial <ArrowUpRight size={13} aria-hidden="true" />
                </a>
              </article>
            ))}
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs leading-5 text-slate-600 sm:text-sm">
          <span className="inline-flex items-start gap-2">
            <CircleHelp size={15} className="mt-0.5 shrink-0 text-slate-500" aria-hidden="true" />
            <span>
              Revisión de páginas oficiales al 16 de noviembre de 2026. «No verificado» significa
              que no se encontró respaldo en los enlaces consultados; no significa que la función no
              exista. Planes, disponibilidad, integraciones y configuración deben confirmarse con
              cada proveedor.
            </span>
          </span>
        </div>

        <details className="mt-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-3 text-sm font-semibold text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700">
            Ver todas las fuentes oficiales consultadas
            <ArrowRight size={16} className="shrink-0 text-blue-700" aria-hidden="true" />
          </summary>
          <ul className="mt-4 grid gap-x-8 gap-y-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <li>
              <h4 className="font-semibold text-slate-900">BJSIGAPP</h4>
              <ul className="mt-1 space-y-1">
                {bjsigSources.map((source) => (
                  <li key={source.url}>
                    <a
                      href={source.url}
                      className="inline-flex min-h-8 items-center text-blue-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"
                    >
                      {source.label}
                    </a>
                  </li>
                ))}
              </ul>
            </li>
            {competitors.map((competitor) => (
              <li key={competitor.id}>
                <h4 className="font-semibold text-slate-900">{competitor.name}</h4>
                <ul className="mt-1 space-y-1">
                  {competitor.sources.map((source) => (
                    <li key={source.url}>
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-8 items-center gap-1 text-blue-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"
                      >
                        {source.label}
                        <ArrowUpRight size={13} aria-hidden="true" />
                      </a>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </details>
      </div>
    </section>
  );
}
