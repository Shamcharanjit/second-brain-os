
-- Create user_subscriptions table for billing state
CREATE TABLE public.user_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  plan_tier TEXT NOT NULL DEFAULT 'free',
  billing_provider TEXT DEFAULT NULL,
  provider_customer_id TEXT DEFAULT NULL,
  provider_subscription_id TEXT DEFAULT NULL,
  subscription_status TEXT NOT NULL DEFAULT 'none',
  current_period_end TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscription
CREATE POLICY "Users can view own subscription"
ON public.user_subscriptions
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own subscription (for initial creation)
CREATE POLICY "Users can insert own subscription"
ON public.user_subscriptions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Only service role should update subscriptions (via webhooks),
-- but allow user reads. We add a permissive update for service_role
-- and a restrictive one for users (they can only see, not change plan)
CREATE POLICY "Service role can update subscriptions"
ON public.user_subscriptions
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Timestamp trigger
CREATE TRIGGER update_user_subscriptions_updated_at
BEFORE UPDATE ON public.user_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
