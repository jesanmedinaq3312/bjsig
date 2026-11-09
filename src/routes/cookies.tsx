import { createFileRoute } from "@tanstack/react-router";
import { openCookieSettings } from "@/components/CookieConsent";

export const Route = createFileRoute("/cookies")({
  head: () => ({
    meta: [
      { title: "Política de cookies y almacenamiento local | BJSIGAPP" },
      {
        name: "description",
        content:
          "Uso de almacenamiento local necesario y preferencias de BJSIGAPP, proveedores técnicos y controles de privacidad.",
      },
      { property: "og:title", content: "Política de cookies y almacenamiento local | BJSIGAPP" },
      {
        property: "og:description",
        content:
          "Almacenamiento local, conexiones técnicas, consentimiento y derechos bajo la Ley 21.719.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CookiesPolicy,
});

const cookies = [
  [
    "bjsig_privacy_notice_v2",
    "BJSIGAPP (almacenamiento local)",
    "Necesaria",
    "Guarda que el aviso se entendió; no es consentimiento para analítica.",
    "12 meses",
  ],
  [
    "sb-*-auth-token",
    "BJSIGAPP",
    "Necesaria",
    "Mantiene tu sesión iniciada de forma segura.",
    "Sesión / hasta cerrar sesión",
  ],
];

function S({ t, children }: { t: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-bold text-foreground">{t}</h2>
      <div className="space-y-3 leading-7 text-muted-foreground">{children}</div>
    </section>
  );
}

function CookiesPolicy() {
  return (
    <main className="mx-auto max-w-3xl space-y-8 bg-background px-5 py-14 text-foreground">
      <header className="space-y-2">
        <a href="/" className="text-sm font-semibold text-primary">
          ← Volver al inicio
        </a>
        <h1 className="text-3xl font-black">Política de cookies y almacenamiento local</h1>
        <p className="text-sm text-muted-foreground">
          Última actualización: 9 de noviembre de 2026 · Borrador 1.1, pendiente de revisión
          jurídica
        </p>
      </header>

      <S t="1. Responsable">
        <p>
          Para datos propios de la cuenta, seguridad y soporte, el responsable identificado por el
          titular del servicio es BJ Servicios Informáticos SpA. Para datos laborales que una
          empresa cliente incorpora, esa empresa determina el tratamiento según el contrato y la
          configuración real. Falta confirmar y publicar un canal específico de privacidad; consulta
          el canal contractual de tu empresa o solicita derivación desde la página de contacto.
        </p>
      </S>

      <S t="2. Qué son las cookies">
        <p>
          Las cookies y tecnologías similares (almacenamiento local, píxeles, identificadores) son
          pequeños archivos o registros que se guardan en tu dispositivo para que el sitio funcione,
          recuerde tus preferencias o mida su uso.
        </p>
      </S>

      <S t="3. Marco legal">
        <p>
          El almacenamiento estrictamente necesario permite mantener la sesión y recordar que el
          aviso fue visto. Cada uso de datos personales necesita una finalidad y base jurídica
          aplicables a su contexto; este aviso no crea una base general para tratamientos laborales.
          La Ley 21.719 debe aplicarse conforme a su vigencia oficial; el texto BCN consultado
          indica el 1 de diciembre de 2026. El RGPD/ePrivacy requieren evaluación territorial cuando
          corresponda.
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <b>Almacenamiento necesario:</b> se limita a autenticación y al registro local de
            lectura de este aviso.
          </li>
          <li>
            <b>Analítica:</b> no hay categoría opcional ni proveedor analítico activo en el código
            revisado. No se solicita consentimiento para una herramienta que no se carga.
          </li>
        </ul>
      </S>

      <S t="4. Analítica y solicitudes a proveedores">
        <p>
          En el código de aplicación revisado no encontramos el script de Google Analytics 4, Google
          Tag Manager ni un consumidor del evento de consentimiento analítico. La política CSP
          versionada tampoco autoriza dominios Google en scripts, imágenes o conexiones. Por ello,
          este checkout no inicia envío analítico a Google. La configuración del hosting/CDN y los
          encabezados servidos en producción deben verificarse por separado antes de presentar esta
          afirmación como garantía de despliegue.
        </p>
        <p>
          Toda solicitud directa del navegador a un proveedor revela normalmente la IP y metadatos
          técnicas al servidor que la recibe. BJSIGAPP realiza solicitudes necesarias a Supabase
          para autenticación y servicio. Turnstile está pausado: el cliente y la Edge Function
          retornan antes de hacer solicitudes y la política CSP bloquea sus dominios. Si se reactiva
          su verificación, el código enviará la IP del cliente a Cloudflare; este aviso y los
          acuerdos deberán revisarse antes de cualquier habilitación. Abrir un enlace de Google
          Drive u otro documento o imagen alojado por terceros conecta el navegador directamente con
          ese proveedor y revela su IP.
        </p>
      </S>

      <S t="5. Almacenamiento utilizado">
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted text-foreground">
              <tr>
                {["Nombre", "Proveedor / ubicación", "Categoría", "Finalidad", "Duración"].map(
                  (h) => (
                    <th key={h} className="p-2">
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {cookies.map((r) => (
                <tr key={r[0]} className="border-t border-border">
                  {r.map((c, i) => (
                    <td key={i} className="p-2 align-top">
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </S>

      <S t="6. Aviso y preferencias">
        <p>
          El banner es informativo; el botón “Entendido” guarda localmente una constancia de lectura
          por un máximo de 12 meses. No activa analítica ni comparte datos con Google. Puedes borrar
          el registro desde los ajustes del navegador. Si se incorpora una herramienta opcional en
          el futuro, deberá revisarse y configurarse antes de solicitar el consentimiento aplicable.
        </p>
        <button
          onClick={() => openCookieSettings()}
          className="rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground"
        >
          Ver detalles del almacenamiento
        </button>
        <p>
          También puedes bloquear o borrar cookies desde la configuración de tu navegador; algunas
          funciones podrían dejar de operar.
        </p>
      </S>

      <S t="7. Tus derechos">
        <p>
          Puedes ejercer los derechos que correspondan según la ley aplicable. Para datos laborales,
          dirígete primero a tu empleador/empresa cliente, que determina el tratamiento. Para datos
          propios de cuenta o consultas sobre BJSIGAPP, usa el canal contractual o la página de
          contacto e indica “solicitud de privacidad”. BJ Servicios Informáticos SpA aún debe
          habilitar y publicar un canal dedicado, responsable operativo y SLA. Los plazos legales no
          se sustituyen por este borrador.
        </p>
      </S>

      <S t="8. Seguridad">
        <p>
          El repositorio implementa controles técnicos como autenticación, permisos, aislamiento por
          empresa y registros de auditoría en los módulos correspondientes. La configuración real de
          hosting, copias, cifrado en reposo, MFA y monitoreo debe comprobarse por entorno antes de
          hacer afirmaciones de cumplimiento o seguridad garantizada.
        </p>
      </S>

      <S t="9. Cambios">
        <p>
          Publicaremos la versión y fecha de cada cambio material. Si una función nueva requiere
          consentimiento, no se activará hasta implementar el mecanismo y actualizar la información
          aplicable.
        </p>
      </S>
    </main>
  );
}
