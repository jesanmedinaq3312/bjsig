-- Historial de IPs observadas para auditoría del DevTeam.
-- Devuelve IP, fecha, origen y resultado; no devuelve correo, filas ni contenido empresarial.
create or replace function public.fetch_saas_tenant_ip_history(_tenant_id uuid default null)
returns table (
  tenant_id uuid,
  ip_address text,
  observed_at timestamptz,
  source text,
  outcome text
)
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if not public.is_platform_owner() then
    raise exception 'PLATFORM_ROLE_REQUIRED' using errcode = '42501';
  end if;

  return query
  select a.tenant_id, a.ip_address::text, a.created_at, 'data_audit'::text, a.outcome
  from public.saas_data_audit_events a
  where a.ip_address is not null
    and (_tenant_id is null or a.tenant_id = _tenant_id)
  union all
  select l.tenant_id, l.ip_hint, l.created_at, 'login_attempt'::text,
    case when l.success then 'success' else 'failed' end
  from public.login_attempts l
  where nullif(trim(l.ip_hint), '') is not null
    and (_tenant_id is null or l.tenant_id = _tenant_id)
  union all
  select a.tenant_id, a.ip_hint, a.created_at, 'activity_log'::text, coalesce(a.status, 'observed')
  from public.activity_logs a
  where nullif(trim(a.ip_hint), '') is not null
    and (_tenant_id is null or a.tenant_id = _tenant_id)
  order by observed_at desc;
end;
$$;

revoke all on function public.fetch_saas_tenant_ip_history(uuid) from public;
grant execute on function public.fetch_saas_tenant_ip_history(uuid) to authenticated;
