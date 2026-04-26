-- Open SEO RPCs to any authenticated user (founder still allowed implicitly)

CREATE OR REPLACE FUNCTION public.get_seo_metadata_coverage()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
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
  IF auth.uid() IS NULL THEN
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
$function$;

CREATE OR REPLACE FUNCTION public.get_missing_metadata_pages()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
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
  IF auth.uid() IS NULL THEN
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
$function$;

CREATE OR REPLACE FUNCTION public.get_seo_signals()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_top_pages jsonb;
  v_top_keywords jsonb;
  v_total_impressions int;
  v_total_clicks int;
BEGIN
  IF auth.uid() IS NULL THEN
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
$function$;