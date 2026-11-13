# Checklist de despliegue de seguridad

**Estado local:** Turnstile fue retirado del cliente, de `worker-auth` y de las llamadas a Supabase Auth. El código ya no carga scripts, solicita tokens ni valida tokens de Turnstile. Este cambio conserva límites de intentos server-side, registros de autenticación, respuestas genéricas de recuperación, allowlists de redirect, política de contraseña, validación de sesión, MFA y RLS.

**Límite del cambio:** el proyecto remoto de Supabase no se modificó ni se desplegó desde este checkout. La versión observada de `worker-auth` (v49) no exigía tokens Turnstile; el endpoint público `/auth/v1/settings` no expuso un indicador de CAPTCHA, lo que no confirma la configuración del dashboard. Revisar Auth → Security/CAPTCHA y comparar la función remota con la fuente local antes de afirmar que el portal está habilitado.

## Antes de probar o publicar

1. Configurar en el hosting `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` y `VITE_PUBLIC_SITE_URL` para el dominio HTTPS correspondiente. No crear variables ni secretos de Turnstile.
2. En Supabase Auth → Security/CAPTCHA, confirmar que CAPTCHA/Turnstile esté desactivado para el proyecto si había sido habilitado anteriormente. La configuración remota no está representada en `supabase/config.toml`.
3. Comparar la versión remota v49 con la fuente local y desplegar sólo después de revisar el diff; probar que no exija `captcha_token` ni `auth_captcha_token` y que conserve límites y controles server-side.
4. Mantener y comprobar los límites existentes por IP + cuenta/RUT, bitácora de intentos, respuesta anti-enumeración para reset y política de contraseñas. El signup público permanece deshabilitado; no habilitarlo sin decisión de producto.
5. Configurar como secretos de Edge Functions —nunca como `VITE_*`— `WORKER_AUTH_REDIRECT_ORIGIN`, `WORKER_AUTH_ALLOWED_REDIRECT_ORIGINS` y `ALLOWED_ORIGINS`, más los secretos aprobados de cada función.
6. En Supabase Auth, autorizar sólo el dominio HTTPS de producción y los destinos exactos usados por recuperación (`/admin` y `/trabajador`). No usar comodines amplios.
7. Confirmar límites/rate limit para `worker-auth` y `check-email-allowed`; las demás funciones mantienen `verify_jwt = true`. Revisar signup, MFA, recuperación y acceso con sesiones de staging.
8. Revisar la política de alta de Supabase Auth y desactivar signup público si no es necesario. Esta configuración remota no se modificó.
9. Rotar en el proveedor cualquier clave/secreto que haya estado expuesto en el repositorio o logs, siguiendo primero dependencias entre entornos. No se rotaron secretos en este cambio.
10. En GitHub Actions, apuntar `SUPABASE_DB_URL` sólo a staging y habilitar `SUPABASE_RLS_AUDIT_ENABLED=true` para las comprobaciones del catálogo RLS.
11. Para E2E multi-tenant, usar cuentas y tenants sintéticos de staging con las variables documentadas en `e2e/multitenant.spec.ts`; no incluir contraseñas en el repositorio.

> **GPS:** `_headers` permite `geolocation=(self)` en el checkout y el login sólo solicita captura tras una acción del usuario; el escáner captura al procesar la marca y descarta ubicaciones vencidas. Desplegar y verificar la cabecera en HTTPS. La coordenada del navegador no demuestra por sí sola presencia física.

## PR #2: controles de publicación de landing

- La migración `20261107190000_saas_landing_controls.sql` agrega settings públicos y RPCs restringidos a `is_platform_owner()`. Aplicarla primero en staging y revisar las funciones y permisos del catálogo antes de producción.
- La migración `20261113000100_saas_landing_legacy_copy_seed.sql` transfiere el copy global existente sólo si los settings SaaS siguen en sus valores iniciales. Verificar título, descripción y CTA tras la migración.
- Probar en staging que el sitio principal use la configuración SaaS, que el fallo de carga mantenga el fallback anterior, que una landing desactivada no publique contenido y que `/empresa/:slug` sólo exponga empresas activas con landing habilitada.
- No aplicar SQL directamente a producción desde esta lista; confirmar el proyecto destino y el respaldo conforme al procedimiento de release.

## Otros cambios locales pendientes de despliegue

- **Inalterabilidad QR:** se eliminó la acción de sobrescritura y se preparó `20261109070000_qr_attendance_marks_immutable.sql`. Aplicar y verificar primero en staging; implementar por separado la regularización bilateral antes de permitir correcciones.
- Aplicar en staging `20261109060000_privacy_processing_inventory.sql` y probar carga/guardado del inventario.
- Definir y aprobar retención para `activity_logs` y `login_attempts` antes de automatizar borrados.
- Elegir proveedor/canales y umbrales para alertas de intentos, honeytokens, actividad administrativa y eventos MFA.
- Confirmar la CSP realmente servida, redirects, signup, CAPTCHA remoto apagado y autenticación de trabajadores en staging antes de producción. No agregar proveedores externos a CSP sin autorización y revisión de privacidad.
