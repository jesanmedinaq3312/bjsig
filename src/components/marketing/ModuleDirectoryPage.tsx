import {
  ArrowRight,
  BarChart3,
  Building2,
  CalendarClock,
  ClipboardCheck,
  FileText,
  HardHat,
  MessageCircle,
  ShieldCheck,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { DeviceShowcase } from "@/components/marketing/DeviceShowcase";

type ModuleCard = {
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
  linkLabel: string;
};

const moduleCards: ModuleCard[] = [
  {
    icon: Building2,
    title: "Empresas y sucursales",
    description:
      "Ordena la estructura de cada empresa, sus sedes, equipos y responsables sin perder la vista general de la operación.",
    href: "/gestion-multisucursal",
    linkLabel: "Ver gestión multisucursal",
  },
  {
    icon: UsersRound,
    title: "Personas y equipos",
    description:
      "Mantén la información de los trabajadores, sus documentos y procesos relacionados dentro del contexto de su empresa y sucursal.",
    href: "/gestion-de-personas-y-turnos",
    linkLabel: "Ver gestión de personas",
  },
  {
    icon: CalendarClock,
    title: "Asistencia y turnos",
    description:
      "Organiza turnos y registros de jornada, con flujos de marcación QR para apoyar la coordinación del trabajo en terreno.",
    href: "/gestion-de-personas-y-turnos",
    linkLabel: "Explorar personas y turnos",
  },
  {
    icon: HardHat,
    title: "Prevención y seguridad",
    description:
      "Da seguimiento a incidentes, inspecciones, tareas preventivas y evidencias con responsables y estados visibles.",
    href: "/seguridad-y-cumplimiento",
    linkLabel: "Ver seguridad operacional",
  },
  {
    icon: ShieldCheck,
    title: "Entrega y control de EPP",
    description:
      "Ordena asignaciones de equipos de protección personal y conserva el historial de entrega vinculado a cada persona.",
    href: "/seguridad-y-cumplimiento",
    linkLabel: "Explorar prevención y EPP",
  },
  {
    icon: ClipboardCheck,
    title: "Capacitaciones y seguimiento",
    description:
      "Centraliza registros de capacitación, tareas pendientes y evidencias para que cada equipo pueda dar continuidad al proceso.",
    href: "/software-de-gestion-empresarial",
    linkLabel: "Conocer la plataforma",
  },
  {
    icon: FileText,
    title: "Documentos y comunicaciones",
    description:
      "Organiza documentos, solicitudes y comunicaciones para facilitar su consulta y seguimiento por empresa y equipo.",
    href: "/software-de-gestion-empresarial",
    linkLabel: "Ver gestión empresarial",
  },
  {
    icon: BarChart3,
    title: "Paneles e indicadores",
    description:
      "Revisa actividad y pendientes desde una vista común para orientar prioridades entre sucursales y áreas.",
    href: "/gestion-multisucursal",
    linkLabel: "Ver operación multisucursal",
  },
];

const faqs = [
  {
    question: "¿BJSIGAPP es un software de gestión empresarial multisucursal?",
    answer:
      "Sí. BJSIGAPP reúne procesos de personas, asistencia, turnos, prevención, EPP, documentación y seguimiento para ayudar a ordenar empresas con más de una sucursal.",
  },
  {
    question: "¿Todos los módulos están activos en cada empresa?",
    answer:
      "El alcance depende de la configuración y los módulos habilitados para cada organización. En una demostración se puede revisar qué procesos son pertinentes para tu operación.",
  },
  {
    question: "¿Puedo explorar cómo se relacionan los módulos?",
    answer:
      "La ventana interactiva del hero permite recorrer vistas de ejemplo del panel SaaS. La demostración ilustra la interfaz y no contiene datos operativos de clientes.",
  },
];

export function ModuleDirectoryPage() {
  return (
    <div className="marketing-page min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 lg:px-8">
          <a href="/" className="flex shrink-0 items-center gap-2.5" aria-label="BJSIGAPP, inicio">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-blue-700 shadow-lg shadow-blue-500/25">
              <ShieldCheck size={21} aria-hidden="true" />
            </span>
            <span className="text-lg font-black tracking-tight">BJSIGAPP</span>
          </a>
          <nav aria-label="Navegación principal" className="hidden items-center gap-5 text-xs font-semibold text-slate-300 xl:flex">
            <a href="/gestion-multisucursal" className="transition hover:text-white">Gestión multisucursal</a>
            <a href="/software-de-gestion-empresarial" className="transition hover:text-white">Plataforma</a>
            <a href="/gestion-de-personas-y-turnos" className="transition hover:text-white">Personas y turnos</a>
            <a href="/seguridad-y-cumplimiento" className="transition hover:text-white">Seguridad</a>
          </nav>
          <a href="/contacto" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-sky-400 px-3.5 py-2 text-xs font-extrabold text-slate-950 transition hover:bg-sky-300 sm:px-4 sm:text-sm">
            Solicitar demo <ArrowRight size={15} aria-hidden="true" />
          </a>
        </div>
      </header>

      <main>
        <section className="relative isolate overflow-hidden border-b border-white/10 px-5 py-12 sm:py-16 lg:px-8 lg:py-20">
          <div aria-hidden="true" className="absolute -right-24 -top-20 -z-10 h-96 w-96 rounded-full bg-sky-500/15 blur-3xl" />
          <div className="mx-auto grid max-w-7xl items-center gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-10">
            <div className="max-w-2xl">
              <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-sky-200">
                <Building2 size={14} aria-hidden="true" /> Plataforma BJSIGAPP
              </p>
              <h1 className="text-balance text-4xl font-black leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl">
                Módulos de gestión empresarial para ordenar una operación multisucursal
              </h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">
                Explora cómo BJSIGAPP conecta personas, asistencia, turnos, prevención, EPP y documentación para ayudar a coordinar el trabajo de cada empresa y sucursal.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a href="/contacto" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-sky-400 px-5 py-3 text-sm font-extrabold text-slate-950 shadow-lg shadow-sky-950/40 transition hover:-translate-y-0.5 hover:bg-sky-300">
                  <MessageCircle size={17} aria-hidden="true" /> Solicitar una demostración
                </a>
                <a href="/gestion-multisucursal" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/15 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/5">
                  Gestión multisucursal <ArrowRight size={16} aria-hidden="true" />
                </a>
              </div>
              <p className="mt-5 text-xs leading-5 text-slate-400">Un panel central · procesos conectados · seguimiento por sucursal</p>
            </div>

            <div className="min-w-0">
              <div className="mb-3">
                <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-sky-300">Demo ilustrativa del producto</p>
                <h2 id="modules-demo-title" className="mt-2 text-xl font-black leading-tight tracking-tight text-white sm:text-2xl">
                  Explora el panel SaaS, la asistencia QR y la entrega de EPP
                </h2>
              </div>
              <DeviceShowcase />
            </div>
          </div>
        </section>

        <section className="px-5 py-16 sm:py-20 lg:px-8" aria-labelledby="modules-overview-title">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl">
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-sky-300">Capacidades conectadas</p>
              <h2 id="modules-overview-title" className="mt-3 text-3xl font-black leading-tight tracking-tight text-white sm:text-4xl">
                Un sistema integrado para coordinar personas, sucursales y procesos
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-300">
                Cada módulo aporta orden a una parte del trabajo. Las rutas de solución explican con más detalle los problemas y flujos relacionados.
              </p>
            </div>
            <div className="mt-9 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {moduleCards.map(({ icon: Icon, title, description, href, linkLabel }) => (
                <article key={title} className="flex flex-col rounded-2xl border border-white/10 bg-slate-900/70 p-5 transition hover:-translate-y-1 hover:border-sky-300/30">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-300/10 text-sky-200"><Icon size={21} aria-hidden="true" /></span>
                  <h3 className="mt-4 text-base font-extrabold text-white">{title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-6 text-slate-400">{description}</p>
                  <a href={href} className="mt-5 inline-flex min-h-10 items-center gap-2 text-xs font-bold text-sky-200 underline decoration-sky-300/30 underline-offset-4 hover:text-white">
                    {linkLabel} <ArrowRight size={14} aria-hidden="true" />
                  </a>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-white/10 bg-slate-900/60 px-5 py-16 sm:py-20 lg:px-8" aria-labelledby="modules-workflow-title">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:gap-16">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-sky-300">De la estructura al seguimiento</p>
              <h2 id="modules-workflow-title" className="mt-3 text-3xl font-black leading-tight tracking-tight text-white sm:text-4xl">
                Conecta los módulos según la realidad de tu empresa
              </h2>
            </div>
            <ol className="grid gap-4 sm:grid-cols-3">
              <li className="rounded-2xl border border-white/10 bg-slate-950/70 p-5">
                <span className="text-xs font-black uppercase tracking-[0.16em] text-sky-300">Paso 01</span>
                <h3 className="mt-3 text-base font-extrabold text-white">Define empresas y sedes</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">Organiza la estructura, equipos y responsables de cada sucursal.</p>
              </li>
              <li className="rounded-2xl border border-white/10 bg-slate-950/70 p-5">
                <span className="text-xs font-black uppercase tracking-[0.16em] text-sky-300">Paso 02</span>
                <h3 className="mt-3 text-base font-extrabold text-white">Prioriza los procesos</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">Revisa qué flujos de personas, jornada y prevención quieres ordenar primero.</p>
              </li>
              <li className="rounded-2xl border border-white/10 bg-slate-950/70 p-5">
                <span className="text-xs font-black uppercase tracking-[0.16em] text-sky-300">Paso 03</span>
                <h3 className="mt-3 text-base font-extrabold text-white">Da seguimiento</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">Mantén a la vista la actividad, las evidencias y los pendientes por equipo.</p>
              </li>
            </ol>
          </div>
        </section>

        <section className="px-5 py-16 sm:py-20 lg:px-8" aria-labelledby="modules-faq-title">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:gap-16">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-sky-300">Respuestas claras</p>
              <h2 id="modules-faq-title" className="mt-3 text-3xl font-black leading-tight tracking-tight text-white sm:text-4xl">Preguntas sobre los módulos de BJSIGAPP</h2>
              <p className="mt-4 text-sm leading-6 text-slate-400">
                Revisa también <a className="text-sky-200 underline underline-offset-4" href="/gestion-de-personas-y-turnos">personas y turnos</a>, <a className="text-sky-200 underline underline-offset-4" href="/seguridad-y-cumplimiento">seguridad operacional</a> y <a className="text-sky-200 underline underline-offset-4" href="/software-de-gestion-empresarial">la plataforma de gestión empresarial</a>.
              </p>
            </div>
            <div className="space-y-3">
              {faqs.map((faq) => (
                <details key={faq.question} className="group rounded-xl border border-white/10 bg-slate-900/70 p-4 open:border-sky-300/25">
                  <summary className="cursor-pointer list-none pr-7 text-sm font-bold text-white marker:hidden [&::-webkit-details-marker]:hidden">{faq.question}</summary>
                  <p className="mt-3 text-sm leading-6 text-slate-400">{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="px-5 pb-16 lg:px-8" aria-labelledby="modules-cta-title">
          <div className="mx-auto max-w-7xl rounded-3xl border border-sky-300/15 bg-gradient-to-br from-sky-500/10 via-blue-500/5 to-transparent p-6 sm:p-10 lg:p-12">
            <div className="grid items-center gap-8 lg:grid-cols-[1fr_auto]">
              <div className="max-w-3xl">
                <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-sky-300">Siguiente paso</p>
                <h2 id="modules-cta-title" className="mt-3 text-3xl font-black leading-tight tracking-tight text-white sm:text-4xl">Revisa qué módulos encajan con tu operación</h2>
                <p className="mt-4 text-base leading-7 text-slate-300">Conversa con el equipo sobre tus sucursales, tus procesos actuales y las prioridades de tu empresa.</p>
              </div>
              <a href="/contacto" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-sky-400 px-5 py-3 text-sm font-extrabold text-slate-950 transition hover:bg-sky-300">
                Solicitar una demostración <ArrowRight size={16} aria-hidden="true" />
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 px-5 py-7 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} BJSIGAPP · Gestión empresarial y operacional.</p>
          <nav aria-label="Enlaces legales" className="flex gap-4">
            <a href="/privacidad" className="hover:text-slate-300">Privacidad</a>
            <a href="/terminos" className="hover:text-slate-300">Términos</a>
            <a href="/contacto" className="hover:text-slate-300">Contacto</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
