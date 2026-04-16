
-- ═══ A) conversion_campaigns: make read-only for authenticated ═══
DROP POLICY IF EXISTS "Authenticated users can insert campaigns" ON public.conversion_campaigns;
DROP POLICY IF EXISTS "Authenticated users can update campaigns" ON public.conversion_campaigns;
DROP POLICY IF EXISTS "Authenticated users can delete campaigns" ON public.conversion_campaigns;

-- ═══ B) rollout_decisions: make read-only for authenticated ═══
DROP POLICY IF EXISTS "Authenticated users can insert rollout decisions" ON public.rollout_decisions;
DROP POLICY IF EXISTS "Authenticated users can update rollout decisions" ON public.rollout_decisions;

-- ═══ C) waitlist_signups: remove authenticated UPDATE ═══
DROP POLICY IF EXISTS "Authenticated users can update waitlist" ON public.waitlist_signups;
