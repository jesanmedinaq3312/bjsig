-- El catálogo sólo devuelve metadatos y conteos a platform owners.
-- SECURITY DEFINER evita que una política RLS de una tabla operativa bloquee el inventario.
create or replace function public.fetch_saas_tenant_data_catalog(_tenant_id uuid default null)
returns table (
  tenant_id uuid,
  table_name text,
  row_count bigint
)
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  table_record record;
  target_tenant uuid;
  current_count bigint;
begin
  if not public.is_platform_owner() then
    raise exception 'PLATFORM_ROLE_REQUIRED' using errcode = '42501';
  end if;

  for target_tenant in
    select t.id
    from public.tenants t
    where t.active
      and (_tenant_id is null or t.id = _tenant_id)
  loop
    for table_record in
      select c.table_name
      from information_schema.columns c
      join information_schema.tables st
        on st.table_schema = c.table_schema
       and st.table_name = c.table_name
      where c.table_schema = 'public'
        and c.column_name = 'tenant_id'
        and st.table_type = 'BASE TABLE'
      order by c.table_name
    loop
      execute format('select count(*)::bigint from public.%I where tenant_id = $1', table_record.table_name)
        into current_count
        using target_tenant;
      return query select target_tenant, table_record.table_name::text, current_count;
    end loop;
  end loop;
end;
$$;

revoke all on function public.fetch_saas_tenant_data_catalog(uuid) from public;
grant execute on function public.fetch_saas_tenant_data_catalog(uuid) to authenticated;
