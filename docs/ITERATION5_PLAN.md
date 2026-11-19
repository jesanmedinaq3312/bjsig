# Plan de Iteración 5 — staging, validación runtime y despliegue controlado

**Estado:** planificada; no activa todavía.  
**Dependencia:** cierre verificable de Iteración 4.  
**Presupuesto operativo de referencia:** 300 tokens.

## Propósito

Convertir el hardening local de autorización/RLS/RPC en evidencia runtime reproducible, sin usar datos reales y sin aplicar cambios directamente al único proyecto compartido `BJSIG` hasta contar con aprobación específica.

## Objetivos

1. **Entorno aislado:** disponer de un proyecto Supabase staging o una base descartable con restauración comprobada, secretos QA separados y datos sintéticos.
2. **Reconciliación de esquema:** comparar catálogo remoto contra migraciones locales: funciones, grants, tablas, columnas `tenant_id`, índices, políticas RLS y versiones de Edge Functions.
3. **Fixtures multi-tenant:** crear `TENANT_A` y `TENANT_B`, usuarios sintéticos para `superadmin`, `developer` asignado/no asignado, roles tenant y workers A1/B1; registrar IDs de fixture y cleanup.
4. **Validación de autorización:** ejecutar T01–T16 de la matriz, incluyendo worker propio/ajeno, cambio de tenant, RUT, MFA, rate limits, `attendance_summary` y `authorize_worker_portal`.
5. **Aplicación controlada:** probar `20261119010000_iteration4_worker_portal_rls_rpc.sql` en staging; verificar grants, policies, funciones, logs, rendimiento básico y regresiones funcionales.
6. **Rollback y observabilidad:** demostrar rollback por migración o restauración, registrar errores de Edge/RLS, confirmar que no hubo lectura/escritura de datos fuera de los fixtures y conservar evidencia.
7. **Barrera CI:** separar E2E autenticado de credenciales QA, ejecutar typecheck/lint/unitarios/build y publicar un reporte de autorización por commit.

## Entregables

- Dump sólo de esquema y diff local/remoto revisado.
- Seed sintético idempotente y cleanup por IDs.
- Resultado firmado/versionado de T01–T16.
- Reporte de aplicación de migración y catálogo posterior.
- Procedimiento de rollback probado.
- Checklist de aprobación para producción y lista de bloqueos abiertos.
- CI reproducible sin secretos en logs.

## Puertas de entrada

- Iteración 4 tiene contrato Dev Team-only, matriz y migración local revisados.
- Existe un entorno aislado o el usuario aprueba explícitamente la alternativa elegida.
- El SQL exacto, impacto y rollback se muestran antes de cualquier aplicación remota.
- No se usan cuentas, tenants, trabajadores ni filas operativas reales.

## Puertas de salida

La Iteración 5 sólo puede marcarse completada si:

- T01–T16 pasan con resultados positivos y negativos esperados.
- RLS se prueba con sesiones de usuario, nunca con `service_role` como actor de prueba.
- El cambio de tenant, RUT ajeno, permisos ausentes y MFA incorrecto fallan cerrado.
- La migración puede aplicarse y revertirse en staging sin pérdida de fixtures fuera del alcance.
- Las funciones Edge revisadas coinciden con la fuente aprobada o las diferencias quedan bloqueadas/documentadas.
- Existe evidencia de logs, grants y políticas posterior al despliegue de staging.
- La decisión de producción queda separada y requiere aprobación explícita; staging verde no equivale a producción aprobada.

## Riesgos y bloqueos conocidos

- No existe actualmente un proyecto staging separado identificado en la cuenta.
- Las versiones remotas de varias Edge Functions no están reconciliadas con las fuentes locales.
- El CAPTCHA/Auth y el comportamiento de `worker-auth` requieren verificación independiente.
- La aplicación de RLS puede afectar consultas históricas que dependan de políticas permisivas; se debe probar cada operación por separado.
- Cualquier requisito laboral, privacidad o cumplimiento legal necesita revisión especializada; esta iteración no certifica cumplimiento legal.
