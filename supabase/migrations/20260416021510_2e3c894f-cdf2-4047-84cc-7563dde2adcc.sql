-- ═══ TABLE 1: announcements — make read-only for authenticated ═══
DROP POLICY IF EXISTS "Authenticated users can insert announcements" ON public.announcements;
DROP POLICY IF EXISTS "Authenticated users can update announcements" ON public.announcements;
DROP POLICY IF EXISTS "Authenticated users can delete announcements" ON public.announcements;

-- ═══ TABLE 2: paywall_variants — make read-only for authenticated ═══
DROP POLICY IF EXISTS "Authenticated users can insert variants" ON public.paywall_variants;
DROP POLICY IF EXISTS "Authenticated users can update variants" ON public.paywall_variants;
DROP POLICY IF EXISTS "Authenticated users can delete variants" ON public.paywall_variants;

-- ═══ TABLE 3: upgrade_prompt_rules — make read-only for authenticated ═══
DROP POLICY IF EXISTS "Authenticated users can insert rules" ON public.upgrade_prompt_rules;
DROP POLICY IF EXISTS "Authenticated users can update rules" ON public.upgrade_prompt_rules;
DROP POLICY IF EXISTS "Authenticated users can delete rules" ON public.upgrade_prompt_rules;

-- ═══ TABLE 4: waitlist_signups — tighten public INSERT guard ═══
DROP POLICY IF EXISTS "Public can insert waitlist signups" ON public.waitlist_signups;

CREATE POLICY "Public can insert waitlist signups (guarded)"
  ON public.waitlist_signups
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    referral_count = 0
    AND referral_reward_level = 0
    AND invited = false
    AND status = 'pending'
    AND invite_token IS NULL
    AND invite_sent_at IS NULL
    AND activation_completed_at IS NULL
  );