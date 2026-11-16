import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { ArrowRight, ArrowUpRight, Check, ChevronRight, ShieldCheck } from "lucide-react";
import { CookieConsent } from "@/components/CookieConsent";
import { DashboardPreview } from "@/components/public/DashboardPreview";
import { ModuleExplorer } from "@/components/public/ModuleExplorer";
import { PublicFooter } from "@/components/public/PublicFooter";
import { PublicHeader } from "@/components/public/PublicHeader";
import rrhhOficina from "@/assets/landing-rrhh-oficina.jpg";
import trabajadorTerreno from "@/assets/landing-trabajador-terreno.jpg";
import prevencionImg from "@/assets/landing-prevencion.jpg";
import { getPublicModulePath } from "@/lib/publicModules";
import { loadPublicLandingBranding, useCompanyBranding } from "@/lib/logo";
import {
  buildWhatsAppUrl,
  DEFAULT_SAAS_LANDING,
  fetchSaasLandingSettings,
  type SaasLandingSettings,
} from "@/lib/saasLanding";

const PREVIEW_STORAGE_KEY = "bjsig-public-landing-preview";
const demoMessage = "Hola, quiero solicitar una demostración de BJSIGAPP.";

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

const differentiators = [
  {
    title: "Multiempresa sin perder el contexto",
    text: "Separa organizaciones, sucursales, responsables, permisos, branding y módulos para que cada equipo vea solo lo que necesita.",
  },
  {
    title: "Del turno al incidente, en el mismo flujo",
    text: "Conecta personas, asistencia y turnos con prevención, EPP, incidentes, charlas, matrices IPER, ISO y seguimiento de terreno.",
  },
  {
    title: "Menos fricción para trabajadores",
    text: "Las jefaturas gestionan desde sus paneles y cada trabajador consulta documentos, turnos, asistencia, capacitaciones y solicitudes desde su portal.",
  },
  {
    title: "Empieza con lo crítico y crece",
    text: "Activa los módulos que cada organización necesita y conserva permisos, actividad y evidencia sin obligarte a cambiar toda la operación de una vez.",
  },
];

function LeadForm({ whatsappPhone }: { whatsappPhone: string }) {
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
    window.open(buildWhatsAppUrl(whatsappPhone, message), "_blank", "noopener,noreferrer");
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

export function PublicLanding({
  initialLanding = null,
}: {
  initialLanding?: SaasLandingSettings | null;
}) {
  const { iconUrls, landingContent, heroImages } = useCompanyBranding();
  const [previewMode, setPreviewMode] = useState(false);
  const [landingSettings, setLandingSettings] = useState<SaasLandingSettings | null>(
    initialLanding,
  );

  useEffect(() => {
    let mounted = true;
    setLandingSettings(initialLanding);
    if (!initialLanding) {
      void fetchSaasLandingSettings()
        .then((settings) => {
          if (mounted) setLandingSettings(settings);
        })
        .catch(() => {
          if (mounted) setLandingSettings(null);
        });
    }
    return () => {
      mounted = false;
    };
  }, [initialLanding]);

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

  if (landingSettings?.enabled === false) {
    return (
      <main className="public-site flex min-h-screen items-center justify-center bg-slate-950 px-5 text-white">
        <section className="max-w-lg text-center">
          <h1 className="text-3xl font-black tracking-tight">BJSIGAPP</h1>
          <p className="mt-4 text-base leading-7 text-slate-300">
            El sitio público está temporalmente no disponible. Los accesos de empresa y trabajador
            continúan en sus enlaces habituales.
          </p>
        </section>
      </main>
    );
  }

  const heroTitle =
    landingSettings?.heroTitle || landingContent.heroTitle || DEFAULT_SAAS_LANDING.heroTitle;
  const heroDescription =
    landingSettings?.heroDescription ||
    landingContent.heroDescription ||
    DEFAULT_SAAS_LANDING.heroDescription;
  const ctaLabel =
    landingSettings?.primaryCtaLabel ||
    landingContent.ctaLabel ||
    DEFAULT_SAAS_LANDING.primaryCtaLabel;
  const whatsappPhone = landingSettings?.whatsappPhone || DEFAULT_SAAS_LANDING.whatsappPhone;
  const demoUrl = buildWhatsAppUrl(whatsappPhone, demoMessage);

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
                {heroTitle}
              </h1>
              <p className="public-lead mt-6 max-w-xl text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">
                {heroDescription}
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href="#contacto"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white hover:bg-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                >
                  {ctaLabel} <ArrowRight size={16} aria-hidden="true" />
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
              {heroImages.length > 0 && (
                <ul className="mt-8 flex flex-wrap gap-3" aria-label="Destacados">
                  {heroImages.map((image, index) => {
                    const img = (
                      <img
                        src={image.image_url}
                        alt={image.alt || ""}
                        loading="lazy"
                        className="h-20 w-32 rounded-xl border border-white/15 object-cover sm:h-24 sm:w-40"
                      />
                    );
                    const external = /^https:/i.test(image.link_url ?? "");
                    return (
                      <li key={`${image.image_url}-${index}`}>
                        {image.link_url ? (
                          <a
                            href={image.link_url}
                            {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                            aria-label={image.alt || "Abrir enlace"}
                            className="block rounded-xl transition hover:-translate-y-0.5 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                          >
                            {img}
                          </a>
                        ) : (
                          img
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
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
              <figure className="mt-8 overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
                <img
                  src={rrhhOficina}
                  alt="Equipo de RR. HH. revisando turnos y dotación en un computador"
                  width={1280}
                  height={960}
                  loading="lazy"
                  className="aspect-[4/3] w-full object-cover"
                />
                <figcaption className="bg-white px-4 py-3 text-xs text-slate-500">
                  Planificación de turnos y dotación desde la oficina de RR. HH.
                </figcaption>
              </figure>
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

        <section className="bg-slate-950 px-4 py-16 text-white sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-cyan-300">
                Para operaciones que no caben en una sola herramienta
              </p>
              <h2 className="public-h2 mt-4 max-w-xl text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
                Convierte la gestión de personas en una ventaja operativa
              </h2>
              <p className="mt-5 max-w-xl text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">
                Talana y Buk compiten con suites amplias de gestión de personas. GeoVictoria destaca
                en control de asistencia y gestión del tiempo. BJSIGAPP está pensado para la empresa
                que necesita unir RR. HH., prevención y terreno dentro del contexto de cada
                organización.
              </p>
              <p className="mt-5 max-w-xl text-sm leading-6 text-slate-400">
                No compares solo una lista de módulos. Prueba el flujo que más cuesta hoy: una
                sucursal, un turno, un documento, un incidente o una solicitud del trabajador.
              </p>
              <a
                href="#contacto"
                className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-xl bg-cyan-300 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              >
                Probar un flujo real <ArrowRight size={15} aria-hidden="true" />
              </a>
              <img
                src={prevencionImg}
                alt="Encargada de prevención realizando charla de seguridad con su equipo"
                width={1280}
                height={960}
                loading="lazy"
                className="mt-8 aspect-[16/10] w-full max-w-xl rounded-2xl border border-white/10 object-cover"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {differentiators.map(({ title, text }) => (
                <article
                  key={title}
                  className="rounded-2xl border border-white/10 bg-white/[0.06] p-5"
                >
                  <Check size={18} className="text-cyan-300" aria-hidden="true" />
                  <h3 className="mt-4 text-base font-semibold text-white">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{text}</p>
                </article>
              ))}
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
              <img
                src={trabajadorTerreno}
                alt="Trabajador en faena registrando su asistencia desde el celular"
                width={1280}
                height={960}
                loading="lazy"
                className="mt-8 aspect-[16/9] w-full rounded-2xl border border-slate-200 object-cover shadow-sm"
              />
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
              <LeadForm whatsappPhone={whatsappPhone} />
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
  const sections: Array<{ title: string; body: string }> =
    kind === "privacy"
      ? [
          {
            title: "Responsable y roles",
            body: "Para datos de cuentas, seguridad y soporte de la plataforma, el responsable informado es BJ Servicios Informáticos SpA, Chile. En expedientes de trabajadores cargados por una empresa cliente, esa empresa determina fines y medios y normalmente actúa como responsable; BJ actúa según el rol que establezcan el contrato y cada tratamiento. La identificación tributaria, domicilio y un correo dedicado de privacidad deben completarse antes de aprobar esta política.",
          },
          {
            title: "Datos y finalidades",
            body: "Según los módulos que habilite cada cliente, BJSIGAPP puede tratar datos de identificación y contacto, relación laboral, asistencia y turnos, documentos, remuneraciones y cuentas de pago, seguridad, capacitación, incidencias, licencias/ausencias y ubicación vinculada a controles operativos. Los fines deben definirse por activo. La seguridad, soporte y mejora técnica del servicio no constituyen por sí solos la finalidad ni la base jurídica de cada expediente laboral.",
          },
          {
            title: "Base de licitud y transparencia",
            body: "La empresa responsable debe informar a las personas y documentar la base de licitud aplicable a cada propósito. BJSIGAPP no considera que una aceptación general de estos términos sustituya la base legal, la información laboral ni las obligaciones del responsable. La ficha de tratamiento, bases y destinatarios está en proceso de implementación.",
          },
          {
            title: "Edad mínima",
            body: "El acceso a BJSIGAPP está destinado a personas de 18 años o más. El acceso pide una autodeclaración; no se solicita ni almacena fecha de nacimiento y esa casilla no verifica la edad ni acredita que un cliente nunca haya cargado datos de una persona menor. Los clientes no deben incorporar datos de menores en esta versión y deben contactar al responsable si detectan una carga accidental.",
          },
          {
            title: "Conexiones, IP y proveedores",
            body: "Las solicitudes web revelan la dirección IP y metadatos técnicos al servidor que las recibe. El código de aplicación revisado no carga Google Analytics ni Google Tag Manager y la política de seguridad del repositorio no autoriza dominios de analítica de Google. El QR de contacto y los avatares generados se procesan localmente. Las conexiones esenciales al servicio y el uso voluntario de enlaces externos de documentos/fotos pueden revelar la IP al proveedor correspondiente; abrir un enlace de Google Drive conecta directamente el navegador con Google. No se afirma que el hosting, registros de infraestructura o configuración de producción hayan sido auditados.",
          },
          {
            title: "Ubicación y seguridad",
            body: "Algunos flujos pueden solicitar GPS para validar acceso o registrar operaciones. La ubicación es un dato personal y su uso debe limitarse a los fines informados por la empresa responsable. Se aplican controles de autenticación, permisos, aislamiento y registros de seguridad según la configuración del servicio; la cobertura de producción y los proveedores deben validarse antes de considerar estos controles evidencia completa.",
          },
          {
            title: "Conservación y eliminación",
            body: "La meta comunicada es conservar telemetría técnica mínima por 30 días, sujeta a aprobación e implementación de una purga verificable. No es un plazo universal para registros laborales, documentos, nóminas, asistencia, respaldos ni retenciones legales. Cada activo necesita plazo y procedimiento propios. A la fecha de este borrador, el repositorio no acredita una eliminación automatizada completa en producción.",
          },
          {
            title: "Transferencias y decisiones automatizadas",
            body: "El inventario de países, encargados, subencargados, contratos y mecanismos de transferencia internacional aún debe completarse. No se declaran decisiones automatizadas con efectos significativos como función confirmada; los usos de perfilamiento deben ser revisados por cada cliente antes de habilitarlos.",
          },
          {
            title: "Aplicación internacional",
            body: "La operación base se identifica en Chile. El RGPD puede aplicar cuando se cumplen sus criterios territoriales (por ejemplo, establecimiento en la UE, oferta de servicios a personas en la UE o monitorización allí). En Estados Unidos pueden aplicar leyes federales sectoriales y leyes estatales según actividad y umbrales; COPPA se centra en menores de 13 y la regla de acceso 18+ de BJSIGAPP no exime a las empresas de sus deberes sobre datos laborales. La aplicación de cada régimen requiere análisis del mercado, titulares y contratos; esta política no certifica cumplimiento internacional.",
          },
          {
            title: "Derechos y canal de solicitudes",
            body: "Según la ley aplicable, los derechos pueden incluir acceso, rectificación, supresión, oposición, portabilidad y bloqueo, además de derechos locales adicionales. Las solicitudes sobre expedientes laborales deben dirigirse primero a la empresa empleadora, como responsable del tratamiento correspondiente. Para datos propios de una cuenta o consultas del servicio, utiliza el canal contractual o la página de contacto e indica que se trata de una solicitud de privacidad. El correo dedicado, responsables de atención y plazos operativos aún deben ser confirmados y publicados por BJ Servicios Informáticos SpA.",
          },
        ]
      : kind === "terms"
        ? [
            {
              title: "Proveedor y aceptación",
              body: "BJSIGAPP es un servicio de gestión y prevención de riesgos operado por BJ Servicios Informáticos SpA en Chile. La identidad tributaria, domicilio y datos completos de contacto del proveedor deben completarse en la versión contractual firmada. El uso requiere autorización de la empresa cliente y una cuenta individual habilitada; la autodeclaración de edad no sustituye la validación de identidad.",
            },
            {
              title: "Elegibilidad y cuentas",
              body: "Sólo personas de 18 años o más pueden acceder a esta versión. Cada usuario debe mantener sus credenciales bajo control, no compartir cuentas y notificar accesos no autorizados. El cliente administra altas, roles y baja de trabajadores. No debe cargar información de personas menores en esta versión; si ocurre, debe restringir el acceso y comunicarlo por el canal de soporte/privacidad.",
            },
            {
              title: "Datos y responsabilidades del cliente",
              body: "El cliente decide qué módulos usar y responde por la exactitud de los datos, la información que entrega a trabajadores, la base de licitud, los permisos de sus usuarios, la definición de retención y las instrucciones impartidas a sus proveedores. En datos laborales, el cliente y BJ deben documentar en contrato sus roles, seguridad, asistencia a solicitudes y eliminación/devolución al terminar el servicio.",
            },
            {
              title: "Uso, ubicación y seguridad",
              body: "El servicio debe utilizarse para fines empresariales legítimos y dentro de los permisos asignados. Algunos flujos solicitan ubicación GPS; su propósito y alcance deben ser informados por la empresa cliente. Se prohíbe intentar acceder a datos de otros clientes, compartir credenciales o eludir controles de seguridad.",
            },
            {
              title: "Proveedores y enlaces externos",
              body: "El servicio puede depender de proveedores de alojamiento, autenticación y soporte que se informarán en la política de privacidad y en el contrato de tratamiento. Abrir enlaces de Google Drive u otros servicios externos comunica la dirección IP directamente al proveedor del enlace. Esta versión no incorpora analítica de Google en el código revisado; los scripts/configuración del hosting deben verificarse independientemente.",
            },
            {
              title: "Disponibilidad, cambios y soporte",
              body: "Las funciones pueden cambiar por mantenimiento, seguridad o evolución del producto. No se garantiza disponibilidad ininterrumpida. Los canales y niveles de soporte aplicables son los indicados en la propuesta/contrato SaaS firmado; esta página no crea un SLA no pactado.",
            },
            {
              title: "Conservación, solicitudes y término",
              body: "Los plazos y procesos de exportación, conservación y eliminación deben fijarse por contrato y por activo. La meta de 30 días se limita a telemetría técnica cuando se implemente y no prevalece sobre obligaciones legales documentadas. Al finalizar el servicio, BJ y el cliente deben acordar devolución, exportación, bloqueo y eliminación de acuerdo con la ley y el contrato.",
            },
            {
              title: "Ley aplicable y estado de este documento",
              body: "Este texto es un borrador público informativo, no sustituye el contrato SaaS ni asesoría jurídica. Antes de presentarlo como condición vinculante deben revisarse el alcance territorial, derechos de titulares, límites de responsabilidad, pagos, terminación, subencargos, notificación de incidentes, jurisdicción y anexos de tratamiento para Chile y los países donde se ofrezca el servicio.",
            },
          ]
        : [];
  const content =
    kind === "privacy"
      ? {
          title: "Política de privacidad",
          intro:
            "Aviso de trabajo sobre los datos que trata BJSIGAPP, las responsabilidades de BJ y las empresas clientes, y los puntos que todavía requieren validación.",
          items: [
            "BJ Servicios Informáticos SpA · Chile",
            "Acceso de personas usuarias 18+",
            "Datos laborales bajo responsabilidad del cliente según cada tratamiento",
            "Borrador público pendiente de aprobación jurídica y verificación de producción",
          ],
        }
      : kind === "terms"
        ? {
            title: "Términos y condiciones",
            intro:
              "Borrador de condiciones para el servicio BJSIGAPP. Debe completarse y revisarse con el contrato SaaS antes de tratarse como documento vinculante.",
            items: [
              "Proveedor identificado y cuentas individuales",
              "Usuarios de 18 años o más",
              "Responsabilidades por los datos cargados y su conservación",
              "Seguridad, proveedores, soporte y término del servicio",
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
          {kind !== "contact" && (
            <p className="mt-3 rounded-xl border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm leading-6 text-amber-100">
              Borrador v0.1 · 9 de noviembre de 2026. No es una certificación de cumplimiento ni
              reemplaza el contrato SaaS. Falta revisión jurídica, completar identificación y canal
              formal de privacidad, y validar la configuración productiva.
            </p>
          )}
          <ul className="mt-8 divide-y divide-white/10 border-y border-white/10">
            {content.items.map((item) => (
              <li key={item} className="flex min-h-14 items-center gap-3 py-3 text-sm sm:text-base">
                <Check size={18} className="shrink-0 text-cyan-300" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
          {sections.length > 0 && (
            <div className="mt-10 space-y-8">
              {sections.map((section) => (
                <section key={section.title} className="space-y-2">
                  <h2 className="text-lg font-bold text-white">{section.title}</h2>
                  <p className="max-w-prose text-sm leading-7 text-white/70">{section.body}</p>
                </section>
              ))}
            </div>
          )}
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
