DROP POLICY IF EXISTS "Anyone can update attribution" ON public.visitor_attribution;

-- Allow update only if the row is unclaimed OR already belongs to current user
CREATE POLICY "Update unclaimed or own attribution"
  ON public.visitor_attribution FOR UPDATE
  TO anon, authenticated
  USING (user_id IS NULL OR user_id = auth.uid())
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());