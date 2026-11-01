-- Fase 13: control de acceso por IP y aislamiento verificable de actividad.
-- Las reglas son administrativas; la IP observada debe provenir de un gateway/Edge Function confiable.

create table if not exists public.saas_ip_access_rules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete restrict,
  label text not null check (length(trim(label)) between 2 and 120),
  mode text not null check (mode in ('whitelist','blacklist')),
  network cidr not null,
  active boolean not null default true,
  priority integer not null default 100 check (priority between 0 and 10000),
  expires_at timestamptz,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expires_at is null or expires_at > created_at)
);

create index if not exists idx_saas_ip_access_rules_scope
  on public.saas_ip_access_rules(tenant_id, active, mode, priority);
create index if not exists idx_saas_ip_access_rules_network
  on public.saas_ip_access_rules using gist(network inet_ops);

alter table public.saas_ip_access_rules enable row level security;
drop policy if exists saas_ip_access_rules_platform_owner on public.saas_ip_access_rules;
create policy saas_ip_access_rules_platform_owner
  on public.saas_ip_access_rules for all to authenticated
  using (public.is_platform_owner())
  with check (public.is_platform_owner());

create or replace function public.touch_saas_ip_access_rule_updated_at()
returns trigger language plpgsql security invoker set search_path = public, pg_temp
as $$ begin new.updated_at = now(); return new; end $$;

drop trigger if exists saas_ip_access_rules_updated_at on public.saas_ip_access_rules;
create trigger saas_ip_access_rules_updated_at
before update on public.saas_ip_access_rules
for each row execute function public.touch_saas_ip_access_rule_updated_at();

create or replace function public.evaluate_saas_ip_access(
  _tenant_id uuid,
  _ip inet
)
returns table(
  allowed boolean,
  decision text,
  matched_rule_id uuid,
  reason text
)
language plpgsql
stable security invoker
set search_path = public, pg_temp
as $$
declare
  matched public.saas_ip_access_rules%rowtype;
  has_whitelist boolean;
begin
  if _ip is null then
    return query select false, 'deny'::text, null::uuid, 'IP observada ausente'::text;
    return;
  end if;

  select r.* into matched
  from public.saas_ip_access_rules r
  where r.active
    and (r.expires_at is null or r.expires_at > now())
    and (r.tenant_id is null or r.tenant_id = _tenant_id)
    and r.mode = 'blacklist'
    and _ip <<= r.network
  order by r.priority asc, (r.tenant_id is not null) desc, r.created_at desc
  limit 1;

  if matched.id is not null then
    return query select false, 'blacklisted'::text, matched.id,
      format('IP incluida en %s', matched.label);
    return;
  end if;

  select exists(
    select 1 from public.saas_ip_access_rules r
    where r.active
      and (r.expires_at is null or r.expires_at > now())
      and (r.tenant_id is null or r.tenant_id = _tenant_id)
      and r.mode = 'whitelist'
  ) into has_whitelist;

  if not has_whitelist then
    return query select true, 'allowed_by_default'::text, null::uuid,
      'No existe whitelist activa para el alcance';
    return;
  end if;

  select r.* into matched
  from public.saas_ip_access_rules r
  where r.active
    and (r.expires_at is null or r.expires_at > now())
    and (r.tenant_id is null or r.tenant_id = _tenant_id)
    and r.mode = 'whitelist'
    and _ip <<= r.network
  order by r.priority asc, (r.tenant_id is not null) desc, r.created_at desc
  limit 1;

  if matched.id is not null then
    return query select true, 'whitelisted'::text, matched.id,
      format('IP permitida por %s', matched.label);
  end if;

  return query select false, 'not_whitelisted'::text, null::uuid,
    'Existe whitelist activa, pero la IP no coincide';
end;
$$;

revoke all on function public.evaluate_saas_ip_access(uuid, inet) from public;
grant execute on function public.evaluate_saas_ip_access(uuid, inet) to authenticated;

-- Esta restricción hace explícita la frontera: nunca se puede insertar un log
-- tenant-scoped para otra empresa. El dueño de plataforma conserva lectura global.
drop policy if exists tenant_boundary_activity_logs on public.activity_logs;
create policy tenant_boundary_activity_logs
  on public.activity_logs for all to authenticated
  using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());

-- La lectura global del dueño de plataforma queda separada de la frontera tenant.
drop policy if exists saas_platform_owner_activity_logs_select on public.activity_logs;
create policy saas_platform_owner_activity_logs_select
  on public.activity_logs for select to authenticated
  using (public.is_platform_owner());

create or replace function public.verify_saas_log_isolation()
returns table(
  check_name text,
  passed boolean,
  detail text
)
language sql
stable security invoker
set search_path = public, pg_temp
as $$
  select 'activity_logs_tenant_column'::text,
    exists(select 1 from information_schema.columns where table_schema='public' and table_name='activity_logs' and column_name='tenant_id'),
    'Cada actividad debe tener tenant_id'::text
  union all
  select 'activity_logs_rls_enabled'::text,
    coalesce((select relrowsecurity from pg_class where oid='public.activity_logs'::regclass), false),
    'RLS debe estar habilitado'::text
  union all
  select 'tenant_boundary_policy'::text,
    exists(select 1 from pg_policies where schemaname='public' and tablename='activity_logs' and policyname='tenant_boundary_activity_logs'),
    'La política tenant_boundary_activity_logs debe existir'::text
  union all
  select 'platform_owner_global_read'::text,
    exists(select 1 from pg_policies where schemaname='public' and tablename='activity_logs' and policyname='saas_platform_owner_activity_logs_select'),
    'El dueño de plataforma puede auditar globalmente'::text;
$$;

revoke all on function public.verify_saas_log_isolation() from public;
grant execute on function public.verify_saas_log_isolation() to authenticated;

comment on table public.saas_ip_access_rules is 'Reglas whitelist/blacklist por plataforma, empresa o alcance global. No reemplaza el firewall/gateway.';
comment on function public.evaluate_saas_ip_access(uuid, inet) is 'Evalúa blacklist primero y luego whitelist. La IP debe ser observada por un componente confiable.';
comment on function public.verify_saas_log_isolation() is 'Checklist operativo para verificar RLS y frontera tenant de activity_logs.';
