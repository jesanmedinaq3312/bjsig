
revoke execute on function public.calculate_tenant_usage(uuid) from public, anon, authenticated;
revoke execute on function public.calculate_tenant_usage_breakdown(uuid) from public, anon, authenticated;
revoke execute on function public.delete_worker_cascade(text, uuid) from public, anon, authenticated;
revoke execute on function public.is_dt_inspector() from public, anon;
revoke execute on function public.verify_attendance_chain() from public, anon;
grant execute on function public.is_dt_inspector() to authenticated;
grant execute on function public.verify_attendance_chain() to authenticated;

CREATE OR REPLACE FUNCTION public.fetch_saas_tenant_data_catalog(_tenant_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(tenant_id uuid, table_name text, row_count bigint)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_catalog'
AS $function$
declare table_record record; target_tenant uuid; current_count bigint;
begin
  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) or not public.is_platform_owner() then
    raise exception 'PLATFORM_ROLE_REQUIRED' using errcode = '42501';
  end if;
  for target_tenant in select t.id from public.tenants t where t.active and (_tenant_id is null or t.id = _tenant_id) loop
    for table_record in
      select c.relname::text as table_name from pg_catalog.pg_class c
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
      join pg_catalog.pg_attribute a on a.attrelid = c.oid and a.attname = 'tenant_id' and not a.attisdropped
      where n.nspname = 'public' and c.relkind = 'r' order by c.relname
    loop
      execute format('select count(*)::bigint from public.%I where tenant_id = $1', table_record.table_name) into current_count using target_tenant;
      return query select target_tenant, table_record.table_name, current_count;
    end loop;
  end loop;
end; $function$;
revoke execute on function public.fetch_saas_tenant_data_catalog(uuid) from public, anon;
grant execute on function public.fetch_saas_tenant_data_catalog(uuid) to authenticated;

create policy block_anonymous_sessions on public.attendance_rectifications as restrictive for all to authenticated
  using (coalesce((auth.jwt()->>'is_anonymous')::boolean,false) is not true) with check (coalesce((auth.jwt()->>'is_anonymous')::boolean,false) is not true);
create policy block_anonymous_sessions on public.attendance_reports as restrictive for all to authenticated
  using (coalesce((auth.jwt()->>'is_anonymous')::boolean,false) is not true);
create policy block_anonymous_sessions on public.attendance_time_sync as restrictive for all to authenticated
  using (coalesce((auth.jwt()->>'is_anonymous')::boolean,false) is not true);
