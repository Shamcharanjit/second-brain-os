
-- Part 1: Paywall Variants Table
CREATE TABLE public.paywall_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_name text NOT NULL,
  target_region text NOT NULL DEFAULT 'all',
  target_segment text NOT NULL DEFAULT 'default',
  min_readiness_score integer NOT NULL DEFAULT 0,
  allowed_prompt_strengths text[] NOT NULL DEFAULT '{soft,standard,strong}'::text[],
  headline text NOT NULL DEFAULT '',
  subheadline text NOT NULL DEFAULT '',
  pricing_label text NOT NULL DEFAULT '',
  badge_text text NOT NULL DEFAULT '',
  cta_text text NOT NULL DEFAULT 'Upgrade to Pro',
  urgency_text text NOT NULL DEFAULT '',
  social_proof_text text NOT NULL DEFAULT '',
  show_discount_hint boolean NOT NULL DEFAULT false,
  discount_hint_text text NOT NULL DEFAULT '',
  show_feature_comparison boolean NOT NULL DEFAULT false,
  show_testimonial_block boolean NOT NULL DEFAULT false,
  priority_weight integer NOT NULL DEFAULT 10,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX variant_active_priority_idx ON public.paywall_variants (is_active, priority_weight DESC);
CREATE INDEX variant_segment_idx ON public.paywall_variants (target_segment);
CREATE INDEX variant_region_idx ON public.paywall_variants (target_region);
CREATE INDEX variant_score_idx ON public.paywall_variants (min_readiness_score);

-- RLS
ALTER TABLE public.paywall_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view variants"
  ON public.paywall_variants FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert variants"
  ON public.paywall_variants FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update variants"
  ON public.paywall_variants FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete variants"
  ON public.paywall_variants FOR DELETE TO authenticated USING (true);

CREATE POLICY "Service role manages variants"
  ON public.paywall_variants FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Updated_at trigger
CREATE TRIGGER update_paywall_variants_updated_at
  BEFORE UPDATE ON public.paywall_variants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Part 2: Extend conversion_prompt_events
ALTER TABLE public.conversion_prompt_events
  ADD COLUMN IF NOT EXISTS paywall_variant_id uuid,
  ADD COLUMN IF NOT EXISTS paywall_variant_name text,
  ADD COLUMN IF NOT EXISTS displayed_price text,
  ADD COLUMN IF NOT EXISTS displayed_currency text;

CREATE INDEX prompt_variant_tracking_idx ON public.conversion_prompt_events (paywall_variant_id, event_type);

-- Part 3: Paywall Variant Decision RPC
CREATE OR REPLACE FUNCTION public.get_paywall_variant_decision(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_sub record;
  v_capture_count integer;
  v_project_count integer;
  v_memory_count integer;
  v_referral_count integer;
  v_referral_reward integer;
  v_last_activity timestamptz;
  v_segment text;
  v_variant record;
  v_currency text;
  v_amount text;
  v_provider text;
  v_prompt_strength text;
BEGIN
  -- Get subscription
  SELECT * INTO v_sub FROM public.user_subscriptions WHERE user_id = p_user_id;
  IF v_sub IS NULL OR v_sub.plan_tier = 'pro' THEN
    RETURN jsonb_build_object('should_show', false, 'reason_code', 'pro_user');
  END IF;
  IF v_sub.upgrade_prompt_eligible = false THEN
    RETURN jsonb_build_object('should_show', false, 'reason_code', 'not_eligible');
  END IF;

  -- Safety: inactive > 14 days
  SELECT GREATEST(
    (SELECT MAX(created_at) FROM public.user_captures WHERE user_id = p_user_id),
    (SELECT MAX(created_at) FROM public.user_projects WHERE user_id = p_user_id),
    (SELECT MAX(created_at) FROM public.user_memory_entries WHERE user_id = p_user_id)
  ) INTO v_last_activity;
  IF v_last_activity IS NULL OR v_last_activity < now() - interval '14 days' THEN
    RETURN jsonb_build_object('should_show', false, 'reason_code', 'inactive_14d');
  END IF;

  -- Activity counts
  SELECT COUNT(*) INTO v_capture_count FROM public.user_captures WHERE user_id = p_user_id;
  SELECT COUNT(*) INTO v_project_count FROM public.user_projects WHERE user_id = p_user_id;
  SELECT COUNT(*) INTO v_memory_count FROM public.user_memory_entries WHERE user_id = p_user_id;
  SELECT COALESCE(ws.referral_count, 0), COALESCE(ws.referral_reward_level, 0)
    INTO v_referral_count, v_referral_reward
    FROM auth.users au LEFT JOIN public.waitlist_signups ws ON ws.email = au.email
    WHERE au.id = p_user_id;

  -- Detect segment
  v_segment := 'default';
  IF v_referral_count >= 3 OR v_referral_reward >= 3 THEN v_segment := 'referral_leaders';
  ELSIF v_capture_count >= 3 OR v_project_count >= 1 OR v_memory_count >= 1 THEN
    IF v_sub.conversion_readiness_score >= 60 THEN v_segment := 'high_engagement';
    ELSE v_segment := 'power_users';
    END IF;
  ELSIF EXISTS (
    SELECT 1 FROM public.waitlist_signups ws JOIN auth.users au ON au.email = ws.email
    WHERE au.id = p_user_id AND ws.activation_completed_at > now() - interval '7 days'
  ) THEN v_segment := 'recent_activations';
  END IF;

  -- Region pricing
  IF v_sub.billing_region = 'india' THEN
    v_currency := 'INR'; v_amount := '₹749'; v_provider := 'razorpay';
  ELSE
    v_currency := 'USD'; v_amount := '$9'; v_provider := 'stripe';
  END IF;

  -- Prompt strength by score
  IF v_sub.conversion_readiness_score >= 85 THEN v_prompt_strength := 'strong';
  ELSIF v_sub.conversion_readiness_score >= 65 THEN v_prompt_strength := 'standard';
  ELSIF v_sub.conversion_readiness_score >= 45 THEN v_prompt_strength := 'standard';
  ELSE v_prompt_strength := 'soft';
  END IF;

  -- Find best variant
  FOR v_variant IN
    SELECT * FROM public.paywall_variants
    WHERE is_active = true
      AND (target_region = 'all' OR target_region = v_sub.billing_region)
      AND (target_segment = 'default' OR target_segment = v_segment)
      AND v_sub.conversion_readiness_score >= min_readiness_score
      AND v_prompt_strength = ANY(allowed_prompt_strengths)
    ORDER BY
      CASE WHEN target_segment = v_segment THEN 0 ELSE 1 END,
      CASE WHEN target_region = v_sub.billing_region THEN 0 WHEN target_region = 'all' THEN 1 ELSE 2 END,
      priority_weight DESC
    LIMIT 1
  LOOP
    RETURN jsonb_build_object(
      'should_show', true,
      'variant_id', v_variant.id,
      'variant_name', v_variant.variant_name,
      'headline', v_variant.headline,
      'subheadline', v_variant.subheadline,
      'pricing_label', v_variant.pricing_label,
      'badge_text', v_variant.badge_text,
      'cta_text', v_variant.cta_text,
      'urgency_text', v_variant.urgency_text,
      'social_proof_text', v_variant.social_proof_text,
      'show_discount_hint', v_variant.show_discount_hint,
      'discount_hint_text', v_variant.discount_hint_text,
      'show_feature_comparison', v_variant.show_feature_comparison,
      'show_testimonial_block', v_variant.show_testimonial_block,
      'pricing_currency', v_currency,
      'pricing_amount', v_amount,
      'billing_provider', v_provider,
      'prompt_type', v_variant.allowed_prompt_strengths[1],
      'prompt_strength', v_prompt_strength,
      'trigger_source', 'variant',
      'segment', v_segment,
      'reason_code', 'variant_match'
    );
  END LOOP;

  -- Fallback
  RETURN jsonb_build_object(
    'should_show', false,
    'reason_code', 'no_variant_match',
    'segment', v_segment,
    'pricing_currency', v_currency,
    'pricing_amount', v_amount,
    'billing_provider', v_provider
  );
END;
$$;

-- Part 8: Paywall Variant Performance RPC
CREATE OR REPLACE FUNCTION public.get_paywall_variant_performance()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'by_variant', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'variant_name', variant_name,
        'variant_id', paywall_variant_id,
        'impressions', impressions,
        'clicks', clicks,
        'dismissals', dismissals,
        'ctr', CASE WHEN impressions > 0 THEN ROUND((clicks::numeric / impressions) * 100, 1) ELSE 0 END
      )), '[]'::jsonb)
      FROM (
        SELECT
          paywall_variant_name as variant_name,
          paywall_variant_id,
          COUNT(*) FILTER (WHERE event_type = 'shown') as impressions,
          COUNT(*) FILTER (WHERE event_type = 'clicked') as clicks,
          COUNT(*) FILTER (WHERE event_type = 'dismissed') as dismissals
        FROM public.conversion_prompt_events
        WHERE paywall_variant_id IS NOT NULL
        GROUP BY paywall_variant_id, paywall_variant_name
      ) s
    ),
    'by_region', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'currency', displayed_currency,
        'impressions', impressions,
        'clicks', clicks,
        'ctr', CASE WHEN impressions > 0 THEN ROUND((clicks::numeric / impressions) * 100, 1) ELSE 0 END
      )), '[]'::jsonb)
      FROM (
        SELECT
          displayed_currency,
          COUNT(*) FILTER (WHERE event_type = 'shown') as impressions,
          COUNT(*) FILTER (WHERE event_type = 'clicked') as clicks
        FROM public.conversion_prompt_events
        WHERE displayed_currency IS NOT NULL
        GROUP BY displayed_currency
      ) s
    ),
    'best_variant', (
      SELECT jsonb_build_object('variant_name', variant_name, 'ctr', ctr)
      FROM (
        SELECT
          paywall_variant_name as variant_name,
          CASE WHEN COUNT(*) FILTER (WHERE event_type = 'shown') > 0
            THEN ROUND((COUNT(*) FILTER (WHERE event_type = 'clicked')::numeric / COUNT(*) FILTER (WHERE event_type = 'shown')) * 100, 1)
            ELSE 0 END as ctr
        FROM public.conversion_prompt_events
        WHERE paywall_variant_id IS NOT NULL
        GROUP BY paywall_variant_name
        ORDER BY ctr DESC
        LIMIT 1
      ) s
    ),
    'today', jsonb_build_object(
      'impressions', (SELECT COUNT(*) FROM public.conversion_prompt_events WHERE paywall_variant_id IS NOT NULL AND event_type = 'shown' AND created_at > CURRENT_DATE),
      'clicks', (SELECT COUNT(*) FROM public.conversion_prompt_events WHERE paywall_variant_id IS NOT NULL AND event_type = 'clicked' AND created_at > CURRENT_DATE),
      'dismissals', (SELECT COUNT(*) FROM public.conversion_prompt_events WHERE paywall_variant_id IS NOT NULL AND event_type = 'dismissed' AND created_at > CURRENT_DATE)
    )
  ) INTO result;

  RETURN result;
END;
$$;
