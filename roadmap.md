# Seguimiento breve — panel Dev Team

Este tablero complementa [`ROADMAP.md`](ROADMAP.md), que es la fuente de verdad para el estado del producto y las brechas regulatorias. No reemplaza el staging ni prueba despliegues.

## Proyección y cobranza

- [x] La interfaz calcula y muestra métricas de cartera, próximos cobros y proyección base a 90 días a partir de datos de la aplicación.
- [ ] Validar cálculos con cartera real autorizada, casos borde, errores de permisos y conciliación; no cargar cifras de ejemplo como métricas reales.
- [ ] Integrar un proveedor DTE/SII y automatizaciones de cobranza sólo después de definir proveedor, credenciales server-side y procesos aprobados.

## Landing pública configurable

- [x] El panel contiene edición visual/branding de landing y el código versiona lectura/escritura de su configuración.
- [ ] Confirmar/aplicar la migración `20261109044500_public_landing_settings.sql` en staging y probar persistencia/publicación y permisos de lectura/escritura.
- [ ] Verificar preview público, accesibilidad y comportamiento responsive tras el despliegue; los datos de demostración deben seguir identificados como ilustrativos.

## Validación y operación

- [x] TypeScript, Vitest (**44**), pruebas Deno de `worker-auth` (**17**), ESLint y build se ejecutan localmente; ESLint conserva una advertencia Fast Refresh no bloqueante.
- [ ] Ejecutar E2E público y autenticado con cuentas sintéticas; documentar errores de servicios externos sin usar credenciales reales.
- [ ] Mantener decisiones pendientes de despliegue, migraciones y seguridad en [`SECURITY_DEPLOYMENT_CHECKLIST.md`](SECURITY_DEPLOYMENT_CHECKLIST.md).

## Portal de trabajador

- [x] Turnstile/CAPTCHA retirado del código local; el signup público permanece deshabilitado.
- [ ] Confirmar el ajuste de CAPTCHA en el dashboard, comparar y revisar la versión remota de `worker-auth`, y completar login con un worker sintético antes de habilitar el portal.
