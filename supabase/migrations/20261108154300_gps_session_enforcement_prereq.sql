create or replace function public.enforce_gps_session_access()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_claims jsonb;
  v_role text;
  v_path text;
begin
  v_claims := coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb,
    '{}'::jsonb
  );
  v_role := coalesce(v_claims ->> 'role', nullif(current_setting('role', true), ''), '');

  if v_role <> 'authenticated' then
    return;
  end if;

  v_path := regexp_replace(
    ltrim(coalesce(current_setting('request.path', true), ''), '/'),
    '^(.*/)?rpc/',
    'rpc/'
  );
  v_path := rtrim(v_path, '/');
  if v_path = any (array[
    'rpc/gps_gate_enabled',
    'rpc/gps_session_is_verified',
    'rpc/attest_gps_session'
  ]) then
    return;
  end if;

  if not public.gps_gate_enabled() or public.gps_session_is_verified() then
    return;
  end if;

  raise sqlstate 'PGRST' using
    message = json_build_object(
      'code', 'GPS_REQUIRED',
      'message', 'A current GPS capture is required for this session.'
    )::text,
    detail = json_build_object(
      'status', 403,
      'status_text', 'Forbidden'
    )::text;
end;
$$;

revoke all on function public.enforce_gps_session_access() from public;
grant execute on function public.enforce_gps_session_access() to authenticator, anon, authenticated, service_role;

do $$
declare
  v_table record;
begin
  for v_table in
    select tablename
    from pg_tables
    where schemaname = 'public'
  loop
    execute format('drop policy if exists gps_session_required on public.%I', v_table.tablename);
    execute format(
      'create policy gps_session_required on public.%I as restrictive for all to authenticated using (not public.gps_gate_enabled() or public.gps_session_is_verified()) with check (not public.gps_gate_enabled() or public.gps_session_is_verified())',
      v_table.tablename
    );
  end loop;
end;
$$;

-- Supabase Storage and Realtime use separate request paths; RLS closes those paths too.
drop policy if exists gps_session_required on storage.objects;
create policy gps_session_required
  on storage.objects as restrictive for all to authenticated
  using (not public.gps_gate_enabled() or public.gps_session_is_verified())
  with check (not public.gps_gate_enabled() or public.gps_session_is_verified());

alter role authenticator set pgrst.db_pre_request = 'public.enforce_gps_session_access';
notify pgrst, 'reload config';
