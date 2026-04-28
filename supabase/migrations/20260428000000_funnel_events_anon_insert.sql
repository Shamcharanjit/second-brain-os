-- ============================================================================
-- Allow anonymous (pre-auth) users to log waitlist-stage funnel events.
-- ============================================================================
-- Waitlist signups happen BEFORE the user has an auth.uid(), so the existing
-- "auth.uid() = user_id" policy blocks them. This migration adds a narrow
-- policy that allows anon inserts ONLY for pre-auth event types.
--
-- Idempotent — safe to re-run.
-- ============================================================================

DROP POLICY IF EXISTS "Anon can insert pre-auth funnel events"
  ON public.activation_funnel_events;

CREATE POLICY "Anon can insert pre-auth funnel events"
  ON public.activation_funnel_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    -- Allow only pre-auth waitlist event types, and require user_id IS NULL
    -- (so this policy can't be abused to write events on behalf of other users)
    user_id IS NULL
    AND event_type IN (
      'waitlist_signed_up',
      'waitlist_email_sent',
      'invite_email_sent',
      'invite_email_opened',
      'invite_token_validated',
      'invite_password_set'
    )
  );

-- Comment for future reference
COMMENT ON POLICY "Anon can insert pre-auth funnel events"
  ON public.activation_funnel_events IS
  'Allows logging waitlist/invite funnel events before the user has authenticated. Restricted to pre-auth event types and user_id = NULL to prevent abuse.';
