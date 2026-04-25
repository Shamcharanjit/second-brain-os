
-- ============================================================
-- PART 2: Announcements audience filtering
-- ============================================================
ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS audience text NOT NULL DEFAULT 'user';

ALTER TABLE public.announcements
  DROP CONSTRAINT IF EXISTS announcements_audience_check;
ALTER TABLE public.announcements
  ADD CONSTRAINT announcements_audience_check
  CHECK (audience IN ('user', 'admin', 'internal'));

CREATE INDEX IF NOT EXISTS idx_announcements_audience
  ON public.announcements (audience, status);

-- Backfill: re-tag internal-sounding updates
UPDATE public.announcements
SET audience = 'internal'
WHERE audience = 'user'
  AND (
    title ILIKE '%seo%' OR title ILIKE '%metadata%' OR title ILIKE '%schema%'
    OR title ILIKE '%migration%' OR title ILIKE '%pipeline%' OR title ILIKE '%backfill%'
    OR title ILIKE '%ingestion%' OR title ILIKE '%database%' OR title ILIKE '%infrastructure%'
    OR message ILIKE '%schema migration%' OR message ILIKE '%backfill%'
  );

-- ============================================================
-- PART 4/5: SEO metadata table extensions
-- ============================================================
ALTER TABLE public.seo_metadata
  ADD COLUMN IF NOT EXISTS og_title text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS og_description text NOT NULL DEFAULT '';

-- ============================================================
-- PART 4: get_seo_metadata_coverage (founder-only)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_seo_metadata_coverage()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_total int;
  v_with int;
  v_announcement int;
  v_referral int;
  v_activation int;
  v_landing int;
  v_known_pages text[] := ARRAY[
    '/', '/auth', '/waitlist', '/invite', '/reset-password',
    '/app', '/app/today', '/app/inbox', '/app/ideas', '/app/projects',
    '/app/memory', '/app/review', '/app/upgrade', '/app/settings',
    '/app/help', '/app/voice-capture', '/app/capture-gateway', '/app/ai-review',
    '/learn', '/privacy', '/terms',
    '/admin/analytics', '/admin/announcements', '/admin/waitlist', '/admin/plans',
    '/referral', '/growth-intelligence',
    '/learn/second-brain-app', '/learn/capture-thoughts-fast',
    '/learn/voice-capture-productivity', '/learn/ai-planner-assistant',
    '/learn/memory-assistant-software'
  ];
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  IF v_email IS NULL OR LOWER(v_email) <> 'shamcharan@icloud.com' THEN
    RETURN jsonb_build_object('error', 'forbidden');
  END IF;

  v_total := array_length(v_known_pages, 1);

  SELECT COUNT(*) INTO v_with
    FROM public.seo_metadata
    WHERE page_slug = ANY(v_known_pages)
      AND COALESCE(title,'') <> ''
      AND COALESCE(description,'') <> '';

  SELECT COUNT(*) INTO v_announcement FROM public.seo_metadata WHERE page_slug ILIKE '%announce%';
  SELECT COUNT(*) INTO v_referral FROM public.seo_metadata WHERE page_slug ILIKE '%referral%' OR page_slug ILIKE '%invite%';
  SELECT COUNT(*) INTO v_activation FROM public.seo_metadata WHERE page_slug ILIKE '%waitlist%' OR page_slug ILIKE '%auth%' OR page_slug ILIKE '%reset%';
  SELECT COUNT(*) INTO v_landing FROM public.seo_metadata WHERE page_slug ILIKE '/learn%' OR page_slug = '/';

  RETURN jsonb_build_object(
    'total_pages', v_total,
    'pages_with_metadata', v_with,
    'missing_pages', GREATEST(0, v_total - v_with),
    'coverage_percentage', CASE WHEN v_total > 0 THEN ROUND((v_with::numeric / v_total) * 100) ELSE 0 END,
    'announcement_pages', v_announcement,
    'referral_pages', v_referral,
    'activation_pages', v_activation,
    'landing_pages', v_landing
  );
END;
$$;

-- ============================================================
-- PART 5: get_missing_metadata_pages (founder-only)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_missing_metadata_pages()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_known_pages text[] := ARRAY[
    '/', '/auth', '/waitlist', '/invite', '/reset-password',
    '/app', '/app/today', '/app/inbox', '/app/ideas', '/app/projects',
    '/app/memory', '/app/review', '/app/upgrade', '/app/settings',
    '/app/help', '/app/voice-capture', '/app/capture-gateway', '/app/ai-review',
    '/learn', '/privacy', '/terms',
    '/referral', '/growth-intelligence',
    '/learn/second-brain-app', '/learn/capture-thoughts-fast',
    '/learn/voice-capture-productivity', '/learn/ai-planner-assistant',
    '/learn/memory-assistant-software'
  ];
  v_missing jsonb;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  IF v_email IS NULL OR LOWER(v_email) <> 'shamcharan@icloud.com' THEN
    RETURN jsonb_build_object('error', 'forbidden');
  END IF;

  SELECT COALESCE(jsonb_agg(slug ORDER BY slug), '[]'::jsonb) INTO v_missing
  FROM (
    SELECT unnest(v_known_pages) AS slug
    EXCEPT
    SELECT page_slug FROM public.seo_metadata
      WHERE COALESCE(title,'') <> '' AND COALESCE(description,'') <> ''
  ) m;

  RETURN jsonb_build_object('missing_pages', v_missing);
END;
$$;

-- ============================================================
-- PART 7: Extend geography RPC with top_countries
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_user_geography_analytics()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_total_by jsonb;
  v_activated_by jsonb;
  v_rate_by jsonb;
  v_top jsonb;
  v_india int := 0;
  v_intl int := 0;
  v_unknown int := 0;
  v_top_country text;
  v_top_country_count int := 0;
  v_best_country text;
  v_best_rate numeric := 0;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  IF v_email IS NULL OR LOWER(v_email) <> 'shamcharan@icloud.com' THEN
    RETURN jsonb_build_object('error', 'forbidden');
  END IF;

  WITH derived AS (
    SELECT
      ws.id,
      ws.activation_completed_at,
      COALESCE(
        NULLIF(au.raw_user_meta_data->>'country', ''),
        NULLIF(au.raw_user_meta_data->>'country_name', ''),
        CASE UPPER(COALESCE(NULLIF(au.raw_user_meta_data->>'country_code',''), NULLIF(au.raw_user_meta_data->>'countryCode','')))
          WHEN 'IN' THEN 'India'
          WHEN 'US' THEN 'United States'
          WHEN 'GB' THEN 'United Kingdom'
          WHEN 'UK' THEN 'United Kingdom'
          WHEN 'CA' THEN 'Canada'
          WHEN 'AU' THEN 'Australia'
          WHEN 'DE' THEN 'Germany'
          WHEN 'FR' THEN 'France'
          WHEN 'SG' THEN 'Singapore'
          WHEN 'AE' THEN 'UAE'
          WHEN 'NL' THEN 'Netherlands'
          ELSE NULL
        END,
        CASE
          WHEN ws.email ILIKE '%.in' THEN 'India'
          WHEN ws.email ILIKE '%.uk' THEN 'United Kingdom'
          WHEN ws.email ILIKE '%.ca' THEN 'Canada'
          WHEN ws.email ILIKE '%.au' THEN 'Australia'
          WHEN ws.email ILIKE '%.de' THEN 'Germany'
          WHEN ws.email ILIKE '%.fr' THEN 'France'
          WHEN ws.email ILIKE '%.sg' THEN 'Singapore'
          WHEN ws.email ILIKE '%.ae' THEN 'UAE'
          WHEN ws.email ILIKE '%.nl' THEN 'Netherlands'
          ELSE NULL
        END,
        CASE us.billing_region WHEN 'india' THEN 'India' ELSE NULL END,
        'Unknown'
      ) AS country
    FROM public.waitlist_signups ws
    LEFT JOIN auth.users au ON LOWER(au.email) = LOWER(ws.email)
    LEFT JOIN public.user_subscriptions us ON us.user_id = au.id
  ),
  agg AS (
    SELECT country,
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE activation_completed_at IS NOT NULL)::int AS activated
    FROM derived GROUP BY country
  )
  SELECT
    COALESCE(jsonb_object_agg(country, total), '{}'::jsonb),
    COALESCE(jsonb_object_agg(country, activated), '{}'::jsonb),
    COALESCE(jsonb_object_agg(country,
      CASE WHEN total > 0 THEN ROUND((activated::numeric / total) * 100) ELSE 0 END
    ), '{}'::jsonb),
    COALESCE(jsonb_agg(jsonb_build_object('country', country, 'total', total, 'activated', activated) ORDER BY total DESC), '[]'::jsonb)
  INTO v_total_by, v_activated_by, v_rate_by, v_top
  FROM agg;

  SELECT COALESCE((v_total_by->>'India')::int, 0) INTO v_india;
  SELECT COALESCE((v_total_by->>'Unknown')::int, 0) INTO v_unknown;
  SELECT COALESCE(SUM((value)::int), 0) - v_india - v_unknown INTO v_intl
    FROM jsonb_each_text(v_total_by);

  SELECT key, (value)::int INTO v_top_country, v_top_country_count
    FROM jsonb_each_text(v_total_by)
    WHERE key <> 'Unknown'
    ORDER BY (value)::int DESC LIMIT 1;

  SELECT key, (value)::numeric INTO v_best_country, v_best_rate
    FROM jsonb_each_text(v_rate_by)
    WHERE key <> 'Unknown' AND COALESCE((v_total_by->>key)::int, 0) > 0
    ORDER BY (value)::numeric DESC, (v_total_by->>key)::int DESC LIMIT 1;

  RETURN jsonb_build_object(
    'total_by_country', v_total_by,
    'activated_by_country', v_activated_by,
    'activation_rate_by_country', v_rate_by,
    'top_countries', v_top,
    'india_count', v_india,
    'international_count', GREATEST(0, v_intl),
    'unknown_count', v_unknown,
    'top_country', COALESCE(v_top_country, 'Unknown'),
    'top_country_count', COALESCE(v_top_country_count, 0),
    'best_activation_country', COALESCE(v_best_country, 'Unknown'),
    'best_activation_rate', COALESCE(v_best_rate, 0)
  );
END;
$$;
