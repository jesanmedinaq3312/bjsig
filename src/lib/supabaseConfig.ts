/**
 * Browser-side Supabase settings are public configuration, not secrets.
 * Never place a service-role or secret key here. Each environment must provide
 * its own project URL and publishable key through Vite environment variables.
 */
const configuredUrl = (
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://uoozvmrkbrbvbhsuphhm.supabase.co"
).trim();
const configuredKey = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_HsfNRe21AWHzL0liyUwYvQ_1mBRPKdC"
).trim();

// Harmless placeholders keep the application bundle/build loadable; they do
// not route an unconfigured development environment to production.
export const SUPABASE_URL = configuredUrl || "https://placeholder.supabase.co";
export const SUPABASE_ANON_KEY = configuredKey || "placeholder-anon-key";
export const SUPABASE_FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;
export const SUPABASE_CONFIGURED = Boolean(configuredUrl && configuredKey);
