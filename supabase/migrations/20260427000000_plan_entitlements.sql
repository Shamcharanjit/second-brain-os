-- ============================================================================
-- Plan Entitlements: free vs pro feature gating + daily AI quotas
-- ============================================================================
-- This migration:
--   1. Adds a kill-switch (app_settings.enforce_plan_limits) so we can ship
--      this code disabled and flip it on when billing goes live (Phase 3).
--   2. Updates subscription_plans seed with explicit feature_flags for
--      free / pro / early_access.
--   3. Creates user_daily_usage table for AI call counters per day.
--   4. Creates RPCs the frontend calls:
--        - get_user_entitlements()
--        - try_consume_ai_quota()
--        - get_today_usage()
-- ============================================================================

-- 1) Kill-switch table -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read app_settings" ON public.app_settings;
CREATE POLICY "Anyone can read app_settings"
  ON public.app_settings FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "Service role manages app_settings" ON public.app_settings;
CREATE POLICY "Service role manages app_settings"
  ON public.app_settings FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Default OFF — flip to true in Phase 3 when billing is live
INSERT INTO public.app_settings (key, value)
VALUES ('enforce_plan_limits', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 2) Seed/update subscription_plans -----------------------------------------
-- Wipe existing seed rows and re-insert with our agreed shape.
DELETE FROM public.subscription_plans
WHERE name IN ('Early Access', 'InsightHalo Pro', 'Free');

INSERT INTO public.subscription_plans (name, price_usd, billing_cycle, is_active, feature_flags)
VALUES
  (
    'Free',
    0,
    'monthly',
    true,
    '{
      "tier": "free",
      "ai_organize_per_day": 3,
      "ai_triage_auto": false,
      "multi_device_sync": false,
      "semantic_search": false,
      "resurfacing": false,
      "weekly_digest": false,
      "email_to_capture": false,
      "chrome_extension": false,
      "priority_support": false,
      "voice_capture": true,
      "export_json": true
    }'::jsonb
  ),
  (
    'InsightHalo Pro',
    9,
    'monthly',
    true,
    '{
      "tier": "pro",
      "ai_organize_per_day": -1,
      "ai_triage_auto": true,
      "multi_device_sync": true,
      "semantic_search": true,
      "resurfacing": true,
      "weekly_digest": true,
      "email_to_capture": true,
      "chrome_extension": true,
      "priority_support": true,
      "voice_capture": true,
      "export_json": true
    }'::jsonb
  ),
  (
    'InsightHalo Pro (Annual)',
    72,
    'annual',
    true,
    '{
      "tier": "pro",
      "ai_organize_per_day": -1,
      "ai_triage_auto": true,
      "multi_device_sync": true,
      "semantic_search": true,
      "resurfacing": true,
      "weekly_digest": true,
      "email_to_capture": true,
      "chrome_extension": true,
      "priority_support": true,
      "voice_capture": true,
      "export_json": true
    }'::jsonb
  ),
  (
    'Early Access',
    0,
    'monthly',
    true,
    '{
      "tier": "early_access",
      "ai_organize_per_day": -1,
      "ai_triage_auto": true,
      "multi_device_sync": true,
      "semantic_search": true,
      "resurfacing": true,
      "weekly_digest": true,
      "email_to_capture": true,
      "chrome_extension": true,
      "priority_support": false,
      "voice_capture": true,
      "export_json": true,
      "early_access_member": true
    }'::jsonb
  );

-- 3) Daily usage counter table ----------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_daily_usage (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  ai_organize_count INT NOT NULL DEFAULT 0,
  ai_triage_count INT NOT NULL DEFAULT 0,
  voice_seconds INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, usage_date)
);

ALTER TABLE public.user_daily_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own usage" ON public.user_daily_usage;
CREATE POLICY "Users can view own usage"
  ON public.user_daily_usage FOR SELECT
  USING (auth.uid() = user_id);

-- Inserts/updates only via SECURITY DEFINER RPC below.
DROP POLICY IF EXISTS "Service role manages usage" ON public.user_daily_usage;
CREATE POLICY "Service role manages usage"
  ON public.user_daily_usage FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 4) Helper: resolve current user's effective plan + flags ------------------
CREATE OR REPLACE FUNCTION public.get_user_entitlements()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_plan_tier TEXT;
  v_flags JSONB;
  v_enforce BOOLEAN;
BEGIN
  IF v_user_id IS NULL THEN
    -- Anonymous: return free defaults
    SELECT feature_flags INTO v_flags
    FROM public.subscription_plans
    WHERE name = 'Free' AND is_active = true
    LIMIT 1;
    RETURN COALESCE(v_flags, '{"tier":"anon"}'::jsonb);
  END IF;

  -- Find user's current plan tier (defaults to 'free' if no row)
  SELECT plan_tier INTO v_plan_tier
  FROM public.user_subscriptions
  WHERE user_id = v_user_id;

  v_plan_tier := COALESCE(v_plan_tier, 'free');

  -- Map tier → plan
  SELECT feature_flags INTO v_flags
  FROM public.subscription_plans
  WHERE feature_flags->>'tier' = v_plan_tier
    AND is_active = true
  ORDER BY price_usd DESC
  LIMIT 1;

  v_flags := COALESCE(v_flags, '{"tier":"free","ai_organize_per_day":3}'::jsonb);

  -- Read kill-switch
  SELECT (value)::text::boolean INTO v_enforce
  FROM public.app_settings WHERE key = 'enforce_plan_limits';

  v_flags := jsonb_set(v_flags, '{enforce_limits}', to_jsonb(COALESCE(v_enforce, false)));

  RETURN v_flags;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_entitlements() TO authenticated, anon;

-- 5) Atomically check + record AI usage -------------------------------------
-- Returns:
--   { allowed: boolean, remaining: int, limit: int, reason: text|null }
-- Pass feature_name = 'ai_organize' (more features can be added later)
CREATE OR REPLACE FUNCTION public.try_consume_ai_quota(p_feature TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_flags JSONB;
  v_limit INT;
  v_used INT;
  v_enforce BOOLEAN;
  v_plan_tier TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'remaining', 0, 'limit', 0, 'reason', 'not_authenticated');
  END IF;

  -- Read kill-switch
  SELECT (value)::text::boolean INTO v_enforce
  FROM public.app_settings WHERE key = 'enforce_plan_limits';
  v_enforce := COALESCE(v_enforce, false);

  -- Resolve plan
  SELECT plan_tier INTO v_plan_tier
  FROM public.user_subscriptions
  WHERE user_id = v_user_id;
  v_plan_tier := COALESCE(v_plan_tier, 'free');

  SELECT feature_flags INTO v_flags
  FROM public.subscription_plans
  WHERE feature_flags->>'tier' = v_plan_tier AND is_active = true
  ORDER BY price_usd DESC LIMIT 1;

  -- Determine limit for this feature (only ai_organize for now)
  IF p_feature = 'ai_organize' THEN
    v_limit := COALESCE((v_flags->>'ai_organize_per_day')::int, 3);
  ELSE
    v_limit := -1; -- unknown feature = unlimited (don't break existing flows)
  END IF;

  -- Increment counter (insert if missing)
  INSERT INTO public.user_daily_usage (user_id, usage_date, ai_organize_count)
  VALUES (v_user_id, CURRENT_DATE, CASE WHEN p_feature = 'ai_organize' THEN 1 ELSE 0 END)
  ON CONFLICT (user_id, usage_date) DO UPDATE
    SET ai_organize_count = public.user_daily_usage.ai_organize_count
                          + CASE WHEN p_feature = 'ai_organize' THEN 1 ELSE 0 END,
        ai_triage_count   = public.user_daily_usage.ai_triage_count
                          + CASE WHEN p_feature = 'ai_triage' THEN 1 ELSE 0 END,
        updated_at = now()
  RETURNING ai_organize_count INTO v_used;

  -- Decide
  IF v_limit = -1 OR NOT v_enforce THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'remaining', CASE WHEN v_limit = -1 THEN -1 ELSE GREATEST(v_limit - v_used, 0) END,
      'limit', v_limit,
      'reason', NULL
    );
  END IF;

  IF v_used > v_limit THEN
    -- Roll back the increment so user can retry tomorrow
    UPDATE public.user_daily_usage
       SET ai_organize_count = ai_organize_count - 1
     WHERE user_id = v_user_id AND usage_date = CURRENT_DATE;
    RETURN jsonb_build_object(
      'allowed', false,
      'remaining', 0,
      'limit', v_limit,
      'reason', 'daily_limit_exceeded'
    );
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'remaining', GREATEST(v_limit - v_used, 0),
    'limit', v_limit,
    'reason', NULL
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.try_consume_ai_quota(TEXT) TO authenticated;

-- 6) Today usage snapshot (for /settings UI) --------------------------------
CREATE OR REPLACE FUNCTION public.get_today_usage()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_row public.user_daily_usage%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN '{"ai_organize_count":0,"ai_triage_count":0}'::jsonb;
  END IF;

  SELECT * INTO v_row
  FROM public.user_daily_usage
  WHERE user_id = v_user_id AND usage_date = CURRENT_DATE;

  RETURN jsonb_build_object(
    'ai_organize_count', COALESCE(v_row.ai_organize_count, 0),
    'ai_triage_count',   COALESCE(v_row.ai_triage_count, 0),
    'voice_seconds',     COALESCE(v_row.voice_seconds, 0)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_today_usage() TO authenticated;
