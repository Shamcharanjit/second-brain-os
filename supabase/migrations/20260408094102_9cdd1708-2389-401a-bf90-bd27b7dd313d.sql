
CREATE POLICY "Authenticated users can insert announcements"
  ON public.announcements FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update announcements"
  ON public.announcements FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete announcements"
  ON public.announcements FOR DELETE TO authenticated USING (true);
