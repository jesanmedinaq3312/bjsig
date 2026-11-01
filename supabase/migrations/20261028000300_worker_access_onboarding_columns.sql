-- Keep allowed_emails aligned with provision_worker_access and worker-auth.
-- These additive columns support the worker first-login/password lifecycle.
ALTER TABLE public.allowed_emails
  ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ad_synced boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS password_set_at timestamptz;
