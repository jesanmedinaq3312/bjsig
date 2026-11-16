-- Remediación de integridad de asistencia QR.
-- La hora oficial de recepción permanece separada de la captura del dispositivo.
ALTER TABLE public.qr_scan_events
  ADD COLUMN IF NOT EXISTS captured_scan_date date,
  ADD COLUMN IF NOT EXISTS captured_scan_time text;

ALTER TABLE public.qr_scan_events
  DROP CONSTRAINT IF EXISTS qr_scan_events_scan_type_check;
ALTER TABLE public.qr_scan_events
  ADD CONSTRAINT qr_scan_events_scan_type_check
  CHECK (scan_type IN ('entrada', 'salida', 'almuerzo_inicio', 'almuerzo_termino', 'terreno_salida', 'terreno_llegada'));

-- La limpieza de duplicados históricos debe ejecutarse antes de aplicar esta migración
-- en una base que ya contenga colisiones.
CREATE UNIQUE INDEX IF NOT EXISTS qr_scan_events_idempotency_key_uq
  ON public.qr_scan_events (tenant_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS qr_scan_events_worker_day_type_uq
  ON public.qr_scan_events (tenant_id, worker_rut, scan_date, scan_type)
  WHERE validated = true AND scan_date IS NOT NULL AND scan_type IS NOT NULL;

CREATE OR REPLACE FUNCTION private.qr_scan_events_seal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_sync record;
  v_prev text;
  v_local timestamp;
BEGIN
  IF new.scan_type IS NULL OR new.scan_type NOT IN ('entrada', 'salida', 'almuerzo_inicio', 'almuerzo_termino', 'terreno_salida', 'terreno_llegada') THEN
    RAISE EXCEPTION 'Invalid QR attendance event type' USING errcode = '23514';
  END IF;
  -- Captura declarada por el dispositivo: evidencia auxiliar, no reemplaza el sello oficial.
  new.captured_scan_date := coalesce(new.captured_scan_date, new.scan_date);
  new.captured_scan_time := coalesce(new.captured_scan_time, new.scan_time);
  new.server_received_at := now();
  v_local := now() at time zone 'America/Santiago';
  new.scan_date := v_local::date;
  new.scan_time := to_char(v_local, 'HH24:MI:SS');
  new.date := v_local::date;
  SELECT offset_ms, source INTO v_sync FROM public.attendance_time_sync
    WHERE error IS NULL AND checked_at > now() - interval '15 minutes'
    ORDER BY checked_at DESC LIMIT 1;
  new.official_offset_ms := v_sync.offset_ms;
  new.time_source := coalesce(v_sync.source, 'SERVER_UNSYNCED');
  new.time_within_tolerance := v_sync.offset_ms IS NOT NULL AND abs(v_sync.offset_ms) <= public.attendance_time_tolerance_ms();
  new.receipt_code := upper(encode(extensions.gen_random_bytes(6), 'hex'));
  PERFORM pg_advisory_xact_lock(hashtext('qr_chain:' || coalesce(new.tenant_id::text,'')));
  SELECT row_hash INTO v_prev FROM public.qr_scan_events
    WHERE tenant_id IS NOT DISTINCT FROM new.tenant_id AND row_hash IS NOT NULL
    ORDER BY server_received_at DESC, id DESC LIMIT 1;
  new.prev_hash := coalesce(v_prev, 'GENESIS');
  new.row_hash := encode(extensions.digest(concat_ws('|', new.prev_hash, new.id, new.tenant_id, new.worker_rut, new.scan_type,
    to_char(new.server_received_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US'), new.latitude, new.longitude, new.receipt_code), 'sha256'), 'hex');
  RETURN new;
END;
$$;

-- Empareja cada entrada con la salida de su mismo ordinal y descuenta pausas.
CREATE OR REPLACE FUNCTION public.attendance_summary(_tenant uuid, _rut text, _start date, _end date) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
WITH marks AS (
  SELECT scan_date, scan_type, server_received_at
  FROM qr_scan_events
  WHERE tenant_id = _tenant
    AND regexp_replace(upper(worker_rut),'[.[:space:]-]','','g') = regexp_replace(upper(_rut),'[.[:space:]-]','','g')
    AND scan_date BETWEEN _start AND _end AND server_received_at IS NOT NULL
), entries AS (
  SELECT scan_date, server_received_at, row_number() OVER (PARTITION BY scan_date ORDER BY server_received_at) AS n
  FROM marks WHERE scan_type = 'entrada'
), exits AS (
  SELECT scan_date, server_received_at, row_number() OVER (PARTITION BY scan_date ORDER BY server_received_at) AS n
  FROM marks WHERE scan_type IN ('salida', 'terreno_salida')
), pauses AS (
  SELECT scan_date, sum(extract(epoch FROM (p_end.server_received_at - p_start.server_received_at))) AS seconds
  FROM (SELECT scan_date, server_received_at, row_number() OVER (PARTITION BY scan_date ORDER BY server_received_at) n FROM marks WHERE scan_type = 'almuerzo_inicio') p_start
  JOIN (SELECT scan_date, server_received_at, row_number() OVER (PARTITION BY scan_date ORDER BY server_received_at) n FROM marks WHERE scan_type = 'almuerzo_termino') p_end
    USING (scan_date, n)
  GROUP BY scan_date
), pairs AS (
  SELECT e.scan_date, e.server_received_at AS entrada, x.server_received_at AS salida,
    greatest(extract(epoch FROM (x.server_received_at - e.server_received_at)), 0) AS seconds
  FROM entries e JOIN exits x USING (scan_date, n)
), days AS (
  SELECT m.scan_date, count(*) AS n, min(m.server_received_at) FILTER (WHERE m.scan_type = 'entrada') AS e,
    max(m.server_received_at) FILTER (WHERE m.scan_type IN ('salida','terreno_salida')) AS s,
    coalesce(max(p.seconds), 0) AS pause_seconds, coalesce(max(pd.seconds), 0) AS worked_seconds
  FROM marks m
  LEFT JOIN (SELECT scan_date, sum(seconds) AS seconds FROM pairs GROUP BY scan_date) pd USING (scan_date)
  LEFT JOIN pauses p USING (scan_date)
  GROUP BY m.scan_date
)
SELECT jsonb_build_object(
  'dias_con_marca', count(*), 'marcas', coalesce(sum(n),0),
  'horas_trabajadas', round(coalesce(sum(greatest(worked_seconds - pause_seconds, 0)) / 3600.0, 0)::numeric, 2),
  'dias_incompletos', count(*) FILTER (WHERE e IS NULL OR s IS NULL),
  'detalle', coalesce(jsonb_agg(jsonb_build_object('fecha', scan_date, 'entrada', e, 'salida', s,
    'pausa_segundos', pause_seconds, 'marcas', n, 'segundos_trabajados', greatest(worked_seconds - pause_seconds, 0)) ORDER BY scan_date), '[]'::jsonb)
) FROM days
$$;
