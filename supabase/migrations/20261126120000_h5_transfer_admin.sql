-- H5: Transfer admin rights
-- Allows an active organization admin to safely transfer admin rights to another officer
-- in a single atomic transaction while strictly preserving the "at least one admin" invariant.

-- 1. Create audit log table for admin transfers
create table if not exists public.admin_transfers_log (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  transferred_by uuid not null references auth.users (id) on delete cascade,
  transferred_to uuid not null references auth.users (id) on delete cascade,
  previous_caller_role text not null default 'admin',
  new_caller_role text not null check (new_caller_role in ('officer', 'finance', 'remove')),
  created_at timestamptz not null default now()
);

-- Index for querying transfer history
create index if not exists admin_transfers_log_org_idx
  on public.admin_transfers_log (org_id, created_at desc);

-- RLS: Service role only writes/reads directly; app manages access
alter table public.admin_transfers_log enable row level security;

-- 2. Atomic SQL Function: transfer_admin_rights
create or replace function public.transfer_admin_rights(
  p_org_id uuid,
  p_target_officer_id uuid,
  p_caller_new_role text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid;
  caller_role text;
  target_exists boolean;
  target_current_role text;
  admin_count int;
begin
  caller_id := auth.uid();
  if caller_id is null then
    raise exception 'not_authenticated';
  end if;

  if p_caller_new_role not in ('officer', 'finance', 'remove') then
    raise exception 'invalid_role';
  end if;

  if caller_id = p_target_officer_id then
    raise exception 'cannot_transfer_to_self';
  end if;

  -- Caller must be an admin of the specified organization
  select role into caller_role
  from public.org_officers
  where org_id = p_org_id
    and officer_id = caller_id;

  if caller_role is null or caller_role != 'admin' then
    raise exception 'not_authorized';
  end if;

  -- Verify target officer exists in this organization
  select role into target_current_role
  from public.org_officers
  where org_id = p_org_id
    and officer_id = p_target_officer_id;

  if target_current_role is null then
    raise exception 'officer_not_found';
  end if;

  -- Lock the org row to serialize admin transfers
  perform 1 from public.orgs where id = p_org_id for update;

  -- Promote target officer to admin
  update public.org_officers
  set role = 'admin'
  where org_id = p_org_id
    and officer_id = p_target_officer_id;

  -- Apply caller's chosen new role or removal
  if p_caller_new_role = 'remove' then
    delete from public.org_officers
    where org_id = p_org_id
      and officer_id = caller_id;
  else
    update public.org_officers
    set role = p_caller_new_role
    where org_id = p_org_id
      and officer_id = caller_id;
  end if;

  -- Invariant check: Verify at least one admin remains in the organization
  select count(*) into admin_count
  from public.org_officers
  where org_id = p_org_id
    and role = 'admin';

  if admin_count < 1 then
    raise exception 'last_admin';
  end if;

  -- Record audit log
  insert into public.admin_transfers_log (
    org_id,
    transferred_by,
    transferred_to,
    previous_caller_role,
    new_caller_role
  ) values (
    p_org_id,
    caller_id,
    p_target_officer_id,
    'admin',
    p_caller_new_role
  );
end;
$$;

revoke all on function public.transfer_admin_rights(uuid, uuid, text) from public;
grant execute on function public.transfer_admin_rights(uuid, uuid, text) to authenticated;
grant execute on function public.transfer_admin_rights(uuid, uuid, text) to service_role;
grant all on table public.admin_transfers_log to service_role;
