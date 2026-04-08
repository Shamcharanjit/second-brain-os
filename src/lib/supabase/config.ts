/**
 * Supabase configuration helper.
 *
 * Reads standard env vars (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).
 *
 * When deploying to your own infrastructure:
 *   VITE_SUPABASE_URL=https://<ref>.supabase.co
 *   VITE_SUPABASE_ANON_KEY=<your-anon-key>
 */

export const SUPABASE_URL: string | undefined =
  import.meta.env.VITE_SUPABASE_URL || undefined;

export const SUPABASE_ANON_KEY: string | undefined =
  import.meta.env.VITE_SUPABASE_ANON_KEY || undefined;

/** True when both URL and key are present — cloud features are available. */
export const isSupabaseEnabled: boolean =
  Boolean(SUPABASE_URL) && Boolean(SUPABASE_ANON_KEY);
