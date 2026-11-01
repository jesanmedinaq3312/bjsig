-- Bootstrap seguro para Gobierno de datos.
-- No crea activos, contactos, solicitudes ni incidentes ficticios.
-- Sólo genera perfiles iniciales y un snapshot diario calculado desde tablas existentes.

insert into public.saas_data_governance_profiles (
  tenant_id,
  maturity_level,
  has_personal_data,
  has_sensitive_data,
  document_review_status,
  notes
)
select
  t.id,
  'initial',
  exists (
    select 1
    from public.workers w
    where w.tenant_id = t.id
  ),
  false,
  'pending',
  'Perfil inicial generado automáticamente; requiere revisión del equipo DevTeam.'
from public.tenants t
where t.active
on conflict (tenant_id) do nothing;

insert into public.saas_tenant_usage_daily (
  tenant_id,
  usage_date,
  active_users,
  records_count,
  files_count,
  storage_bytes,
  processing_jobs,
  imports_count,
  exports_count,
  api_calls,
  processing_errors,
  plan_storage_limit_bytes,
  calculated_at
)
select
  t.id,
  current_date,
  (
    select count(*)::integer
    from public.allowed_emails ae
    where ae.tenant_id = t.id
      and ae.active
  ),
  (
    select count(*)::bigint
    from public.workers w
    where w.tenant_id = t.id
  ),
  (
    select count(*)::bigint
    from public.cloud_documents d
    where d.tenant_id = t.id
  ),
  0::bigint,
  0,
  0,
  0,
  0,
  0,
  null,
  now()
from public.tenants t
where t.active
on conflict (tenant_id, usage_date) do nothing;
