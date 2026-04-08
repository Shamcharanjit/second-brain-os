
CREATE TABLE public.rollout_decisions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  decided_at timestamptz NOT NULL DEFAULT now(),
  recommended_batch integer NOT NULL,
  actual_sent integer NOT NULL DEFAULT 0,
  health_state text NOT NULL DEFAULT 'unknown',
  rollout_state text NOT NULL DEFAULT 'hold',
  decision text NOT NULL DEFAULT 'approve',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rollout_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view rollout decisions"
ON public.rollout_decisions FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert rollout decisions"
ON public.rollout_decisions FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update rollout decisions"
ON public.rollout_decisions FOR UPDATE TO authenticated
USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on rollout decisions"
ON public.rollout_decisions FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE TRIGGER update_rollout_decisions_updated_at
BEFORE UPDATE ON public.rollout_decisions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
