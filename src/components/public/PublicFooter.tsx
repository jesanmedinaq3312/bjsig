import { Cookie, Settings2 } from "lucide-react";
import { openCookieSettings } from "@/components/CookieConsent";
import { PUBLIC_MODULES, getPublicModulePath } from "@/lib/publicModules";

export function PublicFooter() {
  return (
    <footer className="border-t border-white/10 bg-slate-950 px-4 py-12 text-white sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-10 sm:grid-cols-2 lg:grid-cols-[1fr_1.5fr_1fr]">
        <div>
          <a
            href="/"
            className="inline-flex min-h-11 items-center gap-2 rounded-md font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
              B
            </span>
            BJSIGAPP
          </a>
          <p className="mt-3 max-w-xs text-sm leading-6 text-white/60">
            Plataforma SaaS multiempresa para gestionar recursos humanos y operación.
          </p>
          <p className="mt-5 text-xs text-white/45">
            Desarrollado por BJ Soluciones Informáticas SpA
          </p>
        </div>

        <div>
          <h2 className="text-sm font-bold text-white">
            <a href="/modulos" className="hover:text-cyan-200">
              Módulos de la plataforma
            </a>
          </h2>
          <ul className="mt-3 grid gap-x-6 gap-y-1 sm:grid-cols-2">
            {PUBLIC_MODULES.map((module) => (
              <li key={module.slug}>
                <a
                  href={getPublicModulePath(module.slug)}
                  className="inline-flex min-h-10 items-center text-sm text-white/60 underline-offset-4 hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                >
                  {module.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-bold text-white">Accesos e información</h2>
          <ul className="mt-3 grid gap-y-1">
            {[
              ["Portal del trabajador", "/trabajador"],
              ["Acceso empresa", "/admin"],
              ["Contacto", "/contacto"],
              ["Privacidad", "/privacidad"],
              ["Términos y condiciones", "/terminos"],
            ].map(([label, href]) => (
              <li key={href}>
                <a
                  href={href}
                  className="inline-flex min-h-10 items-center text-sm text-white/60 underline-offset-4 hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                >
                  {label}
                </a>
              </li>
            ))}
            <li>
              <button
                type="button"
                onClick={openCookieSettings}
                className="inline-flex min-h-10 items-center gap-2 text-sm text-white/60 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
              >
                <Cookie size={15} aria-hidden="true" /> Preferencias de cookies{" "}
                <Settings2 size={14} aria-hidden="true" />
              </button>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
