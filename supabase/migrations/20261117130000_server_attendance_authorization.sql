-- Server-side authorization and integrity checks for attendance records.
-- Captured device time remains auxiliary; server_received_at is the authoritative receipt timestamp.

CREATE OR REPLACE FUNCTION public.attendance_actor_can_write()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_tenant uuid := public.current_tenant_id();
  v_permissions jsonb := '{}'::jsonb;
BEGIN
  IF auth.uid() IS NULL OR v_tenant IS NULL OR coalesce(public.current_user_role(), 'guest') = 'worker' THEN
    RETURN false;
  END IF;
  IF public.is_platform_owner() THEN
    RETURN true;
  END IF;

  SELECT access.permissions
    INTO v_permissions
    FROM public.get_effective_tenant_access(v_tenant) AS access
    LIMIT 1;

  RETURN coalesce((v_permissions ->> 'can_edit_workers')::boolean, false);
EXCEPTION WHEN OTHERS THEN
  -- Fail closed if tenant context or effective permissions cannot be resolved.
  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.attendance_actor_can_delete()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_tenant uuid := public.current_tenant_id();
  v_permissions jsonb := '{}'::jsonb;
BEGIN
  IF auth.uid() IS NULL OR v_tenant IS NULL OR coalesce(public.current_user_role(), 'guest') = 'worker' THEN
    RETURN false;
  END IF;
  IF public.is_platform_owner() THEN
    RETURN true;
  END IF;

  SELECT access.permissions
    INTO v_permissions
    FROM public.get_effective_tenant_access(v_tenant) AS access
    LIMIT 1;

  RETURN coalesce((v_permissions ->> 'can_delete_attendance')::boolean, false)
      OR coalesce((v_permissions ->> 'can_delete_shifts')::boolean, false);
EXCEPTION WHEN OTHERS THEN
  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.attendance_actor_can_write() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.attendance_actor_can_delete() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.attendance_actor_can_write() TO authenticated;
GRANT EXECUTE ON FUNCTION public.attendance_actor_can_delete() TO authenticated;

-- Restrictive policies compose with any older permissive policies and cannot be
-- bypassed by an accidentally broad legacy policy.
ALTER TABLE public.qr_scan_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS attendance_qr_insert_authorized ON public.qr_scan_events;
CREATE POLICY attendance_qr_insert_authorized
  ON public.qr_scan_events AS RESTRICTIVE
  FOR INSERT TO authenticated
  WITH CHECK (
    public.attendance_actor_can_write()
    AND tenant_id = public.current_tenant_id()
  );

ALTER TABLE public.daily_shifts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS attendance_daily_shifts_insert_authorized ON public.daily_shifts;
DROP POLICY IF EXISTS attendance_daily_shifts_update_authorized ON public.daily_shifts;
DROP POLICY IF EXISTS attendance_daily_shifts_delete_authorized ON public.daily_shifts;
CREATE POLICY attendance_daily_shifts_insert_authorized
  ON public.daily_shifts AS RESTRICTIVE
  FOR INSERT TO authenticated
  WITH CHECK (
    public.attendance_actor_can_write()
    AND tenant_id = public.current_tenant_id()
  );
CREATE POLICY attendance_daily_shifts_update_authorized
  ON public.daily_shifts AS RESTRICTIVE
  FOR UPDATE TO authenticated
  USING (
    public.attendance_actor_can_write()
    AND tenant_id = public.current_tenant_id()
  )
  WITH CHECK (
    public.attendance_actor_can_write()
    AND tenant_id = public.current_tenant_id()
  );
CREATE POLICY attendance_daily_shifts_delete_authorized
  ON public.daily_shifts AS RESTRICTIVE
  FOR DELETE TO authenticated
  USING (
    public.attendance_actor_can_delete()
    AND tenant_id = public.current_tenant_id()
  );

-- The previous unique key used server receipt day, so two valid offline marks
-- captured on different days but synced together could conflict. The trigger
-- below serializes and validates the captured-day business key instead.
DROP INDEX IF EXISTS public.qr_scan_events_worker_day_type_uq;
CREATE INDEX IF NOT EXISTS qr_scan_events_capture_dedupe_lookup_idx
  ON public.qr_scan_events (
    tenant_id,
    (regexp_replace(upper(worker_rut), '[.[:space:]-]', '', 'g')),
    (coalesce(captured_scan_date, scan_date)),
    scan_type
  )
  WHERE validated = true;

CREATE OR REPLACE FUNCTION private.validate_qr_attendance_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_worker_rut text;
  v_capture_date date;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    IF NOT public.attendance_actor_can_write() THEN
      RAISE EXCEPTION 'ATTENDANCE_WRITE_NOT_ALLOWED' USING errcode = '42501';
    END IF;
    IF new.tenant_id IS DISTINCT FROM public.current_tenant_id() THEN
      RAISE EXCEPTION 'ATTENDANCE_TENANT_MISMATCH' USING errcode = '42501';
    END IF;
  END IF;

  IF new.scan_type IS NULL OR new.scan_type NOT IN (
    'entrada', 'salida', 'almuerzo_inicio', 'almuerzo_termino', 'terreno_salida', 'terreno_llegada'
  ) THEN
    RAISE EXCEPTION 'INVALID_QR_ATTENDANCE_EVENT_TYPE' USING errcode = '23514';
  END IF;
  IF new.worker_rut IS NULL OR length(trim(new.worker_rut)) = 0 THEN
    RAISE EXCEPTION 'WORKER_REQUIRED' USING errcode = '22023';
  END IF;

  SELECT w.rut
    INTO v_worker_rut
    FROM public.workers AS w
   WHERE w.tenant_id = new.tenant_id
     AND regexp_replace(upper(w.rut), '[.[:space:]-]', '', 'g') =
         regexp_replace(upper(new.worker_rut), '[.[:space:]-]', '', 'g')
     AND coalesce(w.status, 'ACTIVO') <> 'INACTIVO'
     AND coalesce(w.contract_status, 'Vigente') <> 'Desvinculado'
   LIMIT 1;
  IF v_worker_rut IS NULL THEN
    RAISE EXCEPTION 'WORKER_NOT_FOUND_OR_INACTIVE' USING errcode = '22023';
  END IF;
  -- Canonicalize before the sealing trigger computes the immutable hash and
  -- before the captured-day duplicate check runs.
  new.worker_rut := v_worker_rut;
  new.captured_scan_date := coalesce(
    new.captured_scan_date,
    new.scan_date,
    (now() AT TIME ZONE 'America/Santiago')::date
  );
  new.captured_scan_time := coalesce(new.captured_scan_time, new.scan_time);
  v_capture_date := new.captured_scan_date;
  IF v_capture_date > (now() AT TIME ZONE 'America/Santiago')::date THEN
    RAISE EXCEPTION 'CAPTURE_DATE_CANNOT_BE_IN_FUTURE' USING errcode = '22023';
  END IF;

  -- Serialize the captured-day business key so concurrent and offline inserts
  -- cannot create duplicate marks even when their server receipt dates differ.
  PERFORM pg_advisory_xact_lock(hashtext(concat_ws('|',
    'qr_capture', new.tenant_id::text, new.worker_rut, v_capture_date::text, new.scan_type
  )));
  IF EXISTS (
    SELECT 1
      FROM public.qr_scan_events AS prior
     WHERE prior.tenant_id = new.tenant_id
       AND regexp_replace(upper(prior.worker_rut), '[.[:space:]-]', '', 'g') =
           regexp_replace(upper(new.worker_rut), '[.[:space:]-]', '', 'g')
       AND coalesce(prior.captured_scan_date, prior.scan_date) = v_capture_date
       AND prior.scan_type = new.scan_type
       AND prior.validated = true
  ) THEN
    RAISE EXCEPTION 'DUPLICATE_QR_ATTENDANCE_MARK' USING errcode = '23505';
  END IF;

  IF (new.latitude IS NULL) <> (new.longitude IS NULL)
     OR (new.latitude IS NOT NULL AND (new.latitude < -90 OR new.latitude > 90))
     OR (new.longitude IS NOT NULL AND (new.longitude < -180 OR new.longitude > 180))
     OR (new.gps_accuracy IS NOT NULL AND (new.gps_accuracy < 0 OR new.gps_accuracy > 100000)) THEN
    RAISE EXCEPTION 'INVALID_GPS_ATTENDANCE_DATA' USING errcode = '22023';
  END IF;
  new.gps_missing := new.latitude IS NULL;
  new.validated := true;

  IF new.captured_scan_time IS NOT NULL AND length(new.captured_scan_time) > 64 THEN
    RAISE EXCEPTION 'INVALID_CAPTURED_SCAN_TIME' USING errcode = '22023';
  END IF;
  RETURN new;
END;
$$;
REVOKE ALL ON FUNCTION private.validate_qr_attendance_insert() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS attendance_qr_insert_validate ON public.qr_scan_events;
-- Trigger names sort before qr_scan_events_seal, so worker identity is canonical
-- before the seal/hash trigger executes.
CREATE TRIGGER attendance_qr_insert_validate
  BEFORE INSERT ON public.qr_scan_events
  FOR EACH ROW EXECUTE FUNCTION private.validate_qr_attendance_insert();

-- A timestamp is not a stable ordering key inside a multi-row transaction:
-- now() is constant for the transaction and clock_timestamp() can still tie.
-- Existing immutable rows stay untouched and keep their established timestamp/ID order.
ALTER TABLE public.qr_scan_events
  ADD COLUMN IF NOT EXISTS chain_sequence bigint;
CREATE UNIQUE INDEX IF NOT EXISTS qr_scan_events_tenant_chain_sequence_uq
  ON public.qr_scan_events (tenant_id, chain_sequence)
  WHERE row_hash IS NOT NULL AND chain_sequence IS NOT NULL;

CREATE OR REPLACE FUNCTION private.qr_scan_events_seal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_sync record;
  v_prev text;
  v_local timestamp;
  v_sequence bigint;
BEGIN
  new.server_received_at := clock_timestamp();
  v_local := new.server_received_at AT TIME ZONE 'America/Santiago';
  new.scan_date := v_local::date;
  new.scan_time := to_char(v_local, 'HH24:MI:SS');
  new.date := v_local::date;

  SELECT offset_ms, source INTO v_sync
    FROM public.attendance_time_sync
   WHERE error IS NULL
     AND checked_at > new.server_received_at - interval '15 minutes'
   ORDER BY checked_at DESC
   LIMIT 1;
  new.official_offset_ms := v_sync.offset_ms;
  new.time_source := coalesce(v_sync.source, 'SERVER_UNSYNCED');
  new.time_within_tolerance := v_sync.offset_ms IS NOT NULL
    AND abs(v_sync.offset_ms) <= public.attendance_time_tolerance_ms();
  new.receipt_code := upper(encode(extensions.gen_random_bytes(6), 'hex'));

  PERFORM pg_advisory_xact_lock(hashtext('qr_chain:' || coalesce(new.tenant_id::text, '')));
  SELECT coalesce(max(chain_sequence), 0) + 1
    INTO v_sequence
    FROM public.qr_scan_events
   WHERE tenant_id IS NOT DISTINCT FROM new.tenant_id
     AND row_hash IS NOT NULL;
  SELECT row_hash INTO v_prev
    FROM public.qr_scan_events
   WHERE tenant_id IS NOT DISTINCT FROM new.tenant_id
     AND row_hash IS NOT NULL
   ORDER BY chain_sequence DESC NULLS LAST, server_received_at DESC, id DESC
   LIMIT 1;

  new.chain_sequence := v_sequence;
  new.prev_hash := coalesce(v_prev, 'GENESIS');
  new.row_hash := encode(extensions.digest(concat_ws('|', new.prev_hash, new.id, new.tenant_id,
    new.worker_rut, new.scan_type,
    to_char(new.server_received_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US'),
    new.latitude, new.longitude, new.receipt_code), 'sha256'), 'hex');
  RETURN new;
END;
$$;
REVOKE ALL ON FUNCTION private.qr_scan_events_seal() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.verify_attendance_chain()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_tenant uuid := public.current_tenant_id();
  r record;
  v_prev text := 'GENESIS';
  v_bad integer := 0;
  v_total integer := 0;
  v_first uuid;
BEGIN
  IF NOT (public.is_admin() OR public.is_dt_inspector()
      OR public.current_user_role() IN ('company_owner', 'human_resources')) THEN
    RAISE EXCEPTION 'Not allowed' USING errcode = '42501';
  END IF;

  FOR r IN
    SELECT * FROM public.qr_scan_events
     WHERE tenant_id = v_tenant AND row_hash IS NOT NULL
     ORDER BY chain_sequence NULLS FIRST, server_received_at, id
  LOOP
    v_total := v_total + 1;
    IF r.prev_hash IS DISTINCT FROM v_prev
       OR r.row_hash IS DISTINCT FROM encode(extensions.digest(concat_ws('|', r.prev_hash,
         r.id, r.tenant_id, r.worker_rut, r.scan_type,
         to_char(r.server_received_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US'),
         r.latitude, r.longitude, r.receipt_code), 'sha256'), 'hex') THEN
      v_bad := v_bad + 1;
      v_first := coalesce(v_first, r.id);
    END IF;
    v_prev := r.row_hash;
  END LOOP;
  RETURN jsonb_build_object('total', v_total, 'alteradas', v_bad,
    'primera_alterada', v_first, 'integra', v_bad = 0);
END;
$$;
REVOKE ALL ON FUNCTION public.verify_attendance_chain() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.verify_attendance_chain() TO authenticated;

CREATE OR REPLACE FUNCTION private.validate_daily_shift_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_worker_rut text;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    IF NOT public.attendance_actor_can_write() THEN
      RAISE EXCEPTION 'ATTENDANCE_WRITE_NOT_ALLOWED' USING errcode = '42501';
    END IF;
    IF new.tenant_id IS DISTINCT FROM public.current_tenant_id() THEN
      RAISE EXCEPTION 'ATTENDANCE_TENANT_MISMATCH' USING errcode = '42501';
    END IF;
  END IF;

  IF new.attendance_status IS NULL OR new.attendance_status NOT IN
     ('Presente', 'Ausente', 'Licencia', 'Permiso', 'Descanso') THEN
    RAISE EXCEPTION 'INVALID_ATTENDANCE_STATUS' USING errcode = '23514';
  END IF;
  IF new.calculated_hht IS NULL OR new.calculated_hht < 0 OR new.calculated_hht > 24 THEN
    RAISE EXCEPTION 'INVALID_ATTENDANCE_HOURS' USING errcode = '23514';
  END IF;
  IF new.worker_rut IS NULL OR new.date IS NULL THEN
    RAISE EXCEPTION 'WORKER_AND_DATE_REQUIRED' USING errcode = '22023';
  END IF;

  SELECT w.rut INTO v_worker_rut
    FROM public.workers AS w
   WHERE w.tenant_id = new.tenant_id
     AND regexp_replace(upper(w.rut), '[.[:space:]-]', '', 'g') =
         regexp_replace(upper(new.worker_rut), '[.[:space:]-]', '', 'g')
   LIMIT 1;
  IF v_worker_rut IS NULL THEN
    RAISE EXCEPTION 'WORKER_NOT_FOUND_IN_TENANT' USING errcode = '22023';
  END IF;
  new.worker_rut := v_worker_rut;
  RETURN new;
END;
$$;
REVOKE ALL ON FUNCTION private.validate_daily_shift_write() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS attendance_daily_shift_validate ON public.daily_shifts;
CREATE TRIGGER attendance_daily_shift_validate
  BEFORE INSERT OR UPDATE ON public.daily_shifts
  FOR EACH ROW EXECUTE FUNCTION private.validate_daily_shift_write();

-- Session-based summary. Only a subsequent 'salida' closes a work interval;
-- breaks are paired in-order and overnight intervals belong to their entry date.
CREATE OR REPLACE FUNCTION public.attendance_summary(_tenant uuid, _rut text, _start date, _end date)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
WITH marks AS (
  SELECT q.id, q.scan_type, q.server_received_at,
         (q.server_received_at AT TIME ZONE 'America/Santiago')::date AS local_date
    FROM public.qr_scan_events AS q
   WHERE q.tenant_id = _tenant
     AND regexp_replace(upper(q.worker_rut), '[.[:space:]-]', '', 'g') =
         regexp_replace(upper(_rut), '[.[:space:]-]', '', 'g')
     AND q.server_received_at IS NOT NULL
     AND q.scan_date BETWEEN (_start - 1) AND (_end + 1)
), entries AS (
  SELECT e.id, e.local_date AS work_date, e.server_received_at AS started_at
   FROM marks AS e
   WHERE e.scan_type = 'entrada'
     AND e.local_date BETWEEN (_start - 1) AND _end
), sessions AS (
  SELECT e.work_date, e.started_at,
         exit_mark.ended_at,
         coalesce(breaks.pause_seconds, 0)::numeric AS pause_seconds,
         CASE
           WHEN exit_mark.ended_at IS NULL OR exit_mark.ended_at > e.started_at + interval '24 hours' THEN 0::numeric
           ELSE greatest(extract(epoch FROM (exit_mark.ended_at - e.started_at))::numeric - coalesce(breaks.pause_seconds, 0), 0::numeric)
         END AS worked_seconds,
         (exit_mark.ended_at IS NULL OR exit_mark.ended_at > e.started_at + interval '24 hours') AS incomplete
    FROM entries AS e
    LEFT JOIN LATERAL (
      SELECT min(x.server_received_at) AS ended_at
        FROM marks AS x
       WHERE x.scan_type = 'salida'
         AND x.server_received_at > e.started_at
         AND NOT EXISTS (
           SELECT 1 FROM marks AS next_entry
            WHERE next_entry.scan_type = 'entrada'
              AND next_entry.server_received_at > e.started_at
              AND next_entry.server_received_at < x.server_received_at
         )
    ) AS exit_mark ON true
    LEFT JOIN LATERAL (
      SELECT sum(extract(epoch FROM (pause_end.ended_at - pause_start.server_received_at))::numeric) AS pause_seconds
        FROM marks AS pause_start
        JOIN LATERAL (
          SELECT min(p.server_received_at) AS ended_at
            FROM marks AS p
           WHERE p.scan_type = 'almuerzo_termino'
             AND p.server_received_at > pause_start.server_received_at
             AND p.server_received_at < exit_mark.ended_at
             AND NOT EXISTS (
               SELECT 1 FROM marks AS next_pause
                WHERE next_pause.scan_type = 'almuerzo_inicio'
                  AND next_pause.server_received_at > pause_start.server_received_at
                  AND next_pause.server_received_at < p.server_received_at
             )
        ) AS pause_end ON pause_end.ended_at IS NOT NULL
       WHERE pause_start.scan_type = 'almuerzo_inicio'
         AND pause_start.server_received_at > e.started_at
         AND pause_start.server_received_at < exit_mark.ended_at
    ) AS breaks ON true
), session_days AS (
  SELECT work_date,
         count(*) AS session_count,
         count(*) FILTER (WHERE incomplete) AS incomplete_sessions,
         min(started_at) AS first_entry,
         max(ended_at) AS last_exit,
         sum(pause_seconds) AS pause_seconds,
         sum(worked_seconds) AS worked_seconds
    FROM sessions
   GROUP BY work_date
), mark_days AS (
  SELECT local_date AS work_date,
         count(*) AS marks,
         min(server_received_at) FILTER (WHERE scan_type = 'entrada') AS first_entry,
         max(server_received_at) FILTER (WHERE scan_type = 'salida') AS last_exit
    FROM marks
   WHERE local_date BETWEEN _start AND _end
   GROUP BY local_date
), paired_exit_days AS (
  SELECT (ended_at AT TIME ZONE 'America/Santiago')::date AS work_date,
         count(*) AS paired_exits
    FROM sessions
   WHERE ended_at IS NOT NULL
     AND (ended_at AT TIME ZONE 'America/Santiago')::date BETWEEN _start AND _end
   GROUP BY (ended_at AT TIME ZONE 'America/Santiago')::date
), date_keys AS (
  SELECT work_date FROM mark_days
  UNION
  SELECT work_date FROM session_days WHERE work_date BETWEEN _start AND _end
), details AS (
  SELECT d.work_date,
         coalesce(md.marks, 0) AS marks,
         coalesce(sd.first_entry, md.first_entry) AS first_entry,
         coalesce(sd.last_exit, md.last_exit) AS last_exit,
         coalesce(sd.pause_seconds, 0) AS pause_seconds,
         coalesce(sd.worked_seconds, 0) AS worked_seconds,
         coalesce(sd.incomplete_sessions, 0) > 0
           OR (md.marks > 0 AND sd.session_count IS NULL
               AND md.first_entry IS NULL AND coalesce(ped.paired_exits, 0) = 0) AS incomplete
    FROM date_keys AS d
    LEFT JOIN mark_days AS md USING (work_date)
    LEFT JOIN session_days AS sd USING (work_date)
    LEFT JOIN paired_exit_days AS ped USING (work_date)
)
SELECT jsonb_build_object(
  'dias_con_marca', (SELECT count(*) FROM mark_days),
  'marcas', (SELECT coalesce(sum(marks), 0) FROM mark_days),
  'horas_trabajadas', round((
    SELECT coalesce(sum(worked_seconds), 0) FROM session_days
     WHERE work_date BETWEEN _start AND _end
  ) / 3600.0, 2),
  'dias_incompletos', (SELECT count(*) FROM details WHERE incomplete),
  'detalle', coalesce((
    SELECT jsonb_agg(jsonb_build_object(
      'fecha', work_date,
      'entrada', first_entry,
      'salida', last_exit,
      'pausa_segundos', pause_seconds,
      'marcas', marks,
      'segundos_trabajados', worked_seconds,
      'incompleto', incomplete
    ) ORDER BY work_date)
    FROM details
  ), '[]'::jsonb)
)
$$;
REVOKE ALL ON FUNCTION public.attendance_summary(uuid, text, date, date) FROM PUBLIC, anon, authenticated;
