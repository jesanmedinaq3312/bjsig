-- Tighten EXECUTE privileges for SECURITY DEFINER functions identified by Supabase advisors.
-- No data is changed. Functions used by the authenticated SaaS control panel retain
-- authenticated access; obsolete pre-login helpers are closed until a server-side
-- replacement is intentionally introduced.

revoke execute on function public.check_allowed_email(text) from public, anon, authenticated;
revoke execute on function public.check_login_rate_limit(text, integer, integer) from public, anon, authenticated;

revoke execute on function public.fetch_saas_tenant_branding() from public, anon;
grant execute on function public.fetch_saas_tenant_branding() to authenticated;

revoke execute on function public.update_saas_tenant_branding(uuid, text, text, text, text, boolean, text) from public, anon;
grant execute on function public.update_saas_tenant_branding(uuid, text, text, text, text, boolean, text) to authenticated;
