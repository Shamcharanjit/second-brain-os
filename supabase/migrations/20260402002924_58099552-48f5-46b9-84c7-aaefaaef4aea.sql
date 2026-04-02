
-- 1. Private storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('capture-uploads', 'capture-uploads', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Storage RLS policies
CREATE POLICY "Users can upload own capture files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'capture-uploads'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can read own capture files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'capture-uploads'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own capture files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'capture-uploads'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 3. capture_attachments table
CREATE TABLE public.capture_attachments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL,
  capture_id     UUID NOT NULL REFERENCES public.user_captures(id) ON DELETE CASCADE,
  bucket         TEXT NOT NULL DEFAULT 'capture-uploads',
  storage_path   TEXT NOT NULL,
  file_name      TEXT NOT NULL,
  mime_type      TEXT,
  file_size      BIGINT,
  file_kind      TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'uploaded',
  extracted_text TEXT,
  metadata       JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Indexes
CREATE INDEX idx_attachments_user_created ON public.capture_attachments (user_id, created_at DESC);
CREATE INDEX idx_attachments_capture ON public.capture_attachments (capture_id);
CREATE INDEX idx_attachments_status ON public.capture_attachments (status);

-- 5. RLS
ALTER TABLE public.capture_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own attachments"
ON public.capture_attachments FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own attachments"
ON public.capture_attachments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own attachments"
ON public.capture_attachments FOR UPDATE
USING (auth.uid() = user_id);

-- 6. updated_at trigger
CREATE TRIGGER update_attachments_updated_at
  BEFORE UPDATE ON public.capture_attachments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
