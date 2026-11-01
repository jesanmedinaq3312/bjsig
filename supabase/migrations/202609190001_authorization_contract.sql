-- Fase 1 + Fase 2: contrato único de autorización SaaS.
-- Precedencia documentada: RLS/RPC -> tenant activo -> rol -> permiso -> plan -> override.
-- Los overrides se conservan al cambiar de plan y se aplican al final como excepciones manuales.

create or replace function public.protect_business_security_fields()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if auth.uid() is not null
     and not public.is_platform_owner()
     and lower(coalesce(old.email, '')) = public.current_user_email()
     and (
       new.role is distinct from old.role
       or new.permissions is distinct from old.permissions
       or new.tenant_id is distinct from old.tenant_id
       or new.active is distinct from old.active
     ) then
    raise exception 'PLATFORM_MEMBERSHIP_PROTECTED' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_business_security_fields on public.allowed_emails;
create trigger protect_business_security_fields
before update on public.allowed_emails
for each row execute function public.protect_business_security_fields();
revoke all on function public.protect_business_security_fields() from public, anon, authenticated;

-- Los usuarios empresariales pueden leer la configuración de su tenant, pero sólo
-- el Dev Team puede cambiar plan, módulos base o límites. Las vistas específicas
-- (branding/default view) siguen pasando por sus RPC autorizadas.
drop policy if exists settings_tenant on public.tenant_settings;
drop policy if exists tenant_settings_select on public.tenant_settings;
drop policy if exists tenant_settings_platform_write on public.tenant_settings;
create policy tenant_settings_select on public.tenant_settings
for select to authenticated
using (public.is_platform_owner() or tenant_id = public.current_tenant_id());
create policy tenant_settings_platform_write on public.tenant_settings
for all to authenticated
using (public.is_platform_owner())
with check (public.is_platform_owner());

create or replace function public.get_effective_tenant_access(_tenant_id uuid)
returns table(
  tenant_id uuid,
  role text,
  permissions jsonb,
  plan_id uuid,
  plan_code text,
  plan_features jsonb,
  overrides jsonb,
  effective_modules jsonb,
  default_view text,
  max_users integer
)
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
declare
  current_email text := public.current_user_email();
  membership public.tenant_memberships;
  account public.allowed_emails;
  settings public.tenant_settings;
  subscription public.saas_tenant_subscriptions;
  active_plan public.saas_plans;
  override_map jsonb := '{}'::jsonb;
  base_modules jsonb := '{}'::jsonb;
  permission_map jsonb := '{}'::jsonb;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  if not exists (select 1 from public.tenants t where t.id = _tenant_id and t.active) then
    raise exception 'TENANT_NOT_ACTIVE' using errcode = '42501';
  end if;
  if not public.is_platform_owner() and not exists (
    select 1 from public.tenant_memberships m
    where m.tenant_id = _tenant_id and lower(m.user_email) = current_email and m.active
  ) and not exists (
    select 1 from public.allowed_emails a
    where a.tenant_id = _tenant_id and lower(a.email) = current_email and a.active
  ) then
    raise exception 'TENANT_ACCESS_DENIED' using errcode = '42501';
  end if;

  select * into settings from public.tenant_settings where tenant_settings.tenant_id = _tenant_id;
  select * into subscription from public.saas_tenant_subscriptions where saas_tenant_subscriptions.tenant_id = _tenant_id;
  if subscription.plan_id is not null then
    select * into active_plan from public.saas_plans p where p.id = subscription.plan_id and p.active;
  end if;
  if active_plan.id is null and settings.plan is not null then
    select * into active_plan from public.saas_plans p where lower(p.code) = lower(settings.plan) and p.active order by p.sort_order limit 1;
  end if;

  select * into membership from public.tenant_memberships
    where tenant_memberships.tenant_id = _tenant_id and lower(tenant_memberships.user_email) = current_email and active limit 1;
  select * into account from public.allowed_emails
    where lower(allowed_emails.email) = current_email and active limit 1;

  permission_map := coalesce(account.permissions, '{}'::jsonb) || coalesce(membership.permissions, '{}'::jsonb);
  base_modules := coalesce(active_plan.feature_keys, settings.modules, '{}'::jsonb);
  select coalesce(jsonb_object_agg(o.feature_key, o.enabled), '{}'::jsonb)
    into override_map
    from public.saas_tenant_feature_overrides o where o.tenant_id = _tenant_id;

  return query select
    _tenant_id,
    case when public.is_platform_owner() then public.current_user_role() else coalesce(membership.role, account.role, 'guest') end,
    permission_map,
    active_plan.id,
    coalesce(active_plan.code, settings.plan, 'basico'),
    coalesce(active_plan.feature_keys, '{}'::jsonb),
    override_map,
    base_modules || override_map,
    coalesce(settings.default_view, active_plan.default_view, 'dashboard'),
    coalesce(settings.max_users, active_plan.max_users);
end;
$$;

create or replace function public.apply_saas_plan(
  _tenant_id uuid,
  _plan_id uuid,
  _reason text default null
)
returns table(
  tenant_id uuid,
  role text,
  permissions jsonb,
  plan_id uuid,
  plan_code text,
  plan_features jsonb,
  overrides jsonb,
  effective_modules jsonb,
  default_view text,
  max_users integer
)
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  selected_plan public.saas_plans;
  existing_settings public.tenant_settings;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  if not public.is_platform_owner() then
    raise exception 'PLATFORM_ROLE_REQUIRED' using errcode = '42501';
  end if;
  if not exists (select 1 from public.tenants t where t.id = _tenant_id and t.active) then
    raise exception 'TENANT_NOT_FOUND' using errcode = '22023';
  end if;
  select * into selected_plan from public.saas_plans p where p.id = _plan_id and p.active;
  if selected_plan.id is null then
    raise exception 'PLAN_NOT_FOUND_OR_INACTIVE' using errcode = '22023';
  end if;
  select * into existing_settings from public.tenant_settings where tenant_settings.tenant_id = _tenant_id;

  insert into public.saas_tenant_subscriptions (tenant_id, plan_id, plan, status, updated_at)
  values (_tenant_id, selected_plan.id, selected_plan.code, 'active', now())
  on conflict (tenant_id) do update set
    plan_id = excluded.plan_id,
    plan = excluded.plan,
    status = 'active',
    updated_at = now();

  insert into public.tenant_settings (tenant_id, plan, modules, max_users, default_view, updated_at)
  values (_tenant_id, selected_plan.code, selected_plan.feature_keys, selected_plan.max_users,
          coalesce(existing_settings.default_view, selected_plan.default_view, 'dashboard'), now())
  on conflict (tenant_id) do update set
    plan = excluded.plan,
    modules = excluded.modules,
    max_users = excluded.max_users,
    updated_at = now();

  -- Los overrides NO se limpian: se conservan y se devuelven para mostrarlos como excepciones.
  return query select * from public.get_effective_tenant_access(_tenant_id);
exception when others then
  if sqlstate in ('42501', '22023') then raise; end if;
  raise exception 'PERSISTENCE_ERROR:%', sqlerrm using errcode = 'P0001';
end;
$$;

revoke all on function public.get_effective_tenant_access(uuid) from public;
revoke all on function public.apply_saas_plan(uuid, uuid, text) from public;
grant execute on function public.get_effective_tenant_access(uuid) to authenticated;
grant execute on function public.apply_saas_plan(uuid, uuid, text) to authenticated;
