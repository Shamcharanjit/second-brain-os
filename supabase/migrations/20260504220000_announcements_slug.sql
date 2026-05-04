-- ────────────────────────────────────────────────────────────────────────────
-- Announcements: add slug column for stable changelog upserts
--
-- The sync-changelog edge function uses a human-readable slug (e.g.
-- "team-workspace-v1") as the stable key so re-syncing the same changelog
-- entry never creates duplicates. The primary key (id) stays as UUID.
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS slug text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_announcements_slug
  ON public.announcements (slug)
  WHERE slug IS NOT NULL;
