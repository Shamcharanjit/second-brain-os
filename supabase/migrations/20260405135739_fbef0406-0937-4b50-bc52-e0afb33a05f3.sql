
-- Extraction results for capture attachments
CREATE TABLE public.capture_attachment_extractions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attachment_id   UUID NOT NULL REFERENCES public.capture_attachments(id) ON DELETE CASCADE,
  capture_id      UUID NOT NULL REFERENCES public.user_captures(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending',
  kind            TEXT NOT NULL,
  provider        TEXT,
  model           TEXT,
  extracted_text  TEXT,
  summary         TEXT,
  structured_json JSONB,
  error_message   TEXT,
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.capture_attachment_extractions ENABLE ROW LEVEL SECURITY;

-- Users can read their own extractions
CREATE POLICY "Users can view own extractions"
ON public.capture_attachment_extractions
FOR SELECT
USING (auth.uid() = user_id);

-- Service role can do everything (edge functions use service role)
CREATE POLICY "Service role full access on extractions"
ON public.capture_attachment_extractions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Indexes
CREATE INDEX idx_extractions_attachment ON public.capture_attachment_extractions (attachment_id);
CREATE INDEX idx_extractions_capture ON public.capture_attachment_extractions (capture_id);
CREATE INDEX idx_extractions_status ON public.capture_attachment_extractions (status);
CREATE INDEX idx_extractions_user_created ON public.capture_attachment_extractions (user_id, created_at DESC);

-- Reuse existing updated_at trigger
CREATE TRIGGER update_extractions_updated_at
  BEFORE UPDATE ON public.capture_attachment_extractions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
