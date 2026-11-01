-- Alinea qr_scan_events con los campos de asistencia QR consumidos por el portal y el módulo de escaneo.
-- Sólo agrega columnas e índice; conserva los campos, políticas RLS y datos existentes.
ALTER TABLE public.qr_scan_events
  ADD COLUMN IF NOT EXISTS scan_type text,
  ADD COLUMN IF NOT EXISTS scan_date date,
  ADD COLUMN IF NOT EXISTS scan_time text,
  ADD COLUMN IF NOT EXISTS validated boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS latitude numeric,
  ADD COLUMN IF NOT EXISTS longitude numeric,
  ADD COLUMN IF NOT EXISTS gps_accuracy numeric,
  ADD COLUMN IF NOT EXISTS device_id text,
  ADD COLUMN IF NOT EXISTS gps_missing boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS idempotency_key text;

CREATE INDEX IF NOT EXISTS idx_qr_scan_events_worker_date
  ON public.qr_scan_events (tenant_id, worker_rut, scan_date DESC);
