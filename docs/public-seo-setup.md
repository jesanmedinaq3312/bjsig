# Preparación SEO pública de BJSIGAPP

La página principal, el catálogo `/modulos` y las páginas `/modulos/{slug}` deben servirse con HTML inicial que contenga el contenido, el título y la descripción correspondientes. Las rutas públicas se declaran en `public/manus-routes.json`; el catálogo enlaza a cada ficha de módulo. Los endpoints técnicos `/robots.txt` y `/sitemap.xml` son rutas SSR y no se agregan al manifiesto.

## Dominio público

Antes de publicar en el dominio definitivo, configura `VITE_PUBLIC_SITE_URL` en el entorno de build con el origen HTTPS real, por ejemplo `https://sitio.ejemplo.cl`. No uses la URL temporal de Preview. La aplicación utiliza ese valor para emitir canonical, directivas de indexación y direcciones Open Graph absolutas. `/sitemap.xml` genera el mapa en SSR desde la lista explícita de páginas públicas, incluida cada ficha de módulo; `/robots.txt` lo anuncia y excluye rutas privadas.

Sin esa variable, las páginas públicas responden con `noindex,follow`, omiten canonical y URLs sociales absolutas, y `/sitemap.xml` responde 503 para no inventar un dominio ni enviar URLs de Preview a buscadores.

## Google Search Console

Cuando el dominio y el despliegue público estén definidos:

1. Verifica la propiedad del dominio en Google Search Console.
2. Comprueba que `/`, `/modulos` y varias rutas `/modulos/...` responden con su contenido y metadatos en el HTML inicial.
3. Confirma que `https://<dominio-real>/robots.txt` anuncia el sitemap y bloquea los accesos privados.
4. Confirma que `https://<dominio-real>/sitemap.xml` incluye `/`, `/modulos` y cada página pública de módulos, sin rutas de acceso privado.
5. Envía el sitemap desde Search Console y revisa la inspección de URL para las páginas prioritarias.

No se debe someter el host temporal de Preview como propiedad de producción. Una modificación del código no garantiza por sí sola indexación; Google decide el rastreo y la inclusión.
