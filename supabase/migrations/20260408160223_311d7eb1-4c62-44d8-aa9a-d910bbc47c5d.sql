
-- Security definer function to aggregate analytics across all users
-- This bypasses RLS so the admin can see cross-user metrics
CREATE OR REPLACE FUNCTION public.get_admin_analytics()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'captures', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'user_id', c.user_id,
        'input_type', c.input_type,
        'review_status', c.review_status,
        'created_at', c.created_at,
        'updated_at', c.updated_at
      )), '[]'::jsonb)
      FROM public.user_captures c
    ),
    'projects', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'user_id', p.user_id,
        'created_at', p.created_at,
        'updated_at', p.updated_at
      )), '[]'::jsonb)
      FROM public.user_projects p
    ),
    'memories', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'user_id', m.user_id,
        'created_at', m.created_at,
        'updated_at', m.updated_at
      )), '[]'::jsonb)
      FROM public.user_memory_entries m
    )
  ) INTO result;

  RETURN result;
END;
$$;
