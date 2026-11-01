# QA white-box BJSIG — resultado final

**Fecha:** 1 de noviembre de 2026  
**Alcance:** entrada de trabajadores, portal y solicitudes; aislamiento por rol/tenant; acceso del responsable.

## Resumen ejecutivo

Se preparó el tenant sintético **Costa Ambiental demo** con un responsable de empresa y tres trabajadores QA. Las tres cuentas de trabajador iniciaron sesión y enviaron una solicitud de prueba marcada como pendiente. La cuenta Company Owner inició sesión y su dashboard mostró las tres solicitudes del tenant para revisión. No se respondió ni se cambió el estado de ninguna solicitud.

El código y las migraciones fueron actualizados para corregir la lectura del portal, alinear columnas faltantes de BJSIG y mantener la lectura/escritura bajo RLS. La cuenta de desarrollo `beenja74@icsllstm@gmail.com` no fue modificada ni utilizada en esta simulación.

## Cuentas QA y datos de prueba

| Trabajador | Cargo | RUT | Correo |
|---|---|---|---|
| QA Operador Prueba Uno | Operador QA | 90.021.001-9 | `qa.operador.costa.20261028.01@demo.bjsig.test` |
| QA Prevencionista Prueba Dos | Prevencionista QA | 90.021.002-7 | `qa.prevencionista.costa.20261028.02@demo.bjsig.test` |
| QA Supervisor Prueba Tres | Supervisor QA | 90.021.003-5 | `qa.supervisor.costa.20261028.03@demo.bjsig.test` |
| Responsable QA | Company Owner | — | `qa.responsable.costa.20261028@demo.bjsig.test` |

Las cuentas y registros pertenecen únicamente al tenant demo. Las contraseñas permanecen en el archivo privado externo y **no se incluyen en el ZIP**.

## Solicitudes de prueba en BJSIG

Se verificaron tres filas en `public.worker_requests`, cada una con su RUT de trabajador, tenant `10000000-0000-4000-8000-000000000005` y estado `pendiente`:

- Operador: `[QA] 2026-10-31 Operador — Consulta de flujo`.
- Prevencionista: `[QA] 2026-10-31 Prevencionista — Consulta de flujo`.
- Supervisor: `QA white-box 2026-10-27 — prueba funcional`.

Las solicitudes usan categoría `consulta` y mensaje de prueba sin datos personales; no requieren gestión real. Se escribieron en el proyecto activo BJSIG conectado, por autorización expresa del usuario.

## Verificación de roles y aislamiento

- **Trabajador:** el portal muestra el perfil real del usuario y su lista propia. El Prevencionista QA vio su solicitud; la prueba previa confirmó que el Worker 2 no puede ver la solicitud del Worker 1.
- **Supervisor:** inició sesión mediante validación de RUT y correo y envió una solicitud; la inserción quedó confirmada en BJSIG.
- **Company Owner:** inició sesión en el panel de Costa Ambiental demo. El dashboard mostró **3 solicitudes pendientes de respuesta**, pertenecientes a los tres RUT QA del mismo tenant.
- **RLS:** `worker_requests` exige `tenant_id = current_tenant_id()` y, para `role=worker`, igualdad del RUT normalizado con `current_worker_rut()` tanto en `USING` como en `WITH CHECK`. Los roles empresariales reconocidos mantienen acceso dentro del tenant. Se aplicó el mismo patrón a `qr_scan_events`.
- **Aislamiento entre tenants:** se verificó por inspección de políticas la condición `tenant_id = current_tenant_id()`. No se creó un segundo tenant sintético, por lo que el cruce entre dos tenants no se probó con dos sesiones independientes.

El dashboard confirma la visibilidad de las tres solicitudes. El módulo `RequestsTab` contiene controles para marcar en revisión, responder, cerrar y actualizar validez; no se ejecutó ninguna acción de gestión para conservar las solicitudes de QA intactas. La ruta administrativa directa volvió a pedir MFA, así que sus acciones no se probaron en navegador.

## Cambios técnicos incluidos

- Portal personal y vista previa envueltos en `TenantProvider`, de modo que las lecturas usen el tenant activo.
- `useWorkerData` ya no permite que errores de módulos secundarios bloqueen el flujo principal de solicitudes; el estado crítico de carga/error se limita a perfil y solicitudes.
- `reload` y `createRequest` incluyen `tenantId` en sus dependencias, para invalidar la clave React Query correcta al crear una solicitud o cambiar de tenant.
- Los campos de acceso del administrador y trabajador (incluido el RUT inicial, recuperación y MFA) quedan bloqueados hasta recibir una ubicación GPS válida; el widget conserva activación/reintento y explica el estado o incompatibilidad del navegador.
- Los handlers de login, magic link, contraseña inicial y recuperación verifican también GPS activo, además del bloqueo visual de los controles.
- La asistencia de capacitación ordena por el campo real `date` y lo mapea al campo `attendance_date` esperado por la interfaz.
- Migración aditiva `20261031000400_worker_qr_scan_attendance_columns.sql` para las columnas QR que requiere la aplicación.
- Migración `20261101000100_worker_qr_scan_ownership_and_grants.sql`: política tenant + ownership por RUT para QR y grants mínimos `SELECT`, `INSERT`, `UPDATE` a `authenticated`.
- Se mantienen las migraciones anteriores de ownership de `worker_requests`, onboarding, permisos de `service_role` y rate limit.

## Validaciones locales

| Comprobación | Resultado |
|---|---|
| `npm run typecheck` | PASS |
| `npm run lint` | PASS, 0 errores; 1 advertencia `no-explicit-any` en `admin-user-manage/index.ts` |
| `npm run build` | PASS |
| `npm run test:e2e:public` | PASS — 30 pruebas |
| Acceso bloqueado sin GPS | PASS — E2E confirma que correo, contraseña, RUT y botón de ingreso quedan deshabilitados; el aviso ofrece reintentar |
| Activación GPS | PASS — E2E confirma que al conceder ubicación se desbloquea el RUT del trabajador |
| Login y envío de solicitudes QA | PASS — 3 envíos, uno por trabajador |
| Dashboard Company Owner | PASS — lista 3 solicitudes pendientes del tenant |
| RLS trabajador/trabajador | PASS — el Worker 2 no ve la solicitud del Worker 1; también verificado por política |
| RLS tenant | PASS por inspección de políticas; no hubo sesión de segundo tenant |

## Observaciones y límites

BJSIG contiene divergencias de esquema en módulos secundarios (por ejemplo, `performance_evaluations.evaluation_date`). Para no bloquear las solicitudes, esos errores secundarios dejan la sección correspondiente en estado vacío mientras el flujo principal permanece disponible. Esos módulos no forman parte de las pruebas de aceptación de solicitudes y requieren una revisión de esquema independiente.

El envío de solicitudes se persiste en la aplicación y Supabase; el flujo de solicitudes no envía correo mediante Resend en esta versión. Resend se mantiene para onboarding/provisionamiento donde está configurado. El ZIP contiene código y migraciones, no credenciales QA ni archivos `.env`.
