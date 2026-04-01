/**
 * Portable Supabase client.
 *
 * When Supabase env vars are configured, creates a real client.
 * When they are missing, exports null — callers must guard on isSupabaseEnabled.
 *
 * NOTE: The auto-generated client at src/integrations/supabase/client.ts is
 * still used internally. This file re-exports it with a safety check so that
 * future deployments without Lovable Cloud can swap to a standalone client.
 */

import { isSupabaseEnabled, SUPABASE_URL, SUPABASE_ANON_KEY } from "./config";

// Use the auto-generated client when running inside Lovable Cloud.
// For standalone deployments, this same import path works as long as the
// env vars are set — the auto-generated file reads them at init time.
let _supabase: ReturnType<typeof import("@supabase/supabase-js").createClient> | null = null;

if (isSupabaseEnabled) {
  // Dynamic import avoided — we rely on the auto-generated client which reads
  // the same env vars. Re-export it directly.
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { supabase } = await import("@/integrations/supabase/client");
    _supabase = supabase;
  } catch {
    console.warn("Supabase client init failed — running in local-only mode.");
  }
}

export const supabase = _supabase;
