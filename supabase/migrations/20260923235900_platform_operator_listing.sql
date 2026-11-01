-- Secure platform operator listing for the Dev Team panel.
-- The browser must not read allowed_emails directly because its RLS policy is
-- intentionally restrictive; this RPC exposes only the minimum operator fields.
create or replace function public.fetch_platform_operators()
returns table(
  id uuid,
  email text,
  active boolean,
  permissions jsonb,
  tenant_ids uuid[]
)
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;
  if not public.is_platform_owner() then
    raise exception 'PLATFORM_ROLE_REQUIRED' using errcode = '42501';
  end if;

  return query
  select
    ae.id,
    ae.email,
    ae.active,
    coalesce(ae.permissions, '{}'::jsonb),
    coalesce(
      array_agg(tm.tenant_id order by tm.tenant_id)
        filter (where tm.tenant_id is not null and tm.active),
      '{}'::uuid[]
    )
  from public.allowed_emails ae
  left join public.tenant_memberships tm
    on lower(tm.user_email) = lower(ae.email)
   and tm.role = 'developer'
  where ae.role = 'developer'
    and ae.tenant_id is null
  group by ae.id, ae.email, ae.active, ae.permissions
  order by ae.email;
end;
$$;

revoke all on function public.fetch_platform_operators() from public;
grant execute on function public.fetch_platform_operators() to authenticated;
