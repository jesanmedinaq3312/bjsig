create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

do $$
begin
  create type private.gps_capture_event_type as enum ('captured', 'rejected');
exception
  when duplicate_object then null;
end;
$$;

create table if not exists private.gps_gate_settings (
  id smallint primary key check (id = 1),
  enabled boolean not null default false
);

insert into private.gps_gate_settings (id, enabled)
values (1, false)
on conflict (id) do nothing;

create table if not exists private.gps_session_attestations (
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  accuracy_m double precision not null check (
    accuracy_m >= 0 and accuracy_m::text not in ('NaN', 'Infinity', '-Infinity')
  ),
  captured_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  user_email text,
  ip_address text,
  user_agent text,
  primary key (user_id, session_id)
);

create table if not exists private.gps_capture_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null,
  event_type private.gps_capture_event_type not null,
  captured_at timestamptz,
  recorded_at timestamptz not null default now(),
  user_email text,
  ip_address text,
  user_agent text,
  details jsonb not null default '{}'::jsonb
);

alter table private.gps_session_attestations enable row level security;
alter table private.gps_capture_events enable row level security;
revoke all on private.gps_gate_settings, private.gps_session_attestations, private.gps_capture_events
  from public, anon, authenticated;
create index if not exists gps_capture_events_recent_idx
  on private.gps_capture_events (user_id, recorded_at desc);

create or replace function public.gps_gate_enabled()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select settings.enabled
    from private.gps_gate_settings as settings
    where settings.id = 1
  ), false);
$$;

create or replace function public.gps_session_is_verified()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
    and nullif(auth.jwt() ->> 'session_id', '') is not null
    and exists (
      select 1
      from private.gps_session_attestations as attestations
      where attestations.user_id = auth.uid()
        and attestations.session_id = (auth.jwt() ->> 'session_id')::uuid
    );
$$;

create or replace function public.attest_gps_session(
  p_latitude double precision,
  p_longitude double precision,
  p_accuracy_m double precision,
  p_captured_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_session_id uuid;
  v_headers jsonb;
  v_now timestamptz := now();
  v_is_new_session boolean;
begin
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'code', 'AUTH_REQUIRED');
  end if;

  begin
    v_session_id := nullif(auth.jwt() ->> 'session_id', '')::uuid;
  exception when invalid_text_representation then
    return jsonb_build_object('ok', false, 'code', 'SESSION_REQUIRED');
  end;
  if v_session_id is null then
    return jsonb_build_object('ok', false, 'code', 'SESSION_REQUIRED');
  end if;

  if not public.gps_gate_enabled() then
    return jsonb_build_object('ok', false, 'code', 'GPS_GATE_DISABLED');
  end if;

  if p_latitude is null or p_longitude is null or p_accuracy_m is null or p_captured_at is null
    or p_latitude < -90 or p_latitude > 90
    or p_longitude < -180 or p_longitude > 180
    or p_accuracy_m < 0
    or p_accuracy_m::text in ('NaN', 'Infinity', '-Infinity')
    or p_captured_at < v_now - interval '2 minutes'
    or p_captured_at > v_now + interval '30 seconds'
  then
    v_headers := coalesce(nullif(current_setting('request.headers', true), '')::jsonb, '{}'::jsonb);
    insert into private.gps_capture_events (
      user_id, session_id, event_type, recorded_at, user_email,
      ip_address, user_agent, details
    ) values (
      v_user_id, v_session_id, 'rejected', v_now,
      auth.jwt() ->> 'email',
      coalesce(v_headers ->> 'cf-connecting-ip', v_headers ->> 'x-real-ip', split_part(v_headers ->> 'x-forwarded-for', ',', 1)),
      v_headers ->> 'user-agent',
      jsonb_build_object('reason', 'invalid_or_stale_capture')
    );

    return jsonb_build_object(
      'ok', false,
      'code', 'GPS_CAPTURE_INVALID',
      'message', 'La captura GPS falta, es inválida o tiene más de 2 minutos. Vuelve a capturarla.'
    );
  end if;

  v_headers := coalesce(nullif(current_setting('request.headers', true), '')::jsonb, '{}'::jsonb);
  select not exists (
    select 1 from private.gps_session_attestations as attestations
    where attestations.user_id = v_user_id and attestations.session_id = v_session_id
  ) into v_is_new_session;

  insert into private.gps_session_attestations (
    user_id, session_id, latitude, longitude, accuracy_m, captured_at,
    recorded_at, user_email, ip_address, user_agent
  ) values (
    v_user_id, v_session_id, p_latitude, p_longitude, p_accuracy_m, p_captured_at,
    v_now, auth.jwt() ->> 'email',
    coalesce(v_headers ->> 'cf-connecting-ip', v_headers ->> 'x-real-ip', split_part(v_headers ->> 'x-forwarded-for', ',', 1)),
    v_headers ->> 'user-agent'
  )
  on conflict (user_id, session_id) do update set
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    accuracy_m = excluded.accuracy_m,
    captured_at = excluded.captured_at,
    recorded_at = excluded.recorded_at,
    user_email = excluded.user_email,
    ip_address = excluded.ip_address,
    user_agent = excluded.user_agent;

  if v_is_new_session then
    insert into private.gps_capture_events (
      user_id, session_id, event_type, captured_at, recorded_at,
      user_email, ip_address, user_agent
    ) values (
      v_user_id, v_session_id, 'captured', p_captured_at, v_now,
      auth.jwt() ->> 'email',
      coalesce(v_headers ->> 'cf-connecting-ip', v_headers ->> 'x-real-ip', split_part(v_headers ->> 'x-forwarded-for', ',', 1)),
      v_headers ->> 'user-agent'
    );
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.gps_gate_enabled() from public, anon;
revoke all on function public.gps_session_is_verified() from public, anon;
revoke all on function public.attest_gps_session(double precision, double precision, double precision, timestamptz) from public, anon;
grant execute on function public.gps_gate_enabled() to authenticated, service_role;
grant execute on function public.gps_session_is_verified() to authenticated, service_role;
grant execute on function public.attest_gps_session(double precision, double precision, double precision, timestamptz) to authenticated;
