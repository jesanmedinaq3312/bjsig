// Temporary, explicit suspension requested by the administrator. The strict
// worker Turnstile helper and all remote authentication checks remain intact.
export async function getAdminCaptchaToken(_action: string): Promise<undefined> {
  return undefined;
}
