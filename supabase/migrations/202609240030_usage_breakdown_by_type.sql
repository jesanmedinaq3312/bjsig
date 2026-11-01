alter table public.saas_tenant_usage_daily
  add column if not exists usage_breakdown jsonb not null default '{}'::jsonb;

create or replace function public.calculate_tenant_usage_breakdown(_tenant_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  table_row record;
  row_count bigint;
  row_bytes bigint;
  result jsonb := '{}'::jsonb;
begin
  if auth.uid() is null or not public.is_platform_owner() then
    raise exception 'PLATFORM_ROLE_REQUIRED' using errcode = '42501';
  end if;
  for table_row in
    select c.table_name
    from information_schema.columns c
    join information_schema.tables t
      on t.table_schema = c.table_schema and t.table_name = c.table_name
    where c.table_schema = 'public'
      and c.column_name = 'tenant_id'
      and t.table_type = 'BASE TABLE'
      and c.table_name not in (
        'saas_tenant_usage_daily', 'allowed_emails', 'tenant_memberships',
        'tenant_settings', 'tenant_branding', 'tenant_role_permission_templates',
        'user_tenant_context', 'system_config', 'active_tenant_sessions'
      )
  loop
    execute format(
      'select count(*)::bigint, coalesce(sum(pg_column_size(x)),0)::bigint from public.%I x where x.tenant_id = $1',
      table_row.table_name
    ) into row_count, row_bytes using _tenant_id;
    if row_count > 0 then
      result := result || jsonb_build_object(
        table_row.table_name,
        jsonb_build_object('records', row_count, 'bytes', row_bytes)
      );
    end if;
  end loop;
  return result;
end;
$$;

revoke all on function public.calculate_tenant_usage_breakdown(uuid) from public;
grant execute on function public.calculate_tenant_usage_breakdown(uuid) to authenticated;

create or replace function public.refresh_tenant_usage_daily(_tenant_id uuid default null)
returns table(tenant_id uuid, usage_date date, records_count bigint, storage_bytes bigint, files_count bigint, plan_storage_limit_bytes bigint, usage_breakdown jsonb)
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  tenant_row record;
  measured record;
  breakdown jsonb;
  selected_limit bigint;
begin
  if auth.uid() is null or not public.is_platform_owner() then
    raise exception 'PLATFORM_ROLE_REQUIRED' using errcode = '42501';
  end if;
  for tenant_row in
    select t.id from public.tenants t
    where t.active and (_tenant_id is null or t.id = _tenant_id)
  loop
    select * into measured from public.calculate_tenant_usage(tenant_row.id);
    breakdown := public.calculate_tenant_usage_breakdown(tenant_row.id);
    select p.storage_limit_bytes into selected_limit
    from public.saas_tenant_subscriptions s
    join public.saas_plans p on p.id = s.plan_id
    where s.tenant_id = tenant_row.id limit 1;
    insert into public.saas_tenant_usage_daily(
      tenant_id, usage_date, records_count, storage_bytes, files_count,
      plan_storage_limit_bytes, usage_breakdown, calculated_at
    ) values (
      tenant_row.id, current_date, measured.records_count, measured.storage_bytes,
      measured.files_count, selected_limit, breakdown, now()
    )
    on conflict on constraint saas_tenant_usage_daily_tenant_id_usage_date_key do update set
      records_count = excluded.records_count,
      storage_bytes = excluded.storage_bytes,
      files_count = excluded.files_count,
      plan_storage_limit_bytes = excluded.plan_storage_limit_bytes,
      usage_breakdown = excluded.usage_breakdown,
      calculated_at = excluded.calculated_at;
  end loop;
  return query
  select u.tenant_id, u.usage_date, u.records_count, u.storage_bytes,
    u.files_count, u.plan_storage_limit_bytes, u.usage_breakdown
  from public.saas_tenant_usage_daily u
  where u.usage_date = current_date
    and (_tenant_id is null or u.tenant_id = _tenant_id)
  order by u.tenant_id;
end;
$$;

revoke all on function public.refresh_tenant_usage_daily(uuid) from public;
grant execute on function public.refresh_tenant_usage_daily(uuid) to authenticated;
