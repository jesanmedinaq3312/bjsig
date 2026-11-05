# SEO público de BJSIGAPP

La portada y el catálogo se sirven con HTML SSR y metadatos propios. El catálogo `/modulos` enlaza fichas específicas en `/modulos/{slug}` para las capacidades de BJSIGAPP. Las antiguas URLs comerciales permanecen como redirecciones 308 a las páginas vigentes; no se incluyen en el sitemap. Los portales privados se marcan `noindex,nofollow` y se excluyen de `robots.txt`.

La portada utiliza el H1 «Software multiempresa de RR. HH. y operaciones» y explica en los headings y el texto de apoyo que BJSIGAPP es una plataforma SaaS configurable por empresa. El catálogo tiene exploración interactiva por necesidad, respuestas desplegables a dudas frecuentes y enlaces HTML rastreables a las fichas de producto.

La landing usa DM Sans autoalojada en `public/fonts`, con licencia OFL incluida. Los encabezados públicos emplean pesos ligeros y la demo interactiva conserva una carcasa estable de laptop entre recargas. La vista SaaS privada no cambia su tipografía.

`/modulos` es un índice independiente y cada ficha bajo `/modulos/{slug}` tiene contenido y metadatos propios. El catálogo y las fichas son las únicas páginas de producto que el sitemap publica; el catch-all conserva su función para los portales privados.

## Dominio público requerido

Antes de publicar, configura `VITE_PUBLIC_SITE_URL` como el origen HTTPS real del sitio, sin ruta, credenciales, query ni fragmento; por ejemplo, el dominio real asignado al producto. No uses el enlace efímero de Preview, el dominio de GitHub ni un valor de ejemplo.

Cuando ese valor está presente, cada página indexable incluye canonical, `og:url` y la URL absoluta del icono social; además, el HTML permite indexación y `/sitemap.xml` publica las páginas comerciales. `/robots.txt` anuncia ese sitemap. Si el dominio no está configurado, las páginas quedan `noindex,follow`, los canonical y las URLs sociales absolutas se omiten y el sitemap responde 503 de forma intencional, para no indexar Preview ni publicar un origen inventado.

`public/manus-routes.json` describe páginas de sitio para Preview; no incluye endpoints de sistema como `robots.txt` o `sitemap.xml`.
