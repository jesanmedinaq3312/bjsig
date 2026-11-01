-- Enforce AAL2 for authenticated non-worker users on protected RLS policies.
create or replace function public.mfa_required_for_current_user()
returns boolean
language sql stable security definer
set search_path = public, auth, pg_temp
as $$
  select auth.uid() is not null
    and coalesce(public.current_user_role(), 'unknown') <> 'worker';
$$;

-- SECURITY DEFINER write RPCs must reject unauthenticated callers explicitly.
create or replace function public.clear_active_tenant()
returns void language plpgsql security definer
set search_path = public, auth, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  delete from public.user_tenant_context where user_email = public.current_user_email();
end; $$;

create or replace function public.delete_worker_cascade(p_worker_rut text, p_tenant_id uuid)
returns void language plpgsql security definer
set search_path = public, auth, pg_temp as $$
declare v_clean_rut text; v_worker_id uuid; v_pass integer; r record;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  if not public.is_admin() then raise exception 'Solo administradores pueden eliminar trabajadores'; end if;
  if p_tenant_id is null then raise exception 'tenant_id requerido'; end if;
  if p_tenant_id <> public.current_tenant_id() and not public.is_platform_owner() then raise exception 'No puede eliminar trabajadores fuera de la empresa activa'; end if;
  v_clean_rut := upper(regexp_replace(p_worker_rut, '[.\s-]', '', 'g'));
  select id into v_worker_id from public.workers where tenant_id=p_tenant_id and upper(regexp_replace(rut, '[.\s-]', '', 'g'))=v_clean_rut;
  if v_worker_id is null then raise exception 'Trabajador no encontrado en la empresa autorizada'; end if;
  for v_pass in 1..5 loop
    for r in select c.table_name from information_schema.columns c join information_schema.columns t on t.table_schema=c.table_schema and t.table_name=c.table_name and t.column_name='tenant_id' where c.table_schema='public' and c.column_name='worker_rut' and c.table_name<>'workers' loop
      begin execute format('delete from public.%I where tenant_id=$1 and upper(regexp_replace(worker_rut, ''[.\s-]'', '''', ''g''))=$2', r.table_name) using p_tenant_id,v_clean_rut; exception when foreign_key_violation then null; end;
    end loop;
    for r in select c.table_name from information_schema.columns c join information_schema.columns t on t.table_schema=c.table_schema and t.table_name=c.table_name and t.column_name='tenant_id' where c.table_schema='public' and c.column_name='worker_id' and c.table_name<>'workers' loop
      begin execute format('delete from public.%I where tenant_id=$1 and worker_id=$2', r.table_name) using p_tenant_id,v_worker_id; exception when foreign_key_violation then null; end;
    end loop;
  end loop;
  delete from public.workers where id=v_worker_id and tenant_id=p_tenant_id;
end; $$;

create or replace function public.epp_adjust_stock(p_item_id uuid, p_size_label text, p_delta integer)
returns integer language plpgsql security definer
set search_path = public, auth, pg_temp as $$
declare v uuid:=public.current_tenant_id(); n integer;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  if v is null or not public.is_admin() then raise exception 'Active tenant required'; end if;
  insert into public.epp_stock(tenant_id,item_id,size_label,quantity) values(v,p_item_id,p_size_label,p_delta) on conflict do nothing;
  update public.epp_stock set quantity=quantity+p_delta where tenant_id=v and item_id=p_item_id and size_label=p_size_label returning quantity into n;
  if n is null or n<0 then raise exception 'Insufficient stock'; end if;
  return n;
end; $$;

create or replace function public.set_active_tenant(_tenant_id uuid, _reason text default null)
returns void language plpgsql security definer
set search_path = public, auth, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  if not exists(select 1 from public.tenant_memberships m where m.tenant_id=_tenant_id and lower(m.user_email)=public.current_user_email() and m.active) and not public.is_platform_owner() then raise exception 'Tenant access denied'; end if;
  insert into public.user_tenant_context(user_email,tenant_id) values(public.current_user_email(),_tenant_id) on conflict(user_email) do update set tenant_id=excluded.tenant_id,updated_at=now();
end; $$;

create or replace function public.update_saas_tenant_branding(_tenant_id uuid, _company_name text, _logo_url text, _color_theme text, _glass_opacity text, _landing_enabled boolean default true, _landing_cta_label text default 'Solicitar una demo')
returns void language plpgsql security definer
set search_path = public, auth, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  if not public.is_platform_owner() then raise exception 'Only the platform owner or an authorized Dev Team operator may update branding'; end if;
  if _tenant_id is null or not exists(select 1 from public.tenants where id=_tenant_id) then raise exception 'Tenant not found'; end if;
  insert into public.tenant_branding(tenant_id,company_name,logo_url,color_theme,glass_opacity,landing_enabled,landing_cta_label,updated_at) values(_tenant_id,left(trim(coalesce(_company_name,'')),200),left(trim(coalesce(_logo_url,'')),1000),left(trim(coalesce(_color_theme,'blue')),500),left(trim(coalesce(_glass_opacity,'0.8')),20),coalesce(_landing_enabled,true),left(trim(coalesce(_landing_cta_label,'Solicitar una demo')),100),now()) on conflict(tenant_id) do update set company_name=excluded.company_name,logo_url=excluded.logo_url,color_theme=excluded.color_theme,glass_opacity=excluded.glass_opacity,landing_enabled=excluded.landing_enabled,landing_cta_label=excluded.landing_cta_label,updated_at=now();
end; $$;

create or replace function public.update_saas_tenant_default_view(_tenant_id uuid, _default_view text)
returns void language plpgsql security definer
set search_path = public, auth, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  if not public.is_platform_owner() then raise exception 'Only the platform owner or an authorized Dev Team operator may update default views'; end if;
  if _default_view not in ('dashboard','calendar','workers','terrain','incidents','docs','trainings','shifts','indicators','iso','payroll','performance','vacations','finiquitos','securitytalks','ipermatrix','compliancedocs','departments','organigrama','eppwarehouse','treasury','commercial','medicallicenses','communications','extendedfinance','gdpr','harassmentreports','securitybreaches') then raise exception 'Invalid default view'; end if;
  if not exists(select 1 from public.tenants where id=_tenant_id) then raise exception 'Tenant not found'; end if;
  insert into public.tenant_settings(tenant_id,default_view,updated_at) values(_tenant_id,_default_view,now()) on conflict(tenant_id) do update set default_view=excluded.default_view,updated_at=now();
end; $$;

comment on function public.mfa_required_for_current_user() is 'BJSIGAPP: AAL2 required for authenticated non-worker users; no test-data bypass.';

-- Not used by the current frontend or Edge Functions; remove public RPC exposure.
revoke execute on function public.is_platform_identity(text) from public, anon, authenticated;
