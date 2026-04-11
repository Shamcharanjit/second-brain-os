
-- ═══════════════════════════════════════════════════════════════
-- Activation Funnel Events Table
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.activation_funnel_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  waitlist_signup_email TEXT,
  event_type TEXT NOT NULL,
  event_source TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.activation_funnel_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS activation_funnel_events_user_idx ON public.activation_funnel_events (user_id);
CREATE INDEX IF NOT EXISTS activation_funnel_events_type_idx ON public.activation_funnel_events (event_type);
CREATE INDEX IF NOT EXISTS activation_funnel_events_created_idx ON public.activation_funnel_events (created_at);
CREATE INDEX IF NOT EXISTS activation_funnel_events_email_idx ON public.activation_funnel_events (waitlist_signup_email);

-- Unique constraint to prevent duplicate first_* and retention events per user
CREATE UNIQUE INDEX IF NOT EXISTS activation_funnel_events_unique_first_idx
  ON public.activation_funnel_events (user_id, event_type)
  WHERE event_type IN (
    'first_login', 'first_capture_created', 'first_project_created',
    'first_memory_created', 'second_session_returned', 'day2_retained', 'day7_retained'
  );

-- RLS Policies
CREATE POLICY "Users can view own funnel events"
  ON public.activation_funnel_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own funnel events"
  ON public.activation_funnel_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access on funnel events"
  ON public.activation_funnel_events FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════
-- RPC: get_activation_funnel_summary
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_activation_funnel_summary()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  v_waitlist_signed_up bigint;
  v_waitlist_email_sent bigint;
  v_approval_email_sent bigint;
  v_invite_link_opened bigint;
  v_invite_token_validated bigint;
  v_password_set bigint;
  v_activation_completed bigint;
  v_first_login bigint;
  v_first_capture bigint;
  v_first_project bigint;
  v_first_memory bigint;
  v_second_session bigint;
  v_day2 bigint;
  v_day7 bigint;
BEGIN
  SELECT COUNT(DISTINCT COALESCE(user_id::text, waitlist_signup_email)) INTO v_waitlist_signed_up FROM activation_funnel_events WHERE event_type = 'waitlist_signed_up';
  SELECT COUNT(DISTINCT COALESCE(user_id::text, waitlist_signup_email)) INTO v_waitlist_email_sent FROM activation_funnel_events WHERE event_type = 'waitlist_email_sent';
  SELECT COUNT(DISTINCT COALESCE(user_id::text, waitlist_signup_email)) INTO v_approval_email_sent FROM activation_funnel_events WHERE event_type = 'approval_email_sent';
  SELECT COUNT(DISTINCT COALESCE(user_id::text, waitlist_signup_email)) INTO v_invite_link_opened FROM activation_funnel_events WHERE event_type = 'invite_link_opened';
  SELECT COUNT(DISTINCT COALESCE(user_id::text, waitlist_signup_email)) INTO v_invite_token_validated FROM activation_funnel_events WHERE event_type = 'invite_token_validated';
  SELECT COUNT(DISTINCT COALESCE(user_id::text, waitlist_signup_email)) INTO v_password_set FROM activation_funnel_events WHERE event_type = 'password_set';
  SELECT COUNT(DISTINCT COALESCE(user_id::text, waitlist_signup_email)) INTO v_activation_completed FROM activation_funnel_events WHERE event_type = 'activation_completed';
  SELECT COUNT(DISTINCT user_id) INTO v_first_login FROM activation_funnel_events WHERE event_type = 'first_login';
  SELECT COUNT(DISTINCT user_id) INTO v_first_capture FROM activation_funnel_events WHERE event_type = 'first_capture_created';
  SELECT COUNT(DISTINCT user_id) INTO v_first_project FROM activation_funnel_events WHERE event_type = 'first_project_created';
  SELECT COUNT(DISTINCT user_id) INTO v_first_memory FROM activation_funnel_events WHERE event_type = 'first_memory_created';
  SELECT COUNT(DISTINCT user_id) INTO v_second_session FROM activation_funnel_events WHERE event_type = 'second_session_returned';
  SELECT COUNT(DISTINCT user_id) INTO v_day2 FROM activation_funnel_events WHERE event_type = 'day2_retained';
  SELECT COUNT(DISTINCT user_id) INTO v_day7 FROM activation_funnel_events WHERE event_type = 'day7_retained';

  SELECT jsonb_build_object(
    'counts', jsonb_build_object(
      'waitlist_signed_up', v_waitlist_signed_up,
      'waitlist_email_sent', v_waitlist_email_sent,
      'approval_email_sent', v_approval_email_sent,
      'invite_link_opened', v_invite_link_opened,
      'invite_token_validated', v_invite_token_validated,
      'password_set', v_password_set,
      'activation_completed', v_activation_completed,
      'first_login', v_first_login,
      'first_capture_created', v_first_capture,
      'first_project_created', v_first_project,
      'first_memory_created', v_first_memory,
      'second_session_returned', v_second_session,
      'day2_retained', v_day2,
      'day7_retained', v_day7
    ),
    'rates', jsonb_build_object(
      'signup_to_waitlist_email_rate', CASE WHEN v_waitlist_signed_up > 0 THEN ROUND((v_waitlist_email_sent::numeric / v_waitlist_signed_up) * 100, 1) ELSE 0 END,
      'approval_to_open_rate', CASE WHEN v_approval_email_sent > 0 THEN ROUND((v_invite_link_opened::numeric / v_approval_email_sent) * 100, 1) ELSE 0 END,
      'open_to_valid_token_rate', CASE WHEN v_invite_link_opened > 0 THEN ROUND((v_invite_token_validated::numeric / v_invite_link_opened) * 100, 1) ELSE 0 END,
      'valid_token_to_password_rate', CASE WHEN v_invite_token_validated > 0 THEN ROUND((v_password_set::numeric / v_invite_token_validated) * 100, 1) ELSE 0 END,
      'password_to_activation_rate', CASE WHEN v_password_set > 0 THEN ROUND((v_activation_completed::numeric / v_password_set) * 100, 1) ELSE 0 END,
      'activation_to_first_login_rate', CASE WHEN v_activation_completed > 0 THEN ROUND((v_first_login::numeric / v_activation_completed) * 100, 1) ELSE 0 END,
      'activation_to_first_capture_rate', CASE WHEN v_activation_completed > 0 THEN ROUND((v_first_capture::numeric / v_activation_completed) * 100, 1) ELSE 0 END,
      'activation_to_second_session_rate', CASE WHEN v_activation_completed > 0 THEN ROUND((v_second_session::numeric / v_activation_completed) * 100, 1) ELSE 0 END,
      'activation_to_day2_rate', CASE WHEN v_activation_completed > 0 THEN ROUND((v_day2::numeric / v_activation_completed) * 100, 1) ELSE 0 END,
      'activation_to_day7_rate', CASE WHEN v_activation_completed > 0 THEN ROUND((v_day7::numeric / v_activation_completed) * 100, 1) ELSE 0 END
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- RPC: get_activation_cohorts
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_activation_cohorts()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(row_data ORDER BY activation_day DESC), '[]'::jsonb) INTO result
  FROM (
    SELECT
      d.activation_day,
      jsonb_build_object(
        'activation_day', d.activation_day,
        'signups', (SELECT COUNT(DISTINCT COALESCE(user_id::text, waitlist_signup_email)) FROM activation_funnel_events WHERE event_type = 'waitlist_signed_up' AND created_at::date = d.activation_day),
        'approvals', (SELECT COUNT(DISTINCT COALESCE(user_id::text, waitlist_signup_email)) FROM activation_funnel_events WHERE event_type = 'approval_email_sent' AND created_at::date = d.activation_day),
        'activations', (SELECT COUNT(DISTINCT COALESCE(user_id::text, waitlist_signup_email)) FROM activation_funnel_events WHERE event_type = 'activation_completed' AND created_at::date = d.activation_day),
        'first_logins', (SELECT COUNT(DISTINCT user_id) FROM activation_funnel_events WHERE event_type = 'first_login' AND created_at::date = d.activation_day),
        'first_captures', (SELECT COUNT(DISTINCT user_id) FROM activation_funnel_events WHERE event_type = 'first_capture_created' AND created_at::date = d.activation_day),
        'day2_retained', (SELECT COUNT(DISTINCT user_id) FROM activation_funnel_events WHERE event_type = 'day2_retained' AND created_at::date = d.activation_day),
        'day7_retained', (SELECT COUNT(DISTINCT user_id) FROM activation_funnel_events WHERE event_type = 'day7_retained' AND created_at::date = d.activation_day)
      ) AS row_data
    FROM (SELECT DISTINCT created_at::date AS activation_day FROM activation_funnel_events) d
  ) sub;

  RETURN result;
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- RPC: get_activation_health_score
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_activation_health_score()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_signups bigint;
  v_activations bigint;
  v_first_login bigint;
  v_first_capture bigint;
  v_second_session bigint;
  v_day2 bigint;
  v_day7 bigint;
  v_activation_rate numeric;
  v_login_rate numeric;
  v_capture_rate numeric;
  v_session_rate numeric;
  v_day2_rate numeric;
  v_day7_rate numeric;
  v_score numeric;
  v_label text;
  v_stages jsonb;
  v_biggest_dropoff text;
  v_strongest text;
  v_min_rate numeric;
  v_max_rate numeric;
  v_action text;
BEGIN
  SELECT COUNT(DISTINCT COALESCE(user_id::text, waitlist_signup_email)) INTO v_signups FROM activation_funnel_events WHERE event_type = 'waitlist_signed_up';
  SELECT COUNT(DISTINCT COALESCE(user_id::text, waitlist_signup_email)) INTO v_activations FROM activation_funnel_events WHERE event_type = 'activation_completed';
  SELECT COUNT(DISTINCT user_id) INTO v_first_login FROM activation_funnel_events WHERE event_type = 'first_login';
  SELECT COUNT(DISTINCT user_id) INTO v_first_capture FROM activation_funnel_events WHERE event_type = 'first_capture_created';
  SELECT COUNT(DISTINCT user_id) INTO v_second_session FROM activation_funnel_events WHERE event_type = 'second_session_returned';
  SELECT COUNT(DISTINCT user_id) INTO v_day2 FROM activation_funnel_events WHERE event_type = 'day2_retained';
  SELECT COUNT(DISTINCT user_id) INTO v_day7 FROM activation_funnel_events WHERE event_type = 'day7_retained';

  v_activation_rate := CASE WHEN v_signups > 0 THEN (v_activations::numeric / v_signups) * 100 ELSE 0 END;
  v_login_rate := CASE WHEN v_activations > 0 THEN (v_first_login::numeric / v_activations) * 100 ELSE 0 END;
  v_capture_rate := CASE WHEN v_activations > 0 THEN (v_first_capture::numeric / v_activations) * 100 ELSE 0 END;
  v_session_rate := CASE WHEN v_activations > 0 THEN (v_second_session::numeric / v_activations) * 100 ELSE 0 END;
  v_day2_rate := CASE WHEN v_activations > 0 THEN (v_day2::numeric / v_activations) * 100 ELSE 0 END;
  v_day7_rate := CASE WHEN v_activations > 0 THEN (v_day7::numeric / v_activations) * 100 ELSE 0 END;

  -- Weighted score: activation 25%, login 20%, capture 20%, session 15%, day2 10%, day7 10%
  v_score := LEAST(100, GREATEST(0,
    (v_activation_rate * 0.25) + (v_login_rate * 0.20) + (v_capture_rate * 0.20) +
    (v_session_rate * 0.15) + (v_day2_rate * 0.10) + (v_day7_rate * 0.10)
  ));

  v_label := CASE
    WHEN v_score >= 75 THEN 'strong'
    WHEN v_score >= 50 THEN 'stable'
    WHEN v_score >= 25 THEN 'weak'
    ELSE 'poor'
  END;

  -- Find biggest dropoff and strongest stage
  v_stages := jsonb_build_object(
    'activation', v_activation_rate,
    'first_login', v_login_rate,
    'first_capture', v_capture_rate,
    'second_session', v_session_rate,
    'day2_retention', v_day2_rate,
    'day7_retention', v_day7_rate
  );

  v_min_rate := LEAST(v_activation_rate, v_login_rate, v_capture_rate, v_session_rate, v_day2_rate, v_day7_rate);
  v_max_rate := GREATEST(v_activation_rate, v_login_rate, v_capture_rate, v_session_rate, v_day2_rate, v_day7_rate);

  v_biggest_dropoff := CASE v_min_rate
    WHEN v_activation_rate THEN 'activation'
    WHEN v_login_rate THEN 'first_login'
    WHEN v_capture_rate THEN 'first_capture'
    WHEN v_session_rate THEN 'second_session'
    WHEN v_day2_rate THEN 'day2_retention'
    ELSE 'day7_retention'
  END;

  v_strongest := CASE v_max_rate
    WHEN v_activation_rate THEN 'activation'
    WHEN v_login_rate THEN 'first_login'
    WHEN v_capture_rate THEN 'first_capture'
    WHEN v_session_rate THEN 'second_session'
    WHEN v_day2_rate THEN 'day2_retention'
    ELSE 'day7_retention'
  END;

  v_action := CASE v_biggest_dropoff
    WHEN 'activation' THEN 'Improve invite-to-activation conversion — simplify password setup or add social proof'
    WHEN 'first_login' THEN 'Ensure post-activation redirect lands users in the app immediately'
    WHEN 'first_capture' THEN 'Add onboarding prompt to create first capture during initial session'
    WHEN 'second_session' THEN 'Send a follow-up email or push notification to bring users back'
    WHEN 'day2_retention' THEN 'Add day-1 engagement email with value highlights'
    WHEN 'day7_retention' THEN 'Implement weekly digest email to drive re-engagement'
    ELSE 'Monitor all stages — no clear single dropoff point'
  END;

  RETURN jsonb_build_object(
    'activation_health_score', ROUND(v_score, 1),
    'health_label', v_label,
    'biggest_dropoff_stage', v_biggest_dropoff,
    'strongest_stage', v_strongest,
    'recommended_action', v_action,
    'stage_rates', v_stages
  );
END;
$$;
