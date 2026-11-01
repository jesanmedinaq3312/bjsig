-- DevTeam can require TOTP for selected companies only.
create or replace function public.mfa_required_for_current_user()
returns boolean language sql stable security definer
set search_path = public, auth, pg_temp
as $$
  select case
    when auth.uid() is null then false
    when coalesce(public.current_user_role(), 'unknown') = 'worker' then false
    when coalesce(public.current_user_role(), 'unknown') <> 'developer' then true
    else exists (
      select 1 from public.allowed_emails ae
      where lower(ae.email) = lower(public.current_user_email())
        and (
          coalesce((ae.permissions->>'mfa_required')::boolean, false)
          or (jsonb_typeof(ae.permissions->'mfa_required_tenant_ids') = 'array'
              and jsonb_array_length(ae.permissions->'mfa_required_tenant_ids') > 0)
        )
    )
  end;
$$;
revoke all on function public.mfa_required_for_current_user() from public;
grant execute on function public.mfa_required_for_current_user() to authenticated;
