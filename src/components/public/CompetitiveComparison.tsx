import { ArrowRight, ArrowUpRight, Check, CircleHelp } from "lucide-react";

type SourceLink = { label: string; url: string };

const dimensions = [
  { id: "people", label: "Personas, RR. HH. y nómina" },
  { id: "time", label: "Asistencia, turnos y jornada" },
  { id: "employee", label: "Portal, autoservicio y solicitudes" },
  { id: "safety", label: "Prevención y seguridad laboral" },
  { id: "field", label: "EPP, incidentes y trabajo en terreno" },
  { id: "documents", label: "Documentos, capacitación y evidencia" },
  { id: "multiCompany", label: "Multiempresa y sucursales" },
] as const;

type DimensionId = (typeof dimensions)[number]["id"];
type Provider = {
  id: string;
  name: string;
  focus: string;
  sources: SourceLink[];
  evidence: Partial<Record<DimensionId, string>>;
};

const providers: Provider[] = [
  {
    id: "bjsig",
    name: "BJSIGAPP",
    focus: "Personas conectadas con prevención y operación en el contexto de cada empresa.",
    sources: [{ label: "Explorar módulos de BJSIGAPP", url: "/modulos" }],
    evidence: {
      people: "Gestión de personas, RR. HH., nómina y liquidaciones, según módulos habilitados.",
      time: "Asistencia y turnos relacionados con trabajadores, equipos y sucursales.",
      employee: "Portal con documentos, asistencia, turnos, capacitaciones y solicitudes.",
      safety: "Prevención de riesgos, actividades de terreno, matrices IPER y auditoría ISO.",
      field: "EPP, incidentes, charlas y seguimiento, según módulos configurados.",
      documents: "Documentos laborales y normativos, capacitaciones y registros de seguimiento.",
      multiCompany:
        "Empresas, sucursales, permisos, branding y módulos configurables por organización.",
    },
  },
  {
    id: "buk",
    name: "Buk",
    focus: "Gestión de personas con remuneraciones, asistencia, atención al colaborador y SST.",
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
    evidence: {
      people: "Gestión de personas y procesamiento de remuneraciones.",
      time: "Marcajes, jornadas, turnos, horas extra y múltiples recintos.",
      employee: "Centro de ayuda multicanal para atender consultas y crear tickets.",
      safety: "SST documental, requisitos, vencimientos y evidencia de cumplimiento.",
      field:
        "Publica entrega de EPP, charlas e inducciones; inspecciones en terreno figuran como próximas.",
      documents: "Documentación de cumplimiento y evidencias para fiscalizaciones.",
      multiCompany: "Multi-RUT y configuración independiente de varias sociedades.",
    },
  },
  {
    id: "talana",
    name: "Talana",
    focus: "Gestión de personas, remuneraciones, asistencia y autoservicio para colaboradores.",
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
    evidence: {
      people: "Procesos de personas y remuneraciones para múltiples razones sociales.",
      time: "Marcajes, planificación de turnos, jornadas y horas extra.",
      employee: "Portal y app para documentos, permisos, vacaciones y seguimiento de solicitudes.",
      safety:
        "Capacitaciones obligatorias con registros y trazabilidad; alcance SST integral no confirmado.",
      field:
        "EPP e incidentes aparecen como contenidos preventivos; no se confirma su gestión como módulo.",
      documents: "Documentos laborales y registros de cursos, asistencia y evaluación.",
      multiCompany:
        "Varias empresas y sucursales, con información y liquidaciones por razón social.",
    },
  },
  {
    id: "geovictoria",
    name: "GeoVictoria",
    focus: "Control de asistencia, planificación del tiempo, acceso y operación en varias sedes.",
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
    evidence: {
      people:
        "Integra datos de asistencia con sistemas de RR. HH. y remuneraciones; nómina propia no confirmada.",
      time: "Marcaje por distintos medios, turnos, planificación y reportes de jornada.",
      employee:
        "Solicitudes de vacaciones y permisos con aprobación y seguimiento; consulta de turnos en app.",
      safety:
        "Publica control de acceso y presencia; gestión SST no identificada en las fuentes consultadas.",
      documents: "Reportes de asistencia y trazabilidad por empresa, faena, jornada o trabajador.",
      multiCompany: "Varias razones sociales y sedes con reportes filtrables por operación.",
    },
  },
  {
    id: "factorial",
    name: "Factorial",
    focus: "RR. HH., nóminas, gestión del tiempo, talento y procesos administrativos.",
    sources: [
      { label: "Sitio oficial Chile", url: "https://factorialhr.cl/" },
      { label: "Nóminas", url: "https://factorialhr.cl/nominas" },
      { label: "Control de asistencia", url: "https://factorialhr.cl/control-asistencia" },
      { label: "Gestión de turnos", url: "https://factorial.com/cl/gestion-turnos" },
      { label: "Portal del empleado", url: "https://factorial.com/cl/portal-del-empleado" },
    ],
    evidence: {
      people: "Herramientas de RR. HH. y nóminas con revisión y validación de variables.",
      time: "Fichaje web o móvil, registro de jornada e informes de horas.",
      employee:
        "Portal con nóminas y documentos; permite solicitudes de ausencias y cambios de turno.",
      documents: "Acceso de colaboradores a nóminas, perfiles y documentos.",
    },
  },
  {
    id: "rex-plus",
    name: "Rex+",
    focus: "Remuneraciones y gestión de personas con asistencia y autoservicio del colaborador.",
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
    evidence: {
      people: "Gestión de personas, remuneraciones, contratos y documentos laborales.",
      time: "Marcajes y jornadas con opciones móviles, web y reloj control.",
      employee: "Portal y app para documentos, vacaciones, permisos, anticipos y solicitudes.",
      safety: "Canal de denuncias para Ley Karin; no se equipara aquí a gestión SST.",
      documents: "Contratos y anexos, liquidaciones, certificados y firma de documentos.",
      multiCompany: "Gestión de varias empresas y RUT, perfiles y contratos.",
    },
  },
];

export function CompetitiveComparison() {
  return (
    <section
      id="comparativa"
      aria-labelledby="competitive-comparison-title"
      className="scroll-mt-20 bg-white px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
    >
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-end lg:gap-16">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-700">
              Comparativa transparente
            </p>
            <h2
              id="competitive-comparison-title"
              className="public-h2 mt-3 max-w-2xl text-3xl font-bold leading-tight tracking-tight sm:text-4xl"
            >
              Compara por lo que tu operación necesita conectar
            </h2>
          </div>
          <div className="max-w-2xl">
            <p className="public-body text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
              Buk, Talana, GeoVictoria, Factorial y Rex+ publican fortalezas distintas en gestión de
              personas, tiempo y operación. BJSIGAPP reúne RR. HH. con prevención y trabajo en
              terreno dentro del contexto de cada empresa.
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Revisa el alcance de los módulos, planes, países e integraciones con cada proveedor:
              la información de la tabla resume solo las páginas oficiales enlazadas.
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs leading-5 text-slate-600 sm:mt-10 sm:text-sm">
          <span className="inline-flex items-center gap-2">
            <Check size={16} className="shrink-0 text-blue-700" aria-hidden="true" />
            Capacidad descrita en las fuentes oficiales
          </span>
          <span className="inline-flex items-center gap-2">
            <CircleHelp size={16} className="shrink-0 text-slate-500" aria-hidden="true" />
            No verificado en las páginas consultadas; no significa que no exista
          </span>
        </div>

        <div
          role="region"
          aria-label="Tabla comparativa de BJSIGAPP y otros sistemas. Desplázate horizontalmente para ver todas las columnas."
          tabIndex={0}
          className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
        >
          <table className="w-full min-w-[1120px] border-collapse text-left text-xs leading-5 sm:text-sm">
            <caption className="sr-only">
              Capacidades descritas públicamente por BJSIGAPP, Buk, Talana, GeoVictoria, Factorial y
              Rex+, basadas en las fuentes oficiales enlazadas.
            </caption>
            <thead>
              <tr className="bg-slate-50 text-slate-700">
                <th
                  scope="col"
                  className="sticky left-0 z-20 w-48 border-b border-slate-200 bg-slate-50 px-4 py-4 font-semibold sm:w-56 sm:px-5"
                >
                  Área funcional
                </th>
                {providers.map((provider) => (
                  <th
                    key={provider.id}
                    scope="col"
                    className={`w-40 border-b border-slate-200 px-3 py-4 align-top sm:w-44 sm:px-4 ${provider.id === "bjsig" ? "bg-blue-700 text-white" : ""}`}
                  >
                    <span className="block text-sm font-bold sm:text-base">{provider.name}</span>
                    <span
                      className={`mt-1 block text-[11px] font-normal leading-4 sm:text-xs ${provider.id === "bjsig" ? "text-blue-100" : "text-slate-500"}`}
                    >
                      {provider.id === "bjsig" ? "Sistema comparado" : provider.focus}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dimensions.map((dimension) => (
                <tr key={dimension.id} className="align-top even:bg-slate-50/70">
                  <th
                    scope="row"
                    className="sticky left-0 z-10 border-b border-slate-200 bg-white px-4 py-4 font-semibold text-slate-900 even:bg-slate-50 sm:px-5"
                  >
                    {dimension.label}
                  </th>
                  {providers.map((provider) => {
                    const detail = provider.evidence[dimension.id];
                    return (
                      <td
                        key={provider.id}
                        className={`border-b border-slate-200 px-3 py-4 sm:px-4 ${provider.id === "bjsig" ? "bg-blue-50/80" : ""}`}
                      >
                        {detail ? (
                          <span className="flex gap-2 text-slate-700">
                            <Check
                              size={15}
                              className="mt-0.5 shrink-0 text-blue-700"
                              aria-hidden="true"
                            />
                            <span>{detail}</span>
                          </span>
                        ) : (
                          <span className="flex gap-2 text-slate-500">
                            <CircleHelp size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
                            <span>No verificado en las páginas oficiales consultadas.</span>
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-500 sm:hidden">
          Desliza la tabla horizontalmente para comparar todas las plataformas.
        </p>

        <div className="mt-5 grid gap-5 rounded-2xl border border-blue-200 bg-blue-50/70 p-5 sm:p-6 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <h3 className="text-base font-bold text-slate-950">El diferencial de BJSIGAPP</h3>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-700">
              Además de personas, asistencia, turnos y portal del trabajador, BJSIGAPP conecta
              prevención, EPP, incidentes, charlas, matrices IPER, auditoría ISO y seguimiento de
              terreno. Empresas, sucursales, branding, permisos y módulos se habilitan según la
              configuración de cada organización.
            </p>
          </div>
          <a
            href="#contacto"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
          >
            Revisar un flujo real <ArrowRight size={15} aria-hidden="true" />
          </a>
        </div>

        <details className="mt-5 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-3 text-sm font-semibold text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700">
            Ver fuentes oficiales consultadas
            <ArrowRight size={16} className="shrink-0 text-blue-700" aria-hidden="true" />
          </summary>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            Revisión: 16 de noviembre de 2026. Las páginas son fuentes de cada proveedor, no una
            auditoría independiente. «No verificado» significa que no encontramos respaldo en los
            enlaces consultados; no confirma que la función esté ausente. Confirma el alcance,
            disponibilidad y configuración directamente con cada proveedor.
          </p>
          <ul className="mt-4 grid gap-x-8 gap-y-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {providers.map((provider) => (
              <li key={provider.id}>
                <h3 className="font-semibold text-slate-900">{provider.name}</h3>
                <ul className="mt-1 space-y-1">
                  {provider.sources.map((source) => (
                    <li key={source.url}>
                      <a
                        href={source.url}
                        {...(source.url.startsWith("https://")
                          ? { target: "_blank", rel: "noopener noreferrer" }
                          : {})}
                        className="inline-flex min-h-8 items-center gap-1 text-blue-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"
                      >
                        {source.label}
                        {source.url.startsWith("https://") && (
                          <ArrowUpRight size={13} aria-hidden="true" />
                        )}
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
