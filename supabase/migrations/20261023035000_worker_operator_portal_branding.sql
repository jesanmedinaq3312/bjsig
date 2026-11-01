-- BJSIGAPP: separar las superficies personal/operativa sin duplicar identidades.
-- Esta migración se versiona con el código. No aplicar en Supabase sin revisión y aprobación.

-- Un correo puede ser operador y estar asociado a una ficha de trabajador. El vínculo
-- worker_rut + tenant_id habilita solo la identificación personal, no permisos operativos.
create or replace function public.is_worker()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(public.current_user_role() = 'worker', false)
    or exists (
      select 1
      from public.allowed_emails a
      join public.workers w
        on w.tenant_id = a.tenant_id
       and upper(regexp_replace(w.rut, '[.\s-]', '', 'g')) =
           upper(regexp_replace(a.worker_rut, '[.\s-]', '', 'g'))
      where lower(a.email) = public.current_user_email()
        and a.active = true
        and nullif(trim(a.worker_rut), '') is not null
    );
$$;

comment on function public.is_worker() is
  'True for a worker account or an active account linked to its own worker row by tenant and RUT; this does not grant operational permissions.';

-- Requerir MFA cuando un rol worker tenga permisos operativos o una membresía operativa.
-- Se conserva la excepción de MFA por usuario/tenant del rol developer y se exige MFA
-- a todos los demás roles no-worker, como en la función existente.
create or replace function public.mfa_required_for_current_user()
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select case
    when auth.uid() is null then false
    when coalesce(public.current_user_role(), 'unknown') = 'developer' then
      exists (
        select 1
        from public.allowed_emails ae
        where lower(ae.email) = public.current_user_email()
          and (
            coalesce((ae.permissions ->> 'mfa_required')::boolean, false)
            or (
              jsonb_typeof(ae.permissions -> 'mfa_required_tenant_ids') = 'array'
              and jsonb_array_length(ae.permissions -> 'mfa_required_tenant_ids') > 0
            )
          )
      )
    when coalesce(public.current_user_role(), 'unknown') = 'worker' then
      exists (
        select 1
        from public.allowed_emails ae
        where lower(ae.email) = public.current_user_email()
          and (
            coalesce((ae.permissions ->> 'mfa_required')::boolean, false)
            or (
              jsonb_typeof(ae.permissions -> 'mfa_required_tenant_ids') = 'array'
              and jsonb_array_length(ae.permissions -> 'mfa_required_tenant_ids') > 0
            )
            or exists (
              select 1
              from jsonb_each(
                case when jsonb_typeof(ae.permissions) = 'object'
                  then ae.permissions else '{}'::jsonb end
              ) as permission(key, value)
              where permission.key like 'can\_%' escape '\'
                and permission.value = 'true'::jsonb
            )
          )
      )
      or exists (
        select 1
        from public.tenant_memberships tm
        where lower(tm.user_email) = public.current_user_email()
          and tm.active = true
          and (
            lower(coalesce(tm.role, '')) in (
              'company_owner', 'admin', 'manager', 'human_resources',
              'prevencionista', 'operador', 'finance', 'accounting'
            )
            or exists (
              select 1
              from jsonb_each(
                case when jsonb_typeof(tm.permissions) = 'object'
                  then tm.permissions else '{}'::jsonb end
              ) as permission(key, value)
              where permission.key like 'can\_%' escape '\'
                and permission.value = 'true'::jsonb
            )
          )
      )
    else true
  end;
$$;

comment on function public.mfa_required_for_current_user() is
  'Require AAL2 for non-worker users and worker identities with operational permissions or operational tenant memberships.';

-- Public login screens need only four non-sensitive fields. No membership, user, or
-- operational records are exposed. The active flag is the publication boundary.
create or replace function public.fetch_public_tenant_branding(_slug text)
returns table (
  company_name text,
  logo_url text,
  color_theme text,
  glass_opacity text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    coalesce(nullif(b.company_name, ''), t.name),
    coalesce(b.logo_url, ''),
    coalesce(nullif(b.color_theme, ''), 'blue'),
    coalesce(nullif(b.glass_opacity, ''), '0.8')
  from public.tenants t
  left join public.tenant_branding b on b.tenant_id = t.id
  where t.active = true
    and lower(t.slug) = lower(trim(_slug))
  limit 1;
$$;

revoke all on function public.fetch_public_tenant_branding(text) from public, anon, authenticated;
grant execute on function public.fetch_public_tenant_branding(text) to anon, authenticated;
comment on function public.fetch_public_tenant_branding(text) is
  'Returns only active tenant logo/name/theme for pre-authentication screens by public slug.';


-- Permitir a una identidad cuyo rol operativo está en su membresía activa del tenant
-- administrar turnos, aunque su rol global sea 'worker'. El tenant sigue acotado por
-- current_tenant_id() y por las políticas RLS existentes de las tablas de turnos.
create or replace function public.shift_actor_can_write()
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select public.is_platform_owner()
    or coalesce(public.current_user_role(), 'guest') in (
      'superadmin', 'developer', 'company_owner', 'admin',
      'human_resources', 'prevencionista', 'manager'
    )
    or exists (
      select 1
      from public.tenant_memberships tm
      where lower(tm.user_email) = public.current_user_email()
        and tm.active = true
        and tm.tenant_id = public.current_tenant_id()
        and lower(coalesce(tm.role, '')) in (
          'superadmin', 'developer', 'company_owner', 'admin',
          'human_resources', 'prevencionista', 'manager'
        )
    );
$$;

revoke all on function public.shift_actor_can_write() from public, anon;
grant execute on function public.shift_actor_can_write() to authenticated;
comment on function public.shift_actor_can_write() is
  'Authorize shift changes for explicitly operational global roles or active operational tenant memberships, always within the selected tenant.';
