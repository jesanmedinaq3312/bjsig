/**
 * These values are public browser configuration. Data protection belongs in
 * Supabase RLS policies; never place a secret/service-role key in this file.
 */
// Public configuration supplied for the imported app. Runtime environment
// values take precedence so deployments can override the connected project.
const DEFAULT_URL = "https://uoozvmrkbrbvbhsuphhm.supabase.co";
const DEFAULT_KEY = "sb_publishable_HsfNRe21AWHzL0liyUwYvQ_1mBRPKdC";

export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_URL;
export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  DEFAULT_KEY;
export const SUPABASE_FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;
export const SUPABASE_CONFIGURED = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
