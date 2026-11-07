-- 1. Status Check Constraint
-- Ensure members.status only accepts valid values for Ticket R1/R2.
alter table public.members
  drop constraint if exists members_status_check;

alter table public.members
  add constraint members_status_check
  check (status in ('pending', 'active', 'inactive'));

-- 2. Performance & Sorting Optimization
-- Add a generated boolean column so PostgreSQL can index and order pending records first.
alter table public.members
  add column if not exists is_pending boolean
  generated always as (status = 'pending') stored;

-- 3. Composite Indexes
-- Support fast filtering and sorting by org_id, status, and join date (supports rosters with 500+ members).
create index if not exists members_org_status_created_idx
  on public.members (org_id, status, created_at desc);

create index if not exists members_org_pending_created_idx
  on public.members (org_id, is_pending desc, created_at desc);

create index if not exists members_org_created_idx
  on public.members (org_id, created_at desc);

-- 4. Security Definer Function: confirm_member
-- Confirms a pending member to active.
-- Security checks:
--   - Caller must be authenticated.
--   - Caller must belong to the same organization as the member.
--   - Idempotent: If member is already active, does nothing and returns 'ok'.
create or replace function public.confirm_member(target_member uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid;
  member_org uuid;
  current_status text;
begin
  caller_id := auth.uid();
  if caller_id is null then
    raise exception 'Not authenticated';
  end if;

  select org_id, status
    into member_org, current_status
    from public.members
   where id = target_member;

  if member_org is null then
    raise exception 'Member not found';
  end if;

  -- Verify caller is an officer of this organization
  if not public.is_org_member(member_org) then
    raise exception 'Not permitted to confirm members of this organization';
  end if;

  -- Only transition from pending to active. If already active or inactive, do nothing (idempotent).
  if current_status = 'pending' then
    update public.members
       set status = 'active'
     where id = target_member;
  end if;

  return 'ok';
end;
$$;

-- Grant execution to authenticated users
grant execute on function public.confirm_member(uuid) to authenticated;

-- 5. Security Definer Function: get_org_join_link
-- Allows confirmed officers to retrieve their org's active join link token for the empty state
-- without weakening the strict admin-only RLS policy on the org_join_links table.
create or replace function public.get_org_join_link(target_org uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid;
  active_token text;
begin
  caller_id := auth.uid();
  if caller_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Verify caller belongs to the target organization
  if not public.is_org_member(target_org) then
    raise exception 'Not permitted to view join link for this organization';
  end if;

  select token
    into active_token
    from public.org_join_links
   where org_id = target_org
     and is_active = true
   limit 1;

  return active_token;
end;
$$;

-- Grant execution to authenticated users
grant execute on function public.get_org_join_link(uuid) to authenticated;

