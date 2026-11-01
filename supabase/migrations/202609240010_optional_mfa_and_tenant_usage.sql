-- MFA is configurable for platform developers. Other non-worker roles keep MFA
-- required by default. The flag lives in allowed_emails.permissions and is
-- managed only through the protected platform-operator RPC.
create or replace function public.mfa_required_for_current_user()
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select case
    when auth.uid() is null then false
    when public.current_user_role() = 'worker' then false
    when public.current_user_role() = 'developer' then coalesce(
      (
        select case
          when (ae.permissions ->> 'mfa_required') is null then false
          else (ae.permissions ->> 'mfa_required')::boolean
        end
        from public.allowed_emails ae
        where lower(ae.email) = public.current_user_email()
          and ae.active
        limit 1
      ), false
    )
    else true
  end;
$$;

-- Add a durable, future-facing quota field to the application plan catalog.
alter table public.saas_plans
  add column if not exists storage_limit_bytes bigint;

update public.saas_plans
set storage_limit_bytes = case
  when lower(code) in ('basico', 'free') then 524288000
  when lower(code) in ('profesional', 'pro') then 8589934592
  else storage_limit_bytes
end
where storage_limit_bytes is null;

-- Calculate logical row bytes, not physical PostgreSQL disk usage. This is an
-- allocation signal per tenant; physical database size remains project-wide.
create or replace function public.calculate_tenant_usage(_tenant_id uuid)
returns table(records_count bigint, storage_bytes bigint, files_count bigint)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  table_row record;
  row_count bigint;
  row_bytes bigint;
  total_rows bigint := 0;
  total_bytes bigint := 0;
  total_files bigint := 0;
begin
  if auth.uid() is null or not public.is_platform_owner() then
    raise exception 'PLATFORM_ROLE_REQUIRED' using errcode = '42501';
  end if;
  if not exists (select 1 from public.tenants t where t.id = _tenant_id and t.active) then
    raise exception 'TENANT_NOT_ACTIVE' using errcode = '42501';
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
    total_rows := total_rows + coalesce(row_count, 0);
    total_bytes := total_bytes + coalesce(row_bytes, 0);
    if table_row.table_name in ('cloud_documents', 'worker_documents') then
      total_files := total_files + coalesce(row_count, 0);
    end if;
  end loop;

  return query select total_rows, total_bytes, total_files;
end;
$$;

revoke all on function public.calculate_tenant_usage(uuid) from public;
grant execute on function public.calculate_tenant_usage(uuid) to authenticated;

create or replace function public.refresh_tenant_usage_daily(_tenant_id uuid default null)
returns table(tenant_id uuid, usage_date date, records_count bigint, storage_bytes bigint, files_count bigint, plan_storage_limit_bytes bigint)
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  tenant_row record;
  measured record;
  selected_limit bigint;
begin
  if auth.uid() is null or not public.is_platform_owner() then
    raise exception 'PLATFORM_ROLE_REQUIRED' using errcode = '42501';
  end if;
  for tenant_row in
    select t.id
    from public.tenants t
    where t.active and (_tenant_id is null or t.id = _tenant_id)
  loop
    select * into measured from public.calculate_tenant_usage(tenant_row.id);
    select p.storage_limit_bytes into selected_limit
    from public.saas_tenant_subscriptions s
    join public.saas_plans p on p.id = s.plan_id
    where s.tenant_id = tenant_row.id
    limit 1;
    insert into public.saas_tenant_usage_daily(
      tenant_id, usage_date, records_count, storage_bytes, files_count,
      plan_storage_limit_bytes, calculated_at
    ) values (
      tenant_row.id, current_date, measured.records_count, measured.storage_bytes,
      measured.files_count, selected_limit, now()
    )
    on conflict (tenant_id, usage_date) do update set
      records_count = excluded.records_count,
      storage_bytes = excluded.storage_bytes,
      files_count = excluded.files_count,
      plan_storage_limit_bytes = excluded.plan_storage_limit_bytes,
      calculated_at = excluded.calculated_at;
  end loop;
  return query
  select u.tenant_id, u.usage_date, u.records_count, u.storage_bytes,
    u.files_count, u.plan_storage_limit_bytes
  from public.saas_tenant_usage_daily u
  where u.usage_date = current_date
    and (_tenant_id is null or u.tenant_id = _tenant_id)
  order by u.tenant_id;
end;
$$;

revoke all on function public.refresh_tenant_usage_daily(uuid) from public;
grant execute on function public.refresh_tenant_usage_daily(uuid) to authenticated;
