
-- Allow authenticated users to read all waitlist entries
CREATE POLICY "Authenticated users can view waitlist"
  ON public.waitlist_signups
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to update waitlist entries (invite, status, notes)
CREATE POLICY "Authenticated users can update waitlist"
  ON public.waitlist_signups
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
