# QA E2E — Fase 7

## Estado actual

La suite Playwright cubre la superficie pública y los viewports críticos de BJSIGAPP. La última ejecución pasó **21 pruebas** en Chromium con perfiles desktop (1440×900), móvil (390×844) y tablet (768×1024).

## Cobertura automatizada

- Carga de `/`, `/privacidad` y `/terminos`.
- Títulos y headings principales.
- Enlaces de acceso de administrador y colaborador.
- CTA de WhatsApp con URL externa, `target="_blank"` y sin envío automático.
- Apertura y cierre del menú móvil.
- Ausencia de overflow horizontal en 390×844, 768×1024 y 1440×900.
- Ruta `/admin` sin sesión: muestra la pantalla de acceso y no expone controles del panel SaaS.

## Ejecución

```bash
npm run test:e2e
```

El reporte HTML queda en `playwright-report/`. Los fallos conservan trace y screenshot; el video permanece desactivado para no exigir la descarga de ffmpeg en CI.

## Próximo bloque: sesiones de staging

Los escenarios de aislamiento y autorización deben ejecutarse con cuentas QA reales en un entorno de staging, nunca con credenciales embebidas en el repositorio. La matriz mínima requerida por el roadmap es:

| Actor                       | Tenant          | Escenarios                                                |
| --------------------------- | --------------- | --------------------------------------------------------- |
| superadmin                  | plataforma      | planes, overrides, Equipo Dev, avisos                     |
| developer                   | A y B asignados | cambio de tenant, memberships activas, límites de módulos |
| company owner               | A               | sidebar, rutas bloqueadas, branding, usuarios             |
| rol operativo               | A               | turnos, asignaciones, calendario, notificaciones          |
| trabajador                  | A               | portal, asistencia, Blobavatar                            |
| cualquier actor empresarial | B no autorizado | aislamiento, URL directa y cambio de tenant               |

Para completar este bloque se requieren cuentas de staging para dos empresas, datos semilla reproducibles y un mecanismo seguro de inyección de credenciales mediante variables de entorno o el gestor de secretos del CI. No se incorporan credenciales al ZIP ni a los archivos de prueba.
