-- Iteración 2: autorización interna y tenant/RUT boundary para el resumen de asistencia.
-- La función privada conserva el cálculo; el wrapper público es la única entrada autorizada.

CREATE OR REPLACE FUNCTION public.attendance_summary_authorized(
  _tenant uuid,
  _rut text
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_access record;
  v_email text := public.current_user_email();
  v_is_superadmin boolean;
  v_is_developer boolean;
  v_requested_rut text := NULLIF(regexp_replace(upper(coalesce(_rut, '')), '[.[:space:]-]', '', 'g'), '');
  v_worker_rut text := NULLIF(regexp_replace(upper(coalesce(public.current_worker_rut(), '')), '[.[:space:]-]', '', 'g'), '');
BEGIN
  IF auth.uid() IS NULL OR _tenant IS NULL THEN
    RETURN false;
  END IF;
  IF v_requested_rut IS NULL THEN
    RETURN false;
  END IF;

  SELECT access.*
    INTO v_access
    FROM public.get_effective_tenant_access(_tenant) AS access
   LIMIT 1;

  IF v_access.tenant_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.allowed_emails a
     WHERE lower(a.email) = v_email AND a.active AND a.role = 'superadmin'
  ) OR EXISTS (
    SELECT 1 FROM public.tenant_memberships m
     WHERE lower(m.user_email) = v_email AND m.active AND m.role = 'superadmin'
  ) INTO v_is_superadmin;
  SELECT EXISTS (
    SELECT 1 FROM public.allowed_emails a
     WHERE lower(a.email) = v_email AND a.active AND a.role = 'developer'
  ) OR EXISTS (
    SELECT 1 FROM public.tenant_memberships m
     WHERE lower(m.user_email) = v_email AND m.active AND m.role = 'developer'
  ) INTO v_is_developer;

  IF v_is_superadmin THEN
    RETURN true;
  END IF;
  IF v_is_developer THEN
    RETURN EXISTS (
      SELECT 1 FROM public.tenant_memberships m
       WHERE lower(m.user_email) = v_email
         AND m.tenant_id = _tenant AND m.active AND m.role = 'developer'
    ) OR EXISTS (
      SELECT 1 FROM public.allowed_emails a
       WHERE lower(a.email) = v_email
         AND a.tenant_id = _tenant AND a.active AND a.role = 'developer'
    );
  END IF;

  IF public.current_tenant_id() IS DISTINCT FROM _tenant THEN
    RETURN false;
  END IF;

  IF v_access.role = 'worker' THEN
    RETURN v_worker_rut IS NOT NULL AND v_worker_rut = v_requested_rut;
  END IF;

  -- Match the existing attendance_reports policy and use the effective role,
  -- not the client-provided tenant or role. Explicit permissions can extend
  -- access later without weakening the tenant boundary.
  RETURN v_access.role IN (
    'developer', 'superadmin', 'admin', 'manager', 'prevencionista',
    'company_owner', 'human_resources'
  )
  OR coalesce((v_access.permissions ->> 'can_view_attendance')::boolean, false)
  OR coalesce((v_access.permissions ->> 'can_view_attendance_reports')::boolean, false);
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.attendance_summary_authorized(uuid, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.attendance_summary_unchecked(_tenant uuid, _rut text, _start date, _end date)
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
REVOKE ALL ON FUNCTION private.attendance_summary_unchecked(uuid, text, date, date) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.attendance_summary(_tenant uuid, _rut text, _start date, _end date)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF _start IS NULL OR _end IS NULL OR _start > _end THEN
    RAISE EXCEPTION 'ATTENDANCE_RANGE_INVALID' USING errcode = '22023';
  END IF;
  IF NOT public.attendance_summary_authorized(_tenant, _rut) THEN
    RAISE EXCEPTION 'ATTENDANCE_SUMMARY_NOT_ALLOWED' USING errcode = '42501';
  END IF;
  RETURN private.attendance_summary_unchecked(_tenant, _rut, _start, _end);
END;
$$;

REVOKE ALL ON FUNCTION public.attendance_summary(uuid, text, date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.attendance_summary(uuid, text, date, date) TO authenticated;
