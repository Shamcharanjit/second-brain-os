-- User capture email addresses: each user gets a unique alias
-- e.g. capture+<token>@insighthalo.com → lands in their Inbox

CREATE TABLE IF NOT EXISTS public.user_capture_emails (
  id         UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID NOT NULL UNIQUE,
  token      TEXT NOT NULL UNIQUE,   -- the unique part of the address
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_capture_emails_token_idx ON public.user_capture_emails (token);

ALTER TABLE public.user_capture_emails ENABLE ROW LEVEL SECURITY;

-- Users can read their own token
CREATE POLICY "Users can read own capture email"
  ON public.user_capture_emails FOR SELECT USING (auth.uid() = user_id);

-- Service role handles inserts (provisioned on first use)
