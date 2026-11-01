-- Fases 5–6: branding tenant-scoped, fallbacks visuales y notificaciones inmutables.

alter table public.tenant_branding add constraint tenant_branding_company_name_length check (char_length(company_name) between 1 and 200) not valid;
alter table public.tenant_branding add constraint tenant_branding_logo_url_format check (logo_url = '' or logo_url ~* '^https?://') not valid;
alter table public.saas_customer_notifications add constraint saas_notifications_template_nonempty check (char_length(trim(template_key)) between 1 and 80) not valid;
alter table public.saas_customer_notifications add constraint saas_notifications_title_nonempty check (char_length(trim(title)) between 1 and 200) not valid;
alter table public.saas_customer_notifications add constraint saas_notifications_message_nonempty check (char_length(trim(message)) between 1 and 10000) not valid;
alter table public.saas_customer_notifications add constraint saas_notifications_priority_valid check (priority in ('normal','high','urgent')) not valid;
alter table public.saas_customer_notifications add constraint saas_notifications_channel_valid check (channel in ('in_app')) not valid;
alter table public.tenant_branding validate constraint tenant_branding_company_name_length;
alter table public.tenant_branding validate constraint tenant_branding_logo_url_format;
alter table public.saas_customer_notifications validate constraint saas_notifications_template_nonempty;
alter table public.saas_customer_notifications validate constraint saas_notifications_title_nonempty;
alter table public.saas_customer_notifications validate constraint saas_notifications_message_nonempty;
alter table public.saas_customer_notifications validate constraint saas_notifications_priority_valid;
alter table public.saas_customer_notifications validate constraint saas_notifications_channel_valid;

create index if not exists idx_saas_notifications_tenant_created on public.saas_customer_notifications(tenant_id,created_at desc);
create index if not exists idx_saas_notifications_tenant_unread on public.saas_customer_notifications(tenant_id,created_at desc) where read_at is null;
create index if not exists idx_saas_notifications_tenant_priority on public.saas_customer_notifications(tenant_id,priority,created_at desc);

drop policy if exists branding_owner on public.tenant_branding;
create policy branding_tenant_select on public.tenant_branding for select to authenticated using (public.is_platform_owner() or tenant_id=public.current_tenant_id());
create policy branding_platform_insert on public.tenant_branding for insert to authenticated with check (public.is_platform_owner());
create policy branding_platform_update on public.tenant_branding for update to authenticated using (public.is_platform_owner()) with check (public.is_platform_owner());
create policy branding_platform_delete on public.tenant_branding for delete to authenticated using (public.is_platform_owner());

drop policy if exists customer_notifications_owner_or_tenant on public.saas_customer_notifications;
create policy saas_notifications_tenant_select on public.saas_customer_notifications for select to authenticated using (public.is_platform_owner() or tenant_id=public.current_tenant_id());
create policy saas_notifications_tenant_update_read on public.saas_customer_notifications for update to authenticated using (tenant_id=public.current_tenant_id()) with check (tenant_id=public.current_tenant_id());

create or replace function public.protect_saas_notification_content() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if tg_op='UPDATE' and (new.tenant_id is distinct from old.tenant_id or new.template_key is distinct from old.template_key or new.channel is distinct from old.channel or new.message is distinct from old.message or new.created_at is distinct from old.created_at or new.title is distinct from old.title or new.priority is distinct from old.priority or new.created_by_email is distinct from old.created_by_email or new.metadata is distinct from old.metadata) then
    raise exception 'NOTIFICATION_CONTENT_IMMUTABLE' using errcode='42501';
  end if;
  return new;
end; $$;
drop trigger if exists protect_saas_notification_content on public.saas_customer_notifications;
create trigger protect_saas_notification_content before update on public.saas_customer_notifications for each row execute function public.protect_saas_notification_content();

create or replace function public.publish_saas_notification(_tenant_id uuid,_template_key text,_title text,_message text,_priority text default 'normal',_metadata jsonb default '{}'::jsonb)
returns public.saas_customer_notifications language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare result public.saas_customer_notifications;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  if not public.is_platform_owner() then raise exception 'PLATFORM_ROLE_REQUIRED' using errcode='42501'; end if;
  if not exists(select 1 from public.tenants where id=_tenant_id and active) then raise exception 'TENANT_NOT_ACTIVE' using errcode='22023'; end if;
  insert into public.saas_customer_notifications(tenant_id,template_key,channel,title,message,priority,created_by_email,metadata)
  values(_tenant_id,trim(_template_key),'in_app',trim(_title),trim(_message),coalesce(_priority,'normal'),public.current_user_email(),coalesce(_metadata,'{}'::jsonb)) returning * into result;
  return result;
end; $$;

create or replace function public.acknowledge_saas_notification(_notification_id uuid)
returns public.saas_customer_notifications language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare result public.saas_customer_notifications;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  update public.saas_customer_notifications set read_at=coalesce(read_at,now()),read_by=coalesce(read_by,auth.uid()) where id=_notification_id and tenant_id=public.current_tenant_id() returning * into result;
  if result.id is null then raise exception 'NOTIFICATION_NOT_FOUND' using errcode='P0002'; end if;
  return result;
end; $$;

revoke all on function public.protect_saas_notification_content() from public;
revoke all on function public.publish_saas_notification(uuid,text,text,text,text,jsonb) from public;
revoke all on function public.acknowledge_saas_notification(uuid) from public;
revoke execute on function public.protect_saas_notification_content() from anon;
revoke execute on function public.publish_saas_notification(uuid,text,text,text,text,jsonb) from anon;
revoke execute on function public.acknowledge_saas_notification(uuid) from anon;
grant execute on function public.publish_saas_notification(uuid,text,text,text,text,jsonb) to authenticated;
grant execute on function public.acknowledge_saas_notification(uuid) to authenticated;

-- El acuse de lectura también pasa exclusivamente por acknowledge_saas_notification.
drop policy if exists saas_notifications_tenant_update_read on public.saas_customer_notifications;
