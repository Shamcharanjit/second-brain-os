
CREATE TABLE public.conversion_prompt_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  campaign_id uuid REFERENCES public.conversion_campaigns(id) ON DELETE CASCADE,
  prompt_strength text NOT NULL DEFAULT 'standard',
  prompt_type text NOT NULL DEFAULT 'banner',
  event_type text NOT NULL DEFAULT 'shown',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.conversion_prompt_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own prompt events"
  ON public.conversion_prompt_events FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own prompt events"
  ON public.conversion_prompt_events FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Service role full access on prompt events"
  ON public.conversion_prompt_events FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE INDEX idx_prompt_events_campaign ON public.conversion_prompt_events(campaign_id);
CREATE INDEX idx_prompt_events_user ON public.conversion_prompt_events(user_id);
