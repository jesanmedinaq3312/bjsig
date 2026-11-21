# Inventario remoto de catálogo — Iteración 5

**Fecha de corte:** 21 de noviembre de 2026 (UTC)  
**Proyecto:** `BJSIG`  
**Project ref:** `uoozvmrkbrbvbhsuphhm`  
**Estado observado:** `ACTIVE_HEALTHY`  
**Región:** `us-west-2`  
**PostgreSQL observado:** `17.11.0.003`

## Alcance y límites

Este informe documenta únicamente metadatos remotos y la comparación con el checkout local. Se consultaron migraciones, tablas, columnas, estado RLS, políticas, funciones SQL, privilegios `EXECUTE` y metadatos/fuentes empaquetadas de Edge Functions. **No se leyeron filas de negocio, no se ejecutaron RPC de negocio, no se aplicó DDL/migración, no se desplegaron Edge Functions y no se usó `service_role` como actor de prueba.**

La consulta de tablas amplia de Supabase quedó conservada por la herramienta en `/home/ubuntu/.mcp/tool-results/2026-11-21_00-06-46.475119937_supabase_list_tables_a490b73a.json`; este documento sólo resume la evidencia relevante.

## Migraciones y diferencia local/remota

El historial remoto contiene migraciones hasta `20261117172816 / public_landing_hero_link`. El checkout local contiene además `20261119010000_iteration4_worker_portal_rls_rpc.sql`, por lo que la migración de Iteración 4 **no está registrada remotamente**.

La diferencia es intencional y bloqueada: la migración local crea `worker_portal_access_allowed(uuid,text,text)`, `authorize_worker_portal(uuid,text,text)` y cuatro políticas `AS RESTRICTIVE`. No se debe aplicar al proyecto compartido sin presentar el SQL exacto, impacto, verificación y rollback y obtener aprobación específica.

## Tablas, columnas y RLS observados

Las tablas objetivo consultadas tienen `relrowsecurity = true` y `relforcerowsecurity = false`:

- `workers`: `tenant_id` y `rut`.
- `worker_requests`: `tenant_id` y `worker_rut`.
- `qr_scan_events`: `tenant_id` y `worker_rut`.
- `attendance_rectifications`: `tenant_id` y `worker_rut`.
- `attendance_reports`: `tenant_id` y `worker_rut`.
- `worker_bank_accounts`: `tenant_id` y `worker_rut`.
- `circular_acknowledgments`: `tenant_id` y `worker_rut`.

Se observaron además columnas sensibles o de auditoría en el catálogo —por ejemplo `base_salary`, `account_number`, `summary`, hashes, GPS y metadatos de dispositivo—, pero sus valores no fueron consultados.

## Políticas RLS relevantes

El catálogo remoto ya contiene límites tenant/RUT, MFA, sesión anónima y GPS en las tablas revisadas:

- `worker_requests`: `tenant_boundary_worker_requests`, más bloqueos de sesión anónima y GPS. La política tenant permite roles operativos y `developer`, pero no existe todavía la política `iteration4_worker_portal_boundary`.
- `qr_scan_events`: `tenant_boundary_qr_scan_events`, `attendance_qr_insert_authorized`, además de sesión anónima y GPS. El worker queda restringido a su RUT normalizado.
- `attendance_rectifications`: lectura tenant/RUT para worker y roles autorizados; inserción restringida a personal habilitado y estado `pendiente`.
- `attendance_reports`: lectura tenant/RUT para worker y roles autorizados; no aparece la política restrictiva de Iteración 4.
- `workers`: `op_workers` por tenant y una política de lectura para platform owner, además de MFA, sesión anónima y GPS.
- `worker_bank_accounts`: límites tenant, acceso sensible por worker/RUT y roles administrativos, MFA, sesión anónima y GPS.
- `circular_acknowledgments`: límite tenant/RUT del worker, MFA, sesión anónima y GPS.

**Conclusión:** el remoto tiene hardening previo, pero aún no refleja el wrapper central de Iteración 4. La presencia de políticas históricas no equivale a la validación T01–T16 ni prueba que los flujos combinados sean correctos.

## Funciones SQL y privilegios

Funciones `SECURITY DEFINER` observadas en `public` incluyen `attendance_summary`, `attendance_summary_authorized`, `current_tenant_id`, `current_user_role`, `current_worker_rut`, `is_platform_owner`, `is_worker` y `set_active_tenant`. Todas mostraron `search_path` explícito; `attendance_summary` y `attendance_summary_authorized` usan `search_path = ""`, mientras helpers de autorización usan `public` y `pg_temp`.

Privilegios relevantes observados:

- `attendance_summary`: `EXECUTE` para `authenticated`; no apareció `anon`.
- `attendance_summary_authorized`: sólo apareció `postgres` en el catálogo consultado.
- Helpers de sesión/rol (`current_tenant_id`, `current_user_role`, `current_worker_rut`, `is_platform_owner`, `is_worker`, `set_active_tenant`): `EXECUTE` para `authenticated`; no apareció `anon`.
- No existe en remoto, al momento del corte, `worker_portal_access_allowed` ni `authorize_worker_portal`.

## Edge Functions remotas

| Función | Versión | `verify_jwt` | SHA remoto (`ezbr_sha256`) | Reconciliación |
| --- | ---: | --- | --- | --- |
| `worker-auth` | 53 | `false` | `869ee06bf5415aa23a35ec1a519e3727c1ac471107ac419ed12b8b07effc1b18` | Estructura y handlers coinciden semánticamente con la fuente local recuperada; requiere revisión final de empaquetado antes de desplegar |
| `worker-gdpr` | 18 | `true` | `6673f8c6689cc78a0dd98502ac9ba1c65f9fb1b77a92d0d51a350c7fa9abca2f` | La fuente recuperada coincide con el flujo local visible: sesión, GPS, MFA AAL2, tenant y RPC GDPR |
| `harassment-report-submit` | 8 | `true` | `530ab0bbb51743d605da8265a739ba7a6b9861b8f975937aa2ff96f1cd33c327` | Coincide con el flujo local visible, incluido fallback de tenant worker por `allowed_emails`, límites y binding de RUT |
| `honeytoken-check` | 22 | `true` | `03218e65b445c8a7e809bbe6208be6aca25cbda9b572aa9f099505f7e902868c` | Coincide con el flujo local visible; usa consulta server-side de honeytokens y limita por tenant |

Los SHA remotos son de los paquetes desplegados y no son directamente comparables con los SHA individuales de archivos locales. Por ello la reconciliación se clasifica como **semántica/estructural, no byte a byte**. La recuperación no autoriza ningún despliegue.

Observación para revisión posterior: `honeytoken-check` remoto y local usan `.select("*")` sobre una tabla interna. No se leyó esa tabla en esta fase; la minimización de columnas debe evaluarse en una revisión de código separada antes de modificarla.

## Bloqueos y siguiente paso seguro

1. Iteración 4 continúa activa: falta preparar y ejecutar pruebas aisladas T01–T16.
2. Iteración 5 continúa planificada: no existe staging/base descartable identificado.
3. La migración local de Iteración 4 no se aplica a `BJSIG`.
4. Las Edge Functions permanecen sin cambios; cualquier diferencia futura debe resolverse con diff exacto, pruebas y aprobación.
5. El siguiente paso recomendado es obtener un entorno aislado, cargar sólo fixtures sintéticos `TENANT_A`/`TENANT_B` y probar RLS/RPC con sesiones reales de prueba, nunca con `service_role`.

**Resultado del inventario:** completado como evidencia de catálogo; no es cierre de Iteración 4 ni aprobación de producción.
