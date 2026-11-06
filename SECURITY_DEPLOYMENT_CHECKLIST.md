# Checklist de despliegue de seguridad

Los cambios de aplicación, funciones Edge, configuración versionada y pruebas se prepararon localmente. Esta lista reúne los pasos que requieren acceso al panel de Supabase, al proveedor de hosting o a GitHub; no se ejecutaron en producción.

## Antes de publicar

1. En el hosting, configurar `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_TURNSTILE_SITE_KEY` y `VITE_PUBLIC_SITE_URL` para el dominio HTTPS real.
2. En **Supabase Auth → CAPTCHA**, habilitar Cloudflare Turnstile con el mismo site key y el secreto del proveedor. La app ahora envía `captchaToken` en login con contraseña, OTP/magic link, signup, recuperación y reautenticación de cambio de contraseña.
3. Configurar como secretos de Edge Functions —nunca como `VITE_*`— `TURNSTILE_SECRET_KEY`, `TURNSTILE_ALLOWED_HOSTNAMES`, `WORKER_AUTH_REDIRECT_ORIGIN`, `WORKER_AUTH_ALLOWED_REDIRECT_ORIGINS` y `ALLOWED_ORIGINS`.
4. En los ajustes de URL de Supabase Auth, autorizar sólo el dominio HTTPS de producción y los destinos exactos usados por recuperación (`/admin` y el destino fijo del portal de trabajadores). No usar comodines amplios.
5. Desplegar `supabase/config.toml` y las funciones Edge desde este checkout. Las acciones públicas de `worker-auth` verifican CAPTCHA/rate limit dentro de la función; `check-email-allowed` aplica rate limit. Las demás funciones quedan con `verify_jwt = true`.
6. Revisar la política de alta de usuarios de Supabase Auth y desactivar signup público si la aplicación no lo necesita. No se modificó esa configuración remota.
7. Rotar en el proveedor cualquier clave o secreto que haya estado expuesto en el repositorio o en logs, actualizando primero todos los entornos dependientes. No se rotaron credenciales desde este cambio local.
8. En GitHub Actions, agregar `SUPABASE_DB_URL` apuntando únicamente a staging y habilitar la variable de repositorio `SUPABASE_RLS_AUDIT_ENABLED=true` para activar la comprobación de catálogo RLS.
9. Para activar E2E multi-tenant, crear cuentas/tenants de staging aislados y configurar los secretos `E2E_SUPABASE_URL`, `E2E_SUPABASE_PUBLISHABLE_KEY`, `E2E_TURNSTILE_SITE_KEY`, `E2E_ADMIN_PASSWORD`, `E2E_ADMIN_USERS_JSON`, `E2E_DEVELOPER_EMAIL`, `E2E_DEVELOPER_PASSWORD` y `E2E_DEVELOPER_TENANTS_JSON`; luego habilitar la variable `MULTITENANT_E2E_ENABLED=true`. La CAPTCHA de staging debe aceptar la clave de prueba correspondiente.

## Pendiente de política/operación

- Definir y aprobar períodos de retención para `activity_logs` y `login_attempts` antes de automatizar borrados; no se eligieron plazos arbitrarios.
- Elegir proveedor/canales y umbrales para alertas de picos de intentos, accesos a honeytokens, actividad administrativa y eventos MFA; no se configuraron integraciones externas.
- Aplicar y verificar el despliegue en staging antes de producción, incluyendo los dominios permitidos de Turnstile, los redirects y el flujo de recuperación de trabajadores.
