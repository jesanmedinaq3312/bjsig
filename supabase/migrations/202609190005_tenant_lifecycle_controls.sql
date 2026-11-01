-- Fase 7: ciclo de vida comercial de empresas.
-- Suspender/archivar nunca elimina datos: sólo bloquea el acceso y conserva la trazabilidad.

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

  select * into tenant_row
  from public.tenants
  where id = _tenant_id
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

  update public.tenants
  set active = next_active,
      status = clean_status
  where id = _tenant_id;

  -- Se bloquean accesos de usuarios, pero no se elimina ninguna membership ni dato.
  update public.tenant_memberships
  set active = next_active
  where tenant_id = _tenant_id;

  update public.allowed_emails
  set active = next_active
  where tenant_id = _tenant_id;

  insert into public.saas_tenant_deployments(tenant_id, status, reason, updated_at)
  values (_tenant_id, deployment_status, clean_reason, now())
  on conflict (tenant_id) do update set
    status = excluded.status,
    reason = excluded.reason,
    updated_at = excluded.updated_at;

  update public.saas_tenant_subscriptions
  set status = subscription_status,
      updated_at = now()
  where tenant_id = _tenant_id;

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
  from public.tenants t
  where t.id = _tenant_id;
end;
$$;

revoke all on function public.set_saas_tenant_lifecycle(uuid, text, text) from public;
grant execute on function public.set_saas_tenant_lifecycle(uuid, text, text) to authenticated;

-- Actualiza el contrato de lectura para que el panel pueda diferenciar activa,
-- suspendida y archivada (cortada) sin depender de etiquetas de despliegue.
drop function if exists public.fetch_saas_tenant_overview();
create function public.fetch_saas_tenant_overview()
returns table(
  tenant_id uuid,
  tenant_name text,
  tenant_slug text,
  tenant_active boolean,
  tenant_status text,
  tenant_type text,
  parent_tenant_id uuid,
  branch_manager_name text,
  branch_manager_worker_id uuid,
  plan_code text,
  plan_name text,
  subscription_status text,
  isolation_mode text,
  deployment_status text,
  max_users integer,
  member_count bigint
)
language sql
stable security definer
set search_path = public, pg_temp
as $$
  select
    t.id,
    t.name,
    t.slug,
    t.active,
    t.status,
    'company'::text,
    null::uuid,
    null::text,
    null::uuid,
    coalesce(p.code, case lower(s.plan)
      when 'profesional' then 'pro'
      when 'básico' then 'basico'
      else lower(s.plan)
    end, 'basico'),
    coalesce(p.name, case lower(s.plan)
      when 'profesional' then 'Profesional'
      when 'básico' then 'Básico'
      else s.plan
    end, 'Básico'),
    coalesce(s.status, 'trial'),
    'strict'::text,
    coalesce(d.status, case when t.active then 'active' else 'stopped' end),
    ts.max_users,
    (select count(*) from public.workers workers where workers.tenant_id = t.id)
  from public.tenants t
  left join public.tenant_settings ts on ts.tenant_id = t.id
  left join public.saas_tenant_subscriptions s on s.tenant_id = t.id
  left join public.saas_plans p on p.id = s.plan_id
  left join public.saas_tenant_deployments d on d.tenant_id = t.id
  where public.is_platform_owner()
    and lower(t.name) <> 'dev team'
  order by t.name;
$$;

revoke all on function public.fetch_saas_tenant_overview() from public;
grant execute on function public.fetch_saas_tenant_overview() to authenticated;
