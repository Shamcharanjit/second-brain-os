-- ────────────────────────────────────────────────────────────────────────────
-- Team Workspaces
-- Allows users to create/join shared workspaces and share captures with the team.
-- ────────────────────────────────────────────────────────────────────────────

-- 1. Workspaces table
create table if not exists public.workspaces (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  description   text,
  invite_code   text not null unique default upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  owner_id      uuid not null references auth.users(id) on delete cascade,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- 2. Workspace members
create table if not exists public.workspace_members (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  role          text not null default 'member' check (role in ('owner', 'admin', 'member')),
  display_name  text,
  joined_at     timestamptz not null default now(),
  unique (workspace_id, user_id)
);

-- 3. Shared captures (copies / references of user_captures shared to a workspace)
create table if not exists public.workspace_captures (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  capture_id    uuid references public.user_captures(id) on delete set null,
  shared_by     uuid not null references auth.users(id) on delete cascade,
  -- Snapshot of the capture at share time (so deleting original doesn't break the feed)
  raw_input     text not null,
  ai_data       jsonb,
  note          text,          -- optional comment from the sharer
  created_at    timestamptz not null default now()
);

-- 4. Indexes
create index if not exists idx_workspace_members_user    on public.workspace_members(user_id);
create index if not exists idx_workspace_members_ws      on public.workspace_members(workspace_id);
create index if not exists idx_workspace_captures_ws     on public.workspace_captures(workspace_id);
create index if not exists idx_workspace_captures_by     on public.workspace_captures(shared_by);

-- 5. updated_at trigger for workspaces
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_workspaces_updated_at on public.workspaces;
create trigger trg_workspaces_updated_at
  before update on public.workspaces
  for each row execute function public.set_updated_at();

-- 6. RLS
alter table public.workspaces         enable row level security;
alter table public.workspace_members  enable row level security;
alter table public.workspace_captures enable row level security;

-- Workspaces: visible to members only
create policy "workspace_select" on public.workspaces for select
  using (
    exists (
      select 1 from public.workspace_members m
      where m.workspace_id = workspaces.id and m.user_id = auth.uid()
    )
  );

create policy "workspace_insert" on public.workspaces for insert
  with check (owner_id = auth.uid());

create policy "workspace_update" on public.workspaces for update
  using (
    exists (
      select 1 from public.workspace_members m
      where m.workspace_id = workspaces.id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
    )
  );

create policy "workspace_delete" on public.workspaces for delete
  using (owner_id = auth.uid());

-- Members: visible to other members of same workspace
create policy "members_select" on public.workspace_members for select
  using (
    exists (
      select 1 from public.workspace_members me
      where me.workspace_id = workspace_members.workspace_id and me.user_id = auth.uid()
    )
  );

create policy "members_insert" on public.workspace_members for insert
  with check (user_id = auth.uid());

create policy "members_delete" on public.workspace_members for delete
  using (user_id = auth.uid() or exists (
    select 1 from public.workspace_members m
    where m.workspace_id = workspace_members.workspace_id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'admin')
  ));

-- Workspace captures: visible to all members
create policy "ws_captures_select" on public.workspace_captures for select
  using (
    exists (
      select 1 from public.workspace_members m
      where m.workspace_id = workspace_captures.workspace_id and m.user_id = auth.uid()
    )
  );

create policy "ws_captures_insert" on public.workspace_captures for insert
  with check (
    shared_by = auth.uid()
    and exists (
      select 1 from public.workspace_members m
      where m.workspace_id = workspace_captures.workspace_id and m.user_id = auth.uid()
    )
  );

create policy "ws_captures_delete" on public.workspace_captures for delete
  using (shared_by = auth.uid() or exists (
    select 1 from public.workspace_members m
    where m.workspace_id = workspace_captures.workspace_id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'admin')
  ));
