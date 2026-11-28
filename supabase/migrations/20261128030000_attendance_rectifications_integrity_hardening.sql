-- Harden the existing attendance_rectifications contract without rewriting the
-- historical migration that first created the table and response RPC.
-- This migration is intentionally fail-closed if existing rows violate the
-- new invariants; remediate those rows through an approved, auditable process.
BEGIN;

-- These helpers are referenced by the base policies and response RPC. Fail
-- early instead of applying a partial hardening migration if either helper or
-- the permissions needed by authenticated policies are missing.
DO $preflight$
BEGIN
  IF pg_catalog.to_regprocedure('public.current_tenant_id()') IS NULL THEN
    RAISE EXCEPTION 'Required helper public.current_tenant_id() is missing';
  END IF;
  IF pg_catalog.to_regprocedure('public.current_worker_rut()') IS NULL THEN
    RAISE EXCEPTION 'Required helper public.current_worker_rut() is missing';
  END IF;
  IF pg_catalog.to_regprocedure('public.current_user_email()') IS NULL THEN
    RAISE EXCEPTION 'Required helper public.current_user_email() is missing';
  END IF;
  IF NOT pg_catalog.has_function_privilege('authenticated', 'public.current_tenant_id()', 'EXECUTE') THEN
    RAISE EXCEPTION 'Role authenticated cannot execute public.current_tenant_id()';
  END IF;
  IF NOT pg_catalog.has_function_privilege('authenticated', 'public.current_worker_rut()', 'EXECUTE') THEN
    RAISE EXCEPTION 'Role authenticated cannot execute public.current_worker_rut()';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.attendance_rectifications AS r
    WHERE NULLIF(
      pg_catalog.regexp_replace(pg_catalog.upper(pg_catalog.btrim(r.worker_rut)), '[.[:space:]-]', '', 'g'),
      ''
    ) IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot harden attendance_rectifications: existing worker_rut values normalize to empty';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.attendance_rectifications AS r
    JOIN public.qr_scan_events AS q ON q.id = r.scan_event_id
    WHERE r.scan_event_id IS NOT NULL
      AND (
        r.tenant_id IS DISTINCT FROM q.tenant_id
        OR NULLIF(
          pg_catalog.regexp_replace(pg_catalog.upper(pg_catalog.btrim(r.worker_rut)), '[.[:space:]-]', '', 'g'),
          ''
        ) IS DISTINCT FROM NULLIF(
          pg_catalog.regexp_replace(pg_catalog.upper(pg_catalog.btrim(q.worker_rut)), '[.[:space:]-]', '', 'g'),
          ''
        )
      )
  ) THEN
    RAISE EXCEPTION 'Cannot harden attendance_rectifications: existing scan_event_id links cross tenant or worker scope';
  END IF;
END;
$preflight$;

DO $constraint$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint AS c
    WHERE c.conrelid = 'public.attendance_rectifications'::pg_catalog.regclass
      AND c.conname = 'attendance_rectifications_worker_rut_nonempty_check'
  ) THEN
    ALTER TABLE public.attendance_rectifications
      ADD CONSTRAINT attendance_rectifications_worker_rut_nonempty_check
      CHECK (
        NULLIF(
          pg_catalog.regexp_replace(pg_catalog.upper(pg_catalog.btrim(worker_rut)), '[.[:space:]-]', '', 'g'),
          ''
        ) IS NOT NULL
      ) NOT VALID;
  END IF;
END;
$constraint$;

ALTER TABLE public.attendance_rectifications
  VALIDATE CONSTRAINT attendance_rectifications_worker_rut_nonempty_check;

-- A linked QR event must belong to the same tenant and normalized worker RUT.
-- This narrowly-scoped trigger function uses its owner to check the referenced
-- row even when caller RLS cannot see it; it returns no row data and reports
-- the same error for a missing or mismatched event.
CREATE OR REPLACE FUNCTION private.validate_attendance_rectification_scan_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  v_event_tenant_id uuid;
  v_event_worker_rut text;
  v_new_worker_rut text;
  v_event_worker_rut_normalized text;
BEGIN
  IF NEW.scan_event_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT q.tenant_id, q.worker_rut
    INTO v_event_tenant_id, v_event_worker_rut
    FROM public.qr_scan_events AS q
    WHERE q.id = NEW.scan_event_id;

  v_new_worker_rut := NULLIF(
    pg_catalog.regexp_replace(pg_catalog.upper(pg_catalog.btrim(NEW.worker_rut)), '[.[:space:]-]', '', 'g'),
    ''
  );
  v_event_worker_rut_normalized := NULLIF(
    pg_catalog.regexp_replace(pg_catalog.upper(pg_catalog.btrim(v_event_worker_rut)), '[.[:space:]-]', '', 'g'),
    ''
  );

  IF NOT FOUND
    OR NEW.tenant_id IS DISTINCT FROM v_event_tenant_id
    OR v_new_worker_rut IS NULL
    OR v_event_worker_rut_normalized IS NULL
    OR v_new_worker_rut IS DISTINCT FROM v_event_worker_rut_normalized THEN
    RAISE EXCEPTION 'scan_event_id does not match the tenant and worker on this rectification'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.validate_attendance_rectification_scan_event() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS attendance_rectifications_check_scan_event ON public.attendance_rectifications;
CREATE TRIGGER attendance_rectifications_check_scan_event
  BEFORE INSERT OR UPDATE ON public.attendance_rectifications
  FOR EACH ROW
  EXECUTE FUNCTION private.validate_attendance_rectification_scan_event();

-- Preserve the original insert hash format for compatibility with existing
-- rows, but make every proposal field immutable after insertion. Only the
-- one-time worker response fields may change, and only through the RPC below.
CREATE OR REPLACE FUNCTION private.rectification_seal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  v_prev text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.status := 'pendiente';
    NEW.worker_response_at := NULL;
    NEW.worker_comment := NULL;
    NEW.worker_ip := NULL;
    NEW.response_hash := NULL;
    NEW.requested_by := public.current_user_email();
    NEW.created_at := pg_catalog.now();

    PERFORM pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtext('rect_chain:' || NEW.tenant_id::text)
    );
    SELECT r.row_hash
      INTO v_prev
      FROM public.attendance_rectifications AS r
      WHERE r.tenant_id = NEW.tenant_id
      ORDER BY r.created_at DESC, r.id DESC
      LIMIT 1;

    NEW.prev_hash := COALESCE(v_prev, 'GENESIS');
    NEW.row_hash := pg_catalog.encode(
      extensions.digest(
        pg_catalog.concat_ws(
          '|', NEW.prev_hash, NEW.id, NEW.tenant_id, NEW.scan_event_id, NEW.worker_rut,
          NEW.proposed_scan_type, NEW.proposed_at, NEW.reason, NEW.requested_by, NEW.created_at
        ),
        'sha256'
      ),
      'hex'
    );
    RETURN NEW;
  END IF;

  IF OLD.status IS DISTINCT FROM 'pendiente'
    OR pg_catalog.current_setting('bjsig.rect_response', true) IS DISTINCT FROM 'on'
    OR NEW.id IS DISTINCT FROM OLD.id
    OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
    OR NEW.scan_event_id IS DISTINCT FROM OLD.scan_event_id
    OR NEW.worker_rut IS DISTINCT FROM OLD.worker_rut
    OR NEW.proposed_scan_type IS DISTINCT FROM OLD.proposed_scan_type
    OR NEW.proposed_at IS DISTINCT FROM OLD.proposed_at
    OR NEW.reason IS DISTINCT FROM OLD.reason
    OR NEW.requested_by IS DISTINCT FROM OLD.requested_by
    OR NEW.prev_hash IS DISTINCT FROM OLD.prev_hash
    OR NEW.row_hash IS DISTINCT FROM OLD.row_hash
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
    OR OLD.worker_response_at IS NOT NULL
    OR OLD.response_hash IS NOT NULL
    OR (NEW.status IS DISTINCT FROM 'aceptada' AND NEW.status IS DISTINCT FROM 'rechazada')
    OR NEW.worker_response_at IS NULL
    OR NEW.response_hash IS NULL
    OR (NEW.worker_comment IS NOT NULL AND pg_catalog.length(NEW.worker_comment) > 1000)
    OR NEW.worker_ip IS NOT NULL THEN
    RAISE EXCEPTION 'Rectifications are immutable except for one recorded worker response'
      USING ERRCODE = '55000';
  END IF;

  RETURN NEW;
END;
$function$;

-- Null-safe tenant/RUT checks prevent missing identity claims from becoming a
-- SQL UNKNOWN that accidentally passes a PL/pgSQL IF condition. _ip remains in
-- the signature for call compatibility but is intentionally ignored: a client
-- supplied IP is not trusted evidence.
CREATE OR REPLACE FUNCTION public.respond_attendance_rectification(
  _id uuid,
  _accept boolean,
  _comment text DEFAULT NULL,
  _ip text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  r public.attendance_rectifications;
  v_tenant_id uuid;
  v_worker_rut text;
  v_comment text;
  v_response_at timestamptz;
BEGIN
  IF auth.uid() IS NULL OR _accept IS NULL THEN
    RAISE EXCEPTION 'An authenticated worker response is required'
      USING ERRCODE = '42501';
  END IF;

  v_tenant_id := public.current_tenant_id();
  v_worker_rut := NULLIF(
    pg_catalog.regexp_replace(
      pg_catalog.upper(pg_catalog.btrim(COALESCE(public.current_worker_rut(), ''))),
      '[.[:space:]-]',
      '',
      'g'
    ),
    ''
  );

  IF v_tenant_id IS NULL OR v_worker_rut IS NULL THEN
    RAISE EXCEPTION 'Not allowed' USING ERRCODE = '42501';
  END IF;

  SELECT rectification.*
    INTO r
    FROM public.attendance_rectifications AS rectification
    WHERE rectification.id = _id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Not allowed' USING ERRCODE = '42501';
  END IF;

  IF r.tenant_id IS DISTINCT FROM v_tenant_id
    OR NULLIF(
      pg_catalog.regexp_replace(pg_catalog.upper(pg_catalog.btrim(r.worker_rut)), '[.[:space:]-]', '', 'g'),
      ''
    ) IS DISTINCT FROM v_worker_rut THEN
    RAISE EXCEPTION 'Not allowed' USING ERRCODE = '42501';
  END IF;

  IF r.status IS DISTINCT FROM 'pendiente' THEN
    RAISE EXCEPTION 'Already answered' USING ERRCODE = '55000';
  END IF;

  v_comment := pg_catalog.left(_comment, 1000);
  v_response_at := pg_catalog.clock_timestamp();
  PERFORM pg_catalog.set_config('bjsig.rect_response', 'on', true);

  UPDATE public.attendance_rectifications
    SET status = CASE WHEN _accept THEN 'aceptada' ELSE 'rechazada' END,
        worker_response_at = v_response_at,
        worker_comment = v_comment,
        worker_ip = NULL,
        response_hash = pg_catalog.encode(
          extensions.digest(
            pg_catalog.concat_ws('|', r.row_hash, _accept, v_response_at, v_comment),
            'sha256'
          ),
          'hex'
        )
    WHERE id = _id;
END;
$function$;

REVOKE ALL ON FUNCTION public.respond_attendance_rectification(uuid, boolean, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.respond_attendance_rectification(uuid, boolean, text, text) TO authenticated;
COMMENT ON FUNCTION public.respond_attendance_rectification(uuid, boolean, text, text) IS
  'Records the authenticated worker response once, scoped by active tenant and normalized RUT. The legacy _ip argument is ignored; caller-supplied IP is not trusted.';

COMMIT;
