
CREATE OR REPLACE FUNCTION public.get_conversion_candidates()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Update conversion_readiness_score and upgrade_prompt_eligible for all users
  UPDATE public.user_subscriptions us
  SET
    conversion_readiness_score = LEAST(100, GREATEST(0, (
      -- Activation (30%)
      CASE WHEN EXISTS (
        SELECT 1 FROM public.waitlist_signups ws
        JOIN auth.users au ON au.email = ws.email
        WHERE au.id = us.user_id AND ws.activation_completed_at IS NOT NULL
      ) THEN 30 ELSE 0 END
      +
      -- Captures (20%) — cap at 10 captures for full score
      LEAST(20, (SELECT COUNT(*)::int FROM public.user_captures uc WHERE uc.user_id = us.user_id) * 2)
      +
      -- Projects (15%) — cap at 5 projects
      LEAST(15, (SELECT COUNT(*)::int FROM public.user_projects up WHERE up.user_id = us.user_id) * 3)
      +
      -- Memories (15%) — cap at 5 memories
      LEAST(15, (SELECT COUNT(*)::int FROM public.user_memory_entries um WHERE um.user_id = us.user_id) * 3)
      +
      -- Referrals (10%) — cap at 5 referrals
      COALESCE((
        SELECT LEAST(10, ws.referral_count * 2)
        FROM public.waitlist_signups ws
        JOIN auth.users au ON au.email = ws.email
        WHERE au.id = us.user_id
        LIMIT 1
      ), 0)
      +
      -- Recent activity (10%) — any activity in last 7 days
      CASE WHEN EXISTS (
        SELECT 1 FROM public.user_captures uc
        WHERE uc.user_id = us.user_id AND uc.created_at > now() - interval '7 days'
      ) OR EXISTS (
        SELECT 1 FROM public.user_projects up
        WHERE up.user_id = us.user_id AND up.created_at > now() - interval '7 days'
      ) OR EXISTS (
        SELECT 1 FROM public.user_memory_entries um
        WHERE um.user_id = us.user_id AND um.created_at > now() - interval '7 days'
      ) THEN 10 ELSE 0 END
    ))),
    upgrade_prompt_eligible = (
      us.plan_tier != 'pro'
      AND us.is_early_access = true
      AND EXISTS (
        SELECT 1 FROM public.waitlist_signups ws
        JOIN auth.users au ON au.email = ws.email
        WHERE au.id = us.user_id AND ws.activation_completed_at IS NOT NULL
      )
    ),
    updated_at = now()
  WHERE us.plan_tier != 'pro';

  -- Now set upgrade_prompt_eligible only for score >= 60
  UPDATE public.user_subscriptions
  SET upgrade_prompt_eligible = (conversion_readiness_score >= 60 AND upgrade_prompt_eligible)
  WHERE plan_tier != 'pro';

  -- Build result
  SELECT jsonb_build_object(
    'candidates', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'user_id', us.user_id,
          'email', COALESCE(au.email, 'unknown'),
          'plan_tier', us.plan_tier,
          'is_early_access', us.is_early_access,
          'billing_region', us.billing_region,
          'conversion_readiness_score', us.conversion_readiness_score,
          'upgrade_prompt_eligible', us.upgrade_prompt_eligible,
          'referral_count', COALESCE(ws.referral_count, 0),
          'referral_reward_level', COALESCE(ws.referral_reward_level, 0),
          'activation_completed_at', ws.activation_completed_at,
          'capture_count', (SELECT COUNT(*) FROM public.user_captures uc WHERE uc.user_id = us.user_id),
          'project_count', (SELECT COUNT(*) FROM public.user_projects up WHERE up.user_id = us.user_id),
          'memory_count', (SELECT COUNT(*) FROM public.user_memory_entries um WHERE um.user_id = us.user_id),
          'last_activity_at', GREATEST(
            (SELECT MAX(created_at) FROM public.user_captures uc WHERE uc.user_id = us.user_id),
            (SELECT MAX(created_at) FROM public.user_projects up WHERE up.user_id = us.user_id),
            (SELECT MAX(created_at) FROM public.user_memory_entries um WHERE um.user_id = us.user_id)
          )
        ) ORDER BY us.conversion_readiness_score DESC
      ), '[]'::jsonb)
      FROM public.user_subscriptions us
      LEFT JOIN auth.users au ON au.id = us.user_id
      LEFT JOIN public.waitlist_signups ws ON ws.email = au.email
    ),
    'segments', jsonb_build_object(
      'power_users', (
        SELECT COUNT(*) FROM public.user_subscriptions us
        JOIN auth.users au ON au.id = us.user_id
        LEFT JOIN public.waitlist_signups ws ON ws.email = au.email
        WHERE ws.activation_completed_at IS NOT NULL
        AND (
          (SELECT COUNT(*) FROM public.user_captures uc WHERE uc.user_id = us.user_id) >= 3
          OR (SELECT COUNT(*) FROM public.user_projects up WHERE up.user_id = us.user_id) >= 1
          OR (SELECT COUNT(*) FROM public.user_memory_entries um WHERE um.user_id = us.user_id) >= 1
        )
      ),
      'referral_leaders', (
        SELECT COUNT(*) FROM public.user_subscriptions us
        JOIN auth.users au ON au.id = us.user_id
        LEFT JOIN public.waitlist_signups ws ON ws.email = au.email
        WHERE COALESCE(ws.referral_count, 0) >= 3
      ),
      'recent_activations', (
        SELECT COUNT(*) FROM public.user_subscriptions us
        JOIN auth.users au ON au.id = us.user_id
        LEFT JOIN public.waitlist_signups ws ON ws.email = au.email
        WHERE ws.activation_completed_at IS NOT NULL
        AND ws.activation_completed_at > now() - interval '7 days'
      ),
      'high_engagement', (
        SELECT COUNT(*) FROM public.user_subscriptions us
        WHERE us.conversion_readiness_score >= 60
      )
    ),
    'summary', jsonb_build_object(
      'total_eligible', (SELECT COUNT(*) FROM public.user_subscriptions WHERE plan_tier != 'pro'),
      'upgrade_ready', (SELECT COUNT(*) FROM public.user_subscriptions WHERE upgrade_prompt_eligible = true),
      'avg_score', (SELECT COALESCE(AVG(conversion_readiness_score), 0) FROM public.user_subscriptions WHERE plan_tier != 'pro'),
      'india_count', (SELECT COUNT(*) FROM public.user_subscriptions WHERE billing_region = 'india' AND plan_tier != 'pro'),
      'international_count', (SELECT COUNT(*) FROM public.user_subscriptions WHERE billing_region = 'international' AND plan_tier != 'pro'),
      'pro_count', (SELECT COUNT(*) FROM public.user_subscriptions WHERE plan_tier = 'pro')
    )
  ) INTO result;

  RETURN result;
END;
$$;
