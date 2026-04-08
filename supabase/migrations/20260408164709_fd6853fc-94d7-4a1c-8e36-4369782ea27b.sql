
-- Add invite lifecycle tracking columns
ALTER TABLE public.waitlist_signups
  ADD COLUMN IF NOT EXISTS invite_opened_at timestamptz,
  ADD COLUMN IF NOT EXISTS invite_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS activation_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_email_type_sent text,
  ADD COLUMN IF NOT EXISTS email_send_count integer NOT NULL DEFAULT 0;
