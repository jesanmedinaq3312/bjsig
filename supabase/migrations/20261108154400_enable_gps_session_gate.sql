do $$
begin
  if not exists (
    select 1
    from pg_policy p
    join pg_class c on c.oid = p.polrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'storage'
      and c.relname = 'objects'
      and p.polname = 'gps_session_required'
  ) then
    raise exception 'GPS gate cannot be enabled before the Storage policy is installed';
  end if;

  if not exists (
    select 1
    from pg_db_role_setting s
    join pg_roles r on r.oid = s.setrole
    cross join lateral unnest(s.setconfig) as cfg
    where r.rolname = 'authenticator'
      and cfg = 'pgrst.db_pre_request=public.enforce_gps_session_access'
  ) then
    raise exception 'GPS gate cannot be enabled before the PostgREST pre-request hook is installed';
  end if;
end;
$$;

update private.gps_gate_settings
set enabled = true
where id = 1;

notify pgrst, 'reload config';
