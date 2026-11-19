-- Iteración 4: contrato Dev Team-only para administración, portal propio para workers.
--
-- Decisión de producto adoptada en esta iteración:
-- * Dev Team (superadmin/developer con alcance) administra y puede previsualizar
--   el portal dentro de tenants permitidos.
-- * Roles operativos del tenant acceden sólo al tenant activo y según sus
--   permisos existentes.
-- * Un worker conserva el autoservicio del portal, pero únicamente para su
--   propio RUT y tenant. No obtiene navegación ni permisos administrativos.
--
-- Esta migración agrega políticas RESTRICTIVE para componer con las políticas
-- históricas sin convertir la UI en una frontera de seguridad. No aplicar en
-- BJSIG compartido hasta revisar catálogo, mostrar este SQL y aprobar rollback.

BEGIN;

CREATE OR REPLACE FUNCTION public.worker_portal_access_allowed(
  _tenant_id uuid,
  _worker_rut text,
  _operation text DEFAULT 'read'
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND _tenant_id IS NOT NULL
    AND _tenant_id = public.current_tenant_id()
    AND lower(coalesce(_operation, 'read')) IN ('read', 'insert', 'update')
    AND (
      -- Dev Team: la función de plataforma y current_tenant_id() siguen
      -- siendo la frontera; no se acepta un tenant enviado sin resolver.
      public.is_platform_owner()
      OR lower(coalesce(public.current_user_role(), 'guest')) IN (
        'company_owner',
        'admin',
        'human_resources',
        'manager',
        'prevencionista',
        'operador'
      )
      OR (
        lower(coalesce(public.current_user_role(), 'guest')) = 'worker'
        AND nullif(regexp_replace(upper(coalesce(_worker_rut, '')), '[.[:space:]-]', '', 'g'), '')
          = nullif(regexp_replace(upper(coalesce(public.current_worker_rut(), '')), '[.[:space:]-]', '', 'g'), '')
      )
    );
$$;

COMMENT ON FUNCTION public.worker_portal_access_allowed(uuid, text, text) IS
  'Iteration 4: tenant-bound worker portal authorization. Platform roles and operational tenant roles are tenant-scoped; workers are limited to their own normalized RUT. Does not grant admin navigation.';

REVOKE ALL ON FUNCTION public.worker_portal_access_allowed(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.worker_portal_access_allowed(uuid, text, text) TO authenticated;

-- RPC explícita para que Edge Functions y pruebas puedan consultar la misma
-- decisión sin replicar reglas en el cliente. Devuelve sólo una decisión booleana.
CREATE OR REPLACE FUNCTION public.authorize_worker_portal(
  _tenant_id uuid,
  _worker_rut text,
  _operation text DEFAULT 'read'
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT public.worker_portal_access_allowed(_tenant_id, _worker_rut, _operation);
$$;

COMMENT ON FUNCTION public.authorize_worker_portal(uuid, text, text) IS
  'Iteration 4 authorization contract: returns only whether the current authenticated actor may access the requested worker portal scope.';

REVOKE ALL ON FUNCTION public.authorize_worker_portal(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.authorize_worker_portal(uuid, text, text) TO authenticated;

-- These policies are restrictive on purpose. They compose with permissive
-- historical policies and force the tenant/RUT boundary even if a legacy
-- policy is broader than the current contract.
DROP POLICY IF EXISTS iteration4_worker_portal_boundary ON public.worker_requests;
CREATE POLICY iteration4_worker_portal_boundary
  ON public.worker_requests
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (public.worker_portal_access_allowed(tenant_id, worker_rut, 'read'))
  WITH CHECK (public.worker_portal_access_allowed(tenant_id, worker_rut, 'insert'));

DROP POLICY IF EXISTS iteration4_qr_scan_portal_boundary ON public.qr_scan_events;
CREATE POLICY iteration4_qr_scan_portal_boundary
  ON public.qr_scan_events
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (public.worker_portal_access_allowed(tenant_id, worker_rut, 'read'))
  WITH CHECK (public.worker_portal_access_allowed(tenant_id, worker_rut, 'insert'));

DROP POLICY IF EXISTS iteration4_attendance_rectification_boundary ON public.attendance_rectifications;
CREATE POLICY iteration4_attendance_rectification_boundary
  ON public.attendance_rectifications
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (public.worker_portal_access_allowed(tenant_id, worker_rut, 'read'))
  WITH CHECK (public.worker_portal_access_allowed(tenant_id, worker_rut, 'insert'));

DROP POLICY IF EXISTS iteration4_attendance_report_boundary ON public.attendance_reports;
CREATE POLICY iteration4_attendance_report_boundary
  ON public.attendance_reports
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (public.worker_portal_access_allowed(tenant_id, worker_rut, 'read'))
  WITH CHECK (public.worker_portal_access_allowed(tenant_id, worker_rut, 'update'));

COMMIT;

-- Rollback conceptual (execute only after catalog review):
-- DROP POLICY IF EXISTS iteration4_worker_portal_boundary ON public.worker_requests;
-- DROP POLICY IF EXISTS iteration4_qr_scan_portal_boundary ON public.qr_scan_events;
-- DROP POLICY IF EXISTS iteration4_attendance_rectification_boundary ON public.attendance_rectifications;
-- DROP POLICY IF EXISTS iteration4_attendance_report_boundary ON public.attendance_reports;
-- DROP FUNCTION IF EXISTS public.authorize_worker_portal(uuid, text, text);
-- DROP FUNCTION IF EXISTS public.worker_portal_access_allowed(uuid, text, text);
