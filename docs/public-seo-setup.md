# Preparación SEO pública de BJSIGAPP

La página principal, el catálogo `/modulos` y las páginas `/modulos/{slug}` deben servirse con HTML inicial que contenga el contenido, el título y la descripción correspondientes. Las rutas públicas se declaran en `public/manus-routes.json`; el catálogo debe mantener un enlace visible hacia cada módulo.

## Dominio público

Antes de publicar en el dominio definitivo, configura `VITE_PUBLIC_SITE_URL` en el entorno de build con el origen HTTPS real, por ejemplo `https://sitio.ejemplo.cl`. No uses la URL temporal de Preview. La aplicación utiliza ese valor para emitir canonical y direcciones Open Graph absolutas. El build ejecuta `scripts/generate-sitemap.mjs`, que crea `public/sitemap.xml` únicamente cuando el origen HTTPS está configurado.

Sin esa variable, el sitio omite canonical y URLs sociales absolutas en vez de inventar un dominio; el build continúa sin generar un sitemap con direcciones incorrectas.

## Google Search Console

Cuando el dominio y el despliegue público estén definidos:

1. Verifica la propiedad del dominio en Google Search Console.
2. Comprueba que `/`, `/modulos` y varias rutas `/modulos/...` responden con su contenido y metadatos en el HTML inicial.
3. Confirma que `https://<dominio-real>/sitemap.xml` incluye `/`, `/modulos` y cada página pública de módulos, sin rutas de acceso privado.
4. Envía el sitemap desde Search Console y revisa la inspección de URL para las páginas prioritarias.

No se debe someter el host temporal de Preview como propiedad de producción. Una modificación del código no garantiza por sí sola indexación; Google decide el rastreo y la inclusión.
