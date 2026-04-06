
ALTER TABLE public.waitlist_signups
  ADD COLUMN invite_token text UNIQUE,
  ADD COLUMN invite_sent_at timestamp with time zone;

CREATE INDEX idx_waitlist_invite_token ON public.waitlist_signups (invite_token) WHERE invite_token IS NOT NULL;
