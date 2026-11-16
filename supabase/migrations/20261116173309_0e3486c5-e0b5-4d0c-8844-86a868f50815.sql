
alter table public.allowed_emails add column if not exists access_expires_at timestamptz;

create table if not exists public.attendance_time_sync (
  id uuid primary key default gen_random_uuid(),
  checked_at timestamptz not null default now(),
  official_time timestamptz,
  offset_ms integer,
  source text not null default 'SHOA',
  within_tolerance boolean not null default false,
  error text
);
grant select on public.attendance_time_sync to authenticated;
grant all on public.attendance_time_sync to service_role;
alter table public.attendance_time_sync enable row level security;
create policy "staff read time sync" on public.attendance_time_sync for select to authenticated using (public.is_admin());

create or replace function public.attendance_time_tolerance_ms() returns integer language sql immutable set search_path = '' as $$ select 1000 $$;

alter table public.qr_scan_events
  add column if not exists server_received_at timestamptz,
  add column if not exists official_offset_ms integer,
  add column if not exists time_source text,
  add column if not exists time_within_tolerance boolean,
  add column if not exists receipt_code text,
  add column if not exists prev_hash text,
  add column if not exists row_hash text;
create unique index if not exists qr_scan_events_receipt_code_key on public.qr_scan_events(receipt_code);

create or replace function private.qr_scan_events_seal()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_sync record;
  v_prev text;
  v_local timestamp;
begin
  new.server_received_at := now();
  v_local := now() at time zone 'America/Santiago';
  new.scan_date := v_local::date;
  new.scan_time := to_char(v_local, 'HH24:MI:SS');
  new.date := v_local::date;
  select offset_ms, source into v_sync from public.attendance_time_sync
    where error is null and checked_at > now() - interval '15 minutes'
    order by checked_at desc limit 1;
  new.official_offset_ms := v_sync.offset_ms;
  new.time_source := coalesce(v_sync.source, 'SERVER_UNSYNCED');
  new.time_within_tolerance := v_sync.offset_ms is not null and abs(v_sync.offset_ms) <= public.attendance_time_tolerance_ms();
  new.receipt_code := upper(encode(extensions.gen_random_bytes(6), 'hex'));
  perform pg_advisory_xact_lock(hashtext('qr_chain:' || coalesce(new.tenant_id::text,'')));
  select row_hash into v_prev from public.qr_scan_events
    where tenant_id is not distinct from new.tenant_id and row_hash is not null
    order by server_received_at desc, id desc limit 1;
  new.prev_hash := coalesce(v_prev, 'GENESIS');
  new.row_hash := encode(extensions.digest(concat_ws('|', new.prev_hash, new.id, new.tenant_id, new.worker_rut, new.scan_type,
     to_char(new.server_received_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US'), new.latitude, new.longitude, new.receipt_code), 'sha256'), 'hex');
  return new;
end $$;
revoke all on function private.qr_scan_events_seal() from public, anon, authenticated;
drop trigger if exists qr_scan_events_seal on public.qr_scan_events;
create trigger qr_scan_events_seal before insert on public.qr_scan_events for each row execute function private.qr_scan_events_seal();

-- Fiscalizador DT
create or replace function public.is_dt_inspector() returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from allowed_emails a where lower(a.email) = current_user_email() and a.active
    and a.role = 'fiscalizador_dt' and (a.access_expires_at is null or a.access_expires_at > now()))
    and coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
$$;
grant execute on function public.is_dt_inspector() to authenticated;

create table if not exists public.attendance_rectifications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default public.current_tenant_id() references public.tenants(id),
  scan_event_id uuid references public.qr_scan_events(id),
  worker_rut text not null,
  proposed_scan_type text,
  proposed_at timestamptz not null,
  reason text not null check (length(reason) between 5 and 1000),
  requested_by text not null default public.current_user_email(),
  status text not null default 'pendiente' check (status in ('pendiente','aceptada','rechazada')),
  worker_response_at timestamptz,
  worker_comment text,
  worker_ip text,
  prev_hash text,
  row_hash text,
  response_hash text,
  created_at timestamptz not null default now()
);
grant select, insert on public.attendance_rectifications to authenticated;
grant all on public.attendance_rectifications to service_role;
alter table public.attendance_rectifications enable row level security;
create policy "staff manage rectifications" on public.attendance_rectifications for select to authenticated
  using (tenant_id = public.current_tenant_id() and (public.is_admin() or public.current_user_role() in ('company_owner','human_resources')
     or regexp_replace(upper(worker_rut),'[.[:space:]-]','','g') = regexp_replace(upper(coalesce(public.current_worker_rut(),'')),'[.[:space:]-]','','g')));
create policy "staff propose rectifications" on public.attendance_rectifications for insert to authenticated
  with check (tenant_id = public.current_tenant_id() and status = 'pendiente' and (public.is_admin() or public.current_user_role() in ('company_owner','human_resources')));

create or replace function private.rectification_seal() returns trigger language plpgsql security definer set search_path = '' as $$
declare v_prev text;
begin
  if tg_op = 'INSERT' then
    new.status := 'pendiente'; new.worker_response_at := null; new.response_hash := null;
    new.requested_by := public.current_user_email(); new.created_at := now();
    perform pg_advisory_xact_lock(hashtext('rect_chain:' || new.tenant_id::text));
    select row_hash into v_prev from public.attendance_rectifications where tenant_id = new.tenant_id order by created_at desc, id desc limit 1;
    new.prev_hash := coalesce(v_prev,'GENESIS');
    new.row_hash := encode(extensions.digest(concat_ws('|', new.prev_hash, new.id, new.tenant_id, new.scan_event_id, new.worker_rut,
      new.proposed_scan_type, new.proposed_at, new.reason, new.requested_by, new.created_at), 'sha256'), 'hex');
    return new;
  end if;
  -- update: only the worker's single response is allowed (via RPC)
  if old.status <> 'pendiente' or current_setting('bjsig.rect_response', true) is distinct from 'on'
     or new.row_hash is distinct from old.row_hash or new.reason is distinct from old.reason or new.proposed_at is distinct from old.proposed_at then
    raise exception 'Rectifications are immutable' using errcode = '55000';
  end if;
  return new;
end $$;
revoke all on function private.rectification_seal() from public, anon, authenticated;
create trigger attendance_rectifications_seal before insert or update on public.attendance_rectifications for each row execute function private.rectification_seal();
create or replace function private.block_delete() returns trigger language plpgsql set search_path = '' as $$ begin raise exception 'Records are immutable' using errcode='55000'; end $$;
revoke all on function private.block_delete() from public, anon, authenticated;
create trigger attendance_rectifications_no_delete before delete on public.attendance_rectifications for each row execute function private.block_delete();

create or replace function public.respond_attendance_rectification(_id uuid, _accept boolean, _comment text default null, _ip text default null)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare r public.attendance_rectifications;
begin
  select * into r from attendance_rectifications where id = _id for update;
  if r.id is null or r.tenant_id <> current_tenant_id()
     or regexp_replace(upper(r.worker_rut),'[.[:space:]-]','','g') <> regexp_replace(upper(coalesce(current_worker_rut(),'')),'[.[:space:]-]','','g') then
    raise exception 'Not allowed' using errcode='42501';
  end if;
  if r.status <> 'pendiente' then raise exception 'Already answered' using errcode='55000'; end if;
  perform set_config('bjsig.rect_response','on', true);
  update attendance_rectifications set status = case when _accept then 'aceptada' else 'rechazada' end,
    worker_response_at = now(), worker_comment = left(_comment, 1000), worker_ip = left(_ip, 64),
    response_hash = encode(extensions.digest(concat_ws('|', r.row_hash, _accept, now(), _comment, _ip), 'sha256'), 'hex')
  where id = _id;
end $$;
revoke all on function public.respond_attendance_rectification(uuid, boolean, text, text) from public, anon;
grant execute on function public.respond_attendance_rectification(uuid, boolean, text, text) to authenticated;

-- Reports
create table if not exists public.attendance_reports (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default public.current_tenant_id() references public.tenants(id),
  worker_rut text not null,
  period_type text not null check (period_type in ('semanal','mensual')),
  period_start date not null,
  period_end date not null,
  summary jsonb not null default '{}'::jsonb,
  row_hash text not null,
  worker_status text not null default 'pendiente' check (worker_status in ('pendiente','conforme','observado')),
  worker_response_at timestamptz,
  worker_comment text,
  response_hash text,
  generated_by text,
  created_at timestamptz not null default now(),
  unique (tenant_id, worker_rut, period_type, period_start)
);
grant select on public.attendance_reports to authenticated;
grant all on public.attendance_reports to service_role;
alter table public.attendance_reports enable row level security;
create policy "read attendance reports" on public.attendance_reports for select to authenticated
  using (tenant_id = public.current_tenant_id() and (public.is_admin() or public.current_user_role() in ('company_owner','human_resources')
     or regexp_replace(upper(worker_rut),'[.[:space:]-]','','g') = regexp_replace(upper(coalesce(public.current_worker_rut(),'')),'[.[:space:]-]','','g')));
create trigger attendance_reports_no_delete before delete on public.attendance_reports for each row execute function private.block_delete();

create or replace function public.attendance_summary(_tenant uuid, _rut text, _start date, _end date) returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  with marks as (
    select scan_date, scan_type, server_received_at from qr_scan_events
    where tenant_id = _tenant and regexp_replace(upper(worker_rut),'[.[:space:]-]','','g') = regexp_replace(upper(_rut),'[.[:space:]-]','','g')
      and scan_date between _start and _end and server_received_at is not null),
  days as (
    select scan_date,
      min(server_received_at) filter (where scan_type ilike 'entrada%') e,
      max(server_received_at) filter (where scan_type ilike 'salida%') s,
      count(*) n from marks group by scan_date)
  select jsonb_build_object(
    'dias_con_marca', count(*),
    'marcas', coalesce(sum(n),0),
    'horas_trabajadas', round(coalesce(sum(extract(epoch from (s - e)) / 3600.0) filter (where s > e), 0)::numeric, 2),
    'dias_incompletos', count(*) filter (where e is null or s is null),
    'detalle', coalesce(jsonb_agg(jsonb_build_object('fecha', scan_date, 'entrada', e, 'salida', s, 'marcas', n) order by scan_date), '[]'::jsonb))
  from days
$$;
revoke all on function public.attendance_summary(uuid, text, date, date) from public, anon, authenticated;

create or replace function public.generate_attendance_report(_rut text, _type text, _start date) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_end date; v_sum jsonb; v_id uuid; v_tenant uuid := current_tenant_id();
begin
  if not (is_admin() or current_user_role() in ('company_owner','human_resources')) then raise exception 'Not allowed' using errcode='42501'; end if;
  if _type not in ('semanal','mensual') then raise exception 'Bad period'; end if;
  v_end := case when _type = 'semanal' then _start + 6 else (date_trunc('month', _start) + interval '1 month - 1 day')::date end;
  v_sum := attendance_summary(v_tenant, _rut, _start, v_end);
  insert into attendance_reports (tenant_id, worker_rut, period_type, period_start, period_end, summary, row_hash, generated_by)
  values (v_tenant, _rut, _type, _start, v_end, v_sum,
    encode(extensions.digest(concat_ws('|', v_tenant, _rut, _type, _start, v_end, v_sum::text), 'sha256'), 'hex'), current_user_email())
  on conflict (tenant_id, worker_rut, period_type, period_start) do nothing
  returning id into v_id;
  return v_id;
end $$;
revoke all on function public.generate_attendance_report(text, text, date) from public, anon;
grant execute on function public.generate_attendance_report(text, text, date) to authenticated;

create or replace function public.respond_attendance_report(_id uuid, _conforme boolean, _comment text default null)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare r attendance_reports;
begin
  select * into r from attendance_reports where id = _id for update;
  if r.id is null or r.tenant_id <> current_tenant_id()
     or regexp_replace(upper(r.worker_rut),'[.[:space:]-]','','g') <> regexp_replace(upper(coalesce(current_worker_rut(),'')),'[.[:space:]-]','','g') then
    raise exception 'Not allowed' using errcode='42501'; end if;
  if r.worker_status <> 'pendiente' then raise exception 'Already answered' using errcode='55000'; end if;
  update attendance_reports set worker_status = case when _conforme then 'conforme' else 'observado' end,
    worker_response_at = now(), worker_comment = left(_comment, 1000),
    response_hash = encode(extensions.digest(concat_ws('|', r.row_hash, _conforme, now(), _comment), 'sha256'), 'hex')
  where id = _id;
end $$;
revoke all on function public.respond_attendance_report(uuid, boolean, text) from public, anon;
grant execute on function public.respond_attendance_report(uuid, boolean, text) to authenticated;

-- Chain verification
create or replace function public.verify_attendance_chain() returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v_tenant uuid := current_tenant_id(); r record; v_prev text := 'GENESIS'; v_bad int := 0; v_total int := 0; v_first uuid;
begin
  if not (is_admin() or is_dt_inspector() or current_user_role() in ('company_owner','human_resources')) then raise exception 'Not allowed' using errcode='42501'; end if;
  for r in select * from qr_scan_events where tenant_id = v_tenant and row_hash is not null order by server_received_at, id loop
    v_total := v_total + 1;
    if r.prev_hash <> v_prev or r.row_hash <> encode(extensions.digest(concat_ws('|', r.prev_hash, r.id, r.tenant_id, r.worker_rut, r.scan_type,
        to_char(r.server_received_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US'), r.latitude, r.longitude, r.receipt_code), 'sha256'), 'hex') then
      v_bad := v_bad + 1; v_first := coalesce(v_first, r.id);
    end if;
    v_prev := r.row_hash;
  end loop;
  return jsonb_build_object('total', v_total, 'alteradas', v_bad, 'primera_alterada', v_first, 'integra', v_bad = 0);
end $$;
grant execute on function public.verify_attendance_chain() to authenticated;

-- Inspector read access (audited)
create or replace function public.dt_inspector_data(_kind text, _from date, _to date, _rut text default null) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_tenant uuid := current_tenant_id(); v jsonb;
begin
  if not is_dt_inspector() then raise exception 'Not allowed' using errcode='42501'; end if;
  if _to - _from > 400 then raise exception 'Range too large'; end if;
  insert into activity_logs (tenant_id, user_email, action, entity, details)
  values (v_tenant, current_user_email(), 'dt.inspect', _kind, jsonb_build_object('from', _from, 'to', _to, 'rut', _rut));
  if _kind = 'marcas' then
    select coalesce(jsonb_agg(to_jsonb(q) - 'data' order by q.server_received_at), '[]') into v from (
      select id, worker_rut, name, scan_type, scan_date, scan_time, server_received_at, official_offset_ms, time_source, time_within_tolerance,
        latitude, longitude, gps_missing, receipt_code, row_hash, prev_hash, '{}'::jsonb data
      from qr_scan_events where tenant_id = v_tenant and scan_date between _from and _to
        and (_rut is null or regexp_replace(upper(worker_rut),'[.[:space:]-]','','g') = regexp_replace(upper(_rut),'[.[:space:]-]','','g'))) q;
  elsif _kind = 'rectificaciones' then
    select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at), '[]') into v from attendance_rectifications r
      where tenant_id = v_tenant and created_at::date between _from and _to and (_rut is null or r.worker_rut = _rut);
  elsif _kind = 'reportes' then
    select coalesce(jsonb_agg(to_jsonb(r) order by r.period_start), '[]') into v from attendance_reports r
      where tenant_id = v_tenant and period_start between _from and _to and (_rut is null or r.worker_rut = _rut);
  elsif _kind = 'turnos' then
    select coalesce(jsonb_agg(to_jsonb(s)), '[]') into v from shift_assignments s where tenant_id = v_tenant;
  else raise exception 'Bad kind'; end if;
  return v;
end $$;
revoke all on function public.dt_inspector_data(text, date, date, text) from public, anon;
grant execute on function public.dt_inspector_data(text, date, date, text) to authenticated;

-- Public receipt verification (masked)
create or replace function public.verify_attendance_receipt(_code text) returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object('valido', true, 'tipo', q.scan_type, 'fecha', q.scan_date, 'hora', q.scan_time,
    'hora_utc', q.server_received_at, 'fuente_hora', q.time_source, 'desfase_ms', q.official_offset_ms,
    'empresa', t.name, 'rut', '****' || right(regexp_replace(q.worker_rut,'[.[:space:]-]','','g'), 4), 'huella', q.row_hash)
  from qr_scan_events q left join tenants t on t.id = q.tenant_id
  where q.receipt_code = upper(left(_code, 32)) limit 1
$$;
grant execute on function public.verify_attendance_receipt(text) to anon, authenticated;
