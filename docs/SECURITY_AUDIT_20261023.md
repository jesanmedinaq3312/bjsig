# Auditoría de BJSIGAPP — 2026-10-23

## Alcance y cambios realizados

Se revisaron los portales personal y operativo, el reconocimiento de roles, la carga de marca por empresa, la interfaz de turnos, políticas y columnas de Supabase, y el flujo de build/E2E. La revisión de Supabase fue de solo lectura sobre metadatos: no se leyeron filas personales/empresariales ni se escribieron datos allí.

En el código se separaron los portales personal y operativo sin duplicar identidad; se enlazaron conservando el slug; se agregó branding público por slug con un fallback que no reutiliza el tenant anterior; se ajustaron modales/formularios de turnos para que no excedan el viewport y usen scroll interno; se aceptan `VITE_*` o `NEXT_PUBLIC_*` para la configuración pública de Supabase; y el E2E público valida el branding simulado en ambos accesos.

La migración `supabase/migrations/20261023035000_worker_operator_portal_branding.sql` está **solo en el código local**. Incluye el RPC de branding público, reconocimiento de la ficha por tenant + RUT, MFA para identidad `worker` con permisos operativos, y compatibilidad de la autorización de turnos con membresías operativas activas. La sintaxis PostgreSQL se parseó localmente; no se ejecutó en la base.

## Hallazgo de seguridad backend — pendiente y prioritario

Las consultas del portal personal a `workers`, `worker_documents`, `vacation_requests`, `payroll_items`, `performance_*`, `daily_shifts`, `shift_assignments`, `shift_change_logs`, `worker_requests`, `epp_logs`, `incidents_ds44`, `training_attendance` y `qr_scan_events` filtran por RUT en el navegador. Las políticas inspeccionadas de varias tablas limitan solo por `tenant_id = current_tenant_id()`. En particular, `workers.op_workers` permite `ALL` dentro del tenant, y `shift_assignments` permite `SELECT` para todo el tenant. El filtro del frontend no es una frontera de autorización: un usuario autenticado puede formular otra consulta directa.

Por ello, **el aislamiento entre trabajadores no está demostrado y las políticas observadas parecen insuficientes en backend**. Esto podría exponer filas personales de otras personas del mismo tenant (datos salariales, contacto, documentos, vacaciones y desempeño según tabla). No usar cuentas reales de trabajadores para pruebas autenticadas contra datos productivos hasta remediar y verificar el alcance por fila.

Las políticas MFA inspeccionadas sí estaban marcadas `RESTRICTIVE`; no se afirma que esa capa esté rota. El problema comprobado aquí es el alcance entre trabajadores dentro de un mismo tenant.

## Próximo cambio backend que requiere aprobación

Preparar una migración de seguridad separada que limite la lectura a las filas del propio RUT y reserve datos de tenant completo para roles/permisos operativos activos de esa empresa. Las solicitudes personales deben conservar creación propia sin permitir autoaprobación. Revisar también acuses de circulares y restricciones de audiencia/departamento.

Antes de aplicar en producción: respaldo verificable del esquema y políticas actuales, prueba en un tenant de staging, comprobación con cuentas separadas de trabajador/HR/finanzas/propietario, y confirmación de que el panel operativo mantiene su acceso previsto. La migración de marca/roles de este paquete también sigue pendiente; el RPC real de branding responderá tras su aprobación. No se modificó nada remoto.

## Validaciones

- `npm run build`: correcto.
- `npm run typecheck`: correcto.
- ESLint acotado a todos los archivos modificados: correcto.
- `npm run lint` global: falla con **52 errores** en archivos no modificados (`src/lib/*`, tests de librería y `supabase/functions/admin-user-manage/index.ts`); no se reformatearon masivamente.
- `npm run test:e2e:public`: **24/24 pruebas aprobadas** en Chromium desktop, móvil y tablet, incluidas navegación sin sesión, branding por slug simulado y ausencia de overflow horizontal a 320 px.
- El E2E de branding simula el RPC; no certifica el RPC remoto pendiente.
- No se ejecutaron pruebas autenticadas de la pantalla/modal de turnos porque no se proporcionó una cuenta de prueba; no se creó ni modificó ninguna cuenta.
- La vista previa Vite temporal está en el puerto 4173 y depende de que esta sesión siga activa.
