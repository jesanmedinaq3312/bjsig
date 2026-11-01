# Fase 0 — Inventario y contrato de acceso

**Proyecto Supabase:** BJSIG (`uoozvmrkbrbvbhsuphhm`)
**Fecha:** 1 de noviembre de 2026
**Modo:** solo lectura; no se ejecutaron migraciones, DDL, DML, cambios de RLS ni despliegues Edge.

## Resultado ejecutivo

El proyecto remoto está `ACTIVE_HEALTHY` en `us-west-2` sobre PostgreSQL 17.6.1. El catálogo remoto muestra que las tablas públicas con datos de negocio tienen RLS habilitado y, salvo tablas de catálogo/control (`tenants`, `saas_plans`, `saas_demo_operators`), usan `tenant_id`. La base remota contiene migraciones históricas adicionales a las 38 migraciones entregadas en este checkout; su último estado remoto llega a `worker_qr_scan_ownership_and_grants` (migración remota `20261101191608`).

La auditoría de Supabase reporta tres grupos que requieren revisión, no aplicación automática:

- 1 función `SECURITY DEFINER` ejecutable por `anon`: `public.fetch_public_tenant_branding(text)`. La llamada puede ser intencional para la landing pública, pero debe limitarse al contrato mínimo de branding público.
- 47 funciones `SECURITY DEFINER` ejecutables por `authenticated`. Varias son RPC de control de plataforma, tenant, MFA, turnos y operación; no se debe hacer `REVOKE` masivo porque puede romper flujos legítimos. Se requiere matriz función × actor × tenant antes de cambiar grants.
- 87 claves foráneas sin índice de cobertura según el asesor de rendimiento. El asesor también reporta 144 políticas RLS con llamadas de `auth.*`/`current_setting()` sin el patrón init-plan `(select ...)`. Son candidatos de rendimiento, pero requieren consolidación para evitar índices redundantes y regresiones de RLS.

## Inventario local

El checkout contiene migraciones hasta `20261101000100_worker_qr_scan_ownership_and_grants.sql` y solo estas funciones Edge:

- `_shared/authz.ts`
- `admin-user-manage`
- `check-email-allowed`
- `log-activity`
- `send-tenant-onboarding`

No están presentes las fuentes de `worker-auth`, `worker-gdpr`, `harassment-report-submit` ni `honeytoken-check`, aunque existen consumidores locales de `worker-auth`. Esas funciones quedan bloqueadas para auditoría/despliegue hasta recuperar sus fuentes reales.

## Hallazgos de autorización

La aplicación local todavía ofrece `/trabajador` sin sesión y, después de autenticar, `src/App.tsx` permite `allowWorkerPortal: true` para el flujo de trabajador. `src/views/WorkerAuth.tsx` usa `worker-auth` anónimo, solicita GPS antes de autenticar y registra eventos de login. Esto no demuestra por sí solo una vulnerabilidad remota, pero no permite certificar el requisito de “solo Dev Team” sin revisar y alinear el Edge Function y las políticas de datos.

La autoridad de autorización debe permanecer en RPC/RLS/Edge Functions; el frontend no debe ser la única barrera. Antes de decidir si se elimina el acceso `worker` o se mantiene como login público sin acceso a datos, deben confirmarse los roles exactos del Dev Team y el alcance funcional del portal.

## Hallazgos de aplicación para la siguiente fase

- `supabase/functions/_shared/authz.ts` contiene `canManageAccount`; requiere pruebas de allow/deny por rol y por cuenta objetivo.
- `supabase/functions/send-tenant-onboarding/index.ts` acepta `temporary_password` y URLs suministradas por payload; requiere revisión para activación de un solo uso, dominios permitidos y scope de tenant.
- `src/components/QrCardGenerator.tsx` usa `document.write`; debe reemplazarse por asignación segura de texto/DOM antes de considerar cerrado el riesgo XSS.
- `admin-user-manage` genera o acepta contraseñas; debe validar la política server-side y exigir AAL2 donde corresponda.
- La revisión de privacidad debe retirar del payload pre-login GPS, fingerprint, ID de dispositivo y otros metadatos salvo justificación documentada y decisión legal.

## Matriz provisional de acceso

| Actor | Rutas | Datos/RPC | Estado |
|---|---|---|---|
| Anónimo | Landing, documentos legales, login | Branding público limitado; no datos operativos | Parcialmente verificado |
| Dev Team / platform owner | `/admin-saas`, tenants asignados y operaciones de plataforma | RPC de plataforma con `is_platform_owner()`/contrato equivalente | Verificar con pruebas autenticadas |
| Roles tenant operativos | `/[tenant]/admin/*` según permisos y plan | RLS tenant-scoped y RPC autorizadas | Verificar con dos tenants |
| Worker | `/trabajador` y portal personal | `worker-auth`, datos personales y solicitudes | Bloqueado por el requisito Dev Team-only hasta decisión explícita |

## Diferencias y riesgos

1. El remoto incluye una cadena histórica de migraciones que no está representada de forma completa en el ZIP; no se debe asumir que el checkout es un esquema reproducible sin un dump de esquema.
2. El catálogo remoto confirma RLS habilitado en las tablas públicas inspeccionadas, pero esta consulta no certifica el contenido de cada expresión `USING`/`WITH CHECK`, ni el comportamiento real por actor.
3. Las alertas de `SECURITY DEFINER` no distinguen por sí solas entre una función correctamente protegida internamente y un grant demasiado amplio; se requiere inspección del cuerpo y contrato.
4. Las alertas de índices no justifican crear 87 índices automáticamente: varias claves compuestas pueden compartir prefijos y cada índice empeora escrituras.

## Próximo lote propuesto — requiere revisión antes de SQL remoto

1. Recuperar las cuatro Edge Functions faltantes y revisar fuentes completas.
2. Obtener un dump de esquema sin datos, incluyendo funciones, grants, políticas e índices, y compararlo con migraciones locales.
3. Preparar cambios locales de bajo riesgo: eliminar `document.write`, tests de `canManageAccount`/scope/contraseñas y reducir payload pre-login.
4. Crear una matriz de contrato para las funciones `SECURITY DEFINER` y proponer solo los `REVOKE/GRANT` exactos.
5. Priorizar índices basados en consultas reales y `EXPLAIN`, empezando por tablas de solicitudes, marcajes, trabajadores y auditoría.
6. Probar en staging aislado con Dev Team, dos tenants, operador, manager y worker. No usar la base compartida para pruebas destructivas.

**Regla de cambio:** cualquier SQL sobre la base compartida debe presentarse primero con texto exacto, objetos afectados, verificación y rollback, y ejecutarse solo después de una aprobación específica del SQL.
