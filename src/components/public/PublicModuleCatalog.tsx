import { ArrowRight, ChevronRight } from "lucide-react";
import { CookieConsent } from "@/components/CookieConsent";
import { ModuleExplorer } from "@/components/public/ModuleExplorer";
import { PublicFooter } from "@/components/public/PublicFooter";
import { PublicHeader } from "@/components/public/PublicHeader";

export function PublicModuleCatalog() {
  return (
    <div className="public-site min-h-screen bg-white text-slate-900">
      <a href="#contenido" className="public-skip-link">
        Saltar al contenido
      </a>
      <PublicHeader active="module" />
      <main id="contenido">
        <section className="public-hero bg-slate-950 px-4 pb-14 pt-10 text-white sm:px-6 sm:pb-16 sm:pt-14 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <nav
              aria-label="Ruta de navegación"
              className="flex flex-wrap items-center gap-2 text-sm text-white/65"
            >
              <a
                href="/"
                className="inline-flex min-h-11 items-center rounded-md underline-offset-4 hover:text-white hover:underline"
              >
                Inicio
              </a>
              <ChevronRight size={14} aria-hidden="true" />
              <span aria-current="page" className="text-white/90">
                Módulos
              </span>
            </nav>

            <div className="mt-7 max-w-4xl">
              <h1 className="public-h1 text-4xl leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
                Módulos de recursos humanos y gestión empresarial
              </h1>
              <p className="public-lead mt-5 max-w-3xl text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">
                Revisa cómo BJSIGAPP organiza empresas, personas, prevención, documentos y
                operación. Cada ficha explica el alcance del módulo y sus preguntas habituales.
              </p>
              <a
                href="/#contacto"
                className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              >
                Solicitar una demostración <ArrowRight size={16} aria-hidden="true" />
              </a>
            </div>
          </div>
        </section>

        <section
          id="catalogo"
          className="scroll-mt-20 px-4 py-14 sm:px-6 sm:py-16 lg:px-8"
          aria-labelledby="catalog-heading"
        >
          <div className="mx-auto max-w-7xl">
            <div className="mb-8 max-w-3xl">
              <h2 id="catalog-heading" className="public-h2 text-2xl leading-tight sm:text-3xl">
                Explora por área y compara lo que hace cada módulo
              </h2>
              <p className="public-body mt-3 text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">
                Selecciona una necesidad para filtrar el catálogo. Abre una ficha para ver
                funciones, módulos relacionados y respuestas sobre su alcance.
              </p>
            </div>
            <ModuleExplorer catalog />
          </div>
        </section>

        <section className="bg-slate-50 px-4 py-12 sm:px-6 sm:py-14 lg:px-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-2xl">
              <h2 className="public-h2 text-2xl leading-tight sm:text-3xl">
                ¿Quieres revisar cómo encajan estos módulos en tu empresa?
              </h2>
              <p className="public-body mt-3 text-sm leading-6 text-slate-600 sm:text-base">
                Solicita una demostración y plantea tus preguntas sobre los procesos que buscas
                organizar.
              </p>
            </div>
            <a
              href="/#contacto"
              className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            >
              Solicitar una demostración <ArrowRight size={16} aria-hidden="true" />
            </a>
          </div>
        </section>
      </main>
      <PublicFooter />
      <CookieConsent />
    </div>
  );
}
