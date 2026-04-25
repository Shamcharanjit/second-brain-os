
-- ============================================================
-- Update 3: Referral code auto-generation
-- ============================================================

-- 1. Helper function: ensure a waitlist_signups row exists for a given email
--    with a referral_code. Used by trigger and by RPC backfill.
CREATE OR REPLACE FUNCTION public.ensure_waitlist_referral_row(p_email text, p_name text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
  v_existing_id uuid;
BEGIN
  IF p_email IS NULL OR length(trim(p_email)) = 0 THEN
    RETURN NULL;
  END IF;

  SELECT id, referral_code INTO v_existing_id, v_code
  FROM public.waitlist_signups
  WHERE LOWER(email) = LOWER(p_email)
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    IF v_code IS NULL OR length(v_code) = 0 THEN
      v_code := UPPER(SUBSTR(REPLACE(gen_random_uuid()::text, '-', ''), 1, 8));
      UPDATE public.waitlist_signups
      SET referral_code = v_code, updated_at = now()
      WHERE id = v_existing_id;
    END IF;
    RETURN v_code;
  END IF;

  -- No row exists — create one (e.g. user signed up via direct invite without waitlist record)
  v_code := UPPER(SUBSTR(REPLACE(gen_random_uuid()::text, '-', ''), 1, 8));
  INSERT INTO public.waitlist_signups (
    email, name, status, invited, referral_code,
    referral_count, referral_reward_level, activation_completed_at
  ) VALUES (
    LOWER(p_email),
    COALESCE(p_name, split_part(p_email, '@', 1)),
    'activated',
    true,
    v_code,
    0,
    0,
    now()
  )
  ON CONFLICT DO NOTHING;

  -- Re-fetch in case of conflict
  SELECT referral_code INTO v_code
  FROM public.waitlist_signups
  WHERE LOWER(email) = LOWER(p_email)
  LIMIT 1;

  RETURN v_code;
END;
$$;

-- 2. Trigger on auth.users insert: ensure waitlist row + referral code
CREATE OR REPLACE FUNCTION public.handle_new_user_referral()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS NOT NULL THEN
    PERFORM public.ensure_waitlist_referral_row(NEW.email, NEW.raw_user_meta_data->>'name');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_ensure_referral ON auth.users;
CREATE TRIGGER on_auth_user_ensure_referral
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user_referral();

-- 3. Backfill: for every existing auth user without a waitlist_signups row OR
--    whose row lacks a referral_code, ensure one.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT au.email, au.raw_user_meta_data->>'name' AS name
    FROM auth.users au
    LEFT JOIN public.waitlist_signups ws ON LOWER(ws.email) = LOWER(au.email)
    WHERE au.email IS NOT NULL
      AND (ws.id IS NULL OR ws.referral_code IS NULL OR length(ws.referral_code) = 0)
  LOOP
    PERFORM public.ensure_waitlist_referral_row(r.email, r.name);
  END LOOP;
END $$;

-- 4. Update get_user_referral_stats to ensure code exists on read (self-heal)
CREATE OR REPLACE FUNCTION public.get_user_referral_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
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
    WHERE LOWER(email) = LOWER(v_email)
    LIMIT 1;

  -- Self-heal: ensure referral_code exists for this user
  IF v_referral_code IS NULL OR length(v_referral_code) = 0 THEN
    v_referral_code := public.ensure_waitlist_referral_row(v_email, NULL);
    IF v_referral_count = 0 THEN
      SELECT COALESCE(referral_count, 0), COALESCE(referral_reward_level, 0)
        INTO v_referral_count, v_reward_level
        FROM public.waitlist_signups
        WHERE LOWER(email) = LOWER(v_email)
        LIMIT 1;
    END IF;
  END IF;

  IF v_referral_code IS NOT NULL THEN
    SELECT
      COUNT(*)::int,
      COUNT(*) FILTER (WHERE activation_completed_at IS NOT NULL)::int
      INTO v_signups, v_activations
    FROM public.waitlist_signups
    WHERE referred_by = v_referral_code;
  END IF;

  v_signups := GREATEST(v_signups, v_referral_count);

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
