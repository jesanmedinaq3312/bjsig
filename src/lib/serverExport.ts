import { supabase } from "@/lib/supabase";
import { SUPABASE_FUNCTIONS_URL } from "@/lib/supabaseConfig";

export interface ServerExportResult {
  job_id: string;
  status: "ready";
  row_count: number;
  checksum_sha256: string;
  expires_at: string;
  download_url: string;
}

/** Solicita un export privado; el navegador sólo recibe una URL firmada de corta duración. */
export async function requestServerExport(exportKind: string): Promise<ServerExportResult> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("Se requiere una sesión autenticada");
  const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/export-job`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ export_kind: exportKind }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(String(body.error ?? "No se pudo preparar la exportación"));
  return body as ServerExportResult;
}
