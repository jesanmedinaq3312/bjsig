-- Portal and admin request flows use normalized fields that were missing from
-- the deployed legacy worker_requests table. Nullable columns preserve existing rows.
BEGIN;
ALTER TABLE public.worker_requests
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS subject text,
  ADD COLUMN IF NOT EXISTS message text,
  ADD COLUMN IF NOT EXISTS validity text,
  ADD COLUMN IF NOT EXISTS validity_note text,
  ADD COLUMN IF NOT EXISTS admin_reply text,
  ADD COLUMN IF NOT EXISTS replied_by_email text,
  ADD COLUMN IF NOT EXISTS replied_at timestamptz;
COMMIT;
