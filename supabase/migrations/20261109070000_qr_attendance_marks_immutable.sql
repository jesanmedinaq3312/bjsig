-- Las marcas directas de asistencia son append-only para clientes autenticados.
-- Las correcciones requieren un flujo de regularización separado y trazable.
create or replace function private.prevent_qr_scan_event_mutation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception 'QR attendance marks are immutable; submit a regularization request instead'
    using errcode = '55000';
end;
$$;

revoke all on function private.prevent_qr_scan_event_mutation() from public, anon, authenticated;

drop trigger if exists qr_scan_events_prevent_mutation on public.qr_scan_events;
create trigger qr_scan_events_prevent_mutation
before update or delete on public.qr_scan_events
for each row execute function private.prevent_qr_scan_event_mutation();

revoke update, delete on table public.qr_scan_events from public, anon, authenticated;
grant select, insert on table public.qr_scan_events to authenticated;
