-- DevTeam usa developer/superadmin como roles de plataforma.
-- No se concede acceso a roles empresariales ni a sesiones anónimas.
create or replace function public.is_platform_owner()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select auth.uid() is not null
    and (
      public.current_user_email() = 'icsllstm@gmail.com'
      or exists (
        select 1
        from public.allowed_emails a
        where lower(a.email) = public.current_user_email()
          and a.active
          and a.role in ('developer', 'superadmin')
      )
    );
$$;

revoke all on function public.is_platform_owner() from public;
grant execute on function public.is_platform_owner() to authenticated;
