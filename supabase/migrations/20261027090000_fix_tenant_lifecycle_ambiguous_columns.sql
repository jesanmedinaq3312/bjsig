-- Corrige 42702: tenant_id ambiguo entre RETURNS TABLE y columnas de tablas.
create or replace function public.set_saas_tenant_lifecycle(
  _tenant_id uuid,
  _status text,
  _reason text default null
)
returns table(tenant_id uuid, tenant_name text, tenant_active boolean, tenant_status text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  clean_status text := lower(trim(coalesce(_status, '')));
  clean_reason text := nullif(trim(coalesce(_reason, '')), '');
  tenant_row public.tenants%rowtype;
  next_active boolean;
  deployment_status text;
  subscription_status text;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;
  if not public.is_platform_owner() then
    raise exception 'PLATFORM_ROLE_REQUIRED' using errcode = '42501';
  end if;
  if clean_status not in ('activa', 'suspendida', 'cortada') then
    raise exception 'INVALID_TENANT_STATUS' using errcode = '22023';
  end if;

  select t.* into tenant_row
  from public.tenants as t
  where t.id = _tenant_id
  for update;

  if not found then
    raise exception 'TENANT_NOT_FOUND' using errcode = '22023';
  end if;
  if lower(tenant_row.name) = 'dev team' then
    raise exception 'PLATFORM_TENANT_NOT_MUTABLE' using errcode = '42501';
  end if;

  next_active := clean_status = 'activa';
  deployment_status := case when next_active then 'active' else 'stopped' end;
  subscription_status := case clean_status
    when 'activa' then 'active'
    when 'suspendida' then 'suspended'
    else 'cancelled'
  end;

  update public.tenants as t
  set active = next_active,
      status = clean_status
  where t.id = _tenant_id;

  update public.tenant_memberships as tm
  set active = next_active
  where tm.tenant_id = _tenant_id;

  update public.allowed_emails as ae
  set active = next_active
  where ae.tenant_id = _tenant_id;

  insert into public.saas_tenant_deployments(tenant_id, status, reason, updated_at)
  values (_tenant_id, deployment_status, clean_reason, now())
  on conflict (tenant_id) do update set
    status = excluded.status,
    reason = excluded.reason,
    updated_at = excluded.updated_at;

  update public.saas_tenant_subscriptions as stsub
  set status = subscription_status,
      updated_at = now()
  where stsub.tenant_id = _tenant_id;

  insert into public.activity_logs(
    tenant_id, name, label, action, entity, entity_id, entity_label, details,
    user_email, user_role
  ) values (
    _tenant_id,
    'saas.tenant.lifecycle',
    'Estado comercial de empresa actualizado',
    'saas.tenant.lifecycle',
    'tenant',
    _tenant_id,
    tenant_row.name,
    jsonb_build_object(
      'status', clean_status,
      'active', next_active,
      'reason', clean_reason
    ),
    public.current_user_email(),
    public.current_user_role()
  );

  return query
  select t.id, t.name, t.active, t.status
  from public.tenants as t
  where t.id = _tenant_id;
end;
$$;

revoke all on function public.set_saas_tenant_lifecycle(uuid, text, text) from public;
grant execute on function public.set_saas_tenant_lifecycle(uuid, text, text) to authenticated;
