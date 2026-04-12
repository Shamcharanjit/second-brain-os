-- Add referred_user_id and referral_activation_at to user_referrals
ALTER TABLE public.user_referrals
  ADD COLUMN IF NOT EXISTS referred_user_id uuid DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS referral_activation_at timestamptz DEFAULT NULL;

-- Index for looking up referrals by referred user
CREATE INDEX IF NOT EXISTS idx_user_referrals_referred_user_id
  ON public.user_referrals (referred_user_id)
  WHERE referred_user_id IS NOT NULL;

-- Index for activation timing queries
CREATE INDEX IF NOT EXISTS idx_user_referrals_activation_at
  ON public.user_referrals (referral_activation_at)
  WHERE referral_activation_at IS NOT NULL;