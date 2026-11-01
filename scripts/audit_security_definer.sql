-- Run through Supabase MCP execute_sql or the Supabase SQL editor.
-- This is an inventory/classification query only; it performs no writes.
with funcs as (
  select
    p.oid,
    n.nspname as schema_name,
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments,
    pg_get_functiondef(p.oid) as definition,
    pg_get_function_result(p.oid) as return_type,
    has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
    has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute,
    has_function_privilege('service_role', p.oid, 'EXECUTE') as service_execute
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.prosecdef = true
)
select
  schema_name,
  function_name,
  arguments,
  case
    when definition ilike '%trigger%' or function_name like 'protect_%' then 'INTERNAL_TRIGGER'
    when authenticated_execute = false and service_execute = true then 'INTERNAL_SERVICE_ONLY'
    when definition ~* '\\m(insert|update|delete|truncate)\\M' then 'PRIVILEGED_WRITE_RPC'
    when definition ~* '\\m(select|return query)\\M' then 'PRIVILEGED_READ_RPC'
    else 'IDENTITY_OR_POLICY_HELPER'
  end as class,
  case when definition ilike '%set search_path%' then 'search_path_pinned' else 'search_path_missing' end as search_path_status,
  case when definition ~* 'auth\\.uid\\s*\\(\\s*\\)' then 'auth_guard_present' else 'auth_guard_missing' end as auth_guard,
  case when definition ~* '(current_tenant_id|tenant_id)' then 'tenant_check_signal_present' else 'tenant_check_signal_missing' end as tenant_check,
  case when definition ~* '(is_platform_owner|is_superadmin|current_user_role|is_admin|shift_actor_can_write)' then 'role_check_signal_present' else 'role_check_signal_missing' end as role_check,
  anon_execute,
  authenticated_execute,
  service_execute
from funcs
order by class, function_name, arguments
limit 100;
