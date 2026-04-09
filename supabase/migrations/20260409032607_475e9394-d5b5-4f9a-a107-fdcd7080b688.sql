
-- ══════════════════════════════════════════════════
-- Phase 41: Smart Upgrade Timing Engine
-- ══════════════════════════════════════════════════

-- PART 1: upgrade_prompt_rules
CREATE TABLE IF NOT EXISTS public.upgrade_prompt_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name text NOT NULL,
  min_readiness_score integer NOT NULL DEFAULT 0,
  min_capture_count integer NOT NULL DEFAULT 0,
  min_project_count integer NOT NULL DEFAULT 0,
  min_memory_count integer NOT NULL DEFAULT 0,
  min_referral_count integer NOT NULL DEFAULT 0,
  require_recent_activity boolean NOT NULL DEFAULT false,
  recent_activity_window_hours integer NOT NULL DEFAULT 48,
  allowed_plan_tiers text[] NOT NULL DEFAULT '{free}',
  prompt_strength text NOT NULL DEFAULT 'standard',
  prompt_type text NOT NULL DEFAULT 'banner',
  cooldown_hours integer NOT NULL DEFAULT 24,
  priority_weight integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.upgrade_prompt_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view rules" ON public.upgrade_prompt_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role manages rules" ON public.upgrade_prompt_rules FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can insert rules" ON public.upgrade_prompt_rules FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update rules" ON public.upgrade_prompt_rules FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete rules" ON public.upgrade_prompt_rules FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_upgrade_prompt_rules_updated_at
  BEFORE UPDATE ON public.upgrade_prompt_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- PART 3: upgrade_prompt_history
CREATE TABLE IF NOT EXISTS public.upgrade_prompt_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  rule_id uuid REFERENCES public.upgrade_prompt_rules(id) ON DELETE SET NULL,
  prompt_type text NOT NULL DEFAULT 'banner',
  prompt_strength text NOT NULL DEFAULT 'standard',
  shown_at timestamptz NOT NULL DEFAULT now(),
  dismissed_at timestamptz,
  clicked_at timestamptz
);

CREATE INDEX idx_upgrade_prompt_history_user ON public.upgrade_prompt_history(user_id);
CREATE INDEX idx_upgrade_prompt_history_shown ON public.upgrade_prompt_history(shown_at DESC);

ALTER TABLE public.upgrade_prompt_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own prompt history" ON public.upgrade_prompt_history FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own prompt history" ON public.upgrade_prompt_history FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own prompt history" ON public.upgrade_prompt_history FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Service role manages prompt history" ON public.upgrade_prompt_history FOR ALL TO service_role USING (true) WITH CHECK (true);

-- PART 7: Add trigger_source to conversion_prompt_events
ALTER TABLE public.conversion_prompt_events
  ADD COLUMN IF NOT EXISTS trigger_source text NOT NULL DEFAULT 'campaign';

-- PART 2: get_upgrade_prompt_decision RPC
CREATE OR REPLACE FUNCTION public.get_upgrade_prompt_decision(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  v_sub record;
  v_capture_count integer;
  v_project_count integer;
  v_memory_count integer;
  v_referral_count integer;
  v_last_activity timestamptz;
  v_best_rule record;
  v_cooldown_active boolean;
  v_last_prompt_at timestamptz;
  v_last_score integer;
  v_score_increase integer;
BEGIN
  -- Get subscription info
  SELECT * INTO v_sub FROM public.user_subscriptions WHERE user_id = p_user_id;
  IF v_sub IS NULL OR v_sub.plan_tier = 'pro' THEN
    RETURN jsonb_build_object('should_show_prompt', false, 'reason_code', 'pro_user');
  END IF;

  IF v_sub.upgrade_prompt_eligible = false THEN
    RETURN jsonb_build_object('should_show_prompt', false, 'reason_code', 'not_eligible');
  END IF;

  -- Get activity counts
  SELECT COUNT(*) INTO v_capture_count FROM public.user_captures WHERE user_id = p_user_id;
  SELECT COUNT(*) INTO v_project_count FROM public.user_projects WHERE user_id = p_user_id;
  SELECT COUNT(*) INTO v_memory_count FROM public.user_memory_entries WHERE user_id = p_user_id;

  -- Get referral count
  SELECT COALESCE(ws.referral_count, 0) INTO v_referral_count
  FROM auth.users au
  LEFT JOIN public.waitlist_signups ws ON ws.email = au.email
  WHERE au.id = p_user_id;

  -- Get last activity
  SELECT GREATEST(
    (SELECT MAX(created_at) FROM public.user_captures WHERE user_id = p_user_id),
    (SELECT MAX(created_at) FROM public.user_projects WHERE user_id = p_user_id),
    (SELECT MAX(created_at) FROM public.user_memory_entries WHERE user_id = p_user_id)
  ) INTO v_last_activity;

  -- Safety: no activity in 14 days = no prompt
  IF v_last_activity IS NULL OR v_last_activity < now() - interval '14 days' THEN
    RETURN jsonb_build_object('should_show_prompt', false, 'reason_code', 'inactive_14d');
  END IF;

  -- Find best matching rule
  FOR v_best_rule IN
    SELECT * FROM public.upgrade_prompt_rules
    WHERE is_active = true
    AND v_sub.plan_tier = ANY(allowed_plan_tiers)
    AND v_sub.conversion_readiness_score >= min_readiness_score
    AND v_capture_count >= min_capture_count
    AND v_project_count >= min_project_count
    AND v_memory_count >= min_memory_count
    AND v_referral_count >= min_referral_count
    AND (
      NOT require_recent_activity
      OR v_last_activity > now() - (recent_activity_window_hours || ' hours')::interval
    )
    ORDER BY priority_weight DESC, min_readiness_score DESC
    LIMIT 1
  LOOP
    -- Check cooldown
    SELECT MAX(shown_at) INTO v_last_prompt_at
    FROM public.upgrade_prompt_history
    WHERE user_id = p_user_id AND rule_id = v_best_rule.id;

    v_cooldown_active := false;
    IF v_last_prompt_at IS NOT NULL THEN
      IF v_last_prompt_at > now() - (v_best_rule.cooldown_hours || ' hours')::interval THEN
        -- Check score increase override (15+ jump bypasses cooldown)
        SELECT conversion_readiness_score INTO v_last_score FROM public.user_subscriptions WHERE user_id = p_user_id;
        v_score_increase := v_sub.conversion_readiness_score - COALESCE(v_last_score, 0);
        IF v_score_increase < 15 THEN
          v_cooldown_active := true;
        END IF;
      END IF;
    END IF;

    IF v_cooldown_active THEN
      RETURN jsonb_build_object(
        'should_show_prompt', false,
        'reason_code', 'cooldown_active',
        'cooldown_active', true,
        'rule_triggered', v_best_rule.rule_name
      );
    END IF;

    RETURN jsonb_build_object(
      'should_show_prompt', true,
      'prompt_strength', v_best_rule.prompt_strength,
      'prompt_type', v_best_rule.prompt_type,
      'rule_triggered', v_best_rule.rule_name,
      'cooldown_active', false,
      'reason_code', 'rule_match'
    );
  END LOOP;

  -- No rule matched
  RETURN jsonb_build_object('should_show_prompt', false, 'reason_code', 'no_rule_match');
END;
$$;

-- PART 8: get_prompt_performance_summary RPC
CREATE OR REPLACE FUNCTION public.get_prompt_performance_summary()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'by_source', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'trigger_source', trigger_source,
        'shown', shown,
        'clicked', clicked,
        'dismissed', dismissed,
        'conversion_rate', CASE WHEN shown > 0 THEN ROUND((clicked::numeric / shown) * 100, 1) ELSE 0 END
      )), '[]'::jsonb)
      FROM (
        SELECT
          trigger_source,
          COUNT(*) FILTER (WHERE event_type = 'shown') as shown,
          COUNT(*) FILTER (WHERE event_type = 'clicked') as clicked,
          COUNT(*) FILTER (WHERE event_type = 'dismissed') as dismissed
        FROM public.conversion_prompt_events
        GROUP BY trigger_source
      ) s
    ),
    'by_strength', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'prompt_strength', prompt_strength,
        'shown', shown,
        'clicked', clicked,
        'conversion_rate', CASE WHEN shown > 0 THEN ROUND((clicked::numeric / shown) * 100, 1) ELSE 0 END
      )), '[]'::jsonb)
      FROM (
        SELECT
          prompt_strength,
          COUNT(*) FILTER (WHERE event_type = 'shown') as shown,
          COUNT(*) FILTER (WHERE event_type = 'clicked') as clicked
        FROM public.conversion_prompt_events
        GROUP BY prompt_strength
      ) s
    ),
    'best_rule', (
      SELECT COALESCE(jsonb_build_object(
        'rule_name', r.rule_name,
        'triggers', cnt,
        'clicks', clicks
      ), '{}'::jsonb)
      FROM (
        SELECT
          h.rule_id,
          COUNT(*) as cnt,
          COUNT(h.clicked_at) as clicks
        FROM public.upgrade_prompt_history h
        WHERE h.rule_id IS NOT NULL
        GROUP BY h.rule_id
        ORDER BY clicks DESC, cnt DESC
        LIMIT 1
      ) best
      LEFT JOIN public.upgrade_prompt_rules r ON r.id = best.rule_id
    ),
    'today', jsonb_build_object(
      'shown', (SELECT COUNT(*) FROM public.conversion_prompt_events WHERE event_type = 'shown' AND created_at > CURRENT_DATE),
      'clicked', (SELECT COUNT(*) FROM public.conversion_prompt_events WHERE event_type = 'clicked' AND created_at > CURRENT_DATE),
      'dismissed', (SELECT COUNT(*) FROM public.conversion_prompt_events WHERE event_type = 'dismissed' AND created_at > CURRENT_DATE)
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- PART 5: Seed default rules
INSERT INTO public.upgrade_prompt_rules (rule_name, min_readiness_score, min_capture_count, min_project_count, min_memory_count, min_referral_count, require_recent_activity, recent_activity_window_hours, allowed_plan_tiers, prompt_strength, prompt_type, cooldown_hours, priority_weight)
VALUES
  ('Capture Power User', 60, 5, 0, 0, 0, false, 48, '{free}', 'standard', 'banner', 24, 50),
  ('Project Builder', 70, 0, 2, 0, 0, false, 48, '{free}', 'strong', 'banner', 24, 60),
  ('Referral Champion', 0, 0, 0, 0, 3, false, 48, '{free}', 'strong', 'modal', 72, 80),
  ('High Engagement Streak', 75, 0, 0, 0, 0, true, 48, '{free}', 'strong', 'modal', 72, 90),
  ('Memory Curator', 0, 0, 0, 5, 0, false, 48, '{free}', 'soft', 'badge', 12, 30);

-- Grants
GRANT SELECT ON public.upgrade_prompt_rules TO authenticated;
GRANT ALL ON public.upgrade_prompt_rules TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.upgrade_prompt_history TO authenticated;
GRANT ALL ON public.upgrade_prompt_history TO service_role;
