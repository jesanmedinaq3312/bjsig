-- Grants de tabla requeridos para que PostgREST evalúe las políticas RLS de onboarding.
-- El acceso efectivo sigue limitado a public.is_platform_owner() por las políticas existentes.
revoke all on table public.saas_onboarding_profiles from anon;
revoke all on table public.saas_onboarding_deliveries from anon;
grant select, insert, update, delete on table public.saas_onboarding_profiles to authenticated;
grant select, insert, update, delete on table public.saas_onboarding_deliveries to authenticated;
