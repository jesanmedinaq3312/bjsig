import { ArrowRight, Check, CircleHelp } from "lucide-react";

type Competitor = {
  id: string;
  name: string;
  category: string;
  focus: string;
  publicFeatures: string[];
  chooseBjsigWhen: string;
  notIdentified: string;
};

const bjsigFeatures = [
  {
    number: "01",
    title: "RR. HH. + jornada",
    detail: "Personas, documentos, solicitudes, asistencia y turnos conectados por empresa.",
  },
  {
    number: "02",
    title: "EPP con trazabilidad",
    detail: "Inventario, entregas, firmas, movimientos y reposición vinculados a cada trabajador.",
  },
  {
    number: "03",
    title: "Prevención operativa",
    detail: "Actividades de terreno, incidentes, charlas, matrices IPER y auditoría ISO.",
  },
  {
    number: "04",
    title: "Contexto multiempresa",
    detail: "Empresas, sucursales, permisos, identidad y módulos configurables por organización.",
  },
];

const competitors: Competitor[] = [
  {
    id: "buk",
    name: "Buk",
    category: "Suite de gestión de personas",
    focus:
      "Su oferta pública combina remuneraciones, asistencia, servicio al colaborador y herramientas de SST.",
    publicFeatures: [
      "Remuneraciones y control de asistencia.",
      "SST documental, evidencias, entrega de EPP y charlas.",
    ],
    chooseBjsigWhen:
      "Tu operación necesita unir la ficha del trabajador y su jornada con EPP, incidentes, matrices IPER y cierre de acciones en terreno.",
    notIdentified:
      "No identificamos ese flujo SST de incidentes e IPER con seguimiento de acciones. Buk sí publica documentación SST, EPP y charlas.",
  },
  {
    id: "talana",
    name: "Talana",
    category: "Gestión de RR. HH. all-in-one",
    focus: "Centraliza gestión de personas, remuneraciones, asistencia y autoservicio móvil.",
    publicFeatures: [
      "Nómina, marcaciones y planificación de turnos.",
      "Portal del trabajador y capacitaciones con registros y trazabilidad.",
    ],
    chooseBjsigWhen:
      "Además de personas, turnos y capacitación, necesitas controlar entrega de EPP, incidentes y acciones preventivas por empresa.",
    notIdentified:
      "No encontramos control operativo de entregas EPP ni gestión de incidentes SST/IPER en sus páginas de producto revisadas.",
  },
  {
    id: "geovictoria",
    name: "GeoVictoria",
    category: "Asistencia y gestión del tiempo",
    focus:
      "Se orienta a marcación, planificación de turnos, control de acceso y operación en varias sedes.",
    publicFeatures: [
      "Marcaciones por distintos medios, turnos y reportes de jornada.",
      "Permisos y vacaciones; integración de datos de asistencia con nómina.",
    ],
    chooseBjsigWhen:
      "No quieres quedarte solo en marcación y turnos: necesitas sumar RR. HH., EPP y seguimiento preventivo en la operación diaria.",
    notIdentified:
      "No identificamos módulos públicos de EPP, incidentes SST, matrices IPER o auditoría ISO.",
  },
  {
    id: "factorial",
    name: "Factorial",
    category: "RR. HH., nómina y tiempo",
    focus: "Reúne procesos de personas, nómina, fichaje, turnos y portal del empleado.",
    publicFeatures: [
      "Nómina, control de asistencia y planificación de horarios.",
      "Portal con documentos y solicitudes de trabajadores.",
    ],
    chooseBjsigWhen:
      "Tu operación necesita que RR. HH. y gestión del tiempo también cubran SST, EPP, incidentes y matrices IPER por sucursal.",
    notIdentified:
      "No encontramos un flujo de prevención de terreno publicado en las páginas consultadas.",
  },
  {
    id: "rex-plus",
    name: "Rex+",
    category: "Remuneraciones y gestión de personas",
    focus: "Publica remuneraciones, asistencia, varias empresas y autoservicio del colaborador.",
    publicFeatures: [
      "Gestión de personas y remuneraciones para varios RUT.",
      "Control de asistencia, portal y canal de denuncias Ley Karin.",
    ],
    chooseBjsigWhen:
      "Además de nómina y autoservicio, quieres conectar EPP, incidentes SST, IPER y seguimiento preventivo, diferenciándolos del canal de denuncias.",
    notIdentified:
      "No identificamos control de EPP ni incidentes SST/IPER. El canal Ley Karin publicado es un flujo diferente.",
  },
];

export function CompetitiveComparison() {
  return (
    <section
      id="comparativa"
      aria-labelledby="competitive-comparison-title"
      className="scroll-mt-20 bg-slate-50 px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
    >
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr] lg:items-end lg:gap-14">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-700">
              Lo que nos hace distintos
            </p>
            <h2
              id="competitive-comparison-title"
              className="public-h2 mt-3 max-w-2xl text-3xl font-bold leading-tight tracking-tight sm:text-4xl"
            >
              BJSIGAPP conecta RR. HH. con prevención y terreno
            </h2>
          </div>
          <p className="public-body max-w-2xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
            No es solo gestionar personas o marcar asistencia. BJSIGAPP reúne ese trabajo con EPP,
            incidentes y prevención operativa, y permite mantener el contexto de cada empresa,
            sucursal y equipo.
          </p>
        </div>

        <article className="relative mt-8 overflow-hidden rounded-3xl bg-slate-950 p-5 text-white shadow-xl shadow-slate-900/10 sm:mt-10 sm:p-8 lg:p-10">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-blue-600/25 blur-3xl"
          />
          <div className="relative">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex min-h-8 items-center gap-2 rounded-full border border-cyan-200/25 bg-cyan-200/10 px-3 text-xs font-bold uppercase tracking-[0.12em] text-cyan-200">
                <Check size={14} aria-hidden="true" />
                BJSIGAPP sí tiene
              </span>
              <span className="text-sm text-slate-400">
                Funciones propias, no promesas sobre terceros
              </span>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {bjsigFeatures.map((feature) => (
                <div
                  key={feature.number}
                  className="rounded-2xl border border-white/10 bg-white/[0.07] p-4 sm:p-5"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-cyan-300">
                      {feature.number}
                    </span>
                    <h3 className="text-sm font-bold text-white sm:text-base">{feature.title}</h3>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-300 sm:text-sm sm:leading-6">
                    {feature.detail}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-col gap-4 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-3xl text-xs leading-5 text-slate-300 sm:text-sm sm:leading-6">
                <strong className="font-bold text-white">La diferencia:</strong> personas, jornada,
                prevención y trazabilidad dentro de la misma plataforma multiempresa. Módulos y
                alcance pueden variar según la configuración habilitada para cada organización.
              </p>
              <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                <a
                  href="/modulos/prevencion-de-riesgos"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/20 px-4 py-2.5 text-sm font-bold text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                >
                  Ver módulos BJSIGAPP <ArrowRight size={15} aria-hidden="true" />
                </a>
                <a
                  href="#contacto"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                >
                  Solicitar demo <ArrowRight size={15} aria-hidden="true" />
                </a>
              </div>
            </div>
          </div>
        </article>

        <div className="mt-12 sm:mt-16">
          <div className="flex flex-col gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                Comparación por caso de uso
              </p>
              <h3 className="mt-2 text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
                ¿Por qué elegir BJSIGAPP frente a cada software?
              </h3>
            </div>
            <p className="max-w-xl text-sm leading-6 text-slate-600">
              Cada tarjeta señala cuándo el foco de BJSIGAPP puede encajar mejor con una operación
              que necesita prevención y gestión de terreno.
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
                    Lo que comunica públicamente
                  </p>
                  <ul className="mt-2 space-y-2">
                    {competitor.publicFeatures.map((feature) => (
                      <li key={feature} className="flex gap-2 text-xs leading-5 text-slate-700">
                        <Check
                          size={14}
                          className="mt-0.5 shrink-0 text-slate-500"
                          aria-hidden="true"
                        />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-3.5">
                  <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-blue-900">
                    <Check size={14} aria-hidden="true" />
                    BJSIGAPP es mejor opción si...
                  </p>
                  <p className="mt-1.5 text-xs leading-5 text-slate-700">
                    {competitor.chooseBjsigWhen}
                  </p>
                </div>

                <p className="mt-3 text-[11px] leading-5 text-slate-500">
                  <span className="font-semibold text-slate-700">
                    No identificado en la oferta pública revisada:
                  </span>{" "}
                  {competitor.notIdentified}
                </p>
              </article>
            ))}
          </div>
        </div>

        <p className="mt-5 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs leading-5 text-slate-600 sm:text-sm">
          Revisión de páginas oficiales de producto al 16 de noviembre de 2026. «No identificado»
          describe solo las páginas consultadas; no confirma que el proveedor no tenga esa función
          en otro módulo, plan o configuración. Las capacidades de BJSIGAPP también dependen de los
          módulos habilitados para cada organización.
        </p>
      </div>
    </section>
  );
}
