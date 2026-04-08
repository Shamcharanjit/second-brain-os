
-- Subscription plans catalog
CREATE TABLE public.subscription_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  price_usd numeric(10,2) NOT NULL DEFAULT 0,
  billing_cycle text NOT NULL DEFAULT 'monthly',
  is_active boolean NOT NULL DEFAULT true,
  feature_flags jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active plans"
ON public.subscription_plans FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Service role manages plans"
ON public.subscription_plans FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE TRIGGER update_subscription_plans_updated_at
BEFORE UPDATE ON public.subscription_plans
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed plans
INSERT INTO public.subscription_plans (name, price_usd, billing_cycle, is_active, feature_flags)
VALUES
  ('Early Access', 0, 'monthly', true, '{"ai_triage_per_day": 999, "pro_features": true}'::jsonb),
  ('InsightHalo Pro', 9, 'monthly', true, '{"ai_triage_per_day": 999, "pro_features": true}'::jsonb);

-- Extend user_subscriptions
ALTER TABLE public.user_subscriptions
  ADD COLUMN IF NOT EXISTS is_early_access boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS plan_started_at timestamptz DEFAULT now();
