# BJSIG — Edge Functions recuperadas y vulnerabilidades principales

Fecha: 1 de noviembre de 2026. Fuentes recuperadas del proyecto remoto BJSIG.

## Estado

Se recuperaron las cuatro funciones que faltaban en el ZIP, conservando el código desplegado y su árbol de imports:

- `worker-auth` — versión 46
- `worker-gdpr` — versión 13
- `harassment-report-submit` — versión 3
- `honeytoken-check` — versión 14

Las fuentes están incluidas bajo `supabase/functions/<function>/`. No se desplegaron cambios en Supabase.

## Vulnerabilidades principales

### `worker-auth` — alta

1. La función tiene `verify_jwt=false` y usa `SUPABASE_SERVICE_ROLE_KEY`; por ello toda autorización debe ser perfecta dentro de cada handler.
2. `set_initial_password` acepta solo `email` y `password`, sin exigir el JWT del usuario ni una prueba del secreto temporal. Un atacante que conozca un correo autorizado puede intentar tomar control de una cuenta de trabajador. Debe requerir un token de activación de un solo uso, expiración y vinculación a email/tenant.
3. `check_account` devuelve `worker_rut` completo y distingue `exists`, `has_auth_user` y expiración: permite enumeración de identidad y estado de activación.
4. `change_password` valida el `current_password` del email enviado, pero no vincula explícitamente el JWT al mismo usuario/email; un token válido de otra cuenta puede usarse como transporte.
5. `reset` deriva `redirectTo` del header `Referer`; debe usar una allowlist fija de orígenes, no una URL controlada por el cliente.
6. `clientTracking` y `logAction` recopilan GPS, fingerprint, cookies, user-agent, viewport y referrer durante el pre-login; es minimización de datos insuficiente y amplía el impacto de una fuga.

### `worker-gdpr` — alta

1. Usa service role para anonimizar/eliminar y solo comprueba `is_admin`; no comprueba explícitamente un permiso GDPR ni registra una autorización MFA/AAL2.
2. La operación `delete` es irreversible y depende de un token estático `CONFIRMAR`; falta un flujo de confirmación fuerte, idempotencia y registro de un motivo.
3. Debe verificarse que los RPC `anonymize_worker` y `delete_worker_gdpr` vuelvan a validar tenant, actor y alcance; no se debe confiar solo en el tenant resuelto en la función.

### `harassment-report-submit` — alta

1. Si `resolveTenantId` falla, continúa con `tenant_id=null` y escribe con service role, pudiendo crear denuncias fuera del tenant. Debe fallar cerrado.
2. No comprueba un permiso específico para presentar denuncias ni vincula `reporter_worker_rut` al usuario autenticado cuando `anonymous=false`.
3. La respuesta devuelve `report_id` y `legal_deadline`; debe revisarse si esa combinación puede facilitar correlación en reportes anónimos.

### `honeytoken-check` — media/alta

1. Cualquier sesión autenticada que resuelva tenant puede consultar el endpoint; no existe comprobación de permiso de seguridad ni de que el RUT corresponda al actor.
2. Compara el RUT recibido con todos los honeytokens y registra el RUT crudo en `activity_logs`; debe minimizar y hashear el identificador.
3. El resultado booleano permite probar RUTs y detectar honeytokens; debe responder de forma uniforme y aplicar rate limiting.

## Problemas comunes

- Las cuatro funciones repiten una implementación CORS que termina en `Access-Control-Allow-Origin: *`, incluso para endpoints autenticados.
- Las funciones usan service role y escriben directamente en tablas; los RPC deben volver a validar límites de tenant y permisos.
- Los errores operativos pueden filtrar diferencias de estado en las rutas de login.

## Estado de remediación

Las fuentes se incorporaron al ZIP para auditoría, no se modificaron ni redeployaron. Las migraciones de índices y optimización RLS fueron aplicadas y verificadas en BJSIG. Las Edge Functions no fueron redeployadas; las vulnerabilidades descritas siguen abiertas.
