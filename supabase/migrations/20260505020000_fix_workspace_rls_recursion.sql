-- Fix infinite RLS recursion on workspace_members.
--
-- The original "members_select" policy queried workspace_members from within
-- a policy ON workspace_members, causing Postgres to recurse endlessly → 500.
-- Fix: introduce a SECURITY DEFINER helper that bypasses RLS, then use it in
-- both the workspaces and workspace_members SELECT policies.

-- ── Helper: is the current user a member of the given workspace? ──────────
-- SECURITY DEFINER so the inner query skips RLS (no recursion).
create or replace function public.is_workspace_member(ws_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from   public.workspace_members
    where  workspace_id = ws_id
      and  user_id      = auth.uid()
  );
$$;

-- ── Fix workspace_members SELECT policy (was self-referencing → recursion) ─
drop policy if exists "members_select" on public.workspace_members;

create policy "members_select" on public.workspace_members for select
  using ( public.is_workspace_member(workspace_id) );

-- ── Update workspace SELECT policy to use the helper (cleaner + consistent) ─
drop policy if exists "workspace_select" on public.workspaces;

create policy "workspace_select" on public.workspaces for select
  using ( public.is_workspace_member(id) );
