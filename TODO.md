

## Mensaje del home y tipografía (5 de noviembre de 2026)
- [x] Usar el H1 «Software multiempresa de RR. HH. y operaciones» y un H2 breve que explique el resultado SaaS.
- [x] Mantener el listado de personas, asistencia, turnos, prevención, documentos, procesos internos, módulos, permisos e identidad en el texto de apoyo.
- [x] Aplicar DM Sans Variable autoalojada, con títulos de peso 500 y jerarquía sobria; conservar fallback y licencia OFL.
- [x] Ajustar título y meta description, comprobar límites SEO, H1/H2 SSR, fuente cargada y 375/1280 px sin overflow; validar TypeScript, pruebas y build.

## Comparativa competitiva en la landing (16 de noviembre de 2026)
- [x] Agregar, sin quitar ni reemplazar información existente de la landing, un componente comparativo entre BJSIGAPP, Buk, Talana, GeoVictoria y otros sistemas pertinentes.
- [x] Priorizar visualmente funciones de BJSIGAPP en RR. HH., asistencia, EPP, incidentes, prevención de riesgos, IPER, ISO y contexto multiempresa.
- [x] Resumir focos y funciones públicas de competidores con base en la revisión realizada, sin enlaces salientes a sus plataformas.
- [x] Explicar por cada competidor cuándo BJSIGAPP es mejor opción según necesidades concretas de terreno, prevención y gestión multiempresa, sin afirmar superioridad universal.
- [x] Expresar las funciones de competidores que no se identificaron como no verificadas en sus páginas públicas consultadas, sin afirmar su inexistencia absoluta.
- [x] Mantener navegación accesible y presentación adaptable a móvil; validar diagnóstico de TypeScript, pruebas y build.

## Revisión de commits recientes (17 de noviembre de 2026)
- [x] Restablecer políticas permisivas tenant-scoped para leer y escribir `daily_shifts`, conservando como capa restrictiva la autorización y evitando que workers lean registros de otros RUT.
- [x] Alinear la visibilidad de lectura con permisos efectivos de edición para que roles personalizados autorizados también puedan actualizar filas.
- [x] Restaurar el contrato validado de `hero_images` sin perder la nueva opción `hero_link_url` ni reescribir migraciones ya publicadas.
- [x] Incorporar a CI las pruebas Deno de autorización compartida que faltaban.
- [x] Validar las migraciones con PostgreSQL embebido y pasar typecheck, lint, 68 pruebas unitarias y build.
- [ ] Confirmar los checks del PR y ejecutar las migraciones en una base Supabase de staging autorizada; el proyecto remoto no está disponible en el conector de esta sesión.
