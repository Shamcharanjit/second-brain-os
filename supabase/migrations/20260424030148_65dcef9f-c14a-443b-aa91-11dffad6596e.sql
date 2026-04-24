-- Redefine get_rebuilt_funnel() to return the full counts + rates payload
-- expected by the ActivationFunnelPanel dashboard.

CREATE OR REPLACE FUNCTION public.get_rebuilt_funnel()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_waitlist_signed_up bigint := 0;
  v_waitlist_email_sent bigint := 0;
  v_approval_email_sent bigint := 0;
  v_invite_link_opened bigint := 0;
  v_invite_token_validated bigint := 0;
  v_password_set bigint := 0;
  v_activation_completed bigint := 0;
  v_first_login bigint := 0;
  v_first_capture bigint := 0;
  v_day2 bigint := 0;
  v_day7 bigint := 0;

  -- Reconciliation counts from authoritative tables
  v_waitlist_table bigint := 0;
  v_invite_sent_table bigint := 0;
  v_invite_opened_table bigint := 0;
  v_activated_table bigint := 0;
BEGIN
  -- Event-based counts (distinct users / emails)
  SELECT COUNT(DISTINCT COALESCE(user_id::text, waitlist_signup_email))
    INTO v_waitlist_signed_up
    FROM public.activation_funnel_events
    WHERE event_type = 'waitlist_signed_up';

  SELECT COUNT(DISTINCT COALESCE(user_id::text, waitlist_signup_email))
    INTO v_waitlist_email_sent
    FROM public.activation_funnel_events
    WHERE event_type = 'waitlist_email_sent';

  SELECT COUNT(DISTINCT COALESCE(user_id::text, waitlist_signup_email))
    INTO v_approval_email_sent
    FROM public.activation_funnel_events
    WHERE event_type = 'approval_email_sent';

  SELECT COUNT(DISTINCT COALESCE(user_id::text, waitlist_signup_email))
    INTO v_invite_link_opened
    FROM public.activation_funnel_events
    WHERE event_type = 'invite_link_opened';

  SELECT COUNT(DISTINCT COALESCE(user_id::text, waitlist_signup_email))
    INTO v_invite_token_validated
    FROM public.activation_funnel_events
    WHERE event_type = 'invite_token_validated';

  SELECT COUNT(DISTINCT COALESCE(user_id::text, waitlist_signup_email))
    INTO v_password_set
    FROM public.activation_funnel_events
    WHERE event_type = 'password_set';

  SELECT COUNT(DISTINCT COALESCE(user_id::text, waitlist_signup_email))
    INTO v_activation_completed
    FROM public.activation_funnel_events
    WHERE event_type = 'activation_completed';

  SELECT COUNT(DISTINCT user_id)
    INTO v_first_login
    FROM public.activation_funnel_events
    WHERE event_type = 'first_login';

  SELECT COUNT(DISTINCT user_id)
    INTO v_first_capture
    FROM public.activation_funnel_events
    WHERE event_type = 'first_capture_created';

  SELECT COUNT(DISTINCT user_id)
    INTO v_day2
    FROM public.activation_funnel_events
    WHERE event_type = 'day2_retained';

  SELECT COUNT(DISTINCT user_id)
    INTO v_day7
    FROM public.activation_funnel_events
    WHERE event_type = 'day7_retained';

  -- Reconcile against authoritative tables (events may lag behind real state)
  SELECT COUNT(*) INTO v_waitlist_table FROM public.waitlist_signups;
  SELECT COUNT(*) INTO v_invite_sent_table FROM public.waitlist_signups WHERE invite_sent_at IS NOT NULL;
  SELECT COUNT(*) INTO v_invite_opened_table FROM public.waitlist_signups WHERE invite_opened_at IS NOT NULL;
  SELECT COUNT(*) INTO v_activated_table FROM public.waitlist_signups WHERE activation_completed_at IS NOT NULL;

  v_waitlist_signed_up   := GREATEST(v_waitlist_signed_up, v_waitlist_table);
  v_approval_email_sent  := GREATEST(v_approval_email_sent, v_invite_sent_table);
  v_invite_link_opened   := GREATEST(v_invite_link_opened, v_invite_opened_table);
  v_activation_completed := GREATEST(v_activation_completed, v_activated_table);

  RETURN jsonb_build_object(
    'counts', jsonb_build_object(
      'waitlist_signed_up',     v_waitlist_signed_up,
      'waitlist_email_sent',    v_waitlist_email_sent,
      'approval_email_sent',    v_approval_email_sent,
      'invite_link_opened',     v_invite_link_opened,
      'invite_token_validated', v_invite_token_validated,
      'password_set',           v_password_set,
      'activation_completed',   v_activation_completed,
      'first_login',            v_first_login,
      'first_capture_created',  v_first_capture,
      'day2_retained',          v_day2,
      'day7_retained',          v_day7
    ),
    'rates', jsonb_build_object(
      'signup_to_email_rate',         CASE WHEN v_waitlist_signed_up > 0     THEN LEAST(100, ROUND((v_waitlist_email_sent::numeric    / v_waitlist_signed_up) * 100, 1)) ELSE 0 END,
      'signup_to_approval_rate',      CASE WHEN v_waitlist_signed_up > 0     THEN LEAST(100, ROUND((v_approval_email_sent::numeric    / v_waitlist_signed_up) * 100, 1)) ELSE 0 END,
      'approval_to_open_rate',        CASE WHEN v_approval_email_sent > 0    THEN LEAST(100, ROUND((v_invite_link_opened::numeric     / v_approval_email_sent) * 100, 1)) ELSE 0 END,
      'open_to_valid_token_rate',     CASE WHEN v_invite_link_opened > 0     THEN LEAST(100, ROUND((v_invite_token_validated::numeric / v_invite_link_opened) * 100, 1)) ELSE 0 END,
      'valid_token_to_password_rate', CASE WHEN v_invite_token_validated > 0 THEN LEAST(100, ROUND((v_password_set::numeric           / v_invite_token_validated) * 100, 1)) ELSE 0 END,
      'password_to_activation_rate',  CASE WHEN v_password_set > 0           THEN LEAST(100, ROUND((v_activation_completed::numeric   / v_password_set) * 100, 1)) ELSE 0 END,
      'activation_to_login_rate',     CASE WHEN v_activation_completed > 0   THEN LEAST(100, ROUND((v_first_login::numeric            / v_activation_completed) * 100, 1)) ELSE 0 END,
      'activation_to_capture_rate',   CASE WHEN v_activation_completed > 0   THEN LEAST(100, ROUND((v_first_capture::numeric          / v_activation_completed) * 100, 1)) ELSE 0 END,
      'activation_to_day2_rate',      CASE WHEN v_activation_completed > 0   THEN LEAST(100, ROUND((v_day2::numeric                   / v_activation_completed) * 100, 1)) ELSE 0 END,
      'activation_to_day7_rate',      CASE WHEN v_activation_completed > 0   THEN LEAST(100, ROUND((v_day7::numeric                   / v_activation_completed) * 100, 1)) ELSE 0 END
    )
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_rebuilt_funnel() TO authenticated;