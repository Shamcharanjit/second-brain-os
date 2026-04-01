/**
 * Standalone Supabase client — fully owned, no generated dependencies.
 *
 * All app code imports from HERE. The client is only created when
 * VITE_SUPABASE_URL and an anon key are present; otherwise `supabase`
 * is null and callers must guard via `isSupabaseEnabled`.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY, isSupabaseEnabled } from "./config";

export { isSupabaseEnabled } from "./config";

export const supabase: SupabaseClient =
  isSupabaseEnabled
    ? createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
        auth: {
          storage: localStorage,
          persistSession: true,
          autoRefreshToken: true,
        },
      })
    : (null as unknown as SupabaseClient);
