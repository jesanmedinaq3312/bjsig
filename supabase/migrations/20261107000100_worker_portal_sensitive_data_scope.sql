BEGIN;

-- A worker may read/write only their own bank account. Company owners, HR,
-- admins and platform operators retain tenant-scoped management access.
-- This restrictive policy composes with the existing tenant-boundary policy.
DROP POLICY IF EXISTS worker_bank_accounts_sensitive_access
  ON public.worker_bank_accounts;
CREATE POLICY worker_bank_accounts_sensitive_access
  ON public.worker_bank_accounts
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND (
      (
        public.current_user_role() = 'worker'
        AND NULLIF(
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
      OR public.current_user_role() IN (
        'company_owner',
        'human_resources',
        'admin',
        'superadmin',
        'developer'
      )
    )
  )
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND (
      (
        public.current_user_role() = 'worker'
        AND NULLIF(
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
      OR public.current_user_role() IN (
        'company_owner',
        'human_resources',
        'admin',
        'superadmin',
        'developer'
      )
    )
  );

-- Workers can see/acknowledge only their own receipt rows; non-worker roles
-- retain the current tenant-scoped access used by the communications admin UI.
DROP POLICY IF EXISTS tenant_boundary_circular_acknowledgments
  ON public.circular_acknowledgments;
CREATE POLICY tenant_boundary_circular_acknowledgments
  ON public.circular_acknowledgments
  AS PERMISSIVE
  FOR ALL
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
  )
  WITH CHECK (
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

-- The portal upserts bank accounts by tenant, worker and account number.
-- Replace the legacy global key with a tenant-aware key.
CREATE UNIQUE INDEX IF NOT EXISTS uq_worker_bank_accounts_tenant_worker_account
  ON public.worker_bank_accounts (tenant_id, worker_rut, account_number);
DROP INDEX IF EXISTS public.uq_worker_bank_accounts_worker_account;

-- Make circular acknowledgements idempotent and align with the portal's upsert.
CREATE UNIQUE INDEX IF NOT EXISTS uq_circular_acknowledgments_tenant_circular_worker
  ON public.circular_acknowledgments (tenant_id, circular_id, worker_rut);

COMMIT;
