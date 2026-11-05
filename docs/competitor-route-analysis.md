# Benchmark de rutas públicas de Talana, Buk y GeoVictoria

**Consulta:** 5 de noviembre de 2026. Se analizaron páginas públicas oficiales de producto y navegación; esto compara estructura, no métricas privadas de tráfico ni posiciones en Google.

## Patrones observados

- **Talana:** agrupa funciones en páginas de solución con URL descriptiva a nivel superior, por ejemplo `/software-gestion-administrativa-rrhh`. La categoría explica el problema y enlaza a páginas independientes para remuneraciones, asistencia, firma digital, gestión de personas y canal de requerimientos. También conecta con integraciones y repite el CTA de cotización.
- **Buk:** usa un directorio jerárquico, por ejemplo `/productos/administracion/`, y conserva esa categoría en las rutas de producto —como `/productos/administracion/control-de-asistencia` y `/productos/administracion/onboarding`. La página de categoría funciona como catálogo con tarjetas “Conoce más” y secciones de profundización y CTA.
- **GeoVictoria:** localiza explícitamente la arquitectura por país e idioma con `/es-cl/`; agrupa productos bajo `/es-cl/servicios/{producto}/` y sectores bajo `/es-cl/industrias/{sector}/`. Las páginas de servicio explican la solución, enlazan industrias/servicios relacionados, responden preguntas frecuentes y mantienen CTAs de demo o cotización.

Estos sitios no dependen de una sola landing general: la página índice ayuda a descubrir la oferta y las páginas de detalle apuntan a una intención concreta. Los patrones observados son ejemplos, no una recomendación de copiar sus nombres o textos.

## Recomendación para BJSIGAPP

1. Publicar `/modulos` como directorio SSR, con un H1 que identifique BJSIGAPP como plataforma de gestión empresarial multisucursal y grupos claros para personas/RR. HH., asistencia y turnos, prevención, EPP, capacitación, documentos y operación multisucursal.
2. Mantener cada página de módulo como URL descriptiva independiente **solo cuando exista una ruta real y contenido útil propio**. La página índice debe enlazarlas; cada detalle debe enlazar de vuelta al índice, a capacidades relacionadas y a solicitar una demostración. Evitar crear páginas vacías o duplicar la misma descripción con otro slug.
3. Diferenciar títulos, descripciones, H1 y preguntas por intención de búsqueda. Reforzar enlaces desde la navegación pública, páginas de solución y footer; mantener portales de clientes fuera del sitemap y con `noindex`.
4. Incluir en sitemap únicamente rutas públicas que respondan correctamente y tengan contenido indexable; configurar el origen HTTPS real para canonical/sitemap antes de producción. La estructura facilita rastreo y relevancia temática, pero no garantiza una posición específica: influyen también autoridad, enlaces, rendimiento, competencia, demanda y calidad editorial.
5. Usar afirmaciones funcionales y legales solo si el producto y la documentación las respaldan. No replicar claims, marcas, textos, testimonios o recursos visuales de competidores.

## Estado verificado en este checkout

El índice se implementa como la ruta exacta `/modulos`, no como un catch-all ni como padre que reclame rutas más profundas. Se deja intacto `src/routes/$.tsx` y no se crean rutas de detalle ficticias. Así, cualquier subruta `/modulos/{slug}` atendida por los handlers existentes conserva su resolución; sólo se agregan rutas detalle al sitemap cuando su URL real y contenido propio estén verificados.

## Fuentes oficiales consultadas

- Talana, página principal: <https://web.talana.com/>
- Talana, solución de gestión administrativa: <https://web.talana.com/software-gestion-administrativa-rrhh>
- Buk, productos: <https://www.buk.cl/productos/administracion/>
- GeoVictoria Chile, sitio regional: <https://www.geovictoria.com/es-cl/>
- GeoVictoria, control de asistencia: <https://www.geovictoria.com/es-cl/servicios/control-de-asistencia/>
