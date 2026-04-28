-- ============================================================================
-- Fix: correct event_type names in the pre-auth funnel events policy.
-- The frontend fires `invite_link_opened` and `password_set`, not the names
-- I originally guessed. Replace the policy with the correct whitelist.
-- ============================================================================

DROP POLICY IF EXISTS "Anon can insert pre-auth funnel events"
  ON public.activation_funnel_events;

CREATE POLICY "Anon can insert pre-auth funnel events"
  ON public.activation_funnel_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    user_id IS NULL
    AND event_type IN (
      'waitlist_signed_up',
      'waitlist_email_sent',
      'invite_email_sent',
      'invite_link_opened',
      'invite_token_validated',
      'password_set'
    )
  );

COMMENT ON POLICY "Anon can insert pre-auth funnel events"
  ON public.activation_funnel_events IS
  'Allows logging waitlist/invite funnel events before the user has authenticated. Restricted to pre-auth event types (matching frontend logFunnelEvent calls) and user_id = NULL to prevent abuse.';
