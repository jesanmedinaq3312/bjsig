# worker-auth — AAL2, rate limiting y benchmark

Fecha: 1 de noviembre de 2026
Proyecto: BJSIG

## 1. Diseño recomendado de AAL2

`worker-auth` está desplegada con `verify_jwt=false` porque contiene acciones pre-login (`check_rut`, `check_account` y `request_reset`). Por eso no se debe exigir AAL2 a toda la función: el usuario todavía no tiene sesión en esas acciones. La función debe separar explícitamente las acciones públicas de las acciones sensibles.

### Acciones públicas, sin AAL2

- `check_rut`: respuesta genérica y mínima; no devolver RUT completo, email ni estado detallado de Auth.
- `check_account`: respuesta genérica para evitar enumeración.
- `request_reset`: respuesta genérica; `redirectTo` debe salir de una allowlist fija de orígenes.

Estas acciones requieren rate limiting por IP, RUT/email normalizado y una clave global de endpoint.

### Acciones sensibles

`set_initial_password` no debe confiar solo en `email` y `password`. El flujo recomendado es:

1. El administrador genera un `activation_token` aleatorio, de un solo uso, con expiración corta (por ejemplo, 15 minutos), hash almacenado en la base y vinculado a email, tenant y worker.
2. El trabajador presenta el token; la Edge Function consume el token atómicamente y crea/actualiza la contraseña.
3. Se fuerza login normal y enrolamiento MFA TOTP.
4. Para `change_password`, datos personales, exportaciones y operaciones administrativas, el endpoint exige un JWT cuyo `aal` sea `aal2`.

En una Edge Function autenticada, el patrón es crear un cliente Supabase con el JWT recibido, llamar `auth.getUser(token)` y `auth.getAuthenticatorAssuranceLevel()`, y rechazar si `currentLevel !== 'aal2'` o si `nextLevel` indica que MFA aún no está verificado. También debe comprobarse el usuario objetivo contra `user.id`/`user.email`; no se debe tomar el email objetivo desde el body como autoridad.

El enrolamiento y la verificación TOTP se realizan en el cliente con Supabase Auth (`mfa.enroll`, `mfa.challenge` y `mfa.verify`). La Edge Function solo autoriza la operación sensible cuando la sesión resultante tiene AAL2. Debe existir recuperación separada para usuarios que pierdan su factor; nunca se debe convertir un reset de contraseña en una vía para saltarse AAL2.

Ejemplo conceptual para el guard server-side:

```ts
const authHeader = req.headers.get('Authorization');
if (!authHeader?.startsWith('Bearer ')) return json({ error: 'SESSION_REQUIRED' }, 401);
const jwt = authHeader.slice('Bearer '.length);
const userClient = createClient(url, anonKey, {
  global: { headers: { Authorization: `Bearer ${jwt}` } },
});
const { data: userData, error: userError } = await userClient.auth.getUser(jwt);
if (userError || !userData.user) return json({ error: 'SESSION_INVALID' }, 401);
const { data: aal, error: aalError } = await userClient.auth.getAuthenticatorAssuranceLevel();
if (aalError || aal.currentLevel !== 'aal2') return json({ error: 'AAL2_REQUIRED' }, 403);
// Usar userData.user.id/email; ignorar un email objetivo no vinculado a esa identidad.
```

La función no debe exponer `SUPABASE_SERVICE_ROLE_KEY` a ningún cliente. El cliente service-role queda solo para operaciones server-side mínimas y los RPC llamados con él deben volver a validar tenant, actor y permiso.

## 2. Rate limiting recomendado

El proyecto ya tiene `check_login_rate_limit(text, integer, integer)` y `cleanup_login_attempts()`, con ejecución revocada a `public`, `anon` y `authenticated`, y otorgada a `service_role`. `worker-auth` ya invoca el RPC desde `checkRateLimit`, pero la política debe endurecerse:

- `check_rut`: máximo 3 intentos por RUT normalizado/15 min y 10 por IP/15 min.
- `check_account`: máximo 5 por email normalizado/15 min y un límite independiente por IP.
- `request_reset`: máximo 3 por email/15 min, 10 por IP/15 min y un límite global por endpoint.
- `set_initial_password`: máximo 5 por hash de activation token/15 min y 5 por IP.
- `change_password`: máximo 5 por user ID/15 min y 10 por IP; los fallos deben contar antes de validar la contraseña.
- Usar una clave HMAC o hash con secreto server-side para no almacenar RUT/email en claro como identificador de rate limit.
- La decisión debe ser atómica en PostgreSQL (`INSERT ... ON CONFLICT` o RPC SECURITY DEFINER con lock/advisory lock); nunca hacer `SELECT count` y luego `INSERT` en dos pasos.
- Responder `429` con `Retry-After` y un mensaje genérico. No revelar si el email existe.
- Aplicar un límite global de emergencia y, si el volumen crece, mover el contador de alta frecuencia a Redis/Upstash; PostgreSQL queda como auditoría y fallback.

Antes de desplegar, añadir pruebas para: concurrencia de dos requests simultáneos, expiración de ventana, límites separados por IP/identidad, y fail-closed si el RPC no responde.

## 3. Benchmark SQL realizado

Se compararon cuatro predicados representativos con `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` y `LIMIT 50`.

- **Antes simulado:** `enable_indexscan=off`, `enable_bitmapscan=off` y `enable_indexonlyscan=off` en la sesión. No se borraron índices.
- **Después:** plan normal con los índices presentes.
- Los predicados usan valores no existentes para no devolver datos de negocio. Esto mide selección de plan y coste de acceso, no capacidad bajo carga.

| Consulta | Antes: plan / tiempo | Después: plan / tiempo | Resultado |
|---|---:|---:|---|
| `activity_logs` por `(tenant_id, worker_rut)` | Seq Scan, 0.161 ms, coste 3.55 | Index Only Scan `idx_activity_logs_tenant_id_worker_rut`, 0.131 ms, coste 2.36 | 18.6% menos tiempo observado; 33.5% menor coste estimado |
| `worker_requests` por `(tenant_id, worker_rut)` | Seq Scan, 0.120 ms, coste 1.04 | Seq Scan, 0.070 ms, coste 1.04 | La tabla tiene ~3 filas; el optimizador correctamente evita el índice |
| `payroll_items` por `(tenant_id, worker_rut)` | Seq Scan, 0.129 ms, coste 3.45 | Index Scan `idx_payroll_items_tenant`, 0.060 ms, coste 2.04 | El plan usa un índice existente por tenant; la tabla tiene ~30 filas |
| `invoices` por `customer_id` | Seq Scan, 0.073 ms, coste 11.50 | Index Scan `idx_invoices_customer_id`, 0.056 ms, coste 2.36 | 23.3% menos tiempo observado; 79.5% menor coste estimado |

Estimaciones de cardinalidad de las tablas usadas: `activity_logs` 37 filas, `payroll_items` 30, `worker_requests` 3 e `invoices` 0. Por ello los milisegundos absolutos no son representativos de producción; lo importante es la transición Seq Scan → Index Scan/Index Only Scan y el coste estimado. El índice de cobertura de `worker_requests` está disponible, pero con tres filas PostgreSQL prefiere un Seq Scan.

Verificación post-migración:

- `uncovered_fk_count = 0` para las 87 FKs auditadas.
- `remaining_unwrapped_policies = 0` en la comprobación de `auth.uid()` y `current_setting()`.
- 260 políticas RLS públicas presentes.
- 0 tablas públicas sin RLS.

## 4. Próxima medición válida de producción

Cuando las tablas tengan volumen real, ejecutar cada consulta 30–100 veces en staging con valores existentes y representativos, separar `planning time` de `execution time`, revisar `BUFFERS`, y comparar p50/p95/p99 bajo concurrencia. No se recomienda usar `pgbench` directamente contra la base compartida sin una ventana y límites de carga acordados.
