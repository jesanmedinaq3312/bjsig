# SEO público de BJSIGAPP

Las páginas comerciales se sirven con HTML inicial renderizado por servidor y metadatos específicos por ruta. Las páginas indexables son `/`, `/modulos`, `/gestion-multisucursal`, `/software-de-gestion-empresarial`, `/gestion-de-personas-y-turnos`, `/seguridad-y-cumplimiento` y `/contacto`. Las rutas de acceso y portales siguen bajo el fallback de la aplicación y se marcan `noindex,nofollow`.

La portada utiliza el H1 «Software multiempresa de RR. HH. y operaciones» y el H2 «Administra personas y operaciones desde una plataforma SaaS». La bajada concreta asistencia, turnos, prevención, documentos, procesos internos, módulos, permisos e identidad por empresa. La meta description mantiene esos términos dentro del límite de 160 caracteres.

Las páginas comerciales usan DM Sans Variable autoalojada en `public/fonts`, con licencia OFL incluida. Los H1/H2 usan peso 500, el cuerpo conserva un peso regular y la vista SaaS privada no cambia su tipografía.

`/modulos` es un índice de capacidades, enlaza las páginas de solución y conserva una URL exacta independiente. No reemplaza el catch-all ni crea rutas detalle ficticias; las páginas bajo `/modulos/{slug}` deben mantener sus handlers actuales y sólo añadirse al sitemap cuando tengan URL real y contenido propio indexable.

## Dominio público requerido

Antes de publicar, configura `VITE_PUBLIC_SITE_URL` como el origen HTTPS real del sitio, sin ruta, credenciales, query ni fragmento; por ejemplo, el dominio real asignado al producto. No uses el enlace efímero de Preview, el dominio de GitHub ni un valor de ejemplo.

Cuando ese valor está presente, cada página indexable incluye canonical, `og:url` y la URL absoluta del icono social; además, el HTML permite indexación y `/sitemap.xml` publica las páginas comerciales. `/robots.txt` anuncia ese sitemap. Si el dominio no está configurado, las páginas quedan `noindex,follow`, los canonical y las URLs sociales absolutas se omiten y el sitemap responde 503 de forma intencional, para no indexar Preview ni publicar un origen inventado.

`public/manus-routes.json` describe páginas de sitio para Preview; no incluye endpoints de sistema como `robots.txt` o `sitemap.xml`.
