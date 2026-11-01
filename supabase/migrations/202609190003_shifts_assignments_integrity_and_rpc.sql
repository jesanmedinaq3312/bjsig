-- Fase 4: integridad, aislamiento y mutaciones transaccionales de turnos.

alter table public.shift_definitions add constraint shift_definitions_name_nonempty check (length(trim(coalesce(name,''))) > 0) not valid;
alter table public.shift_definitions add constraint shift_definitions_time_pair check ((start_time is null and end_time is null) or (start_time is not null and end_time is not null)) not valid;
alter table public.shift_assignments add constraint shift_assignments_shift_name_nonempty check (length(trim(coalesce(shift_name,''))) > 0) not valid;
alter table public.shift_assignments add constraint shift_assignments_duration_valid check (duration_type in ('indefinido','temporal','semanal','mensual','personalizado')) not valid;
alter table public.shift_assignments add constraint shift_assignments_dates_valid check (end_date is null or end_date >= start_date) not valid;
alter table public.shift_assignments add constraint shift_assignments_days_valid check (days_of_week is null or (array_length(days_of_week,1) between 1 and 7 and days_of_week <@ array[0,1,2,3,4,5,6]::integer[])) not valid;
alter table public.shift_change_logs add constraint shift_change_logs_type_valid check (change_type in ('creacion','modificacion','intercambio','desactivacion','reactivacion')) not valid;
create unique index if not exists uq_shift_definitions_tenant_id on public.shift_definitions(tenant_id,id);
alter table public.shift_assignments add constraint shift_assignments_definition_same_tenant_fk foreign key (tenant_id, shift_definition_id) references public.shift_definitions(tenant_id,id) not valid;
create unique index if not exists uq_shift_assignments_active_worker on public.shift_assignments(tenant_id, worker_rut) where active;
create index if not exists idx_shift_assignments_tenant_dates on public.shift_assignments(tenant_id,start_date,end_date) where active;
create index if not exists idx_shift_change_logs_tenant_worker_created on public.shift_change_logs(tenant_id,worker_rut,created_at desc);

alter table public.shift_definitions validate constraint shift_definitions_name_nonempty;
alter table public.shift_definitions validate constraint shift_definitions_time_pair;
alter table public.shift_assignments validate constraint shift_assignments_shift_name_nonempty;
alter table public.shift_assignments validate constraint shift_assignments_duration_valid;
alter table public.shift_assignments validate constraint shift_assignments_dates_valid;
alter table public.shift_assignments validate constraint shift_assignments_days_valid;
alter table public.shift_change_logs validate constraint shift_change_logs_type_valid;
alter table public.shift_assignments validate constraint shift_assignments_definition_same_tenant_fk;

create or replace function public.shift_actor_can_write() returns boolean
language sql stable security definer set search_path=public,auth,pg_temp as $$
  select public.is_platform_owner() or coalesce(public.current_user_role(),'guest') in
    ('superadmin','developer','company_owner','admin','human_resources','prevencionista','manager')
$$;

create or replace function public.apply_shift_assignment(
  _worker_rut text, _shift_definition_id uuid, _duration_type text,
  _start_date date, _end_date date default null, _swap_with_rut text default null,
  _reason text default null, _days_of_week integer[] default null
) returns table(assignment public.shift_assignments, change_log public.shift_change_logs)
language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare
  tenant uuid := public.current_tenant_id(); old_row public.shift_assignments;
  result_assignment public.shift_assignments; result_log public.shift_change_logs;
  change_kind text; clean_worker text := trim(_worker_rut);
  clean_swap text := nullif(trim(coalesce(_swap_with_rut,'')), '');
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  if tenant is null then raise exception 'TENANT_CONTEXT_REQUIRED' using errcode='42501'; end if;
  if not public.shift_actor_can_write() then raise exception 'SHIFT_WRITE_NOT_ALLOWED' using errcode='42501'; end if;
  if clean_worker='' then raise exception 'WORKER_REQUIRED' using errcode='22023'; end if;
  if not exists (select 1 from public.workers w where w.tenant_id=tenant and w.rut=clean_worker and coalesce(w.status,'ACTIVO') <> 'INACTIVO' and coalesce(w.contract_status,'Vigente') <> 'Desvinculado') then raise exception 'WORKER_NOT_FOUND_OR_INACTIVE' using errcode='22023'; end if;
  if not exists (select 1 from public.shift_definitions d where d.tenant_id=tenant and d.id=_shift_definition_id and d.active) then raise exception 'SHIFT_DEFINITION_NOT_ACTIVE' using errcode='22023'; end if;
  if _duration_type not in ('indefinido','temporal','semanal','mensual','personalizado') then raise exception 'SHIFT_DURATION_INVALID' using errcode='22023'; end if;
  if _end_date is not null and _end_date < _start_date then raise exception 'SHIFT_DATE_RANGE_INVALID' using errcode='22023'; end if;
  if clean_swap is not null and not exists (select 1 from public.workers w where w.tenant_id=tenant and w.rut=clean_swap and coalesce(w.status,'ACTIVO') <> 'INACTIVO' and coalesce(w.contract_status,'Vigente') <> 'Desvinculado') then raise exception 'SWAP_WORKER_NOT_FOUND_OR_INACTIVE' using errcode='22023'; end if;
  select * into old_row from public.shift_assignments where tenant_id=tenant and worker_rut=clean_worker and active for update;
  change_kind := case when old_row.id is null then 'creacion' when clean_swap is not null then 'intercambio' else 'modificacion' end;
  if old_row.id is null then
    insert into public.shift_assignments(tenant_id,worker_rut,shift_definition_id,shift_name,duration_type,start_date,end_date,swap_with_rut,change_reason,assigned_by_email,active,days_of_week)
    select tenant,clean_worker,_shift_definition_id,d.name,_duration_type,_start_date,_end_date,clean_swap,nullif(trim(_reason),''),public.current_user_email(),true,_days_of_week from public.shift_definitions d where d.tenant_id=tenant and d.id=_shift_definition_id returning * into result_assignment;
  else
    update public.shift_assignments a set shift_definition_id=_shift_definition_id, shift_name=d.name, duration_type=_duration_type, start_date=_start_date, end_date=_end_date, swap_with_rut=clean_swap, change_reason=nullif(trim(_reason),''), assigned_by_email=public.current_user_email(), active=true, days_of_week=_days_of_week, updated_at=now()
    from public.shift_definitions d where a.id=old_row.id and d.tenant_id=tenant and d.id=_shift_definition_id returning a.* into result_assignment;
  end if;
  insert into public.shift_change_logs(tenant_id,worker_rut,old_shift_name,new_shift_name,old_duration_type,new_duration_type,old_end_date,new_end_date,change_type,swap_with_rut,data)
  values(tenant,clean_worker,old_row.shift_name,result_assignment.shift_name,old_row.duration_type,result_assignment.duration_type,old_row.end_date,result_assignment.end_date,change_kind,clean_swap,jsonb_build_object('reason',nullif(trim(_reason),''),'changed_by_email',public.current_user_email(),'assignment_id',result_assignment.id,'duration_type',result_assignment.duration_type)) returning * into result_log;
  return query select result_assignment,result_log;
end; $$;

create or replace function public.deactivate_shift_assignment(_assignment_id uuid, _reason text default null)
returns table(assignment public.shift_assignments, change_log public.shift_change_logs)
language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare tenant uuid := public.current_tenant_id(); old_row public.shift_assignments; result_assignment public.shift_assignments; result_log public.shift_change_logs; end_date_value date := current_date;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  if tenant is null then raise exception 'TENANT_CONTEXT_REQUIRED' using errcode='42501'; end if;
  if not public.shift_actor_can_write() then raise exception 'SHIFT_WRITE_NOT_ALLOWED' using errcode='42501'; end if;
  select * into old_row from public.shift_assignments where id=_assignment_id and tenant_id=tenant for update;
  if old_row.id is null then raise exception 'SHIFT_ASSIGNMENT_NOT_FOUND' using errcode='P0002'; end if;
  if not old_row.active then return query select old_row, null::public.shift_change_logs; return; end if;
  update public.shift_assignments set active=false,end_date=end_date_value,change_reason=nullif(trim(_reason),''),updated_at=now() where id=old_row.id returning * into result_assignment;
  insert into public.shift_change_logs(tenant_id,worker_rut,old_shift_name,new_shift_name,old_duration_type,new_duration_type,old_end_date,new_end_date,change_type,swap_with_rut,data)
  values(tenant,old_row.worker_rut,old_row.shift_name,null,old_row.duration_type,null,old_row.end_date,end_date_value,'desactivacion',null,jsonb_build_object('reason',nullif(trim(_reason),''),'changed_by_email',public.current_user_email(),'assignment_id',old_row.id)) returning * into result_log;
  return query select result_assignment,result_log;
end; $$;

revoke all on function public.shift_actor_can_write() from public;
revoke all on function public.apply_shift_assignment(text,uuid,text,date,date,text,text,integer[]) from public;
revoke all on function public.deactivate_shift_assignment(uuid,text) from public;
grant execute on function public.shift_actor_can_write() to authenticated;
grant execute on function public.apply_shift_assignment(text,uuid,text,date,date,text,text,integer[]) to authenticated;
grant execute on function public.deactivate_shift_assignment(uuid,text) to authenticated;

-- RLS: las lecturas siguen el tenant actual; las escrituras requieren rol autorizado.
drop policy if exists tenant_boundary_shift_definitions on public.shift_definitions;
drop policy if exists tenant_boundary_shift_assignments on public.shift_assignments;
drop policy if exists tenant_boundary_shift_change_logs on public.shift_change_logs;
create policy shift_definitions_tenant_select on public.shift_definitions for select to authenticated using (tenant_id = public.current_tenant_id());
create policy shift_definitions_tenant_insert on public.shift_definitions for insert to authenticated with check (tenant_id = public.current_tenant_id() and public.shift_actor_can_write());
create policy shift_definitions_tenant_update on public.shift_definitions for update to authenticated using (tenant_id = public.current_tenant_id() and public.shift_actor_can_write()) with check (tenant_id = public.current_tenant_id() and public.shift_actor_can_write());
create policy shift_definitions_tenant_delete on public.shift_definitions for delete to authenticated using (tenant_id = public.current_tenant_id() and public.shift_actor_can_write());
create policy shift_assignments_tenant_select on public.shift_assignments for select to authenticated using (tenant_id = public.current_tenant_id());
create policy shift_assignments_tenant_insert on public.shift_assignments for insert to authenticated with check (tenant_id = public.current_tenant_id() and public.shift_actor_can_write());
create policy shift_assignments_tenant_update on public.shift_assignments for update to authenticated using (tenant_id = public.current_tenant_id() and public.shift_actor_can_write()) with check (tenant_id = public.current_tenant_id() and public.shift_actor_can_write());
create policy shift_assignments_tenant_delete on public.shift_assignments for delete to authenticated using (tenant_id = public.current_tenant_id() and public.shift_actor_can_write());
create policy shift_change_logs_tenant_select on public.shift_change_logs for select to authenticated using (tenant_id = public.current_tenant_id());

-- Corrección: DELETE también requiere rol autorizado.
drop policy if exists shift_definitions_tenant_delete on public.shift_definitions;
drop policy if exists shift_assignments_tenant_delete on public.shift_assignments;
create policy shift_definitions_tenant_delete on public.shift_definitions for delete to authenticated using (tenant_id = public.current_tenant_id() and public.shift_actor_can_write());
create policy shift_assignments_tenant_delete on public.shift_assignments for delete to authenticated using (tenant_id = public.current_tenant_id() and public.shift_actor_can_write());

-- Supabase Advisor: helpers y mutaciones de turnos no son invocables por anon.
revoke all on function public.shift_actor_can_write() from anon;
revoke all on function public.apply_shift_assignment(text,uuid,text,date,date,text,text,integer[]) from anon;
revoke all on function public.deactivate_shift_assignment(uuid,text) from anon;
grant execute on function public.shift_actor_can_write() to authenticated;
grant execute on function public.apply_shift_assignment(text,uuid,text,date,date,text,text,integer[]) to authenticated;
grant execute on function public.deactivate_shift_assignment(uuid,text) to authenticated;
revoke execute on function public.shift_actor_can_write() from public;
revoke execute on function public.shift_actor_can_write() from anon;
grant execute on function public.shift_actor_can_write() to authenticated;
