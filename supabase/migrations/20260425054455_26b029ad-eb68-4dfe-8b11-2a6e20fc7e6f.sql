-- SEO metadata table
CREATE TABLE IF NOT EXISTS public.seo_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  keywords TEXT[] NOT NULL DEFAULT '{}',
  ai_generated BOOLEAN NOT NULL DEFAULT false,
  impressions INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.seo_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view seo metadata"
  ON public.seo_metadata FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service role manages seo metadata"
  ON public.seo_metadata FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE TRIGGER update_seo_metadata_updated_at
  BEFORE UPDATE ON public.seo_metadata
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_seo_metadata_slug ON public.seo_metadata (page_slug);

-- Seed default pages
INSERT INTO public.seo_metadata (page_slug, title, description, keywords, ai_generated) VALUES
  ('/', 'InsightHalo — Your AI Second Brain', 'Capture thoughts, voice notes, screenshots, and files instantly. AI organizes everything so you never lose a valuable idea.', ARRAY['second brain','ai notes','voice capture','productivity','memory assistant'], false),
  ('/waitlist', 'Join the InsightHalo Waitlist', 'Get early access to InsightHalo — the AI second brain that captures and organizes everything you think.', ARRAY['waitlist','second brain','early access'], false),
  ('/learn/second-brain-app', 'Second Brain App — InsightHalo', 'A modern second brain app that captures, organizes, and resurfaces every thought, idea, and reminder using AI.', ARRAY['second brain app','knowledge management','ai notes'], false),
  ('/learn/capture-thoughts-fast', 'Capture Thoughts Fast — InsightHalo', 'Capture thoughts the moment they happen. Text, voice, screenshots — InsightHalo turns fleeting ideas into structured memory.', ARRAY['capture thoughts fast','quick capture','note taking'], false),
  ('/learn/voice-capture-productivity', 'Voice Capture for Productivity — InsightHalo', 'Speak your ideas, tasks and reminders. InsightHalo transcribes, organizes, and routes them automatically.', ARRAY['voice capture','voice notes','productivity'], false),
  ('/learn/ai-planner-assistant', 'AI Planner Assistant — InsightHalo', 'An AI planner that organizes your day, tracks projects, and reminds you about what matters most.', ARRAY['ai planner','assistant','task management'], false),
  ('/learn/memory-assistant-software', 'Memory Assistant Software — InsightHalo', 'Memory assistant software that remembers everything for you and resurfaces it at the right moment.', ARRAY['memory assistant','knowledge software','ai memory'], false)
ON CONFLICT (page_slug) DO NOTHING;

-- Founder-only SEO signals RPC
CREATE OR REPLACE FUNCTION public.get_seo_signals()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_top_pages jsonb;
  v_top_keywords jsonb;
  v_total_impressions int;
  v_total_clicks int;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  IF v_email IS NULL OR LOWER(v_email) <> 'shamcharan@icloud.com' THEN
    RETURN jsonb_build_object('error', 'forbidden');
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'page_slug', page_slug,
    'title', title,
    'impressions', impressions,
    'clicks', clicks,
    'ctr', CASE WHEN impressions > 0 THEN ROUND((clicks::numeric / impressions) * 100, 2) ELSE 0 END
  ) ORDER BY impressions DESC), '[]'::jsonb)
  INTO v_top_pages
  FROM public.seo_metadata;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'keyword', kw,
    'impressions', total_impr
  ) ORDER BY total_impr DESC), '[]'::jsonb)
  INTO v_top_keywords
  FROM (
    SELECT UNNEST(keywords) AS kw, SUM(impressions)::int AS total_impr
    FROM public.seo_metadata
    GROUP BY kw
    ORDER BY total_impr DESC
    LIMIT 20
  ) k;

  SELECT COALESCE(SUM(impressions),0)::int, COALESCE(SUM(clicks),0)::int
    INTO v_total_impressions, v_total_clicks
    FROM public.seo_metadata;

  RETURN jsonb_build_object(
    'top_pages', v_top_pages,
    'top_keywords', v_top_keywords,
    'total_impressions', v_total_impressions,
    'total_clicks', v_total_clicks,
    'overall_ctr', CASE WHEN v_total_impressions > 0
      THEN ROUND((v_total_clicks::numeric / v_total_impressions) * 100, 2) ELSE 0 END
  );
END;
$$;