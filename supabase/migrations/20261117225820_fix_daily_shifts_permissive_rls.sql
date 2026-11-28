BEGIN;

-- RLS needs a permissive policy for an operation before access can be allowed.
-- The earlier migration added restrictive write guards but no permissive path.
-- Keep those restrictive policies as a second, mandatory authorization layer.
DROP POLICY IF EXISTS attendance_daily_shifts_select_tenant
  ON public.daily_shifts;
CREATE POLICY attendance_daily_shifts_select_tenant
  ON public.daily_shifts
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND (
      CASE COALESCE(public.current_user_role(), 'guest'::text)
        WHEN 'worker' THEN
          NULLIF(
            regexp_replace(upper(COALESCE(worker_rut, '')), '[.[:space:]-]', '', 'g'),
            ''
          ) = NULLIF(
            regexp_replace(
              upper(COALESCE(public.current_worker_rut(), '')),
              '[.[:space:]-]',
              '',
              'g'
            ),
            ''
          )
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
      OR public.attendance_actor_can_write()
    )
  );

DROP POLICY IF EXISTS attendance_daily_shifts_insert_tenant
  ON public.daily_shifts;
CREATE POLICY attendance_daily_shifts_insert_tenant
  ON public.daily_shifts
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.attendance_actor_can_write()
    AND tenant_id = public.current_tenant_id()
  );

DROP POLICY IF EXISTS attendance_daily_shifts_update_tenant
  ON public.daily_shifts;
CREATE POLICY attendance_daily_shifts_update_tenant
  ON public.daily_shifts
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (
    public.attendance_actor_can_write()
    AND tenant_id = public.current_tenant_id()
  )
  WITH CHECK (
    public.attendance_actor_can_write()
    AND tenant_id = public.current_tenant_id()
  );

DROP POLICY IF EXISTS attendance_daily_shifts_delete_tenant
  ON public.daily_shifts;
CREATE POLICY attendance_daily_shifts_delete_tenant
  ON public.daily_shifts
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (
    public.attendance_actor_can_delete()
    AND tenant_id = public.current_tenant_id()
  );

COMMIT;
