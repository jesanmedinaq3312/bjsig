-- Preserve the existing global hero copy when introducing the canonical SaaS landing settings.
-- This runs after 20261109044500_public_landing_settings.sql has created its legacy source.
update public.saas_public_landing_settings as settings
set hero_title = coalesce(
      nullif(btrim(legacy.visual_assets #>> '{landing,hero_title}'), ''),
      settings.hero_title
    ),
    hero_description = coalesce(
      nullif(btrim(legacy.visual_assets #>> '{landing,hero_description}'), ''),
      settings.hero_description
    ),
    primary_cta_label = coalesce(
      nullif(btrim(legacy.visual_assets #>> '{landing,cta_label}'), ''),
      settings.primary_cta_label
    ),
    updated_at = now()
from public.public_landing_settings as legacy
where settings.singleton = true
  and legacy.id = 1
  and settings.updated_by is null
  and settings.hero_title = 'Software multiempresa de RR. HH. y operaciones'
  and settings.hero_description = 'Administra personas, asistencia, turnos, prevención, documentos y procesos internos desde una plataforma SaaS. Configura módulos, permisos e identidad para cada empresa.'
  and settings.primary_cta_label = 'Solicitar una demo';
