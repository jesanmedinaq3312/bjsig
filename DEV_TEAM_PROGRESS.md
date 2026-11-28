# Seguimiento breve — panel Dev Team

Este tablero complementa [`ROADMAP.md`](ROADMAP.md), que es la fuente de verdad para el estado del producto y las brechas regulatorias. No reemplaza el staging ni prueba despliegues.

## Iteración 1 — cuentas de plataforma

- [x] Corregida la autorización para que `developer` no administre otros developers/superadmins.
- [x] Corregida la concesión de roles: sólo `superadmin` puede conceder `developer` o `superadmin`.
- [x] Añadidas pruebas unitarias de allow/deny y scope tenant vacío en `supabase/functions/_shared/authz_test.ts`.
- [ ] Ejecutar pruebas Deno/CI y validar efectos Auth + tablas de autorización en staging sintético.
- **Estado:** en progreso; no cerrado hasta contar con evidencia ejecutable y staging.

## Iteración 2 — RPC/RLS de asistencia

- [x] Confirmado que las migraciones base de asistencia ya estaban aplicadas en el único proyecto `BJSIG`.
- [x] Aplicada `attendance_summary_authorization` (registrada remotamente como `20261117171959`).
- [x] Añadida autorización interna: sesión, tenant solicitado, asignación de developer, rol/permisos efectivos y RUT propio para `worker`.
- [x] Separado el cálculo en `private.attendance_summary_unchecked`; el helper y el cálculo no tienen `EXECUTE` para roles cliente.
- [x] Verificados privilegios: `attendance_summary` sólo puede ejecutarla `authenticated`; `anon` no tiene acceso.
- [ ] Ejecutar smoke tests positivos/negativos con identidades sintéticas y dos tenants; no existe staging separado disponible.
- **Estado:** aplicada y verificada por catálogo; abierta hasta completar validación runtime multi-tenant.

## Proyección y cobranza

- [x] La interfaz calcula y muestra métricas de cartera, próximos cobros y proyección base a 90 días a partir de datos de la aplicación.
- [ ] Validar cálculos con cartera real autorizada, casos borde, errores de permisos y conciliación; no cargar cifras de ejemplo como métricas reales.
- [ ] Integrar un proveedor DTE/SII y automatizaciones de cobranza sólo después de definir proveedor, credenciales server-side y procesos aprobados.

## Landing pública configurable

- [x] El panel contiene edición visual/branding de landing y el código versiona lectura/escritura de su configuración.
- [ ] Confirmar/aplicar la migración `20261109044500_public_landing_settings.sql` en staging y probar persistencia/publicación y permisos de lectura/escritura.
- [ ] Verificar preview público, accesibilidad y comportamiento responsive tras el despliegue; los datos de demostración deben seguir identificados como ilustrativos.

## Iteración 3 — hero público configurable

- [x] Agregado `hero_link_url` al JSON global de landing con validación server-side: HTTPS, ruta interna o ancla local; se rechazan `javascript:`, `data:` y enlaces externos no HTTPS.
- [x] El fondo del hero se renderiza como enlace accesible detrás del H1 y no intercepta los botones ni la navegación.
- [x] El panel Dev Team permite editar el enlace junto con la imagen principal y conserva la vista previa del hero.
- [x] Agregadas pruebas unitarias de sanitización y un smoke E2E responsive para 390, 768 y 1440 px.
- [x] Aplicada en `BJSIG` la migración `public_landing_hero_link`, registrada remotamente como `20261117172816`.
- [x] Verificados privilegios remotos: escritura sólo para `authenticated` (`anon=false`), lectura pública preservada (`anon=true`).
- [x] Corregido el formato Prettier de `supabase/functions/_shared/authz_test.ts`, que bloqueaba el job `checks` de CI.
- [x] Verificados typecheck, lint, Vitest (68), build, auditoría Bun y pruebas Deno (18).
- [x] Corregido `public/robots.txt` estático para conservar los bloqueos de rutas privadas y administrativas.
- [x] Actualizado el E2E de consentimiento y captura GPS; la suite pública completa pasa en móvil, tablet y desktop (42/42).
- **Estado:** implementación, migración, corrección CI y regresiones E2E completadas; permanece pendiente únicamente la validación en staging separado.

## Iteración 4 — autorización Dev Team, evidencia remota y pruebas multi-tenant

- [x] Resuelto “Dev Team-only”: Dev Team administra/configura/previsualiza el portal; el worker conserva sólo autoservicio propio por tenant y RUT.
- [x] Comparado el catálogo remoto y las fuentes recuperadas de `worker-auth`, `worker-gdpr`, `harassment-report-submit` y `honeytoken-check`, sin leer datos de negocio; evidencia en [`docs/ITERATION5_REMOTE_CATALOG_INVENTORY.md`](docs/ITERATION5_REMOTE_CATALOG_INVENTORY.md).
- [x] Creada la matriz actor × ruta × operación × tenant para dos tenants sintéticos en [`docs/ITERATION4_AUTHORIZATION_MATRIX.md`](docs/ITERATION4_AUTHORIZATION_MATRIX.md), con casos T01–T16.
- [x] Preparada localmente la migración `20261119010000_iteration4_worker_portal_rls_rpc.sql` con RPC `authorize_worker_portal` y políticas RLS restrictivas; no aplicada en Supabase.
- [x] Preparada localmente la migración `20261127210000_iteration4_shift_assignment_worker_read.sql`: una policy RLS restrictiva limita las lecturas del rol `worker` a su RUT normalizado dentro del tenant actual; no aplicada en Supabase.
- [x] El preview del portal recibe `isPreview` explícito y deshabilita nuevas solicitudes, envío de denuncias y confirmación de comunicaciones; incluye guards de handlers y regresiones para email vacío.
- [x] Verificación local del avance: `tsc --noEmit`, `eslint .`, Vitest (**25 archivos / 82 tests**), Prettier en TS/TSX editados, `vite build` y `bun audit --production` (**523 paquetes, sin vulnerabilidades en este checkout**).
- [ ] Preparar smoke tests RLS/RPC negativos y positivos para tenant, RUT, MFA, cambio de tenant y rate limits en un entorno aislado.
- [ ] Dejar CI reproducible y E2E autenticado separado de secretos QA, con cleanup por IDs sintéticos.
- [ ] Presentar cualquier SQL o despliegue Edge con diff exacto, impacto, verificación y rollback antes de solicitar aprobación.
- **Estado:** abierta; remediaciones locales y verificación estática/componente avanzadas. La policy nueva y los cambios UI no se han desplegado; no hay staging confirmado ni pruebas runtime RLS/RPC.

### Checks de PR abiertos — revisión 27 de noviembre de 2026

- [ ] **PR #4:** `bun audit --production` detecta **GHSA-fc5q-39xc-vjpf** en `picomatch` (`<=4.0.7`) transitivo por Vite/Vitest/TanStack. El audit del checkout local actual pasa; regenerar/actualizar el lockfile de la rama del PR contra la base vigente y volver a ejecutar CI.
- [ ] **PR #5:** falla el typecheck en `DataGovernancePanel` (parámetro implícito `any`), el calendario (`ClassNames.table`), los tipos de Recharts (`payload`/`label`) y la API TanStack Server Function (`inputValidator`). Aislar incompatibilidades de dependencias y adaptar tipos antes de integrar.
- [ ] **PR #6:** ESLint aborta con TypeScript `7.0.2` porque `typescript-eslint 8.74.0` declara no soportar TS 7.0. Mantener TS en una versión admitida o posponer el major bump hasta compatibilidad del parser.
- [ ] **PR #1:** el check principal previo pasó, pero la rama figuraba behind/estado de base incierto; los jobs autenticados/E2E y catálogo RLS omitidos no cuentan como aprobados.

Los cambios están preparados en la rama `fix/iteration4-preview-shift-read-boundary`; no se ha publicado la rama ni se ha aplicado la migración en Supabase. La rama `main` exige revisión por PR.

## Iteración 5 — planificada: staging y despliegue controlado

- [ ] Habilitar un entorno aislado o base descartable con restauración comprobada, secretos QA separados y fixtures sintéticos.
- [ ] Reconciliar catálogo remoto, esquema local y versiones de Edge Functions sin leer datos de negocio.
- [ ] Ejecutar T01–T16 con dos tenants, verificar RLS/RPC, MFA, rate limits, cambio de tenant y cleanup.
- [ ] Aplicar y revertir la migración de Iteración 4 sólo en staging, con evidencia de catálogo, logs y regresiones.
- [ ] Separar E2E autenticado del CI público y publicar reporte por commit.
- **Estado:** planificada; no inicia hasta que Iteración 4 tenga inventario, pruebas aisladas y plan de despliegue aprobado.

## Validación y operación

- [x] TypeScript, Vitest (**44**), pruebas Deno de `worker-auth` (**17**), ESLint y build se ejecutan localmente; ESLint conserva una advertencia Fast Refresh no bloqueante.
- [x] Añadido job `public-e2e` a CI con URL Supabase local ficticia; ejecución local Playwright pública: **42/42 aprobadas** (28-11-2026), sin credenciales ni acceso al proyecto Supabase.
- [ ] Ejecutar E2E autenticado con cuentas sintéticas y staging aislado; documentar errores de servicios externos sin usar credenciales reales.
- [ ] Mantener decisiones pendientes de despliegue, migraciones y seguridad en [`SECURITY_DEPLOYMENT_CHECKLIST.md`](SECURITY_DEPLOYMENT_CHECKLIST.md).

## Portal de trabajador

- [x] Turnstile/CAPTCHA retirado del código local; el signup público permanece deshabilitado.
- [ ] Confirmar el ajuste de CAPTCHA en el dashboard, comparar y revisar la versión remota de `worker-auth`, y completar login con un worker sintético antes de habilitar el portal.
- [x] En la rama local `feat/attendance-rectification-worker-flow`, el portal consulta propuestas append-only por tenant y RUT, permite registrar aceptación/rechazo mediante la RPC existente y añade las propuestas a la exportación personal; los campos consultados se limitan a lo necesario para presentarlas y responderlas.
- [ ] El flujo implementado es propuesta administrativa → respuesta del trabajador; falta el flujo objetivo del roadmap (solicitud del trabajador → revisión/consentimiento del supervisor), además de validar la tabla/RPC con identidades sintéticas en staging.
- **Estado de esta rama:** cambios locales, aún no fusionados ni desplegados; typecheck, lint, Vitest (81), build, auditorías Bun y E2E público (42) pasaron; pruebas Deno no ejecutadas localmente porque Deno no está instalado.
