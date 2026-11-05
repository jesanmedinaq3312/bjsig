# Resultados E2E — Portal del Trabajador

**Actualizado:** 2026-11-04 (hora local de la sesión)

**Estado:** correcciones del flujo implementadas y backend beta actualizado; la aceptación manual con cuentas QA sigue pendiente. No declarar el E2E completo hasta realizar esas pruebas.

## Estado actual

- Proyecto destino confirmado por el usuario como beta: `BJSIG`, ref `uoozvmrkbrbvbhsuphhm` (`uoozvmrkbrbvbhsuphhm.supabase.co`). Es el único proyecto visible en la organización compartida y coincide con el host configurado en el cliente.
- `worker-auth` está **activa en versión 49**, `verify_jwt=false` (se preservó el ajuste previo). La versión 48 fue reemplazada enseguida por la 49 tras corregir una transcripción de código detectada al revisar el bundle. Un smoke test inocuo de la versión activa, enviando una acción desconocida, respondió HTTP 400 con `Acción no reconocida.` como se esperaba. No se modificaron cuentas ni se consultaron datos de trabajadores.
- La vista previa manual está disponible en [https://5173-ir5bqf4auxnv5sqn79e23-040a27f0.us4.manus.computer/trabajador](https://5173-ir5bqf4auxnv5sqn79e23-040a27f0.us4.manus.computer/trabajador). La ruta respondió HTTP 200 desde el túnel público y el frontend está configurado para el proyecto beta indicado. La app puede ser probada por el usuario con sus credenciales introducidas directamente en la pantalla; no compartir credenciales por chat.
- No se hizo commit ni push. Los cambios de aplicación, Edge Function, pruebas y reporte permanecen en el checkout local.

## Bugs corregidos

1. **Prechequeo de identidad y exposición del RUT:** `check_account` antes permitía consultar una cuenta por correo y devolvía el RUT completo al cliente. Ahora exige que correo y RUT válido coincidan del lado servidor, responde de forma genérica ante discordancia y no devuelve ni registra el RUT completo.
2. **Rate limit del login:** los intentos fallidos de contraseña en el portal no se acumulaban bajo la clave consultada por el prechequeo. Se agregó la acción `record_login_failure` y una clave compartida por correo/IP para contar fallos de RUT/correo y contraseña en el mismo límite.
3. **Política de recuperación de contraseña:** la UI de recuperación aceptaba claves sin símbolo aunque el primer acceso, el cambio de contraseña y el backend lo requerían. Ahora comparte la política y muestra el requisito de símbolo permitido.
4. **Autorización por ruta de tenant:** el slug en la URL podía saltarse la denegación de vistas administrativas. Se eliminó ese bypass; la vista efectiva y la pantalla de acceso denegado dependen del permiso.
5. **Aislamiento de capacitaciones:** la consulta `trainings_ds44` del portal filtraba por RUT, pero no por tenant. Ahora aplica también el `tenant_id` activo.

## Validaciones ejecutadas

| Validación | Resultado |
|---|---|
| Vitest frontend | **13 pasaron**, 4 archivos |
| TypeScript (`tsc --noEmit`) | **Aprobado** |
| Build Vite | **Aprobado** |
| ESLint focalizado en archivos frontend modificados | **Aprobado** |
| Pruebas Deno worker-auth | **11 pasaron**, 0 fallidas |
| `deno check` del entrypoint de worker-auth | **Aprobado** |
| Formato Deno focalizado en handlers/router/tests nuevos o modificados | **Aprobado** |
| `git diff --check` | **Aprobado** |
| HTTP público de la vista `/trabajador` | **200** |
| Smoke test del endpoint desplegado | **400 esperado** para acción desconocida; sin acceso/escritura a datos personales |

El build local produjo salida de compilación satisfactoria. La suite Deno prueba handlers con clientes simulados; no reemplaza las pruebas autenticadas contra una cuenta QA real.

## Pruebas manuales aún pendientes

En la vista previa, el usuario debe comprobar con cuentas QA autorizadas: acceso normal del trabajador, flujo de primer acceso/cambio de contraseña si hay perfil QA preparado, rechazo de contraseña incorrecta y limitación después de fallos, recuperación con política de símbolo, y carga de las pestañas y datos solo del tenant propio. No he restablecido, creado ni eliminado cuentas ni usado perfiles personales. Si se detecta un error en las pruebas, compartir únicamente el mensaje/captura sin contraseña, token, RUT ni datos personales.

## Evidencia histórica conservada

- La iteración anterior reportó cuatro perfiles QA sintéticos para el primer acceso, exploración de siete pestañas por QA 1 y pruebas de Asistencia por QA 3/4. Esos pasos previos no se repitieron aquí.
- Las versiones 46 y 47 y la etiqueta `PRODUCTION` vista en una revisión anterior pertenecen a evidencia histórica. Después el usuario confirmó que el ref `uoozvmrkbrbvbhsuphhm` es beta; se cotejó la app con ese ref y el despliegue autorizado fue solo a ese proyecto.
- Al importar el repo se encontraron pruebas frontend y checks previos documentados; el reporte anterior describió además cambios del primer acceso, política server-side, expiración, replay y Playwright público. Esas notas no implican que las pruebas manuales autenticadas actuales estén completas.
- No se aplicaron migraciones de base de datos ni se modificaron filas o perfiles QA en esta continuación.
