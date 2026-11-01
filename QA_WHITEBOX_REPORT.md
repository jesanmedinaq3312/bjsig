# Reporte QA white-box / SQL / navegador

Fecha de ejecución: 2026-10-27.

## Alcance

Se probó la preview autenticada de BJSIGAPP con la cuenta DevTeam proporcionada por el usuario, en navegador aislado. La contraseña no se guardó en archivos ni se incluye en este reporte.

## Resultado ejecutivo

- **Papelera de empresas: PASS después de reparación.** El primer intento reprodujo `42702 column reference "tenant_id" is ambiguous`. Se corrigió la RPC `public.set_saas_tenant_lifecycle` con aliases explícitos y reemplazo del `ON CONFLICT (tenant_id)` por `UPDATE ...; IF NOT FOUND INSERT ...`. La segunda corrección pasó.
- La empresa de prueba salió del directorio activo, quedó como `Papelera (1)`, `Archivada`, deployment `stopped`, y después de recargar no reapareció en el directorio. El evento `saas.tenant.lifecycle` quedó auditado.
- El panel DevTeam recargado mostró **3 empresas operativas** y **1 empresa para revisión**, junto con el estado vacío correcto cuando la consulta terminó durante la recarga.
- **Aislamiento de trabajadores: PASS por evidencia de UI + RLS.** Costa mostró 10 trabajadores `9002000x-*`; Norte mostró 10 trabajadores distintos `9003000x-*`. No apareció el trabajador QA de Costa en Norte.
- **Reconocimiento por RUT: PASS a nivel de contrato de datos.** El frontend normaliza RUT antes de buscar (`normalizeRut`) y el esquema impone `UNIQUE (tenant_id, rut)`. La lista y el dashboard muestran el trabajador correspondiente al tenant activo.
- **CRUD de trabajadores: lectura PASS; alta QA no persistida.** Se abrió y ejercitó el formulario, pero el alta no se confirmó porque la automatización por consola no reproduce fielmente todos los eventos controlados por React. La base quedó sin registros QA: cada tenant mantiene 10 trabajadores.
- **Eliminación de trabajadores: no ejecutada sobre datos reales.** Los controles y la RPC de cascada existen, pero no se borró ningún trabajador real durante esta corrida.

## SQL/RLS/performance

Las políticas efectivas relevantes fueron revisadas:

- `workers.op_workers`: lectura/escritura condicionada por `tenant_id = current_tenant_id()`.
- `workers.saas_platform_owner_workers_select`: el dueño de plataforma puede leer para soporte/control.
- Bloqueo de sesiones anónimas y guard MFA activo cuando la política lo exige.
- `tenant_memberships` permite escritura sólo al dueño de plataforma y lectura propia o de plataforma.
- Índices presentes: `workers_tenant_idx` y `workers_tenant_id_rut_key`.
- El plan de consulta de trabajadores por tenant usó `Seq Scan` porque cada tenant tiene sólo 10 filas; para el volumen actual es de bajo costo. Si el volumen crece significativamente, conviene revisar un índice compuesto `(tenant_id, full_name)` para ordenar por nombre sin sort adicional.
- Conteos productivos: cada tenant operativo probado tiene 10 trabajadores y 10 RUT distintos; no se observaron duplicados dentro de tenant.

## Migraciones aplicadas

- `fix_tenant_lifecycle_ambiguous_columns`
- `fix_tenant_lifecycle_upsert_ambiguity`

Los dos cambios también quedaron versionados en `supabase/migrations/`.

## Evidencia de navegador

- Preview: `https://4173-i73ha8g3so16gw0ay9a1u-46248ca4.us5.manus.computer/`
- Panel DevTeam: `/admin-saas`
- CRUD empresas: `/admin-saas` → Empresas → Directorio/Papelera
- Trabajadores Costa: `/costa-ambiental-demo/admin/workers`
- Trabajadores Norte: `/norte-seguridad-demo/admin/workers`
- La consola del portal de trabajadores de Norte no mostró errores.

## Pendientes recomendados

1. Añadir una prueba Playwright autenticada que use una cuenta QA dedicada y cree/edite/borre un trabajador con cleanup explícito.
2. Ejecutar la misma prueba con dos sesiones de empresa no privilegiadas, no sólo con el dueño de plataforma.
3. Añadir el índice `(tenant_id, full_name)` sólo cuando el volumen real lo justifique.
4. Verificar MFA real y los roles company owner / HR / operador / trabajador en staging.
