# Matriz de autorización — Iteración 4

**Fecha:** 19 de noviembre de 2026  
**Proyecto:** BJSIGAPP  
**Estado:** borrador operativo para revisión del contrato de producto; no demuestra por sí solo que el esquema remoto, RLS o Edge Functions estén desplegados de esta forma.

## 1. Alcance y precedencia

Esta matriz convierte el contrato de autorización en casos comprobables por **actor × ruta × operación × tenant**. La decisión efectiva debe respetar esta precedencia:

> **RLS/RPC → tenant → rol → permiso → plan → override**

La UI sólo debe reflejar una decisión ya autorizada. Ocultar una ruta, deshabilitar un botón o filtrar una consulta en el navegador no constituye control de seguridad.

### Leyenda

| Código | Significado |
| --- | --- |
| **P** | Permitido por contrato, sujeto a sesión, tenant activo y RLS/RPC exitosos. |
| **D** | Denegado. Debe fallar cerrado con 401/403 o respuesta genérica cuando corresponda. |
| **C** | Condicionado a permiso explícito, plan, tenant asignado o AAL2. |
| **Q** | Pendiente de decisión del producto o de evidencia remota; no marcar como permitido en producción. |
| **N/A** | No aplica al actor o contexto. |

## 2. Actores canónicos

| ID | Actor | Contexto tenant | Alcance válido |
| --- | --- | --- | --- |
| A0 | Anónimo | Sin sesión | Sólo landing pública, SEO, login y recursos públicos. No datos privados ni RPC protegidas. |
| A1 | Usuario autenticado sin tenant o con tenant no resuelto | Sin tenant activo | Puede recibir una respuesta de sesión, pero no debe leer/escribir datos tenant. `TENANT_REQUIRED`. |
| A2 | `superadmin` | Plataforma | Todos los tenants y funciones de plataforma, con trazabilidad y MFA cuando aplique. |
| A3 | `developer` asignado | Plataforma + tenants asignados | Operación SaaS y soporte auditado sólo sobre `devTenantIds`; no puede conceder roles `developer`/`superadmin`. |
| A4 | `developer` no asignado | Plataforma sin alcance solicitado | Funciones de plataforma sin tenant asignado pueden existir, pero toda operación tenant debe fallar `TENANT_ACCESS_DENIED`. |
| A5 | `company_owner` / `admin` | Tenant propio | Operación administrativa propia según permisos, plan y estado del tenant. Nunca plataforma. |
| A6 | `human_resources` | Tenant propio | Recursos humanos y roles delegables según permisos; no roles de plataforma. |
| A7 | `manager` / `prevencionista` / `operador` | Tenant propio | Sólo módulos y operaciones explícitamente permitidos. |
| A8 | `worker` autenticado | Tenant propio + RUT propio | Portal y registros propios autorizados; nunca navegación administrativa ni datos de otro RUT/tenant. El alcance final del portal está sujeto a la decisión Dev Team-only. |
| A9 | Usuario autenticado de tenant B intentando tenant A | Tenant distinto al propio | Siempre denegado, aunque conozca UUID, slug, RUT o ID de fila. |

## 3. Reglas transversales obligatorias

| Control | Permitido | Denegado / respuesta esperada |
| --- | --- | --- |
| Sesión | Operaciones privadas sólo con sesión válida. | Anónimo en RPC/Edge protegida: 401/403 o respuesta genérica sin enumeración. |
| Tenant activo | Tenant propio o tenant asignado al Dev Team; tenant activo y existente. | Tenant ausente: `TENANT_REQUIRED`; tenant ajeno: `TENANT_ACCESS_DENIED` o `TENANT_BOUNDARY_VIOLATION`. |
| RLS | Lectura/escritura filtrada por `current_tenant_id()` o regla de asignación de plataforma. | Nunca probar RLS con `service_role`; ningún filtro frontend sustituye RLS. |
| RUT | `worker` sólo puede consultar/resumir su RUT propio y registros permitidos. | RUT de otro trabajador, tenant o cuenta: 403/respuesta genérica. |
| Plataforma | `superadmin` y `developer` se resuelven mediante `is_platform_owner()`/membership válida. | Rol empresarial no obtiene bypass por enviar `role`, `tenant_id` o `platformContext` en el cliente. |
| MFA | Acciones marcadas como AAL2 requieren `aal2`; registrar intento y resultado. | AAL1/ausente cuando la política exige AAL2: `MFA_REQUIRED`. |
| Cuenta propia | Un actor no puede elevarse, editar sus campos de seguridad ni modificar su propia cuenta de plataforma. | Self-modification: `SELF_MODIFICATION_FORBIDDEN`; campos protegidos por trigger/RLS. |
| Error | Mensaje estable y mínimo; logs server-side con contexto permitido. | No revelar si existe un correo/RUT, datos de otro tenant, secretos o detalles internos. |

## 4. Matriz de rutas y operaciones

### 4.1 Rutas públicas y de autenticación

| Ruta / superficie | Operación | A0 | A1 | A2/A3 | A5–A7 | A8 | A9 | Tenant esperado |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| `/`, `/modulos`, `/privacidad`, `/terminos`, `/contacto`, `/cookies` | Leer contenido público | P | P | P | P | P | P | Ninguno |
| `/robots.txt`, `/sitemap.xml` | Leer metadatos SEO | P | P | P | P | P | P | Ninguno |
| `/admin` | Ver formulario de acceso | P | P | P | P | P | P | Aún no resuelto |
| `/admin` | Autenticar y entrar al panel | D | D | P/C | C | D | D | Tenant propio/asignado; MFA según política |
| `/trabajador`, `/portal-trabajador`, `/:slug` | Ver formulario de trabajador | P | P | P | P | Q | P | Slug sólo identifica superficie, no autoriza datos |
| `/trabajador`, `/portal-trabajador`, `/:slug` | Autenticar worker | D si no hay sesión; login público controlado | D | Q | D | Q | D | Tenant resuelto server-side y RUT propio |
| Cualquier ruta no reconocida | Resolver navegación | P sólo si contenido público | D para datos privados | C | C | D | D | Nunca confiar en fallback de ruta |

**Decisión pendiente crítica:** el requisito recibido “sólo Dev Team está autorizado a acceder al portal de trabajadores” contradice el contrato actual, que define `worker` con portal propio. Hasta que se confirme si significa *administrar* el portal o *iniciar sesión como trabajador*, las celdas A8 y el login de `/trabajador` son **Q**, no evidencia de autorización.

### 4.2 Panel administrativo por tenant

| Ruta / operación | A2 `superadmin` | A3 dev asignado | A4 dev no asignado | A5–A7 tenant propio | A8 worker | A9 tenant ajeno |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `/:slug/admin` cargar panel | P | P si slug asignado | D | C si tenant propio y sesión válida | D | D |
| Leer configuración/branding tenant | P | P si asignado | D | C: lectura tenant-scoped | D | D |
| Editar branding/landing tenant | P | P si asignado y función de plataforma | D | D salvo RPC explícita aprobada | D | D |
| Leer trabajadores del tenant | P | P si asignado | D | C: `can_view_workers`/permiso | D | D |
| Crear/editar/desactivar trabajador | P | P si asignado | D | C: `can_edit_workers` y reglas de rol | D | D |
| Administrar solicitudes/turnos | P | P si asignado | D | C por permiso y `shift_actor_can_write` | D | D |
| Leer auditoría tenant | P | P si asignado | D | C por permiso; nunca otro tenant | D | D |
| Cambiar tenant activo | P | P sólo a tenant asignado | D | D si no es miembro | D | D |
| Leer o escribir plan SaaS/overrides | P | C según función de plataforma aprobada | D | D | D | D |

### 4.3 Panel de plataforma `/admin-saas`

| Operación | A0/A1 | A2 `superadmin` | A3 dev asignado | A4 dev no asignado | A5–A8 empresarial |
| --- | ---: | ---: | ---: | ---: | ---: |
| Ver tenants y estado SaaS | D | P | C: sólo alcance auditado | D | D |
| Crear/suspender/reactivar tenant | D | P | C si contrato de Dev Team lo permite | D | D |
| Aplicar plan SaaS y conservar overrides | D | P | C sólo con autorización explícita | D | D |
| Gestionar cuenta `developer`/`superadmin` | D | P excepto auto-modificación | D (`SUPERADMIN_REQUIRED`) | D | D |
| Gestionar cuenta empresarial de tenant asignado | D | P | P sólo si todos los tenants objetivo están asignados | D | D |
| Conceder rol `developer`/`superadmin` | D | P | D | D | D |
| Publicar notificación SaaS | D | P | C si tenant activo y función habilitada | D | D |
| Consultar catálogo de datos sin filas | D | P | C por tenant asignado | D | D |

## 5. Matriz de funciones y RPC sensibles

| Función / operación | A0 | A2 | A3 | A5–A7 | A8 | A9 | Guardas mínimas |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| `current_tenant_id()` | D/según contrato remoto | P | P | P | C si portal lo resuelve | D | Sesión; no aceptar tenant del cliente como autoridad |
| `set_active_tenant(_tenant_id)` | D | P | P sólo asignado | P sólo miembro propio | D | D | Tenant activo, membership/RPC y auditoría |
| `attendance_summary(_tenant, _rut, ...)` | D | P | P si asignado | C por rol/permisos | C sólo RUT propio | D | Wrapper autorizado; helper privado sin EXECUTE cliente; tenant y RUT |
| RPC de marcación QR | D | P | P si asignado | C por rol y permiso | C sólo operación propia prevista | D | GPS reciente, tenant actual, worker activo, inmutabilidad/idempotencia |
| `fetch_public_tenant_landing` | P | P | P | P | P | P | Sólo datos públicos; no filtrar secretos ni filas operativas |
| `update_public_landing_settings` | D | P | P si función de plataforma | D salvo contrato aprobado | D | D | `is_platform_owner()`, autenticación, validación de JSON y URLs |
| `worker-auth/check_account` | P sólo respuesta genérica | Q | Q | D | Q | D | No enumerar; rate limit; tenant/RUT/identidad server-side |
| `worker-auth/check_rut` | P sólo respuesta genérica | Q | Q | D | Q | D | Respuesta idéntica registrado/no registrado; no devolver RUT |
| `worker-auth/request_reset` | P sólo respuesta genérica | Q | Q | D | Q | Q | Rate limit, captcha/política confirmada, no enumeración |
| `worker-gdpr` | D sin sesión | P según alcance | P según tenant asignado | C sólo sus datos/función | C sólo datos propios | D | Identidad server-side, tenant y RUT propio |
| `harassment-report-submit` | D | P según alcance | P según tenant asignado | C según rol y confidencialidad | C sólo flujo permitido | D | Tenant resuelto, acceso de lectura separado, auditoría de lectura |
| `honeytoken-check` | D | P según alcance | P según tenant asignado | D/C según seguridad | D | D | Sesión, tenant, evento/auditoría; no filtrar honeytoken |
| `log-activity` | D | P | P | C por tenant/MFA | C mínima y server-side | D | Tenant server-side, AAL2 cuando requerido, no confiar IP/client fields |

Las celdas **Q** de las funciones remotas permanecen abiertas hasta comparar la versión desplegada y recuperar fuentes completas. No se debe inferir seguridad de que exista un consumidor local.

## 6. Casos de prueba sintéticos mínimos

Usar dos tenants aislados, `TENANT_A` y `TENANT_B`, con trabajadores `RUT_A1` y `RUT_B1`. Los IDs, correos y datos deben ser sintéticos y creados por el fixture; ningún test debe apuntar a empresas reales.

| Caso | Actor | Contexto | Acción | Resultado esperado |
| --- | --- | --- | --- | --- |
| T01 | `company_owner_A` | A | Leer y actualizar trabajador A1 | P sólo con permisos; ninguna fila B visible |
| T02 | `company_owner_A` | A | Leer trabajador B1 por ID/RUT | D / 0 filas; no filtrar sólo en frontend |
| T03 | `worker_A1` | A | Leer su perfil/documentos/solicitudes | P sólo propios |
| T04 | `worker_A1` | A | Leer o resumir RUT_A2/B1 | D / respuesta genérica |
| T05 | `worker_A1` | A | Cambiar tenant a B | D `TENANT_BOUNDARY_VIOLATION` |
| T06 | `developer_A` | A | Leer/escribir operación tenant A | P si membership activa y permiso |
| T07 | `developer_A` | B | Leer/escribir operación tenant B no asignado | D `TENANT_ACCESS_DENIED` |
| T08 | `developer_A` | A+B | Operar cuenta empresarial con tenants A y B | D si el objetivo incluye B; `canManageAccount` exige todos asignados |
| T09 | `superadmin` | A+B | Cambiar tenant y administrar cuentas | P, excepto auto-modificación y reglas de MFA |
| T10 | Usuario sin tenant | Ninguno | Consultar cualquier tabla/RPC tenant | D `TENANT_REQUIRED`; no fallback global |
| T11 | Rol empresarial A | A | Conceder `developer` o `superadmin` | D `SUPERADMIN_REQUIRED` |
| T12 | `developer_A` | A | Conceder `developer` o `superadmin` | D `SUPERADMIN_REQUIRED` |
| T13 | AAL1 | A | Escribir actividad/RPC que exige MFA | D `MFA_REQUIRED` |
| T14 | A8 worker | A | Login propio y acceso al portal | Q hasta decidir Dev Team-only; luego convertir en P/D y probar |
| T15 | Cualquier actor | A | Enviar `tenant_id=B` desde cliente | D salvo superadmin/developer con asignación B comprobada server-side |
| T16 | A0 | Ninguno | Probar enumeración de correo/RUT | Respuesta indistinguible y rate limit; nunca confirmar existencia |

## 7. Evidencia requerida para cerrar la matriz

1. Decisión escrita del producto sobre el significado de Dev Team-only.
2. Dump o catálogo remoto sólo de esquema: funciones, grants, tablas, columnas tenant, índices y políticas RLS.
3. Diferencias explicadas entre fuentes locales y versiones Edge desplegadas.
4. Fixtures reproducibles de `TENANT_A`/`TENANT_B` y cleanup verificable.
5. Resultados positivos y negativos de T01–T16, con errores y códigos observados.
6. Confirmación de que ninguna prueba usó `service_role` para evaluar RLS ni leyó datos de negocio reales.
7. Si se propone SQL o despliegue: diff exacto, impacto, verificación, rollback y aprobación explícita antes de ejecutar.

**Estado de cierre:** abierto. Esta matriz define el trabajo de Iteración 4; no declara autorización remota ni cierre de la brecha Dev Team-only.
