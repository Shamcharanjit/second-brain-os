-- Shared Captures: public read-only share links for individual captures / ideas

CREATE TABLE IF NOT EXISTS public.shared_captures (
  id            UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token         TEXT NOT NULL UNIQUE,             -- random token used in the URL
  user_id       UUID NOT NULL,
  capture_json  JSONB NOT NULL,                   -- snapshot of the capture at share time
  title         TEXT,                             -- pre-computed for display
  created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at    TIMESTAMP WITH TIME ZONE DEFAULT NULL  -- NULL = never expires
);

-- Index for fast token lookup
CREATE INDEX IF NOT EXISTS shared_captures_token_idx ON public.shared_captures (token);

-- Enable RLS
ALTER TABLE public.shared_captures ENABLE ROW LEVEL SECURITY;

-- Anyone can read a shared capture by token (public share)
CREATE POLICY "Public can read shared captures"
  ON public.shared_captures
  FOR SELECT
  USING (
    expires_at IS NULL OR expires_at > now()
  );

-- Authenticated users can create shares for their own captures
CREATE POLICY "Users can create own shares"
  ON public.shared_captures
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own shares
CREATE POLICY "Users can delete own shares"
  ON public.shared_captures
  FOR DELETE
  USING (auth.uid() = user_id);
