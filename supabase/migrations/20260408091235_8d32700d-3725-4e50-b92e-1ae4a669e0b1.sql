
-- Add reward level column
ALTER TABLE public.waitlist_signups
  ADD COLUMN IF NOT EXISTS referral_reward_level INTEGER NOT NULL DEFAULT 0;

-- Function to compute reward level from referral_count
CREATE OR REPLACE FUNCTION public.compute_referral_reward_level()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.referral_count >= 10 THEN
    NEW.referral_reward_level := 10;
  ELSIF NEW.referral_count >= 5 THEN
    NEW.referral_reward_level := 5;
  ELSIF NEW.referral_count >= 3 THEN
    NEW.referral_reward_level := 3;
  ELSIF NEW.referral_count >= 1 THEN
    NEW.referral_reward_level := 1;
  ELSE
    NEW.referral_reward_level := 0;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_compute_referral_reward
  BEFORE INSERT OR UPDATE OF referral_count ON public.waitlist_signups
  FOR EACH ROW EXECUTE FUNCTION public.compute_referral_reward_level();

-- Backfill existing rows
UPDATE public.waitlist_signups SET referral_reward_level =
  CASE
    WHEN referral_count >= 10 THEN 10
    WHEN referral_count >= 5 THEN 5
    WHEN referral_count >= 3 THEN 3
    WHEN referral_count >= 1 THEN 1
    ELSE 0
  END;
