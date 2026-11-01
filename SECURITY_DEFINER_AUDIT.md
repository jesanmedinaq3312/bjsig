# Auditoría de funciones `SECURITY DEFINER`

**Proyecto:** BJSIG (`uoozvmrkbrbvbhsuphhm`)  
**Fecha:** 23 de septiembre de 2026  
**Método:** consulta reproducible guardada en `scripts/audit_security_definer.sql`, ejecutada contra el catálogo PostgreSQL mediante el MCP de Supabase.

## Resultado ejecutivo

El catálogo real contiene **48 funciones `SECURITY DEFINER` públicas**. El Security Advisor reportaba inicialmente 43 advertencias porque 43 eran ejecutables por `authenticated`. Después del análisis se revocó `EXECUTE` de `public.is_platform_identity(text)`, que no tiene uso en el frontend ni en las Edge Functions. El estado efectivo queda en **42 funciones ejecutables por `authenticated`**, una función sólo para `service_role` y funciones internas/triggers sin exposición de usuario.

La advertencia del Advisor es una señal de superficie expuesta, no una prueba individual de explotación. Las 42 funciones restantes deben conservarse temporalmente porque forman parte de los contratos de RLS, selección de tenant y operaciones autorizadas. Cada una tiene `search_path` fijado, y las RPC de escritura contienen controles de autenticación, tenant y/o rol, aunque el patrón de revisión automática no sustituye pruebas negativas con sesiones reales.

## Clasificación automática

| Grupo | Criterio | Tratamiento |
|---|---|---|
| `INTERNAL_TRIGGER` | Función de trigger o `protect_*` | Mantener no ejecutable por usuarios; revisar sólo el trigger y su `search_path` |
| `INTERNAL_SERVICE_ONLY` | No ejecutable por `authenticated`, sólo servicio | Mantener cerrado; revisar el job que la invoca |
| `PRIVILEGED_WRITE_RPC` | Contiene operaciones de escritura | Mantener sólo con autenticación, tenant y autorización server-side; añadir prueba negativa |
| `PRIVILEGED_READ_RPC` | Devuelve datos mediante lectura o `RETURN QUERY` | Reducir columnas y validar tenant/rol; migrar a esquema privado si no requiere frontend |
| `IDENTITY_OR_POLICY_HELPER` | Helper de identidad, rol o RLS | Mantener sólo si RLS o el cliente lo necesita; evitar aceptar identidades arbitrarias |

## Correcciones aplicadas

### MFA real en RLS

La función `mfa_required_for_current_user()` devolvía `false` constante. Eso hacía que las políticas con nombre `bjsigapp_mfa_aal2_required` no exigieran realmente AAL2. La migración `enforce_mfa_and_auth_guards` la reemplaza por una comprobación que devuelve `true` para una sesión autenticada cuyo rol no sea `worker`. La política RLS exige entonces que el claim `aal` sea `aal2`.

Una llamada sin sesión devuelve `false` porque `auth.uid()` es nulo; esa ruta se ejecuta fuera del conjunto `authenticated` de las políticas y no concede acceso a las tablas protegidas. La validación definitiva requiere pruebas con tokens reales de staging.

### Guardias de escritura

Se añadió `AUTH_REQUIRED` a las funciones que el inventario marcó sin una comprobación explícita de sesión:

- `clear_active_tenant()`;
- `delete_worker_cascade(text, uuid)`;
- `epp_adjust_stock(uuid, text, integer)`;
- `set_active_tenant(uuid, text)`;
- `update_saas_tenant_branding(uuid, text, text, text, text, boolean, text)`;
- `update_saas_tenant_default_view(uuid, text)`.

También se mantuvieron las comprobaciones de tenant y rol existentes. No se revocaron estas RPC porque el frontend utiliza al menos `clear_active_tenant`, `set_active_tenant`, `epp_adjust_stock` y `update_saas_tenant_branding`.

### RPC obsoleta

`is_platform_identity(text)` no tiene referencias en `src`, `supabase/functions` ni `e2e`. Se revocó su ejecución para `public`, `anon` y `authenticated`. La evidencia final confirma:

| Rol | Puede ejecutar `is_platform_identity(text)` |
|---|---:|
| `anon` | No |
| `authenticated` | No |

## Trabajo pendiente controlado

Las 42 funciones que siguen ejecutables por `authenticated` se deben revisar por contrato, no mediante un `REVOKE` masivo. Para cerrar el Advisor sin romper la aplicación se debe:

1. probar cada RPC con usuario anónimo, usuario sin permiso, usuario del tenant A contra tenant B y usuario autorizado;
2. mover helpers sólo internos a un esquema privado;
3. dejar en `public` únicamente las funciones llamadas por el cliente o necesarias para RLS;
4. limitar los tipos y columnas de retorno;
5. registrar operaciones privilegiadas;
6. repetir el Security Advisor y la suite E2E después de cada grupo de migraciones.

## Evidencia de validación

- `npm run typecheck`: 0.
- `npm run lint`: 0 errores; 121 warnings existentes no bloqueantes.
- `npm run build`: 0.
- Preview pública: HTTP 200.
- `activity_logs`: `anon` sin privilegios; `authenticated` sólo `SELECT`.
- `is_platform_identity(text)`: ejecución revocada para `anon` y `authenticated`.

> No se declara que las 42 funciones restantes sean automáticamente vulnerables ni que una auditoría estática garantice ausencia absoluta de vulnerabilidades. El hallazgo explotable identificado en esta pasada —el bypass MFA constante— fue corregido y debe validarse ahora con pruebas E2E autenticadas en staging.
