# Línea base de privacidad y protección de datos

**Versión de trabajo:** 0.1 · **Actualizada:** 9 de noviembre de 2026
**Organización informada por el cliente:** BJ Servicios Informáticos SpA · Chile
**Estado:** borrador operativo; requiere aprobación jurídica y validación de producción.

## Roles y alcance

BJSIGAPP procesa información de cuentas, trabajadores y empresas. Como hipótesis de trabajo, la empresa cliente define los fines y medios para los expedientes laborales que incorpora y BJ Servicios Informáticos SpA opera la plataforma por cuenta de esa empresa. Para cuentas, seguridad, soporte y administración de la plataforma, BJ puede determinar fines propios. El rol debe confirmarse tratamiento por tratamiento y reflejarse en los contratos; esta aplicación no debe etiquetar todos los datos como si BJ fuera un único responsable.

La Ley chilena 21.719 incorpora principios, obligaciones de información y derechos de las personas, y su texto oficial consultado indica vigencia desde el 1 de diciembre de 2026. El inventario de la aplicación es una herramienta de evidencia; no acredita por sí solo cumplimiento. [1]

## Hechos observados en el repositorio

La aplicación contiene módulos y tablas para perfiles de trabajadores, asistencia, turnos, documentos, nómina/cuentas bancarias, licencias médicas, actividad, incidentes y geolocalización asociada a flujos operativos. Por tanto, no es correcto comunicar que BJSIGAPP “no guarda datos”. La base ya registra auditoría e IP en algunos flujos; las funciones de ubicación y registro de sesión también requieren describirse con precisión según su despliegue.

El acceso pasa por autenticación y por una puerta GPS en el login. Esta primera implementación añade una autodeclaración de edad mínima de 18 años; no solicita fecha de nacimiento ni verifica identidad o edad. Un checkbox no impide por sí solo que una persona mienta ni prueba que no existan expedientes de menores ingresados por un cliente.

La directiva HTTP versionada mantiene `geolocation=()`, que bloquea el permiso del navegador, aunque el código de login requiere una captura GPS reciente. No se debe publicar el acceso laboral hasta que se elija y documente si GPS se habilita por acción expresa del usuario o se elimina ese requisito.

El cliente pidió un plazo de 30 días. Se modela como **objetivo de retención de telemetría**, no como regla de eliminación de expedientes laborales. El repositorio documenta que los logs son inmutables y que la política/ejecución de retención no estaba configurada. Hasta que se despliegue y compruebe una purga, no publicar que todos los datos se eliminan a los 30 días. Los expedientes de trabajo requieren reglas por categoría, obligaciones y contrato.

## Solicitudes externas y direcciones IP

Una conexión del navegador a una API, proveedor de autenticación, captcha o URL de imagen revela normalmente la dirección IP de origen al servidor receptor; las cabeceras y metadatos de red también pueden revelar información técnica. Una IP puede ser dato personal cuando se relaciona con una persona identificable, según el contexto del RGPD. [2]

Se eliminaron los avatares de respaldo que enviaban nombre o RUT a `blobatar.dev` y la imagen QR remota de `api.qrserver.com`; el QR se genera localmente. El código revisado no contiene Google Analytics ni Google Tag Manager y la CSP versionada no autoriza orígenes de analítica de Google. Se restringieron imágenes a recursos propios/Supabase. Los enlaces externos a Google Drive siguen siendo acciones voluntarias: al abrirlos el navegador revela la IP al proveedor. La configuración de hosting/CDN y cabeceras servidas en producción no se inspeccionó.

Por instrucción del cliente, Turnstile está pausado en esta versión. Un guard explícito en navegador y Edge retorna antes de cargar scripts o ejecutar `fetch`, y la CSP bloquea Cloudflare; no se configuraron site key ni secretos desde este trabajo. El flujo worker falla cerrado. Si se reactiva el código en el futuro, la verificación server-side enviará `remoteip` a Cloudflare; requiere aprobación previa, actualización de avisos/contratos y revisión de transferencias. No se afirma que la configuración de producción haya sido auditada.

El banner se convirtió en un aviso informativo sin categorías opcionales ni consentimiento analítico. La constancia local de lectura vence a los 12 meses.

## Criterios de implementación

Cada activo debe registrar una finalidad concreta, base de licitud confirmada por el responsable, categorías de titulares, fuente, destinatarios, países y garantías de transferencia, plazo y procedimiento de eliminación, presencia de menores y decisión automatizada. “Mejora y seguridad” puede describir parte de la telemetría del servicio, pero no sustituye la finalidad ni la base aplicable a nómina, salud, asistencia o ubicación.

El mínimo de 18 años es una regla de acceso/autodeclaración del servicio según las instrucciones del cliente. No equivale a una excepción general a la normativa de menores, no permite aceptar datos infantiles por otro canal y no resuelve la posibilidad de que la empresa cliente cargue información sobre trabajadores menores. Mantener esa posibilidad bloqueada y revisar el flujo de carga antes de declarar “no tratamos datos de menores”.

La retención objetivo de 30 días debe implementarse con tareas de purga verificables, tratamiento de réplicas/backups y excepciones legales/documentadas. No aplicar borrado uniforme a documentos de empleo, remuneraciones, asistencia o evidencia que pueda tener obligaciones de conservación. Toda excepción debe registrarse como retención justificada o legal hold y revisarse periódicamente.

## Alcance europeo y estadounidense

El RGPD puede aplicar a una empresa establecida en la UE o a quien ofrezca servicios a personas en la UE o monitorice su comportamiento allí; su artículo 13 requiere informar, entre otros puntos, fines, bases, destinatarios y plazos o criterios de conservación. No se puede afirmar cumplimiento europeo únicamente por publicar una política. [2]

En Estados Unidos no existe una sola ley federal general que sustituya las leyes estatales y sectoriales. COPPA se centra en información de menores de 13 años y no es un régimen general de privacidad para trabajadores adultos. La CCPA/CPRA de California puede aplicar a empresas que hagan negocios allí y cumplan umbrales legales; sus exenciones anteriores para datos de empleo y B2B expiraron a fines de 2022. La aplicación territorial y los umbrales deben analizarse para cada operación. [3] [4]

## Pendientes antes de declarar cumplimiento

- Completar un inventario real de activos y confirmar, por tratamiento, responsable/encargado, finalidad, base, categorías, fuentes, destinatarios y países.
- Aprobar una versión pública de la política y sustituir canales genéricos por un canal comprobado para solicitudes de titulares, con responsables y plazos aprobados.
- Revisar y probar una barrera 18+ en cada portal y en altas/invitaciones; definir cómo detectar y responder a datos de menores recibidos pese a la regla.
- Acordar retenciones por activo, desplegar el proceso de eliminación y verificarlo en datos activos, logs, réplicas y backups.
- Completar el registro de proveedores, acuerdos de tratamiento, subencargados, ubicación y mecanismo de transferencias.
- Determinar si corresponde una evaluación de impacto, completar mitigaciones y fijar revisión periódica.
- Confirmar la configuración de analítica, recursos externos, encabezados HTTP, logs de hosting y acceso a IP en producción.
- Hacer revisión jurídica local del contrato SaaS, la política, reglas laborales/archivo y aplicación territorial en Europa y EE. UU.

## Referencias

[1]: https://www.bcn.cl/leychile/navegar?idNorma=1209272 "Ley 21.719 en LeyChile de la Biblioteca del Congreso Nacional"
[2]: https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX%3A32016R0679 "Reglamento General de Protección de Datos de la Unión Europea"
[3]: https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions "FTC COPPA Frequently Asked Questions"
[4]: https://oag.ca.gov/privacy/ccpa "California Consumer Privacy Act, California Attorney General"
