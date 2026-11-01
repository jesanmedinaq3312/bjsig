import { supabase } from "./supabase";

const INVOICE_BUCKET = "treasury-invoices";
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["application/pdf", "image/png", "image/jpeg"];

export function validateInvoiceFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return "Solo se permiten archivos PDF, PNG o JPEG.";
  }
  if (file.size > MAX_FILE_SIZE) {
    return "El archivo no puede pesar mas de 5 MB.";
  }
  return null;
}

export function getInvoicePath(txId: string, file: File): string {
  const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";
  return `invoices/${txId}.${ext}`;
}

export async function uploadInvoiceFile(file: File, txId: string): Promise<string> {
  const validationError = validateInvoiceFile(file);
  if (validationError) throw new Error(validationError);

  const path = getInvoicePath(txId, file);
  const { error } = await supabase.storage.from(INVOICE_BUCKET).upload(path, file, {
    cacheControl: "3600",
    contentType: file.type,
    upsert: true,
  });
  if (error) throw new Error(error.message);
  return path;
}

export async function getInvoiceSignedUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(INVOICE_BUCKET)
    .createSignedUrl(path, 60 * 60 * 24 * 7); // 7 days
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

export async function deleteInvoiceFile(path: string): Promise<void> {
  const { error } = await supabase.storage.from(INVOICE_BUCKET).remove([path]);
  if (error) throw new Error(error.message);
}
