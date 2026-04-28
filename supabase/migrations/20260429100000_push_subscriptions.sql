-- Push notification subscriptions
-- Stores one row per (user, browser endpoint). A user can have multiple devices.

create table if not exists push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  endpoint   text not null,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

-- Index for the Edge Function: fetch all subscriptions for a given user
create index if not exists idx_push_subscriptions_user_id on push_subscriptions(user_id);

-- RLS: users can only read/write their own subscriptions
alter table push_subscriptions enable row level security;

create policy "Users manage own push subscriptions"
  on push_subscriptions
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Service role can read all (needed by Edge Function)
create policy "Service role reads all push subscriptions"
  on push_subscriptions
  for select
  using (auth.role() = 'service_role');
