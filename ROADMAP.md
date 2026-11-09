# Roadmap y cierre de brechas — BJSIGAPP

**Actualizado:** 9 de noviembre de 2026. **Ámbito:** inspección del código local y documentos versionados; no constituye una auditoría del estado remoto ni una opinión legal.

> Se retiró el porcentaje global heredado de 78 %: no había una metodología vigente para calcularlo. Los estados anteriores por fase son registros históricos y no prueban por sí solos que una migración siga aplicada en Supabase.

## Estado comprobable de esta revisión

- **Código local:** el producto contiene módulos de SaaS, personas, portal de trabajador, turnos, asistencia QR, nómina, Ley Karin, incidentes/CPHS, Gobierno de Datos y registros de auditoría.
- **Validación local:** TypeScript pasó; Vitest pasó con 44 pruebas y `worker-auth` con 17 pruebas Deno; build Vite/Nitro pasó; ESLint terminó sin errores y con una advertencia de Fast Refresh en `QrCardGenerator.tsx`.
- **Supabase/hosting:** inspección read-only: `worker-auth` remoto observado en v49 no exige tokens Turnstile; `/auth/v1/settings` no mostró un indicador público de CAPTCHA. No se desplegó ni modificó el proyecto y el ajuste CAPTCHA del dashboard sigue sin confirmar. Una migración en el checkout no equivale a una migración aplicada.
- **Asistencia/GPS:** el código usa fecha laboral `America/Santiago`, instante UTC, captura GPS reciente al procesar QR y ya no ofrece sobrescritura en la interfaz. La migración append-only `20261109070000_qr_attendance_marks_immutable.sql` está versionada, pero su aplicación está pendiente de staging.
- **Portal de trabajador:** existe en el código y forma parte del flujo de producto. Por instrucción del cliente se retiró Turnstile/CAPTCHA de los fuentes locales; signup público continúa cerrado. La versión remota v49 no contiene la barrera Turnstile, pero difiere de la fuente local y no se desplegó. El CAPTCHA de Supabase Auth y el smoke test de ingreso con worker sintético siguen pendientes. No asumir que el portal sea “Dev Team-only”.

## Seguimiento de los requisitos adjuntos

| Área                           | Estado observado en el repositorio                                                                                                                                                                | Pendiente para cierre                                                                                                                                                                                                                                                                                 |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A. Asistencia electrónica**  | Hay marcación QR, coordenadas/precisión, fecha Chile e inmutabilidad preparada para `qr_scan_events`. La interfaz ya no permite sobrescribir directamente.                                        | Aplicar/testear migración en staging; construir regularización con consentimiento bilateral; comprobante inmediato por email; perfil de fiscalización de sólo lectura; reporte de jornada/horas extra firmado. No declarar validación legal de las marcas.                                            |
| **B. Nómina y remuneraciones** | Hay periodos, cálculo de liquidaciones y exportación Excel por periodo. `src/lib/siiExport.ts` exporta CSV de facturas/DTE, no el LRE oficial de remuneraciones.                                  | Crear/exportar el formato LRE oficial vigente y probarlo con Mi DT; tipificar haberes/descuentos; añadir evidencia verificable de entrega/recepción de liquidación.                                                                                                                                   |
| **C. Ley Karin**               | Existe canal y módulo de seguimiento, estados, fecha límite mostrada como 30 días, notas y notificación de resultado.                                                                             | Validar reglas y cómputo con asesoría; implementar plazo de 3 días hábiles y notificaciones/derivación; registrar medidas de resguardo; completar informe y envío formal; integrar anexo/protocolo aprobado. La UI actual no prueba cumplimiento del proceso.                                         |
| **D. Datos y ciberseguridad**  | Existe Gobierno de Datos e inventario de activos. La migración `20261109060000_privacy_processing_inventory.sql` y la línea base están en el repositorio.                                         | Aplicar/probar migración en staging; completar datos legales reales del responsable/DPO; DPA por cliente; flujo ARCO+ con recepción, responsable, SLA y evidencia; confirmar proveedores, transferencias, retención y borrado. Ninguno de estos documentos debe autocompletarse con datos inventados. |
| **E. Prevención y mutualidad** | Hay módulo de incidentes, exportación PDF prellenada DIAT/DIEP y registros de reuniones CPHS. El PDF de incidente es un prellenado, no se ha validado como formulario oficial de cada mutualidad. | Validar campos y formato con ACHS/Mutual/IST; completar trazabilidad DIAT/DIEP; verificar constitución, actas, reuniones y acuerdos CPHS, incluyendo reglas de aplicabilidad, con especialista.                                                                                                       |

## Prioridades de implementación

### P0 — Mantener estado veraz y evitar cambios de producción no verificados

1. Confirmar en Supabase Auth → Security/CAPTCHA que el challenge esté desactivado; comparar `worker-auth` v49 con el código local y desplegar sólo tras revisión. Completar el smoke test con identidad worker sintética, verificando rate limits, autenticación y alcance RLS.
2. Comparar el esquema/migraciones remotos con el checkout antes de aplicar cambios. Empezar con lectura/dump de esquema sin datos y registrar qué versión de cada migración está desplegada.
3. Desplegar/probar por separado `geolocation=(self)` en el hosting y la migración de inalterabilidad QR. Confirmar permisos de navegador, captura bajo acción, posiciones vencidas, cola offline, duplicados y comportamiento ante rechazo de GPS.
4. Validar si la política real del producto permite autoservicio de trabajador. La matriz de autorización debe preservar RLS y a la vez ser coherente con el portal de trabajador que ofrece BJSIGAPP.

### P1 — Completar la asistencia del adjunto

1. Diseñar la tabla/flujo de solicitudes de regularización append-only: solicitud del trabajador, evidencia/motivo, revisión y consentimiento del supervisor; conservar marca original y registrar resultado.
2. Enviar comprobante por cada entrada, salida y colación con fecha/hora Chile, tipo, ubicación/precisión reportada e IP si corresponde; definir proveedor, errores, reintentos, privacidad y trazabilidad.
3. Preparar vista de fiscalización sólo lectura y reporte semanal/mensual con confirmación del trabajador y desglose ordinario/extraordinario.
4. Validar reglas laborales con asesoría antes de usar la función como control oficial de jornada.

### P2 — Completar Ley Karin y remuneraciones

- Ley Karin: plazo de 3 días hábiles, medidas de resguardo, notificaciones, cálculo de plazos, informe final y registro de remisión/investigación; probar permisos, confidencialidad y auditoría.
- Nómina: modelar el archivo LRE por versión del formato oficial, agregar validaciones y tests con ejemplos sintéticos, documentar export/import y conciliación.
- Liquidaciones: acuse de entrega por persona, con fecha/hora, artefacto/versionado, estado de lectura/firma y trazabilidad de reintentos.

### P3 — Privacidad, incidentes y CPHS

- Completar inventario por tratamiento, rol responsable/encargado, finalidad, base, titulares, destinatarios/países, conservación y eliminación.
- Preparar DPA, canal y SLA ARCO+, protocolo de incidentes, medidas y evidencias de privacidad; revisión legal antes de publicarlos.
- Diferenciar claramente un PDF prellenado de DIAT/DIEP de un formulario oficial aceptado por una mutualidad.
- Verificar CPHS: constitución, actas mensuales, acuerdos, responsables, vencimientos y condiciones de aplicabilidad en normativa vigente.

### P4 — Pruebas y operación

- E2E con cuentas sintéticas: worker sólo propio registro, roles tenant, Dev Team con memberships, dos tenants, MFA, permisos negativos y cambio/logout de tenant.
- Staging aislado, seed sintético, restauración comprobada, rollback por migración y monitoreo de Edge/RLS.
- Pruebas de accesibilidad, teclado, lectores de pantalla y contraste.
- Confirmar hosting/CSP/Permissions-Policy, URL de Auth, secretos, correo y retención real antes de publicar.

## Hitos anteriores conservados como historia

Las fases previas registraron implementación en el código de: contrato de permisos y planes; Equipo Dev/memberships; turnos y su historial; branding; notificaciones y acuses; cartera y contratos SaaS; onboarding; Gobierno de Datos; reglas de IP y aislamiento de logs. Las entradas históricas sobre migraciones “aplicadas”, pruebas E2E, porcentajes o despliegues reflejan la evidencia de sus fechas; deben volver a comprobarse antes de tratarlas como estado remoto actual.

La Fase de autorización/seguridad sigue **en progreso**. Parte del hardening local ya existe (migraciones de alcance sensible, guardas de autenticación, minimización y documentos de privacidad), pero faltan reconciliación de esquema, pruebas reales multi-tenant, staging/restauración, despliegue y resolución de bloqueos de producto. El inventario de referencia [`docs/PHASE0_INVENTORY_20261101.md`](docs/PHASE0_INVENTORY_20261101.md) es una fotografía del 1 de noviembre y debe leerse como histórica cuando discrepe del código actual.

## Puertas para marcar un requisito como cerrado

Un requisito sólo se marcará **completado** cuando tenga: implementación en código, pruebas automáticas/negativas aplicables, migración y permisos probados en staging cuando corresponda, confirmación de despliegue, evidencia operativa y aprobación legal/cliente si afecta derechos laborales o datos personales. Una vista, plantilla o archivo exportable por sí solo no cumple esta puerta.

### Documentos de apoyo

- [`SECURITY_DEPLOYMENT_CHECKLIST.md`](SECURITY_DEPLOYMENT_CHECKLIST.md): operaciones pendientes de hosting/Supabase y cambios locales no aplicados.
- [`docs/PRIVACY_COMPLIANCE_BASELINE.md`](docs/PRIVACY_COMPLIANCE_BASELINE.md): línea base de privacidad y límites.
- [`docs/PHASE0_INVENTORY_20261101.md`](docs/PHASE0_INVENTORY_20261101.md): revisión histórica de sólo lectura.
- [`PRODUCT.md`](PRODUCT.md): propósito del producto y límites de comunicación pública.
