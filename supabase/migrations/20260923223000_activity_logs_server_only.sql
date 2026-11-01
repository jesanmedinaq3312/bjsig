-- Activity logs are written only by the trusted log-activity Edge Function.
-- The function uses the service role after validating JWT, AAL2, tenant boundary,
-- IP policy and server-derived identity. Existing read policies remain unchanged.
revoke insert, update, delete, truncate on table public.activity_logs from anon, authenticated;
revoke all on table public.activity_logs from anon;
grant select on table public.activity_logs to authenticated;

comment on table public.activity_logs is
  'Append-only audit history. Browser writes are denied; use the authenticated log-activity Edge Function.';
