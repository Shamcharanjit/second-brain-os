
-- Drop the overly permissive update policy
DROP POLICY "Service role can update subscriptions" ON public.user_subscriptions;

-- Create a restrictive update policy - only service_role can update
-- Regular authenticated users cannot modify their subscription directly
CREATE POLICY "Service role can update subscriptions"
ON public.user_subscriptions
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);
