
-- Function: set activation_completed_at on first product action
CREATE OR REPLACE FUNCTION public.mark_activation_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
BEGIN
  -- Look up user email from auth.users
  SELECT email INTO v_email FROM auth.users WHERE id = NEW.user_id;

  IF v_email IS NOT NULL THEN
    UPDATE public.waitlist_signups
    SET activation_completed_at = now(),
        status = 'activated'
    WHERE email = v_email
      AND activation_completed_at IS NULL;
  END IF;

  RETURN NEW;
END;
$$;

-- Attach to user_captures
CREATE TRIGGER trg_activation_on_capture
AFTER INSERT ON public.user_captures
FOR EACH ROW
EXECUTE FUNCTION public.mark_activation_completed();

-- Attach to user_projects
CREATE TRIGGER trg_activation_on_project
AFTER INSERT ON public.user_projects
FOR EACH ROW
EXECUTE FUNCTION public.mark_activation_completed();

-- Attach to user_memory_entries
CREATE TRIGGER trg_activation_on_memory
AFTER INSERT ON public.user_memory_entries
FOR EACH ROW
EXECUTE FUNCTION public.mark_activation_completed();
