
CREATE TABLE public.waitlist_signups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  use_case TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  invited BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.waitlist_signups ENABLE ROW LEVEL SECURITY;

-- Anyone can submit (no auth required)
CREATE POLICY "Public can insert waitlist signups"
  ON public.waitlist_signups
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only service_role can read/update/delete
CREATE POLICY "Service role full access on waitlist"
  ON public.waitlist_signups
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Prevent duplicate emails
CREATE UNIQUE INDEX idx_waitlist_email ON public.waitlist_signups (email);

-- Auto-update timestamp
CREATE TRIGGER update_waitlist_updated_at
  BEFORE UPDATE ON public.waitlist_signups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
