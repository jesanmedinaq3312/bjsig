# Reloj control conforme a la DT (Ord. 2927/58) + push a main

Nota: la certificación final la otorga una entidad acreditada (DICTUC, Bureau Veritas, Applus). Esto deja el software listo para esa auditoría; no reemplaza el certificado.

Base actual: las marcas QR ya son inmutables (`qr_scan_events` solo inserción) y la hora se muestra en America/Santiago.

## 1. Hora oficial SHOA
- La hora de cada marca la fija el servidor de base de datos (nunca el teléfono).
- Tarea programada cada 5 min compara el reloj del servidor con la hora oficial SHOA (horaoficial.cl / ntp.shoa.cl vía HTTP) y guarda el desfase.
- Si el desfase supera la tolerancia (configurable, por defecto 1 s), la marca queda registrada con alerta y se avisa al DevTeam.
- Cada marca guarda: hora SHOA, desfase medido y fuente.

## 2. Comprobante automático
- Tras cada marca (entrada, salida, inicio/fin colación) se envía correo al trabajador con: fecha, hora SHOA, ubicación GPS/dirección, tipo, empresa, RUT y código de verificación (hash).
- Página pública `/verificar/<código>` para validar el comprobante.
- El comprobante también se puede descargar en PDF desde el portal del trabajador.
- Requiere configurar un dominio de correo (aparecerá una tarjeta para hacerlo).

## 3. Perfil Fiscalizador DT
- Nuevo rol `fiscalizador_dt`, solo lectura, creado por el administrador de la empresa con vigencia (fecha de expiración) y obligatorio con MFA.
- Vista propia: jornadas, turnos, marcas originales, modificaciones y reportes, con filtros por trabajador/fecha y exportación PDF/Excel.
- Toda consulta del fiscalizador queda en la bitácora.

## 4. Modificaciones inalterables
- Tabla de rectificaciones: nunca edita la marca original; propone un cambio con motivo.
- Cadena de hash (cada registro incluye el hash del anterior) en marcas y rectificaciones; verificación de integridad visible para fiscalizador.
- La rectificación solo aplica cuando el trabajador la acepta o rechaza desde su portal (queda registro de fecha, hora e IP).

## 5. Reportes semanales/mensuales
- Generación automática del consolidado (horas trabajadas, atrasos, horas extra, colación, ausencias) por trabajador.
- El trabajador da conformidad u observa desde su portal; queda con hash y fecha.
- Disponible para empresa y fiscalizador.

## 6. Pruebas y envío
- Pruebas: tolerancia de desfase, cadena de hash detecta alteración, rectificación sin aceptación no aplica, fiscalizador no puede escribir, fiscalizador vencido sin acceso.
- Commit y push a `main` de github.com/jesanmedinaq3312/bjsig por el conector de GitHub, verificando que coincida archivo por archivo.

## Detalles técnicos
- Migraciones: `attendance_time_sync`, `attendance_marks` hash chain (columnas `prev_hash`, `row_hash` vía trigger SHA-256 en `qr_scan_events`), `attendance_rectifications`, `attendance_reports`, rol en `user_roles` + función `has_role`, RLS por tenant.
- Sincronización: server route `/api/public/cron/shoa-sync` protegida con secreto + pg_cron (workerd no permite UDP/NTP, por eso HTTP).
- Correo: plantillas transaccionales de Lovable Emails disparadas desde server function tras insertar la marca.
