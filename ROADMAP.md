# Roadmap y cierre de brechas — BJSIGAPP

## Ajustes de pantalla y compresión — noviembre 2026

- [x] Fotos WebP con variantes pequeñas y grandes.
- [x] Aviso compacto sin superposición sobre el contenido móvil.
- [x] Vista demostrativa sin recortes en 320 px y barra superior en una línea a 1024 px.
- [x] Repetir verificaciones finales: ocho tamaños, fotos, controles, 79 pruebas y lint.
- [x] Subir los ajustes a GitHub main.

**Actualizado:** 21 de noviembre de 2026. **Ámbito:** código local, migraciones versionadas y verificaciones de catálogo del único proyecto Supabase disponible (`BJSIG`); no constituye una auditoría legal ni una validación completa con identidades sintéticas.

## Iteración activa — 4. Autorización Dev Team, evidencia remota y pruebas multi-tenant

**Estado:** iniciada. No se aplicarán migraciones ni cambios de acceso en `BJSIG` durante la fase de definición. No existe un proyecto staging separado; toda prueba autenticada deberá usar identidades y datos sintéticos en un entorno aislado antes de considerarse evidencia. **Presupuesto operativo:** 300 tokens.

### Iteración 4 — objetivos y puertas de salida

**Objetivo:** convertir la regla de acceso del portal trabajador en un contrato verificable, reconciliar el código local con las funciones/esquema remotos y preparar pruebas negativas/positivas de aislamiento tenant sin tocar datos de negocio.

- [x] **Contrato de producto:** resolver “Dev Team-only” como administración, configuración, soporte y previsualización cruzada exclusiva del Dev Team; el worker conserva sólo su portal/RUT propio dentro del tenant activo. Documentado en [`docs/authorization-contract.md`](docs/authorization-contract.md).
- [x] **Inventario remoto:** obtener sólo catálogo de funciones, versiones, grants, tablas, columnas `tenant_id` y políticas RLS; comparar `worker-auth`, `worker-gdpr`, `harassment-report-submit` y `honeytoken-check` con las fuentes locales y registrar diferencias en [`docs/ITERATION5_REMOTE_CATALOG_INVENTORY.md`](docs/ITERATION5_REMOTE_CATALOG_INVENTORY.md). La migración de Iteración 4 no aparece aplicada y las funciones remotas permanecen sin cambios.
- [x] **Matriz de autorización:** documentar actores, rutas, operaciones, límites tenant/RUT y casos T01–T16 para dos tenants sintéticos en [`docs/ITERATION4_AUTHORIZATION_MATRIX.md`](docs/ITERATION4_AUTHORIZATION_MATRIX.md).
- [x] **Implementación local:** preparar `worker_portal_access_allowed`, `authorize_worker_portal` y políticas RLS restrictivas para solicitudes, QR y reportes/rectificaciones de asistencia.
- [ ] **Pruebas aisladas:** preparar fixtures y smoke tests positivos/negativos para `attendance_summary`, RLS, cambio de tenant, RUT propio, MFA y rate limits; nunca usar `service_role` para probar RLS ni apuntar a producción.
- [ ] **Barrera CI:** mantener el workflow reproducible de typecheck, lint, unitarios, build y pruebas de autorización; separar E2E autenticado de los secretos QA y documentar cleanup por IDs sintéticos. El job público `public-e2e` ya quedó separado y ejecutó 42/42 pruebas localmente el 28 de noviembre de 2026 con endpoints ficticios; falta validar el workflow GitHub y terminar las pruebas autenticadas/fixtures aislados.
- [ ] **Decisión de despliegue:** sólo después de completar el inventario, la matriz y las pruebas mostrar el SQL/Edge diff exacto, impacto, verificación y rollback para aprobación explícita. No desplegar por el mero hecho de cerrar esta iteración.

**Criterio de cierre:** contrato de producto aprobado, inventario local/remoto con diferencias explicadas, matriz de acceso revisada, pruebas aisladas reproducibles y plan de despliegue/rollback presentado. La iteración no se marcará cerrada por tener sólo cambios de frontend o por una lectura superficial del catálogo.

## Iteración 5 — planificada: staging, validación runtime y despliegue controlado

**Estado:** planificada, no activa. Depende del cierre verificable de Iteración 4. Su propósito será convertir el hardening local en evidencia runtime reproducible, primero en un entorno aislado y sólo después mediante un despliegue controlado. El detalle está en [`docs/ITERATION5_PLAN.md`](docs/ITERATION5_PLAN.md).

- [ ] Disponer de staging/base descartable, restauración comprobada, secretos QA separados y datos sintéticos.
- [ ] Obtener dump sólo de esquema y reconciliar funciones, grants, tablas, columnas `tenant_id`, índices, políticas RLS y versiones Edge.
- [ ] Crear fixtures idempotentes para `TENANT_A`/`TENANT_B`, roles Dev Team, roles tenant y workers A1/B1, con cleanup por IDs.
- [ ] Ejecutar T01–T16 de la matriz, incluyendo `attendance_summary`, `authorize_worker_portal`, cambio de tenant, RUT ajeno, MFA y rate limits.
- [ ] Aplicar la migración RLS/RPC de Iteración 4 sólo en staging; verificar catálogo posterior, regresiones, logs y rendimiento básico.
- [ ] Probar rollback/restauración y documentar evidencia sin datos reales.
- [ ] Separar E2E autenticado del CI público y publicar un reporte de autorización por commit.

**Puerta de salida:** resultados esperados positivos/negativos, RLS probado con sesiones reales de prueba (no `service_role`), aplicación y rollback reproducibles, Edge Functions reconciliadas y checklist de producción presentado. Staging verde no equivale a aprobación de producción.

### Iteración 1 — cuentas de plataforma

**Estado:** corrección local implementada; la ejecución de Deno/CI y los efectos Auth/allowlist/memberships con identidades sintéticas siguen pendientes.

- [x] Verificar el estado de `main`, historial reciente y consumidores de `canManageAccount`/`canGrantTenantRole`.
- [x] Impedir que un `developer` administre cuentas de plataforma o conceda roles `developer`/`superadmin`.
- [x] Rechazar scopes tenant vacíos y conservar la administración de tenants asignados.
- [x] Añadir pruebas unitarias para developer, superadmin, elevación de privilegios y scope vacío.
- [x] Eliminar la revalidación duplicada basada en `tenantIds.every(...)` durante el borrado; la decisión centralizada es la única puerta.
- [ ] Ejecutar las pruebas nuevas de Deno y las comprobaciones CI; el checkout actual no tiene Deno ni dependencias Node instaladas.
- [ ] Probar los efectos Auth/`allowed_emails`/`tenant_memberships` con identidades sintéticas; no hay staging separado disponible.

### Iteración 2 — evidencia y criterios

- [x] Confirmar que `attendance_integrity_remediation` y `server_attendance_authorization` ya estaban aplicadas; no se reaplicó historial remoto.
- [x] Aplicar `20261117171959 / attendance_summary_authorization` en el único proyecto `BJSIG`.
- [x] Mover el cálculo a `private.attendance_summary_unchecked`, sin ejecución para `anon`/`authenticated`.
- [x] Proteger el wrapper público con sesión, tenant activo/asignado, rol efectivo, permisos efectivos y RUT propio para `worker`.
- [x] Verificar remotamente `SECURITY DEFINER`, privilegios y `EXECUTE` sólo para `authenticated`.
- [x] Verificar `git diff --check` y la estructura de la migración local.
- [ ] Ejecutar pruebas runtime negativas/positivas con worker, roles tenant, developer asignado, superadmin y dos tenants sintéticos.

**Evidencia de Iteración 2:** migración registrada remotamente como `20261117171959`; `attendance_summary` tiene `authenticated_execute=true` y `anon_execute=false`; helper privado y autorización no tienen ejecución para roles cliente. La validación de datos/RLS con identidades reales no se declara cerrada por ausencia de staging separado.

### Iteración 3 — hero público configurable

**Estado:** completada en código y aplicada/verificada por catálogo en `BJSIG`; la definición versionada local es `20261117183000_public_landing_hero_link.sql` y Supabase la registró mediante la aplicación directa como `20261117172816 / public_landing_hero_link`. La suite E2E pública completa pasa en los tres viewports.

- [x] Agregar `hero_link_url` al contrato seguro de `visual_assets`, aceptando sólo HTTPS, rutas internas o anclas locales.
- [x] Mostrar el fondo del hero como enlace accesible detrás del H1, sin bloquear botones, navegación ni lectura del contenido.
- [x] Exponer el enlace en el editor de Landing principal del panel Dev Team y conservar la previsualización responsive.
- [x] Añadir regresión de sanitización y smoke E2E para 390, 768 y 1440 px, incluyendo ausencia de overflow horizontal.
- [x] Aplicar `public_landing_hero_link` en `BJSIG`; la RPC de escritura conserva `SECURITY DEFINER`, `anon_execute=false` y `authenticated_execute=true`.
- [x] Ejecutar typecheck, ESLint, Vitest (68), build, auditoría Bun y pruebas Deno (18) después de instalar las dependencias y runtimes.
- [x] Ejecutar E2E aislado del hero en 390, 768 y 1440 px: 3/3 pasan.
- [x] Corregir robots.txt estático y actualizar el flujo E2E de consentimiento/captura GPS; suite pública completa: 42/42 pasan.

**Evidencia de Iteración 3:** `update_public_landing_settings(jsonb)` remoto valida `hero_link_url`; la RPC de lectura mantiene `anon_execute=true` y `authenticated_execute=true`; no se modificaron filas operativas. La suite runtime pública completa pasa en desktop, móvil y tablet (42/42).

> Se retiró el porcentaje global heredado de 78 %: no había una metodología vigente para calcularlo. Los estados anteriores por fase son registros históricos y no prueban por sí solos que una migración siga aplicada en Supabase.

## Estado comprobable de esta revisión

- **Código local:** el producto contiene módulos de SaaS, personas, portal de trabajador, turnos, asistencia QR, nómina, Ley Karin, incidentes/CPHS, Gobierno de Datos y registros de auditoría.
- **Validación local histórica:** TypeScript pasó; Vitest pasó con 44 pruebas y `worker-auth` con 17 pruebas Deno; build Vite/Nitro pasó; ESLint terminó sin errores y con una advertencia de Fast Refresh en `QrCardGenerator.tsx`. En Iteración 3 no se pudo repetir esta batería porque el checkout actual no tiene `node_modules`.
- **Supabase/hosting:** inspección read-only: `worker-auth` remoto observado en v49 no exige tokens Turnstile; `/auth/v1/settings` no mostró un indicador público de CAPTCHA. No se desplegó ni modificó el proyecto y el ajuste CAPTCHA del dashboard sigue sin confirmar. Una migración en el checkout no equivale a una migración aplicada.
- **Asistencia/GPS:** el código usa fecha laboral `America/Santiago`, instante UTC, captura GPS reciente al procesar QR y ya no ofrece sobrescritura en la interfaz. La migración append-only `20261109070000_qr_attendance_marks_immutable.sql` está versionada, pero su aplicación está pendiente de staging.
- **Portal de trabajador:** existe en el código y forma parte del flujo de producto. Por instrucción del cliente se retiró Turnstile/CAPTCHA de los fuentes locales; signup público continúa cerrado. La versión remota v49 no contiene la barrera Turnstile, pero difiere de la fuente local y no se desplegó. El CAPTCHA de Supabase Auth y el smoke test de ingreso con worker sintético siguen pendientes. No asumir que el portal sea “Dev Team-only”.

## Seguimiento de los requisitos adjuntos

| Área                           | Estado observado en el repositorio                                                                                                                                                                | Pendiente para cierre                                                                                                                                                                                                                                                                                 |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A. Asistencia electrónica**  | Hay marcación QR, coordenadas/precisión, fecha Chile e inmutabilidad preparada para `qr_scan_events`. La interfaz ya no permite sobrescribir directamente.                                        | Aplicar/testear migración en staging; construir regularización con consentimiento bilateral; comprobante inmediato por email; perfil de fiscalización de sólo lectura; reporte de jornada/horas extra firmado. No declarar validación legal de las marcas.                                            |
| **B. Nómina y remuneraciones** | Hay periodos, cálculo de liquidaciones y exportación Excel por periodo. `src/lib/siiExport.ts` exporta CSV de facturas/DTE, no el LRE oficial de remuneraciones.                                  | Crear/exportar el formato LRE oficial vigente y probarlo con Mi DT; tipificar haberes/descuentos; añadir evidencia verificable de entrega/recepción de liquidación.                                                                                                                                   |
| **C. Ley Karin**               | Existe canal y módulo de seguimiento, estados, fecha límite mostrada como 30 días, notas y notificación de resultado.                                                                             | Validar reglas y cómputo con asesoría; implementar plazo de 3 días hábiles y notificaciones/derivación; registrar medidas de resguardo; completar informe y envío formal; integrar anexo/protocolo aprobado. La UI actual no prueba cumplimiento del proceso.                                         |
| **D. Datos y ciberseguridad**  | Existe Gobierno de Datos e inventario de activos. La migración `20261109060000_privacy_processing_inventory.sql` y la línea base están en el repositorio.                                         | Aplicar/probar migración en staging; completar datos legales reales del responsable/DPO; DPA por cliente; flujo ARCO+ con recepción, responsable, SLA y evidencia; confirmar proveedores, transferencias, retención y borrado. Ninguno de estos documentos debe autocompletarse con datos inventados. |
| **E. Prevención y mutualidad** | Hay módulo de incidentes, exportación PDF prellenada DIAT/DIEP y registros de reuniones CPHS. El PDF de incidente es un prellenado, no se ha validado como formulario oficial de cada mutualidad. | Validar campos y formato con ACHS/Mutual/IST; completar trazabilidad DIAT/DIEP; verificar constitución, actas, reuniones y acuerdos CPHS, incluyendo reglas de aplicabilidad, con especialista.                                                                                                       |

## Prioridades de implementación

### P0 — Mantener estado veraz y evitar cambios de producción no verificados

1. Confirmar en Supabase Auth → Security/CAPTCHA que el challenge esté desactivado; comparar `worker-auth` v49 con el código local y desplegar sólo tras revisión. Completar el smoke test con identidad worker sintética, verificando rate limits, autenticación y alcance RLS.
2. Comparar el esquema/migraciones remotos con el checkout antes de aplicar cambios. Empezar con lectura/dump de esquema sin datos y registrar qué versión de cada migración está desplegada.
3. Desplegar/probar por separado `geolocation=(self)` en el hosting y la migración de inalterabilidad QR. Confirmar permisos de navegador, captura bajo acción, posiciones vencidas, cola offline, duplicados y comportamiento ante rechazo de GPS.
4. Validar si la política real del producto permite autoservicio de trabajador. La matriz de autorización debe preservar RLS y a la vez ser coherente con el portal de trabajador que ofrece BJSIGAPP.

### P1 — Completar la asistencia del adjunto

1. Diseñar la tabla/flujo de solicitudes de regularización append-only: solicitud del trabajador, evidencia/motivo, revisión y consentimiento del supervisor; conservar marca original y registrar resultado.
2. Enviar comprobante por cada entrada, salida y colación con fecha/hora Chile, tipo, ubicación/precisión reportada e IP si corresponde; definir proveedor, errores, reintentos, privacidad y trazabilidad.
3. Preparar vista de fiscalización sólo lectura y reporte semanal/mensual con confirmación del trabajador y desglose ordinario/extraordinario.
4. Validar reglas laborales con asesoría antes de usar la función como control oficial de jornada.

### P2 — Completar Ley Karin y remuneraciones

- Ley Karin: plazo de 3 días hábiles, medidas de resguardo, notificaciones, cálculo de plazos, informe final y registro de remisión/investigación; probar permisos, confidencialidad y auditoría.
- Nómina: modelar el archivo LRE por versión del formato oficial, agregar validaciones y tests con ejemplos sintéticos, documentar export/import y conciliación.
- Liquidaciones: acuse de entrega por persona, con fecha/hora, artefacto/versionado, estado de lectura/firma y trazabilidad de reintentos.

### P3 — Privacidad, incidentes y CPHS

- Completar inventario por tratamiento, rol responsable/encargado, finalidad, base, titulares, destinatarios/países, conservación y eliminación.
- Preparar DPA, canal y SLA ARCO+, protocolo de incidentes, medidas y evidencias de privacidad; revisión legal antes de publicarlos.
- Diferenciar claramente un PDF prellenado de DIAT/DIEP de un formulario oficial aceptado por una mutualidad.
- Verificar CPHS: constitución, actas mensuales, acuerdos, responsables, vencimientos y condiciones de aplicabilidad en normativa vigente.

### P4 — Pruebas y operación

- E2E con cuentas sintéticas: worker sólo propio registro, roles tenant, Dev Team con memberships, dos tenants, MFA, permisos negativos y cambio/logout de tenant.
- Staging aislado, seed sintético, restauración comprobada, rollback por migración y monitoreo de Edge/RLS.
- Pruebas de accesibilidad, teclado, lectores de pantalla y contraste.
- Confirmar hosting/CSP/Permissions-Policy, URL de Auth, secretos, correo y retención real antes de publicar.

## Hitos anteriores conservados como historia

Las fases previas registraron implementación en el código de: contrato de permisos y planes; Equipo Dev/memberships; turnos y su historial; branding; notificaciones y acuses; cartera y contratos SaaS; onboarding; Gobierno de Datos; reglas de IP y aislamiento de logs. Las entradas históricas sobre migraciones “aplicadas”, pruebas E2E, porcentajes o despliegues reflejan la evidencia de sus fechas; deben volver a comprobarse antes de tratarlas como estado remoto actual.

La Fase de autorización/seguridad sigue **en progreso**. Parte del hardening local ya existe (migraciones de alcance sensible, guardas de autenticación, minimización y documentos de privacidad), pero faltan reconciliación de esquema, pruebas reales multi-tenant, staging/restauración, despliegue y resolución de bloqueos de producto. El inventario de referencia [`docs/PHASE0_INVENTORY_20261101.md`](docs/PHASE0_INVENTORY_20261101.md) es una fotografía del 1 de noviembre y debe leerse como histórica cuando discrepe del código actual.

## Puertas para marcar un requisito como cerrado

Un requisito sólo se marcará **completado** cuando tenga: implementación en código, pruebas automáticas/negativas aplicables, migración y permisos probados en staging cuando corresponda, confirmación de despliegue, evidencia operativa y aprobación legal/cliente si afecta derechos laborales o datos personales. Una vista, plantilla o archivo exportable por sí solo no cumple esta puerta.

### Documentos de apoyo

- [`SECURITY_DEPLOYMENT_CHECKLIST.md`](SECURITY_DEPLOYMENT_CHECKLIST.md): operaciones pendientes de hosting/Supabase y cambios locales no aplicados.
- [`docs/PRIVACY_COMPLIANCE_BASELINE.md`](docs/PRIVACY_COMPLIANCE_BASELINE.md): línea base de privacidad y límites.
- [`docs/PHASE0_INVENTORY_20261101.md`](docs/PHASE0_INVENTORY_20261101.md): revisión histórica de sólo lectura.
- [`PRODUCT.md`](PRODUCT.md): propósito del producto y límites de comunicación pública.
