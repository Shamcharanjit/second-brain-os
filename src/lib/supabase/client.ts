/**
 * Portable Supabase client re-export.
 *
 * Re-exports the auto-generated client from src/integrations/supabase/client.ts.
 * All data-layer code imports from HERE so that a future standalone deployment
 * can swap the underlying client without touching business logic.
 *
 * The isSupabaseEnabled flag lets callers guard cloud operations.
 */

export { isSupabaseEnabled } from "./config";
export { supabase } from "@/integrations/supabase/client";
