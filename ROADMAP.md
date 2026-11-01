# Plan de evolución y cierre de brechas — BJSIGAPP

## Objetivo

Llevar BJSIGAPP desde una demo funcional en preview a una base SaaS robusta, escalable y mantenible, asegurando que los cambios del Dev Team se reflejen correctamente en cada empresa, que los datos permanezcan aislados por tenant y que los flujos críticos —planes, permisos, usuarios, turnos, branding, notificaciones y responsive— tengan pruebas repetibles.

## Estado del roadmap

**Avance global: 78% (estimación heredada del ciclo 2026-10-27; no recalculada en esta revisión).** Este porcentaje no incorpora los hallazgos críticos de seguridad y privacidad registrados al final del documento.

**Fases 1–6, 12 y 13 constan como implementadas en el registro del ciclo anterior; no fueron revalidadas contra el entorno remoto en esta actualización.** La Fase 7 sigue en progreso. La nueva Fase 14 está planificada, no implementada; sus conclusiones se basan en revisión local de solo lectura.

## Diagnóstico resumido actualizado

El roadmap previo registra módulos principales, build y fases funcionales completadas. La revisión local de seguridad encontró controles críticos por verificar o corregir, además de una discrepancia entre el requisito Dev Team-only del portal de trabajadores y el acceso `worker` descrito en el código y la documentación. El esquema y las políticas actualmente desplegados no se inspeccionaron; no se certifica aquí el estado remoto.

1. **Completado:** contrato único de permisos entre permisos de usuario, módulos de plan y datos históricos.
2. **Completado:** persistencia transaccional de planes y configuración efectiva.
3. **Parcialmente completado:** validación E2E pública y responsive, más acceso manual verificado como developer al panel DevTeam. Pendientes las sesiones automatizadas por rol y aislamiento multi-tenant.
4. **Completado:** gestión de Equipo Dev: provisión de cuenta, suspensión, auditoría y acceso a múltiples empresas.
5. **Completado:** integridad de turnos, asignaciones, historial, calendario y aislamiento entre empresas.
6. **Completado:** branding y Blobavatar en todos los puntos y estados de error.
7. **Completado:** notificaciones, prioridad, lectura, fecha/hora, contenido inmutable y aislamiento.
8. **Parcialmente completado:** pruebas responsive desktop/tablet/móvil, overflow horizontal, navegación móvil y foco en controles principales. Pendientes auditoría completa de contraste, teclado y lectores de pantalla.
9. Migraciones versionadas, seed de QA, staging, rollback y observabilidad.

## Fases de implementación

### Fase 1 — Contrato de autorización y permisos — **COMPLETADA**

Se implementó la matriz `rol × permiso × módulo × contexto` y se documentó la precedencia exacta:

> **RLS/RPC → tenant → rol → permiso → plan → override**

Se normalizaron las claves históricas a claves internas de ruta y se crearon los helpers compartidos `effectiveModuleEnabled`, `effectivePermission` y `normalizeModuleMap`. `Layout`, `TenantProvider`, `TenantGate` y `App` consumen el mismo resultado efectivo. Las acciones de plataforma permanecen protegidas por RPC/RLS.

Se agregó protección de membresías: un usuario empresarial no puede modificar su propio rol, permisos, tenant, estado activo, plan, overrides ni memberships de plataforma. Las escrituras de `tenant_settings` quedaron restringidas al rol de plataforma.

**Entregables completados:**

- `src/lib/authorization.ts`.
- `src/lib/roleAccess.ts` actualizado.
- `src/lib/tenant.ts` actualizado.
- `src/components/TenantProvider.tsx` actualizado.
- `src/components/Layout.tsx` actualizado.
- `src/components/TenantGate.tsx` integrado al cálculo efectivo.
- `src/App.tsx` actualizado.
- `docs/authorization-contract.md`.
- Migración SQL aplicada en Supabase.

### Fase 2 — Planes y vistas con persistencia transaccional — **COMPLETADA**

Se creó la RPC segura `apply_saas_plan(tenant_id, plan_id, reason)`. La RPC exige rol de plataforma, valida tenant activo y plan activo y actualiza `saas_tenant_subscriptions` y `tenant_settings` en una única transacción.

Los overrides manuales se **conservan** al cambiar de plan y se muestran claramente como **excepciones manuales**. La RPC devuelve la configuración efectiva resultante mediante `get_effective_tenant_access`, incluyendo plan, módulos base, overrides, permisos, vista inicial y límite de usuarios.

El panel SaaS dejó de depender de dos escrituras independientes y ahora muestra mensajes diferenciados para rol de plataforma, RLS/acceso, plan inexistente y persistencia. El contexto tenant consume la configuración efectiva mediante la RPC común.

**Entregables completados:**

- `public.get_effective_tenant_access(uuid)`.
- `public.apply_saas_plan(uuid, uuid, text)`.
- Trigger `protect_business_security_fields`.
- Políticas RLS revisadas para `tenant_settings`.
- Panel SaaS actualizado para cambio atómico de plan.
- Indicadores visuales de excepciones manuales.

### Fase 3 — Equipo Dev y memberships — **COMPLETADA**

Se implementó `upsert_platform_operator(email, permissions, tenant_ids, active)`, una RPC segura y atómica que exige rol de plataforma, impide modificar la propia cuenta de plataforma, valida tenants activos, mantiene memberships explícitas, aplica permisos por developer y registra auditoría tenant-scoped. La UI del panel SaaS ahora provisiona la identidad Auth mediante `admin-user-manage`, permite activar/suspender la cuenta, asignar múltiples empresas y seleccionar módulos.

La suspensión lógica sincroniza la cuenta Auth (`ban`/`unban`), `allowed_emails.active` y las memberships developer. Las asignaciones se reemplazan de forma controlada, y un developer sólo puede entrar a tenants con membership activa. El panel muestra estado, cantidad de empresas y cantidad de módulos autorizados.

**Entregables completados:**

- `public.upsert_platform_operator(text, jsonb, uuid[], boolean)`.
- `supabase/migrations/202609190002_platform_team_membership_management.sql`.
- Provisionamiento de identidad Auth para nuevos developers.
- Activación y suspensión sincronizadas.
- Memberships multi-tenant y permisos por operador.
- Auditoría `platform.membership.upsert`.
- Panel SaaS actualizado con estado Activo/Suspendido.

### Fase 4 — Turnos y asignaciones — **COMPLETADA**

Se versionó y aplicó `202609190003_shifts_assignments_integrity_and_rpc.sql`. Las definiciones y asignaciones tienen constraints para nombres, rango de fechas, duración, días de semana y tipos de historial. Las asignaciones ahora tienen FK tenant-consistente hacia su definición, una única asignación activa por trabajador y nuevos índices de calendario e historial.

Las mutaciones de asignar, reasignar e intercambiar usan `apply_shift_assignment`, que valida tenant, trabajador activo, definición activa, rol autorizado y fechas, actualizando la asignación y su historial en una transacción. `deactivate_shift_assignment` desactiva y registra el cambio atómicamente. El historial se mantiene como append-only mediante RLS: se permite lectura del tenant actual, pero no inserción/edición directa.

**Entregables completados:**

- `public.apply_shift_assignment(...)`.
- `public.deactivate_shift_assignment(...)`.
- `public.shift_actor_can_write()`.
- Constraints validados y FK compuesto de definición/tenant.
- Índice único de asignación activa por trabajador y tenant.
- RLS de lectura por tenant y escritura por roles autorizados.
- Panel de asignaciones conectado a RPCs transaccionales.
- Historial alineado con `data.reason` y `data.changed_by_email`.

### Fase 5 — Branding, Blobavatar y experiencia visual — **COMPLETADA**

Se creó `IdentityAvatar` como componente común para empresa y trabajadores. La cadena es determinista: foto real válida → Blobavatar → iniciales. Las URLs se validan con `URL` y sólo se aceptan `http`/`https`; los nombres se normalizan para soportar tildes, nombres largos, nombres vacíos y RUT vacío. Un error de carga de red avanza al siguiente fallback sin romper la superficie.

`WorkerAvatar`, `CompanyLogo`, el calendario de asistencia y el panel de branding usan el componente central. El branding tenant-scoped ahora puede leerse por el tenant actual y mantiene el fallback global cuando no existe configuración específica.

**Entregables completados:**

- `src/components/IdentityAvatar.tsx`.
- `WorkerAvatar` y `CompanyLogo` centralizados.
- Calendario sin implementación duplicada de Blobavatar.
- Preview de Branding conectado al mismo fallback de producción.
- Validación de URL, nombres largos, tildes, RUT vacío, URL inválida y error de red.

### Fase 6 — Notificaciones de desarrollador — **COMPLETADA**

Se reforzó `saas_customer_notifications` con constraints de contenido, prioridad y canal; índices por tenant/fecha, tenant/no leído y tenant/prioridad/fecha; y un trigger que impide modificar contenido publicado. `publish_saas_notification` exige rol de plataforma y `acknowledge_saas_notification` valida sesión y tenant actual. Los usuarios no pueden insertar, borrar ni editar directamente notificaciones; sólo leerlas y acusar recibo mediante la RPC.

La bandeja ordena por prioridad (`urgent`, `high`, `normal`) y después por fecha descendente. El acuse actualiza `read_at`/`read_by`, conserva el contenido y revierte el estado optimista si la RPC falla.

**Entregables completados:**

- `public.publish_saas_notification(...)`.
- `public.acknowledge_saas_notification(uuid)`.
- Trigger `protect_saas_notification_content`.
- Constraints e índices de notificaciones.
- RLS tenant-scoped sin escritura directa de contenido.
- Panel SaaS migrado a publicación mediante RPC.
- `DeveloperNoticeBanner` con prioridad, estado leído/no leído y orden temporal.

### Fase 7 — E2E, responsive y seguridad — **EN PROGRESO**

Se completó la suite disponible de Playwright con **21 pruebas aprobadas** en la corrida completa, **7 pruebas desktop** y **14 pruebas tablet/móvil**. La cobertura verificada incluye rutas públicas, títulos, navegación, CTA, apertura/cierre del menú móvil, ausencia de overflow horizontal y protección de rutas administrativas sin sesión. Se accedió manualmente al panel `/admin-saas` con un usuario developer, se verificaron las secciones Resumen y Equipo Dev, y se validó la carga de cinco empresas y memberships. También se implementó y desplegó el control reversible de ciclo de vida comercial: activar, suspender por impago y archivar, con bloqueo de accesos, conservación de datos y auditoría.

Pendiente para cerrar esta fase: automatizar sesiones reales de superadmin, developer, company owner, roles operativos y trabajador; probar dos tenants aislados, cambio de tenant, logout, sesión expirada, MFA, turnos, avisos y permisos negativos.

### Fase 8 — Operación, migraciones y escalamiento — **PENDIENTE**

Versionar SQL, documentar tablas/RPC/policies/índices, preparar seed de QA, rollback, staging y observabilidad. Separar local, preview, staging y producción.

### Fase 9 — Cartera SaaS y proyección financiera — **IMPLEMENTADA**

Inicio reemplazó el bloque “Contexto actual” por próximos cobros y añadió MRR bruto, proyección base a 90 días, cartera vencida y tasa cobrada. La proyección es transparente: mantiene constantes las cuentas activas y no inventa altas, bajas ni pagos no registrados.

La cartera admite RUT de empresa, representante legal, RUT del representante, correo y teléfono de cobranza, dirección de facturación y día habitual de pago. Se añadió `saas_billing_notices`, protegida exclusivamente con `is_platform_owner()`, para folios, periodos, vencimientos, estados, montos netos/IVA/total y snapshots de facturación.

El botón **Aviso PDF** genera un documento preliminar descargable con la información registrada. El aviso se etiqueta explícitamente como documento interno: no constituye por sí solo una factura electrónica ni un DTE. La emisión tributaria requiere integrar posteriormente un proveedor DTE/SII y sus credenciales, operación que no se ejecuta en esta fase.

Pendiente: cargar las cuentas reales de cartera, definir el proveedor DTE, automatizar recordatorios por correo/WhatsApp y alimentar una proyección de captación con histórico de leads, altas, bajas y cobros pagados.

### Fase 10 — Comunicaciones y contratos por empresa — **IMPLEMENTADA**

Inicio ahora incluye un selector de empresa para publicar avisos internos mediante la RPC existente `publish_saas_notification`. El dueño del SaaS puede ver por empresa el estado **Pendiente de lectura** o **Leído**, junto con prioridad, título y contenido. La lectura continúa siendo confirmada desde el portal de cada empresa mediante `acknowledge_saas_notification`.

Se añadió `saas_tenant_contracts` para enlazar contratos comerciales por empresa con título, URL, estado, contraparte, RUT, fecha de firma, vencimiento y notas. La tabla utiliza RLS exclusivo `is_platform_owner()` y no modifica los roles ni el aislamiento de datos operativos.

Pendiente: añadir almacenamiento de archivos si se requiere subir contratos directamente, recordatorios automáticos por vencimiento y un proveedor externo para firma electrónica.

### Fase 11 — Onboarding profesional de empresas — **IMPLEMENTADA**

Después de crear y provisionar una empresa, DevTeam abre **Preparar bienvenida**. El flujo permite confirmar administrador o representante, correo principal y alternativo, rutas de acceso y ayuda, soporte, datos de depósito, leyenda de cobranza y vista previa del correo. También puede abrirse desde el directorio de empresas para reenviar una bienvenida sin crear otra identidad ni membership.

Se añadieron `saas_onboarding_profiles` y `saas_onboarding_deliveries`, ambas protegidas exclusivamente por `is_platform_owner()`. Los perfiles contienen datos administrativos y bancarios; las entregas registran sólo estado, destinatario, asunto, proveedor, fecha y error sanitizado. No se persisten contraseñas temporales, tokens ni secretos.

Se desplegó la Edge Function `send-tenant-onboarding` con JWT obligatorio. Usa un proveedor Resend configurado mediante secretos server-side `RESEND_API_KEY` y `ONBOARDING_FROM_EMAIL`; si no están configurados, devuelve un error claro y deja disponible el borrador sin marcar el envío como exitoso. El modal genera además un manual PDF sin credenciales temporales.

El modal también permite **Abrir en mi correo**. Esta opción guarda el perfil, prepara destinatario principal, copia, asunto y cuerpo completo mediante `mailto:`, y abre Outlook, Gmail, Apple Mail u otro cliente predeterminado. El usuario revisa el contenido y pulsa Enviar manualmente; no se realiza ningún envío automático.

Pendiente operativo: configurar el proveedor de correo y verificar el dominio remitente para habilitar envíos reales. La emisión de factura electrónica/DTE sigue fuera de esta fase y requiere una integración tributaria específica.

### Fase 12 — Gobierno de Datos — **IMPLEMENTADA**

Se integró **Gobierno de Datos** en la navegación del panel DevTeam y se añadió un acceso visible desde Inicio. El módulo permite administrar por empresa el inventario de activos, clasificación y sensibilidad, responsables y ubicación, retención y borrado/archivo controlado, contactos autorizados, consumo diario, solicitudes revisables e incidentes de seguridad. Las vistas de uso y auditoría muestran estados pendientes cuando aún no existe un snapshot, evitando presentar métricas ficticias.

Se aplicó la migración `supabase/migrations/202609190009_data_governance.sql` en Supabase. Las siete entidades (`saas_data_governance_profiles`, `saas_data_assets`, `saas_tenant_contacts`, `saas_tenant_usage_daily`, `saas_data_requests`, `saas_data_audit_events` y `saas_data_incidents`) tienen RLS habilitado y una política exclusiva para `is_platform_owner()`. Se añadieron índices por empresa/estado/fecha, triggers de `updated_at` y la función `record_saas_data_audit`, que rechaza actores no plataforma y elimina claves sensibles de los metadatos antes de persistirlos.

La UI conserva la política de no destrucción: las solicitudes de borrado se registran para revisión y el inventario usa estados `active`, `paused`, `archived` y `pending_review`. No se almacenan credenciales, tokens ni contenido de documentos. El build de producción pasó, Prettier pasó para los archivos TSX y la suite disponible de Playwright pasó con **21 pruebas aprobadas**.

Pendiente posterior: conectar snapshots de uso reales desde los procesos de ingesta/procesamiento, añadir pruebas autenticadas con dos tenants y automatizar alertas de vencimiento de retención e incidentes.

### Fase 13 — Control de IP y aislamiento de logs — **IMPLEMENTADA**

Se añadió `saas_ip_access_rules` para administrar reglas `whitelist` y `blacklist` por alcance global o empresa, con redes CIDR, prioridad, vencimiento, notas y desactivación reversible. La evaluación aplica siempre blacklist primero; si existe una whitelist activa para el alcance, las IP que no coinciden quedan denegadas. Sin whitelist activa, el comportamiento permanece permitido por defecto para no interrumpir instalaciones existentes.

Se desplegó la Edge Function `log-activity` con JWT obligatorio. Captura la IP desde headers server-side del gateway, valida que el usuario no intente registrar actividad para otro tenant, ejecuta `evaluate_saas_ip_access`, registra denegaciones como eventos de seguridad y persiste `tenant_id`, IP, agente de usuario y contexto sin guardar `cookie_data`. El cliente dejó de desactivar esta función; `register-device` continúa deshabilitada hasta completar su contrato server-side.

La política de `activity_logs` conserva dos necesidades separadas: el usuario empresarial sólo puede leer y escribir el tenant actual mediante `tenant_boundary_activity_logs`, mientras que el dueño de plataforma mantiene lectura global mediante `saas_platform_owner_activity_logs_select`. El fallback de auditoría del cliente también incluye `tenant_id` para no crear registros huérfanos. Logs ahora permite seleccionar empresa o auditar todas las empresas, y la exportación respeta el mismo filtro.

Se añadió `verify_saas_log_isolation()`, cuyo checklist aplicado en Supabase confirmó: columna `tenant_id` presente, RLS habilitado, política de frontera tenant presente y lectura global del dueño de plataforma. La migración es `supabase/migrations/202609190010_ip_access_and_log_isolation.sql`.

Pendiente operativo: definir las redes corporativas reales, desplegar las reglas iniciales sólo después de probarlas con una ventana de cambio, y ejecutar pruebas autenticadas negativas con dos tenants y una IP bloqueada. La IP real depende del proxy/gateway; no se debe confiar en una IP enviada por el navegador.

## Entregable solicitado para el ZIP

El ZIP completo contiene el código fuente y la estructura del proyecto, `README.md`, documentación, pruebas, scripts, migraciones y los documentos actualizados `ROADMAP.md` y `SECURITY_REMEDIATION_PLAN.md`. Incluye los archivos necesarios para instalar dependencias desde los lockfiles.
Se excluyen `.git`, `node_modules`, `.output`, `.wrangler`, builds, cachés, reportes de ejecución y archivos `.env*` con valores locales (se conservaría únicamente una plantilla `.env.example` si existiera). No incluye datos de producción ni secretos.

## Pruebas de validación y seguridad realizadas

### Fases 1–3

Se verificó el build de producción con Vite/Nitro, se comprobó la existencia y privilegio `EXECUTE` de `get_effective_tenant_access`, `apply_saas_plan` y `upsert_platform_operator`, y se revisaron las políticas RLS y el trigger de protección de campos de seguridad. También se validó la migración de autorización, el manejo de errores diferenciados del panel, la ausencia de secretos en el paquete fuente y la documentación del contrato y roadmap. Se revisaron los advisories de Supabase disponibles en el ciclo anterior.

No se ejecutó todavía una prueba E2E con sesiones reales de cada rol, dos tenants simultáneos, MFA AAL2 y cambio de tenant. Por ello esos escenarios permanecen explícitamente como pendientes del ciclo E2E, no como pruebas ya aprobadas.

### Fase 4

Se validó que no existieran asignaciones huérfanas, definiciones huérfanas, duplicados activos por trabajador ni rangos de fecha inválidos antes de migrar. Posteriormente se verificó que todos los constraints quedaron `convalidated = true`, que las RPCs son `SECURITY DEFINER` y ejecutables por `authenticated`, que las políticas de las tres tablas exigen `current_tenant_id()`, y que existen el índice único de asignación activa, los índices de fechas/historial y la FK compuesto tenant-definición. El build volvió a ejecutarse correctamente después de conectar la UI a las RPCs.

Pendiente: prueba manual/E2E con dos empresas y dos usuarios reales para demostrar en sesión que un usuario de Tenant A no puede leer, asignar, modificar ni desactivar datos de Tenant B.

### Fases 5–6

Se validaron constraints de branding y notificaciones, con cero nombres de empresa inválidos, cero URLs de logo inválidas, cero prioridades inválidas y cero contenidos vacíos. Se comprobaron los tres índices de notificaciones, las políticas RLS de lectura tenant-scoped, la ausencia de políticas directas de INSERT/DELETE y que las RPCs nuevas son ejecutables por `authenticated` pero no por `anon`. El build y Prettier pasaron; el lint focalizado no presentó errores y dejó sólo warnings heredados de Fast Refresh y dependencias de hooks. El lint global mantiene errores de formato y `any` preexistentes en `App.tsx` y `SaaSControlPanel.tsx`, fuera del alcance funcional de estas fases.

La validación funcional implementada cubre nombres largos, tildes, RUT vacío, URL inválida y fallo de red mediante la cadena foto real → Blobavatar → iniciales. La prueba E2E visual con navegadores y una prueba real de aislamiento entre dos tenants siguen pendientes del ciclo E2E.

## Orden recomendado de ejecución

1. **Completado:** RPC transaccional de cambio de plan y matriz de autorización.
2. **Parcialmente completado:** pruebas responsive de sidebar, guard de rutas y navegación autenticada DevTeam; pendiente aislamiento real.
3. **Completado:** Equipo Dev y memberships con alta, suspensión y auditoría.
4. **Completado:** migración versionada y flujo transaccional completo de turnos.
5. **Completado:** notificaciones, publicación y acuse de lectura.
6. **Completado:** branding y Blobavatar completo.
7. **Parcialmente completado:** suite E2E responsive y revisión visual; pendiente auditoría integral de accesibilidad y seguridad por rol.
8. Documentación de operación, staging y rollback.
9. **Completado:** actualizar este roadmap con el estado verificado y generar el ZIP final verificado.

## Criterios de terminado de Fases 1–6

Las Fases 1–6 se consideran completas porque, además de los controles anteriores, empresa y trabajador comparten una cadena validada de foto real, Blobavatar e iniciales; el branding es tenant-scoped y tolera fallos de red; y las notificaciones tienen publicación autorizada, contenido inmutable, prioridad, orden temporal, estado de lectura y aislamiento por empresa.

## Evidencia de validación del ciclo actual

El frontend completo compila con TypeScript y build Vite/Nitro. Se corrigieron los 10 archivos que bloqueaban Prettier; `npm run lint` queda aprobado. La suite E2E pública terminó con **24 pruebas aprobadas** en desktop, tablet y móvil, incluyendo branding público, rutas legales, CTA, menú móvil, protección de rutas administrativas y ausencia de overflow.

La migración `worker_operator_portal_branding` fue aplicada en Supabase y quedó registrada como `20261023051923`. Se verificaron las funciones `is_worker`, `mfa_required_for_current_user`, `fetch_public_tenant_branding` y `shift_actor_can_write`; branding público tiene ejecución para `anon`/`authenticated` y las funciones sensibles sólo para `authenticated`.

La preview pública se encuentra disponible en el puerto 4173. Las pruebas autenticadas multi-tenant, MFA y roles reales siguen requiriendo credenciales QA no productivas mediante las variables `E2E_*` documentadas en `e2e/multitenant.spec.ts`.

## Criterios pendientes del programa completo

El programa completo se considerará terminado cuando, además, el cambio de tenant y los flujos críticos pasen E2E con al menos dos empresas aisladas, los developers respeten memberships activas, turnos y notificaciones tengan cobertura, la experiencia responsive sea validada y existan staging, rollback y observabilidad documentados.

## Supuestos y riesgos abiertos

Se asume que los overrides manuales sobreviven al cambio de plan; esta decisión quedó implementada y documentada. La provisión de cuentas developer utiliza la Edge Function administrativa existente y no se simula solo con una fila en `allowed_emails`. La seguridad final debe validarse con pruebas de sesiones reales sobre staging antes de producción.

Los asesores de Supabase siguen mostrando advertencias históricas sobre funciones `SECURITY DEFINER`, políticas anónimas e índices de claves foráneas en otras áreas del sistema. No se modificaron en este ciclo porque exceden el alcance de las Fases 1–2; deben tratarse en el ciclo de seguridad y operación.

## Entregables del próximo ciclo

Suite E2E mínima de autorización y aislamiento, pruebas de dos developers sobre tenants distintos, pruebas E2E de turnos, notificaciones y branding con dos empresas, checklist QA firmado, revisión de advisories de Supabase y documentación de staging/rollback.


## Actualización QA 2026-10-27

La prueba autenticada de caja blanca reprodujo y corrigió el fallo `42702 tenant_id is ambiguous` de `set_saas_tenant_lifecycle`. Las migraciones `fix_tenant_lifecycle_ambiguous_columns` y `fix_tenant_lifecycle_upsert_ambiguity` quedaron aplicadas en Supabase y versionadas en el código fuente. El flujo de empresas pasó: la empresa se mueve al directorio de Papelera, permanece archivada/stopped después de recargar y no vuelve al directorio activo.

También se verificó el aislamiento visible de trabajadores entre Costa y Norte: cada tenant muestra su propia dotación y RUTs, con políticas RLS `op_workers`, bloqueo de sesiones anónimas y unicidad `(tenant_id, rut)`. El avance global se mantiene en **78%**: la prueba manual autenticada mejora la evidencia de la Fase 7, pero todavía faltan Playwright con sesiones QA dedicadas por rol, CRUD de trabajadores automatizado con cleanup, MFA real, staging y rollback.


## Actualización crítica de seguridad — 2026-11-01

**Estado: PLANIFICADA; no implementada.** Esta actualización surge de una revisión local de solo lectura. Se confirmó que el proyecto Supabase BJSIG está activo, pero no se inspeccionaron su catálogo, filas, funciones ni políticas; las afirmaciones de fases anteriores describen el registro de ciclos previos y no constituyen una certificación del estado remoto actual.

### Fase 14 — Hardening de autorización, privacidad y operación — **PLANIFICADA**

1. **Fase 14.0 — Inventario seguro:** fijar la matriz Dev Team/tenant/ruta/operación; recuperar las fuentes de `worker-auth`, `worker-gdpr`, `harassment-report-submit` y `honeytoken-check`; comparar las migraciones con una inspección de catálogo de solo lectura y preparar un respaldo con restauración demostrada en staging.
2. **Fase 14.1 — Contención crítica:** aplicar Dev-Team-only en rutas, Edge Functions y acceso a datos; corregir el alcance de gestión de cuentas de plataforma, MFA y `passwordPolicy` server-side; endurecer onboarding (tenant, dominio, enlace de activación, errores genéricos), XSS de impresión QR, CORS e identificación IP confiable.
3. **Fase 14.2 — Esquema y RLS:** versionar un dump solo de esquema; acordar permisos por tabla/operación/rol; preparar pruebas de aislamiento entre tenants y políticas separadas para solicitudes y marcajes. Evaluar helpers comunes sin mezclar roles de tenant y plataforma.
4. **Fase 14.3 — Privacidad y cumplimiento:** minimizar datos enviados antes del login; decidir GPS/ID de dispositivo y retención con asesoría legal; impedir pérdida silenciosa de eventos de auditoría; definir acceso y trazabilidad del canal Ley Karin; verificar Ley 21.719 con fuente oficial y asesor legal.
5. **Fase 14.4 — Pruebas y CI:** tests unitarios de autorización, test de catálogo para tablas con `tenant_id` sin RLS, RLS con fixtures sintéticos en base aislada, E2E de dos empresas y Dev Team, CRUD con cleanup solo en staging, pipeline PR y endurecimiento gradual de TypeScript.
6. **Fase 14.5 — Mantenimiento:** paginar `list_users`, decidir con seguridad cómo resolver `authUserByEmail`, tipar RPC/Edge desde el esquema real, unificar autorización y refactorizar vistas/limpiar integraciones solo después de estabilizar los controles.

**Criterio de cierre:** evidencia reproducible por rol y tenant, pruebas negativas de acceso directo a APIs/datos, fuentes auditables para todas las Edge Functions, respaldos/restauración comprobados y despliegues documentados. La regla **solo Dev Team accede al portal de trabajadores** debe pasar tanto pruebas de UI como controles del servidor/RLS.

**Puerta obligatoria de producción:** no ejecutar DDL, DCL, migraciones RLS ni escrituras/datos en Supabase compartido durante pruebas. Para cada cambio productivo se presentarán SQL exacto, impacto por tabla/rol, verificación y rollback; se esperará aprobación expresa antes de aplicarlo. Las pruebas usarán staging aislado y datos sintéticos. Las decisiones legales no se cerrarán sin revisión profesional.

El detalle, evidencia local, dependencias y validaciones por área está en [`SECURITY_REMEDIATION_PLAN.md`](SECURITY_REMEDIATION_PLAN.md).
