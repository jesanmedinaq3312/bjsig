const NETWORK_ERROR_PATTERNS = [
  "failed to fetch",
  "networkerror",
  "network request failed",
  "load failed",
  "err_internet_disconnected",
  "err_connection_refused",
  "err_name_not_resolved",
  "err_timed_out",
  "sin conexión",
  "sin conexion",
];

export const NETWORK_ERROR_MESSAGE =
  "No se pudo conectar con el servidor. Verifica tu conexión a internet e intenta nuevamente.";

export function isNetworkError(err: unknown): boolean {
  if (err instanceof TypeError) {
    const msg = err.message.toLowerCase();
    return NETWORK_ERROR_PATTERNS.some((p) => msg.includes(p));
  }
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();
  return NETWORK_ERROR_PATTERNS.some((p) => lower.includes(p));
}

export function friendlyError(err: unknown): string {
  if (isNetworkError(err)) return NETWORK_ERROR_MESSAGE;
  if (err instanceof Error) return err.message;
  return String(err);
}
