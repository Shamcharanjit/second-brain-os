-- ═══════════════════════════════════════════════════════════════
-- SEO Attribution & Performance Intelligence (Phase 3)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.visitor_attribution (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anonymous_id    TEXT NOT NULL,
  user_id         UUID,
  email           TEXT,
  source          TEXT NOT NULL DEFAULT 'unknown',
  referrer_url    TEXT,
  landing_page    TEXT,
  utm_source      TEXT,
  utm_medium      TEXT,
  utm_campaign    TEXT,
  country         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  converted_at    TIMESTAMPTZ,
  activated_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_visitor_attr_anon ON public.visitor_attribution (anonymous_id);
CREATE INDEX IF NOT EXISTS idx_visitor_attr_user ON public.visitor_attribution (user_id);
CREATE INDEX IF NOT EXISTS idx_visitor_attr_email ON public.visitor_attribution (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_visitor_attr_source ON public.visitor_attribution (source);
CREATE INDEX IF NOT EXISTS idx_visitor_attr_created ON public.visitor_attribution (created_at DESC);

ALTER TABLE public.visitor_attribution ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous) can insert visit rows
DROP POLICY IF EXISTS "Anyone can insert attribution" ON public.visitor_attribution;
CREATE POLICY "Anyone can insert attribution"
  ON public.visitor_attribution FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Anyone can update their own anonymous row (to attach user_id/email after signup)
DROP POLICY IF EXISTS "Anyone can update attribution" ON public.visitor_attribution;
CREATE POLICY "Anyone can update attribution"
  ON public.visitor_attribution FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Service role full access
DROP POLICY IF EXISTS "Service role full access on attribution" ON public.visitor_attribution;
CREATE POLICY "Service role full access on attribution"
  ON public.visitor_attribution FOR ALL
  TO service_role USING (true) WITH CHECK (true);

-- Authenticated can view (gated again at RPC level for founder-only analytics)
DROP POLICY IF EXISTS "Authenticated can view attribution" ON public.visitor_attribution;
CREATE POLICY "Authenticated can view attribution"
  ON public.visitor_attribution FOR SELECT
  TO authenticated USING (true);

-- ─── Founder-only analytics RPC ───
CREATE OR REPLACE FUNCTION public.get_seo_performance_signals()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_search_sources text[] := ARRAY['google','bing','duckduckgo','yahoo','yandex','baidu','ecosia','brave'];
  v_source_counts jsonb;
  v_search_visitors int := 0;
  v_search_signups int := 0;
  v_search_activations int := 0;
  v_landing jsonb;
  v_country jsonb;
  v_top_sources jsonb;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  IF v_email IS NULL OR LOWER(v_email) <> 'shamcharan@icloud.com' THEN
    RETURN jsonb_build_object('error', 'forbidden');
  END IF;

  -- Source counts
  SELECT COALESCE(jsonb_object_agg(source, c), '{}'::jsonb) INTO v_source_counts
  FROM (
    SELECT source, COUNT(*)::int AS c
    FROM public.visitor_attribution
    GROUP BY source
  ) s;

  -- Search totals
  SELECT
    COUNT(*) FILTER (WHERE source = ANY(v_search_sources))::int,
    COUNT(*) FILTER (WHERE source = ANY(v_search_sources) AND converted_at IS NOT NULL)::int,
    COUNT(*) FILTER (WHERE source = ANY(v_search_sources) AND activated_at IS NOT NULL)::int
  INTO v_search_visitors, v_search_signups, v_search_activations
  FROM public.visitor_attribution;

  -- Landing page performance
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_landing FROM (
    SELECT
      COALESCE(landing_page, '/') AS landing_page,
      COUNT(*)::int AS visitors,
      COUNT(*) FILTER (WHERE converted_at IS NOT NULL)::int AS signups,
      COUNT(*) FILTER (WHERE activated_at IS NOT NULL)::int AS activations,
      CASE WHEN COUNT(*) > 0
        THEN ROUND((COUNT(*) FILTER (WHERE converted_at IS NOT NULL)::numeric / COUNT(*)) * 100, 1)
        ELSE 0 END AS conversion_rate
    FROM public.visitor_attribution
    GROUP BY landing_page
    ORDER BY visitors DESC
    LIMIT 20
  ) t;

  -- Country performance (search-only)
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_country FROM (
    SELECT
      COALESCE(NULLIF(country, ''), 'Unknown') AS country,
      COUNT(*)::int AS search_visitors,
      COUNT(*) FILTER (WHERE converted_at IS NOT NULL)::int AS signups,
      COUNT(*) FILTER (WHERE activated_at IS NOT NULL)::int AS activations
    FROM public.visitor_attribution
    WHERE source = ANY(v_search_sources)
    GROUP BY country
    ORDER BY search_visitors DESC
    LIMIT 20
  ) t;

  -- Top search sources
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_top_sources FROM (
    SELECT
      source,
      COUNT(*)::int AS visitors,
      COUNT(*) FILTER (WHERE converted_at IS NOT NULL)::int AS signups,
      COUNT(*) FILTER (WHERE activated_at IS NOT NULL)::int AS activations
    FROM public.visitor_attribution
    WHERE source = ANY(v_search_sources)
    GROUP BY source
    ORDER BY visitors DESC
  ) t;

  RETURN jsonb_build_object(
    'source_counts', v_source_counts,
    'search_visitors', v_search_visitors,
    'search_signups', v_search_signups,
    'search_activations', v_search_activations,
    'search_to_signup_rate', CASE WHEN v_search_visitors > 0
      THEN ROUND((v_search_signups::numeric / v_search_visitors) * 100, 1) ELSE 0 END,
    'search_to_activation_rate', CASE WHEN v_search_visitors > 0
      THEN ROUND((v_search_activations::numeric / v_search_visitors) * 100, 1) ELSE 0 END,
    'landing_page_performance', v_landing,
    'country_performance', v_country,
    'top_search_sources', v_top_sources
  );
END;
$$;