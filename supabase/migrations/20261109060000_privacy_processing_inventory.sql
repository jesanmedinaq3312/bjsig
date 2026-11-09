-- Inventario ampliado de privacidad. Esta migración añade metadatos y no activa
-- borrados automáticos ni determina por sí sola la base jurídica aplicable.

alter table public.saas_data_assets
  add column if not exists processing_purpose text,
  add column if not exists lawful_basis text,
  add column if not exists data_subject_categories text[] not null default '{}',
  add column if not exists collection_sources text[] not null default '{}',
  add column if not exists external_recipients text[] not null default '{}',
  add column if not exists international_transfer boolean not null default false,
  add column if not exists transfer_mechanism text,
  add column if not exists transfer_destination_countries text[] not null default '{}',
  add column if not exists automated_decision_making boolean not null default false,
  add column if not exists includes_minors boolean not null default false,
  add column if not exists legal_retention_basis text,
  add column if not exists deletion_procedure text,
  add column if not exists dpia_required boolean not null default false,
  add column if not exists dpia_status text not null default 'not_assessed'
    check (dpia_status in ('not_assessed','not_required','planned','in_progress','approved','review_due')),
  add column if not exists dpia_approved_at timestamptz,
  add column if not exists dpia_review_due_at date,
  add column if not exists risk_mitigations text;

alter table public.saas_data_governance_profiles
  add column if not exists controller_name text,
  add column if not exists privacy_contact_email text,
  add column if not exists processing_role text not null default 'confirm_required'
    check (processing_role in ('controller','processor','joint_controller','confirm_required')),
  add column if not exists minimum_user_age smallint not null default 18
    check (minimum_user_age >= 18),
  add column if not exists age_control_method text not null default 'self_attestation'
    check (age_control_method in ('self_attestation','verified','not_configured')),
  add column if not exists target_telemetry_retention_days smallint not null default 30
    check (target_telemetry_retention_days between 1 and 3650);

comment on column public.saas_data_assets.processing_purpose is
  'Finalidad específica del tratamiento; no asumir que “mejora y seguridad” cubre datos laborales.';
comment on column public.saas_data_assets.lawful_basis is
  'Base de licitud documentada por el responsable para esta finalidad; requiere revisión jurídica.';
comment on column public.saas_data_assets.data_subject_categories is
  'Categorías de titulares asociadas al activo; registrar menores cuando corresponda.';
comment on column public.saas_data_assets.includes_minors is
  'Declaración del operador sobre presencia de datos de menores; no equivale a verificación.';
comment on column public.saas_data_assets.target_telemetry_retention_days is
  'Objetivo de retención de telemetría, no configura purga ni acredita su ejecución.';
comment on column public.saas_data_governance_profiles.age_control_method is
  'Método de control de edad declarado; self_attestation no es verificación de identidad/edad.';
comment on column public.saas_data_governance_profiles.processing_role is
  'Rol por alcance del tratamiento. Confirmar contrato y finalidades antes de declarar responsable/encargado.';
