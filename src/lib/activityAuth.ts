/** Preflight only: the server still validates the JWT, MFA and tenant permissions. */
export function hasActivityAuditAssurance(accessToken: string): boolean {
  try {
    const payload = accessToken.split(".")[1];
    if (!payload) return false;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const claims: unknown = JSON.parse(atob(normalized));
    return (
      typeof claims === "object" && claims !== null && "aal" in claims && claims.aal === "aal2"
    );
  } catch {
    return false;
  }
}

export const MFA_REQUIRED_MESSAGE = "Completa la verificación MFA para registrar actividad.";

// The server is authoritative: if it rejected this exact token with MFA_REQUIRED,
// stop sending audit events with it. A refreshed or MFA-upgraded token resumes.
let mfaRejectedToken: string | null = null;

export function markActivityAuditMfaRequired(accessToken: string): void {
  mfaRejectedToken = accessToken;
}

export function canSubmitActivityAudit(accessToken: string): boolean {
  return accessToken !== mfaRejectedToken && hasActivityAuditAssurance(accessToken);
}
