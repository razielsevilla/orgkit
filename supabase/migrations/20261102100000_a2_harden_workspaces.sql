-- A2 hardening: real row level security, one org per officer, atomic creation.
-- Builds on 20261101130000_create_orgs_and_officers.sql.

-- 1. Membership check as a security definer function. The earlier org_officers
--    policy queried org_officers from inside itself, which Postgres rejects with
--    "infinite recursion detected in policy".
create or replace function public.is_org_member(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.org_officers
    where org_id = target_org
      and officer_id = (select auth.uid())
  );
$$;

revoke all on function public.is_org_member(uuid) from public;
grant execute on function public.is_org_member(uuid) to authenticated;

drop policy if exists "Officers can read orgs they belong to" on public.orgs;
create policy "Officers can read orgs they belong to"
  on public.orgs
  for select
  to authenticated
  using (public.is_org_member(id));

drop policy if exists "Officers can read memberships in their orgs" on public.org_officers;
create policy "Officers can read memberships in their orgs"
  on public.org_officers
  for select
  to authenticated
  using (
    officer_id = (select auth.uid())
    or public.is_org_member(org_id)
  );

-- 2. v0.2: one org per officer, enforced by the database
create unique index if not exists org_officers_one_org_per_officer
  on public.org_officers (officer_id);

-- 3. Org name length matches the form (2 to 80 characters)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'orgs_name_length'
  ) then
    alter table public.orgs
      add constraint orgs_name_length
      check (char_length(btrim(name)) between 2 and 80);
  end if;
end
$$;

-- 4. Atomic creation: the org and the first officer link are saved together
--    or not at all. Errors are raised with fixed messages the app maps to copy.
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
    raise exception 'not_authenticated';
  end if;

  -- The officer must have agreed to the privacy notice (A1) first
  if not exists (select 1 from public.officers where id = current_user_id) then
    raise exception 'consent_required';
  end if;

  if exists (select 1 from public.org_officers where officer_id = current_user_id) then
    raise exception 'already_in_org';
  end if;

  clean_name := regexp_replace(btrim(org_name), '\s+', ' ', 'g');
  if char_length(clean_name) < 2 or char_length(clean_name) > 80 then
    raise exception 'invalid_name';
  end if;

  clean_school := nullif(regexp_replace(btrim(coalesce(org_school, '')), '\s+', ' ', 'g'), '');

  clean_key := lower(clean_name);
  if clean_school is not null then
    clean_key := clean_key || ' ' || lower(clean_school);
  end if;

  insert into public.orgs (name, school, name_key)
  values (clean_name, clean_school, clean_key)
  returning id into new_org_id;

  insert into public.org_officers (org_id, officer_id, role, joined_at)
  values (new_org_id, current_user_id, 'officer', now());

  return new_org_id;
end;
$$;

revoke all on function public.create_organization(text, text) from public;
grant execute on function public.create_organization(text, text) to authenticated;
