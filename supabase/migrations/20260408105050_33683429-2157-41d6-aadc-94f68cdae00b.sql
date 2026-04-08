CREATE OR REPLACE FUNCTION public.submit_waitlist(
  p_name text,
  p_email text,
  p_use_case text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_referred_by text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row waitlist_signups;
BEGIN
  INSERT INTO public.waitlist_signups (name, email, use_case, notes, referred_by)
  VALUES (p_name, p_email, p_use_case, p_notes, p_referred_by)
  RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'referral_code', v_row.referral_code,
    'referral_count', v_row.referral_count
  );
END;
$$;