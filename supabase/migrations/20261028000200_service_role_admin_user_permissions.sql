-- Privilegios mínimos para admin-user-manage:
-- lectura de scope/usuarios/trabajadores y gestión de estado de allowed_emails.
GRANT SELECT ON TABLE public.allowed_emails TO service_role;
GRANT UPDATE, DELETE ON TABLE public.allowed_emails TO service_role;
GRANT SELECT ON TABLE public.tenant_memberships TO service_role;
GRANT SELECT ON TABLE public.workers TO service_role;
