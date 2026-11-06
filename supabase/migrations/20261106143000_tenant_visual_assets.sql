-- Recursos visuales configurables desde Dev Team, separados del logo operativo.
-- Se guarda un objeto extensible para poder agregar nuevos componentes sin otra migración.
alter table public.tenant_branding
  add column if not exists visual_assets jsonb not null default '{}'::jsonb;

alter table public.tenant_branding
  drop constraint if exists tenant_branding_visual_assets_object;
alter table public.tenant_branding
  add constraint tenant_branding_visual_assets_object
  check (jsonb_typeof(visual_assets) = 'object');

drop function if exists public.fetch_saas_tenant_branding();
create function public.fetch_saas_tenant_branding()
returns table (
  tenant_id uuid,
  tenant_name text,
  company_name text,
  logo_url text,
  color_theme text,
  glass_opacity text,
  landing_enabled boolean,
  landing_cta_label text,
  visual_assets jsonb
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    t.id,
    t.name,
    coalesce(b.company_name, t.name),
    coalesce(b.logo_url, ''),
    coalesce(b.color_theme, 'blue'),
    coalesce(b.glass_opacity, '0.8'),
    coalesce(b.landing_enabled, true),
    coalesce(b.landing_cta_label, 'Solicitar una demo'),
    coalesce(b.visual_assets, '{}'::jsonb)
  from public.tenants t
  left join public.tenant_branding b on b.tenant_id = t.id
  where public.is_platform_owner()
  order by t.name;
$$;
revoke all on function public.fetch_saas_tenant_branding() from public, anon;
grant execute on function public.fetch_saas_tenant_branding() to authenticated;

-- Mantiene la firma antigua para compatibilidad con clientes anteriores.
-- El frontend nuevo usa la sobrecarga de ocho argumentos de abajo.
create or replace function public.update_saas_tenant_branding(
  _tenant_id uuid,
  _company_name text,
  _logo_url text,
  _color_theme text,
  _glass_opacity text,
  _landing_enabled boolean default true,
  _landing_cta_label text default 'Solicitar una demo'
)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  if not public.is_platform_owner() then raise exception 'Only the platform owner or an authorized Dev Team operator may update branding'; end if;
  if _tenant_id is null or not exists(select 1 from public.tenants where id = _tenant_id) then raise exception 'Tenant not found'; end if;
  insert into public.tenant_branding(tenant_id,company_name,logo_url,color_theme,glass_opacity,landing_enabled,landing_cta_label,updated_at)
  values(_tenant_id,left(trim(coalesce(_company_name,'')),200),left(trim(coalesce(_logo_url,'')),1000),left(trim(coalesce(_color_theme,'blue')),500),left(trim(coalesce(_glass_opacity,'0.8')),20),coalesce(_landing_enabled,true),left(trim(coalesce(_landing_cta_label,'Solicitar una demo')),100),now())
  on conflict(tenant_id) do update set company_name=excluded.company_name,logo_url=excluded.logo_url,color_theme=excluded.color_theme,glass_opacity=excluded.glass_opacity,landing_enabled=excluded.landing_enabled,landing_cta_label=excluded.landing_cta_label,updated_at=now();
end;
$$;

create function public.update_saas_tenant_branding(
  _tenant_id uuid,
  _company_name text,
  _logo_url text,
  _color_theme text,
  _glass_opacity text,
  _landing_enabled boolean,
  _landing_cta_label text,
  _visual_assets jsonb
)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  if not public.is_platform_owner() then raise exception 'Only the platform owner or an authorized Dev Team operator may update branding'; end if;
  if _tenant_id is null or not exists(select 1 from public.tenants where id = _tenant_id) then raise exception 'Tenant not found'; end if;
  if jsonb_typeof(coalesce(_visual_assets, '{}'::jsonb)) <> 'object' then raise exception 'visual_assets must be a JSON object'; end if;
  insert into public.tenant_branding(tenant_id,company_name,logo_url,color_theme,glass_opacity,landing_enabled,landing_cta_label,visual_assets,updated_at)
  values(_tenant_id,left(trim(coalesce(_company_name,'')),200),left(trim(coalesce(_logo_url,'')),1000),left(trim(coalesce(_color_theme,'blue')),500),left(trim(coalesce(_glass_opacity,'0.8')),20),coalesce(_landing_enabled,true),left(trim(coalesce(_landing_cta_label,'Solicitar una demo')),100),coalesce(_visual_assets, '{}'::jsonb),now())
  on conflict(tenant_id) do update set company_name=excluded.company_name,logo_url=excluded.logo_url,color_theme=excluded.color_theme,glass_opacity=excluded.glass_opacity,landing_enabled=excluded.landing_enabled,landing_cta_label=excluded.landing_cta_label,visual_assets=excluded.visual_assets,updated_at=now();
end;
$$;
revoke all on function public.update_saas_tenant_branding(uuid,text,text,text,text,boolean,text,jsonb) from public, anon;
grant execute on function public.update_saas_tenant_branding(uuid,text,text,text,text,boolean,text,jsonb) to authenticated;

-- La pantalla pública/pre-login sólo expone los recursos visuales, nunca datos operativos.
drop function if exists public.fetch_public_tenant_branding(text);
create function public.fetch_public_tenant_branding(_slug text)
returns table (
  company_name text,
  logo_url text,
  color_theme text,
  glass_opacity text,
  visual_assets jsonb
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
    coalesce(nullif(b.glass_opacity, ''), '0.8'),
    coalesce(b.visual_assets, '{}'::jsonb)
  from public.tenants t
  left join public.tenant_branding b on b.tenant_id = t.id
  where t.active = true and lower(t.slug) = lower(trim(_slug))
  limit 1;
$$;
revoke all on function public.fetch_public_tenant_branding(text) from public, anon, authenticated;
grant execute on function public.fetch_public_tenant_branding(text) to anon, authenticated;
