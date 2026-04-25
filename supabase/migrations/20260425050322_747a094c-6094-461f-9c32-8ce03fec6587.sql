CREATE OR REPLACE FUNCTION public.get_user_referral_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_email text;
  v_referral_code text;
  v_referral_count integer := 0;
  v_reward_level integer := 0;
  v_signups integer := 0;
  v_activations integer := 0;
  v_next_target integer;
  v_next_desc text;
  v_progress integer;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'not_authenticated');
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;
  IF v_email IS NULL THEN
    RETURN jsonb_build_object('error', 'no_email');
  END IF;

  SELECT referral_code, COALESCE(referral_count, 0), COALESCE(referral_reward_level, 0)
    INTO v_referral_code, v_referral_count, v_reward_level
    FROM public.waitlist_signups
    WHERE email = v_email
    LIMIT 1;

  -- Count signups + activations from waitlist_signups via referred_by code
  IF v_referral_code IS NOT NULL THEN
    SELECT
      COUNT(*)::int,
      COUNT(*) FILTER (WHERE activation_completed_at IS NOT NULL)::int
      INTO v_signups, v_activations
    FROM public.waitlist_signups
    WHERE referred_by = v_referral_code;
  END IF;

  -- Use the higher of waitlist counter or live count
  v_signups := GREATEST(v_signups, v_referral_count);

  -- Determine next milestone
  IF v_signups < 1 THEN
    v_next_target := 1; v_next_desc := 'Early supporter badge';
  ELSIF v_signups < 3 THEN
    v_next_target := 3; v_next_desc := 'Extra AI usage credits';
  ELSIF v_signups < 5 THEN
    v_next_target := 5; v_next_desc := '1 month Pro access';
  ELSIF v_signups < 10 THEN
    v_next_target := 10; v_next_desc := '3 months Pro access · Founder reward';
  ELSE
    v_next_target := v_signups; v_next_desc := 'Top tier reached — Founder status';
  END IF;

  v_progress := LEAST(v_signups, v_next_target);

  RETURN jsonb_build_object(
    'referral_code', v_referral_code,
    'signups', v_signups,
    'activations', v_activations,
    'reward_level', v_reward_level,
    'next_milestone', v_next_desc,
    'progress_current', v_progress,
    'progress_target', v_next_target
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_referral_stats() TO authenticated;