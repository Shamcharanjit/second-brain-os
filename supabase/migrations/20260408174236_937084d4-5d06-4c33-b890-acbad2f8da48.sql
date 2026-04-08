
CREATE TABLE public.conversion_campaigns (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_name text NOT NULL,
  target_segment text[] NOT NULL DEFAULT '{}',
  min_score_threshold integer NOT NULL DEFAULT 60,
  start_date timestamp with time zone NOT NULL DEFAULT now(),
  end_date timestamp with time zone,
  is_active boolean NOT NULL DEFAULT false,
  prompt_strength text NOT NULL DEFAULT 'standard',
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.conversion_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view campaigns"
  ON public.conversion_campaigns FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Service role manages campaigns"
  ON public.conversion_campaigns FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can insert campaigns"
  ON public.conversion_campaigns FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update campaigns"
  ON public.conversion_campaigns FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete campaigns"
  ON public.conversion_campaigns FOR DELETE
  TO authenticated USING (true);

CREATE TRIGGER update_conversion_campaigns_updated_at
  BEFORE UPDATE ON public.conversion_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
