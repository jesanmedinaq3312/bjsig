import { ArrowRight, ArrowUpRight, ChevronRight } from "lucide-react";
import { CookieConsent } from "@/components/CookieConsent";
import { PublicFooter } from "@/components/public/PublicFooter";
import { PublicHeader } from "@/components/public/PublicHeader";
import {
  PUBLIC_MODULES_BY_SLUG,
  getPublicModulePath,
  type PublicModule,
} from "@/lib/publicModules";

export function PublicModuleDetail({ module }: { module: PublicModule }) {
  const relatedModules = module.related
    .map((slug) => PUBLIC_MODULES_BY_SLUG[slug])
    .filter((related): related is PublicModule => Boolean(related));

  return (
    <div className="public-site min-h-screen bg-white text-slate-900">
      <a href="#contenido" className="public-skip-link">
        Saltar al contenido
      </a>
      <PublicHeader active="module" />
      <main id="contenido">
        <section className="public-hero bg-slate-950 px-4 pb-16 pt-10 text-white sm:px-6 sm:pb-20 sm:pt-14 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <nav
              aria-label="Ruta de navegación"
              className="flex flex-wrap items-center gap-2 text-sm text-white/60"
            >
              <a
                href="/"
                className="min-h-11 inline-flex items-center rounded-md underline-offset-4 hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
              >
                Inicio
              </a>
              <ChevronRight size={14} aria-hidden="true" />
              <a
                href="/modulos"
                className="min-h-11 inline-flex items-center rounded-md underline-offset-4 hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
              >
                Módulos
              </a>
              <ChevronRight size={14} aria-hidden="true" />
              <span aria-current="page" className="text-white/85">
                {module.label}
              </span>
            </nav>

            <div className="mt-8 max-w-4xl">
              <h1 className="public-h1 max-w-4xl text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
                {module.title}
              </h1>
              <p className="public-lead mt-6 max-w-3xl text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">
                {module.lead}
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href="/#contacto"
                  className="public-primary-button inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white hover:bg-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                >
                  Solicitar una demo <ArrowRight size={16} aria-hidden="true" />
                </a>
                <a
                  href="/modulos"
                  className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/20 px-5 py-3 text-sm font-semibold text-white/85 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                >
                  Ver todos los módulos
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
            <div>
              <h2 className="public-h2 max-w-xl text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
                {module.sectionTitle}
              </h2>
              <p className="public-body mt-5 max-w-prose text-base leading-7 text-slate-600">
                {module.sectionBody}
              </p>
              <p className="mt-6 max-w-prose border-t border-slate-200 pt-5 text-sm leading-6 text-slate-500">
                Las funciones disponibles dependen del plan, los módulos habilitados y los permisos
                definidos para cada empresa.
              </p>
            </div>

            <div>
              <ul className="divide-y divide-slate-200 border-y border-slate-200">
                {module.features.map((feature) => (
                  <li key={feature.title} className="py-6 sm:py-7">
                    <h3 className="text-lg font-semibold leading-6 text-slate-900">
                      {feature.title}
                    </h3>
                    <p className="public-body mt-2 max-w-prose text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">
                      {feature.description}
                    </p>
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                <h2 className="text-lg font-semibold text-slate-900">Módulos relacionados</h2>
                <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
                  {relatedModules.map((related) => (
                    <li key={related.slug}>
                      <a
                        href={getPublicModulePath(related.slug)}
                        className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-blue-700 underline-offset-4 hover:text-blue-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                      >
                        {related.label} <ArrowUpRight size={14} aria-hidden="true" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white px-4 pb-16 sm:px-6 sm:pb-20 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
            <h2 className="public-h2 max-w-lg text-2xl leading-tight sm:text-3xl">
              Preguntas frecuentes sobre {module.label}
            </h2>
            <div>
              {[
                {
                  question: "¿Qué permite gestionar este módulo?",
                  answer: module.lead,
                },
                {
                  question: "¿Qué funciones considera?",
                  answer: `${module.included.join(", ")}.`,
                },
                {
                  question: "¿Cómo se define qué funciones puede usar cada empresa?",
                  answer:
                    "El alcance depende del plan, los módulos habilitados y los permisos definidos para cada empresa y perfil.",
                },
              ].map(({ question, answer }) => (
                <details key={question} className="public-module-question">
                  <summary>
                    {question}
                    <ChevronRight size={18} className="shrink-0 text-blue-700" aria-hidden="true" />
                  </summary>
                  <p>{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-slate-50 px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-2xl">
              <h2 className="public-h2 text-2xl font-bold tracking-tight sm:text-3xl">
                Revisa cómo encaja {module.label.toLowerCase()} en tu empresa
              </h2>
              <p className="public-body mt-3 text-base leading-7 text-slate-600">
                En una demostración puedes recorrer la plataforma y conversar sobre los módulos y
                accesos que necesita tu organización.
              </p>
            </div>
            <a
              href="/#contacto"
              className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            >
              Solicitar una demo <ArrowRight size={16} aria-hidden="true" />
            </a>
          </div>
        </section>
      </main>
      <PublicFooter />
      <CookieConsent />
    </div>
  );
}

export function PublicModuleNotFound() {
  return (
    <div className="public-site flex min-h-screen flex-col bg-white text-slate-900">
      <PublicHeader active="module" />
      <main className="flex flex-1 items-center px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-3xl">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            No encontramos este módulo
          </h1>
          <p className="mt-5 max-w-prose text-base leading-7 text-slate-600">
            La dirección puede haber cambiado. Revisa el catálogo de módulos para encontrar la
            información que buscas.
          </p>
          <a
            href="/modulos"
            className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
          >
            Ir al catálogo de módulos <ArrowRight size={16} aria-hidden="true" />
          </a>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
