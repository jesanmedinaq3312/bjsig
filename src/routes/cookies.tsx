import { createFileRoute } from "@tanstack/react-router";
import { openCookieSettings } from "@/components/CookieConsent";

export const Route = createFileRoute("/cookies")({
  head: () => ({
    meta: [
      { title: "Política de cookies y Google Analytics | BJSIGAPP" },
      {
        name: "description",
        content:
          "Cómo BJSIGAPP usa cookies necesarias, funcionales y analíticas de Google Analytics 4, base legal, plazos y cómo retirar tu consentimiento.",
      },
      { property: "og:title", content: "Política de cookies y Google Analytics | BJSIGAPP" },
      {
        property: "og:description",
        content:
          "Cookies, Google Analytics 4, consentimiento y derechos del titular bajo la Ley 21.719.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CookiesPolicy,
});

const cookies = [
  [
    "bjsig_cookie_consent_v1",
    "BJSIGAPP (almacenamiento local)",
    "Necesaria",
    "Guarda tu elección de consentimiento.",
    "12 meses",
  ],
  [
    "sb-*-auth-token",
    "BJSIGAPP",
    "Necesaria",
    "Mantiene tu sesión iniciada de forma segura.",
    "Sesión / hasta cerrar sesión",
  ],
  [
    "Preferencias de interfaz",
    "BJSIGAPP",
    "Funcional",
    "Recuerda tema, idioma y ajustes.",
    "12 meses",
  ],
  [
    "_ga",
    "Google LLC (Google Analytics 4)",
    "Analítica",
    "Distingue visitantes de forma seudónima.",
    "2 años",
  ],
  [
    "_ga_<ID>",
    "Google LLC (Google Analytics 4)",
    "Analítica",
    "Mantiene el estado de la sesión de medición.",
    "2 años",
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
        <h1 className="text-3xl font-black">Política de cookies y analítica (Google Analytics)</h1>
        <p className="text-sm text-muted-foreground">
          Última actualización: 5 de noviembre de 2026 · Versión 1.0
        </p>
      </header>

      <S t="1. Responsable">
        <p>
          El responsable del tratamiento es BJSIGAPP (en adelante, “la Empresa”). Para consultas o
          ejercer tus derechos escríbenos por los canales indicados en la página de contacto.
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
          Este tratamiento se rige por la Ley N.º 19.628 y su reforma por la Ley N.º 21.719 sobre
          Protección de Datos Personales, la Ley N.º 21.663 Marco de Ciberseguridad y, cuando
          aplique a visitantes del Espacio Económico Europeo, el Reglamento (UE) 2016/679 (RGPD) y
          la Directiva 2002/58/CE (ePrivacy).
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <b>Cookies necesarias:</b> interés legítimo y ejecución del servicio; no requieren
            consentimiento.
          </li>
          <li>
            <b>Cookies funcionales y analíticas:</b> consentimiento libre, específico, informado e
            inequívoco, otorgado mediante el banner. Nunca se activan por defecto.
          </li>
        </ul>
      </S>

      <S t="4. Google Analytics 4">
        <p>
          Con tu consentimiento usamos Google Analytics 4, servicio de Google LLC / Google Ireland
          Ltd., para conocer de forma agregada cuántas personas visitan el sitio, qué páginas
          consultan y cómo llegan a él.
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <b>Modo de consentimiento (Consent Mode v2):</b> por defecto{" "}
            <code>analytics_storage</code>, <code>ad_storage</code>, <code>ad_user_data</code> y{" "}
            <code>ad_personalization</code> quedan en “denegado”. Solo{" "}
            <code>analytics_storage</code> pasa a “concedido” si aceptas las analíticas.
          </li>
          <li>
            <b>Minimización:</b> GA4 no registra ni almacena direcciones IP completas. Desactivamos
            señales de Google, personalización de anuncios y el intercambio de datos con otros
            productos de Google.
          </li>
          <li>
            <b>Sin datos sensibles:</b> no enviamos a Google nombres, RUT, correos, ubicación GPS,
            datos de salud ni información de los portales privados de trabajadores o administración.
          </li>
          <li>
            <b>Retención:</b> los datos de eventos se conservan como máximo 14 meses.
          </li>
          <li>
            <b>Transferencia internacional:</b> los datos pueden tratarse en servidores de Google
            fuera de Chile, amparados en las cláusulas contractuales tipo y el Anexo de Tratamiento
            de Datos de Google.
          </li>
          <li>
            No usamos Google Analytics para publicidad, elaboración de perfiles ni decisiones
            automatizadas sobre personas.
          </li>
        </ul>
        <p>
          Más información:{" "}
          <a
            className="text-primary underline"
            href="https://policies.google.com/privacy"
            target="_blank"
            rel="noreferrer"
          >
            Política de privacidad de Google
          </a>{" "}
          y{" "}
          <a
            className="text-primary underline"
            href="https://tools.google.com/dlpage/gaoptout"
            target="_blank"
            rel="noreferrer"
          >
            complemento de inhabilitación de Google Analytics
          </a>
          .
        </p>
      </S>

      <S t="5. Cookies que utilizamos">
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted text-foreground">
              <tr>
                {["Nombre", "Proveedor", "Tipo", "Finalidad", "Duración"].map((h) => (
                  <th key={h} className="p-2">
                    {h}
                  </th>
                ))}
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

      <S t="6. Cómo aceptar, rechazar o retirar tu consentimiento">
        <p>
          Rechazar es tan fácil como aceptar: el banner ofrece “Solo necesarias”. Puedes cambiar tu
          decisión cuando quieras; al retirar el consentimiento, dejamos de medir y se eliminan las
          cookies analíticas de este dominio. Tu elección se vuelve a solicitar cada 12 meses o si
          cambia esta política.
        </p>
        <button
          onClick={() => openCookieSettings()}
          className="rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground"
        >
          Configurar cookies
        </button>
        <p>
          También puedes bloquear o borrar cookies desde la configuración de tu navegador; algunas
          funciones podrían dejar de operar.
        </p>
      </S>

      <S t="7. Tus derechos">
        <p>
          Puedes ejercer tus derechos de acceso, rectificación, supresión, oposición, portabilidad y
          bloqueo (Ley 21.719). Responderemos dentro de los plazos legales. Si no quedas conforme,
          puedes reclamar ante la Agencia de Protección de Datos Personales.
        </p>
      </S>

      <S t="8. Seguridad">
        <p>
          Aplicamos cifrado en tránsito (HTTPS/TLS), control de accesos por roles, autenticación
          multifactor en paneles administrativos y registros de auditoría, conforme a los principios
          de seguridad desde el diseño de la Ley 21.663.
        </p>
      </S>

      <S t="9. Cambios">
        <p>
          Podemos actualizar esta política. Publicaremos la nueva versión con su fecha y, si el
          cambio es relevante, volveremos a pedir tu consentimiento.
        </p>
      </S>
    </main>
  );
}
