-- Fase 3: Equipo Dev y memberships.
-- La identidad Auth se provisiona mediante admin-user-manage; esta RPC hace atómica
-- la autorización, memberships, suspensión lógica y auditoría tenant-scoped.

create or replace function public.upsert_platform_operator(
  _email text,
  _permissions jsonb,
  _tenant_ids uuid[] default '{}'::uuid[],
  _active boolean default true
)
returns table(email text, active boolean, permissions jsonb, tenant_ids uuid[])
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  clean_email text := lower(trim(_email));
  requested_permissions jsonb := coalesce(_permissions, '{}'::jsonb);
  operator_id uuid;
  selected_tenant uuid;
  result_ids uuid[];
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  if not public.is_platform_owner() then raise exception 'PLATFORM_ROLE_REQUIRED' using errcode = '42501'; end if;
  if clean_email = '' then raise exception 'EMAIL_REQUIRED' using errcode = '22023'; end if;
  if clean_email = public.current_user_email() then raise exception 'SELF_PLATFORM_MEMBERSHIP_CHANGE_FORBIDDEN' using errcode = '42501'; end if;
  if exists (
    select 1 from unnest(coalesce(_tenant_ids, '{}'::uuid[])) requested(id)
    left join public.tenants t on t.id = requested.id
    where t.id is null or not t.active
  ) then raise exception 'TENANT_NOT_ACTIVE' using errcode = '22023'; end if;

  insert into public.allowed_emails(email, role, active, permissions, tenant_id)
  values(clean_email, 'developer', _active, requested_permissions, null)
  on conflict(email) do update set role='developer', active=excluded.active,
    permissions=excluded.permissions, tenant_id=null
  returning id into operator_id;

  delete from public.tenant_memberships where lower(user_email)=clean_email and role='developer';
  foreach selected_tenant in array coalesce(_tenant_ids, '{}'::uuid[]) loop
    insert into public.tenant_memberships(tenant_id,user_email,role,active,permissions)
    values(selected_tenant, clean_email, 'developer', _active, requested_permissions)
    on conflict(user_email,tenant_id) do update set role='developer', active=excluded.active,
      permissions=excluded.permissions;
  end loop;

  select coalesce(array_agg(m.tenant_id order by m.tenant_id), '{}'::uuid[])
    into result_ids
    from public.tenant_memberships m
    where lower(m.user_email)=clean_email and m.role='developer' and m.active;

  if coalesce(array_length(coalesce(_tenant_ids, '{}'::uuid[]),1),0) > 0 then
    foreach selected_tenant in array _tenant_ids loop
      insert into public.activity_logs(
        tenant_id, name, label, action, entity, entity_id, entity_label, details,
        user_email, user_role
      ) values (
        selected_tenant, 'platform.membership.upsert', 'Equipo Dev actualizado',
        'platform.membership.upsert', 'platform_operator', operator_id, clean_email,
        jsonb_build_object('active',_active, 'tenant_ids',_tenant_ids,
          'permissions',requested_permissions), public.current_user_email(),
        public.current_user_role()
      );
    end loop;
  end if;

  return query select clean_email, _active, requested_permissions, result_ids;
end;
$$;

revoke all on function public.upsert_platform_operator(text,jsonb,uuid[],boolean) from public;
grant execute on function public.upsert_platform_operator(text,jsonb,uuid[],boolean) to authenticated;
