# Auditoría UI/UX del panel DevTeam SaaS

## Alcance y evidencia

La revisión se realizó sobre el preview autenticado del panel `/admin-saas`, con el usuario developer disponible en la sesión de prueba, y sobre `src/views/settings/SaaSControlPanel.tsx`. Se inspeccionaron las vistas Resumen, Planes y vistas y Equipo Dev, además de la composición responsive observada en desktop. La suite disponible de Playwright continúa aprobada, pero sus pruebas actuales cubren principalmente superficie pública, rutas protegidas y responsive básico; no sustituyen una prueba específica de jerarquía, comprensión o eficiencia del panel SaaS.

## Diagnóstico ejecutivo

El panel funciona, pero su modelo mental es redundante y difícil de escanear. La navegación superior expone diez secciones al mismo nivel, mientras que varias de ellas vuelven a presentar listas de empresas y controles que podrían vivir dentro de un único espacio de administración contextual. El usuario debe recordar si una acción pertenece a **Resumen**, **Empresas**, **Planes y vistas**, **Identidad visual**, **Portales**, **Equipo Dev** o **Cartera**, aunque casi todas requieren seleccionar primero una empresa.

La principal causa estructural es que `SaaSControlPanel.tsx` concentra aproximadamente **2.930 líneas**, carga múltiples dominios de negocio y repite patrones de selección de empresa, badges, acciones y modales. El resultado es una interfaz operativa pero sobrecargada: demasiadas pestañas, demasiadas acciones icon-only y demasiadas configuraciones visibles simultáneamente.

> **Recomendación central:** pasar de un panel orientado a módulos técnicos a un panel orientado a decisiones operativas: **Empresas**, **Incidencias**, **Operadores**, **Facturación** y **Configuración**. La empresa seleccionada debe ser un contexto persistente, no una selección que se repite en cada vista.

## Hallazgos priorizados

| Prioridad | Hallazgo | Impacto | Evidencia observada | Recomendación |
|---|---|---|---|---|
| P0 | No existe un contexto persistente de empresa | El usuario repite selección mental y visualmente | Resumen, Empresas y Planes y vistas muestran listas de empresas distintas | Introducir un `TenantContextBar` global con selector, estado, plan y acciones principales |
| P0 | La acción destructiva histórica convivía con controles de administración | Riesgo operativo y de pérdida de datos | El componente contenía `deleteTenant`; ahora se reemplazó por ciclo de vida reversible | Mantener sólo Suspender, Archivar y Reactivar, con motivo, confirmación y auditoría |
| P0 | La navegación tiene diez pestañas planas | Sobrecarga cognitiva y baja encontrabilidad | Resumen, Empresas, Planes y vistas, Monitoreo, Portales, Respaldos, Identidad visual, Captadores, Equipo Dev y Cartera | Reducir a cinco grupos y mover acciones secundarias a subnavegación o menú contextual |
| P1 | Resumen y Empresas duplican el inventario de clientes | La misma información aparece dos veces con distinta presentación | Dos listas de empresas con avatar, plan, usuarios y estado | Convertir Resumen en métricas y alertas; dejar el inventario sólo en Empresas |
| P1 | Planes y vistas mezcla selección, plan y 38 toggles de módulos | El modal es largo, denso y difícil de comparar | Un modal muestra empresa, plan y una matriz completa de módulos ON/OFF | Separar Plan, Módulos y Excepciones manuales en tabs internas; usar grupos por dominio y búsqueda |
| P1 | Acciones icon-only poco descubribles | Baja comprensión y riesgo de error | Avisar, Editar, Suspender y Archivar se presentan como iconos pequeños | Usar botón primario con texto para acciones frecuentes y menú `Más` para secundarias; mantener `aria-label` |
| P1 | El estado comercial y el estado técnico aparecen juntos sin explicación | El usuario puede confundir `active`, `Activa`, `deployment_status` y suscripción | Las tarjetas muestran `active` y `Activa` simultáneamente | Unificar en un `LifecycleBadge` compuesto: Estado comercial + Estado técnico + Suscripción, con tooltip explicativo |
| P2 | El resumen deja demasiado espacio vacío | Baja densidad informativa útil y sensación de pantalla incompleta | En desktop la lista ocupa sólo una fracción superior del viewport | Añadir una franja de alertas accionables, próximos vencimientos y actividad reciente; no agregar métricas decorativas |
| P2 | La barra de pestañas depende de scroll horizontal | Menor visibilidad y navegación difícil en tablet | Diez pestañas dentro de un contenedor `overflow-x-auto` | En desktop usar sidebar compacta; en móvil usar selector de sección o bottom sheet |
| P2 | El detalle está presentado como modal para una tarea compleja | Se pierde contexto y el modal obliga a trabajar en una superficie estrecha | Planes y vistas contiene configuración extensa dentro de `Modal size="xl"` | Usar página contextual o drawer ancho para configuración; reservar modal para confirmaciones y ediciones breves |
| P2 | El lenguaje es inconsistente | Aumenta la carga de interpretación | “Empresas y contenedores”, “Planes y vistas”, “Vistas switchable”, “Cartera”, “Captadores” | Crear glosario de producto y textos orientados a negocio: Empresas, Acceso, Facturación, Operadores, Marca |
| P3 | La arquitectura del componente dificulta iterar | Alto riesgo de regresiones visuales | Un solo archivo mezcla fetch, mutaciones, modales y render de diez dominios | Extraer componentes, hooks y contratos por dominio antes del rediseño visual profundo |

## Problemas de jerarquía visual

### 1. El encabezado comunica estado, pero no la tarea principal

La fila superior combina cuatro contadores, un botón de actualización y una navegación extensa. Los contadores de empresas, operativas, alertas y eventos compiten con el contenido, pero no indican qué acción requiere atención. Deben convertirse en una banda de **salud operativa** con números comprensibles y enlaces a filtros.

**Propuesta:**

- Empresas activas: número y enlace a `Empresas`.
- Pendientes de pago: número y enlace a `Facturación`.
- Suspendidas/archivadas: número y enlace a filtro de estado.
- Alertas críticas: número y enlace a `Monitoreo`.
- Actualizar como acción secundaria, con timestamp discreto.

### 2. Se mezclan inventario, configuración y operación

Una lista de empresas es inventario. Cambiar un plan es configuración. Entrar al portal, publicar un aviso o suspender por impago son acciones operativas. Hoy aparecen en una misma jerarquía horizontal y se descubren por exploración.

**Propuesta de IA:**

1. **Inicio:** salud, alertas, pagos próximos, actividad reciente.
2. **Empresas:** inventario y detalle contextual.
3. **Operación:** monitoreo, portales y respaldos.
4. **Equipo y acceso:** Equipo Dev, memberships y permisos.
5. **Facturación:** cartera, suscripción, vencimientos y estado comercial.
6. **Configuración:** planes, módulos, branding y preferencias.

### 3. El modal de Planes y vistas tiene demasiadas decisiones

El usuario ve el plan y una matriz larga de módulos ON/OFF en una sola superficie. La lista no distingue módulos base, excepciones manuales, módulos bloqueados por plan ni módulos experimentales. Esto dificulta saber qué se está cambiando y por qué.

**Propuesta:**

- Cabecera: empresa, estado, plan vigente y botón “Cambiar plan”.
- Tab **Módulos**: grupos colapsables: Personas, Seguridad, Operación, Finanzas, Documentos y Administración.
- Tab **Excepciones**: sólo overrides manuales, con motivo y fecha.
- Tab **Acceso**: roles, memberships y usuarios.
- Mostrar una línea de ayuda: “El plan define la base; las excepciones sobrescriben módulos concretos”.
- Añadir buscador de módulos y filtros “Todos / Activos / Excepciones”.

## Arquitectura visual recomendada

```text
┌─────────────────────────────────────────────────────────────┐
│ Mi Portal · estado global · usuario · salir                 │
├─────────────────────────────────────────────────────────────┤
│ Empresa seleccionada [Buscar empresa]  Estado  Plan  ...    │
├───────────────┬─────────────────────────────────────────────┤
│ Inicio        │ Título de la tarea + breadcrumbs             │
│ Empresas      │                                               │
│ Operación     │ Contenido contextual                         │
│ Equipo y      │                                               │
│ acceso        │                                               │
│ Facturación   │                                               │
│ Configuración │                                               │
└───────────────┴─────────────────────────────────────────────┘
```

En desktop, una sidebar de 220–240 px debe reemplazar la barra horizontal de diez pestañas. En tablet, la sidebar puede colapsar a iconos con tooltip. En móvil, debe existir un selector de sección con el nombre visible de la sección activa y un botón de menú de al menos 44 px.

## Rediseño de la ficha de empresa

Cada empresa debe tener una ficha o página contextual con esta cabecera:

- Avatar/logo y nombre.
- Slug o identificador secundario.
- Estado comercial: Activa, Suspendida o Archivada.
- Estado técnico: Operativa, Detenida o Degradada.
- Plan y fecha de pago.
- Usuarios/memberships.
- Acción primaria: **Entrar al portal**.
- Menú secundario: **Suspender**, **Archivar**, **Reactivar**, **Editar**.

La acción de ciclo de vida debe usar una confirmación con texto explícito, motivo obligatorio y advertencia de impacto. No debe ser un icono ambiguo al lado de otros iconos.

## Plan de implementación por fases

### Fase A — Corrección estructural y lenguaje

1. Extraer `TenantContextBar`, `TenantLifecycleBadge`, `CompanyList`, `CompanyRow` y `ActionMenu`.
2. Unificar estados `tenant.status`, `tenant.active`, `subscription.status` y `deployment.status` en un view-model de presentación.
3. Renombrar etiquetas de producto y eliminar “switchable”, “containers” y términos técnicos visibles.
4. Mantener la funcionalidad actual y agregar tests de regresión para cada acción.

### Fase B — Nueva arquitectura de navegación

1. Reemplazar las diez pestañas por seis grupos: Inicio, Empresas, Operación, Equipo y acceso, Facturación y Configuración.
2. Persistir la empresa seleccionada en la URL o en un contexto navegable.
3. Mover Planes, Branding y módulos a la configuración de la empresa.
4. Dejar Monitoreo, Portales y Respaldos bajo Operación.
5. Dejar Cartera bajo Facturación.

### Fase C — Rediseño del resumen

1. Eliminar la segunda lista redundante de empresas del Resumen.
2. Crear cuatro tarjetas accionables de salud.
3. Añadir tabla corta de “Requiere atención”: impagos, empresas suspendidas, despliegues degradados y avisos pendientes.
4. Añadir actividad reciente con actor, empresa, acción y tiempo.

### Fase D — Configuración de empresa

1. Convertir el modal de Planes y vistas en una página o drawer contextual.
2. Agrupar módulos y añadir búsqueda/filtros.
3. Separar plan base de excepciones.
4. Hacer visibles las consecuencias del cambio antes de guardar.
5. Mantener confirmaciones para acciones de impacto y feedback inline.

### Fase E — Responsive y accesibilidad

1. Probar 375 px, 390 px, 768 px, 1024 px y 1440 px.
2. Reemplazar scroll horizontal de navegación por selector móvil/sidebar adaptativa.
3. Garantizar objetivos táctiles de mínimo 44×44 px.
4. Verificar foco visible, orden de lectura, nombres accesibles y cierre de drawers/modales con Escape.
5. Revisar contraste de badges y no usar color como único indicador.
6. Probar reduced motion y zoom de texto.

## Qué no hacer

- No añadir más pestañas a la barra actual.
- No agregar más contadores sólo para llenar espacio vacío.
- No mostrar todos los módulos siempre abiertos.
- No usar modales para configuraciones que requieren comparación o lectura extensa.
- No mantener acciones destructivas junto a acciones rutinarias.
- No resolver la redundancia ocultando contenido con `hidden` sin rediseñar la arquitectura.
- No cambiar colores o sombras antes de resolver jerarquía, navegación y contexto.

## Criterios de éxito

| Área | Criterio |
|---|---|
| Encontrabilidad | Un operador identifica dónde suspender una empresa en menos de 5 segundos |
| Contexto | La empresa seleccionada se mantiene visible al cambiar entre configuración, operación y acceso |
| Redundancia | Existe una única lista principal de empresas |
| Densidad | La vista inicial muestra salud y acciones, no sólo inventario repetido |
| Configuración | Un operador distingue plan base de override sin abrir documentación externa |
| Responsive | No existe scroll horizontal de la navegación principal en móvil |
| Accesibilidad | Todos los icon buttons tienen nombre accesible y foco visible |
| Seguridad | Suspender/archivar conserva datos, exige motivo y registra auditoría |
| Calidad | Build, E2E pública y E2E específica del panel pasan antes de publicar |

## Conclusión

El panel no necesita más funcionalidades visibles; necesita una **reducción de superficie y una mejor agrupación**. La prioridad es resolver el modelo mental: una empresa seleccionada, una navegación por tareas y una configuración progresiva. Después de esa reorganización, los ajustes de tipografía, color, estados y espaciado tendrán impacto real. Intentar “pulir” la apariencia sin corregir la arquitectura mantendría la redundancia y sólo produciría un panel más bonito, pero igual de difícil de operar.

## Base de reglas aplicada

La auditoría se alineó con las recomendaciones de UI/UX Pro Max para jerarquía de navegación, headings secuenciales, sticky navigation sin ocultar contenido, enfoque mobile-first, control de overflow, objetivos táctiles de al menos 44 px, feedback de interacción, contraste y divulgación progresiva de configuración.
