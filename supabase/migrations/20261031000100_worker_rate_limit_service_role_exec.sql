-- worker-auth uses service_role for rate limiting, audit logging and password expiry.
-- Keep these SECURITY DEFINER helpers unavailable to anon/authenticated and grant
-- only the specific table/column operations used by the Edge Function.
BEGIN;

GRANT EXECUTE ON FUNCTION public.check_login_rate_limit(text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_login_attempts() TO service_role;

GRANT INSERT (identifier, ip_hint, success, tenant_id)
  ON TABLE public.login_attempts TO service_role;

GRANT INSERT (
  tenant_id, user_email, action, entity, entity_label, details, ip_hint,
  user_agent, user_role, latitude, longitude, device_id, fingerprint,
  session_id, session_duration, cookie_data, referrer, viewport
) ON TABLE public.activity_logs TO service_role;

GRANT SELECT (key, value) ON TABLE public.system_config TO service_role;

COMMIT;
