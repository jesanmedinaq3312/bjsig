-- Mantiene el acceso operacional dentro del tenant y limita a cada trabajador
-- a las solicitudes asociadas a su propio RUT normalizado.
DROP POLICY IF EXISTS tenant_boundary_worker_requests ON public.worker_requests;

CREATE POLICY tenant_boundary_worker_requests
ON public.worker_requests
FOR ALL
TO authenticated
USING (
  tenant_id = public.current_tenant_id()
  AND CASE coalesce(public.current_user_role(), 'guest')
    WHEN 'worker' THEN
      nullif(regexp_replace(upper(coalesce(worker_rut, '')), '[.[:space:]-]', '', 'g'), '')
      = nullif(regexp_replace(upper(coalesce(public.current_worker_rut(), '')), '[.[:space:]-]', '', 'g'), '')
    WHEN 'company_owner' THEN true
    WHEN 'human_resources' THEN true
    WHEN 'admin' THEN true
    WHEN 'manager' THEN true
    WHEN 'prevencionista' THEN true
    WHEN 'operador' THEN true
    WHEN 'developer' THEN true
    WHEN 'superadmin' THEN true
    ELSE false
  END
)
WITH CHECK (
  tenant_id = public.current_tenant_id()
  AND CASE coalesce(public.current_user_role(), 'guest')
    WHEN 'worker' THEN
      nullif(regexp_replace(upper(coalesce(worker_rut, '')), '[.[:space:]-]', '', 'g'), '')
      = nullif(regexp_replace(upper(coalesce(public.current_worker_rut(), '')), '[.[:space:]-]', '', 'g'), '')
    WHEN 'company_owner' THEN true
    WHEN 'human_resources' THEN true
    WHEN 'admin' THEN true
    WHEN 'manager' THEN true
    WHEN 'prevencionista' THEN true
    WHEN 'operador' THEN true
    WHEN 'developer' THEN true
    WHEN 'superadmin' THEN true
    ELSE false
  END
);
