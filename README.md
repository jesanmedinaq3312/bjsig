# BJSIGAPP — Sistema Integrado de Gestión Empresarial

BJSIGAPP es una plataforma SaaS multiempresa para gestión de personas, operaciones, asistencia, prevención y procesos internos. Este README orienta a quienes mantengan el repositorio; el estado del despliegue debe verificarse por separado.

**Revisión del repositorio:** 9 de noviembre de 2026. El checkout contiene código y migraciones locales; no implica que todo esté desplegado en Supabase o en el hosting. No se debe inferir cumplimiento legal integral a partir de la presencia de una pantalla, una tabla o una migración.

## Estado actual

La aplicación usa React 19, TypeScript, Vite/TanStack Start y Supabase. El repositorio contiene módulos funcionales y superficies de demostración; producción, staging, configuración de Auth, cabeceras entregadas y migraciones remotas requieren verificación independiente.

### Capacidades presentes en el código

- SaaS multiempresa con gestión de empresas, memberships, roles, módulos, planes, overrides, branding y landing.
- Panel Dev Team con gestión de operadores, ciclo de vida de empresas, comunicaciones, contratos comerciales, onboarding y monitoreo.
- Personas, portal de trabajador, solicitudes, asistencia/calendario, turnos y marcación QR con cola offline.
- Nómina y liquidaciones, finanzas, vacaciones, finiquitos y datos bancarios.
- Prevención y operaciones: incidentes, CPHS, EPP, capacitaciones, documentos, indicadores, auditoría y seguridad.
- Canal de denuncias Ley Karin, Gobierno de Datos e interfaces de privacidad.
- Branding tenant-scoped, avisos por empresa y recibos de lectura para circulares.

Estas capacidades no equivalen automáticamente a los formatos, plazos, firmas, avisos o controles legales requeridos por cada cliente.

### Estado reciente de asistencia y GPS

La marcación QR usa hora del instante UTC y fecha laboral en `America/Santiago`; al procesar una marca solicita GPS, valida frescura y conserva la precisión reportada por el navegador. La política local permite geolocalización sólo para el mismo origen (`geolocation=(self)`). Las coordenadas del navegador no prueban por sí solas la presencia física.

Se eliminó de la UI la acción de sobrescribir una marca y se preparó una migración de inalterabilidad para `qr_scan_events`. La migración `20261109070000_qr_attendance_marks_immutable.sql` **no se debe considerar aplicada** hasta confirmarla en staging/producción. Aún falta el flujo bilateral de regularización. Tampoco están acreditados aquí el comprobante inmediato por correo, el portal de fiscalizador ni el reporte de jornada firmado.

## Límites y bloqueos conocidos

- **Portal de trabajador:** Turnstile/CAPTCHA se eliminó del código local. La versión remota observada de `worker-auth` (v49) no exige tokens Turnstile; no se desplegó código desde este checkout. El endpoint público `/auth/v1/settings` no expuso un indicador CAPTCHA, lo que no confirma la opción del dashboard. Revisar Auth → Security/CAPTCHA y probar con un trabajador sintético antes de habilitar el portal.
- **Protecciones conservadas en el código local:** límites por IP/cuenta/RUT, registro de intentos, respuesta genérica de recuperación, redirect allowlist, política de contraseña, comprobación de sesión, GPS donde aplica, MFA administrativo y RLS. La versión remota debe compararse con la fuente local antes de desplegar; no reemplazar controles server-side por validaciones de interfaz.
- **Seguridad por trabajador:** existen políticas de ownership por RUT en partes del esquema y migraciones recientes para datos sensibles; no se ha demostrado en esta actualización que todas las tablas y RPC respeten el alcance personal. Validar cada tabla con sesiones de staging y pruebas negativas.
- **Estado remoto:** sólo se inspeccionaron de forma read-only la versión de `worker-auth` y el endpoint público de configuración Auth; no se modificaron servicios. Las migraciones locales y el catálogo Supabase pueden divergir. No asumir que una migración está desplegada porque está en `supabase/migrations/`.
- **Cumplimiento laboral y privacidad:** revisar las brechas A–E en [`ROADMAP.md`](ROADMAP.md). No describir la aplicación como “100 % conforme” ni como un sistema certificado.
- **Información legal/comercial:** razón social/RUT/domicilio del responsable, DPO, bases y finalidades por tratamiento, retención, DPA, proveedores y canal ARCO+ requieren datos y aprobaciones del responsable; no inventarlos en el código.

## Reglas de negocio no negociables

### Autorización efectiva

La autorización se decide en servidor, con aislamiento de tenant y controles de sesión; las guards de interfaz sólo mejoran la experiencia.

```text
RLS/RPC/Edge → tenant activo → rol → permiso → plan/módulo → override
```

Un permiso positivo no debe saltarse el plan. El rol de plataforma administra el SaaS; el acceso dentro de una empresa sigue la membresía y los permisos efectivos.

### Aislamiento multiempresa

- Las queries operativas deben tener tenant scope y RLS correspondiente.
- Nunca leer trabajadores, turnos, documentos o finanzas de forma global desde una vista tenant.
- Al cambiar de empresa, separar/invalidate claves React Query con `tenantQueryKey(tenantId, recurso)`.
- No enlazar datos por RUT entre empresas sin tenant; las memberships determinan las empresas disponibles para Dev Team.
- Una ruta o botón visible no constituye autorización.

### Identidad de trabajador y portal

El producto incluye un portal personal de trabajador en `/trabajador` y un portal operativo en `/admin` o `/<slug>/admin`. La persona puede tener ambos usos con una sola identidad; la autorización y el alcance personal se verifican en servidor. **No asumir “Dev Team-only” para el portal de trabajador**: es incompatible con el flujo de autoservicio presente y requiere una decisión de producto explícita si se quisiera cambiar.

### Vistas, planes y branding

Las claves de módulos se normalizan en `src/lib/authorization.ts`, `src/lib/roleAccess.ts` y `src/lib/tenant.ts`. Al agregar una vista, revisar el mapa de rutas/navegación, permisos `can_view_*`, etiquetas del panel SaaS, planes fallback, `Layout`/`TenantGate` y pruebas negativas de rol/plan/override.

Reutilizar `CompanyLogo`, `WorkerAvatar` e `IdentityAvatar`; no introducir avatares duplicados ni exponer un RUT al generar un recurso externo.

## Arquitectura del repositorio

```text
src/
├── routes/                 # rutas públicas, legales y SSR (TanStack Start)
├── components/             # shell, navegación, QR, UI y módulos compartidos
├── hooks/                  # auth, datos tenant, GPS y estado de aplicación
├── lib/                    # dominio, repositorios, permisos, exportaciones y validaciones
├── views/                  # módulos funcionales y paneles
└── integrations/supabase/  # cliente y tipos
supabase/
├── functions/              # Edge Functions y utilidades compartidas
└── migrations/             # migraciones versionadas; estado remoto por verificar
docs/                       # auditorías, línea base, QA y decisiones
```

## Verificación local

En esta revisión se validaron TypeScript, la suite de Vitest (**44 pruebas aprobadas**), pruebas Deno de `worker-auth` (**17 aprobadas**), build Vite/Nitro y Prettier de los archivos tocados. ESLint no tuvo errores; el análisis completo mostró una advertencia de Fast Refresh en `src/components/QrCardGenerator.tsx`. No se completó todavía un E2E autenticado; estas pruebas no sustituyen la verificación del login con una cuenta worker sintética.

`bun.lock` es el lockfile del proyecto; se recomienda Bun para instalar dependencias. Los scripts disponibles están en `package.json`:

```bash
bun install
bun run dev -- --host 0.0.0.0 --port 4173
bun run typecheck
bun run test
bun run lint
bun run build
bun run test:e2e:public
bun run test:e2e:authenticated
```

La suite autenticada requiere variables y tenants QA sintéticos; no usar datos/credenciales de producción para pruebas. Si se usa npm, no generar o confirmar un segundo lockfile sin decisión explícita.

## Documentación que define el estado

- [`ROADMAP.md`](ROADMAP.md): estado actual, brechas de la lista adjunta, prioridad y criterios de cierre.
- [`SECURITY_DEPLOYMENT_CHECKLIST.md`](SECURITY_DEPLOYMENT_CHECKLIST.md): tareas que requieren staging, hosting, Supabase o aprobación.
- [`docs/PRIVACY_COMPLIANCE_BASELINE.md`](docs/PRIVACY_COMPLIANCE_BASELINE.md): inventario y límites de privacidad, no dictamen legal.
- [`docs/PHASE0_INVENTORY_20261101.md`](docs/PHASE0_INVENTORY_20261101.md): fotografía histórica de solo lectura de 1 de noviembre; no describe por sí sola el código actual.
- [`AGENTS.md`](AGENTS.md): instrucciones operativas locales del repositorio.

`roadmap.md` es un tablero corto de Dev Team complementario; no reemplaza el roadmap principal.

## Protocolo para futuros cambios

1. Leer este README, `AGENTS.md`, el componente objetivo y su repositorio/migración relacionados.
2. Identificar si el cambio afecta plataforma, tenant, trabajador, operación o dato sensible.
3. Verificar contrato de datos, esquema real, grants, RLS, funciones Edge y tenant scope.
4. Separar cambios locales de cambios desplegados; no aplicar DDL/DCL ni escribir en Supabase compartido sin autorización específica.
5. Preparar pruebas unitarias y, para autorización/datos personales, pruebas negativas en staging aislado.
6. Ejecutar typecheck, lint, pruebas y build; en cambios UI revisar responsive.
7. Documentar lo que sigue pendiente y no presentar una plantilla como formulario oficial sin validación.
8. No incluir secretos ni datos reales en commits, logs, fixtures o ejemplos.
