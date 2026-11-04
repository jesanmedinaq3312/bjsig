# Landing page: mensajes que venden y captan leads

Solo se modifica la landing pública. No se tocan el admin, el portal del trabajador ni el backend.

## 1. Portada: qué vendemos, en una línea
- Nuevo H1 (gancho: pereza + control): **"Deja de perseguir papeles. Controla personas, seguridad y cumplimiento de todas tus empresas desde un solo lugar."**
- Subtítulo concreto: "BJSIGAPP digitaliza asistencia, EPP, capacitaciones, documentos y Ley Karin. Tus trabajadores firman y reportan desde el celular; tú ves todo en un panel."
- 3 cifras de ahorro de tiempo bajo el botón, por ejemplo "-70% tiempo en papeleo", "Alertas antes de cada vencimiento", "Listo en días, no meses". Estas cifras son ejemplos, así que tendrás que confirmarlas o darme las reales.
- Botón principal: "Quiero mi demo gratis" (abre el formulario corto). El segundo botón, "Soy colaborador", se mantiene.

## 2. Nueva franja de ganchos: "¿Te suena?"
Seis tarjetas animadas, cada una con un dolor y su solución:
- **Pereza:** "¿Planillas, carpetas y firmas a mano?" → todo automático y digital.
- **Miedo / seguridad:** "¿Una fiscalización o un accidente te pillaría sin respaldo?" → evidencia lista y trazable.
- **Envidia:** "Tu competencia ya opera digital." → súmate a las empresas que ya controlan su operación.
- **Orgullo / innovación:** "Lidera con tecnología, no con Excel."
- **Avaricia (ahorro):** "Cada multa evitada y cada hora ahorrada es margen."
- **Control / multiempresa:** "Todas tus empresas, faenas y contratistas en un solo panel."

## 3. "Cómo te ahorras el tiempo": antes y después
Una comparación en dos columnas (manual frente a BJSIGAPP) para asistencia, entrega de EPP, capacitaciones, documentos y denuncias.

## 4. "Cómo funciona" en 3 pasos
1. **Solicitas** una demo (te toma 30 segundos).
2. **Configuramos** tu empresa, tus módulos y tu marca.
3. **Operas**: tus trabajadores entran con su RUT y tú controlas todo desde el panel.

## 5. Captar el lead fácilmente
- Formulario corto en la sección de contacto: nombre, empresa, WhatsApp o correo, y número de trabajadores (opcional).
- Al enviarlo se abre WhatsApp con el mensaje ya escrito con esos datos. Esto usa el enlace de WhatsApp que ya existe, así que no se guarda nada nuevo.
- Un botón fijo "Pedir demo" siempre visible en el celular.
- Nuevo título de contacto (gancho de urgencia): "No te quedes atrás. Agenda tu demo hoy."

## 6. Ajustes de textos
- Se reescriben los beneficios y los títulos de las secciones existentes (Solución, Módulos, Seguridad, FAQ) para hablar de resultados, no de funciones.
- Se actualizan el título y la descripción que aparecen en Google con el nuevo mensaje.

## Detalles técnicos
- Archivo: `src/views/PublicLanding.tsx`. La navegación por secciones (`landingSections` y `goToSection`) se amplía con las secciones nuevas (Ganchos y Cómo funciona).
- Se reutilizan las clases de animación ya existentes (`landing-*`) y se respeta la opción de reducir movimiento.
- El formulario solo funciona en el navegador y arma una URL `wa.me` con `encodeURIComponent`. No se usa el backend.
