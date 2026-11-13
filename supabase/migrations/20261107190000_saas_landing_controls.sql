-- Editor y publicación de la landing principal SaaS, más landing pública por empresa.
-- Los datos son texto plano; no se habilita acceso directo a la tabla para anon/authenticated.
create table if not exists public.saas_public_landing_settings (
  singleton boolean primary key default true check (singleton),
  enabled boolean not null default true,
  hero_title text not null default 'Software multiempresa de RR. HH. y operaciones',
  hero_description text not null default 'Administra personas, asistencia, turnos, prevención, documentos y procesos internos desde una plataforma SaaS. Configura módulos, permisos e identidad para cada empresa.',
  primary_cta_label text not null default 'Solicitar una demo',
  whatsapp_phone text not null default '56941228089',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  constraint saas_public_landing_title_length check (char_length(trim(hero_title)) between 1 and 180),
  constraint saas_public_landing_description_length check (char_length(trim(hero_description)) between 1 and 600),
  constraint saas_public_landing_cta_length check (char_length(trim(primary_cta_label)) between 1 and 100),
  constraint saas_public_landing_phone_format check (whatsapp_phone ~ '^[0-9]{8,15}$')
);

insert into public.saas_public_landing_settings(singleton)
values (true)
on conflict (singleton) do nothing;

alter table public.saas_public_landing_settings enable row level security;
revoke all on table public.saas_public_landing_settings from public, anon, authenticated;

create or replace function public.fetch_public_saas_landing()
returns table (
  enabled boolean,
  hero_title text,
  hero_description text,
  primary_cta_label text,
  whatsapp_phone text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    settings.enabled,
    settings.hero_title,
    settings.hero_description,
    settings.primary_cta_label,
    settings.whatsapp_phone
  from public.saas_public_landing_settings as settings
  where settings.singleton = true
  limit 1;
$$;
revoke all on function public.fetch_public_saas_landing() from public;
grant execute on function public.fetch_public_saas_landing() to anon, authenticated;

create or replace function public.update_saas_public_landing(
  _enabled boolean,
  _hero_title text,
  _hero_description text,
  _primary_cta_label text,
  _whatsapp_phone text
)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  clean_phone text := regexp_replace(trim(coalesce(_whatsapp_phone, '')), '[^0-9]', '', 'g');
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  if not public.is_platform_owner() then raise exception 'PLATFORM_ROLE_REQUIRED' using errcode = '42501'; end if;
  if _enabled is null then raise exception 'INVALID_LANDING_STATUS' using errcode = '22023'; end if;
  if char_length(trim(coalesce(_hero_title, ''))) not between 1 and 180 then
    raise exception 'INVALID_LANDING_TITLE' using errcode = '22023';
  end if;
  if char_length(trim(coalesce(_hero_description, ''))) not between 1 and 600 then
    raise exception 'INVALID_LANDING_DESCRIPTION' using errcode = '22023';
  end if;
  if char_length(trim(coalesce(_primary_cta_label, ''))) not between 1 and 100 then
    raise exception 'INVALID_LANDING_CTA' using errcode = '22023';
  end if;
  if char_length(clean_phone) not between 8 and 15 then
    raise exception 'INVALID_LANDING_WHATSAPP' using errcode = '22023';
  end if;

  insert into public.saas_public_landing_settings as current_settings(
    singleton, enabled, hero_title, hero_description, primary_cta_label, whatsapp_phone, updated_at, updated_by
  ) values (
    true, _enabled, trim(_hero_title), trim(_hero_description), trim(_primary_cta_label), clean_phone, now(), auth.uid()
  )
  on conflict (singleton) do update set
    enabled = excluded.enabled,
    hero_title = excluded.hero_title,
    hero_description = excluded.hero_description,
    primary_cta_label = excluded.primary_cta_label,
    whatsapp_phone = excluded.whatsapp_phone,
    updated_at = now(),
    updated_by = auth.uid();

  insert into public.activity_logs(
    name, label, action, entity, entity_label, details, user_email, user_role
  ) values (
    'saas.public_landing.update',
    'Configuración de landing SaaS actualizada',
    'saas.public_landing.update',
    'saas_public_landing',
    case when _enabled then 'Landing publicada' else 'Landing desactivada' end,
    jsonb_build_object('enabled', _enabled),
    public.current_user_email(),
    public.current_user_role()
  );
end;
$$;
revoke all on function public.update_saas_public_landing(boolean, text, text, text, text) from public, anon;
grant execute on function public.update_saas_public_landing(boolean, text, text, text, text) to authenticated;

create or replace function public.set_saas_tenant_landing_enabled(
  _tenant_id uuid,
  _enabled boolean
)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  tenant_name text;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  if not public.is_platform_owner() then raise exception 'PLATFORM_ROLE_REQUIRED' using errcode = '42501'; end if;
  if _tenant_id is null or _enabled is null then raise exception 'INVALID_LANDING_STATUS' using errcode = '22023'; end if;

  select t.name into tenant_name
  from public.tenants as t
  where t.id = _tenant_id
  for update;
  if not found then raise exception 'TENANT_NOT_FOUND' using errcode = '22023'; end if;
  if lower(tenant_name) = 'dev team' then raise exception 'PLATFORM_TENANT_NOT_MUTABLE' using errcode = '42501'; end if;

  insert into public.tenant_branding(tenant_id, landing_enabled, updated_at)
  values (_tenant_id, _enabled, now())
  on conflict (tenant_id) do update set landing_enabled = excluded.landing_enabled, updated_at = now();

  insert into public.activity_logs(
    tenant_id, name, label, action, entity, entity_id, entity_label, details, user_email, user_role
  ) values (
    _tenant_id,
    'saas.tenant.landing',
    'Publicación de landing empresarial actualizada',
    'saas.tenant.landing',
    'tenant_landing',
    _tenant_id,
    tenant_name,
    jsonb_build_object('enabled', _enabled),
    public.current_user_email(),
    public.current_user_role()
  );
end;
$$;
revoke all on function public.set_saas_tenant_landing_enabled(uuid, boolean) from public, anon;
grant execute on function public.set_saas_tenant_landing_enabled(uuid, boolean) to authenticated;

create or replace function public.fetch_public_tenant_landing(_slug text)
returns table (
  company_name text,
  logo_url text,
  color_theme text,
  visual_assets jsonb,
  landing_cta_label text
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
    coalesce(b.visual_assets, '{}'::jsonb),
    coalesce(nullif(b.landing_cta_label, ''), 'Acceder al portal')
  from public.tenants as t
  left join public.tenant_branding as b on b.tenant_id = t.id
  where lower(t.slug) = lower(trim(_slug))
    and t.active = true
    and coalesce(b.landing_enabled, true) = true
  limit 1;
$$;
revoke all on function public.fetch_public_tenant_landing(text) from public;
grant execute on function public.fetch_public_tenant_landing(text) to anon, authenticated;
