-- ─── user_notification_preferences ──────────────────────────────────────────
-- Stores per-user reminder settings. One row per user, upserted from the app.

create table if not exists public.user_notification_preferences (
  user_id               uuid primary key references auth.users(id) on delete cascade,

  -- Which notification types are enabled
  morning_brief         boolean not null default true,   -- 7–8am: "Here's your day"
  inbox_overflow        boolean not null default true,   -- when inbox > threshold
  streak_alert          boolean not null default true,   -- no capture in 24h
  daily_review          boolean not null default true,   -- existing 2pm nudge
  due_today             boolean not null default true,   -- tasks due today (morning)

  -- Timing preferences (hour in user's local time, 0-23)
  morning_hour          smallint not null default 7  check (morning_hour between 0 and 23),
  evening_hour          smallint not null default 20 check (evening_hour between 0 and 23),

  -- Inbox overflow threshold
  inbox_threshold       smallint not null default 5,

  -- User's IANA timezone (e.g. "Asia/Kolkata")
  timezone              text not null default 'UTC',

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

alter table public.user_notification_preferences enable row level security;

create policy "Users manage own notification preferences"
  on public.user_notification_preferences
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── in_app_notifications ────────────────────────────────────────────────────
-- Lightweight notification inbox shown in the bell icon tray.

create table if not exists public.in_app_notifications (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  type         text not null default 'reminder',   -- reminder | system | streak | inbox
  title        text not null,
  body         text,
  link         text,                               -- deep link path e.g. "/today"
  is_read      boolean not null default false,
  created_at   timestamptz not null default now()
);

create index if not exists in_app_notifications_user_unread
  on public.in_app_notifications (user_id, is_read, created_at desc);

alter table public.in_app_notifications enable row level security;

create policy "Users see own notifications"
  on public.in_app_notifications
  for select using (auth.uid() = user_id);

create policy "Users update own notifications"
  on public.in_app_notifications
  for update using (auth.uid() = user_id);

-- Service role can insert notifications for any user
create policy "Service role inserts notifications"
  on public.in_app_notifications
  for insert with check (true);

-- Auto-cleanup: keep only last 90 notifications per user
create or replace function public.trim_in_app_notifications()
returns trigger language plpgsql as $$
begin
  delete from public.in_app_notifications
  where user_id = NEW.user_id
    and id not in (
      select id from public.in_app_notifications
      where user_id = NEW.user_id
      order by created_at desc
      limit 90
    );
  return NEW;
end;
$$;

drop trigger if exists trim_notifications_trigger on public.in_app_notifications;
create trigger trim_notifications_trigger
  after insert on public.in_app_notifications
  for each row execute function public.trim_in_app_notifications();
