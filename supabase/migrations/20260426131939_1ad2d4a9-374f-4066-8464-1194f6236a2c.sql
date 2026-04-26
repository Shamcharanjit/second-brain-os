CREATE OR REPLACE FUNCTION public.get_seo_performance_signals()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_search_sources text[] := ARRAY['google','bing','duckduckgo','yahoo','yandex','baidu','ecosia','brave'];
  v_source_counts jsonb;
  v_search_visitors int := 0;
  v_search_signups int := 0;
  v_search_activations int := 0;
  v_landing jsonb;
  v_country jsonb;
  v_top_sources jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('error', 'forbidden');
  END IF;

  SELECT COALESCE(jsonb_object_agg(source, c), '{}'::jsonb) INTO v_source_counts
  FROM (
    SELECT source, COUNT(*)::int AS c
    FROM public.visitor_attribution
    GROUP BY source
  ) s;

  SELECT
    COUNT(*) FILTER (WHERE source = ANY(v_search_sources))::int,
    COUNT(*) FILTER (WHERE source = ANY(v_search_sources) AND converted_at IS NOT NULL)::int,
    COUNT(*) FILTER (WHERE source = ANY(v_search_sources) AND activated_at IS NOT NULL)::int
  INTO v_search_visitors, v_search_signups, v_search_activations
  FROM public.visitor_attribution;

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
$function$;

GRANT EXECUTE ON FUNCTION public.get_seo_performance_signals() TO anon;
GRANT EXECUTE ON FUNCTION public.get_seo_performance_signals() TO authenticated;

NOTIFY pgrst, 'reload schema';