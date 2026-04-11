-- Fix RLS on activation_funnel_events to allow pre-auth (email-only) inserts
-- Drop the existing insert policy that requires auth.uid() = user_id
DROP POLICY IF EXISTS "Users can insert own funnel events" ON public.activation_funnel_events;

-- New policy: allow inserts when user_id matches auth.uid() OR user_id is null (pre-auth events)
CREATE POLICY "Users can insert funnel events"
ON public.activation_funnel_events
FOR INSERT
TO anon, authenticated
WITH CHECK (
  user_id IS NULL OR auth.uid() = user_id
);