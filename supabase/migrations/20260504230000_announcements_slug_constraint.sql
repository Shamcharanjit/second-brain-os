-- ────────────────────────────────────────────────────────────────────────────
-- Fix: replace partial unique index on announcements.slug with a full
-- UNIQUE CONSTRAINT so that Supabase upsert onConflict:"slug" works.
--
-- PostgreSQL ON CONFLICT cannot use partial indexes (WHERE clause),
-- only full unique constraints/indexes.
-- ────────────────────────────────────────────────────────────────────────────

-- Drop the partial index added in the previous migration
DROP INDEX IF EXISTS idx_announcements_slug;

-- Add a proper unique constraint (handles NULLs correctly in PG — each
-- NULL is treated as distinct, so nullable slug is safe)
ALTER TABLE public.announcements
  ADD CONSTRAINT announcements_slug_unique UNIQUE (slug);
