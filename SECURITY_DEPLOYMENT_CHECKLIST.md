# Checklist de despliegue de seguridad

Los cambios de aplicación, funciones Edge, configuración versionada y pruebas se prepararon localmente. Esta lista reúne los pasos que requieren acceso al panel de Supabase, al proveedor de hosting o a GitHub; no se ejecutaron en producción.

## Antes de publicar

1. En el hosting, configurar `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` y `VITE_PUBLIC_SITE_URL` para el dominio HTTPS real. **No configurar `VITE_TURNSTILE_SITE_KEY` ni secretos de Turnstile** hasta que el cliente apruebe expresamente su uso y la divulgación de transferencia de IP.
2. Turnstile está pausado por decisión del cliente: un guard en cliente y Edge impide solicitudes y remisión de IP, y la CSP también bloquea sus dominios. No habilitarlo en Supabase Auth ni permitir el dominio en CSP sin revisión jurídica, aviso actualizado y autorización del cliente.
3. **Bloqueo operativo:** el portal de trabajadores falla cerrado al solicitar el token desactivado; no publicar ese flujo hasta escoger una alternativa de seguridad aprobada o autorizar/implementar Turnstile con los avisos y contratos correspondientes.

> **GPS — corregido en el código local, pendiente de aprobación/despliegue:** `_headers` permite `geolocation=(self)` y el login solicita captura sólo tras acción del usuario; el escáner QR captura al procesar una marca y descarta una posición vencida. Antes de publicar, confirmar finalidad/base y transparencia con el cliente, desplegar la cabecera y probar permisos en el dominio HTTPS real. La app no acredita la autenticidad física de coordenadas suministradas por el navegador.

4. Configurar como secretos de Edge Functions —nunca como `VITE_*`— sólo `WORKER_AUTH_REDIRECT_ORIGIN`, `WORKER_AUTH_ALLOWED_REDIRECT_ORIGINS` y `ALLOWED_ORIGINS`, además de otros secretos que se hayan aprobado para cada función.
5. En los ajustes de URL de Supabase Auth, autorizar sólo el dominio HTTPS de producción y los destinos exactos usados por recuperación (`/admin` y el destino fijo del portal de trabajadores). No usar comodines amplios.
6. Desplegar `supabase/config.toml` y las funciones Edge desde este checkout. Confirmar límites/rate limit para las acciones públicas de `worker-auth` y `check-email-allowed`; las demás funciones quedan con `verify_jwt = true`.
7. Revisar la política de alta de usuarios de Supabase Auth y desactivar signup público si la aplicación no lo necesita. No se modificó esa configuración remota.
8. Rotar en el proveedor cualquier clave o secreto que haya estado expuesto en el repositorio o en logs, actualizando primero todos los entornos dependientes. No se rotaron credenciales desde este cambio local.
9. En GitHub Actions, agregar `SUPABASE_DB_URL` apuntando únicamente a staging y habilitar la variable de repositorio `SUPABASE_RLS_AUDIT_ENABLED=true` para activar la comprobación de catálogo RLS.
10. Para activar E2E multi-tenant, crear cuentas/tenants de staging aislados y configurar las variables `E2E_SUPABASE_URL`, `E2E_SUPABASE_PUBLISHABLE_KEY`, `E2E_ADMIN_PASSWORD`, `E2E_ADMIN_USERS_JSON`, `E2E_DEVELOPER_EMAIL`, `E2E_DEVELOPER_PASSWORD` y `E2E_DEVELOPER_TENANTS_JSON`; luego habilitar `MULTITENANT_E2E_ENABLED=true`. No almacenar secretos de Turnstile mientras permanezca desactivado.

## Cambios preparados, aún no desplegados

- **Inalterabilidad QR:** se eliminó la acción de sobrescritura en la interfaz y se preparó `20261109070000_qr_attendance_marks_immutable.sql` para impedir UPDATE/DELETE. Aplicar y verificar primero en staging. El flujo bilateral de solicitud/aprobación de regularización todavía no está implementado.

## Pendiente de política/operación

- Aplicar primero en staging `supabase/migrations/20261109060000_privacy_processing_inventory.sql`, probar carga/guardado del inventario y luego decidir el despliegue a producción. Esta migración no se aplicó desde el checkout local.
- Aplicar y probar en staging la migración de inalterabilidad de marcajes y verificar que ningún flujo operativo siga actualizando `qr_scan_events`. Diseñar por separado la solicitud de regularización con consentimiento de trabajador y supervisor antes de habilitar correcciones.
- Definir y aprobar períodos de retención para `activity_logs` y `login_attempts` antes de automatizar borrados; no se eligieron plazos arbitrarios.
- Elegir proveedor/canales y umbrales para alertas de picos de intentos, accesos a honeytokens, actividad administrativa y eventos MFA; no se configuraron integraciones externas.
- Aplicar y verificar el despliegue en staging antes de producción, incluyendo la CSP servida, redirects y autenticación de trabajadores. No añadir dominios de Google Analytics ni Turnstile a CSP sin autorización y revisión de privacidad.
