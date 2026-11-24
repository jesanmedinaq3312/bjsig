CREATE OR REPLACE FUNCTION public.fetch_saas_tenant_data_catalog(_tenant_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(tenant_id uuid, table_name text, row_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
declare
  table_record record;
  target_tenant uuid;
  current_count bigint;
  caller_role text;
begin
  caller_role := coalesce(nullif(current_setting('role', true), ''), auth.role(), '');
  if caller_role <> 'service_role' and session_user <> 'postgres' then
    if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) or not public.is_platform_owner() then
      raise exception 'PLATFORM_ROLE_REQUIRED' using errcode = '42501';
    end if;
  end if;

  for target_tenant in
    select t.id from public.tenants t where t.active and (_tenant_id is null or t.id = _tenant_id)
  loop
    for table_record in
      select c.relname::text as table_name
      from pg_catalog.pg_class c
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
      join pg_catalog.pg_attribute a on a.attrelid = c.oid and a.attname = 'tenant_id' and not a.attisdropped
      where n.nspname = 'public' and c.relkind = 'r'
      order by c.relname
    loop
      execute format('select count(*)::bigint from public.%I where tenant_id = $1', table_record.table_name)
        into current_count using target_tenant;
      return query select target_tenant, table_record.table_name, current_count;
    end loop;
  end loop;
end;
$function$;

REVOKE ALL ON FUNCTION public.fetch_saas_tenant_data_catalog(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fetch_saas_tenant_data_catalog(uuid) TO service_role;