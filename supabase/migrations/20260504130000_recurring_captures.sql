-- ─── Recurring captures ──────────────────────────────────────────────────────
-- Adds recurrence scheduling to the user_captures table.
--
--  recurrence         : repeat cadence (null = one-off, the default)
--  recurrence_parent_id : points to the original capture this was cloned from

alter table public.user_captures
  add column if not exists recurrence text
    check (recurrence in ('daily', 'weekdays', 'weekly', 'monthly'))
    default null;

alter table public.user_captures
  add column if not exists recurrence_parent_id uuid
    references public.user_captures(id) on delete set null
    default null;

comment on column public.user_captures.recurrence is
  'Repeat cadence: daily | weekdays | weekly | monthly. NULL = one-off task.';

comment on column public.user_captures.recurrence_parent_id is
  'If this capture was auto-generated from a recurring template, this points to the original.';
