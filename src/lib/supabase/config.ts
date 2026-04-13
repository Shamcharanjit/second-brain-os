/**
 * Production backend configuration.
 *
 * This app must always compile against the production backend below.
 * Keeping the values in code prevents stale local build-time env values
 * from reintroducing an invalid project reference into compiled assets.
 */

export const SUPABASE_URL = "https://qanoiqzanywjrcuhsmny.supabase.co";

export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhbm9pcXphbnl3anJjdWhzbW55Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNDQ1MzgsImV4cCI6MjA5MDYyMDUzOH0.2qRDx62T5tim0iFPL9CK47Tot-Pe3m6HKdEr6mrbDtM";

export const isSupabaseEnabled = true;
