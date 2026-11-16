-- Endurecimiento de accesos y soporte de índices para asistencia.
-- Las funciones públicas de landing y verificación de comprobantes se mantienen
-- públicas deliberadamente; la función GPS interna no debe ser invocable por anon.
REVOKE EXECUTE ON FUNCTION public.enforce_gps_session_access() FROM anon;

-- Índices para las claves foráneas señaladas por el advisor de rendimiento.
CREATE INDEX IF NOT EXISTS attendance_rectifications_scan_event_id_idx
  ON public.attendance_rectifications (scan_event_id);
CREATE INDEX IF NOT EXISTS attendance_rectifications_tenant_id_idx
  ON public.attendance_rectifications (tenant_id);
CREATE INDEX IF NOT EXISTS saas_public_landing_settings_updated_by_idx
  ON public.saas_public_landing_settings (updated_by);
