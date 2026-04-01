-- =============================================================
-- InsightHalo — Standalone Supabase Schema Setup
-- =============================================================
-- Run this against your own Supabase project to create all
-- required tables, RLS policies, indexes, and triggers.
--
-- Prerequisites:
--   1. A Supabase project (https://supabase.com)
--   2. The anon key + project URL for your .env
--
-- After running this SQL in the Supabase SQL editor (or via CLI),
-- set these env vars in your frontend deployment:
--   VITE_SUPABASE_URL=https://<ref>.supabase.co
--   VITE_SUPABASE_ANON_KEY=<your-anon-key>
-- =============================================================

-- ─── Helper: auto-update updated_at ───

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- 1. user_captures
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.user_captures (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL,
  raw_input      TEXT NOT NULL,
  input_type     TEXT NOT NULL DEFAULT 'text',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed      BOOLEAN NOT NULL DEFAULT false,
  status         TEXT NOT NULL DEFAULT 'unprocessed',
  review_status  TEXT NOT NULL DEFAULT 'needs_review',
  ai_data        JSONB,
  reviewed_at    TIMESTAMPTZ,
  manually_adjusted BOOLEAN NOT NULL DEFAULT false,
  is_completed   BOOLEAN NOT NULL DEFAULT false,
  completed_at   TIMESTAMPTZ,
  is_pinned_today BOOLEAN NOT NULL DEFAULT false,
  idea_status    TEXT NOT NULL DEFAULT 'new',
  converted_to_project_at TIMESTAMPTZ,
  source_project_id TEXT,
  source_action_id  TEXT
);

ALTER TABLE public.user_captures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own captures"   ON public.user_captures FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own captures" ON public.user_captures FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own captures" ON public.user_captures FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own captures" ON public.user_captures FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_captures_user ON public.user_captures (user_id);
CREATE INDEX IF NOT EXISTS idx_captures_status ON public.user_captures (user_id, status);

CREATE TRIGGER update_captures_updated_at
  BEFORE UPDATE ON public.user_captures
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════
-- 2. user_projects
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.user_projects (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL,
  name              TEXT NOT NULL,
  description       TEXT NOT NULL DEFAULT '',
  status            TEXT NOT NULL DEFAULT 'active',
  priority          TEXT NOT NULL DEFAULT 'medium',
  progress          INTEGER NOT NULL DEFAULT 0,
  color             TEXT NOT NULL DEFAULT '--brain-teal',
  next_actions      JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes             JSONB NOT NULL DEFAULT '[]'::jsonb,
  timeline          JSONB NOT NULL DEFAULT '[]'::jsonb,
  linked_capture_ids TEXT[] NOT NULL DEFAULT '{}',
  source_idea_id    TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  due_date          TIMESTAMPTZ
);

ALTER TABLE public.user_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own projects"   ON public.user_projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own projects" ON public.user_projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own projects" ON public.user_projects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own projects" ON public.user_projects FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_projects_user ON public.user_projects (user_id);

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.user_projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════
-- 3. user_memory_entries
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.user_memory_entries (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL,
  title              TEXT NOT NULL,
  raw_text           TEXT NOT NULL,
  summary            TEXT NOT NULL,
  memory_type        TEXT NOT NULL DEFAULT 'note',
  tags               TEXT[] NOT NULL DEFAULT '{}',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_pinned          BOOLEAN NOT NULL DEFAULT false,
  is_archived        BOOLEAN NOT NULL DEFAULT false,
  linked_project_ids TEXT[] NOT NULL DEFAULT '{}',
  linked_idea_ids    TEXT[] NOT NULL DEFAULT '{}',
  source_capture_id  TEXT,
  last_reviewed_at   TIMESTAMPTZ,
  importance_score   INTEGER NOT NULL DEFAULT 50
);

ALTER TABLE public.user_memory_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own memories"   ON public.user_memory_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own memories" ON public.user_memory_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own memories" ON public.user_memory_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own memories" ON public.user_memory_entries FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_memories_user ON public.user_memory_entries (user_id);

CREATE TRIGGER update_memories_updated_at
  BEFORE UPDATE ON public.user_memory_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════
-- 4. user_review_meta
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.user_review_meta (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL UNIQUE,
  last_daily_review_at  TIMESTAMPTZ,
  last_weekly_review_at TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_review_meta ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own review meta"   ON public.user_review_meta FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own review meta" ON public.user_review_meta FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own review meta" ON public.user_review_meta FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own review meta" ON public.user_review_meta FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_review_meta_updated_at
  BEFORE UPDATE ON public.user_review_meta
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════
-- Done! Set your env vars and deploy the frontend.
-- ═══════════════════════════════════════════════════════════════
