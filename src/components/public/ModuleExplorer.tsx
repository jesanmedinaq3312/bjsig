import { useState } from "react";
import { ArrowRight, ArrowUpRight, ChevronRight } from "lucide-react";
import { PUBLIC_MODULES, PUBLIC_MODULES_BY_SLUG, getPublicModulePath } from "@/lib/publicModules";

type ModuleArea = {
  id: string;
  label: string;
  title: string;
  description: string;
  slugs: string[];
  questions: { question: string; answer: string }[];
};

const areas: ModuleArea[] = [
  {
    id: "personas",
    label: "Personas y RR. HH.",
    title: "Personas y vida laboral",
    description:
      "Organiza información de trabajadores y acerca documentos, turnos y procesos de personas a cada equipo.",
    slugs: ["recursos-humanos", "asistencia-y-turnos", "portal-del-trabajador", "capacitaciones"],
    questions: [
      {
        question: "¿Qué puede consultar una persona trabajadora?",
        answer:
          "Puede ver la información que la empresa habilita para su cuenta, como documentos, turnos, asistencia, capacitaciones, solicitudes y comunicaciones.",
      },
      {
        question: "¿Los módulos de RR. HH. vienen todos incluidos?",
        answer:
          "La empresa define los módulos y permisos disponibles para cada organización y perfil. El catálogo ayuda a revisar cada función por separado.",
      },
    ],
  },
  {
    id: "terreno",
    label: "Prevención y terreno",
    title: "Prevención y equipos en terreno",
    description:
      "Registra actividades, incidentes, inventario y acciones de seguimiento vinculadas con la operación.",
    slugs: [
      "prevencion-de-riesgos",
      "epp-e-inventario",
      "capacitaciones",
      "indicadores-y-reportes",
    ],
    questions: [
      {
        question: "¿Qué procesos de terreno se pueden organizar?",
        answer:
          "El catálogo incluye controles de terreno, incidentes, matrices IPER, registros de EPP y capacitaciones, según los módulos y permisos de la empresa.",
      },
      {
        question: "¿La plataforma reemplaza una revisión profesional de prevención?",
        answer:
          "No. BJSIGAPP permite registrar información y dar seguimiento a procesos; no sustituye la evaluación profesional ni determina por sí sola el cumplimiento normativo.",
      },
    ],
  },
  {
    id: "documentos",
    label: "Documentos y cumplimiento",
    title: "Documentos, protocolos y seguimiento",
    description:
      "Mantén documentos y antecedentes de procesos internos vinculados a las empresas y personas autorizadas.",
    slugs: [
      "documentos-y-cumplimiento",
      "canal-de-denuncias",
      "ley-karin",
      "auditoria-y-trazabilidad",
    ],
    questions: [
      {
        question: "¿El módulo de Ley Karin determina si una empresa cumple?",
        answer:
          "No. Ayuda a organizar antecedentes, medidas y seguimiento definidos por la empresa. La evaluación de obligaciones y los procedimientos requieren revisión profesional.",
      },
      {
        question: "¿Quién puede acceder a documentos y reportes?",
        answer:
          "Los permisos asignados a cada perfil determinan qué vistas e información están disponibles dentro de la organización.",
      },
    ],
  },
  {
    id: "gestion",
    label: "Gestión empresarial",
    title: "Empresas, accesos y gestión operativa",
    description:
      "Administra varias organizaciones y consulta los procesos operativos habilitados para cada empresa.",
    slugs: [
      "plataforma-multiempresa",
      "solicitudes-y-comunicaciones",
      "finanzas-y-proveedores",
      "indicadores-y-reportes",
      "auditoria-y-trazabilidad",
    ],
    questions: [
      {
        question: "¿Los datos se mezclan entre empresas?",
        answer:
          "La información operativa queda asociada al contexto de cada organización. Los permisos determinan qué personas pueden consultar cada empresa y sus procesos.",
      },
      {
        question: "¿Cada organización puede tener módulos diferentes?",
        answer:
          "La plataforma permite configurar organizaciones, planes, módulos y permisos. El alcance concreto depende de la configuración acordada para cada empresa.",
      },
    ],
  },
];

const allQuestions = [
  {
    question: "¿Tengo que activar todos los módulos?",
    answer:
      "No. Revisa las páginas individuales y conversa con el equipo comercial sobre los módulos y permisos que necesita tu organización.",
  },
  {
    question: "¿Cómo sé qué módulo se ajusta a mi operación?",
    answer:
      "Elige un área para ver los procesos relacionados y abre el detalle del módulo que te interesa. En una demostración puedes revisar el alcance con tu equipo.",
  },
];

export function ModuleExplorer({ catalog = false }: { catalog?: boolean }) {
  const [activeId, setActiveId] = useState(catalog ? "all" : areas[0].id);
  const activeArea = areas.find((area) => area.id === activeId);
  const modules = activeArea
    ? activeArea.slugs
        .map((slug) => PUBLIC_MODULES_BY_SLUG[slug])
        .filter((module) => Boolean(module))
    : PUBLIC_MODULES;
  const questions = activeArea?.questions ?? allQuestions;
  const title = activeArea?.title ?? "Todos los módulos de BJSIGAPP";
  const description =
    activeArea?.description ??
    "Filtra por área para explorar cada página de producto y entender qué procesos puede organizar.";

  return (
    <div className="public-module-explorer">
      <div className="public-module-filter" role="group" aria-label="Filtrar módulos por necesidad">
        {catalog && (
          <button
            type="button"
            aria-pressed={activeId === "all"}
            aria-controls="module-explorer-content"
            onClick={() => setActiveId("all")}
          >
            Todos los módulos
          </button>
        )}
        {areas.map((area) => (
          <button
            key={area.id}
            type="button"
            aria-pressed={activeId === area.id}
            aria-controls="module-explorer-content"
            onClick={() => setActiveId(area.id)}
          >
            {area.label}
          </button>
        ))}
      </div>

      <section
        id="module-explorer-content"
        className="mt-8 grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16"
        aria-live="polite"
        aria-atomic="false"
      >
        <div>
          <h3 className="text-xl font-medium leading-snug tracking-tight text-slate-900 sm:text-2xl">
            {title}
          </h3>
          <p className="public-body mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
            {description}
          </p>
          <ul className="mt-6 list-none p-0">
            {modules.map((module) =>
              module ? (
                <li key={module.slug} className="public-module-item">
                  <a href={getPublicModulePath(module.slug)}>
                    <span>
                      <span className="block text-base font-medium leading-6">{module.label}</span>
                      <span className="public-body mt-1 block text-sm leading-6 text-slate-600">
                        {module.description}
                      </span>
                    </span>
                    <ArrowUpRight
                      size={18}
                      className="mt-1 shrink-0 text-blue-700"
                      aria-hidden="true"
                    />
                  </a>
                </li>
              ) : null,
            )}
          </ul>
          {!catalog && (
            <a
              href="/modulos"
              className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-blue-700 underline-offset-4 hover:text-blue-900 hover:underline"
            >
              Ver el catálogo completo <ArrowRight size={15} aria-hidden="true" />
            </a>
          )}
        </div>

        <aside aria-labelledby="module-explorer-questions" className="lg:pt-1">
          <h3 id="module-explorer-questions" className="text-base font-medium text-slate-900">
            Dudas frecuentes
          </h3>
          <div className="mt-3">
            {questions.map(({ question, answer }) => (
              <details key={question} className="public-module-question group">
                <summary>
                  {question}
                  <ChevronRight size={18} className="shrink-0 text-blue-700" aria-hidden="true" />
                </summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </aside>
      </section>
    </div>
  );
}
