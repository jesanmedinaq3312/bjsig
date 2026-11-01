# Informe de calidad y readiness de producción

**Aplicación:** BJSIG  
**Fecha:** 23 de septiembre de 2026

## Estado actual

| Control | Resultado |
|---|---|
| TypeScript | `npm run typecheck` — correcto |
| ESLint | `npm run lint` — correcto, sin warnings |
| Build | `npm run build` — correcto |
| E2E público | **21 passed** |
| E2E completo | **21 passed, 6 skipped, 0 failed** |
| Preview pública | HTTP 200 |
| Credencial de servicio en frontend | No detectada |
| Referencias a assets hasheados | Smoke test HTTP 200 para los primeros assets públicos |

## Corrección de warnings

Se eliminaron 74 advertencias de `@typescript-eslint/no-explicit-any` mediante tipos de dominio, conversiones explícitas y guardas para `unknown`. No se desactivó la regla globalmente.

Los avisos de Fast Refresh quedaron justificados sólo en módulos que intencionadamente exportan un componente junto con un Provider, hook, constante o helper estable. Los avisos de dependencias React se revisaron individualmente y se documentaron en línea donde añadir una función inestable habría creado recreaciones o loops. El resultado final de ESLint es limpio.

## Pruebas E2E

La suite pública valida la landing, navegación, rutas legales, CTA de WhatsApp, menú móvil, ausencia de overflow horizontal en 390/768/1440 px y bloqueo del panel administrativo sin sesión.

La suite completa ejecutó 27 casos: 21 pasaron y 6 fueron omitidos. Los omitidos son los escenarios multi-tenant autenticados que requieren dos usuarios admin, contraseñas de staging y, en el escenario de developer, tenants asignados. No se inventaron credenciales ni se usaron cuentas reales. Para ejecutar esos seis casos en CI se debe definir `E2E_REQUIRE_AUTH=true` junto con las variables de `.env.e2e.example`.

## Diagnóstico y corrección de OTP/magic link

Se verificó la cuenta de staging proporcionada sin conservar su contraseña en el proyecto. El login password de Supabase respondió correctamente y tanto el endpoint OTP como el endpoint de magic link aceptaron la solicitud HTTP con estado 200. Durante las pruebas se alcanzó temporalmente el límite de envío de correo de Supabase (`over_email_send_rate_limit`), por lo que los reintentos deben esperar la ventana indicada por Auth.

Se corrigieron dos errores de producto. Primero, el login administrativo estaba guardando un estado llamado `emailOtpStatus` aunque el segundo factor real es **TOTP MFA**, no un OTP enviado por email; esto podía mostrar una pantalla de código que nunca se había enviado. Segundo, el botón de magic link ejecutaba una validación previa con contraseña vacía; si `check-email-allowed` estaba rate-limited, el usuario recibía un mensaje genérico de servidor. Ahora el magic link no hace ese fallback con contraseña vacía, conserva el mensaje real de rate limit y limpia estados heredados de versiones anteriores. El código MFA de la aplicación autenticadora continúa siendo de seis dígitos.

La aplicación debe comunicar al usuario que el segundo factor administrativo se obtiene desde una aplicación autenticadora mediante TOTP. El correo se utiliza para el magic link o recuperación de contraseña, no como sustituto del MFA administrativo.

## Incidente de enrolamiento TOTP

La verificación directa de la cuenta DevTeam confirmó `currentLevel: aal1`, `nextLevel: aal1` y **cero factores TOTP**, por lo que el QR anterior no llegó a registrarse. Se añadió recuperación explícita de sesión antes de `listFactors`, `enroll`, `challenge` y `verify`; si el token se pierde, el cliente intenta renovarlo y muestra una instrucción clara para volver a iniciar sesión en vez de dejar el texto `Auth session missing!`.

Para completar el enrolamiento, el usuario debe abrir la preview en un único origen, cerrar pestañas antiguas de BJSIG, borrar los datos del sitio si persiste una sesión vieja, ingresar nuevamente email y contraseña, escanear el QR nuevo en Microsoft Authenticator y escribir inmediatamente el código de seis dígitos que muestra la aplicación. No se debe abrir el QR desde un segundo dominio ni desde otra preview, porque las sesiones de Supabase se almacenan por origen.

## Persistencia de sesión y Equipo Dev

El login de usuarios existentes ahora intenta `signInWithPassword` directamente; ya no consulta `check-email-allowed` antes de cada acceso. La validación pública queda reservada para el caso de credenciales inválidas en el que se evalúa si se trata de un administrador nuevo, y el magic link sólo se ofrece después de esa verificación y como última opción. Esto evita agotar el rate limit durante accesos normales de DevTeam.

El panel **Equipo Dev** dejó de leer `allowed_emails` directamente, ya que esa lectura está correctamente restringida por RLS. Se añadió y aplicó la RPC `fetch_platform_operators()`, que sólo permite acceso a un operador de plataforma y devuelve el correo, estado, permisos y memberships activas. La RPC `upsert_platform_operator()` ya estaba disponible para crear o actualizar miembros y la cuenta DevTeam fue verificada con `is_platform_owner=true`, `current_user_role=developer` y respuesta autorizada de la RPC.

## Diagnóstico de trabajadores no visibles

La base contiene 40 trabajadores distribuidos en cuatro empresas demo activas, con 10 trabajadores por empresa. La lectura REST respondía HTTP 200 pero devolvía cero filas para DevTeam porque la cuenta tenía `mfa_required_for_current_user() = true`, nivel actual `aal1` y cero factores TOTP; la política RLS `bjsigapp_mfa_aal2_required` oculta correctamente los datos sensibles hasta completar MFA. No se desactivó RLS ni se creó un bypass.

Se corrigió el frontend para que las sesiones restauradas en AAL1 también entren en el enrolamiento/desafío MFA antes de mostrar datos, y para que una empresa indicada por URL siempre se persista mediante `set_active_tenant`, incluso cuando no había tenant activo previo. La query de trabajadores ahora filtra explícitamente por el tenant seleccionado en vez de depender únicamente de un tenant global potencialmente antiguo. Después de completar el QR TOTP, la sesión tendrá AAL2 y las filas volverán a mostrarse respetando RLS.

## MFA TOTP opcional para Equipo Dev

La política para operadores `developer` ahora se controla mediante `allowed_emails.permissions.mfa_required`. El panel Equipo Dev incluye el selector **Exigir Microsoft Authenticator (MFA TOTP)**. Cuando se activa, el siguiente acceso muestra el QR y exige el código de seis dígitos; Microsoft Authenticator es compatible porque utiliza TOTP estándar. Cuando se desactiva para un operador developer, no se exige AAL2; los roles no trabajadores distintos de developer mantienen MFA obligatorio. La cuenta DevTeam verificada actualmente devuelve `mfa_required_for_current_user() = false` y puede leer 10 trabajadores de la empresa seleccionada sin desactivar RLS.

## Consumo y planes

El snapshot anterior era incorrecto: todas las empresas aparecían con `storage_bytes = 0` y sin cuota. Se aplicó el cálculo server-side `refresh_tenant_usage_daily`, que suma filas y `pg_column_size` únicamente de tablas de negocio con `tenant_id`, y registra conteo de registros, archivos lógicos, bytes y cuota de aplicación.

La medición actual devuelve: Austral 94 registros y 22.887 bytes; Costa 95 registros y 23.787 bytes; Norte 120 registros y 32.611 bytes; Valle 99 registros y 25.039 bytes; QA 3 registros y 1.066 bytes. Son bytes lógicos asignables, no sustituyen la medición física del proyecto Supabase.

Supabase Free tiene una cuota compartida de 500 MB de base de datos por proyecto y 1 GB de File Storage según la [página oficial de precios](https://supabase.com/pricing). La aplicación ahora conserva esa diferencia: el límite Supabase sigue siendo global, mientras que `saas_plans.storage_limit_bytes` representa una asignación interna por empresa. Se configuraron 500 MB para Básico y 8 GB para Profesional como catálogo de aplicación; estos valores no amplían la cuota real del proyecto. Antes de producción debe revisarse que las asignaciones profesionales no se interpreten como capacidad disponible del proyecto Free.

## MFA opcional para DevTeam

La configuración de cada operador DevTeam incluye ahora `permissions.mfa_required`. Si está activada, el operador debe completar TOTP mediante QR con Microsoft Authenticator u otra aplicación compatible. Si está desactivada, el desarrollador puede iniciar sesión sin MFA; los roles que no son `developer` mantienen MFA obligatorio. El selector de Equipo Dev permite asignar múltiples empresas, activar o desactivar múltiples vistas/módulos y exigir MFA por operador.

## Consumo por empresa y planes

Los snapshots anteriores estaban en cero y sin cuota. Se añadieron `storage_limit_bytes` al catálogo de planes, un cálculo protegido de bytes lógicos por filas tenant-scoped y un refresco diario mediante `refresh_tenant_usage_daily`. La primera medición real del 24 de septiembre de 2026 registró 94–120 registros y 22.887–32.611 bytes lógicos por empresa demo, además de 10 documentos por empresa. La medición es una señal de asignación por empresa; el tamaño físico de PostgreSQL y la cuota del proyecto Supabase siguen siendo globales.

El selector comercial existente ahora muestra también la cuota del plan. El plan Free se referencia conservadoramente con 500 MiB de base de datos y el Profesional con 8 GiB, según la documentación de Supabase consultada; estos valores deben revisarse contra la consola de facturación antes de convertirlos en cobro o bloqueo automático. La cuenta actual tiene suscripciones internas `profesional`, por lo que los snapshots muestran 8 GiB, aunque el proyecto Supabase pueda operar bajo Free.

## Variables de prueba manual

La configuración pública Supabase quedó disponible en `.env.local`, que está excluido por `.env.*` en `.gitignore`, y documentada en `.env.example`:

```env
VITE_SUPABASE_URL=https://uoozvmrkbrbvbhsuphhm.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_HsfNRe21AWHzL0liyUwYvQ_1mBRPKdC
```

La clave es de tipo **publishable** y puede estar en el bundle del navegador. Nunca se debe agregar `SUPABASE_SERVICE_ROLE_KEY`, contraseñas o tokens administrativos a `.env.example`, `VITE_*` ni al código cliente.

## Separación frontend/backend y assets

El build genera dos superficies distintas:

- `.output/public`: assets, HTML, CSS y JavaScript del navegador.
- `.output/server`: SSR y dependencias de servidor para el runtime Nitro/TanStack.

La auditoría del bundle público no encontró `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_SECRET`, `Deno`, `supabase/functions` ni la cadena literal `service_role`. Las coincidencias genéricas de `node:crypto`/`node:fs` encontradas en algunos bundles corresponden a código de compatibilidad de dependencias empaquetadas y no a imports de backend de BJSIG; no contienen secretos ni módulos Edge propios.

Los nombres hasheados como `Dashboard-BlHlRgk7.js`, `QrScanner-CUi6MX_P.js` y `favicon.ico` son el comportamiento esperado de Vite. Se validaron los primeros assets públicos mediante HTTP 200 y `_headers` aplica cache immutable a `/assets/*`. Las referencias de logos e iconos se resuelven por el manifest/runtime del build y no se mezclan con la carpeta server.

## Siguientes pasos recomendados antes del despliegue final

1. Ejecutar los seis escenarios E2E autenticados en un proyecto Supabase de staging con dos tenants aislados, dos administradores y un usuario developer, usando cuentas temporales y `E2E_REQUIRE_AUTH=true`.
2. Probar explícitamente AAL1 contra AAL2: un usuario autenticado sin MFA no debe leer tablas protegidas y un usuario con TOTP verificado debe acceder sólo a su tenant.
3. Ejecutar pruebas negativas de autorización: tenant A contra tenant B, worker contra RPC administrativa, usuario sin rol contra RPC de escritura y usuario anónimo contra cada tabla sensible.
4. Revisar las 42 funciones `SECURITY DEFINER` que siguen ejecutables por `authenticated` mediante una matriz de contrato; no aplicar un `REVOKE` masivo porque rompería RLS y flujos autorizados.
5. Confirmar en CI que `.env.local`, `.env.*.local`, contraseñas, tokens y archivos de reportes no se publican como artefactos ni se incluyen en el ZIP de producción.
6. Desplegar y probar el artefacto generado desde `.output`, no el servidor de desarrollo, verificando rutas `/`, `/admin`, `/trabajador`, assets, favicon y rutas legales en el dominio real.
7. Configurar CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy`, cookies seguras y dominio/redirect URLs de Supabase para producción.
8. Completar revisión legal independiente de privacidad, consentimiento, retención y ejercicio de derechos sobre GPS, QR, auditoría, datos laborales y reportes de acoso/incidentes.
9. Crear un plan de rollback y observabilidad: errores frontend, Edge Functions, auditoría de seguridad, límites de rate-limit, expiración de sesiones y alertas de RLS.
10. Sólo después de esas pruebas, publicar el build y rotar cualquier credencial de staging utilizada durante las pruebas.
