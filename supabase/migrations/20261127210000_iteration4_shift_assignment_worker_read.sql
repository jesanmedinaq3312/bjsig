BEGIN;

-- Keep the existing tenant-scoped read policy for operational users, while
-- requiring worker accounts to match their own normalized RUT.
-- RESTRICTIVE composes with all permissive policies already present.
DROP POLICY IF EXISTS iteration4_shift_assignment_worker_read
  ON public.shift_assignments;
CREATE POLICY iteration4_shift_assignment_worker_read
  ON public.shift_assignments
  AS RESTRICTIVE
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND (
      COALESCE(public.current_user_role(), 'guest') <> 'worker'
      OR NULLIF(
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
    )
  );

COMMENT ON POLICY iteration4_shift_assignment_worker_read
  ON public.shift_assignments IS
  'Iteration 4: worker SELECT is tenant-bound and limited to the authenticated worker RUT; non-worker access remains tenant-scoped by the existing permissive policy.';

COMMIT;

-- Rollback (manual; only after confirming no later policy depends on this one):
-- DROP POLICY IF EXISTS iteration4_shift_assignment_worker_read
--   ON public.shift_assignments;
