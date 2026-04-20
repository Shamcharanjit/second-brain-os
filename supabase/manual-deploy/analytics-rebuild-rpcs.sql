-- ════════════════════════════════════════════════════════════════════════════
-- InsightHalo — Analytics Rebuild RPCs (Manual Deployment)
-- Target Supabase project: qanoiqzanywjrcuhsmny
-- ────────────────────────────────────────────────────────────────────────────
-- Execute this file ONCE in the Supabase SQL Editor of the production project.
-- It creates 7 new SECURITY DEFINER analytics functions guarded by the founder
-- email whitelist. No schema changes. No auth/billing/storage changes.
--
-- Founder whitelist (matches src/lib/admin.ts):
--   - shamcharan@icloud.com
--
-- All functions are STABLE (read-only) except where they backfill derived
-- signals; those are explicitly marked VOLATILE.
-- ════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────── 0. Founder guard helper ───────────────────────
CREATE OR REPLACE FUNCTION public._is_founder_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_email text;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  RETURN LOWER(COALESCE(v_email, '')) IN ('shamcharan@icloud.com');
END;
$$;

REVOKE ALL ON FUNCTION public._is_founder_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._is_founder_admin() TO authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- 1. get_rebuilt_funnel
--    Reconstructs the activation funnel by UNION-ing activation_funnel_events
--    with derived counts inferred from waitlist_signups timestamps.
--    This eliminates "downstream non-zero, upstream zero" anomalies.
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.get_rebuilt_funnel()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_signed_up        bigint := 0;
  v_email_sent       bigint := 0;
  v_approval_sent    bigint := 0;
  v_link_opened      bigint := 0;
  v_token_validated  bigint := 0;
  v_password_set     bigint := 0;
  v_activated        bigint := 0;
  v_first_login      bigint := 0;
  v_first_capture    bigint := 0;
  v_day2             bigint := 0;
  v_day7             bigint := 0;
  v_rates            jsonb;
BEGIN
  IF NOT public._is_founder_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  -- Stage 1: signups (truth = waitlist_signups; UNION with events for safety)
  SELECT GREATEST(
    (SELECT COUNT(*) FROM public.waitlist_signups),
    (SELECT COUNT(DISTINCT COALESCE(user_id::text, waitlist_signup_email))
       FROM public.activation_funnel_events WHERE event_type = 'waitlist_signed_up')
  ) INTO v_signed_up;

  -- Stage 2: waitlist confirmation emails (events only — no source column)
  SELECT COUNT(DISTINCT COALESCE(user_id::text, waitlist_signup_email))
    INTO v_email_sent
    FROM public.activation_funnel_events WHERE event_type = 'waitlist_email_sent';

  -- Stage 3: approval emails — derive from waitlist_signups.invite_sent_at
  SELECT GREATEST(
    (SELECT COUNT(*) FROM public.waitlist_signups WHERE invite_sent_at IS NOT NULL),
    (SELECT COUNT(DISTINCT COALESCE(user_id::text, waitlist_signup_email))
       FROM public.activation_funnel_events WHERE event_type = 'approval_email_sent')
  ) INTO v_approval_sent;

  -- Stage 4: invite link opened — derive from waitlist_signups.invite_opened_at
  SELECT GREATEST(
    (SELECT COUNT(*) FROM public.waitlist_signups WHERE invite_opened_at IS NOT NULL),
    (SELECT COUNT(DISTINCT COALESCE(user_id::text, waitlist_signup_email))
       FROM public.activation_funnel_events WHERE event_type = 'invite_link_opened')
  ) INTO v_link_opened;

  -- Stage 5: token validated (events only)
  SELECT COUNT(DISTINCT COALESCE(user_id::text, waitlist_signup_email))
    INTO v_token_validated
    FROM public.activation_funnel_events WHERE event_type = 'invite_token_validated';

  -- Stage 6: password set — derive from invite_accepted_at as proxy
  SELECT GREATEST(
    (SELECT COUNT(*) FROM public.waitlist_signups WHERE invite_accepted_at IS NOT NULL),
    (SELECT COUNT(DISTINCT COALESCE(user_id::text, waitlist_signup_email))
       FROM public.activation_funnel_events WHERE event_type = 'password_set')
  ) INTO v_password_set;

  -- Stage 7: activation complete — truth = waitlist_signups.activation_completed_at
  SELECT GREATEST(
    (SELECT COUNT(*) FROM public.waitlist_signups WHERE activation_completed_at IS NOT NULL),
    (SELECT COUNT(DISTINCT COALESCE(user_id::text, waitlist_signup_email))
       FROM public.activation_funnel_events WHERE event_type = 'activation_completed')
  ) INTO v_activated;

  -- Stage 8: first login — derive from auth.users.last_sign_in_at presence
  SELECT GREATEST(
    (SELECT COUNT(*) FROM auth.users WHERE last_sign_in_at IS NOT NULL),
    (SELECT COUNT(DISTINCT user_id) FROM public.activation_funnel_events
       WHERE event_type = 'first_login' AND user_id IS NOT NULL)
  ) INTO v_first_login;

  -- Stage 9: first capture — truth = distinct user_id in user_captures
  SELECT GREATEST(
    (SELECT COUNT(DISTINCT user_id) FROM public.user_captures),
    (SELECT COUNT(DISTINCT user_id) FROM public.activation_funnel_events
       WHERE event_type = 'first_capture_created' AND user_id IS NOT NULL)
  ) INTO v_first_capture;

  -- Stage 10/11: day2 / day7 retention — derive from capture activity windows
  SELECT GREATEST(
    (SELECT COUNT(DISTINCT uc.user_id)
       FROM public.user_captures uc
       JOIN auth.users au ON au.id = uc.user_id
       WHERE uc.created_at >= au.created_at + interval '1 day'
         AND uc.created_at <  au.created_at + interval '3 days'),
    (SELECT COUNT(DISTINCT user_id) FROM public.activation_funnel_events
       WHERE event_type = 'day2_retained' AND user_id IS NOT NULL)
  ) INTO v_day2;

  SELECT GREATEST(
    (SELECT COUNT(DISTINCT uc.user_id)
       FROM public.user_captures uc
       JOIN auth.users au ON au.id = uc.user_id
       WHERE uc.created_at >= au.created_at + interval '6 days'
         AND uc.created_at <  au.created_at + interval '8 days'),
    (SELECT COUNT(DISTINCT user_id) FROM public.activation_funnel_events
       WHERE event_type = 'day7_retained' AND user_id IS NOT NULL)
  ) INTO v_day7;

  -- Monotonic clamp: every downstream stage is bounded by every upstream stage.
  -- This prevents impossible patterns (e.g. first_login > activations).
  v_email_sent      := LEAST(v_email_sent,      v_signed_up);
  v_approval_sent   := LEAST(v_approval_sent,   v_signed_up);
  v_link_opened     := LEAST(v_link_opened,     v_approval_sent);
  v_token_validated := LEAST(v_token_validated, v_link_opened);
  v_password_set    := LEAST(v_password_set,    GREATEST(v_token_validated, v_link_opened));
  v_activated       := LEAST(v_activated,       GREATEST(v_password_set, v_link_opened, v_signed_up));
  v_first_login     := LEAST(v_first_login,     v_activated);
  v_first_capture   := LEAST(v_first_capture,   v_activated);
  v_day2            := LEAST(v_day2,            v_first_capture);
  v_day7            := LEAST(v_day7,            v_day2);

  v_rates := jsonb_build_object(
    'signup_to_email_rate',         CASE WHEN v_signed_up      > 0 THEN ROUND((v_email_sent     ::numeric / v_signed_up     ) * 100, 1) ELSE 0 END,
    'signup_to_approval_rate',      CASE WHEN v_signed_up      > 0 THEN ROUND((v_approval_sent  ::numeric / v_signed_up     ) * 100, 1) ELSE 0 END,
    'approval_to_open_rate',        CASE WHEN v_approval_sent  > 0 THEN ROUND((v_link_opened    ::numeric / v_approval_sent ) * 100, 1) ELSE 0 END,
    'open_to_valid_token_rate',     CASE WHEN v_link_opened    > 0 THEN ROUND((v_token_validated::numeric / v_link_opened   ) * 100, 1) ELSE 0 END,
    'valid_token_to_password_rate', CASE WHEN v_token_validated> 0 THEN ROUND((v_password_set   ::numeric / v_token_validated)* 100, 1) ELSE 0 END,
    'password_to_activation_rate',  CASE WHEN v_password_set   > 0 THEN ROUND((v_activated      ::numeric / v_password_set  ) * 100, 1) ELSE 0 END,
    'activation_to_login_rate',     CASE WHEN v_activated      > 0 THEN ROUND((v_first_login    ::numeric / v_activated     ) * 100, 1) ELSE 0 END,
    'activation_to_capture_rate',   CASE WHEN v_activated      > 0 THEN ROUND((v_first_capture  ::numeric / v_activated     ) * 100, 1) ELSE 0 END,
    'activation_to_day2_rate',      CASE WHEN v_activated      > 0 THEN ROUND((v_day2           ::numeric / v_activated     ) * 100, 1) ELSE 0 END,
    'activation_to_day7_rate',      CASE WHEN v_activated      > 0 THEN ROUND((v_day7           ::numeric / v_activated     ) * 100, 1) ELSE 0 END
  );

  RETURN jsonb_build_object(
    'counts', jsonb_build_object(
      'waitlist_signed_up',     v_signed_up,
      'waitlist_email_sent',    v_email_sent,
      'approval_email_sent',    v_approval_sent,
      'invite_link_opened',     v_link_opened,
      'invite_token_validated', v_token_validated,
      'password_set',           v_password_set,
      'activation_completed',   v_activated,
      'first_login',            v_first_login,
      'first_capture_created',  v_first_capture,
      'day2_retained',          v_day2,
      'day7_retained',          v_day7
    ),
    'rates', v_rates,
    'generated_at', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_rebuilt_funnel() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_rebuilt_funnel() TO authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- 2. get_rollout_signals
--    Composite invite-pacing signals for the Rollout Decision Center.
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.get_rollout_signals()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pending bigint;
  v_invited bigint;
  v_activated bigint;
  v_high_priority bigint;
  v_activation_rate numeric;
  v_acceptance_rate numeric;
  v_retention_7d numeric;
  v_recommended int;
  v_health text;
  v_risk text;
BEGIN
  IF NOT public._is_founder_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT COUNT(*) INTO v_pending  FROM public.waitlist_signups WHERE status = 'pending';
  SELECT COUNT(*) INTO v_invited  FROM public.waitlist_signups WHERE invite_sent_at IS NOT NULL;
  SELECT COUNT(*) INTO v_activated FROM public.waitlist_signups WHERE activation_completed_at IS NOT NULL;
  SELECT COUNT(*) INTO v_high_priority FROM public.waitlist_signups
    WHERE status = 'pending' AND (referral_reward_level >= 3 OR referral_count >= 3);

  v_acceptance_rate := CASE WHEN v_invited  > 0 THEN ROUND((v_activated::numeric / v_invited ) * 100, 1) ELSE 0 END;
  v_activation_rate := v_acceptance_rate;

  SELECT CASE
    WHEN v_activated = 0 THEN 0
    ELSE ROUND((COUNT(DISTINCT uc.user_id)::numeric / v_activated) * 100, 1)
  END INTO v_retention_7d
  FROM public.user_captures uc
  WHERE uc.created_at > now() - interval '7 days';

  -- Recommended batch: scale with health
  v_recommended := CASE
    WHEN v_acceptance_rate >= 60 AND v_retention_7d >= 40 THEN LEAST(v_pending, 25)
    WHEN v_acceptance_rate >= 40                          THEN LEAST(v_pending, 15)
    WHEN v_acceptance_rate >= 20                          THEN LEAST(v_pending, 8)
    ELSE LEAST(v_pending, 3)
  END;

  v_health := CASE
    WHEN v_acceptance_rate >= 60 AND v_retention_7d >= 40 THEN 'strong'
    WHEN v_acceptance_rate >= 40                          THEN 'stable'
    WHEN v_acceptance_rate >= 20                          THEN 'weak'
    ELSE 'poor'
  END;

  v_risk := CASE
    WHEN v_pending > 100 AND v_acceptance_rate < 30 THEN 'high'
    WHEN v_pending > 50  AND v_acceptance_rate < 50 THEN 'medium'
    ELSE 'low'
  END;

  RETURN jsonb_build_object(
    'pending_count',          v_pending,
    'invited_count',          v_invited,
    'activated_count',        v_activated,
    'pending_high_priority',  v_high_priority,
    'activation_rate',        v_activation_rate,
    'acceptance_rate',        v_acceptance_rate,
    'retention_7d',           v_retention_7d,
    'recommended_batch',      v_recommended,
    'health_state',           v_health,
    'risk_state',             v_risk,
    'generated_at',           now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_rollout_signals() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_rollout_signals() TO authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- 3. get_referral_velocity
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.get_referral_velocity()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total bigint;
  v_24h bigint;
  v_7d bigint;
  v_invited_with_refs bigint;
  v_avg_per_invited numeric;
  v_viral text;
  v_daily jsonb;
  v_funnel jsonb;
BEGIN
  IF NOT public._is_founder_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  -- Source A: explicit user_referrals rows
  -- Source B: aggregated referral_count on waitlist_signups (legacy fallback)
  SELECT GREATEST(
    (SELECT COUNT(*) FROM public.user_referrals),
    (SELECT COALESCE(SUM(referral_count), 0) FROM public.waitlist_signups)
  )::bigint INTO v_total;

  SELECT COUNT(*) INTO v_24h FROM public.user_referrals WHERE created_at > now() - interval '24 hours';
  SELECT COUNT(*) INTO v_7d  FROM public.user_referrals WHERE created_at > now() - interval '7 days';

  SELECT COUNT(*) INTO v_invited_with_refs FROM public.waitlist_signups
    WHERE invite_sent_at IS NOT NULL AND referral_count > 0;

  SELECT CASE
    WHEN COUNT(*) FILTER (WHERE invite_sent_at IS NOT NULL) > 0
    THEN ROUND(SUM(referral_count)::numeric / COUNT(*) FILTER (WHERE invite_sent_at IS NOT NULL), 2)
    ELSE 0 END
    INTO v_avg_per_invited
    FROM public.waitlist_signups;

  v_viral := CASE
    WHEN v_24h >= 5 OR v_avg_per_invited >= 1.5 THEN 'accelerating'
    WHEN v_7d  >= 5                              THEN 'steady'
    WHEN v_total > 0                             THEN 'slow'
    ELSE 'dormant'
  END;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'day', day, 'count', cnt
  ) ORDER BY day DESC), '[]'::jsonb) INTO v_daily
  FROM (
    SELECT created_at::date AS day, COUNT(*) AS cnt
    FROM public.user_referrals
    WHERE created_at > now() - interval '14 days'
    GROUP BY created_at::date
  ) d;

  SELECT jsonb_build_object(
    'pending',   COUNT(*) FILTER (WHERE status = 'pending'),
    'activated', COUNT(*) FILTER (WHERE status = 'activated' OR referral_activation_at IS NOT NULL),
    'total',     COUNT(*)
  ) INTO v_funnel
  FROM public.user_referrals;

  RETURN jsonb_build_object(
    'total_referrals',     v_total,
    'referrals_24h',       v_24h,
    'referrals_7d',        v_7d,
    'invited_with_refs',   v_invited_with_refs,
    'avg_per_invited',     v_avg_per_invited,
    'viral_signal',        v_viral,
    'daily_volume',        v_daily,
    'referred_funnel',     v_funnel,
    'generated_at',        now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_referral_velocity() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_referral_velocity() TO authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- 4. get_engagement_signals — per-user 7d averages
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.get_engagement_signals()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_active_users bigint;
  v_captures bigint;
  v_voice bigint;
  v_projects bigint;
  v_memories bigint;
BEGIN
  IF NOT public._is_founder_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT COUNT(DISTINCT user_id) INTO v_active_users FROM (
    SELECT user_id FROM public.user_captures      WHERE created_at > now() - interval '7 days'
    UNION
    SELECT user_id FROM public.user_projects      WHERE created_at > now() - interval '7 days'
    UNION
    SELECT user_id FROM public.user_memory_entries WHERE created_at > now() - interval '7 days'
  ) u;

  SELECT COUNT(*) INTO v_captures FROM public.user_captures      WHERE created_at > now() - interval '7 days';
  SELECT COUNT(*) INTO v_voice    FROM public.user_captures      WHERE created_at > now() - interval '7 days' AND input_type = 'voice';
  SELECT COUNT(*) INTO v_projects FROM public.user_projects      WHERE created_at > now() - interval '7 days';
  SELECT COUNT(*) INTO v_memories FROM public.user_memory_entries WHERE created_at > now() - interval '7 days';

  RETURN jsonb_build_object(
    'active_users_7d',   v_active_users,
    'captures_per_user', CASE WHEN v_active_users > 0 THEN ROUND(v_captures::numeric / v_active_users, 2) ELSE 0 END,
    'voice_per_user',    CASE WHEN v_active_users > 0 THEN ROUND(v_voice   ::numeric / v_active_users, 2) ELSE 0 END,
    'projects_per_user', CASE WHEN v_active_users > 0 THEN ROUND(v_projects::numeric / v_active_users, 2) ELSE 0 END,
    'memories_per_user', CASE WHEN v_active_users > 0 THEN ROUND(v_memories::numeric / v_active_users, 2) ELSE 0 END,
    'totals_7d', jsonb_build_object(
      'captures', v_captures, 'voice', v_voice, 'projects', v_projects, 'memories', v_memories
    ),
    'generated_at', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_engagement_signals() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_engagement_signals() TO authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- 5. get_retention_radar
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.get_retention_radar()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_24h bigint; v_7d bigint; v_30d bigint;
  v_power bigint; v_at_risk bigint; v_rising bigint;
BEGIN
  IF NOT public._is_founder_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  WITH last_seen AS (
    SELECT u.id AS user_id,
           GREATEST(
             u.last_sign_in_at,
             (SELECT MAX(created_at) FROM public.user_captures      WHERE user_id = u.id),
             (SELECT MAX(created_at) FROM public.user_projects      WHERE user_id = u.id),
             (SELECT MAX(created_at) FROM public.user_memory_entries WHERE user_id = u.id)
           ) AS seen_at,
           u.created_at AS joined_at
    FROM auth.users u
  )
  SELECT
    COUNT(*) FILTER (WHERE seen_at > now() - interval '24 hours'),
    COUNT(*) FILTER (WHERE seen_at > now() - interval '7 days'),
    COUNT(*) FILTER (WHERE seen_at > now() - interval '30 days')
  INTO v_24h, v_7d, v_30d
  FROM last_seen;

  -- Power users: 5+ captures last 7d
  SELECT COUNT(*) INTO v_power FROM (
    SELECT user_id FROM public.user_captures
    WHERE created_at > now() - interval '7 days'
    GROUP BY user_id HAVING COUNT(*) >= 5
  ) p;

  -- At-risk: no activity in 7-30d window
  SELECT COUNT(*) INTO v_at_risk FROM auth.users u
  WHERE u.created_at < now() - interval '7 days'
    AND NOT EXISTS (SELECT 1 FROM public.user_captures      WHERE user_id = u.id AND created_at > now() - interval '7 days')
    AND NOT EXISTS (SELECT 1 FROM public.user_projects      WHERE user_id = u.id AND created_at > now() - interval '7 days')
    AND NOT EXISTS (SELECT 1 FROM public.user_memory_entries WHERE user_id = u.id AND created_at > now() - interval '7 days')
    AND (
      EXISTS (SELECT 1 FROM public.user_captures      WHERE user_id = u.id AND created_at > now() - interval '30 days')
      OR EXISTS (SELECT 1 FROM public.user_projects   WHERE user_id = u.id AND created_at > now() - interval '30 days')
      OR EXISTS (SELECT 1 FROM public.user_memory_entries WHERE user_id = u.id AND created_at > now() - interval '30 days')
    );

  -- Rising: more activity in last 7d than the prior 7d
  SELECT COUNT(*) INTO v_rising FROM (
    SELECT user_id,
      COUNT(*) FILTER (WHERE created_at > now() - interval '7 days') AS recent,
      COUNT(*) FILTER (WHERE created_at <= now() - interval '7 days' AND created_at > now() - interval '14 days') AS prior
    FROM public.user_captures
    WHERE created_at > now() - interval '14 days'
    GROUP BY user_id
  ) r WHERE recent > prior AND recent >= 2;

  RETURN jsonb_build_object(
    'active_24h',   v_24h,
    'active_7d',    v_7d,
    'active_30d',   v_30d,
    'power_users',  v_power,
    'at_risk_users',v_at_risk,
    'rising_users', v_rising,
    'generated_at', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_retention_radar() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_retention_radar() TO authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- 6. get_cohort_quality
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.get_cohort_quality()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_signups bigint;
  v_activated bigint;
  v_with_capture bigint;
  v_with_project bigint;
  v_with_memory bigint;
  v_total_refs bigint;
  v_activation_score numeric;
  v_capture_score numeric;
  v_project_score numeric;
  v_memory_score numeric;
  v_referral_score numeric;
  v_total numeric;
  v_label text;
BEGIN
  IF NOT public._is_founder_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT COUNT(*) INTO v_signups FROM public.waitlist_signups;
  SELECT COUNT(*) INTO v_activated FROM public.waitlist_signups WHERE activation_completed_at IS NOT NULL;
  SELECT COUNT(DISTINCT user_id) INTO v_with_capture FROM public.user_captures;
  SELECT COUNT(DISTINCT user_id) INTO v_with_project FROM public.user_projects;
  SELECT COUNT(DISTINCT user_id) INTO v_with_memory  FROM public.user_memory_entries;
  SELECT COALESCE(SUM(referral_count), 0) INTO v_total_refs FROM public.waitlist_signups;

  v_activation_score := CASE WHEN v_signups   > 0 THEN LEAST(100, (v_activated   ::numeric / v_signups   ) * 100) ELSE 0 END;
  v_capture_score    := CASE WHEN v_activated > 0 THEN LEAST(100, (v_with_capture::numeric / v_activated ) * 100) ELSE 0 END;
  v_project_score    := CASE WHEN v_activated > 0 THEN LEAST(100, (v_with_project::numeric / v_activated ) * 100) ELSE 0 END;
  v_memory_score     := CASE WHEN v_activated > 0 THEN LEAST(100, (v_with_memory ::numeric / v_activated ) * 100) ELSE 0 END;
  v_referral_score   := LEAST(100, v_total_refs * 10);

  -- Weighted: activation 30, capture 25, project 20, memory 15, referral 10
  v_total := ROUND(
    (v_activation_score * 0.30) + (v_capture_score * 0.25) +
    (v_project_score    * 0.20) + (v_memory_score  * 0.15) +
    (v_referral_score   * 0.10), 1);

  v_label := CASE
    WHEN v_total >= 75 THEN 'strong'
    WHEN v_total >= 50 THEN 'healthy'
    WHEN v_total >= 25 THEN 'moderate'
    ELSE 'low'
  END;

  RETURN jsonb_build_object(
    'total_score',      v_total,
    'label',            v_label,
    'activation_score', ROUND(v_activation_score, 1),
    'capture_score',    ROUND(v_capture_score, 1),
    'project_score',    ROUND(v_project_score, 1),
    'memory_score',     ROUND(v_memory_score, 1),
    'referral_score',   ROUND(v_referral_score, 1),
    'generated_at',     now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_cohort_quality() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_cohort_quality() TO authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- 7. get_conversion_candidates_v2
--    Read-only wrapper. Reuses get_conversion_candidates but adds founder
--    guard and a defensive simulation block. Does NOT alter the existing v1.
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.get_conversion_candidates_v2()
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE SECURITY DEFINER  -- v1 writes readiness scores; preserve that contract
SET search_path = public
AS $$
DECLARE
  v_base jsonb;
  v_eligible bigint;
  v_ready bigint;
  v_avg numeric;
  v_simulation jsonb;
BEGIN
  IF NOT public._is_founder_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  v_base := public.get_conversion_candidates();

  v_eligible := COALESCE((v_base->'summary'->>'total_eligible')::bigint, 0);
  v_ready    := COALESCE((v_base->'summary'->>'upgrade_ready')::bigint, 0);
  v_avg      := COALESCE((v_base->'summary'->>'avg_score')::numeric, 0);

  -- Conversion impact simulation: assume 20%/40%/60% conversion of ready users
  v_simulation := jsonb_build_object(
    'conservative_conversions', ROUND(v_ready * 0.20),
    'moderate_conversions',     ROUND(v_ready * 0.40),
    'optimistic_conversions',   ROUND(v_ready * 0.60),
    'avg_score',                v_avg,
    'ready_count',              v_ready,
    'eligible_count',           v_eligible
  );

  RETURN v_base || jsonb_build_object('simulation', v_simulation, 'generated_at', now());
END;
$$;

REVOKE ALL ON FUNCTION public.get_conversion_candidates_v2() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_conversion_candidates_v2() TO authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- DONE. Verify with:
--   SELECT public.get_rebuilt_funnel();
--   SELECT public.get_rollout_signals();
--   SELECT public.get_referral_velocity();
--   SELECT public.get_engagement_signals();
--   SELECT public.get_retention_radar();
--   SELECT public.get_cohort_quality();
--   SELECT public.get_conversion_candidates_v2();
-- All should return jsonb when called by a founder; '42501 forbidden' otherwise.
-- ════════════════════════════════════════════════════════════════════════════
