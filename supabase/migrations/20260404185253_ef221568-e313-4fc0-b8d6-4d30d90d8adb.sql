CREATE POLICY "Users can delete own attachments"
ON public.capture_attachments
FOR DELETE
USING (auth.uid() = user_id);