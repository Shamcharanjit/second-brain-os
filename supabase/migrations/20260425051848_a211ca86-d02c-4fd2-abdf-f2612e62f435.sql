
CREATE OR REPLACE FUNCTION public.get_user_geography_analytics()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  result jsonb;
  v_total_by jsonb;
  v_activated_by jsonb;
  v_rate_by jsonb;
  v_india int := 0;
  v_intl int := 0;
  v_unknown int := 0;
  v_top_country text;
  v_top_country_count int := 0;
  v_best_country text;
  v_best_rate numeric := 0;
BEGIN
  -- Founder-only guard
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  IF v_email IS NULL OR LOWER(v_email) <> 'shamcharan@icloud.com' THEN
    RETURN jsonb_build_object('error', 'forbidden');
  END IF;

  -- Build derived country per waitlist signup
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
        CASE us.billing_region
          WHEN 'india' THEN 'India'
          ELSE NULL
        END,
        'Unknown'
      ) AS country
    FROM public.waitlist_signups ws
    LEFT JOIN auth.users au ON LOWER(au.email) = LOWER(ws.email)
    LEFT JOIN public.user_subscriptions us ON us.user_id = au.id
  ),
  agg AS (
    SELECT
      country,
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE activation_completed_at IS NOT NULL)::int AS activated
    FROM derived
    GROUP BY country
  )
  SELECT
    COALESCE(jsonb_object_agg(country, total), '{}'::jsonb),
    COALESCE(jsonb_object_agg(country, activated), '{}'::jsonb),
    COALESCE(jsonb_object_agg(
      country,
      CASE WHEN total > 0 THEN ROUND((activated::numeric / total) * 100, 1) ELSE 0 END
    ), '{}'::jsonb)
  INTO v_total_by, v_activated_by, v_rate_by
  FROM agg;

  -- India / international / unknown splits
  SELECT
    COALESCE(SUM(CASE WHEN country = 'India' THEN total ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN country = 'Unknown' THEN total ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN country NOT IN ('India','Unknown') THEN total ELSE 0 END), 0)
  INTO v_india, v_unknown, v_intl
  FROM (
    SELECT country, COUNT(*)::int AS total
    FROM (
      SELECT
        COALESCE(
          NULLIF(au.raw_user_meta_data->>'country', ''),
          CASE UPPER(COALESCE(NULLIF(au.raw_user_meta_data->>'country_code',''), ''))
            WHEN 'IN' THEN 'India' ELSE NULL END,
          CASE WHEN ws.email ILIKE '%.in' THEN 'India' ELSE NULL END,
          CASE us.billing_region WHEN 'india' THEN 'India' ELSE NULL END,
          'Unknown'
        ) AS country
      FROM public.waitlist_signups ws
      LEFT JOIN auth.users au ON LOWER(au.email) = LOWER(ws.email)
      LEFT JOIN public.user_subscriptions us ON us.user_id = au.id
    ) d
    GROUP BY country
  ) s;

  -- Top country (excluding Unknown)
  SELECT country, total INTO v_top_country, v_top_country_count
  FROM (
    SELECT key AS country, (value)::int AS total
    FROM jsonb_each_text(v_total_by)
    WHERE key <> 'Unknown'
    ORDER BY (value)::int DESC
    LIMIT 1
  ) t;

  -- Best activation country (min 2 signups, exclude Unknown)
  SELECT country, rate INTO v_best_country, v_best_rate
  FROM (
    SELECT
      t.key AS country,
      (t.value)::int AS total,
      (r.value)::numeric AS rate
    FROM jsonb_each_text(v_total_by) t
    JOIN jsonb_each_text(v_rate_by) r ON r.key = t.key
    WHERE t.key <> 'Unknown' AND (t.value)::int >= 2
    ORDER BY (r.value)::numeric DESC, (t.value)::int DESC
    LIMIT 1
  ) b;

  result := jsonb_build_object(
    'total_by_country', v_total_by,
    'activated_by_country', v_activated_by,
    'activation_rate_by_country', v_rate_by,
    'india_count', v_india,
    'international_count', v_intl,
    'unknown_count', v_unknown,
    'top_country', COALESCE(v_top_country, 'Unknown'),
    'top_country_count', v_top_country_count,
    'best_activation_country', COALESCE(v_best_country, 'Unknown'),
    'best_activation_rate', COALESCE(v_best_rate, 0)
  );

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_geography_analytics() TO authenticated;
