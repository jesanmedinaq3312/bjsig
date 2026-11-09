import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { ArrowRight, ArrowUpRight, Check, ChevronRight, ShieldCheck } from "lucide-react";
import { CookieConsent } from "@/components/CookieConsent";
import { DashboardPreview } from "@/components/public/DashboardPreview";
import { ModuleExplorer } from "@/components/public/ModuleExplorer";
import { PublicFooter } from "@/components/public/PublicFooter";
import { PublicHeader } from "@/components/public/PublicHeader";
import { getPublicModulePath } from "@/lib/publicModules";
import { loadPublicLandingBranding, useCompanyBranding } from "@/lib/logo";

const PREVIEW_STORAGE_KEY = "bjsig-public-landing-preview";

const demoUrl =
  "https://wa.me/56941228089?text=Hola%2C%20quiero%20solicitar%20una%20demo%20de%20BJSIGAPP.";

const questions = [
  {
    question: "¿Qué es BJSIGAPP?",
    answer:
      "BJSIGAPP es una plataforma SaaS multiempresa para gestionar recursos humanos y procesos de operación. Incluye módulos para personas, asistencia, prevención, documentos, capacitaciones, finanzas y seguimiento.",
  },
  {
    question: "¿Se pueden administrar varias empresas en la plataforma?",
    answer:
      "Sí. El equipo de plataforma puede configurar distintas empresas, sucursales, planes, módulos, branding y permisos. La información operativa se mantiene vinculada al contexto de cada organización.",
  },
  {
    question: "¿Todas las empresas tienen los mismos módulos?",
    answer:
      "No necesariamente. Los módulos disponibles dependen del plan y la configuración asignada a cada empresa. Los permisos determinan qué vistas puede utilizar cada perfil.",
  },
  {
    question: "¿Qué puede hacer un trabajador en su portal?",
    answer:
      "Según los módulos y accesos habilitados, puede consultar documentos, asistencia, turnos, capacitaciones, solicitudes y comunicaciones relacionadas con su empresa.",
  },
  {
    question: "¿BJSIGAPP reemplaza el asesoramiento legal o garantiza el cumplimiento?",
    answer:
      "No. La plataforma ayuda a organizar registros y dar seguimiento a procesos, pero no sustituye la asesoría profesional ni determina por sí sola el cumplimiento de obligaciones legales. Cada empresa debe revisar sus procedimientos y responsabilidades.",
  },
];

function LeadForm() {
  const [form, setForm] = useState({ name: "", company: "", contact: "", teamSize: "" });
  const update = (field: keyof typeof form) => (event: ChangeEvent<HTMLInputElement>) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };
  const inputClass =
    "min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-500 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/20";

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = [
      "Hola, quiero solicitar una demostración de BJSIGAPP.",
      `Nombre: ${form.name}`,
      `Empresa: ${form.company}`,
      `Contacto: ${form.contact}`,
      form.teamSize ? `Trabajadores: ${form.teamSize}` : "",
    ]
      .filter(Boolean)
      .join("\n");
    window.open(
      `https://wa.me/56941228089?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <label className="grid gap-1.5 text-sm font-semibold text-slate-800">
        Tu nombre
        <input
          required
          maxLength={80}
          autoComplete="name"
          value={form.name}
          onChange={update("name")}
          className={inputClass}
        />
      </label>
      <label className="grid gap-1.5 text-sm font-semibold text-slate-800">
        Empresa
        <input
          required
          maxLength={100}
          autoComplete="organization"
          value={form.company}
          onChange={update("company")}
          className={inputClass}
        />
      </label>
      <label className="grid gap-1.5 text-sm font-semibold text-slate-800">
        Correo o WhatsApp
        <input
          required
          maxLength={100}
          autoComplete="email"
          value={form.contact}
          onChange={update("contact")}
          className={inputClass}
        />
      </label>
      <label className="grid gap-1.5 text-sm font-semibold text-slate-800">
        Número de trabajadores <span className="font-normal text-slate-500">(opcional)</span>
        <input
          maxLength={10}
          inputMode="numeric"
          value={form.teamSize}
          onChange={update("teamSize")}
          className={inputClass}
        />
      </label>
      <div className="sm:col-span-2">
        <button
          type="submit"
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 sm:w-auto"
        >
          Solicitar demo por WhatsApp <ArrowRight size={16} aria-hidden="true" />
        </button>
        <p className="mt-3 text-xs leading-5 text-slate-500">
          Al continuar, se abrirá WhatsApp con los datos que ingresaste para que puedas revisar el
          mensaje antes de enviarlo.
        </p>
      </div>
    </form>
  );
}

function SoftwareStructuredData() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "BJSIGAPP",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "Plataforma SaaS multiempresa para gestionar recursos humanos, seguridad, documentos y operación empresarial.",
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}

export function PublicLanding() {
  const { iconUrls, landingContent } = useCompanyBranding();
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    let previewAssets: unknown;
    if (new URLSearchParams(window.location.search).get("landing-preview") === "1") {
      try {
        const stored = window.sessionStorage.getItem(PREVIEW_STORAGE_KEY);
        if (stored) {
          previewAssets = JSON.parse(stored);
          setPreviewMode(true);
        }
        window.sessionStorage.removeItem(PREVIEW_STORAGE_KEY);
      } catch {
        previewAssets = undefined;
      }
    }
    void loadPublicLandingBranding(previewAssets);
  }, []);

  return (
    <div className="public-site min-h-screen bg-white text-slate-900">
      {previewMode && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 bg-blue-50 px-4 py-3 text-sm text-slate-900 sm:px-6"
        >
          <span>Vista previa del borrador; estos cambios todavía no están publicados.</span>
          <a
            href="/"
            className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 font-semibold text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"
          >
            Salir de la vista previa
          </a>
        </div>
      )}
      <a href="#contenido" className="public-skip-link">
        Saltar al contenido
      </a>
      <PublicHeader />
      <main id="contenido">
        <section
          className="public-hero bg-slate-950 bg-cover bg-center px-4 pb-16 pt-14 text-white sm:px-6 sm:pb-20 sm:pt-20 lg:px-8 lg:pb-24"
          style={{
            backgroundImage:
              "linear-gradient(rgba(2,6,23,var(--brand-hero-opacity)),rgba(2,6,23,var(--brand-hero-opacity))),var(--brand-hero-image)",
          }}
        >
          <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14">
            <div className="max-w-2xl">
              {iconUrls.hero && (
                <img
                  src={iconUrls.hero}
                  alt=""
                  className="mb-5 h-12 w-12 rounded-xl object-cover"
                />
              )}
              <h1 className="public-h1 text-4xl font-bold leading-[1.06] tracking-tight sm:text-5xl lg:text-6xl">
                {landingContent.heroTitle || "Software multiempresa de RR. HH. y operaciones"}
              </h1>
              <p className="public-lead mt-6 max-w-xl text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">
                {landingContent.heroDescription ||
                  "Administra personas, asistencia, turnos, prevención, documentos y procesos internos desde una plataforma SaaS. Configura módulos, permisos e identidad para cada empresa."}
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href="#contacto"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white hover:bg-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                >
                  {landingContent.ctaLabel || "Solicitar una demo"}{" "}
                  <ArrowRight size={16} aria-hidden="true" />
                </a>
                <a
                  href="/trabajador"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/20 px-5 py-3 text-sm font-semibold text-white/90 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                >
                  {iconUrls.hero ? (
                    <img src={iconUrls.hero} alt="" className="h-4 w-4 rounded object-cover" />
                  ) : (
                    <ShieldCheck size={16} aria-hidden="true" />
                  )}{" "}
                  Acceso trabajador
                </a>
              </div>
              <ul
                className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/75"
                aria-label="Características de la plataforma"
              >
                {["Gestión por empresa", "Módulos configurables", "Permisos por perfil"].map(
                  (item) => (
                    <li key={item} className="inline-flex items-center gap-2">
                      {iconUrls.feature ? (
                        <img
                          src={iconUrls.feature}
                          alt=""
                          className="h-4 w-4 rounded object-cover"
                        />
                      ) : (
                        <Check size={15} className="text-cyan-300" aria-hidden="true" />
                      )}{" "}
                      {item}
                    </li>
                  ),
                )}
              </ul>
            </div>
            <DashboardPreview />
          </div>
        </section>

        <section id="plataforma" className="scroll-mt-20 px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
            <div>
              <h2 className="public-h2 max-w-xl text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
                Una plataforma SaaS para gestionar personas y operación por empresa
              </h2>
            </div>
            <div className="max-w-3xl">
              <p className="public-body text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
                BJSIGAPP permite administrar varias organizaciones desde un control de plataforma y
                trabajar dentro del contexto de cada empresa. Los módulos habilitados y los permisos
                definen qué funciones ve cada equipo.
              </p>
              <div className="mt-8 divide-y divide-slate-200 border-y border-slate-200">
                <div className="grid gap-2 py-5 sm:grid-cols-[190px_1fr] sm:gap-6">
                  <h3 className="text-base font-semibold text-slate-900">Estructura</h3>
                  <p className="public-body text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">
                    Organizaciones, sucursales, áreas y responsables organizados según la estructura
                    definida por cada empresa.
                  </p>
                </div>
                <div className="grid gap-2 py-5 sm:grid-cols-[190px_1fr] sm:gap-6">
                  <h3 className="text-base font-semibold text-slate-900">Módulos y accesos</h3>
                  <p className="public-body text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">
                    Planes, vistas y permisos configurables para que cada perfil utilice las
                    funciones que le corresponden.
                  </p>
                </div>
                <div className="grid gap-2 py-5 sm:grid-cols-[190px_1fr] sm:gap-6">
                  <h3 className="text-base font-semibold text-slate-900">Contexto separado</h3>
                  <p className="public-body text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">
                    La información operativa se asocia a la empresa activa y sus permisos, con
                    branding y portales diferenciados según configuración.
                  </p>
                </div>
              </div>
              <p className="mt-5 text-sm leading-6 text-slate-500">
                El alcance concreto depende del plan y los módulos habilitados para cada
                organización.
              </p>
            </div>
          </div>
        </section>

        <section
          id="modulos"
          className="scroll-mt-20 bg-slate-50 px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
        >
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr] lg:items-end lg:gap-16">
              <h2 className="public-h2 max-w-2xl text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
                ¿Qué quieres resolver en la gestión de tu empresa?
              </h2>
              <p className="public-body max-w-2xl text-base leading-7 text-slate-600">
                Elige un área para ver módulos relacionados y abrir una ficha con funciones y
                respuestas sobre su alcance.
              </p>
            </div>
            <div className="mt-8 sm:mt-10">
              <ModuleExplorer />
            </div>
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-10 border-b border-slate-200 pb-16 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20 lg:pb-20">
            <div>
              <h2 className="public-h2 max-w-xl text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
                El portal del trabajador acerca la gestión a cada persona
              </h2>
            </div>
            <div>
              <p className="public-body max-w-2xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
                Cada colaborador cuenta con un acceso personal para consultar documentos, turnos,
                asistencia, capacitaciones, solicitudes y comunicaciones que la empresa haya
                habilitado para su perfil.
              </p>
              <a
                href={getPublicModulePath("portal-del-trabajador")}
                className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-blue-700 underline-offset-4 hover:text-blue-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"
              >
                Conocer el Portal del Trabajador <ArrowRight size={15} aria-hidden="true" />
              </a>
            </div>
          </div>

          <div
            id="como-funciona"
            className="mx-auto grid max-w-7xl gap-8 scroll-mt-20 pt-16 sm:pt-20 md:grid-cols-[0.8fr_1.2fr] md:gap-16"
          >
            <h2 className="public-h2 max-w-xl text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
              Configura la plataforma para la forma de trabajo de tu empresa
            </h2>
            <ol className="divide-y divide-slate-200 border-y border-slate-200">
              {[
                [
                  "Define la estructura",
                  "Organiza empresas, sucursales, departamentos, responsables y perfiles de acceso.",
                ],
                [
                  "Activa los módulos",
                  "Selecciona los módulos y funciones disponibles para cada organización.",
                ],
                [
                  "Conecta a los equipos",
                  "Administra la operación desde los paneles y ofrece a los trabajadores su portal personal.",
                ],
              ].map(([title, text]) => (
                <li key={title} className="grid gap-2 py-5 sm:grid-cols-[220px_1fr] sm:gap-6">
                  <h3 className="text-base font-semibold text-slate-900">{title}</h3>
                  <p className="public-body text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">
                    {text}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section
          id="preguntas"
          className="scroll-mt-20 bg-slate-50 px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
        >
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:gap-20">
            <h2 className="public-h2 max-w-md text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
              Preguntas sobre BJSIGAPP y sus módulos
            </h2>
            <div className="divide-y divide-slate-200 border-y border-slate-200">
              {questions.map(({ question, answer }) => (
                <details key={question} className="group py-5">
                  <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700">
                    {question}
                    <ChevronRight
                      size={18}
                      className="shrink-0 text-blue-700 transition-transform group-open:rotate-90"
                      aria-hidden="true"
                    />
                  </summary>
                  <p className="public-body max-w-3xl pb-2 pr-7 text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">
                    {answer}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section
          id="contacto"
          className="scroll-mt-20 bg-slate-950 px-4 py-16 text-white sm:px-6 sm:py-20 lg:px-8"
        >
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:gap-20">
            <div>
              <h2 className="public-h2 max-w-xl text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
                Solicita una demostración de la plataforma multiempresa
              </h2>
              <p className="mt-5 max-w-lg text-base leading-7 text-slate-300">
                Cuéntanos sobre tu empresa y los módulos que quieres revisar. Prepararemos una
                demostración enfocada en tus necesidades.
              </p>
              <a
                href={demoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-md text-sm font-semibold text-cyan-300 underline-offset-4 hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
              >
                Abrir WhatsApp{" "}
                {iconUrls.cta ? (
                  <img src={iconUrls.cta} alt="" className="h-4 w-4 rounded object-cover" />
                ) : (
                  <ArrowUpRight size={15} aria-hidden="true" />
                )}
              </a>
            </div>
            <div className="rounded-2xl bg-white p-5 text-slate-900 sm:p-8">
              <LeadForm />
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
      <CookieConsent />
      <SoftwareStructuredData />
    </div>
  );
}

export function PublicDocument({ kind }: { kind: "privacy" | "terms" | "contact" }) {
  const content =
    kind === "privacy"
      ? {
          title: "Política de privacidad",
          intro:
            "Información sobre cómo BJSIGAPP trata datos de usuarios, trabajadores y empresas.",
          items: [
            "Finalidades y categorías de datos",
            "Bases y derechos de las personas",
            "Seguridad, conservación y encargados",
            "Canales de contacto y solicitudes",
          ],
        }
      : kind === "terms"
        ? {
            title: "Términos y condiciones",
            intro: "Condiciones generales para el uso de BJSIGAPP y sus portales empresariales.",
            items: [
              "Cuenta y responsabilidades del cliente",
              "Módulos, límites y soporte",
              "Uso aceptable y seguridad",
              "Vigencia, suspensión y terminación",
            ],
          }
        : {
            title: "Contacto comercial",
            intro: "Cuéntanos sobre tu empresa y coordinemos una demostración de BJSIGAPP.",
            items: [
              "Demostraciones para empresas",
              "Configuración de módulos",
              "Onboarding y soporte",
              "Consultas sobre seguridad",
            ],
          };

  return (
    <div className="public-site min-h-screen bg-slate-950 px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <a
          href="/"
          className="inline-flex min-h-11 items-center rounded-md text-sm font-bold text-blue-300 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
        >
          ← Volver a BJSIGAPP
        </a>
        <div className="mt-12 border-t border-white/15 pt-8 sm:mt-16 sm:pt-10">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/20 text-blue-300">
            <ShieldCheck aria-hidden="true" />
          </div>
          <h1 className="mt-7 text-3xl font-bold tracking-tight sm:text-4xl">{content.title}</h1>
          <p className="mt-4 max-w-prose text-base leading-7 text-white/70">{content.intro}</p>
          <ul className="mt-8 divide-y divide-white/10 border-y border-white/10">
            {content.items.map((item) => (
              <li key={item} className="flex min-h-14 items-center gap-3 py-3 text-sm sm:text-base">
                <Check size={18} className="shrink-0 text-cyan-300" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-8 border-t border-white/10 pt-6 text-sm leading-6 text-white/55">
            Documento sujeto a la versión contractual y legal vigente. Para solicitudes formales
            utiliza el canal de contacto indicado en tu contrato SaaS.
          </p>
          <a
            href="/#contacto"
            className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-cyan-300 underline-offset-4 hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
          >
            Contactar a BJSIGAPP <ChevronRight size={15} aria-hidden="true" />
          </a>
        </div>
      </div>
    </div>
  );
}

export default PublicLanding;
