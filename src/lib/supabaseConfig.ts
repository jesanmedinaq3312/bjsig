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

// The publishable key is safe in browser code. Environment variables still take precedence.
export const SUPABASE_URL = configuredUrl || "https://uoozvmrkbrbvbhsuphhm.supabase.co";
export const SUPABASE_ANON_KEY = configuredKey || "sb_publishable_HsfNRe21AWHzL0liyUwYvQ_1mBRPKdC";
export const SUPABASE_FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;
export const SUPABASE_CONFIGURED = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
