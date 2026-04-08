
ALTER TABLE public.user_subscriptions
  ADD COLUMN IF NOT EXISTS conversion_readiness_score integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS upgrade_prompt_eligible boolean NOT NULL DEFAULT false;
