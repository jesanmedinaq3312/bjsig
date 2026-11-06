import { useState } from "react";
import { ArrowRight, Menu, ShieldCheck, X } from "lucide-react";

type PublicHeaderProps = {
  active?: "home" | "module";
};

const navigation = [
  { href: "/#plataforma", label: "Plataforma" },
  { href: "/modulos", label: "Módulos" },
  { href: "/#como-funciona", label: "Cómo funciona" },
  { href: "/#preguntas", label: "Preguntas" },
];

export function PublicHeader({ active = "home" }: PublicHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header
      className="public-header sticky top-0 z-50 border-b border-white/10 bg-slate-950/95 bg-cover bg-center text-white backdrop-blur-sm"
      style={{ backgroundImage: "var(--brand-header-image)" }}
    >
      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <a
          href="/"
          aria-label="BJSIGAPP, página de inicio"
          className="inline-flex min-h-11 items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white">
            <ShieldCheck size={20} aria-hidden="true" />
          </span>
          <span className="text-base font-bold tracking-tight sm:text-lg">BJSIGAPP</span>
        </a>

        <nav aria-label="Navegación principal" className="hidden items-center gap-6 lg:flex">
          {navigation.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={`inline-flex min-h-11 items-center rounded-md px-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${active === "home" ? "text-white/75 hover:text-white" : "text-white/65 hover:text-white"}`}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <a
            href="/trabajador"
            className="inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold text-white/70 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
          >
            Colaborador
          </a>
          <a
            href="/admin"
            className="inline-flex min-h-11 items-center rounded-xl border border-white/15 px-3 text-sm font-semibold text-white/85 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
          >
            Acceso empresa
          </a>
          <a
            href="/#contacto"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-700 px-4 text-sm font-bold text-white hover:bg-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          >
            Solicitar demo <ArrowRight size={15} aria-hidden="true" />
          </a>
        </div>

        <button
          type="button"
          aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={menuOpen}
          aria-controls="public-mobile-navigation"
          onClick={() => setMenuOpen((open) => !open)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 lg:hidden"
        >
          {menuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
        </button>
      </div>

      {menuOpen && (
        <nav
          id="public-mobile-navigation"
          aria-label="Navegación móvil"
          className="border-t border-white/10 bg-slate-950 px-4 pb-4 pt-2 lg:hidden"
        >
          <div className="mx-auto flex max-w-7xl flex-col">
            {navigation.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="flex min-h-11 items-center border-b border-white/10 text-sm font-semibold text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
              >
                {item.label}
              </a>
            ))}
            <a
              href="/trabajador"
              onClick={() => setMenuOpen(false)}
              className="flex min-h-11 items-center text-sm font-semibold text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
            >
              Portal del trabajador
            </a>
            <a
              href="/admin"
              onClick={() => setMenuOpen(false)}
              className="flex min-h-11 items-center text-sm font-semibold text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
            >
              Acceso empresa
            </a>
            <a
              href="/#contacto"
              onClick={() => setMenuOpen(false)}
              className="mt-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 text-sm font-bold text-white hover:bg-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
            >
              Solicitar una demo <ArrowRight size={15} aria-hidden="true" />
            </a>
          </div>
        </nav>
      )}
    </header>
  );
}
