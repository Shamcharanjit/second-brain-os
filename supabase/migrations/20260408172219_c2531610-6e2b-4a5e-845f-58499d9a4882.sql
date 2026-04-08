
-- Add price_inr and display_order to subscription_plans
ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS price_inr numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0;

-- Add billing_region, is_founder_assigned, plan_expires_at to user_subscriptions
ALTER TABLE public.user_subscriptions
  ADD COLUMN IF NOT EXISTS billing_region text NOT NULL DEFAULT 'international',
  ADD COLUMN IF NOT EXISTS is_founder_assigned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS plan_expires_at timestamp with time zone DEFAULT NULL;

-- Update existing seed plans
UPDATE public.subscription_plans SET price_inr = 0, display_order = 1 WHERE name = 'Early Access';
UPDATE public.subscription_plans SET price_inr = 749, display_order = 2 WHERE name = 'InsightHalo Pro';
