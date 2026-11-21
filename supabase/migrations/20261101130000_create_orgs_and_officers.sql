-- A2: Organizations and Organization Officers (Workspaces)
-- Follows the exact data model:
--   orgs: id (unguessable), name, school (nullable), name_key (lowercased, trimmed name + school, unique), created_at
--   org_officers: org_id, officer_id, role (default "officer"), joined_at

-- 1. Create orgs table
create table if not exists public.orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  school text null,
  -- Lowercased, trimmed name + school (unique constraint prevents duplicate orgs in the same school)
  name_key text not null,
  created_at timestamptz not null default now()
);

-- Unique index for name_key
create unique index if not exists orgs_name_key_key
  on public.orgs (name_key);

-- 2. Create org_officers membership table
create table if not exists public.org_officers (
  org_id uuid not null references public.orgs (id) on delete cascade,
  officer_id uuid not null references public.officers (id) on delete cascade,
  role text not null default 'officer',
  joined_at timestamptz not null default now(),
  primary key (org_id, officer_id)
);

-- Index for querying an officer's organizations
create index if not exists org_officers_officer_id_idx
  on public.org_officers (officer_id);

-- 3. Row Level Security
alter table public.orgs enable row level security;
alter table public.org_officers enable row level security;

-- Policy: Officers can view orgs they belong to
drop policy if exists "Officers can read orgs they belong to" on public.orgs;
create policy "Officers can read orgs they belong to"
  on public.orgs
  for select
  to authenticated
  using (
    exists (
      select 1 from public.org_officers
      where org_officers.org_id = orgs.id
        and org_officers.officer_id = (select auth.uid())
    )
  );

-- Policy: Officers can view other officers in their organizations
drop policy if exists "Officers can read memberships in their orgs" on public.org_officers;
create policy "Officers can read memberships in their orgs"
  on public.org_officers
  for select
  to authenticated
  using (
    officer_id = (select auth.uid())
    or exists (
      select 1 from public.org_officers as my_membership
      where my_membership.org_id = org_officers.org_id
        and my_membership.officer_id = (select auth.uid())
    )
  );

-- 4. Atomic Organization Creation Function
create or replace function public.create_organization(
  org_name text,
  org_school text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org_id uuid;
  current_user_id uuid;
  clean_name text;
  clean_school text;
  clean_key text;
begin
  current_user_id := auth.uid();
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  clean_name := trim(org_name);
  if clean_name = '' then
    raise exception 'Organization name cannot be empty';
  end if;

  clean_school := nullif(trim(org_school), '');

  -- name_key: lowercased, trimmed name + school
  if clean_school is not null then
    clean_key := lower(regexp_replace(clean_name, '\s+', ' ', 'g')) || ' ' || lower(regexp_replace(clean_school, '\s+', ' ', 'g'));
  else
    clean_key := lower(regexp_replace(clean_name, '\s+', ' ', 'g'));
  end if;

  -- Insert organization
  insert into public.orgs (name, school, name_key)
  values (clean_name, clean_school, clean_key)
  returning id into new_org_id;

  -- Insert officer (role defaults to 'officer', joined_at defaults to now())
  insert into public.org_officers (org_id, officer_id, role, joined_at)
  values (new_org_id, current_user_id, 'officer', now());

  return new_org_id;
end;
$$;
