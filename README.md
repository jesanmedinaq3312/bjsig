# BJSIGAPP — Sistema Integrado de Gestión Empresarial

BJSIGAPP es un **SaaS multiempresa para gestión integrada de seguridad, operaciones y personas**. Permite que un Dev Team configure empresas aisladas, planes, módulos, branding, usuarios, turnos, asistencia, documentos, cumplimiento y comunicaciones. Debe evolucionar sin perder **aislamiento por empresa, control explícito de capacidades y trazabilidad**.

> Documento de continuidad para agentes humanos o de IA. Antes de cambiar código, leerlo completo y revisar la implementación relacionada. No asumir que un nombre de tabla, una clave de módulo o un tipo TypeScript coincide con Supabase: validar ambos lados.

## 1. Estado y alcance actual

Aplicación React 19 + TypeScript + Vite/TanStack Start con Supabase. Se importó desde un proyecto Lovable y se ejecuta en preview de Manus.

Capacidades actuales:

- Landing responsive con CTA de demo por WhatsApp.
- Panel Dev Team para empresas, planes, vistas, branding, landing, avisos y monitoreo.
- Control de vistas por **rol/permisos + plan + overrides del Dev Team**.
- Branding por empresa: logo, Blobavatar como fallback, tema, opacidad glass y landing.
- Blobavatar vinculado a empresa y persona en dashboard, trabajadores, asistencia, turnos, organigrama y portal individual.
- Modal responsive para detalles de empresas, planes y vistas.
- Avisos del desarrollador por empresa con plantilla, prioridad, fecha/hora, lectura y trazabilidad.
- Turnos: definiciones, asignaciones, duración, días, cambios e historial, aislados mediante `tenant_id`.
- Equipo Dev: operadores desarrolladores globales, empresas asignadas y permisos por módulo.
- Retiro del producto legado “BJ Brain 3D”; no debe aparecer en navegación, permisos ni copy.

## 2. Reglas de negocio no negociables

### 2.1 Jerarquía de autoridad

La autorización efectiva se evalúa así:

1. **Supabase/RLS y RPC server-side**: frontera de seguridad; el frontend nunca sustituye RLS.
2. **Contexto activo de empresa (`tenant_id`)**: toda operación debe quedar vinculada al tenant activo.
3. **Rol**: `superadmin` y `developer` son plataforma; los demás pertenecen a una empresa.
4. **Permisos**: por ejemplo `can_view_workers`, `can_view_shifts` o `can_edit_workers`.
5. **Plan y módulos habilitados**: una ruta empresarial no se muestra ni permite si el módulo está bloqueado.
6. **Override de empresa**: Dev Team puede activar o desactivar una clave para un tenant.

```text
acceso = sesión válida
      + tenant correcto
      + permiso del rol/usuario
      + módulo habilitado por plan u override
```

Un permiso positivo nunca debe saltarse el plan. Un operador de plataforma puede administrar el SaaS desde plataforma; dentro de una empresa debe respetarse la configuración empresarial y nunca mostrar controles de Dev Team a la empresa.

### 2.2 Aislamiento multiempresa

- Las tablas operativas tienen `tenant_id` y las queries filtran por `current_tenant_id()`.
- No hacer `select` global de trabajadores, turnos, documentos o finanzas para una vista empresarial.
- Al cambiar de empresa, separar/invalidate las claves de React Query por tenant usando `tenantQueryKey(tenantId, recurso)`.
- Turnos: aislar por `tenant_id + worker_rut`; no enlazar datos de otra empresa solo porque coincida el RUT.
- Avisos: persistir el `tenant_id` destino y mostrarlos solo en ese portal.
- Equipo Dev: `tenant_memberships` define las empresas autorizadas.

### 2.3 Vistas, planes y overrides

El Dev Team administra módulos desde **SaaS Control Panel → Planes y vistas**. Las claves de plan usan nombres de ruta (`dashboard`, `workers`, `shifts`, `organigrama`, `payroll`, `extendedfinance`, etc.). El código normaliza datos históricos con prefijo `can_view_` desde `tenant_settings.modules`.

Una clave ausente no habilita una vista empresarial. El dashboard es el único fallback mínimo seguro cuando una empresa carece de configuración.

Al crear una vista nueva:

1. agregarla al tipo de ruta y al mapa de navegación;
2. agregar `can_view_*`;
3. agregarla a `FEATURE_LABELS` del panel Dev Team;
4. agregarla a los planes fallback si corresponde;
5. filtrar con `moduleEnabled` en `Layout` y `TenantGate`;
6. probar usuario con/sin permiso, plan sin módulo y override explícito.

La empresa administra sus usuarios internos solo dentro de los módulos habilitados; no puede modificar su propio plan ni concederse módulos de plataforma.

### 2.4 Equipo Dev

Un operador adicional debe existir como desarrollador global en `allowed_emails` con `role = 'developer'`, `tenant_id = null`, `active = true` y permisos explícitos. Sus empresas se guardan como membresías activas en `tenant_memberships`. Debe poder suspenderse sin borrar historial y todo cambio relevante debe auditarse.

El panel Dev Team es la superficie para asignar empresas y módulos a desarrolladores. No hacerlo desde una pantalla empresarial.

### 2.5 Turnos

Las definiciones son plantillas; las asignaciones vinculan plantilla y trabajador; los cambios conservan historial.

Campos esperados:

- `shift_definitions`: `tenant_id`, `name`, `cycle`, `start_time`, `end_time`, `color`, `active`.
- `shift_assignments`: `tenant_id`, `worker_rut`, `shift_definition_id`, `shift_name`, `duration_type`, `start_date`, `end_date`, `days_of_week`, `assigned_by_email`, `active`.
- `shift_change_logs`: trabajador, turno anterior/nuevo, duración, fechas, motivo, tipo y emisor.

El esquema fue alineado porque tablas antiguas solo tenían campos genéricos (`name`, `label`, `status`, `data`) y no tenían `active`. Ante otra discrepancia de PostgREST, consultar `information_schema.columns` antes de cambiar UI.

### 2.6 Identidad y Blobavatar

Si existe foto/logo válido se usa; si no, Blobavatar determinístico por nombre/RUT; las iniciales son solo último fallback si falla Blobavatar. Reutilizar `CompanyLogo`, `WorkerAvatar` y `CompanyIdentityAvatar`; no crear avatares nuevos con `charAt(0)`.

### 2.7 Avisos del desarrollador

Un aviso se envía a una empresa o conjunto explícito. Plantillas: general, pago, regalo/beneficio y nota libre. Requiere título y detalle; prioridad, emisor, fecha/hora y lectura deben persistirse. La empresa puede marcar leído, pero no alterar contenido original ni su trazabilidad.

### 2.8 Identidad trabajador-operador y portales

Una persona puede tener simultáneamente una ficha personal de trabajador y una función operativa en su empresa; no se deben crear dos cuentas Auth para representar esas dos tareas. La ficha/RUT determina el acceso personal y el rol/permisos activos de la empresa determinan el acceso operativo. La autorización final sigue en RPC/RLS: elegir una ruta o mostrar una vista no concede permisos.

- `/trabajador` es el portal personal: valida RUT y luego solicita el correo registrado y la contraseña para ver únicamente los datos y solicitudes del propio trabajador.
- `/admin` (o `/<slug>/admin`) es el portal operativo: usa el mismo correo/contraseña, aplica permisos y módulos de la empresa y abre herramientas de trabajo, no la ficha personal.
- Si la misma persona tiene ambos accesos, puede entrar a cualquiera de los portales con la misma identidad y escoger el portal por la URL/enlace de acceso. El portal personal no debe redirigirla automáticamente al panel operativo solo porque tenga otro rol.
- El login de `/<slug>` y `/<slug>/admin` debe resolver logo, nombre y tema de ese tenant sin heredar la marca del tenant previamente abierto. Solo se expone branding público; usuarios, permisos y datos operativos permanecen protegidos.
- Si la organización usa una identidad global con `role = 'worker'` y permisos operativos adicionales, el servidor debe reconocer el vínculo personal sin convertir esos permisos en acceso administrativo amplio; la matriz RLS/RPC sigue limitando cada módulo.

**Hallazgo pendiente de seguridad (auditoría 2026-10-23):** en el Supabase conectado, varias políticas de tablas personales solo limitan por `tenant_id`, aunque el portal filtre por RUT en el cliente. Un trabajador autenticado podría omitir esos filtros mediante la API. En particular se verificó `op_workers` (`ALL`) y políticas tenant-wide para documentos, solicitudes, nómina, desempeño y turnos. No afirmar que el aislamiento por trabajador esté garantizado en backend hasta endurecer esas políticas y probar con cuentas separadas de trabajador y operador. No aplicar cambios RLS en producción sin aprobación explícita y respaldo.

## 3. Arquitectura

```text
src/
├── App.tsx                         # composición, rutas y guards
├── components/
│   ├── BjsigApp.tsx                # shell
│   ├── Layout.tsx                  # navegación
│   ├── TenantProvider.tsx           # tenant, módulos y cambio de empresa
│   ├── TenantGate.tsx               # bloqueo de rutas sin módulo
│   ├── CompanyLogo.tsx              # identidad de empresa
│   ├── WorkerAvatar.tsx             # foto/Blobavatar
│   └── ui.tsx                       # Modal, Button y UI compartida
├── hooks/
│   ├── useAppData.ts                # datos por vista/tenant
│   ├── useModuleData.ts             # queries de módulos
│   └── useWorkerData.ts              # portal individual
├── lib/
│   ├── tenant.ts                    # resolución/normalización de módulos
│   ├── roleAccess.ts                # roles y permisos
│   ├── repositories.ts              # repositorios Supabase con tenant scope
│   ├── types.ts                     # contratos TypeScript
│   ├── logo.ts                      # branding y CSS variables
│   └── supabase.ts                  # cliente
├── views/
│   ├── settings/SaaSControlPanel.tsx # Dev Team, planes y control SaaS
│   ├── settings/AccessControlPanel.tsx# usuarios empresariales
│   ├── shifts/                      # definiciones, asignaciones, calendario
│   ├── calendar/                    # asistencia
│   ├── Organigrama.tsx               # jerarquía
│   ├── WorkerPortal.tsx              # portal individual
│   └── workers/                      # personas
└── routes/                           # rutas TanStack Start
```

## 4. Contratos de datos

- `tenants`: identidad y estado de empresa.
- `tenant_settings`: `plan`, `modules`, `default_view`, límites.
- `saas_tenant_feature_overrides`: clave, enabled, motivo y tenant.
- `tenant_branding`: logo, tema, opacidad y landing.
- `allowed_emails`: correo, rol, tenant, permisos y activo.
- `tenant_memberships`: correo, tenant, rol, permisos y activo; esencial para Dev Team multiempresa.
- `tenant_role_permission_templates`: plantillas por rol.
- `shiftDefRepo`, `shiftAssignmentRepo`, `shiftChangeLogRepo`: contratos en `src/lib/types.ts` con tenant scope obligatorio.

## 5. Protocolo para futuros agentes

1. Leer este README, `AGENTS.md`, componente objetivo y repositorio relacionado.
2. Clasificar el cambio: plataforma, empresa, trabajador o dato operativo.
3. Verificar permisos, `tenant_id`, RLS/RPC y esquema real de Supabase.
4. Implementar persistencia/contrato antes de UI.
5. Reutilizar componentes de identidad, modal y permisos.
6. Probar 390×844, 768×1024 y desktop.
7. Ejecutar `npm run build`; en cambios visuales revisar preview.
8. Documentar cualquier nueva regla global.
9. No borrar datos ni cambiar seguridad, ownership o billing sin aprobación explícita y respaldo.

## 6. Comandos

```bash
npm install
npm run dev -- --host 0.0.0.0 --port 4173
npm run build
npm run preview
npm run lint
```

No documentar secretos. Mantener variables solo en `.env` local o gestor de secretos. Para preview de Manus, escuchar en `0.0.0.0` y usar la URL pública del puerto.

## 7. Checklist de aceptación

### Seguridad y aislamiento

- [ ] Empresa A no ve datos de Empresa B cambiando la URL.
- [ ] Usuario empresarial no puede abrir Planes, Branding global, Equipo Dev ni Monitoreo.
- [ ] Módulo bloqueado no aparece en sidebar y su ruta redirige de forma segura.
- [ ] Operador Dev ve solo empresas y módulos asignados.
- [ ] Queries operativas usan tenant scope y RLS permanece activa.

### Turnos

- [ ] Crear, activar/desactivar y editar definiciones.
- [ ] Asignar definición a trabajador de empresa activa.
- [ ] Ver asignación en calendario, asistencia, turnos y portal correspondiente.
- [ ] Desactivar conserva historial.
- [ ] No aparece `Could not find the 'active' column of 'shift_definitions'`.

### Responsive e identidad

- [ ] Modal de empresa/plan con scroll interno en móvil.
- [ ] Blobavatar visible en empresa, trabajadores, asistencia, organigrama, turnos y portal.
- [ ] Landing sin overflow en 390×844, 768×1024 y desktop.
- [ ] CTA abre WhatsApp sin enviar automáticamente.

## 8. Decisiones de continuidad

- Nombre actual: **BJSIGAPP**. “BJ Brain 3D” es legado y no debe reintroducirse.
- Compatibilidad histórica: normalizar claves y agregar columnas; no deshabilitar aislamiento.
- Migraciones preferentemente aditivas y reversibles.
- La app puede crecer, pero jerarquía de permisos y aislamiento son invariantes.
- Cada iteración debe entregar build, evidencia y nota de cambios.

## 9. Historial reciente de hardening

- Blobavatar en empresa, trabajadores, asistencia, organigrama, turnos y portal.
- Sliding Number de Animate UI integrado.
- Modal responsive del Dev Team mejorado.
- Avisos de desarrollador con prioridad y lectura.
- Esquema Supabase de turnos alineado con contratos de UI.
- Claves históricas `can_view_*` normalizadas a rutas.
- Catálogo de vistas ampliado y Brain 3D retirado.
- Pestaña Equipo Dev para operadores, empresas y módulos.

Última actualización: 2026-09-18.
