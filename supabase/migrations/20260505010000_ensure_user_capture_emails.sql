-- Ensure user_capture_emails table exists.
-- The original migration (20260503100000) was recorded but not applied.
-- This migration is fully idempotent.

CREATE TABLE IF NOT EXISTS public.user_capture_emails (
  id         UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID NOT NULL UNIQUE,
  token      TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_capture_emails_token_idx
  ON public.user_capture_emails (token);

ALTER TABLE public.user_capture_emails ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'user_capture_emails'
      AND policyname = 'Users can read own capture email'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Users can read own capture email"
        ON public.user_capture_emails FOR SELECT
        USING (auth.uid() = user_id)
    $policy$;
  END IF;
END $$;
