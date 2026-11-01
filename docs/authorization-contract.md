# Contrato de autorización SaaS

## Precedencia obligatoria

La decisión efectiva se calcula en este orden, de izquierda a derecha:

> **RLS/RPC → tenant → rol → permiso → plan → override**

RLS y las RPC son la frontera de seguridad y nunca se sustituyen por lógica del cliente. Primero se valida que la sesión esté autenticada, que el tenant exista y esté activo y que el usuario tenga membresía o una asignación válida. Después se resuelve el rol y el mapa de permisos. El plan aporta el conjunto base de módulos. Finalmente, un override explícito del Dev Team puede habilitar o bloquear un módulo y queda marcado como excepción manual.

Una ausencia de clave no habilita nada. El dashboard sólo queda disponible como fallback de navegación, no como bypass para vistas protegidas.

## Matriz rol × permiso × módulo × contexto

| Rol                                       | Contexto          | Permiso requerido                        | Módulo base                     | Override permitido | Alcance                                                                              |
| ----------------------------------------- | ----------------- | ---------------------------------------- | ------------------------------- | ------------------ | ------------------------------------------------------------------------------------ |
| `superadmin`                              | Plataforma        | No aplica                                | Todos                           | Sí                 | Todos los tenants y control SaaS                                                     |
| `developer`                               | Plataforma        | No aplica                                | Todos los módulos de plataforma | Sí                 | Operación SaaS y soporte auditado                                                    |
| `company_owner`                           | Tenant propio     | `can_view_<módulo>` y permisos de acción | Según plan activo               | No                 | Datos, usuarios y configuración operativa de su tenant                               |
| `admin`                                   | Tenant propio     | Permiso explícito                        | Según plan activo               | No                 | Operación delegada dentro de su tenant                                               |
| `human_resources`                         | Tenant propio     | Permiso explícito                        | Según plan activo               | No                 | Recursos humanos autorizados                                                         |
| `manager` / `prevencionista` / `operador` | Tenant propio     | Permiso explícito                        | Según plan activo               | No                 | Módulos asignados por la organización                                                |
| `worker`                                  | Portal trabajador | No usa navegación administrativa         | Portal                          | No                 | Sólo su propio portal y registros autorizados                                        |
| Cualquier rol empresarial                 | Plataforma        | Denegado                                 | Denegado                        | No                 | Nunca puede editar planes, overrides, membresías de plataforma o roles de plataforma |

La clave histórica `can_view_<módulo>` se normaliza a una clave interna de ruta (`workers`, `extendedfinance`, `eppwarehouse`, etc.). También se normalizan alias históricos como `finance`, `compliance`, `iper` y nombres con guion bajo.

## Persistencia transaccional de planes

`apply_saas_plan(tenant_id, plan_id, reason)` sólo admite un rol de plataforma, valida que el tenant esté activo y que el plan exista y esté activo. Actualiza `saas_tenant_subscriptions` y `tenant_settings` en una única transacción y devuelve la configuración efectiva resultante.

La decisión del producto es **conservar los overrides anteriores** al cambiar de plan. La interfaz los muestra explícitamente como **excepción manual**, porque prevalecen sobre el nuevo plan hasta que el Dev Team los modifique.

Los errores se distinguen por contrato: `PLATFORM_ROLE_REQUIRED`, `TENANT_ACCESS_DENIED`/RLS, `PLAN_NOT_FOUND_OR_INACTIVE` y `PERSISTENCE_ERROR`.

## Protección de membresías

El trigger `protect_business_security_fields` impide que un usuario empresarial modifique su propia fila de `allowed_emails` en los campos `role`, `permissions`, `tenant_id` o `active`. Las políticas RLS de `tenant_settings` permiten lectura tenant-scoped, pero reservan toda escritura al rol de plataforma.

## Equipo Dev y memberships

`upsert_platform_operator(email, permissions, tenant_ids, active)` exige un rol de plataforma y no permite modificar la propia cuenta de plataforma. Valida que todos los tenants asignados estén activos, actualiza de forma atómica `allowed_emails` y las memberships `developer`, conserva permisos explícitos por operador y registra `platform.membership.upsert` por tenant.

La UI provisiona la identidad Auth mediante `admin-user-manage`. La suspensión sincroniza el bloqueo Auth con `allowed_emails.active` y las memberships activas; la reactivación ejecuta el flujo inverso. Un developer sólo puede operar sobre tenants que mantengan una membership activa.

## Turnos y asignaciones

Las tablas `shift_definitions`, `shift_assignments` y `shift_change_logs` están aisladas por `current_tenant_id()`. Las escrituras de definiciones y asignaciones requieren un rol autorizado mediante `shift_actor_can_write`; el historial sólo se puede leer desde el tenant actual y se genera por RPC. `apply_shift_assignment` valida trabajador activo, definición activa, duración, fechas, intercambio y unicidad de asignación activa. `deactivate_shift_assignment` registra la desactivación en la misma transacción.

La integridad se refuerza con la FK compuesto `(tenant_id, shift_definition_id)`, constraints de fechas/duración/días, una única asignación activa por trabajador y los índices tenant-fecha-historial.

## Branding e identidad visual

`tenant_branding` permite lectura al tenant actual y reserva las escrituras al rol de plataforma. La aplicación usa `IdentityAvatar` para resolver foto real válida, Blobavatar y finalmente iniciales. Las URLs no HTTP(S), nombres largos, tildes, RUT vacío y errores de red no deben producir una imagen rota ni una excepción de renderizado.

## Notificaciones del Dev Team

La publicación se realiza exclusivamente mediante `publish_saas_notification`, que exige rol de plataforma y tenant activo. `saas_customer_notifications` valida contenido, prioridad y canal; sus índices soportan tenant, fecha, prioridad y no leídos. El trigger `protect_saas_notification_content` hace inmutables título, mensaje, prioridad, metadata, origen y tenant. El usuario sólo acusa lectura mediante `acknowledge_saas_notification`, que valida sesión y tenant actual y actualiza `read_at` y `read_by`.
