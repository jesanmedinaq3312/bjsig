# Resultados E2E — Portal del Trabajador

**Fecha:** 2026-11-04

**Base examinada:** `main` en `5c4d5b1` (checkout limpio desde GitHub).

**Ambiente:** preview local efímera y proyecto Supabase BJSIG beta; la aplicación no se publicó.

**Estado:** **parcial; el flujo remoto de primer acceso no está cerrado.**

## Identificación de proyecto y evidencia remota

- Repositorio fuente autorizado: https://github.com/jesanmedinaq3312/bjsig
- Organización compartida por el usuario: https://supabase.com/dashboard/org/blpydwgxylsrdnizbfbi
- `supabase.list_projects` y `supabase.get_project` devolvieron un único proyecto en esa organización: `BJSIG`, ref `uoozvmrkbrbvbhsuphhm`, estado `ACTIVE_HEALTHY`.
- El ref coincide con el URL configurado en `src/lib/supabaseConfig.ts` y con el proyecto identificado en `SECURITY_COMPLETION.md`. El usuario confirmó que ese destino corresponde a la beta; no se seleccionó ni tocó otro proyecto.
- Antes del despliegue, `worker-auth` estaba activa en versión 46 con `verify_jwt=false`. Se desplegó únicamente `worker-auth`; quedó activa en versión **47** y conservó `verify_jwt=false`.
- Un smoke test sin datos QA envió una acción desconocida y recibió HTTP 400, el resultado esperado del router activo. No se modificaron datos de cuentas.
- La consulta agregada de solo lectura previa mostró 14 cuentas `worker` en Costa Ambiental y Prevención Ltda. con `must_change_password=false`; por lo tanto, no había una cuenta armada para probar de inmediato el primer acceso.
- La consulta exacta previa encontró la solicitud `[QA E2E] Solicitud de consulta`. No se creó ni duplicó ninguna solicitud.
- No se crearon, restablecieron ni eliminaron perfiles QA. Tampoco se abrió una sesión QA en esta ejecución.

**Fuentes remotas:** MCP de Supabase (`list_organizations`, `list_projects`, `get_project`, `list_edge_functions`, `get_edge_function` y consultas agregadas de solo lectura); despliegue MCP de `worker-auth`; smoke HTTP sin datos QA; repositorio y documentos anteriores. No se almacenaron identificadores personales ni credenciales.

## Antecedentes aportados por el usuario

El adjunto indica que, en una iteración anterior, cuatro perfiles QA sintéticos completaron el primer acceso; QA 1 visitó las siete pestañas; QA 3 y QA 4 probaron Asistencia; y la solicitud QA citada ya existía. Esos pasos anteriores no se repitieron ni se verificaron visualmente en esta ejecución.

## Hallazgos al importar la rama

- La ruta de la sesión previa no estaba montada. Se clonó el repositorio en `/home/ubuntu/bjsig` sin sobrescribir otra copia.
- `docs/e2e-worker-portal-results.md` y `src/test/setup.ts` no estaban en `main`; `vitest.config.ts` apuntaba al setup ausente y varios tests importaban `node:test` aunque el script usa Vitest.
- En el código base, `set_initial_password` no exigía ni comprobaba la contraseña temporal, no requería `must_change_password=true` y aplicaba una política diferente de la UI.
- `worker-auth` versión 46 era el baseline remoto anterior al cambio.

## Cambios reconstruidos

- **Frontend:** política compartida de contraseña con allowlist explícita de símbolos; el primer acceso envía la contraseña temporal en memoria; los formularios inicial y de cambio normal muestran y aplican la misma política; el nuevo valor no puede ser igual al temporal.
- **Backend:** `set_initial_password` verifica la contraseña temporal mediante cliente Supabase anon efímero (`persistSession=false`, `autoRefreshToken=false`), valida cuenta worker activa y estado de primer acceso, caducidad y rate limit; solo después actualiza Auth y el flag. Rechazos no actualizan la cuenta. Los errores internos se devuelven de forma genérica y no se guardan campos arbitrarios del body en la auditoría.
- **Cambio normal de contraseña:** se conserva la verificación de sesión y contraseña actual, y se reutiliza la política server-side.
- **Tests:** setup Vitest mínimo, conversión de pruebas existentes a Vitest y siete pruebas Deno del handler para política, contraseña temporal incorrecta/correcta, replay, rate limit, expiración y contraseña definitiva distinta.
- **Playwright público:** se alinearon selectores obsoletos de la landing con su copy actual y se valida la transición al panel de contacto sin cambiar el hash, abrir WhatsApp ni enviar el formulario.

## Validaciones finales

| Caso | Resultado |
|---|---|
| `pnpm run test` | **Aprobado:** 12 tests Vitest |
| `pnpm run typecheck` | **Aprobado** |
| `pnpm run build` | **Aprobado** |
| `git diff --check` | **Aprobado** |
| `deno test supabase/functions/worker-auth/tests/set_password_test.ts` | **Aprobado:** 7 passed, 0 failed |
| `deno check supabase/functions/worker-auth/source/index.ts` | **Aprobado** |
| `pnpm run test:e2e:public` | **Aprobado:** 30 passed (desktop, móvil y tablet) |
| `pnpm run lint` | **Pendiente de corregir:** 161 errores y 2 warnings globales; son principalmente reglas de formato Prettier repartidas por el repositorio. Se detectaron 18 hallazgos de formato en `worker-auth-utils.ts`; no se ejecutó un formateo masivo de archivos ajenos. |
| Despliegue beta `worker-auth` | **Aprobado:** versión 47, activa, `verify_jwt=false`, destino cotejado con la organización compartida y el ref del repositorio |
| Smoke HTTP del router desplegado | **Aprobado:** acción desconocida respondió 400; no se tocaron cuentas |

La primera ejecución Playwright expuso expectativas antiguas de heading, etiqueta del CTA y cambio de hash. Se corrigió únicamente `e2e/public.spec.ts` para reflejar la interfaz actual y la repetición completa pasó 30/30. No se cambió el comportamiento de la landing ni se envió información a WhatsApp.

## Pruebas remotas pendientes y bloqueo

En el navegador autorizado, `/admin` queda en la pantalla que indica que los campos seguirán bloqueados hasta activar GPS; no había una sesión BJSIG Dev autenticada disponible. Conforme al alcance confirmado, no se restablecieron credenciales por SQL ni por otro canal, no se rearmó ningún perfil y no se intentó usar datos personales de trabajadores. Por ello siguen pendientes:

- Rechazo remoto de contraseña temporal incorrecta en un perfil QA armado.
- Primer acceso remoto con la temporal correcta, establecimiento de nueva contraseña e ingreso posterior.
- Rechazo de replay y verificación remota de rate limit/expiración.
- Portal y pestañas de los cuatro perfiles QA, reutilizando los existentes.
- Cierre de las sesiones QA al final: no se abrió ninguna en esta ejecución, así que no hubo sesiones QA que cerrar.

Las siete pruebas Deno anteriores son simulaciones locales del handler; **no sustituyen** esas pruebas con credenciales QA reales. El flujo E2E no debe marcarse como cerrado hasta completar los casos remotos desde la sesión Dev autorizada.

## Restricciones y estado del espacio de trabajo

No se publicó la aplicación, no se aplicó ninguna migración y no se modificaron datos de Supabase ni perfiles QA. El usuario autorizó crear y enviar un commit de estos cambios al branch actual; ese envío contiene código y documentación, no es una acción de publicación. Solo se desplegó `worker-auth` en el ref BJSIG indicado arriba. La preview sigue siendo local/efímera y no equivale a publicación.