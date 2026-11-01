-- Mantiene lectura/escritura de QR dentro del tenant y limita worker-only a sus propios registros.
-- Los roles administrativos reconocidos conservan acceso a todos los registros de su tenant.
DROP POLICY IF EXISTS tenant_boundary_qr_scan_events ON public.qr_scan_events;

CREATE POLICY tenant_boundary_qr_scan_events
  ON public.qr_scan_events
  FOR ALL
  TO authenticated
  USING (
    tenant_id = current_tenant_id()
    AND CASE COALESCE(current_user_role(), 'guest'::text)
      WHEN 'worker' THEN
        NULLIF(regexp_replace(upper(COALESCE(worker_rut, '')), '[.[:space:]-]', '', 'g'), '')
        = NULLIF(regexp_replace(upper(COALESCE(current_worker_rut(), '')), '[.[:space:]-]', '', 'g'), '')
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
    tenant_id = current_tenant_id()
    AND CASE COALESCE(current_user_role(), 'guest'::text)
      WHEN 'worker' THEN
        NULLIF(regexp_replace(upper(COALESCE(worker_rut, '')), '[.[:space:]-]', '', 'g'), '')
        = NULLIF(regexp_replace(upper(COALESCE(current_worker_rut(), '')), '[.[:space:]-]', '', 'g'), '')
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

GRANT SELECT, INSERT, UPDATE ON TABLE public.qr_scan_events TO authenticated;
