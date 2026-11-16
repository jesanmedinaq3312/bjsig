# Logs para desarrollo

Usar `logger` de `@/lib/logger` para diagnósticos de aplicación. No son los registros de auditoría del negocio y no se envían a la base de datos.

```ts
const log = logger.child("attendance.sync", { operation: "sync", requestId });
log.debug("Sync started");
log.warn("Sync delayed", { status: 429, retryAt });
log.error("Sync failed", error);
```

- Cada entrada incluye fecha ISO, nivel, entorno, ámbito, mensaje, contexto y detalles.
- En desarrollo, la consola recibe objetos inspeccionables; en producción, JSON en una línea y únicamente `warn` / `error`.
- Los objetos `Error` conservan nombre, mensaje, stack, causas y campos de diagnóstico como `status`, `code` y `retryAt`.
- Los datos se copian y limitan en profundidad, cantidad y longitud; ciclos y propiedades que fallan no interrumpen el diagnóstico.
- La sanitización oculta campos sensibles, tokens reconocibles y correos; elimina credenciales, consultas y fragmentos de URLs. Es una defensa adicional, no un detector universal de datos personales: nunca pasar formularios, sesiones, identificadores personales ni cuerpos completos de solicitudes. Usar mensajes constantes y metadatos técnicos mínimos.
- `child` agrega contexto sin modificar el logger original. Las llamadas existentes `logger.error(message, error)` siguen funcionando.
- Este cambio cubre el logger de aplicación y los errores de renderizado; no modifica logs internos de librerías ni el mecanismo global de captura SSR.

Verificación: `bunx vitest run src/lib/logger.test.ts`.
