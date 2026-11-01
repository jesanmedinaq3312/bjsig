-- Table privileges are required in addition to RLS policies. No DELETE grant is given.
-- Row visibility and writes remain constrained by worker_requests RLS policies.
BEGIN;
GRANT SELECT, INSERT, UPDATE ON TABLE public.worker_requests TO authenticated;
COMMIT;
