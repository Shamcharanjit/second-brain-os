
INSERT INTO public.waitlist_signups (email, name, status, invited, invite_sent_at, invite_accepted_at, activation_completed_at, last_email_type_sent)
SELECT
  LOWER(au.email),
  COALESCE(NULLIF(SPLIT_PART(au.email, '@', 1), ''), 'User'),
  'activated',
  true,
  now(),
  now(),
  now(),
  'invite'
FROM auth.users au
WHERE au.email IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.waitlist_signups ws
    WHERE LOWER(ws.email) = LOWER(au.email)
  );
