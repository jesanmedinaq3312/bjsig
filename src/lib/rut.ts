/** Strip dots, spaces, and hyphens; uppercase the result (so 'k' → 'K'). */
export function normalizeRut(rut: string): string {
  return rut.replace(/[.\s-]/g, "").toUpperCase();
}

/** Format a RUT with dots and hyphen (e.g. "1234567890" → "12.345.678-9"). */
export function formatRut(rut: string): string {
  const clean = normalizeRut(rut);
  if (clean.length < 2) return clean;
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  let formatted = "";
  for (let i = 0; i < body.length; i++) {
    if (i > 0 && (body.length - i) % 3 === 0) formatted += ".";
    formatted += body[i];
  }
  return `${formatted}-${dv}`;
}

/** Validate a RUT using the module-11 checksum algorithm. */
export function isValidRut(rut: string): boolean {
  const clean = normalizeRut(rut);
  if (clean.length < 2) return false;
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1).toUpperCase();
  if (!/^\d+$/.test(body)) return false;
  let sum = 0;
  let multiplier = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i], 10) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  const mod = sum % 11;
  const computedDv = 11 - mod;
  const expectedDv = computedDv === 11 ? "0" : computedDv === 10 ? "K" : String(computedDv);
  return dv === expectedDv;
}

/** Sanitize for storage: normalized form (no dots, no spaces, uppercase). */
export function sanitizeRutForStorage(rut: string): string {
  return normalizeRut(rut);
}
