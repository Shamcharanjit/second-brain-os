
-- Extend announcements with feature-update fields
ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS version_tag text,
  ADD COLUMN IF NOT EXISTS visible_from timestamptz,
  ADD COLUMN IF NOT EXISTS visible_to timestamptz;

CREATE INDEX IF NOT EXISTS idx_announcements_type_status ON public.announcements(type, status);

-- Per-user seen tracking
CREATE TABLE IF NOT EXISTS public.user_seen_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  announcement_id uuid NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  seen_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, announcement_id)
);

ALTER TABLE public.user_seen_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own seen announcements"
  ON public.user_seen_announcements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own seen announcements"
  ON public.user_seen_announcements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own seen announcements"
  ON public.user_seen_announcements FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_seen_announcements_user ON public.user_seen_announcements(user_id);
