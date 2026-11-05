# SEO público de BJSIGAPP

Las páginas comerciales se sirven con HTML inicial renderizado por servidor y metadatos específicos por ruta. Las páginas indexables son `/`, `/gestion-multisucursal`, `/software-de-gestion-empresarial`, `/gestion-de-personas-y-turnos`, `/seguridad-y-cumplimiento` y `/contacto`. Las rutas de acceso y portales siguen bajo el fallback de la aplicación y se marcan `noindex,nofollow`.

## Dominio público requerido

Antes de publicar, configura `VITE_PUBLIC_SITE_URL` como el origen HTTPS real del sitio, sin ruta, credenciales, query ni fragmento; por ejemplo, el dominio real asignado al producto. No uses el enlace efímero de Preview, el dominio de GitHub ni un valor de ejemplo.

Cuando ese valor está presente, cada página indexable incluye canonical, `og:url` y la URL absoluta del icono social. `/sitemap.xml` publica las páginas indexables y `/robots.txt` anuncia ese sitemap. Si el dominio no está configurado, los canonical y las URLs sociales absolutas se omiten y el sitemap responde 503 de forma intencional, para evitar publicar un origen inventado.

`public/manus-routes.json` describe páginas de sitio para Preview; no incluye endpoints de sistema como `robots.txt` o `sitemap.xml`.
