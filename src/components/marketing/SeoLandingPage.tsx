import { DeviceShowcase } from "@/components/marketing/DeviceShowcase";
import {
  ArrowRight,
  BarChart3,
  Boxes,
  Building2,
  CalendarClock,
  ClipboardCheck,
  FileText,
  HardHat,
  Layers,
  LockKeyhole,
  MessageCircle,
  ShieldCheck,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

export type SeoLandingPageKey =
  "home" | "multisucursal" | "gestion" | "personas" | "seguridad" | "contacto";

type Feature = { icon: LucideIcon; title: string; description: string };
type Step = { title: string; description: string };
type Faq = { question: string; answer: string };
type PageContent = {
  eyebrow: string;
  title: string;
  introduction: string;
  challengeTitle: string;
  challenge: string;
  featuresTitle?: string;
  features?: Feature[];
  workflowTitle?: string;
  steps?: Step[];
  platformSection?: {
    title: string;
    introduction: string;
    items: Feature[];
    note: string;
  };
  faqTitle: string;
  faqs: Faq[];
  keywords: string[];
};

const pages: Record<SeoLandingPageKey, PageContent> = {
  home: {
    eyebrow: "Software para RR. HH. y operaciones",
    title: "Software multiempresa de RR. HH. y operaciones",
    introduction:
      "Administra personas, asistencia, turnos, prevención, documentos y procesos internos desde una plataforma SaaS. Configura módulos, permisos e identidad para cada empresa.",
    challengeTitle: "Ordena todas tus sucursales desde una sola plataforma",
    challenge:
      "Cuando cada sede trabaja con planillas, correos y carpetas distintas, cuesta saber qué está pendiente y quién debe actuar. BJSIGAPP centraliza la información y ayuda a mantener el contexto de cada empresa, sucursal y responsable.",
    platformSection: {
      title: "Una plataforma SaaS para gestionar personas y operación por empresa",
      introduction:
        "BJSIGAPP permite administrar varias organizaciones desde un control de plataforma y trabajar dentro del contexto de cada empresa. Los módulos habilitados y los permisos definen qué funciones ve cada equipo.",
      items: [
        {
          icon: Building2,
          title: "Estructura",
          description:
            "Organizaciones, sucursales, áreas y responsables organizados según la estructura definida por cada empresa.",
        },
        {
          icon: Layers,
          title: "Módulos y accesos",
          description:
            "Planes, vistas y permisos configurables para que cada perfil utilice las funciones que le corresponden.",
        },
        {
          icon: Boxes,
          title: "Contexto separado",
          description:
            "La información operativa se asocia a la empresa activa y sus permisos, con branding y portales diferenciados según configuración.",
        },
      ],
      note: "El alcance concreto depende del plan y los módulos habilitados para cada organización.",
    },
    faqTitle: "Preguntas frecuentes",
    faqs: [
      {
        question: "¿La demo muestra información de clientes?",
        answer: "No. La demo usa datos ilustrativos, no información de clientes.",
      },
      {
        question: "¿Se puede configurar para cada empresa?",
        answer:
          "Sí. Se pueden configurar módulos, vistas, roles y permisos por empresa y sucursal.",
      },
      {
        question: "¿Puedo empezar por algunos módulos?",
        answer: "Sí. Puedes priorizar los procesos y módulos que tu empresa necesita revisar.",
      },
    ],
    keywords: [
      "software multiempresa",
      "software de RR. HH.",
      "plataforma SaaS de operaciones",
      "gestión de personas y asistencia",
      "software de gestión multisucursal",
      "BJSIGAPP",
    ],
  },
  multisucursal: {
    eyebrow: "Control central, operación por sede",
    title: "Gestiona cada sucursal con una plataforma empresarial clara y conectada",
    introduction:
      "Coordina tareas, personas y procesos entre sucursales con información organizada por sede y una vista común para quienes administran la operación.",
    challengeTitle: "La gestión multisucursal necesita orden sin perder el detalle local",
    challenge:
      "Una oficina central necesita comparar avances; cada sucursal necesita trabajar con sus propios equipos y responsables. BJSIGAPP ayuda a mantener ambas perspectivas en un mismo entorno, con permisos y contexto por organización.",
    featuresTitle: "Lo que una plataforma de gestión multisucursal ayuda a ordenar",
    features: [
      {
        icon: Building2,
        title: "Estructura visible por sede",
        description:
          "Consulta empresas, sucursales, áreas y responsables desde una organización coherente.",
      },
      {
        icon: ClipboardCheck,
        title: "Procesos con responsables",
        description:
          "Relaciona pendientes, inspecciones, solicitudes y acciones con las personas que deben gestionarlos.",
      },
      {
        icon: CalendarClock,
        title: "Turnos y asistencia ordenados",
        description:
          "Mantén definiciones y asignaciones de turno asociadas a los equipos y al contexto de cada operación.",
      },
      {
        icon: LockKeyhole,
        title: "Accesos acordes al trabajo",
        description:
          "Administra roles y permisos para que cada usuario vea las herramientas y la información que le corresponden.",
      },
    ],
    workflowTitle: "Un mismo método para coordinar distintas sucursales",
    steps: [
      {
        title: "Ordena la estructura de la organización",
        description:
          "Identifica sedes, equipos y responsables para que las actividades no queden dispersas.",
      },
      {
        title: "Estandariza procesos y conserva contexto",
        description:
          "Define una forma común de registrar información, sin borrar las particularidades de cada sucursal.",
      },
      {
        title: "Da seguimiento desde una vista compartida",
        description:
          "Revisa tareas y avances por sede, con el detalle necesario para coordinar y apoyar a cada equipo.",
      },
    ],
    faqTitle: "Dudas frecuentes sobre la gestión de sucursales",
    faqs: [
      {
        question: "¿Puedo tener una visión general y revisar una sucursal por separado?",
        answer:
          "Sí. La propuesta de BJSIGAPP es facilitar el seguimiento general y, al mismo tiempo, conservar la organización por empresa, sucursal, equipo y permisos.",
      },
      {
        question: "¿Qué se puede organizar entre varias sedes?",
        answer:
          "Personas, turnos, asistencia, prevención, EPP, capacitaciones, documentos y actividades pueden quedar dentro de flujos de trabajo vinculados a la operación correspondiente.",
      },
      {
        question: "¿BJSIGAPP reemplaza todos los sistemas de la empresa?",
        answer:
          "BJSIGAPP centraliza procesos de gestión empresarial y seguridad operacional. En una demostración se puede revisar qué módulos se ajustan a tu organización y qué integraciones o procesos deben mantenerse aparte.",
      },
    ],
    keywords: [
      "gestión multisucursal",
      "software para sucursales",
      "control de sucursales",
      "operación empresarial",
      "BJSIGAPP",
    ],
  },
  gestion: {
    eyebrow: "Procesos conectados en un mismo sistema",
    title: "Software de gestión empresarial para ordenar procesos y equipos",
    introduction:
      "Centraliza información operativa que hoy puede estar repartida entre planillas, carpetas y conversaciones. Organiza los módulos de acuerdo con las necesidades de cada empresa.",
    challengeTitle: "Una plataforma de gestión empresarial para reducir el trabajo disperso",
    challenge:
      "Cuando personas, seguridad, documentación y seguimiento viven en herramientas separadas, se pierde tiempo buscando información y reconstruyendo el estado de cada tarea. BJSIGAPP ayuda a reunir esos procesos y darles responsables.",
    featuresTitle: "Procesos que puedes conectar en la gestión diaria",
    features: [
      {
        icon: UsersRound,
        title: "Personas y RR. HH.",
        description:
          "Mantén fichas, documentos, solicitudes, vacaciones, licencias y comunicaciones asociados a los equipos.",
      },
      {
        icon: CalendarClock,
        title: "Asistencia y turnos",
        description:
          "Organiza jornadas, ciclos, asignaciones y cambios con historial y visibilidad para los responsables.",
      },
      {
        icon: HardHat,
        title: "Seguridad en terreno",
        description:
          "Registra incidentes, inspecciones, charlas, entregas de EPP y acciones para darles seguimiento.",
      },
      {
        icon: FileText,
        title: "Documentos e indicadores",
        description:
          "Reúne evidencias, documentos y paneles que ayudan a priorizar pendientes y revisar avances.",
      },
    ],
    workflowTitle: "De registros aislados a procesos más claros",
    steps: [
      {
        title: "Identifica dónde se duplica el trabajo",
        description:
          "Selecciona los procesos que hoy consumen tiempo en registros manuales o búsquedas entre herramientas.",
      },
      {
        title: "Configura módulos y permisos",
        description:
          "Alinea las vistas de la plataforma con los equipos, responsabilidades y módulos habilitados.",
      },
      {
        title: "Revisa el trabajo con trazabilidad",
        description:
          "Sigue actividades, responsables y estados para actuar con información más ordenada.",
      },
    ],
    faqTitle: "Preguntas frecuentes sobre software de gestión empresarial",
    faqs: [
      {
        question: "¿La plataforma es configurable por empresa?",
        answer:
          "La configuración contempla empresa, módulos, vistas, branding, roles y permisos. El alcance concreto se revisa durante la implementación o una demostración.",
      },
      {
        question: "¿Qué tipo de información ayuda a centralizar?",
        answer:
          "BJSIGAPP integra flujos vinculados a trabajadores, asistencia, turnos, seguridad, EPP, capacitación, documentación, solicitudes y comunicaciones.",
      },
      {
        question: "¿Cómo comienzo?",
        answer:
          "Solicita una demostración y revisa con el equipo qué procesos conviene ordenar primero y qué estructura necesita tu empresa.",
      },
    ],
    keywords: [
      "software de gestión empresarial",
      "plataforma de gestión empresarial",
      "gestión de operaciones",
      "software para empresas",
      "BJSIGAPP",
    ],
  },
  personas: {
    eyebrow: "Personas, asistencia y turnos",
    title: "Ordena personas, turnos y asistencia en todas tus sucursales",
    introduction:
      "Conecta la información de los equipos con turnos, asistencia, documentos, solicitudes y comunicaciones. Facilita el seguimiento sin perder de vista la empresa o sucursal correspondiente.",
    challengeTitle: "Una gestión de personas más clara para cada equipo",
    challenge:
      "Los cambios de turno, documentos pendientes y solicitudes no deberían depender de cadenas de mensajes. BJSIGAPP reúne información de trabajadores y procesos relacionados para ayudar a los equipos a trabajar con más contexto.",
    featuresTitle: "Gestión de personas y operación diaria en un solo lugar",
    features: [
      {
        icon: UsersRound,
        title: "Fichas y portal del trabajador",
        description:
          "Organiza información y facilita que cada trabajador consulte documentos, comunicaciones y solicitudes desde su portal.",
      },
      {
        icon: CalendarClock,
        title: "Turnos y asistencia",
        description:
          "Administra definiciones, asignaciones, asistencia y cambios con información visible para los roles autorizados.",
      },
      {
        icon: FileText,
        title: "Documentos y solicitudes",
        description:
          "Mantén antecedentes y requerimientos en flujos más fáciles de revisar y responder.",
      },
      {
        icon: BarChart3,
        title: "Seguimiento de equipos",
        description:
          "Consulta estados y pendientes para coordinar personas entre áreas y sucursales.",
      },
    ],
    workflowTitle: "Conecta las tareas de administración con el portal personal",
    steps: [
      {
        title: "Organiza trabajadores y roles",
        description:
          "Mantén a cada persona vinculada al contexto correcto y asigna accesos según sus funciones.",
      },
      {
        title: "Ordena turnos y solicitudes",
        description:
          "Registra cambios, consultas y tareas de personas de forma estructurada y con responsables.",
      },
      {
        title: "Comparte información de forma controlada",
        description:
          "Facilita el acceso personal y operativo con permisos definidos, manteniendo separadas sus funciones.",
      },
    ],
    faqTitle: "Preguntas sobre personas, asistencia y turnos",
    faqs: [
      {
        question: "¿Los trabajadores tienen un portal propio?",
        answer:
          "Sí. El Portal del Trabajador está destinado a que cada persona consulte información y solicitudes propias, según los accesos configurados.",
      },
      {
        question: "¿Puedo organizar turnos por sucursal?",
        answer:
          "La plataforma permite asociar asignaciones al contexto de la empresa y sus equipos. La estructura específica se revisa según cómo estén organizadas las sedes.",
      },
      {
        question: "¿El portal personal y el acceso administrativo son iguales?",
        answer:
          "Son superficies diferentes. La identidad de una persona puede tener acceso personal y una función operativa, pero permisos y datos deben mantenerse delimitados.",
      },
    ],
    keywords: [
      "gestión de personas",
      "gestión de turnos",
      "portal del trabajador",
      "asistencia laboral",
      "BJSIGAPP",
    ],
  },
  seguridad: {
    eyebrow: "Prevención y cumplimiento operacional",
    title: "Ordena seguridad, prevención y cumplimiento en cada sucursal",
    introduction:
      "Centraliza registros, evidencias y seguimiento de prevención para que cada equipo sepa qué revisar, quién responde y qué acciones siguen abiertas.",
    challengeTitle: "La seguridad requiere evidencia y seguimiento, no solo documentos",
    challenge:
      "Incidentes, inspecciones, EPP, capacitaciones y protocolos necesitan responsables y trazabilidad. BJSIGAPP ayuda a ordenar esos elementos dentro de una gestión común para empresas y sucursales.",
    featuresTitle: "Herramientas para acompañar la gestión de seguridad",
    features: [
      {
        icon: HardHat,
        title: "Trabajo en terreno",
        description:
          "Organiza inspecciones, incidentes, charlas, hallazgos y acciones correctivas con sus responsables.",
      },
      {
        icon: ShieldCheck,
        title: "Prevención y cumplimiento",
        description:
          "Relaciona matrices IPER, protocolos, auditorías y evidencia de actividades para facilitar su revisión.",
      },
      {
        icon: ClipboardCheck,
        title: "EPP e inventario",
        description:
          "Da seguimiento a stock, entregas, firmas y reposición de elementos de protección personal.",
      },
      {
        icon: FileText,
        title: "Capacitaciones y documentos",
        description:
          "Ordena actividades, registros y documentos asociados a obligaciones y procesos internos.",
      },
    ],
    workflowTitle: "Un proceso de prevención que se puede seguir",
    steps: [
      {
        title: "Registra actividades y hallazgos",
        description:
          "Documenta eventos, inspecciones y entregas de seguridad con el contexto de la operación.",
      },
      {
        title: "Asigna responsables y acciones",
        description:
          "Mantén identificadas las tareas que requieren atención, respuesta o evidencia adicional.",
      },
      {
        title: "Revisa avances y respaldos",
        description:
          "Consulta estados e historial para apoyar el trabajo preventivo y la revisión interna.",
      },
    ],
    faqTitle: "Preguntas sobre seguridad y cumplimiento operacional",
    faqs: [
      {
        question: "¿BJSIGAPP entrega asesoría legal o certifica cumplimiento?",
        answer:
          "No. La plataforma ayuda a registrar y ordenar procesos y evidencias; no reemplaza la asesoría profesional, las obligaciones legales ni la evaluación de cumplimiento de cada organización.",
      },
      {
        question: "¿Qué registros de prevención se pueden ordenar?",
        answer:
          "El alcance incluye capacidades para incidentes, inspecciones, matrices IPER, EPP, capacitaciones, protocolos, auditoría y acciones de seguimiento, según los módulos habilitados.",
      },
      {
        question: "¿Puedo seguir actividades de distintas sucursales?",
        answer:
          "Sí. Los flujos pueden organizarse por empresa, equipos y contexto operativo para ayudar a revisar avances en más de una sede.",
      },
    ],
    keywords: [
      "gestión de prevención de riesgos",
      "seguridad operacional",
      "gestión de EPP",
      "cumplimiento empresarial",
      "BJSIGAPP",
    ],
  },
  contacto: {
    eyebrow: "Conversemos sobre tu operación",
    title: "Conversemos sobre cómo ordenar tu empresa y sus sucursales",
    introduction:
      "Cuéntanos cómo se organiza tu operación, qué procesos quieres centralizar y qué necesitan ver tus equipos. El equipo de BJSIGAPP puede mostrarte la plataforma con foco en tu realidad.",
    challengeTitle: "Solicita una demostración de gestión empresarial",
    challenge:
      "Una conversación inicial permite revisar la cantidad de empresas y sucursales, los procesos de personas y prevención, y las prioridades de tu equipo antes de definir un recorrido por la plataforma.",
    featuresTitle: "Qué podemos revisar en una demostración",
    features: [
      {
        icon: Building2,
        title: "Estructura de empresas y sedes",
        description: "Cómo se organizarían equipos, responsables y vistas según tu estructura.",
      },
      {
        icon: UsersRound,
        title: "Personas, turnos y asistencia",
        description: "Qué flujos de RR. HH. y operación diaria necesitas tener a mano.",
      },
      {
        icon: ShieldCheck,
        title: "Prevención y cumplimiento",
        description: "Qué registros, evidencias y tareas de seguimiento quieres ordenar.",
      },
      {
        icon: MessageCircle,
        title: "Próximos pasos",
        description: "Cómo avanzar con una revisión del alcance que sea útil para tu organización.",
      },
    ],
    workflowTitle: "Prepara una conversación útil para tu equipo",
    steps: [
      {
        title: "Cuéntanos el tamaño y estructura de tu operación",
        description: "Indica cuántas sedes o equipos quieres coordinar y cómo trabajan hoy.",
      },
      {
        title: "Prioriza los procesos que quieres ordenar",
        description:
          "Por ejemplo, trabajadores, turnos, asistencia, EPP, documentación o prevención.",
      },
      {
        title: "Agenda el siguiente paso",
        description: "Escríbenos por WhatsApp para coordinar la demostración y resolver tus dudas.",
      },
    ],
    faqTitle: "Antes de solicitar una demostración",
    faqs: [
      {
        question: "¿Qué información debo compartir?",
        answer:
          "Basta con contar cómo se compone tu organización, qué procesos buscas ordenar y qué equipos participarían. No envíes contraseñas, datos sensibles ni información personal de trabajadores por el formulario de contacto.",
      },
      {
        question: "¿La demostración activa una cuenta o un servicio?",
        answer:
          "No. La conversación sirve para conocer tu necesidad y revisar la plataforma; cualquier alta o implementación se acuerda por separado.",
      },
      {
        question: "¿Cómo contacto al equipo?",
        answer: "Puedes iniciar la conversación desde el botón de WhatsApp de esta página.",
      },
    ],
    keywords: [
      "contacto BJSIGAPP",
      "solicitar demo de gestión empresarial",
      "demo software multisucursal",
      "gestión empresarial",
      "BJSIGAPP",
    ],
  },
};

const pageLinks = [
  { href: "/modulos", label: "Módulos" },
  { href: "/gestion-multisucursal", label: "Gestión multisucursal" },
  { href: "/software-de-gestion-empresarial", label: "Gestión empresarial" },
  { href: "/gestion-de-personas-y-turnos", label: "Personas y turnos" },
  { href: "/seguridad-y-cumplimiento", label: "Seguridad y cumplimiento" },
];

const demoUrl =
  "https://wa.me/56941228089?text=Hola%2C%20quiero%20conocer%20BJSIGAPP%20para%20ordenar%20la%20gesti%C3%B3n%20de%20mi%20empresa%20y%20sus%20sucursales.";

export function SeoLandingPage({ page }: { page: SeoLandingPageKey }) {
  const content = pages[page];
  const isContactPage = page === "contacto";

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
          <nav
            aria-label="Páginas de BJSIGAPP"
            className="hidden items-center gap-5 text-xs font-semibold text-slate-300 xl:flex"
          >
            {pageLinks.map((link) => (
              <a key={link.href} href={link.href} className="transition hover:text-white">
                {link.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <a
              href="/admin"
              className="hidden rounded-xl px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/5 hover:text-white sm:inline-flex"
            >
              Acceso clientes
            </a>
            <a
              href={demoUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-sky-400 px-3.5 py-2 text-xs font-extrabold text-slate-950 transition hover:bg-sky-300 sm:px-4 sm:text-sm"
            >
              Solicitar demo <ArrowRight size={15} aria-hidden="true" />
            </a>
          </div>
        </div>
      </header>

      <main>
        <section className="border-b border-white/10 px-5 py-14 sm:py-16 lg:px-8 lg:py-20">
          <div
            className={`mx-auto grid max-w-7xl items-center gap-8 lg:gap-12 ${page === "home" ? "lg:grid-cols-[0.72fr_1.28fr]" : "lg:grid-cols-[1fr_0.9fr]"}`}
          >
            <div className="max-w-2xl">
              {page !== "home" && (
                <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-sky-200">
                  <Building2 size={14} aria-hidden="true" /> {content.eyebrow}
                </p>
              )}
              <h1 className="text-balance text-3xl font-black leading-[1.08] tracking-tight text-white md:text-4xl xl:text-5xl">
                {content.title}
              </h1>
              <h2 className="mt-5 max-w-xl text-balance text-base font-semibold leading-7 text-slate-200 sm:text-lg sm:leading-8">
                {content.introduction}
              </h2>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                {page === "home" ? (
                  <>
                    <a
                      href="#demo"
                      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-sky-400 px-5 py-3 text-sm font-extrabold text-slate-950 transition hover:bg-sky-300"
                    >
                      Explorar la demo <ArrowRight size={16} aria-hidden="true" />
                    </a>
                  </>
                ) : (
                  <>
                    <a
                      href={demoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-sky-400 px-5 py-3 text-sm font-extrabold text-slate-950 shadow-lg shadow-sky-950/40 transition hover:-translate-y-0.5 hover:bg-sky-300"
                    >
                      <MessageCircle size={17} aria-hidden="true" /> Solicitar una demostración
                    </a>
                    <a
                      href="/gestion-multisucursal"
                      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/15 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/5"
                    >
                      Ver gestión multisucursal <ArrowRight size={16} aria-hidden="true" />
                    </a>
                  </>
                )}
              </div>
              {page !== "home" && (
                <p className="mt-5 text-xs leading-5 text-slate-400">
                  Información organizada por empresa y equipo · Roles y permisos · Seguimiento con
                  trazabilidad
                </p>
              )}
            </div>

            <div id="demo" className="scroll-mt-24 min-w-0">
              <div className="mb-4">
                <h2
                  id="interactive-demo-title"
                  className="text-2xl font-black leading-tight tracking-tight text-white sm:text-3xl"
                >
                  {page === "home" ? "Explora la plataforma" : "Prueba la demo interactiva"}
                </h2>
                <p className="mt-2 text-base leading-7 text-slate-300">
                  {page === "home"
                    ? "Elige un área. Las tres pantallas siguen el mismo recorrido."
                    : "Panel central, terreno y teléfono en una vista de ejemplo."}
                </p>
              </div>
              <DeviceShowcase />
            </div>
          </div>
        </section>

        {page !== "home" && (
          <section className="px-5 py-16 sm:py-20 lg:px-8" aria-labelledby="challenge-title">
            <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-sky-300">
                  El problema que ordenamos
                </p>
                <h2
                  id="challenge-title"
                  className="mt-3 max-w-xl text-3xl font-black leading-tight tracking-tight text-white sm:text-4xl"
                >
                  {content.challengeTitle}
                </h2>
              </div>
              <div className="max-w-3xl self-end">
                <p className="text-base leading-7 text-slate-300">{content.challenge}</p>
                <a
                  href="/software-de-gestion-empresarial"
                  className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-sky-200 underline decoration-sky-300/30 underline-offset-4 hover:text-white"
                >
                  Conoce la plataforma de gestión empresarial{" "}
                  <ArrowRight size={15} aria-hidden="true" />
                </a>
              </div>
            </div>
          </section>
        )}

        <section
          id="capacidades"
          className="border-y border-white/10 bg-slate-900/60 px-5 py-16 sm:py-20 lg:px-8"
          aria-labelledby="features-title"
        >
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl">
              {page !== "home" && (
                <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-sky-300">
                  Capacidades conectadas
                </p>
              )}
              <h2
                id="features-title"
                className={`${page === "home" ? "mt-0" : "mt-3"} text-3xl font-black leading-tight tracking-tight text-white sm:text-4xl`}
              >
                {content.featuresTitle}
              </h2>
              {page !== "home" && (
                <p className="mt-4 text-base leading-7 text-slate-300">
                  Cada módulo aporta orden a una parte del trabajo y permite que los equipos
                  consulten lo que necesitan según su función.
                </p>
              )}
            </div>
            <div
              className={`mt-8 grid gap-8 ${page === "home" ? "sm:grid-cols-3" : "sm:grid-cols-2 xl:grid-cols-4"}`}
            >
              {content.features.map(({ icon: Icon, title, description }) =>
                page === "home" ? (
                  <article key={title} className="max-w-sm">
                    <h3 className="text-lg font-semibold text-white">{title}</h3>
                    <p className="mt-2 text-base leading-7 text-slate-300">{description}</p>
                  </article>
                ) : (
                  <article
                    key={title}
                    className="rounded-2xl border border-white/10 bg-slate-950/70 p-5 transition hover:-translate-y-1 hover:border-sky-300/30"
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-300/10 text-sky-200">
                      <Icon size={21} aria-hidden="true" />
                    </span>
                    <h3 className="mt-4 text-base font-extrabold text-white">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
                  </article>
                ),
              )}
            </div>
          </div>
        </section>

        <section className="px-5 py-16 sm:py-20 lg:px-8" aria-labelledby="workflow-title">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl">
              {page !== "home" && (
                <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-sky-300">
                  Una forma ordenada de avanzar
                </p>
              )}
              <h2
                id="workflow-title"
                className={`${page === "home" ? "mt-0" : "mt-3"} text-3xl font-black leading-tight tracking-tight text-white sm:text-4xl`}
              >
                {content.workflowTitle}
              </h2>
            </div>
            <ol className="mt-9 grid gap-4 md:grid-cols-3">
              {content.steps.map((step, index) => (
                <li
                  key={step.title}
                  className={
                    page === "home"
                      ? "max-w-sm"
                      : "relative rounded-2xl border border-white/10 bg-white/[0.035] p-5 sm:p-6"
                  }
                >
                  {page !== "home" && (
                    <span className="text-xs font-black uppercase tracking-[0.18em] text-sky-300">
                      Paso 0{index + 1}
                    </span>
                  )}
                  <h3
                    className={`${page === "home" ? "" : "mt-4"} text-lg font-semibold text-white`}
                  >
                    {step.title}
                  </h3>
                  <p className="mt-2 text-base leading-7 text-slate-300">{step.description}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section
          className="border-y border-white/10 bg-slate-900/60 px-5 py-16 sm:py-20 lg:px-8"
          aria-labelledby="faq-title"
        >
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:gap-16">
            <div>
              {page !== "home" && (
                <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-sky-300">
                  Respuestas claras
                </p>
              )}
              <h2
                id="faq-title"
                className={`${page === "home" ? "mt-0" : "mt-3"} text-3xl font-black leading-tight tracking-tight text-white sm:text-4xl`}
              >
                {content.faqTitle}
              </h2>
              {page !== "home" && (
                <p className="mt-4 text-sm leading-6 text-slate-400">
                  Explora también nuestras páginas sobre{" "}
                  <a
                    className="text-sky-200 underline underline-offset-4"
                    href="/gestion-multisucursal"
                  >
                    gestión multisucursal
                  </a>
                  ,{" "}
                  <a
                    className="text-sky-200 underline underline-offset-4"
                    href="/gestion-de-personas-y-turnos"
                  >
                    personas y turnos
                  </a>{" "}
                  y{" "}
                  <a
                    className="text-sky-200 underline underline-offset-4"
                    href="/seguridad-y-cumplimiento"
                  >
                    seguridad operacional
                  </a>
                  .
                </p>
              )}
            </div>
            <div className="space-y-3">
              {content.faqs.map((faq) => (
                <details
                  key={faq.question}
                  className="group rounded-xl border border-white/10 bg-slate-950/75 p-4 open:border-sky-300/25"
                >
                  <summary className="cursor-pointer list-none pr-7 text-base font-bold text-white marker:hidden [&::-webkit-details-marker]:hidden">
                    {faq.question}
                  </summary>
                  <p className="mt-3 text-base leading-7 text-slate-400">{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="px-5 py-16 sm:py-20 lg:px-8" aria-labelledby="related-title">
          <div className="mx-auto max-w-7xl rounded-3xl bg-slate-900 p-6 sm:p-10 lg:p-12">
            <div className="grid items-center gap-8 lg:grid-cols-[1fr_auto]">
              <div className="max-w-3xl">
                {page !== "home" && (
                  <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-sky-300">
                    BJSIGAPP
                  </p>
                )}
                <h2
                  id="related-title"
                  className={`${page === "home" ? "mt-0" : "mt-3"} text-3xl font-black leading-tight tracking-tight text-white sm:text-4xl`}
                >
                  {isContactPage
                    ? "Conversemos sobre tus prioridades"
                    : page === "home"
                      ? "¿Qué proceso quieres ordenar?"
                      : "Empieza por ordenar lo que más necesita tu empresa"}
                </h2>
                <p className="mt-4 text-base leading-7 text-slate-300">
                  {page === "home"
                    ? "Cuéntanos cómo trabaja tu empresa y qué te gustaría conectar."
                    : "Solicita una demostración y revisa cómo organizar personas, sucursales, seguridad y procesos en una plataforma de gestión empresarial."}
                </p>
              </div>
              <a
                href={demoUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-sky-400 px-5 py-3 text-sm font-extrabold text-slate-950 transition hover:bg-sky-300"
              >
                <MessageCircle size={17} aria-hidden="true" /> Hablar por WhatsApp{" "}
                <ArrowRight size={16} aria-hidden="true" />
              </a>
            </div>
            {page !== "home" && (
              <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 border-t border-white/10 pt-5 text-xs font-semibold text-slate-300">
                {pageLinks.map((link) => (
                  <a key={link.href} href={link.href} className="hover:text-white">
                    {link.label}
                  </a>
                ))}
                <a href="/contacto" className="hover:text-white">
                  Contacto
                </a>
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 px-5 py-7 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} BJSIGAPP · Gestión empresarial y operacional.</p>
          <nav aria-label="Enlaces legales" className="flex gap-4">
            <a href="/privacidad" className="hover:text-slate-300">
              Privacidad
            </a>
            <a href="/terminos" className="hover:text-slate-300">
              Términos
            </a>
            <a href="/contacto" className="hover:text-slate-300">
              Contacto
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}

export function getSeoPageMetadata(page: SeoLandingPageKey) {
  const content = pages[page];
  const paths = {
    home: "/",
    multisucursal: "/gestion-multisucursal",
    gestion: "/software-de-gestion-empresarial",
    personas: "/gestion-de-personas-y-turnos",
    seguridad: "/seguridad-y-cumplimiento",
    contacto: "/contacto",
  } as const;
  const titles: Record<SeoLandingPageKey, string> = {
    home: "Software multiempresa de RR. HH. y operaciones | BJSIGAPP",
    multisucursal: "Software de gestión multisucursal | BJSIGAPP",
    gestion: "Software de gestión empresarial | BJSIGAPP",
    personas: "Gestión de personas y turnos | BJSIGAPP",
    seguridad: "Seguridad y cumplimiento operacional | BJSIGAPP",
    contacto: "Contacto y demo de gestión empresarial | BJSIGAPP",
  };
  const descriptions: Record<SeoLandingPageKey, string> = {
    home: "Software SaaS multiempresa para administrar RR. HH., asistencia, turnos, prevención y documentos. Configura módulos, permisos e identidad para cada empresa.",
    multisucursal:
      "Coordina personas, procesos y seguimiento entre sucursales con información organizada por sede, empresa y responsable.",
    gestion:
      "Centraliza personas, turnos, prevención, EPP, documentación y seguimiento en un software de gestión empresarial.",
    personas:
      "Organiza trabajadores, asistencia, turnos, documentos y solicitudes en todas tus sucursales con BJSIGAPP.",
    seguridad:
      "Ordena incidentes, inspecciones, EPP, capacitaciones y evidencias para dar seguimiento a la prevención por sucursal.",
    contacto:
      "Solicita una demostración de BJSIGAPP y conversa sobre cómo ordenar la gestión empresarial de tus sucursales.",
  };
  return {
    path: paths[page],
    title: titles[page],
    description: descriptions[page],
    keywords: content.keywords,
  };
}
