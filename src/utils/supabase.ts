/**
 * Compatibility export for features that import the Supabase client from
 * `utils/supabase`. The application uses one shared client so auth sessions,
 * storage, and database queries remain consistent across modules.
 */
export { supabase } from "@/lib/supabase";
