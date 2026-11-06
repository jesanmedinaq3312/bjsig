# Cierre de pendientes de ciberseguridad — BJSIG

**Fecha:** 23 de septiembre de 2026  
**Proyecto Supabase:** `BJSIG` (`uoozvmrkbrbvbhsuphhm`)  
**Alcance:** frontend React, migraciones SQL y Edge Functions desplegadas mediante el MCP de Supabase.

## Controles completados

Se sustituyó el falso segundo factor basado en OTP de correo del login administrativo por MFA TOTP real de Supabase. El flujo ahora comprueba el nivel AAL de la sesión, desafía un factor TOTP verificado o muestra el enrolamiento mediante QR y clave manual, y mantiene bloqueadas las consultas de negocio mientras la sesión permanezca en AAL1. Las cuentas de trabajador se rechazan antes de iniciar el enrolamiento administrativo y deben utilizar el portal de trabajador.

La Edge Function `log-activity` fue desplegada como **versión 18** con `verify_jwt=true`. La función deriva la identidad desde el JWT validado, exige AAL2, valida el tenant activo, verifica la política de IP, limita los identificadores a UUID válidos y filtra los detalles antes de persistirlos. La función ya no acepta ni guarda desde el navegador correo, rol, `session_id`, duración de sesión, fingerprint, cookies, GPS, referrer ni viewport.

Se aplicó la migración `activity_logs_server_only`. Los roles `anon` y `authenticated` no tienen privilegios efectivos de `INSERT`, `UPDATE`, `DELETE` ni `TRUNCATE` sobre `public.activity_logs`; `authenticated` conserva únicamente `SELECT`, sujeto a RLS. La escritura queda concentrada en la Edge Function confiable, que usa el service role sólo después de validar sesión, MFA, tenant e IP.

El endpoint público `check-email-allowed` fue desplegado como **versión 31** con respuesta uniforme. Ya no devuelve rol, condición de trabajador, existencia de identidad ni pertenencia a la allow-list, evitando enumeración de cuentas. Conserva rate limiting y la autenticación real queda a cargo del login, RLS y funciones de autorización.

La auditoría del navegador fue reducida a contexto de evento mínimo. No envía automáticamente cookies, fingerprint, GPS, identificadores de dispositivo ni datos de sesión. Los reintentos offline no realizan inserciones directas y sólo se procesan mediante la Edge Function autenticada.

Se añadió un override de `uuid` para eliminar el advisory transitivo proveniente de ExcelJS. La auditoría de dependencias quedó en **0 vulnerabilidades** de producción.

## Verificación ejecutada

| Verificación | Resultado |
|---|---:|
| `npm run typecheck` | **0** |
| `npm run lint` | **0** errores; 121 warnings preexistentes no bloqueantes |
| `npm run build` | **0** |
| `npm audit --omit=dev` | **0 vulnerabilidades** |
| Edge Function `log-activity` | Activa, versión 18, JWT requerido |
| Edge Function `check-email-allowed` | Activa, versión 31, endpoint público controlado |
| Grants efectivos `activity_logs` | `anon`: sin privilegios; `authenticated`: sólo `SELECT` |
| Vista previa | HTTP 200 local y pública en `https://4173-ibyda14y2j4yvpbbou49a-998a8bb0.us1.manus.computer/` |

## Avisos residuales de Supabase

La auditoría SQL reproducible identificó **48 funciones `SECURITY DEFINER` en total**: 42 siguen ejecutables por `authenticated` porque son helpers de contexto, RPC de lectura/escritura o funciones necesarias por RLS; 1 es sólo de servicio; y las restantes son funciones internas o triggers. El Security Advisor partía de 43 advertencias porque `is_platform_identity(text)` estaba incluida; esa RPC no es utilizada por el frontend ni por las Edge Functions y ahora tiene `EXECUTE` revocado para `public`, `anon` y `authenticated`. Las 42 restantes deben seguir una matriz función por función antes de migrarlas a un esquema privado: revocarles indiscriminadamente rompería contratos autorizados.

La auditoría encontró y corrigió un bypass relevante: `mfa_required_for_current_user()` devolvía siempre `false`, por lo que las políticas RLS con nombre `bjsigapp_mfa_aal2_required` no exigían realmente AAL2. La migración `20260923224500_enforce_mfa_and_auth_guards.sql` ahora exige AAL2 a usuarios autenticados no trabajadores y añade guardias `auth.uid()` a las RPC de escritura identificadas sin comprobación explícita. La función devuelve `false` en una consulta ejecutada sin sesión porque `auth.uid()` es nulo; eso es el comportamiento esperado para el contexto anónimo y no constituye un bypass de un usuario autenticado.

El Advisor también informa avisos sobre políticas del esquema `cron` y políticas RLS que clasifica como posibles accesos anónimos. Las políticas `cron` pertenecen al esquema operativo de Supabase y no fueron modificadas desde la aplicación. Las políticas de las tablas BJSIG usan el rol `authenticated`; deben verificarse con sesiones reales de staging porque el Advisor puede agruparlas como posibles accesos anónimos por la forma de sus expresiones.

Las políticas MFA y de aislamiento multi-tenant permanecen activas en las tablas protegidas. El aviso residual no se interpreta como autorización para reabrir escrituras: la evidencia de grants confirma que `activity_logs` conserva una ruta de escritura exclusivamente server-side.

## Archivos principales modificados

- `src/hooks/useAuth.ts`: MFA TOTP, challenge, enrolamiento y bloqueo de sesión AAL1.
- `src/views/Auth.tsx`: interfaz QR y verificación de código TOTP.
- `src/lib/audit.ts`: auditoría mínima y sin inserción directa.
- `supabase/functions/log-activity/index.ts`: logger server-side endurecido.
- `supabase/functions/check-email-allowed/index.ts`: respuesta uniforme anti-enumeración.
- `supabase/migrations/20260923223000_activity_logs_server_only.sql`: grants append-only.
- `supabase/migrations/20260923224500_enforce_mfa_and_auth_guards.sql`: cierre de bypass MFA, guardias de sesión y revocación de RPC obsoleta.
- `scripts/audit_security_definer.sql`: inventario y clasificación reproducible de funciones privilegiadas.
- `package.json` y `package-lock.json`: override seguro de `uuid`.


## Remediación local adicional — 6 de noviembre de 2026

Este bloque documenta cambios preparados en el checkout local; **no significa que se hayan desplegado en Supabase ni publicado en GitHub**.

- Se integró Cloudflare Turnstile en las acciones públicas de `worker-auth`, en login con contraseña, OTP/magic link, signup y recuperación de Supabase Auth. Los resets de trabajador usan dos tokens distintos porque el token validado por la Edge Function no puede reutilizarse en Supabase Auth. La configuración del CAPTCHA en el Dashboard todavía requiere una acción operativa.
- Se reforzaron anti-enumeración y rate limits combinados con IP confiable, redirects fijos/allowlist, CORS por allowlist, AAL2 en funciones privilegiadas, validación de URL en Zod, credenciales de onboarding fuera del correo, política de contraseñas compartida, protección de tarjetas QR y eliminación de datos de ubicación/tracking pre-login.
- Se retiraron valores productivos por defecto del cliente Supabase. Se añadieron headers HTTP, Dependabot, CI, comprobación de catálogo RLS y E2E multi-tenant autenticado condicional, habilitables únicamente con credenciales de staging.

| Verificación local | Resultado |
|---|---:|
| `bun run typecheck` | **0** |
| `bun run test` | **29 passed** |
| `deno test --allow-env --allow-net supabase/functions/worker-auth/tests` | **18 passed** |
| `bun run lint` | **0 errores**, 2 warnings no bloqueantes de Fast Refresh |
| `bun run build` | **0** |
| `bun audit --production` | **0 vulnerabilidades** |
| `bun audit` completo | **1 advisory moderado** transitivo de `minimatch` en dependencias de desarrollo |

Antes del despliegue siguen pendientes la configuración de CAPTCHA/redirects/signups en Supabase Auth, secretos y allowlists de Edge Functions, rotación de secretos afectados y ejecución de staging. La CI de RLS y E2E autenticado sólo se activan al configurar sus variables/secrets de staging. Los plazos de retención y la integración/umbrales de alertas requieren una política y un proveedor aprobados; no se inventaron ni se configuraron desde el checkout local. Ver `SECURITY_DEPLOYMENT_CHECKLIST.md`.
