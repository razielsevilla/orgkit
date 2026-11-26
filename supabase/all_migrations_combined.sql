-- >>> FILE: 20261101120000_add_officers_table.sql
-- A1: officers who sign in with Google.
-- Safe to run when the table was already created by hand in the dashboard:
-- every statement checks first, and nothing is dropped except our own policy.

create table if not exists public.officers (
  -- Same ID as the Supabase sign-in record, so the session maps straight to the row
  id uuid primary key references auth.users (id) on delete cascade,
  -- Google's permanent account ID. Used to match a returning officer, never the email.
  google_sub text not null,
  email text not null,
  full_name text not null default '',
  -- Which version of the privacy notice they agreed to, and when
  consent_version text not null,
  consent_at timestamptz not null,
  created_at timestamptz not null default now(),
  last_sign_in_at timestamptz not null default now()
);

-- One officer per Google account, even if the email on that account changes
create unique index if not exists officers_google_sub_key
  on public.officers (google_sub);

alter table public.officers enable row level security;

-- An officer can read only their own row. There are no insert/update/delete
-- policies: the app writes through the server with the service-role key.
drop policy if exists "Officers can read their own row" on public.officers;
create policy "Officers can read their own row"
  on public.officers
  for select
  to authenticated
  using (id = (select auth.uid()));


-- >>> FILE: 20261101130000_create_orgs_and_officers.sql
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


-- >>> FILE: 20261102100000_a2_harden_workspaces.sql
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


-- >>> FILE: 20261102110000_a2_org_name_key.sql
-- A2: duplicate check ignores capitals and ALL spacing.
-- "DEVCON Laguna", "devcon  laguna" and "Dev Con Laguna" are the same org.
-- Name and school are joined with "|" so "ab" + "c" never matches "a" + "bc".

create or replace function public.org_name_key(org_name text, org_school text)
returns text
language sql
immutable
set search_path = public
as $$
  select lower(regexp_replace(coalesce(org_name, ''), '[[:space:] ]+', '', 'g'))
         || '|' ||
         lower(regexp_replace(coalesce(org_school, ''), '[[:space:] ]+', '', 'g'));
$$;

-- Recompute keys for orgs created under the old rule.
-- If this fails on the unique index, two test orgs are now duplicates:
-- delete one and run it again.
update public.orgs
   set name_key = public.org_name_key(name, school);

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

  insert into public.orgs (name, school, name_key)
  values (clean_name, clean_school, public.org_name_key(clean_name, clean_school))
  returning id into new_org_id;

  insert into public.org_officers (org_id, officer_id, role, joined_at)
  values (new_org_id, current_user_id, 'officer', now());

  return new_org_id;
end;
$$;

revoke all on function public.create_organization(text, text) from public;
grant execute on function public.create_organization(text, text) to authenticated;


-- >>> FILE: 20261102120000_a3_invite_officers.sql
-- A3: Invite officers with roles (admin, finance, officer)
-- Builds on A2 workspaces and org_officers.

-- Enable pgcrypto in extensions if not already present
create extension if not exists pgcrypto with schema extensions;

-- 1. Migrate org_officers:
--    - Add role check constraint: 'admin', 'finance', 'officer'
--    - Update existing rows to 'admin' (A2 creators)
--    - Enforce one org per officer unique constraint
alter table public.org_officers
  drop constraint if exists org_officers_role_check;

update public.org_officers
  set role = 'admin'
  where role not in ('admin', 'finance', 'officer') or role = 'officer';

alter table public.org_officers
  add constraint org_officers_role_check
  check (role in ('admin', 'finance', 'officer'));

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'org_officers_one_org'
  ) then
    alter table public.org_officers
      add constraint org_officers_one_org unique (officer_id);
  end if;
exception
  when duplicate_table or duplicate_object then null;
end
$$;

-- 2. Create org_invites table
create table if not exists public.org_invites (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.orgs(id) on delete cascade,
  email       text,                     -- NULL after use or revoke
  email_key   text,                     -- lower(trim(email)); NULL after use or revoke
  role        text not null check (role in ('admin', 'finance', 'officer')),
  token_hash  text not null unique,
  invited_by  uuid not null references public.officers(id),
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null,     -- created_at + interval '7 days'
  used_at     timestamptz,
  revoked_at  timestamptz
);

-- One pending invite per org and email
create unique index if not exists org_invites_one_pending
  on public.org_invites (org_id, email_key)
  where used_at is null and revoked_at is null;

create index if not exists org_invites_org_id_idx
  on public.org_invites (org_id);

-- 3. Row Level Security for org_invites
alter table public.org_invites enable row level security;

drop policy if exists "Officers can read invites in their orgs" on public.org_invites;
create policy "Officers can read invites in their orgs"
  on public.org_invites
  for select
  to authenticated
  using (public.is_org_member(org_id));

-- 4. Update create_organization so workspace creators are inserted as 'admin'
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

  insert into public.orgs (name, school, name_key)
  values (clean_name, clean_school, public.org_name_key(clean_name, clean_school))
  returning id into new_org_id;

  -- A3 update: creator joins with 'admin' role
  insert into public.org_officers (org_id, officer_id, role, joined_at)
  values (new_org_id, current_user_id, 'admin', now());

  return new_org_id;
end;
$$;

revoke all on function public.create_organization(text, text) from public;
grant execute on function public.create_organization(text, text) to authenticated;

-- 5. Atomic function: create_invite
--    Takes org_id, email, role, and optional pre-hashed token (or computes hash from token).
create or replace function public.create_invite(
  p_org_id uuid,
  p_email text,
  p_role text,
  p_raw_token text default null,
  p_token_hash text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  current_user_id uuid;
  clean_email text;
  calc_raw text;
  calc_hash text;
  officer_count int;
  pending_count int;
  new_invite_id uuid;
begin
  current_user_id := auth.uid();
  if current_user_id is null then
    raise exception 'not_authenticated';
  end if;

  -- Check admin permission
  if not exists (
    select 1 from public.org_officers
    where org_id = p_org_id
      and officer_id = current_user_id
      and role = 'admin'
  ) then
    raise exception 'not_authorized';
  end if;

  -- Validate role
  if p_role not in ('admin', 'finance', 'officer') then
    raise exception 'invalid_role';
  end if;

  -- Trim and lowercase email
  clean_email := lower(btrim(p_email));
  if clean_email !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' then
    raise exception 'invalid_email';
  end if;

  -- Check if already an officer in THIS org
  if exists (
    select 1 from public.org_officers oo
    join public.officers o on o.id = oo.officer_id
    where oo.org_id = p_org_id
      and lower(btrim(o.email)) = clean_email
  ) then
    raise exception 'already_officer';
  end if;

  -- Enforce limits: max 30 officers, max 30 pending invites
  select count(*) into officer_count
  from public.org_officers
  where org_id = p_org_id;

  if officer_count >= 30 then
    raise exception 'officer_limit_reached';
  end if;

  -- Count pending invites excluding any invite for the same email that will be replaced
  select count(*) into pending_count
  from public.org_invites
  where org_id = p_org_id
    and used_at is null
    and revoked_at is null
    and expires_at > now()
    and coalesce(email_key, '') != clean_email;

  if pending_count >= 30 then
    raise exception 'invite_limit_reached';
  end if;

  -- Determine raw token and token hash
  if p_raw_token is not null and p_token_hash is not null then
    calc_raw := p_raw_token;
    calc_hash := p_token_hash;
  elsif p_token_hash is not null then
    calc_raw := null;
    calc_hash := p_token_hash;
  else
    -- Generate 32 cryptographically random bytes formatted as base64url
    calc_raw := rtrim(replace(replace(encode(gen_random_bytes(32), 'base64'), '+', '-'), '/', '_'), '=');
    calc_hash := encode(digest(calc_raw, 'sha256'), 'hex');
  end if;

  -- Atomically revoke any existing unused, unrevoked invite for this email in this org
  update public.org_invites
  set revoked_at = now(),
      email = null,
      email_key = null
  where org_id = p_org_id
    and email_key = clean_email
    and used_at is null
    and revoked_at is null;

  -- Insert new invite row
  insert into public.org_invites (
    org_id,
    email,
    email_key,
    role,
    token_hash,
    invited_by,
    created_at,
    expires_at
  ) values (
    p_org_id,
    p_email,
    clean_email,
    p_role,
    calc_hash,
    current_user_id,
    now(),
    now() + interval '7 days'
  )
  returning id into new_invite_id;

  return jsonb_build_object(
    'invite_id', new_invite_id,
    'raw_token', calc_raw,
    'token_hash', calc_hash
  );
end;
$$;

revoke all on function public.create_invite(uuid, text, text, text, text) from public;
grant execute on function public.create_invite(uuid, text, text, text, text) to authenticated;

-- 6. Atomic function: revoke_invite
create or replace function public.revoke_invite(
  p_invite_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid;
  target_org_id uuid;
begin
  current_user_id := auth.uid();
  if current_user_id is null then
    raise exception 'not_authenticated';
  end if;

  select org_id into target_org_id
  from public.org_invites
  where id = p_invite_id;

  if target_org_id is null then
    raise exception 'invite_not_found';
  end if;

  -- Caller must be admin of the organization
  if not exists (
    select 1 from public.org_officers
    where org_id = target_org_id
      and officer_id = current_user_id
      and role = 'admin'
  ) then
    raise exception 'not_authorized';
  end if;

  update public.org_invites
  set revoked_at = now(),
      email = null,
      email_key = null
  where id = p_invite_id
    and revoked_at is null
    and used_at is null;
end;
$$;

revoke all on function public.revoke_invite(uuid) from public;
grant execute on function public.revoke_invite(uuid) to authenticated;

-- 7. Atomic function: change_role
create or replace function public.change_role(
  p_officer_id uuid,
  p_role text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid;
  target_org_id uuid;
  target_current_role text;
  admin_count int;
begin
  current_user_id := auth.uid();
  if current_user_id is null then
    raise exception 'not_authenticated';
  end if;

  if p_role not in ('admin', 'finance', 'officer') then
    raise exception 'invalid_role';
  end if;

  select org_id, role into target_org_id, target_current_role
  from public.org_officers
  where officer_id = p_officer_id;

  if target_org_id is null then
    raise exception 'officer_not_found';
  end if;

  -- Caller must be admin of the org
  if not exists (
    select 1 from public.org_officers
    where org_id = target_org_id
      and officer_id = current_user_id
      and role = 'admin'
  ) then
    raise exception 'not_authorized';
  end if;

  -- Lock the org row to serialize admin changes
  perform 1 from public.orgs where id = target_org_id for update;

  -- If demoting an admin, verify at least one other admin remains
  if target_current_role = 'admin' and p_role != 'admin' then
    select count(*) into admin_count
    from public.org_officers
    where org_id = target_org_id and role = 'admin';

    if admin_count <= 1 then
      raise exception 'last_admin';
    end if;
  end if;

  update public.org_officers
  set role = p_role
  where officer_id = p_officer_id and org_id = target_org_id;
end;
$$;

revoke all on function public.change_role(uuid, text) from public;
grant execute on function public.change_role(uuid, text) to authenticated;

-- 8. Atomic function: remove_officer
create or replace function public.remove_officer(
  p_officer_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid;
  target_org_id uuid;
  target_current_role text;
  admin_count int;
begin
  current_user_id := auth.uid();
  if current_user_id is null then
    raise exception 'not_authenticated';
  end if;

  select org_id, role into target_org_id, target_current_role
  from public.org_officers
  where officer_id = p_officer_id;

  if target_org_id is null then
    raise exception 'officer_not_found';
  end if;

  -- Caller must be admin of the org
  if not exists (
    select 1 from public.org_officers
    where org_id = target_org_id
      and officer_id = current_user_id
      and role = 'admin'
  ) then
    raise exception 'not_authorized';
  end if;

  -- Lock the org row to serialize admin changes
  perform 1 from public.orgs where id = target_org_id for update;

  -- If removing an admin, verify at least one other admin remains
  if target_current_role = 'admin' then
    select count(*) into admin_count
    from public.org_officers
    where org_id = target_org_id and role = 'admin';

    if admin_count <= 1 then
      raise exception 'last_admin';
    end if;
  end if;

  delete from public.org_officers
  where officer_id = p_officer_id and org_id = target_org_id;
end;
$$;

revoke all on function public.remove_officer(uuid) from public;
grant execute on function public.remove_officer(uuid) to authenticated;

-- 9. Atomic function: accept_invite
create or replace function public.accept_invite(
  p_token_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid;
  caller_email text;
  inv record;
begin
  current_user_id := auth.uid();
  if current_user_id is null then
    return jsonb_build_object('status', 'not_authenticated');
  end if;

  -- 1. Look up invite by token_hash with row lock
  select * into inv
  from public.org_invites
  where token_hash = p_token_hash
  for update;

  if inv.id is null
     or inv.used_at is not null
     or inv.revoked_at is not null
     or inv.expires_at < now() then
    return jsonb_build_object('status', 'invalid');
  end if;

  -- Retrieve caller's verified Google email from officers table
  select lower(btrim(email)) into caller_email
  from public.officers
  where id = current_user_id;

  if caller_email is null then
    return jsonb_build_object('status', 'consent_required');
  end if;

  -- 2. Compare verified email with email_key
  if caller_email != coalesce(inv.email_key, '') then
    return jsonb_build_object('status', 'email_mismatch');
  end if;

  -- 3. Check membership constraints
  if exists (
    select 1 from public.org_officers
    where org_id = inv.org_id and officer_id = current_user_id
  ) then
    return jsonb_build_object('status', 'already_member', 'org_id', inv.org_id);
  end if;

  if exists (
    select 1 from public.org_officers
    where officer_id = current_user_id
  ) then
    return jsonb_build_object('status', 'in_other_org');
  end if;

  -- 4. Insert into org_officers with invite's role, mark invite used, null email fields
  begin
    insert into public.org_officers (org_id, officer_id, role, joined_at)
    values (inv.org_id, current_user_id, inv.role, now());
  exception
    when unique_violation then
      return jsonb_build_object('status', 'in_other_org');
  end;

  update public.org_invites
  set used_at = now(),
      email = null,
      email_key = null
  where id = inv.id;

  return jsonb_build_object('status', 'success', 'org_id', inv.org_id);
end;
$$;

revoke all on function public.accept_invite(text) from public;
grant execute on function public.accept_invite(text) to authenticated;

-- 10. Scheduled retention cleanup function
create or replace function public.cleanup_expired_invites()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count int;
begin
  delete from public.org_invites
  where coalesce(used_at, revoked_at, expires_at) < now() - interval '30 days';

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.cleanup_expired_invites() from public;
grant execute on function public.cleanup_expired_invites() to service_role;


-- >>> FILE: 20261103090000_a4_member_join.sql
-- A4: members join an org through a public link or QR, with consent.
-- Builds on the A1 (officers) and A2 (orgs, org_officers) migrations.
--
-- Access model: students never touch these tables. The public page calls the
-- join functions from the server with the service-role key; the functions are
-- not callable by anon or signed-in users. Admins manage the link through
-- their own session (row level security + set_join_link).

-- 1. Admin role ---------------------------------------------------------------
-- v0.2 has no way to invite officers yet, so every existing officer created
-- their org: make the earliest officer of each org its admin.
update public.org_officers oo
   set role = 'admin'
 where oo.role = 'officer'
   and oo.officer_id = (
     select o2.officer_id
       from public.org_officers o2
      where o2.org_id = oo.org_id
      order by o2.joined_at asc, o2.officer_id asc
      limit 1
   );

create or replace function public.is_org_admin(target_org uuid)
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
      and role = 'admin'
  );
$$;

revoke all on function public.is_org_admin(uuid) from public, anon;
grant execute on function public.is_org_admin(uuid) to authenticated;

-- The officer who creates an org is its admin.
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

  insert into public.orgs (name, school, name_key)
  values (clean_name, clean_school, public.org_name_key(clean_name, clean_school))
  returning id into new_org_id;

  insert into public.org_officers (org_id, officer_id, role, joined_at)
  values (new_org_id, current_user_id, 'admin', now());

  return new_org_id;
end;
$$;

revoke all on function public.create_organization(text, text) from public, anon;
grant execute on function public.create_organization(text, text) to authenticated;

-- 2. Join links ---------------------------------------------------------------
create table if not exists public.org_join_links (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  -- Public by design (it is the link), so it must be unguessable: two random
  -- UUIDs joined, about 244 bits.
  token text not null unique
    default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  replaced_at timestamptz null
);

-- At most one working link per org
create unique index if not exists org_join_links_one_active_per_org
  on public.org_join_links (org_id) where active;

alter table public.org_join_links enable row level security;
revoke all on public.org_join_links from anon, authenticated;
grant select on public.org_join_links to authenticated;

drop policy if exists "Admins can read their org join links" on public.org_join_links;
create policy "Admins can read their org join links"
  on public.org_join_links
  for select
  to authenticated
  using (public.is_org_admin(org_id));

-- Admin actions: 'on' | 'off' | 'regenerate'. Returns the new token, or null
-- when the link is now off. Old tokens are never switched back on.
create or replace function public.set_join_link(target_org uuid, link_action text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  new_token text;
begin
  if not public.is_org_admin(target_org) then
    raise exception 'not_admin';
  end if;

  if link_action not in ('on', 'off', 'regenerate') then
    raise exception 'invalid_action';
  end if;

  -- Serialise concurrent clicks for the same org
  perform 1 from public.orgs where id = target_org for update;

  if link_action = 'on' and exists (
    select 1 from public.org_join_links where org_id = target_org and active
  ) then
    -- Already on: nothing to change
    select token into new_token from public.org_join_links
     where org_id = target_org and active;
    return new_token;
  end if;

  update public.org_join_links
     set active = false,
         replaced_at = case when link_action = 'regenerate' then now() else replaced_at end
   where org_id = target_org and active;

  if link_action = 'off' then
    return null;
  end if;

  insert into public.org_join_links (org_id) values (target_org)
  returning token into new_token;
  return new_token;
end;
$$;

revoke all on function public.set_join_link(uuid, text) from public, anon;
grant execute on function public.set_join_link(uuid, text) to authenticated;

-- 3. Members ------------------------------------------------------------------
create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  full_name text not null check (char_length(full_name) between 2 and 100),
  email text not null,
  -- Lowercased, trimmed email: the same person can't join the same org twice
  email_key text not null,
  -- New joins are 'pending' until an officer confirms them (R1 owns the rest)
  status text not null default 'pending',
  -- Which consent wording and language the student saw, and when
  consent_version text not null,
  consent_language text not null check (consent_language in ('en', 'fil')),
  consent_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (org_id, email_key)
);

alter table public.members enable row level security;
revoke all on public.members from anon, authenticated;
grant select on public.members to authenticated;

-- Officers of the org can read its members (for the R1 roster). No insert,
-- update or delete policies: writes happen only through join_org below.
drop policy if exists "Officers can read members of their org" on public.members;
create policy "Officers can read members of their org"
  on public.members
  for select
  to authenticated
  using (public.is_org_member(org_id));

-- 4. Public join: server only -------------------------------------------------
-- Returns only the org's name, or null when the link isn't active.
create or replace function public.get_join_org(p_token text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select o.name
    from public.org_join_links l
    join public.orgs o on o.id = l.org_id
   where l.token = p_token
     and l.active;
$$;

-- Saves the member in one step. Returns 'ok' (also when this email is already
-- in the org, so the page never reveals who is a member) or 'inactive'.
create or replace function public.join_org(
  p_token text,
  p_name text,
  p_email text,
  p_language text,
  p_consent_version text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  target_org uuid;
  clean_name text;
  clean_email text;
begin
  select org_id into target_org
    from public.org_join_links
   where token = p_token and active;

  if target_org is null then
    return 'inactive';
  end if;

  clean_name := regexp_replace(btrim(coalesce(p_name, '')), '\s+', ' ', 'g');
  clean_email := btrim(coalesce(p_email, ''));

  if char_length(clean_name) < 2 or char_length(clean_name) > 100 then
    raise exception 'invalid_name';
  end if;
  if char_length(clean_email) > 254 or clean_email !~ '^[^[:space:]@]+@[^[:space:]@.]+(\.[^[:space:]@.]+)*\.[a-zA-Z]{2,}$' then
    raise exception 'invalid_email';
  end if;
  if p_language not in ('en', 'fil') then
    raise exception 'invalid_language';
  end if;

  insert into public.members (
    org_id, full_name, email, email_key,
    consent_version, consent_language, consent_at
  )
  values (
    target_org, clean_name, clean_email, lower(clean_email),
    p_consent_version, p_language, now()
  )
  on conflict (org_id, email_key) do nothing;

  return 'ok';
end;
$$;

-- 5. Rate limiting: server only -----------------------------------------------
-- One row per (hashed client, minute). The server hashes the IP before it gets
-- here, so no raw IP is stored.
create table if not exists public.join_attempts (
  key text not null,
  window_start timestamptz not null,
  attempts int not null default 0,
  primary key (key, window_start)
);

alter table public.join_attempts enable row level security;
revoke all on public.join_attempts from anon, authenticated;

-- Counts this attempt. Returns true when it is allowed, false when the client
-- is over the limit for the current minute.
create or replace function public.hit_join_rate_limit(p_key text, p_limit int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_attempts int;
begin
  insert into public.join_attempts as a (key, window_start, attempts)
  values (p_key, date_trunc('minute', now()), 1)
  on conflict (key, window_start)
  do update set attempts = a.attempts + 1
  returning a.attempts into current_attempts;

  -- Housekeeping: old windows carry no meaning
  delete from public.join_attempts where window_start < now() - interval '1 hour';

  return current_attempts <= p_limit;
end;
$$;

revoke all on function public.get_join_org(text) from public, anon, authenticated;
revoke all on function public.join_org(text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.hit_join_rate_limit(text, int) from public, anon, authenticated;
grant execute on function public.get_join_org(text) to service_role;
grant execute on function public.join_org(text, text, text, text, text) to service_role;
grant execute on function public.hit_join_rate_limit(text, int) to service_role;


-- >>> FILE: 20261103100000_a3_schedule_invite_cleanup.sql
-- A3: delete invite rows 30 days after they are used, revoked or expired.
-- cleanup_expired_invites() was defined in 20261102120000_a3_invite_officers.sql
-- but nothing ran it. This schedules it daily with pg_cron.
--
-- pg_cron is a Supabase extension (Database > Extensions). Where it is not
-- available, such as a plain local Postgres, this migration only prints a
-- notice, so it never blocks the other migrations. Enable the extension and
-- re-run this file to turn the schedule on.

do $$
begin
  if not exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    raise notice 'pg_cron is not available: invite cleanup is NOT scheduled. Enable pg_cron and re-run this migration.';
    return;
  end if;

  create extension if not exists pg_cron;

  -- Re-running replaces the job instead of stacking a second one
  perform cron.unschedule(jobid)
  from cron.job
  where jobname = 'a3-cleanup-expired-invites';

  perform cron.schedule(
    'a3-cleanup-expired-invites',
    '0 3 * * *',  -- every day at 03:00 UTC
    $job$select public.cleanup_expired_invites()$job$
  );
end
$$;


-- >>> FILE: 20261107120000_r1_member_roster.sql
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
     and active = true
   limit 1;

  return active_token;
end;
$$;

-- Grant execution to authenticated users
grant execute on function public.get_org_join_link(uuid) to authenticated;


-- >>> FILE: 20261108100000_r4_member_exports.sql
-- R4: export the roster to CSV.
--
-- The file itself is made on the server from the admin's own session, so row
-- level security still applies. This migration only adds the audit record of
-- who exported what. Users never write to it directly: the only way in is
-- record_member_export, which checks the caller is an admin of the org.

create table if not exists public.member_exports (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  officer_id uuid not null references public.officers (id) on delete cascade,
  row_count integer not null check (row_count >= 0),
  -- Which fields left the app, e.g. {full_name,email,status}
  fields text[] not null check (cardinality(fields) > 0),
  -- Which member statuses were included
  statuses text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists member_exports_org_created_idx
  on public.member_exports (org_id, created_at desc);

alter table public.member_exports enable row level security;
revoke all on public.member_exports from anon, authenticated;
grant select on public.member_exports to authenticated;

-- Admins of the org can read its export record. No insert, update or delete
-- policies, and no write grants: writes happen only in record_member_export.
drop policy if exists "Admins can read their org exports" on public.member_exports;
create policy "Admins can read their org exports"
  on public.member_exports
  for select
  to authenticated
  using (public.is_org_admin(org_id));

create or replace function public.record_member_export(
  target_org uuid,
  p_fields text[],
  p_statuses text[],
  p_row_count integer
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid;
  new_id uuid;
begin
  caller_id := auth.uid();
  if caller_id is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_org_admin(target_org) then
    raise exception 'Not permitted to export members of this organization';
  end if;

  if p_fields is null or cardinality(p_fields) = 0
     or not (p_fields <@ array['full_name','email','status','created_at','consent_at','consent_language']) then
    raise exception 'Invalid export fields';
  end if;

  if p_statuses is null
     or not (p_statuses <@ array['pending','active','inactive']) then
    raise exception 'Invalid export statuses';
  end if;

  if p_row_count is null or p_row_count < 0 then
    raise exception 'Invalid row count';
  end if;

  insert into public.member_exports (org_id, officer_id, row_count, fields, statuses)
  values (target_org, caller_id, p_row_count, p_fields, p_statuses)
  returning id into new_id;

  return new_id;
end;
$$;

revoke all on function public.record_member_export(uuid, text[], text[], integer) from public, anon;
grant execute on function public.record_member_export(uuid, text[], text[], integer) to authenticated;


-- >>> FILE: 20261108120000_r2_member_edit_deactivate.sql
-- R2: Member editing, deactivation, and reactivation
-- Allows officers to correct a member's details and deactivate/reactivate members.

-- 1. Add updated_at to members
alter table public.members
  add column if not exists updated_at timestamptz not null default now();

-- 2. Security Definer Function: update_member
-- Allows an officer to update a member's full name and email.
-- Validates:
--   - Caller must be an authenticated officer belonging to the member's organization.
--   - Name must be 2 to 100 characters.
--   - Email must be valid format and <= 254 characters.
--   - Email must be unique within the organization (ignoring case and whitespace).
--   - Leaves consent record (version, language, consent_at) completely untouched.
create or replace function public.update_member(
  target_member uuid,
  new_name text,
  new_email text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid;
  member_org uuid;
  clean_name text;
  clean_email text;
  email_collision boolean;
begin
  caller_id := auth.uid();
  if caller_id is null then
    raise exception 'not_authenticated';
  end if;

  select org_id
    into member_org
    from public.members
   where id = target_member;

  if member_org is null then
    raise exception 'member_not_found';
  end if;

  -- Verify caller is an officer of this organization
  if not public.is_org_member(member_org) then
    raise exception 'not_permitted';
  end if;

  clean_name := regexp_replace(btrim(coalesce(new_name, '')), '\s+', ' ', 'g');
  clean_email := btrim(coalesce(new_email, ''));

  if char_length(clean_name) < 2 or char_length(clean_name) > 100 then
    raise exception 'invalid_name';
  end if;

  if char_length(clean_email) > 254 or clean_email !~ '^[^[:space:]@]+@[^[:space:]@.]+(\.[^[:space:]@.]+)*\.[a-zA-Z]{2,}$' then
    raise exception 'invalid_email';
  end if;

  -- Check if another member in this org already uses the lowercased email
  select exists (
    select 1
      from public.members
     where org_id = member_org
       and email_key = lower(clean_email)
       and id <> target_member
  ) into email_collision;

  if email_collision then
    raise exception 'duplicate_email';
  end if;

  -- Update name, email, email_key and updated_at. Consent columns remain strictly untouched.
  update public.members
     set full_name = clean_name,
         email = clean_email,
         email_key = lower(clean_email),
         updated_at = now()
   where id = target_member;

  return 'ok';
end;
$$;

revoke all on function public.update_member(uuid, text, text) from public, anon;
grant execute on function public.update_member(uuid, text, text) to authenticated;

-- 3. Security Definer Function: set_member_status
-- Allows an officer to deactivate (pending -> inactive, active -> inactive)
-- or reactivate (inactive -> active) a member.
-- Security checks:
--   - Caller must be authenticated officer of the member's org.
--   - Allowed status transitions:
--       'pending'  -> 'inactive' (reject sign-up)
--       'active'   -> 'inactive' (deactivate member)
--       'inactive' -> 'active'   (reactivate member)
--   - Idempotent: If target status matches current status, returns 'ok'.
create or replace function public.set_member_status(
  target_member uuid,
  new_status text
)
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
    raise exception 'not_authenticated';
  end if;

  select org_id, status
    into member_org, current_status
    from public.members
   where id = target_member;

  if member_org is null then
    raise exception 'member_not_found';
  end if;

  -- Verify caller is an officer of this organization
  if not public.is_org_member(member_org) then
    raise exception 'not_permitted';
  end if;

  if new_status not in ('active', 'inactive') then
    raise exception 'invalid_status';
  end if;

  -- Idempotent check
  if current_status = new_status then
    return 'ok';
  end if;

  -- Validate permitted transitions
  if new_status = 'inactive' then
    if current_status not in ('pending', 'active') then
      raise exception 'invalid_status_transition';
    end if;
  elsif new_status = 'active' then
    if current_status not in ('inactive') then
      raise exception 'invalid_status_transition';
    end if;
  end if;

  update public.members
     set status = new_status,
         updated_at = now()
   where id = target_member;

  return 'ok';
end;
$$;

revoke all on function public.set_member_status(uuid, text) from public, anon;
grant execute on function public.set_member_status(uuid, text) to authenticated;


-- >>> FILE: 20261108120000_r3_member_invites.sql
-- R3: an admin imports a CSV roster as INVITATIONS, never as members.
-- Builds on A4 (members, join_org, org_join_links) and A2 (is_org_admin).
--
-- Why invitations: A4's join page is the only place a student sees the consent
-- wording, so someone who was never shown it can't be a member. An invitation
-- holds an email (and a name if given) for 60 days, then it is deleted.
--
-- Access model: admins read their own org's rows through row level security.
-- Nothing is writable directly; the import goes through import_member_invites
-- and the link to a joining student goes through join_org.

-- 1. Table --------------------------------------------------------------------
create table if not exists public.member_invites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  email text not null check (char_length(email) <= 254),
  -- Lowercased, trimmed email: the same person is invited once per org
  email_key text not null,
  name text null check (name is null or char_length(name) between 1 and 100),
  created_at timestamptz not null default now(),
  -- Kept to a minimum on purpose: gone 60 days after the invitation
  expires_at timestamptz not null default (now() + interval '60 days'),
  -- Set when the person joins through the org's join link with this email
  joined_at timestamptz null,
  unique (org_id, email_key)
);

create index if not exists member_invites_org_created_idx
  on public.member_invites (org_id, created_at desc);

create index if not exists member_invites_expires_idx
  on public.member_invites (expires_at);

alter table public.member_invites enable row level security;
revoke all on public.member_invites from anon, authenticated;
grant select on public.member_invites to authenticated;

drop policy if exists "Admins can read their org invitations" on public.member_invites;
create policy "Admins can read their org invitations"
  on public.member_invites
  for select
  to authenticated
  using (public.is_org_admin(org_id));

-- 2. Import ---------------------------------------------------------------------
-- p_rows: a JSON array of {"row": <line in the file>, "email": "...", "name": "..."}.
-- Returns {invited, duplicates, invalid, invalid_rows: [{row, email, reason}], dry_run}.
-- With p_dry_run = true nothing is written, so the preview and the real import
-- share one set of rules and cannot disagree. Everything runs in one
-- transaction: if anything fails, no row is saved.
--
-- Errors raised: not_admin, invalid_rows, no_rows, too_many_rows.
-- Row reasons: missing_email, invalid_email, name_too_long, invalid_row.
create or replace function public.import_member_invites(
  target_org uuid,
  p_rows jsonb,
  p_dry_run boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  max_rows constant int := 1000;
  item jsonb;
  ord bigint;
  row_no int;
  raw_email text;
  raw_name text;
  clean_email text;
  clean_name text;
  key text;
  seen text[] := '{}';
  invited int := 0;
  duplicates int := 0;
  invalid int := 0;
  bad jsonb := '[]'::jsonb;
  inserted int;
  reason text;
begin
  if not public.is_org_admin(target_org) then
    raise exception 'not_admin';
  end if;

  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    raise exception 'invalid_rows';
  end if;
  if jsonb_array_length(p_rows) = 0 then
    raise exception 'no_rows';
  end if;
  if jsonb_array_length(p_rows) > max_rows then
    raise exception 'too_many_rows';
  end if;

  -- Serialise concurrent imports for the same org (double press, two tabs)
  perform 1 from public.orgs where id = target_org for update;

  -- An expired invitation must not block inviting the same email again
  if not p_dry_run then
    delete from public.member_invites
     where org_id = target_org and expires_at <= now();
  end if;

  for item, ord in
    select value, ordinality from jsonb_array_elements(p_rows) with ordinality
  loop
    reason := null;
    clean_email := null;
    clean_name := null;
    raw_email := null;
    raw_name := null;
    row_no := ord;

    if jsonb_typeof(item) = 'object' then
      if jsonb_typeof(item -> 'row') = 'number' then
        row_no := (item ->> 'row')::numeric::int;
      end if;
      if jsonb_typeof(item -> 'email') in ('string', 'number') then
        raw_email := item ->> 'email';
      end if;
      if jsonb_typeof(item -> 'name') in ('string', 'number') then
        raw_name := item ->> 'name';
      end if;
    else
      reason := 'invalid_row';
    end if;

    if reason is null then
      clean_email := btrim(coalesce(raw_email, ''));
      if clean_email = '' then
        reason := 'missing_email';
      elsif char_length(clean_email) > 254
         or clean_email ~ '[[:cntrl:]]'
         or clean_email !~ '^[^[:space:]@]+@[^[:space:]@.]+(\.[^[:space:]@.]+)*\.[a-zA-Z]{2,}$' then
        reason := 'invalid_email';
      end if;
    end if;

    if reason is null then
      -- Odd characters become spaces or vanish; a name that is still too long is skipped
      clean_name := regexp_replace(coalesce(raw_name, ''), '[[:cntrl:]]', ' ', 'g');
      clean_name := regexp_replace(clean_name, '[​-‍⁠﻿]', '', 'g');
      clean_name := nullif(btrim(regexp_replace(clean_name, '\s+', ' ', 'g')), '');
      if clean_name is not null and char_length(clean_name) > 100 then
        reason := 'name_too_long';
      end if;
    end if;

    if reason is not null then
      invalid := invalid + 1;
      bad := bad || jsonb_build_array(jsonb_build_object(
        'row', row_no,
        'email', left(coalesce(raw_email, ''), 254),
        'reason', reason
      ));
      continue;
    end if;

    key := lower(clean_email);

    -- Same email twice in the file: counted once
    if key = any (seen) then
      duplicates := duplicates + 1;
      continue;
    end if;
    seen := seen || key;

    -- Already a member, or already invited and not expired
    if exists (select 1 from public.members where org_id = target_org and email_key = key)
       or exists (
         select 1 from public.member_invites
          where org_id = target_org and email_key = key and expires_at > now()
       ) then
      duplicates := duplicates + 1;
      continue;
    end if;

    if p_dry_run then
      invited := invited + 1;
    else
      insert into public.member_invites (org_id, email, email_key, name)
      values (target_org, clean_email, key, clean_name)
      on conflict (org_id, email_key) do nothing;
      get diagnostics inserted = row_count;
      if inserted = 1 then
        invited := invited + 1;
      else
        duplicates := duplicates + 1;
      end if;
    end if;
  end loop;

  return jsonb_build_object(
    'invited', invited,
    'duplicates', duplicates,
    'invalid', invalid,
    'invalid_rows', bad,
    'dry_run', p_dry_run
  );
end;
$$;

revoke all on function public.import_member_invites(uuid, jsonb, boolean) from public, anon;
grant execute on function public.import_member_invites(uuid, jsonb, boolean) to authenticated;

-- 3. Cleanup --------------------------------------------------------------------
-- Deletes expired invitations, which removes the stored name and email.
-- Scheduled by 20261108120100_r3_schedule_member_invite_cleanup.sql and also
-- run when an admin opens the Members page.
create or replace function public.cleanup_expired_member_invites()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count int;
begin
  delete from public.member_invites where expires_at <= now();
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.cleanup_expired_member_invites() from public, anon, authenticated;
grant execute on function public.cleanup_expired_member_invites() to service_role;

-- 4. join_org links an invitation when the student joins ---------------------------
-- Same signature and return values as A4: it still answers 'ok' for everyone,
-- so the page never reveals who was invited. Only the update at the end is new.
create or replace function public.join_org(
  p_token text,
  p_name text,
  p_email text,
  p_language text,
  p_consent_version text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  target_org uuid;
  clean_name text;
  clean_email text;
begin
  select org_id into target_org
    from public.org_join_links
   where token = p_token and active;

  if target_org is null then
    return 'inactive';
  end if;

  clean_name := regexp_replace(btrim(coalesce(p_name, '')), '\s+', ' ', 'g');
  clean_email := btrim(coalesce(p_email, ''));

  if char_length(clean_name) < 2 or char_length(clean_name) > 100 then
    raise exception 'invalid_name';
  end if;
  if char_length(clean_email) > 254 or clean_email !~ '^[^[:space:]@]+@[^[:space:]@.]+(\.[^[:space:]@.]+)*\.[a-zA-Z]{2,}$' then
    raise exception 'invalid_email';
  end if;
  if p_language not in ('en', 'fil') then
    raise exception 'invalid_language';
  end if;

  insert into public.members (
    org_id, full_name, email, email_key,
    consent_version, consent_language, consent_at
  )
  values (
    target_org, clean_name, clean_email, lower(clean_email),
    p_consent_version, p_language, now()
  )
  on conflict (org_id, email_key) do nothing;

  -- R3: the student agreed through the join link, so their invitation (same
  -- email, ignoring capitals) shows as joined. A different email changes nothing.
  update public.member_invites
     set joined_at = now()
   where org_id = target_org
     and email_key = lower(clean_email)
     and joined_at is null
     and expires_at > now();

  return 'ok';
end;
$$;

revoke all on function public.join_org(text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.join_org(text, text, text, text, text) to service_role;


-- >>> FILE: 20261108120100_r3_schedule_member_invite_cleanup.sql
-- R3: delete expired member invitations daily, so the stored name and email
-- are removed once the 60 days are up. Same approach as the A3 schedule.
--
-- pg_cron is a Supabase extension (Database > Extensions). Where it is not
-- available, such as a plain local Postgres, this migration only prints a
-- notice, so it never blocks the other migrations. The Members page also runs
-- the cleanup when an admin opens it. Enable the extension and re-run this
-- file to turn the schedule on.

do $$
begin
  if not exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    raise notice 'pg_cron is not available: member invitation cleanup is NOT scheduled. Enable pg_cron and re-run this migration.';
    return;
  end if;

  create extension if not exists pg_cron;

  -- Re-running replaces the job instead of stacking a second one
  perform cron.unschedule(jobid)
  from cron.job
  where jobname = 'r3-cleanup-expired-member-invites';

  perform cron.schedule(
    'r3-cleanup-expired-member-invites',
    '15 3 * * *',  -- every day at 03:15 UTC
    $job$select public.cleanup_expired_member_invites()$job$
  );
end
$$;


-- >>> FILE: 20261109120000_r2_stale_status_guard.sql
-- R2: Stale-state guard for member edit / status changes
-- When an officer acts on a member row that another officer has since changed
-- (for example deactivated), the action must not silently succeed. The caller
-- passes the status it last saw; if the member's status differs, the function
-- raises 'stale_member' so the UI can show a clear message and refresh the row.
--
-- expected_status is optional. When null the functions behave exactly as before.

drop function if exists public.update_member(uuid, text, text);
drop function if exists public.set_member_status(uuid, text);

create or replace function public.update_member(
  target_member uuid,
  new_name text,
  new_email text,
  expected_status text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid;
  member_org uuid;
  current_status text;
  clean_name text;
  clean_email text;
  email_collision boolean;
begin
  caller_id := auth.uid();
  if caller_id is null then
    raise exception 'not_authenticated';
  end if;

  select org_id, status
    into member_org, current_status
    from public.members
   where id = target_member;

  if member_org is null then
    raise exception 'member_not_found';
  end if;

  -- Verify caller is an officer of this organization
  if not public.is_org_member(member_org) then
    raise exception 'not_permitted';
  end if;

  -- The row changed under the caller (e.g. deactivated by another officer)
  if expected_status is not null and current_status <> expected_status then
    raise exception 'stale_member';
  end if;

  clean_name := regexp_replace(btrim(coalesce(new_name, '')), '\s+', ' ', 'g');
  clean_email := btrim(coalesce(new_email, ''));

  if char_length(clean_name) < 2 or char_length(clean_name) > 100 then
    raise exception 'invalid_name';
  end if;

  if char_length(clean_email) > 254 or clean_email !~ '^[^[:space:]@]+@[^[:space:]@.]+(\.[^[:space:]@.]+)*\.[a-zA-Z]{2,}$' then
    raise exception 'invalid_email';
  end if;

  select exists (
    select 1
      from public.members
     where org_id = member_org
       and email_key = lower(clean_email)
       and id <> target_member
  ) into email_collision;

  if email_collision then
    raise exception 'duplicate_email';
  end if;

  -- Consent columns remain strictly untouched.
  update public.members
     set full_name = clean_name,
         email = clean_email,
         email_key = lower(clean_email),
         updated_at = now()
   where id = target_member;

  return 'ok';
end;
$$;

revoke all on function public.update_member(uuid, text, text, text) from public, anon;
grant execute on function public.update_member(uuid, text, text, text) to authenticated;

create or replace function public.set_member_status(
  target_member uuid,
  new_status text,
  expected_status text default null
)
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
    raise exception 'not_authenticated';
  end if;

  select org_id, status
    into member_org, current_status
    from public.members
   where id = target_member;

  if member_org is null then
    raise exception 'member_not_found';
  end if;

  -- Verify caller is an officer of this organization
  if not public.is_org_member(member_org) then
    raise exception 'not_permitted';
  end if;

  if new_status not in ('active', 'inactive') then
    raise exception 'invalid_status';
  end if;

  -- The row changed under the caller (e.g. already deactivated by someone else).
  -- Checked before the idempotent shortcut so a stale view is never a silent no-op.
  if expected_status is not null and current_status <> expected_status then
    raise exception 'stale_member';
  end if;

  -- Idempotent when the caller did not state what it expected
  if current_status = new_status then
    return 'ok';
  end if;

  if new_status = 'inactive' then
    if current_status not in ('pending', 'active') then
      raise exception 'invalid_status_transition';
    end if;
  elsif new_status = 'active' then
    if current_status not in ('inactive') then
      raise exception 'invalid_status_transition';
    end if;
  end if;

  update public.members
     set status = new_status,
         updated_at = now()
   where id = target_member;

  return 'ok';
end;
$$;

revoke all on function public.set_member_status(uuid, text, text) from public, anon;
grant execute on function public.set_member_status(uuid, text, text) to authenticated;


-- >>> FILE: 20261110120000_e1_events.sql
-- E1: Events
-- Officers create, edit and cancel events for their org. Events are never
-- deleted (cancel only), so attendance history survives.
--
-- Reads go through RLS (is_org_member). Writes only happen through the
-- security-definer functions below, so no insert/update/delete policies exist.

-- 1. Table
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  location text,
  status text not null default 'scheduled',
  -- Kept if the creating account is removed, so history is not lost
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.events drop constraint if exists events_status_check;
alter table public.events
  add constraint events_status_check check (status in ('scheduled', 'cancelled'));

alter table public.events drop constraint if exists events_title_length;
alter table public.events
  add constraint events_title_length check (char_length(btrim(title)) between 2 and 100);

alter table public.events drop constraint if exists events_location_length;
alter table public.events
  add constraint events_location_length check (location is null or char_length(location) between 1 and 200);

alter table public.events drop constraint if exists events_time_order;
alter table public.events
  add constraint events_time_order check (ends_at > starts_at);

create index if not exists events_org_starts_idx
  on public.events (org_id, starts_at desc);

-- 2. Row level security: officers of the org can read; nobody writes directly
alter table public.events enable row level security;

revoke all on public.events from anon, authenticated;
grant select on public.events to authenticated;

drop policy if exists "Officers can read events of their org" on public.events;
create policy "Officers can read events of their org"
  on public.events
  for select
  to authenticated
  using (public.is_org_member(org_id));

-- 3. create_event
-- Validates: caller is an officer of the org; title 2 to 100 characters;
-- end after start; location optional (blank becomes null), up to 200 characters.
create or replace function public.create_event(
  target_org uuid,
  new_title text,
  new_starts_at timestamptz,
  new_ends_at timestamptz,
  new_location text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid;
  clean_title text;
  clean_location text;
  new_id uuid;
begin
  caller_id := auth.uid();
  if caller_id is null then
    raise exception 'not_authenticated';
  end if;

  if target_org is null or not public.is_org_member(target_org) then
    raise exception 'not_permitted';
  end if;

  clean_title := regexp_replace(btrim(coalesce(new_title, '')), '\s+', ' ', 'g');
  clean_location := nullif(regexp_replace(btrim(coalesce(new_location, '')), '\s+', ' ', 'g'), '');

  if char_length(clean_title) < 2 or char_length(clean_title) > 100 then
    raise exception 'invalid_title';
  end if;

  if new_starts_at is null or new_ends_at is null or new_ends_at <= new_starts_at then
    raise exception 'invalid_time_range';
  end if;

  if clean_location is not null and char_length(clean_location) > 200 then
    raise exception 'invalid_location';
  end if;

  insert into public.events (org_id, title, starts_at, ends_at, location, created_by)
  values (target_org, clean_title, new_starts_at, new_ends_at, clean_location, caller_id)
  returning id into new_id;

  return new_id;
end;
$$;

revoke all on function public.create_event(uuid, text, timestamptz, timestamptz, text) from public, anon;
grant execute on function public.create_event(uuid, text, timestamptz, timestamptz, text) to authenticated;

-- 4. update_event
-- Same validation as create_event. A cancelled event can no longer be edited.
create or replace function public.update_event(
  target_event uuid,
  new_title text,
  new_starts_at timestamptz,
  new_ends_at timestamptz,
  new_location text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid;
  event_org uuid;
  current_status text;
  clean_title text;
  clean_location text;
begin
  caller_id := auth.uid();
  if caller_id is null then
    raise exception 'not_authenticated';
  end if;

  select org_id, status
    into event_org, current_status
    from public.events
   where id = target_event;

  if event_org is null then
    raise exception 'event_not_found';
  end if;

  if not public.is_org_member(event_org) then
    raise exception 'not_permitted';
  end if;

  if current_status = 'cancelled' then
    raise exception 'event_cancelled';
  end if;

  clean_title := regexp_replace(btrim(coalesce(new_title, '')), '\s+', ' ', 'g');
  clean_location := nullif(regexp_replace(btrim(coalesce(new_location, '')), '\s+', ' ', 'g'), '');

  if char_length(clean_title) < 2 or char_length(clean_title) > 100 then
    raise exception 'invalid_title';
  end if;

  if new_starts_at is null or new_ends_at is null or new_ends_at <= new_starts_at then
    raise exception 'invalid_time_range';
  end if;

  if clean_location is not null and char_length(clean_location) > 200 then
    raise exception 'invalid_location';
  end if;

  update public.events
     set title = clean_title,
         starts_at = new_starts_at,
         ends_at = new_ends_at,
         location = clean_location,
         updated_at = now()
   where id = target_event;

  return 'ok';
end;
$$;

revoke all on function public.update_event(uuid, text, timestamptz, timestamptz, text) from public, anon;
grant execute on function public.update_event(uuid, text, timestamptz, timestamptz, text) to authenticated;

-- 5. cancel_event
-- Idempotent: cancelling an already cancelled event succeeds and changes nothing.
create or replace function public.cancel_event(
  target_event uuid
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid;
  event_org uuid;
  current_status text;
begin
  caller_id := auth.uid();
  if caller_id is null then
    raise exception 'not_authenticated';
  end if;

  select org_id, status
    into event_org, current_status
    from public.events
   where id = target_event;

  if event_org is null then
    raise exception 'event_not_found';
  end if;

  if not public.is_org_member(event_org) then
    raise exception 'not_permitted';
  end if;

  if current_status = 'cancelled' then
    return 'ok';
  end if;

  update public.events
     set status = 'cancelled',
         updated_at = now()
   where id = target_event;

  return 'ok';
end;
$$;

revoke all on function public.cancel_event(uuid) from public, anon;
grant execute on function public.cancel_event(uuid) to authenticated;


-- >>> FILE: 20261112120000_e2_checkin_open.sql
-- E2: Event check-in window
-- An officer opens and closes the check-in window of an event. Tokens for the
-- rotating QR are signed by the app and never stored, so the only thing the
-- database holds is whether the window is open.
--
-- authenticated has no UPDATE on events (see E1), so checkin_open can only
-- change through the security-definer functions below.

-- 1. Column
alter table public.events
  add column if not exists checkin_open boolean not null default false;

-- 2. set_event_checkin
-- Opening is refused for a cancelled event and for one that ended more than
-- 1 hour ago. Closing always works, so a window can never be stuck open.
create or replace function public.set_event_checkin(
  target_event uuid,
  should_open boolean
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid;
  event_org uuid;
  current_status text;
  event_ends timestamptz;
begin
  caller_id := auth.uid();
  if caller_id is null then
    raise exception 'not_authenticated';
  end if;

  select org_id, status, ends_at
    into event_org, current_status, event_ends
    from public.events
   where id = target_event;

  if event_org is null then
    raise exception 'event_not_found';
  end if;

  if not public.is_org_member(event_org) then
    raise exception 'not_permitted';
  end if;

  if should_open is distinct from true then
    update public.events
       set checkin_open = false,
           updated_at = now()
     where id = target_event
       and checkin_open;
    return 'ok';
  end if;

  if current_status = 'cancelled' then
    raise exception 'event_cancelled';
  end if;

  if event_ends < now() - interval '1 hour' then
    raise exception 'event_ended';
  end if;

  update public.events
     set checkin_open = true,
         updated_at = now()
   where id = target_event
     and not checkin_open;

  return 'ok';
end;
$$;

revoke all on function public.set_event_checkin(uuid, boolean) from public, anon;
grant execute on function public.set_event_checkin(uuid, boolean) to authenticated;

-- 3. cancel_event
-- Same as E1, and a cancelled event also closes its check-in window.
create or replace function public.cancel_event(
  target_event uuid
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid;
  event_org uuid;
  current_status text;
begin
  caller_id := auth.uid();
  if caller_id is null then
    raise exception 'not_authenticated';
  end if;

  select org_id, status
    into event_org, current_status
    from public.events
   where id = target_event;

  if event_org is null then
    raise exception 'event_not_found';
  end if;

  if not public.is_org_member(event_org) then
    raise exception 'not_permitted';
  end if;

  if current_status = 'cancelled' then
    return 'ok';
  end if;

  update public.events
     set status = 'cancelled',
         checkin_open = false,
         updated_at = now()
   where id = target_event;

  return 'ok';
end;
$$;

revoke all on function public.cancel_event(uuid) from public, anon;
grant execute on function public.cancel_event(uuid) to authenticated;


-- >>> FILE: 20261112130000_e3_attendance.sql
-- E3: Member QR check-in
-- A member scans the rotating QR and confirms with the email they joined with.
-- They have no account, so the app server does the work with the service-role
-- key, like /join. Students never touch the tables: the functions below are
-- callable only by service_role.
--
-- Events are never deleted (see E1), so attendance history survives.

-- 1. attendance
create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  method text not null check (method in ('qr', 'manual')),
  marked_by uuid references auth.users (id) on delete set null,
  checked_in_at timestamptz not null default now(),
  unique (event_id, member_id)
);

create index if not exists attendance_org_event_idx
  on public.attendance (org_id, event_id);

-- Officers can read their org's attendance. Nobody else can do anything, and
-- there are no write policies: rows are written only by checkin_member().
alter table public.attendance enable row level security;

revoke all on public.attendance from anon, authenticated;
grant select on public.attendance to authenticated;

drop policy if exists attendance_select_officers on public.attendance;
create policy attendance_select_officers on public.attendance
  for select to authenticated
  using (public.is_org_member(org_id));

-- 2. get_checkin_event
-- What the check-in page shows. A row only comes back while the window is open:
-- same rule as set_event_checkin and getCheckinBlock (not cancelled, ended
-- less than 1 hour ago).
create or replace function public.get_checkin_event(
  p_event uuid
)
returns table (org_name text, event_title text)
language sql
stable
security definer
set search_path = public
as $$
  select o.name, e.title
    from public.events e
    join public.orgs o on o.id = e.org_id
   where e.id = p_event
     and e.checkin_open
     and e.status <> 'cancelled'
     and e.ends_at >= now() - interval '1 hour';
$$;

revoke all on function public.get_checkin_event(uuid) from public, anon, authenticated;
grant execute on function public.get_checkin_event(uuid) to service_role;

-- 3. checkin_member
-- result is one of:
--   closed       the window is closed, the event is cancelled or it ended
--   not_found    no ACTIVE member of the event's org has this email. One result
--                for unknown, pending, inactive and other-org emails, so the
--                page cannot be used to learn who is on the roster.
--   checked_in   a new attendance row was saved
--   already      the member was already checked in, nothing was added
-- first_name is the first word of the member's name and is only set for
-- checked_in and already. The full name never leaves the database.
create or replace function public.checkin_member(
  p_event uuid,
  p_email text
)
returns table (result text, first_name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  event_org uuid;
  event_status text;
  event_ends timestamptz;
  event_open boolean;
  clean_email text;
  found_member uuid;
  found_name text;
  inserted_count integer;
begin
  select org_id, status, ends_at, checkin_open
    into event_org, event_status, event_ends, event_open
    from public.events
   where id = p_event;

  if event_org is null
     or event_open is distinct from true
     or event_status = 'cancelled'
     or event_ends < now() - interval '1 hour' then
    return query select 'closed'::text, null::text;
    return;
  end if;

  clean_email := lower(btrim(coalesce(p_email, '')));

  if clean_email = '' or length(clean_email) > 254 then
    return query select 'not_found'::text, null::text;
    return;
  end if;

  select m.id, m.full_name
    into found_member, found_name
    from public.members m
   where m.org_id = event_org
     and m.email_key = clean_email
     and m.status = 'active';

  if found_member is null then
    return query select 'not_found'::text, null::text;
    return;
  end if;

  insert into public.attendance (org_id, event_id, member_id, method)
  values (event_org, p_event, found_member, 'qr')
  on conflict (event_id, member_id) do nothing;

  get diagnostics inserted_count = row_count;

  return query select
    case when inserted_count > 0 then 'checked_in' else 'already' end,
    split_part(btrim(found_name), ' ', 1);
end;
$$;

revoke all on function public.checkin_member(uuid, text) from public, anon, authenticated;
grant execute on function public.checkin_member(uuid, text) to service_role;


-- >>> FILE: 20261113120000_e4_manual_attendance.sql
-- E4: Manual attendance
-- An officer adds or removes a member from an event's attendance list by hand.
-- authenticated has no INSERT or DELETE on attendance (see E3), so both writes
-- go through the security-definer functions below.
--
-- Rules:
--   * the caller must be an officer of the event's org (is_org_member);
--   * a cancelled event is read-only;
--   * an ended event can still be corrected (no check-in grace here, since
--     fixing the list after the event is the point of manual add);
--   * only an active member of the same org can be added.

-- 1. mark_attendance_manual
-- Returns 'added', or 'already' when the member is already present (for example
-- another officer, or a QR scan, got there first). Never creates a duplicate.
create or replace function public.mark_attendance_manual(
  target_event uuid,
  target_member uuid
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid;
  event_org uuid;
  current_status text;
  inserted_count integer;
begin
  caller_id := auth.uid();
  if caller_id is null then
    raise exception 'not_authenticated';
  end if;

  select org_id, status
    into event_org, current_status
    from public.events
   where id = target_event;

  if event_org is null then
    raise exception 'event_not_found';
  end if;

  if not public.is_org_member(event_org) then
    raise exception 'not_permitted';
  end if;

  if current_status = 'cancelled' then
    raise exception 'event_cancelled';
  end if;

  if not exists (
    select 1
      from public.members
     where id = target_member
       and org_id = event_org
       and status = 'active'
  ) then
    raise exception 'member_not_found';
  end if;

  insert into public.attendance (org_id, event_id, member_id, method, marked_by)
  values (event_org, target_event, target_member, 'manual', caller_id)
  on conflict (event_id, member_id) do nothing;

  get diagnostics inserted_count = row_count;

  if inserted_count > 0 then
    return 'added';
  end if;
  return 'already';
end;
$$;

revoke all on function public.mark_attendance_manual(uuid, uuid) from public, anon;
grant execute on function public.mark_attendance_manual(uuid, uuid) to authenticated;

-- 2. remove_attendance
-- Returns 'removed', or 'already' when the row was already gone.
create or replace function public.remove_attendance(
  target_event uuid,
  target_member uuid
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid;
  event_org uuid;
  current_status text;
  deleted_count integer;
begin
  caller_id := auth.uid();
  if caller_id is null then
    raise exception 'not_authenticated';
  end if;

  select org_id, status
    into event_org, current_status
    from public.events
   where id = target_event;

  if event_org is null then
    raise exception 'event_not_found';
  end if;

  if not public.is_org_member(event_org) then
    raise exception 'not_permitted';
  end if;

  if current_status = 'cancelled' then
    raise exception 'event_cancelled';
  end if;

  delete from public.attendance
   where event_id = target_event
     and member_id = target_member;

  get diagnostics deleted_count = row_count;

  if deleted_count > 0 then
    return 'removed';
  end if;
  return 'already';
end;
$$;

revoke all on function public.remove_attendance(uuid, uuid) from public, anon;
grant execute on function public.remove_attendance(uuid, uuid) to authenticated;


-- >>> FILE: 20261113120100_p1_dues_periods.sql
-- P1: Dues Periods table, indexes, RLS, and security definer functions

-- 1. Create dues_periods table
create table if not exists public.dues_periods (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 100),
  amount numeric(10,2) not null check (amount > 0 and amount <= 100000.00 and scale(amount) <= 2),
  due_on date not null,
  status text not null default 'open' check (status in ('open', 'closed')),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Indexes for efficient lookup and ordering
create index if not exists dues_periods_org_created_idx
  on public.dues_periods (org_id, created_at desc);

create index if not exists dues_periods_org_status_idx
  on public.dues_periods (org_id, status);

-- 3. Row Level Security: Officers of the org can read dues_periods
alter table public.dues_periods enable row level security;

drop policy if exists "Officers can read dues periods in their org" on public.dues_periods;
create policy "Officers can read dues periods in their org"
  on public.dues_periods
  for select
  to authenticated
  using (public.is_org_member(org_id));

-- Direct writes (insert, update, delete) are prohibited from the client API.
-- All mutations must go through the security definer functions below.
revoke insert, update, delete on public.dues_periods from public, anon, authenticated;

-- 4. Security Definer Function: create_dues_period
create or replace function public.create_dues_period(
  p_org_id uuid,
  p_name text,
  p_amount numeric,
  p_due_on date
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid;
  new_id uuid;
begin
  caller_id := auth.uid();
  if caller_id is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_org_member(p_org_id) then
    raise exception 'Not permitted to create dues periods for this organization';
  end if;

  if p_name is null or char_length(trim(p_name)) < 2 or char_length(trim(p_name)) > 100 then
    raise exception 'Name must be between 2 and 100 characters';
  end if;

  if p_amount is null or p_amount <= 0 or p_amount > 100000.00 or scale(p_amount) > 2 then
    raise exception 'Amount must be above 0 and at most 100,000 with up to 2 decimal places';
  end if;

  if p_due_on is null then
    raise exception 'Due date is required';
  end if;

  insert into public.dues_periods (
    org_id,
    name,
    amount,
    due_on,
    status,
    created_by
  ) values (
    p_org_id,
    trim(p_name),
    p_amount,
    p_due_on,
    'open',
    caller_id
  ) returning id into new_id;

  return new_id;
end;
$$;

revoke all on function public.create_dues_period(uuid, text, numeric, date) from public;
grant execute on function public.create_dues_period(uuid, text, numeric, date) to authenticated;

-- 5. Security Definer Function: update_dues_period
create or replace function public.update_dues_period(
  p_period_id uuid,
  p_name text,
  p_amount numeric,
  p_due_on date
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid;
  period_org uuid;
  period_status text;
begin
  caller_id := auth.uid();
  if caller_id is null then
    raise exception 'Not authenticated';
  end if;

  select org_id, status
    into period_org, period_status
    from public.dues_periods
   where id = p_period_id;

  if period_org is null then
    raise exception 'Dues period not found';
  end if;

  if not public.is_org_member(period_org) then
    raise exception 'Not permitted to update dues periods for this organization';
  end if;

  if period_status = 'closed' then
    raise exception 'Cannot edit closed dues period';
  end if;

  if p_name is null or char_length(trim(p_name)) < 2 or char_length(trim(p_name)) > 100 then
    raise exception 'Name must be between 2 and 100 characters';
  end if;

  if p_amount is null or p_amount <= 0 or p_amount > 100000.00 or scale(p_amount) > 2 then
    raise exception 'Amount must be above 0 and at most 100,000 with up to 2 decimal places';
  end if;

  if p_due_on is null then
    raise exception 'Due date is required';
  end if;

  update public.dues_periods
     set name = trim(p_name),
         amount = p_amount,
         due_on = p_due_on,
         updated_at = now()
   where id = p_period_id;

  return 'ok';
end;
$$;

revoke all on function public.update_dues_period(uuid, text, numeric, date) from public;
grant execute on function public.update_dues_period(uuid, text, numeric, date) to authenticated;

-- 6. Security Definer Function: close_dues_period
create or replace function public.close_dues_period(
  p_period_id uuid
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid;
  period_org uuid;
  period_status text;
begin
  caller_id := auth.uid();
  if caller_id is null then
    raise exception 'Not authenticated';
  end if;

  select org_id, status
    into period_org, period_status
    from public.dues_periods
   where id = p_period_id;

  if period_org is null then
    raise exception 'Dues period not found';
  end if;

  if not public.is_org_member(period_org) then
    raise exception 'Not permitted to close dues periods for this organization';
  end if;

  -- Idempotent: if already closed, return ok without error
  if period_status = 'closed' then
    return 'ok';
  end if;

  update public.dues_periods
     set status = 'closed',
         updated_at = now()
   where id = p_period_id;

  return 'ok';
end;
$$;

revoke all on function public.close_dues_period(uuid) from public;
grant execute on function public.close_dues_period(uuid) to authenticated;


-- >>> FILE: 20261113130000_e5_member_attendance_history.sql
-- E5: Member attendance history
-- One read function an officer calls from the roster to see how often a member
-- has attended. No new tables.
--
-- Rules:
--   * the caller must be an officer of the member's org (is_org_member);
--   * a member of another org, a missing member and a non-officer caller all get
--     the same 'member_not_found', so the answer never confirms that a member
--     exists somewhere else;
--   * only events that have ended are listed (ends_at < now());
--   * an event is listed when it ended after the member joined (members.created_at)
--     or when the member has an attendance row for it, so a record is never hidden;
--   * cancelled events are listed with their status. Whether they count is
--     decided by the caller (the app never counts them);
--   * inactive and pending members can be viewed.

-- 1. Per-member lookups (the unique (event_id, member_id) index leads with event)
create index if not exists attendance_member_idx
  on public.attendance (member_id);

-- 2. get_member_attendance_history
-- Returns { org_id, joined_at, events: [{ event_id, title, starts_at, ends_at, status,
-- attended, method, checked_in_at }] }, newest event first.
create or replace function public.get_member_attendance_history(
  target_member uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  caller_id uuid;
  member_org uuid;
  member_joined timestamptz;
  history jsonb;
begin
  caller_id := auth.uid();
  if caller_id is null then
    raise exception 'not_authenticated';
  end if;

  select org_id, created_at
    into member_org, member_joined
    from public.members
   where id = target_member;

  -- One answer for "no such member" and "not your org's member"
  if member_org is null or not public.is_org_member(member_org) then
    raise exception 'member_not_found';
  end if;

  select coalesce(
           jsonb_agg(
             jsonb_build_object(
               'event_id', e.id,
               'title', e.title,
               'starts_at', e.starts_at,
               'ends_at', e.ends_at,
               'status', e.status,
               'attended', a.id is not null,
               'method', a.method,
               'checked_in_at', a.checked_in_at
             )
             order by e.starts_at desc, e.id
           ),
           '[]'::jsonb
         )
    into history
    from public.events e
    left join public.attendance a
      on a.event_id = e.id
     and a.member_id = target_member
   where e.org_id = member_org
     and e.ends_at < now()
     and (e.ends_at > member_joined or a.id is not null);

  return jsonb_build_object(
    'org_id', member_org,
    'joined_at', member_joined,
    'events', history
  );
end;
$$;

revoke all on function public.get_member_attendance_history(uuid) from public, anon;
grant execute on function public.get_member_attendance_history(uuid) to authenticated;


-- >>> FILE: 20261115120000_p2_dues_payments.sql
-- P2: Submit GCash Reference with Screenshot
-- Schema updates for dues_periods pay link, dues_payments table, partial unique indexes, RLS, and security definer functions.

-- 1. Add pay_token and pay_link_active to public.dues_periods
alter table public.dues_periods
  add column if not exists pay_token text unique default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  add column if not exists pay_link_active boolean not null default true;

-- Backfill any existing rows where pay_token might be null
update public.dues_periods
   set pay_token = replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
 where pay_token is null;

create index if not exists dues_periods_pay_token_active_idx
  on public.dues_periods (pay_token)
  where (pay_link_active and status = 'open');

-- 2. Create public.dues_payments table
create table if not exists public.dues_payments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  period_id uuid not null references public.dues_periods(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  amount numeric(10,2) not null check (amount > 0 and amount <= 100000.00 and scale(amount) <= 2),
  reference_no text not null check (char_length(trim(reference_no)) between 4 and 50),
  reference_key text not null,
  screenshot_path text not null,
  status text not null default 'submitted' check (status in ('submitted', 'verified', 'rejected')),
  reject_reason text null,
  submitted_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz null
);

-- Indexes for performance and lookup
create index if not exists dues_payments_org_period_idx
  on public.dues_payments (org_id, period_id, submitted_at desc);

create index if not exists dues_payments_member_idx
  on public.dues_payments (member_id);

-- Partial Unique Index 1: Exactly one Submitted or Verified payment per member per period.
-- Rejected payments do not block a subsequent submission.
create unique index if not exists dues_payments_active_member_period_idx
  on public.dues_payments (period_id, member_id)
  where (status in ('submitted', 'verified'));

-- Partial Unique Index 2: Exactly one non-rejected payment per reference in the organization.
-- Normalizes spaces and casing via reference_key.
create unique index if not exists dues_payments_org_reference_key_idx
  on public.dues_payments (org_id, reference_key)
  where (status in ('submitted', 'verified'));

-- 3. Row Level Security for public.dues_payments
alter table public.dues_payments enable row level security;

drop policy if exists "Officers can read dues payments in their org" on public.dues_payments;
create policy "Officers can read dues payments in their org"
  on public.dues_payments
  for select
  to authenticated
  using (public.is_org_member(org_id));

-- Direct writes (insert, update, delete) are prohibited from the client API.
revoke insert, update, delete on public.dues_payments from public, anon, authenticated;
grant select on public.dues_payments to authenticated;
grant all on public.dues_payments to service_role;

-- 4. Storage Bucket Setup (for Supabase projects where storage schema is present)
do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public)
    values ('dues-screenshots', 'dues-screenshots', false)
    on conflict (id) do update set public = false;
  end if;
end $$;

-- 5. Security Definer Function: get_dues_period_pay_link
-- Allows officers of the org to retrieve pay link information for an open period.
-- If the period was created earlier without a token, a token is generated and persisted.
create or replace function public.get_dues_period_pay_link(
  p_org_id uuid,
  p_period_id uuid
)
returns table (
  period_id uuid,
  pay_token text,
  pay_link_active boolean,
  status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token text;
  v_status text;
begin
  if not public.is_org_member(p_org_id) then
    raise exception 'not_authorized';
  end if;

  select p.pay_token, p.status into v_token, v_status
  from public.dues_periods p
  where p.id = p_period_id and p.org_id = p_org_id;

  if v_status is null then
    raise exception 'not_found';
  end if;

  -- Ensure token exists if null
  if v_token is null then
    v_token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
    update public.dues_periods
       set pay_token = v_token
     where id = p_period_id and org_id = p_org_id;
  end if;

  return query
  select
    p.id as period_id,
    p.pay_token,
    p.pay_link_active,
    p.status
  from public.dues_periods p
  where p.id = p_period_id
    and p.org_id = p_org_id;
end;
$$;

revoke all on function public.get_dues_period_pay_link(uuid, uuid) from public, anon;
grant execute on function public.get_dues_period_pay_link(uuid, uuid) to authenticated;
grant execute on function public.get_dues_period_pay_link(uuid, uuid) to service_role;

-- 6. Security Definer Function: set_dues_pay_link
-- Officers can turn link on ('on'), off ('off'), or rotate/regenerate ('rotate').
create or replace function public.set_dues_pay_link(
  p_org_id uuid,
  p_period_id uuid,
  p_action text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_token text;
  v_current_status text;
begin
  if not public.is_org_member(p_org_id) then
    raise exception 'not_authorized';
  end if;

  if p_action not in ('on', 'off', 'rotate') then
    raise exception 'invalid_action';
  end if;

  select status into v_current_status
  from public.dues_periods
  where id = p_period_id and org_id = p_org_id
  for update;

  if v_current_status is null then
    raise exception 'not_found';
  end if;

  if v_current_status = 'closed' then
    raise exception 'period_closed';
  end if;

  if p_action = 'off' then
    update public.dues_periods
       set pay_link_active = false,
           updated_at = now()
     where id = p_period_id and org_id = p_org_id;
    return null;
  elsif p_action = 'on' then
    update public.dues_periods
       set pay_link_active = true,
           pay_token = coalesce(pay_token, replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')),
           updated_at = now()
     where id = p_period_id and org_id = p_org_id;
    select pay_token into v_new_token
    from public.dues_periods
    where id = p_period_id;
    return v_new_token;
  elsif p_action = 'rotate' then
    v_new_token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
    update public.dues_periods
       set pay_token = v_new_token,
           pay_link_active = true,
           updated_at = now()
     where id = p_period_id and org_id = p_org_id;
    return v_new_token;
  end if;

  return null;
end;
$$;

revoke all on function public.set_dues_pay_link(uuid, uuid, text) from public, anon;
grant execute on function public.set_dues_pay_link(uuid, uuid, text) to authenticated;
grant execute on function public.set_dues_pay_link(uuid, uuid, text) to service_role;

-- 7. Update create_dues_period to generate pay_token on creation
create or replace function public.create_dues_period(
  p_org_id uuid,
  p_name text,
  p_amount numeric,
  p_due_on date
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid;
  new_id uuid;
  new_pay_token text;
begin
  caller_id := auth.uid();
  if caller_id is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_org_member(p_org_id) then
    raise exception 'Not permitted to create dues periods for this organization';
  end if;

  if p_name is null or char_length(trim(p_name)) < 2 or char_length(trim(p_name)) > 100 then
    raise exception 'Name must be between 2 and 100 characters';
  end if;

  if p_amount is null or p_amount <= 0 or p_amount > 100000.00 or scale(p_amount) > 2 then
    raise exception 'Amount must be above 0 and at most 100,000 with up to 2 decimal places';
  end if;

  if p_due_on is null then
    raise exception 'Due date is required';
  end if;

  new_pay_token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');

  insert into public.dues_periods (
    org_id,
    name,
    amount,
    due_on,
    status,
    created_by,
    pay_token,
    pay_link_active
  ) values (
    p_org_id,
    trim(p_name),
    p_amount,
    p_due_on,
    'open',
    caller_id,
    new_pay_token,
    true
  ) returning id into new_id;

  return new_id;
end;
$$;

revoke all on function public.create_dues_period(uuid, text, numeric, date) from public;
grant execute on function public.create_dues_period(uuid, text, numeric, date) to authenticated;

-- 7. Security Definer Function: get_dues_pay_info
-- Server-only function called by /pay/:token to get org, period, amount and due date.
create or replace function public.get_dues_pay_info(p_pay_token text)
returns table (
  org_id uuid,
  org_name text,
  period_id uuid,
  period_name text,
  amount numeric,
  due_on date,
  pay_link_active boolean,
  period_status text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    p.org_id,
    o.name as org_name,
    p.id as period_id,
    p.name as period_name,
    p.amount,
    p.due_on,
    p.pay_link_active,
    p.status as period_status
  from public.dues_periods p
  join public.orgs o on o.id = p.org_id
  where p.pay_token = p_pay_token;
end;
$$;

revoke all on function public.get_dues_pay_info(text) from public, anon, authenticated;
grant execute on function public.get_dues_pay_info(text) to service_role;

-- 8. Security Definer Function: submit_dues_payment
-- Server-only function that executes with service_role after rate limit & screenshot upload.
create or replace function public.submit_dues_payment(
  p_pay_token text,
  p_email text,
  p_reference_no text,
  p_screenshot_path text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period record;
  v_member record;
  v_clean_email_key text;
  v_clean_ref_key text;
  v_clean_ref text;
  v_new_payment_id uuid;
begin
  if p_pay_token is null or trim(p_pay_token) = '' then
    raise exception 'invalid_or_closed_period';
  end if;

  -- 1. Validate period
  select id, org_id, amount, status, pay_link_active
    into v_period
    from public.dues_periods
   where pay_token = trim(p_pay_token);

  if v_period.id is null or not v_period.pay_link_active or v_period.status <> 'open' then
    raise exception 'invalid_or_closed_period';
  end if;

  -- 2. Validate email & active membership in the org
  if p_email is null or trim(p_email) = '' then
    raise exception 'member_not_eligible';
  end if;

  v_clean_email_key := lower(trim(p_email));

  select id, org_id, status
    into v_member
    from public.members
   where org_id = v_period.org_id
     and email_key = v_clean_email_key;

  if v_member.id is null or v_member.status <> 'active' then
    raise exception 'member_not_eligible';
  end if;

  -- 3. Validate reference number
  v_clean_ref := trim(p_reference_no);
  if v_clean_ref is null or char_length(v_clean_ref) < 4 or char_length(v_clean_ref) > 50 then
    raise exception 'invalid_reference_number';
  end if;

  -- Strip all whitespace and lowercase for uniqueness key
  v_clean_ref_key := lower(regexp_replace(v_clean_ref, '\s+', '', 'g'));

  -- 4. Validate screenshot path
  if p_screenshot_path is null or trim(p_screenshot_path) = '' then
    raise exception 'missing_screenshot';
  end if;

  -- 5. Check if member already has active submission for this period
  if exists (
    select 1
      from public.dues_payments
     where period_id = v_period.id
       and member_id = v_member.id
       and status in ('submitted', 'verified')
  ) then
    raise exception 'already_submitted';
  end if;

  -- 6. Check if reference number already used across non-rejected payments in org
  if exists (
    select 1
      from public.dues_payments
     where org_id = v_period.org_id
       and reference_key = v_clean_ref_key
       and status in ('submitted', 'verified')
  ) then
    raise exception 'reference_already_used';
  end if;

  -- 7. Insert payment record (amount copied from dues_periods to preserve history)
  insert into public.dues_payments (
    org_id,
    period_id,
    member_id,
    amount,
    reference_no,
    reference_key,
    screenshot_path,
    status,
    submitted_at
  ) values (
    v_period.org_id,
    v_period.id,
    v_member.id,
    v_period.amount,
    v_clean_ref,
    v_clean_ref_key,
    trim(p_screenshot_path),
    'submitted',
    now()
  )
  returning id into v_new_payment_id;

  return v_new_payment_id;
end;
$$;

revoke all on function public.submit_dues_payment(text, text, text, text) from public, anon, authenticated;
grant execute on function public.submit_dues_payment(text, text, text, text) to service_role;


-- >>> FILE: 20261116120000_e1_cancel_event_not_past.sql
-- E1: an event that has already ended can no longer be cancelled.
-- Cancelling is for events that haven't happened (or are still running). A past
-- event stays in the list as it was, and its attendance is still correctable.
-- Cancelling an already cancelled event is still a harmless no-op, and cancelling
-- still closes the check-in window (as in E2).
create or replace function public.cancel_event(
  target_event uuid
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid;
  event_org uuid;
  current_status text;
  event_end timestamptz;
begin
  caller_id := auth.uid();
  if caller_id is null then
    raise exception 'not_authenticated';
  end if;

  select org_id, status, ends_at
    into event_org, current_status, event_end
    from public.events
   where id = target_event;

  if event_org is null then
    raise exception 'event_not_found';
  end if;

  if not public.is_org_member(event_org) then
    raise exception 'not_permitted';
  end if;

  if current_status = 'cancelled' then
    return 'ok';
  end if;

  if event_end < now() then
    raise exception 'event_ended';
  end if;

  update public.events
     set status = 'cancelled',
         checkin_open = false,
         updated_at = now()
   where id = target_event;

  return 'ok';
end;
$$;

revoke all on function public.cancel_event(uuid) from public, anon;
grant execute on function public.cancel_event(uuid) to authenticated;


-- >>> FILE: 20261116120100_p3_dues_reviews.sql
-- P3: Verify or Reject Payment Submission
-- 1. Create dues_payment_events table for audit history of reviews and undos

create table if not exists public.dues_payment_events (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.dues_payments(id) on delete cascade,
  org_id uuid not null references public.orgs(id) on delete cascade,
  action text not null check (action in ('verified', 'rejected', 'undone')),
  actor_id uuid not null references auth.users(id) on delete cascade,
  reason text null,
  created_at timestamptz not null default now()
);

create index if not exists dues_payment_events_payment_idx
  on public.dues_payment_events (payment_id, created_at desc);

create index if not exists dues_payment_events_org_idx
  on public.dues_payment_events (org_id, created_at desc);

-- Row Level Security for dues_payment_events
alter table public.dues_payment_events enable row level security;

drop policy if exists "Officers can read dues payment events in their org" on public.dues_payment_events;
create policy "Officers can read dues payment events in their org"
  on public.dues_payment_events
  for select
  to authenticated
  using (public.is_org_member(org_id));

-- Direct writes (insert, update, delete) are prohibited from the client API.
revoke insert, update, delete on public.dues_payment_events from public, anon, authenticated;
grant select on public.dues_payment_events to authenticated;
grant all on public.dues_payment_events to service_role;

-- 2. Security Definer Function: verify_dues_payment
-- Marks a submitted payment as verified, recording the reviewer and timestamp.
-- Blocks self-review and prevents double-decisions via concurrency check.
create or replace function public.verify_dues_payment(
  p_payment_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid;
  v_caller_email text;
  v_payment record;
  v_member_email_key text;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'not_authenticated';
  end if;

  select id, org_id, member_id, status
    into v_payment
    from public.dues_payments
   where id = p_payment_id;

  if v_payment.id is null then
    raise exception 'payment_not_found';
  end if;

  if not public.is_org_member(v_payment.org_id) then
    raise exception 'not_authorized';
  end if;

  -- Self-review guard: Officer cannot verify their own payment
  select email into v_caller_email
    from public.officers
   where id = v_caller_id;

  select email_key into v_member_email_key
    from public.members
   where id = v_payment.member_id;

  if v_caller_email is not null and lower(trim(v_caller_email)) = v_member_email_key then
    raise exception 'cannot_review_own_payment';
  end if;

  -- Atomic transition from submitted -> verified
  update public.dues_payments
     set status = 'verified',
         reviewed_by = v_caller_id,
         reviewed_at = now()
   where id = p_payment_id
     and status = 'submitted';

  if not found then
    raise exception 'already_reviewed';
  end if;

  -- Record audit event
  insert into public.dues_payment_events (
    payment_id,
    org_id,
    action,
    actor_id,
    reason,
    created_at
  ) values (
    p_payment_id,
    v_payment.org_id,
    'verified',
    v_caller_id,
    null,
    now()
  );
end;
$$;

revoke all on function public.verify_dues_payment(uuid) from public, anon;
grant execute on function public.verify_dues_payment(uuid) to authenticated;

-- 3. Security Definer Function: reject_dues_payment
-- Marks a submitted payment as rejected with a mandatory reason.
-- Allows the member to subsequently submit a corrected payment.
create or replace function public.reject_dues_payment(
  p_payment_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid;
  v_caller_email text;
  v_payment record;
  v_member_email_key text;
  v_clean_reason text;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'not_authenticated';
  end if;

  v_clean_reason := trim(p_reason);
  if v_clean_reason is null or char_length(v_clean_reason) < 3 then
    raise exception 'reason_required';
  end if;

  if char_length(v_clean_reason) > 500 then
    raise exception 'reason_too_long';
  end if;

  select id, org_id, member_id, status
    into v_payment
    from public.dues_payments
   where id = p_payment_id;

  if v_payment.id is null then
    raise exception 'payment_not_found';
  end if;

  if not public.is_org_member(v_payment.org_id) then
    raise exception 'not_authorized';
  end if;

  -- Self-review guard: Officer cannot reject their own payment
  select email into v_caller_email
    from public.officers
   where id = v_caller_id;

  select email_key into v_member_email_key
    from public.members
   where id = v_payment.member_id;

  if v_caller_email is not null and lower(trim(v_caller_email)) = v_member_email_key then
    raise exception 'cannot_review_own_payment';
  end if;

  -- Atomic transition from submitted -> rejected
  update public.dues_payments
     set status = 'rejected',
         reject_reason = v_clean_reason,
         reviewed_by = v_caller_id,
         reviewed_at = now()
   where id = p_payment_id
     and status = 'submitted';

  if not found then
    raise exception 'already_reviewed';
  end if;

  -- Record audit event
  insert into public.dues_payment_events (
    payment_id,
    org_id,
    action,
    actor_id,
    reason,
    created_at
  ) values (
    p_payment_id,
    v_payment.org_id,
    'rejected',
    v_caller_id,
    v_clean_reason,
    now()
  );
end;
$$;

revoke all on function public.reject_dues_payment(uuid, text) from public, anon;
grant execute on function public.reject_dues_payment(uuid, text) to authenticated;

-- 4. Security Definer Function: undo_dues_payment_verification
-- Allows an org admin to reverse a verified payment back to submitted with an audit reason.
create or replace function public.undo_dues_payment_verification(
  p_payment_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid;
  v_payment record;
  v_clean_reason text;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'not_authenticated';
  end if;

  v_clean_reason := trim(p_reason);
  if v_clean_reason is null or char_length(v_clean_reason) < 3 then
    raise exception 'reason_required';
  end if;

  if char_length(v_clean_reason) > 500 then
    raise exception 'reason_too_long';
  end if;

  select id, org_id, member_id, status
    into v_payment
    from public.dues_payments
   where id = p_payment_id;

  if v_payment.id is null then
    raise exception 'payment_not_found';
  end if;

  if not public.is_org_admin(v_payment.org_id) then
    raise exception 'admin_only';
  end if;

  -- Atomic transition from verified -> submitted
  update public.dues_payments
     set status = 'submitted',
         reviewed_by = null,
         reviewed_at = null
   where id = p_payment_id
     and status = 'verified';

  if not found then
    raise exception 'invalid_status_transition';
  end if;

  -- Record audit event
  insert into public.dues_payment_events (
    payment_id,
    org_id,
    action,
    actor_id,
    reason,
    created_at
  ) values (
    p_payment_id,
    v_payment.org_id,
    'undone',
    v_caller_id,
    v_clean_reason,
    now()
  );
end;
$$;

revoke all on function public.undo_dues_payment_verification(uuid, text) from public, anon;
grant execute on function public.undo_dues_payment_verification(uuid, text) to authenticated;

-- 5. Security Definer Function: get_dues_review_queue
-- Returns submitted payments for a period ordered oldest first with member details.
create or replace function public.get_dues_review_queue(
  p_org_id uuid,
  p_period_id uuid
)
returns table (
  payment_id uuid,
  member_id uuid,
  member_name text,
  member_email text,
  amount numeric,
  reference_no text,
  screenshot_path text,
  submitted_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_org_member(p_org_id) then
    raise exception 'not_authorized';
  end if;

  return query
  select
    p.id as payment_id,
    p.member_id,
    m.full_name as member_name,
    m.email as member_email,
    p.amount,
    p.reference_no,
    p.screenshot_path,
    p.submitted_at
  from public.dues_payments p
  join public.members m on m.id = p.member_id
  where p.org_id = p_org_id
    and p.period_id = p_period_id
    and p.status = 'submitted'
  order by p.submitted_at asc, p.id asc;
end;
$$;

revoke all on function public.get_dues_review_queue(uuid, uuid) from public, anon;
grant execute on function public.get_dues_review_queue(uuid, uuid) to authenticated;






-- >>> FILE: 20261117120000_p4_dues_dashboard.sql
-- P4: Dues Status Dashboard
-- 1. Index on dues_payments for status-based dashboard filtering and counting
create index if not exists dues_payments_org_period_status_idx
  on public.dues_payments (org_id, period_id, status);

create index if not exists dues_payments_period_member_status_idx
  on public.dues_payments (period_id, member_id, status);

-- 2. Security Definer Function: get_dues_period_dashboard
-- Aggregates metrics (collected, expected, outstanding, status counts) and returns paged member dues records.
create or replace function public.get_dues_period_dashboard(
  p_period_id uuid,
  p_search text default null,
  p_status text default null,
  p_page int default 1,
  p_page_size int default 20
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid;
  v_period record;
  v_page int;
  v_page_size int;
  v_offset int;
  v_result jsonb;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'not_authenticated';
  end if;

  select id, org_id, name, amount, due_on, status, pay_token, pay_link_active
    into v_period
    from public.dues_periods
   where id = p_period_id;

  if v_period.id is null then
    raise exception 'period_not_found';
  end if;

  if not public.is_org_member(v_period.org_id) then
    raise exception 'not_authorized';
  end if;

  v_page := coalesce(p_page, 1);
  if v_page < 1 then
    v_page := 1;
  end if;

  v_page_size := coalesce(p_page_size, 20);
  if v_page_size < 1 then
    v_page_size := 20;
  elsif v_page_size > 100 then
    v_page_size := 100;
  end if;

  v_offset := (v_page - 1) * v_page_size;

  with period_payments as (
    -- For each member, find their primary payment for this period:
    -- Verified > Submitted > Rejected (latest by submitted_at)
    select distinct on (p.member_id)
      p.id as payment_id,
      p.member_id,
      p.amount,
      p.reference_no,
      p.status as payment_status,
      p.reject_reason,
      p.submitted_at,
      p.reviewed_at
    from public.dues_payments p
    where p.period_id = p_period_id
    order by p.member_id,
      case p.status
        when 'verified' then 1
        when 'submitted' then 2
        when 'rejected' then 3
        else 4
      end,
      p.submitted_at desc,
      p.id desc
  ),
  candidate_members as (
    -- Include:
    -- 1. All active members of the organization
    -- 2. Non-active members who made a payment for this period
    select
      m.id as member_id,
      m.full_name,
      m.email,
      m.email_key,
      m.status as member_status,
      m.created_at as member_created_at,
      pp.payment_id,
      pp.amount as payment_amount,
      pp.reference_no,
      pp.payment_status,
      pp.reject_reason,
      pp.submitted_at,
      pp.reviewed_at,
      case
        when pp.payment_status = 'verified' then 'paid'
        when pp.payment_status = 'submitted' then 'pending'
        when pp.payment_status = 'rejected' then 'rejected'
        else 'unpaid'
      end as dues_status
    from public.members m
    left join period_payments pp on pp.member_id = m.id
    where m.org_id = v_period.org_id
      and (m.status = 'active' or pp.payment_id is not null)
  ),
  summary_metrics as (
    select
      coalesce(count(*) filter (where member_status = 'active'), 0) as active_member_count,
      coalesce(count(*), 0) as total_member_count,
      coalesce(count(*) filter (where dues_status = 'paid'), 0) as paid_count,
      coalesce(count(*) filter (where dues_status = 'pending'), 0) as pending_count,
      coalesce(count(*) filter (where dues_status = 'rejected'), 0) as rejected_count,
      coalesce(count(*) filter (where dues_status = 'unpaid'), 0) as unpaid_count,
      -- Collected: verified payments only (including verified payments by deactivated members)
      coalesce(sum(payment_amount) filter (where payment_status = 'verified'), 0.00)::numeric(10,2) as collected_amount,
      -- Expected: active members * period amount
      (coalesce(count(*) filter (where member_status = 'active'), 0) * v_period.amount)::numeric(10,2) as expected_amount,
      -- Outstanding: active members who owe (unpaid, pending, or rejected) * period amount
      (coalesce(count(*) filter (where member_status = 'active' and dues_status in ('unpaid', 'pending', 'rejected')), 0) * v_period.amount)::numeric(10,2) as outstanding_amount
    from candidate_members
  ),
  filtered_members as (
    select *
    from candidate_members cm
    where (
      p_status is null
      or trim(p_status) = ''
      or lower(trim(p_status)) = 'all'
      or cm.dues_status = lower(trim(p_status))
    )
    and (
      p_search is null
      or trim(p_search) = ''
      or cm.full_name ilike '%' || trim(p_search) || '%'
      or cm.email ilike '%' || trim(p_search) || '%'
    )
  ),
  paged_members as (
    select
      member_id,
      full_name,
      email,
      member_status,
      dues_status,
      payment_id,
      payment_amount,
      reference_no,
      payment_status,
      reject_reason,
      submitted_at,
      reviewed_at
    from filtered_members
    order by full_name asc, member_id asc
    limit v_page_size offset v_offset
  ),
  filtered_count as (
    select count(*) as total_matching from filtered_members
  )
  select jsonb_build_object(
    'period', jsonb_build_object(
      'id', v_period.id,
      'org_id', v_period.org_id,
      'name', v_period.name,
      'amount', v_period.amount,
      'due_on', v_period.due_on,
      'status', v_period.status,
      'pay_token', v_period.pay_token,
      'pay_link_active', v_period.pay_link_active
    ),
    'summary', jsonb_build_object(
      'collected_amount', sm.collected_amount,
      'expected_amount', sm.expected_amount,
      'outstanding_amount', sm.outstanding_amount,
      'paid_count', sm.paid_count,
      'pending_count', sm.pending_count,
      'rejected_count', sm.rejected_count,
      'unpaid_count', sm.unpaid_count,
      'active_member_count', sm.active_member_count,
      'total_member_count', sm.total_member_count
    ),
    'members', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'member_id', pm.member_id,
          'full_name', pm.full_name,
          'email', pm.email,
          'member_status', pm.member_status,
          'dues_status', pm.dues_status,
          'payment_id', pm.payment_id,
          'amount', pm.payment_amount,
          'reference_no', pm.reference_no,
          'payment_status', pm.payment_status,
          'reject_reason', pm.reject_reason,
          'submitted_at', pm.submitted_at,
          'reviewed_at', pm.reviewed_at
        )
      )
      from paged_members pm
    ), '[]'::jsonb),
    'pagination', jsonb_build_object(
      'page', v_page,
      'page_size', v_page_size,
      'total_matching', fc.total_matching,
      'total_pages', case
        when fc.total_matching = 0 then 0
        else ceil(fc.total_matching::numeric / v_page_size)::int
      end
    )
  )
  into v_result
  from summary_metrics sm
  cross join filtered_count fc;

  return v_result;
end;
$$;

revoke all on function public.get_dues_period_dashboard(uuid, text, text, int, int) from public, anon;
grant execute on function public.get_dues_period_dashboard(uuid, text, text, int, int) to authenticated;


-- >>> FILE: 20261118120000_p5_dues_reminders.sql
-- P5: Payment Reminders
-- 1. Create dues_reminders log table to track sent, failed, bounced, or skipped reminders
-- and enforce the 24-hour cooldown rule.

create table if not exists public.dues_reminders (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  period_id uuid not null references public.dues_periods(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  sent_by uuid not null references auth.users(id) on delete cascade,
  sent_at timestamptz not null default now(),
  status text not null check (status in ('sent', 'failed', 'bounced', 'skipped')),
  error_message text null
);

-- Indexes for efficient recipient checking, cooldown queries, and status filtering
create index if not exists dues_reminders_org_period_idx
  on public.dues_reminders (org_id, period_id);

create index if not exists dues_reminders_cooldown_idx
  on public.dues_reminders (org_id, period_id, member_id, sent_at desc);

create index if not exists dues_reminders_period_status_idx
  on public.dues_reminders (period_id, status);

-- 2. Row Level Security for dues_reminders
alter table public.dues_reminders enable row level security;

drop policy if exists "Officers can read dues reminders in their org" on public.dues_reminders;
create policy "Officers can read dues reminders in their org"
  on public.dues_reminders
  for select
  to authenticated
  using (public.is_org_member(org_id));

-- Direct client insert, update, and delete are prohibited.
revoke insert, update, delete on public.dues_reminders from public, anon, authenticated;
grant select on public.dues_reminders to authenticated;
grant all on public.dues_reminders to service_role;

-- 3. Security Definer Function: get_dues_reminder_recipients
-- Gathers period details, counts, and recipient evaluations (Paid, Pending, Unpaid, and 24h cooldown).
create or replace function public.get_dues_reminder_recipients(
  p_period_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid;
  v_period record;
  v_org_name text;
  v_result jsonb;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'not_authenticated';
  end if;

  select p.id, p.org_id, p.name, p.amount, p.due_on, p.status, p.pay_token
    into v_period
    from public.dues_periods p
   where p.id = p_period_id;

  if v_period.id is null then
    raise exception 'period_not_found';
  end if;

  if not public.is_org_member(v_period.org_id) then
    raise exception 'not_authorized';
  end if;

  select o.name into v_org_name
    from public.orgs o
   where o.id = v_period.org_id;

  with period_payments as (
    -- Primary payment status per member (verified > submitted > rejected)
    select distinct on (p.member_id)
      p.member_id,
      p.status as payment_status
      from public.dues_payments p
     where p.period_id = p_period_id
       and p.org_id = v_period.org_id
     order by p.member_id,
       case p.status
         when 'verified' then 1
         when 'submitted' then 2
         when 'rejected' then 3
         else 4
       end asc,
       p.submitted_at desc
  ),
  member_evaluations as (
    select
      m.id as member_id,
      m.full_name,
      m.email,
      case
        when pp.payment_status = 'verified' then 'paid'
        when pp.payment_status = 'submitted' then 'pending'
        else 'unpaid'
      end as dues_status,
      lr.sent_at as last_reminded_at,
      case
        when lr.sent_at is not null and lr.sent_at > (now() - interval '24 hours') then true
        else false
      end as is_recently_reminded
    from public.members m
    left join period_payments pp on pp.member_id = m.id
    left join lateral (
      select r.sent_at
        from public.dues_reminders r
       where r.org_id = v_period.org_id
         and r.period_id = p_period_id
         and r.member_id = m.id
         and r.status = 'sent'
         and r.sent_at > (now() - interval '24 hours')
       order by r.sent_at desc
       limit 1
    ) lr on true
    where m.org_id = v_period.org_id
      and m.status = 'active'
  ),
  filtered_recipients as (
    select
      me.member_id,
      me.full_name,
      me.email,
      me.dues_status,
      (me.dues_status = 'unpaid' and not me.is_recently_reminded) as is_eligible,
      case
        when me.dues_status = 'paid' then 'paid'
        when me.dues_status = 'pending' then 'pending'
        when me.is_recently_reminded then 'recently_reminded'
        else null
      end as skip_reason,
      me.last_reminded_at
    from member_evaluations me
  )
  select jsonb_build_object(
    'period', jsonb_build_object(
      'id', v_period.id,
      'org_id', v_period.org_id,
      'org_name', coalesce(v_org_name, 'Organization'),
      'period_name', v_period.name,
      'amount', v_period.amount,
      'due_on', v_period.due_on,
      'pay_token', v_period.pay_token,
      'status', v_period.status,
      'is_closed', (v_period.status = 'closed')
    ),
    'counts', jsonb_build_object(
      'total_active_members', (select count(*)::int from member_evaluations),
      'total_unpaid', (select count(*)::int from member_evaluations where dues_status = 'unpaid'),
      'eligible', (select count(*)::int from filtered_recipients where is_eligible = true),
      'skipped_24h', (select count(*)::int from filtered_recipients where skip_reason = 'recently_reminded'),
      'paid_or_pending', (select count(*)::int from member_evaluations where dues_status in ('paid', 'pending'))
    ),
    'recipients', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'member_id', fr.member_id,
          'full_name', fr.full_name,
          'email', fr.email,
          'is_eligible', fr.is_eligible,
          'skip_reason', fr.skip_reason,
          'last_reminded_at', fr.last_reminded_at
        )
        order by fr.is_eligible desc, fr.full_name asc
      )
      from filtered_recipients fr
      where fr.dues_status = 'unpaid' or fr.is_eligible = true
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.get_dues_reminder_recipients(uuid) from public, anon;
grant execute on function public.get_dues_reminder_recipients(uuid) to authenticated;
grant execute on function public.get_dues_reminder_recipients(uuid) to service_role;

-- 4. Security Definer Function: log_dues_reminder
-- Records a reminder dispatch attempt (sent, failed, bounced, skipped) in dues_reminders.
create or replace function public.log_dues_reminder(
  p_period_id uuid,
  p_member_id uuid,
  p_status text,
  p_error_message text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid;
  v_period record;
  v_member record;
  v_reminder_id uuid;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'not_authenticated';
  end if;

  if p_status not in ('sent', 'failed', 'bounced', 'skipped') then
    raise exception 'invalid_reminder_status';
  end if;

  select id, org_id, status
    into v_period
    from public.dues_periods
   where id = p_period_id;

  if v_period.id is null then
    raise exception 'period_not_found';
  end if;

  if not public.is_org_member(v_period.org_id) then
    raise exception 'not_authorized';
  end if;

  -- Ensure member belongs to the same org
  select id, org_id
    into v_member
    from public.members
   where id = p_member_id;

  if v_member.id is null or v_member.org_id != v_period.org_id then
    raise exception 'member_not_found';
  end if;

  insert into public.dues_reminders (
    org_id,
    period_id,
    member_id,
    sent_by,
    sent_at,
    status,
    error_message
  ) values (
    v_period.org_id,
    p_period_id,
    p_member_id,
    v_caller_id,
    now(),
    p_status,
    p_error_message
  )
  returning id into v_reminder_id;

  return v_reminder_id;
end;
$$;

revoke all on function public.log_dues_reminder(uuid, uuid, text, text) from public, anon;
grant execute on function public.log_dues_reminder(uuid, uuid, text, text) to authenticated;
grant execute on function public.log_dues_reminder(uuid, uuid, text, text) to service_role;



-- >>> FILE: 20261121120000_t3_weekly_usage_metrics.sql
-- T3: Weekly usage metrics
--
-- A weekly snapshot of how much OrgKit is used, for the product owner only:
-- orgs (active and inactive), events created, check-ins and active officers.
--
-- Weeks run Monday to Sunday, UTC. Only aggregate counts are stored: nothing
-- about individual members and no page views.
--
-- An org is ACTIVE in a week if, that week, an event was created, someone
-- checked in, a dues reminder was sent, or a dues payment was verified,
-- rejected or undone. Every other org counts as inactive, so the two always add
-- up to the orgs that existed (an org with no activity is never left out).
--
-- An ACTIVE OFFICER is a distinct officer who did one of those officer actions
-- that week. The app has no sign-in history, so this is based on actions.
--
-- 1. platform_owners: who the product owner is (checked in the database)
-- 2. usage_weekly: one snapshot row per week
-- 3. usage_report_runs: records failed runs so they can be retried
-- 4. compute_usage_week, run_weekly_usage_report: service role only (cron)
-- 5. get_usage_report: the owner's read access

-- 1. Product owners ---------------------------------------------------------

create table if not exists public.platform_owners (
  officer_id uuid primary key references public.officers(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.platform_owners enable row level security;

-- No policies and no client access: the table is read only through
-- is_platform_owner(). Add an owner with an insert run as the database owner:
--   insert into public.platform_owners (officer_id)
--   select id from public.officers where email = 'owner@example.com';
revoke all on public.platform_owners from public, anon, authenticated;
grant all on public.platform_owners to service_role;

create or replace function public.is_platform_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.platform_owners where officer_id = auth.uid()
  );
$$;

revoke all on function public.is_platform_owner() from public, anon;
grant execute on function public.is_platform_owner() to authenticated;
grant execute on function public.is_platform_owner() to service_role;

-- 2. Weekly snapshots -------------------------------------------------------

create table if not exists public.usage_weekly (
  week_start date primary key,
  orgs_total integer not null check (orgs_total >= 0),
  orgs_active integer not null check (orgs_active >= 0),
  orgs_inactive integer not null check (orgs_inactive >= 0),
  events_created integer not null check (events_created >= 0),
  check_ins integer not null check (check_ins >= 0),
  active_officers integer not null check (active_officers >= 0),
  computed_at timestamptz not null default now(),
  constraint usage_weekly_monday check (extract(isodow from week_start) = 1),
  constraint usage_weekly_orgs_add_up check (orgs_active + orgs_inactive = orgs_total)
);

alter table public.usage_weekly enable row level security;
revoke all on public.usage_weekly from public, anon, authenticated;
grant all on public.usage_weekly to service_role;

-- 3. Run log ----------------------------------------------------------------

create table if not exists public.usage_report_runs (
  week_start date primary key,
  status text not null check (status in ('succeeded', 'failed')),
  attempts integer not null default 1 check (attempts >= 1),
  error_message text null,
  next_retry_at timestamptz null,
  last_attempt_at timestamptz not null default now()
);

alter table public.usage_report_runs enable row level security;
revoke all on public.usage_report_runs from public, anon, authenticated;
grant all on public.usage_report_runs to service_role;

-- 4a. Compute one week ------------------------------------------------------
-- Safe to run again for the same week: it replaces that week's row.

create or replace function public.compute_usage_week(p_week_start date)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from timestamptz;
  v_to timestamptz;
  v_orgs_total integer;
  v_orgs_active integer;
  v_events integer;
  v_check_ins integer;
  v_officers integer;
begin
  if extract(isodow from p_week_start) <> 1 then
    raise exception 'week_start_must_be_a_monday';
  end if;

  v_from := p_week_start::timestamp at time zone 'utc';
  v_to := v_from + interval '7 days';

  select count(*)::int into v_orgs_total
    from public.orgs o
   where o.created_at < v_to;

  select count(*)::int into v_events
    from public.events e
   where e.created_at >= v_from and e.created_at < v_to;

  select count(*)::int into v_check_ins
    from public.attendance a
   where a.checked_in_at >= v_from and a.checked_in_at < v_to;

  with activity as (
    select e.org_id, e.created_by as officer_id
      from public.events e
     where e.created_at >= v_from and e.created_at < v_to
    union all
    select a.org_id, a.marked_by
      from public.attendance a
     where a.checked_in_at >= v_from and a.checked_in_at < v_to
    union all
    select r.org_id, r.sent_by
      from public.dues_reminders r
     where r.sent_at >= v_from and r.sent_at < v_to
    union all
    select pe.org_id, pe.actor_id
      from public.dues_payment_events pe
     where pe.created_at >= v_from and pe.created_at < v_to
  )
  select
    (select count(distinct act.org_id)::int
       from activity act
       join public.orgs o on o.id = act.org_id and o.created_at < v_to),
    (select count(distinct act.officer_id)::int
       from activity act
      where act.officer_id is not null)
    into v_orgs_active, v_officers;

  insert into public.usage_weekly (
    week_start, orgs_total, orgs_active, orgs_inactive,
    events_created, check_ins, active_officers, computed_at
  ) values (
    p_week_start, v_orgs_total, v_orgs_active, v_orgs_total - v_orgs_active,
    v_events, v_check_ins, v_officers, now()
  )
  on conflict (week_start) do update set
    orgs_total = excluded.orgs_total,
    orgs_active = excluded.orgs_active,
    orgs_inactive = excluded.orgs_inactive,
    events_created = excluded.events_created,
    check_ins = excluded.check_ins,
    active_officers = excluded.active_officers,
    computed_at = excluded.computed_at;
end;
$$;

revoke all on function public.compute_usage_week(date) from public, anon, authenticated;
grant execute on function public.compute_usage_week(date) to service_role;

-- 4b. The scheduled run -----------------------------------------------------
-- Makes sure each of the last 4 completed weeks has a snapshot. The first run
-- therefore fills in the past weeks from existing data. A week that fails is
-- recorded and tried again later (15 minutes, then doubling, up to 5 attempts);
-- one failing week never stops the others. Does nothing when nothing is due.

create or replace function public.run_weekly_usage_report()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_week date := date_trunc('week', now() at time zone 'utc')::date;
  v_week date;
  v_run public.usage_report_runs%rowtype;
begin
  for v_week in
    select v_current_week - n * 7 from generate_series(1, 4) as n order by 1
  loop
    if exists (select 1 from public.usage_weekly where week_start = v_week) then
      continue;
    end if;

    select * into v_run from public.usage_report_runs where week_start = v_week;
    if found and v_run.status = 'failed'
       and (v_run.attempts >= 5 or v_run.next_retry_at > now()) then
      continue;
    end if;

    begin
      perform public.compute_usage_week(v_week);

      insert into public.usage_report_runs (week_start, status, attempts, last_attempt_at)
      values (v_week, 'succeeded', 1, now())
      on conflict (week_start) do update set
        status = 'succeeded',
        attempts = public.usage_report_runs.attempts + 1,
        error_message = null,
        next_retry_at = null,
        last_attempt_at = now();
    exception when others then
      insert into public.usage_report_runs (
        week_start, status, attempts, error_message, next_retry_at, last_attempt_at
      ) values (
        v_week, 'failed', 1, sqlerrm, now() + interval '15 minutes', now()
      )
      on conflict (week_start) do update set
        status = 'failed',
        attempts = public.usage_report_runs.attempts + 1,
        error_message = sqlerrm,
        next_retry_at = now() + interval '15 minutes'
          * power(2, least(public.usage_report_runs.attempts, 4)),
        last_attempt_at = now();
    end;
  end loop;
end;
$$;

revoke all on function public.run_weekly_usage_report() from public, anon, authenticated;
grant execute on function public.run_weekly_usage_report() to service_role;

-- 5. The owner's report -----------------------------------------------------
-- The last completed weeks, newest first. A week with no snapshot is still
-- listed, as 'failed' (with the attempt count) or 'pending', so the page can
-- say so instead of showing nothing.

create or replace function public.get_usage_report(p_weeks integer default 4)
returns table (
  week_start date,
  week_end date,
  status text,
  orgs_total integer,
  orgs_active integer,
  orgs_inactive integer,
  events_created integer,
  check_ins integer,
  active_officers integer,
  computed_at timestamptz,
  attempts integer,
  error_message text,
  next_retry_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_current_week date := date_trunc('week', now() at time zone 'utc')::date;
  v_weeks integer := least(greatest(coalesce(p_weeks, 4), 1), 12);
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if not public.is_platform_owner() then
    raise exception 'not_authorized';
  end if;

  return query
  select
    w.week_start,
    (w.week_start + 6),
    case
      when u.week_start is not null then 'ready'
      when r.status = 'failed' then 'failed'
      else 'pending'
    end,
    u.orgs_total,
    u.orgs_active,
    u.orgs_inactive,
    u.events_created,
    u.check_ins,
    u.active_officers,
    u.computed_at,
    r.attempts,
    case when u.week_start is null then r.error_message end,
    case when u.week_start is null and r.status = 'failed' then r.next_retry_at end
  from (
    select (v_current_week - n * 7) as week_start
      from generate_series(1, v_weeks) as n
  ) w
  left join public.usage_weekly u on u.week_start = w.week_start
  left join public.usage_report_runs r on r.week_start = w.week_start
  order by w.week_start desc;
end;
$$;

revoke all on function public.get_usage_report(integer) from public, anon;
grant execute on function public.get_usage_report(integer) to authenticated;
grant execute on function public.get_usage_report(integer) to service_role;



-- >>> FILE: 20261121120100_t3_schedule_weekly_usage_report.sql
-- T3: run the weekly usage report on a schedule.
--
-- Two jobs call the same function, run_weekly_usage_report():
--   t3-weekly-usage-report        Mondays 01:00 UTC, when a week has just ended
--   t3-weekly-usage-report-retry  every hour, to retry a week that failed
-- The function only does work for a week that has no snapshot yet and whose
-- retry time has passed, so the hourly run costs almost nothing.
--
-- pg_cron is a Supabase extension (Database > Extensions). Where it is not
-- available, such as a plain local Postgres, this migration only prints a
-- notice and never blocks the other migrations. Enable the extension and
-- re-run this file to turn the schedule on. Until then an owner can run
--   select public.run_weekly_usage_report();
-- by hand as the database owner.

do $$
begin
  if not exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    raise notice 'pg_cron is not available: the weekly usage report is NOT scheduled. Enable pg_cron and re-run this migration.';
    return;
  end if;

  create extension if not exists pg_cron;

  -- Re-running replaces the jobs instead of stacking duplicates
  perform cron.unschedule(jobid)
  from cron.job
  where jobname in ('t3-weekly-usage-report', 't3-weekly-usage-report-retry');

  perform cron.schedule(
    't3-weekly-usage-report',
    '0 1 * * 1',  -- Mondays at 01:00 UTC
    $job$select public.run_weekly_usage_report()$job$
  );

  perform cron.schedule(
    't3-weekly-usage-report-retry',
    '5 * * * *',  -- every hour at :05
    $job$select public.run_weekly_usage_report()$job$
  );
end
$$;



-- >>> FILE: 20261122120000_t5_feedback.sql
-- T5: In-app feedback
--
-- A signed-in officer can send a message from any workspace page. It is saved
-- with the page they were on (and their org, when they were inside one), and
-- the product owner reads it in an owner-only inbox.
--
-- Users get NO direct access to the table. A direct insert policy would let a
-- signed-in browser call the database API itself and skip the app's rate limit,
-- so writes go through submit_feedback(), which only the app server (service
-- role) can call, after it has checked the session and the limit. This is the
-- same approach as join and check-in. Reads go through get_feedback(), which
-- only the product owner may call (see T3, platform_owners).
--
-- Feedback is personal data (it carries the sender and what they wrote): it is
-- deleted with the officer, and the owner can delete a row once it is handled.

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  officer_id uuid not null references public.officers(id) on delete cascade,
  -- Kept as null if the org is later removed, so the message is not lost
  org_id uuid null references public.orgs(id) on delete set null,
  page text not null check (char_length(page) between 1 and 200),
  message text not null check (char_length(btrim(message, E' \t\r\n')) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists feedback_created_idx
  on public.feedback (created_at desc);

create index if not exists feedback_officer_created_idx
  on public.feedback (officer_id, created_at desc);

alter table public.feedback enable row level security;

-- No policies and no client access, not even to read the sender's own messages
revoke all on public.feedback from public, anon, authenticated;
grant all on public.feedback to service_role;

-- Save one message. Service role only: the app checks the signed-in user and
-- the per-device rate limit first, then passes the officer's id in.
create or replace function public.submit_feedback(
  p_officer_id uuid,
  p_org_id uuid,
  p_message text,
  p_page text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_message text;
  v_page text;
  v_org uuid;
  v_id uuid;
begin
  if p_officer_id is null
     or not exists (select 1 from public.officers o where o.id = p_officer_id) then
    raise exception 'officer_not_found';
  end if;

  -- Trim spaces and line breaks at the ends; keep line breaks inside the text
  v_message := btrim(coalesce(p_message, ''), E' \t\r\n');
  if char_length(v_message) < 1 or char_length(v_message) > 2000 then
    raise exception 'invalid_message';
  end if;

  v_page := left(coalesce(nullif(btrim(p_page), ''), '/'), 200);

  -- A backstop behind the per-device limit: one officer cannot flood the inbox
  if (
    select count(*) from public.feedback f
     where f.officer_id = p_officer_id
       and f.created_at > now() - interval '1 hour'
  ) >= 20 then
    raise exception 'rate_limited';
  end if;

  -- Only keep the org if this officer really belongs to it
  if p_org_id is not null and exists (
    select 1 from public.org_officers oo
     where oo.org_id = p_org_id and oo.officer_id = p_officer_id
  ) then
    v_org := p_org_id;
  end if;

  insert into public.feedback (officer_id, org_id, page, message)
  values (p_officer_id, v_org, v_page, v_message)
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.submit_feedback(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.submit_feedback(uuid, uuid, text, text) to service_role;

-- The owner's inbox, newest first. Refuses everyone who is not a platform owner.
create or replace function public.get_feedback(p_limit integer default 100)
returns table (
  id uuid,
  created_at timestamptz,
  message text,
  page text,
  org_id uuid,
  org_name text,
  officer_name text,
  officer_email text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_limit integer := least(greatest(coalesce(p_limit, 100), 1), 200);
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if not public.is_platform_owner() then
    raise exception 'not_authorized';
  end if;

  return query
  select
    f.id,
    f.created_at,
    f.message,
    f.page,
    f.org_id,
    org.name,
    o.full_name,
    o.email
  from public.feedback f
  join public.officers o on o.id = f.officer_id
  left join public.orgs org on org.id = f.org_id
  order by f.created_at desc
  limit v_limit;
end;
$$;

revoke all on function public.get_feedback(integer) from public, anon;
grant execute on function public.get_feedback(integer) to authenticated;
grant execute on function public.get_feedback(integer) to service_role;
-- H1: Record officer roles and terms
-- Allows organization admins to record who holds which officer role and for what term,
-- so that future teams can see who did what and when.
-- Scoped with RLS to the organization: all officers can read, only admins can write.

-- 1. Table: officer_terms
create table if not exists public.officer_terms (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  member_id uuid references public.members (id) on delete set null,
  holder_name text not null,
  role_title text not null,
  term_name text not null,
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Constraints
alter table public.officer_terms drop constraint if exists officer_terms_dates_check;
alter table public.officer_terms
  add constraint officer_terms_dates_check check (end_date >= start_date);

alter table public.officer_terms drop constraint if exists officer_terms_role_title_length;
alter table public.officer_terms
  add constraint officer_terms_role_title_length check (char_length(btrim(role_title)) between 2 and 100);

alter table public.officer_terms drop constraint if exists officer_terms_holder_name_length;
alter table public.officer_terms
  add constraint officer_terms_holder_name_length check (char_length(btrim(holder_name)) between 2 and 100);

alter table public.officer_terms drop constraint if exists officer_terms_term_name_length;
alter table public.officer_terms
  add constraint officer_terms_term_name_length check (char_length(btrim(term_name)) between 2 and 100);

-- Indexes for performance and query ordering (newest first)
create index if not exists officer_terms_org_dates_idx
  on public.officer_terms (org_id, start_date desc, end_date desc);

create index if not exists officer_terms_member_idx
  on public.officer_terms (member_id);

-- 2. Row Level Security
alter table public.officer_terms enable row level security;

revoke all on public.officer_terms from anon, authenticated;
grant select, insert, update, delete on public.officer_terms to authenticated;

-- Officers can view terms for their organization
drop policy if exists "Officers can read terms in their orgs" on public.officer_terms;
create policy "Officers can read terms in their orgs"
  on public.officer_terms
  for select
  to authenticated
  using (public.is_org_member(org_id));

-- Only admins can insert terms
drop policy if exists "Admins can insert terms in their orgs" on public.officer_terms;
create policy "Admins can insert terms in their orgs"
  on public.officer_terms
  for insert
  to authenticated
  with check (public.is_org_admin(org_id));

-- Only admins can update terms
drop policy if exists "Admins can update terms in their orgs" on public.officer_terms;
create policy "Admins can update terms in their orgs"
  on public.officer_terms
  for update
  to authenticated
  using (public.is_org_admin(org_id))
  with check (public.is_org_admin(org_id));

-- Only admins can delete terms
drop policy if exists "Admins can delete terms in their orgs" on public.officer_terms;
create policy "Admins can delete terms in their orgs"
  on public.officer_terms
  for delete
  to authenticated
  using (public.is_org_admin(org_id));

-- 3. Stored Procedure: record_officer_term
create or replace function public.record_officer_term(
  target_org uuid,
  p_term_name text,
  p_role_title text,
  p_holder_name text,
  p_start_date date,
  p_end_date date,
  p_member_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_term text;
  clean_role text;
  clean_holder text;
  new_term_id uuid;
begin
  if not public.is_org_admin(target_org) then
    raise exception 'not_admin';
  end if;

  clean_term := regexp_replace(btrim(coalesce(p_term_name, '')), '\s+', ' ', 'g');
  clean_role := regexp_replace(btrim(coalesce(p_role_title, '')), '\s+', ' ', 'g');
  clean_holder := regexp_replace(btrim(coalesce(p_holder_name, '')), '\s+', ' ', 'g');

  if char_length(clean_term) < 2 or char_length(clean_term) > 100 then
    raise exception 'invalid_term_name';
  end if;

  if char_length(clean_role) < 2 or char_length(clean_role) > 100 then
    raise exception 'invalid_role_title';
  end if;

  if char_length(clean_holder) < 2 or char_length(clean_holder) > 100 then
    raise exception 'invalid_holder_name';
  end if;

  if p_end_date < p_start_date then
    raise exception 'invalid_dates';
  end if;

  -- Verify member belongs to this org if member_id is provided
  if p_member_id is not null then
    if not exists (select 1 from public.members where id = p_member_id and org_id = target_org) then
      raise exception 'member_not_found';
    end if;
  end if;

  -- Overlapping terms check: a person can't hold two overlapping terms for the same role
  if exists (
    select 1 from public.officer_terms
    where org_id = target_org
      and lower(role_title) = lower(clean_role)
      and (
        (p_member_id is not null and member_id = p_member_id)
        or (lower(holder_name) = lower(clean_holder))
      )
      and p_start_date <= end_date
      and p_end_date >= start_date
  ) then
    raise exception 'overlapping_term';
  end if;

  insert into public.officer_terms (
    org_id,
    member_id,
    holder_name,
    role_title,
    term_name,
    start_date,
    end_date,
    created_at,
    updated_at
  ) values (
    target_org,
    p_member_id,
    clean_holder,
    clean_role,
    clean_term,
    p_start_date,
    p_end_date,
    now(),
    now()
  )
  returning id into new_term_id;

  return new_term_id;
end;
$$;

revoke all on function public.record_officer_term(uuid, text, text, text, date, date, uuid) from public, anon;
grant execute on function public.record_officer_term(uuid, text, text, text, date, date, uuid) to authenticated;

-- 4. Stored Procedure: update_officer_term
create or replace function public.update_officer_term(
  p_term_id uuid,
  p_term_name text,
  p_role_title text,
  p_holder_name text,
  p_start_date date,
  p_end_date date,
  p_member_id uuid default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  target_org uuid;
  clean_term text;
  clean_role text;
  clean_holder text;
begin
  select org_id into target_org from public.officer_terms where id = p_term_id;
  if target_org is null then
    raise exception 'term_not_found';
  end if;

  if not public.is_org_admin(target_org) then
    raise exception 'not_admin';
  end if;

  clean_term := regexp_replace(btrim(coalesce(p_term_name, '')), '\s+', ' ', 'g');
  clean_role := regexp_replace(btrim(coalesce(p_role_title, '')), '\s+', ' ', 'g');
  clean_holder := regexp_replace(btrim(coalesce(p_holder_name, '')), '\s+', ' ', 'g');

  if char_length(clean_term) < 2 or char_length(clean_term) > 100 then
    raise exception 'invalid_term_name';
  end if;

  if char_length(clean_role) < 2 or char_length(clean_role) > 100 then
    raise exception 'invalid_role_title';
  end if;

  if char_length(clean_holder) < 2 or char_length(clean_holder) > 100 then
    raise exception 'invalid_holder_name';
  end if;

  if p_end_date < p_start_date then
    raise exception 'invalid_dates';
  end if;

  if p_member_id is not null then
    if not exists (select 1 from public.members where id = p_member_id and org_id = target_org) then
      raise exception 'member_not_found';
    end if;
  end if;

  -- Overlapping check excluding the current term row
  if exists (
    select 1 from public.officer_terms
    where org_id = target_org
      and id != p_term_id
      and lower(role_title) = lower(clean_role)
      and (
        (p_member_id is not null and member_id = p_member_id)
        or (lower(holder_name) = lower(clean_holder))
      )
      and p_start_date <= end_date
      and p_end_date >= start_date
  ) then
    raise exception 'overlapping_term';
  end if;

  update public.officer_terms
     set term_name = clean_term,
         role_title = clean_role,
         holder_name = clean_holder,
         start_date = p_start_date,
         end_date = p_end_date,
         member_id = p_member_id,
         updated_at = now()
   where id = p_term_id;

  return 'ok';
end;
$$;

revoke all on function public.update_officer_term(uuid, text, text, text, date, date, uuid) from public, anon;
grant execute on function public.update_officer_term(uuid, text, text, text, date, date, uuid) to authenticated;

-- 5. Stored Procedure: delete_officer_term
create or replace function public.delete_officer_term(
  p_term_id uuid
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  target_org uuid;
begin
  select org_id into target_org from public.officer_terms where id = p_term_id;
  if target_org is null then
    raise exception 'term_not_found';
  end if;

  if not public.is_org_admin(target_org) then
    raise exception 'not_admin';
  end if;

  delete from public.officer_terms where id = p_term_id;
  return 'ok';
end;
$$;

revoke all on function public.delete_officer_term(uuid) from public, anon;
grant execute on function public.delete_officer_term(uuid) to authenticated;

-- H2: Store key documents and links
-- Table to store documents (uploaded files or external links) scoped to an organization.

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  title text not null,
  category text not null,
  kind text not null,
  storage_path text,
  url text,
  file_size bigint,
  mime_type text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Title constraint: between 2 and 150 characters
alter table public.documents drop constraint if exists documents_title_length;
alter table public.documents
  add constraint documents_title_length check (char_length(btrim(title)) between 2 and 150);

-- Category constraint: Finance, Legal, Templates, Contacts, General
alter table public.documents drop constraint if exists documents_category_check;
alter table public.documents
  add constraint documents_category_check check (category in ('Finance', 'Legal', 'Templates', 'Contacts', 'General'));

-- Kind constraint: file or link
alter table public.documents drop constraint if exists documents_kind_check;
alter table public.documents
  add constraint documents_kind_check check (kind in ('file', 'link'));

-- Payload constraint:
-- If kind is 'file': storage_path is required, url must be null
-- If kind is 'link': url is required, storage_path, file_size, and mime_type must be null
alter table public.documents drop constraint if exists documents_payload_check;
alter table public.documents
  add constraint documents_payload_check check (
    (kind = 'file' and storage_path is not null and char_length(btrim(storage_path)) > 0 and url is null)
    or
    (kind = 'link' and url is not null and char_length(btrim(url)) > 0 and storage_path is null and file_size is null and mime_type is null)
  );

-- File size constraint: positive for files, null for links
alter table public.documents drop constraint if exists documents_file_size_check;
alter table public.documents
  add constraint documents_file_size_check check (
    (kind = 'file' and file_size is not null and file_size > 0)
    or
    (kind = 'link' and file_size is null)
  );

-- Indexes for performance and sorting (newest first, filter by category)
create index if not exists documents_org_created_idx
  on public.documents (org_id, created_at desc);

create index if not exists documents_org_category_idx
  on public.documents (org_id, category);

-- Row Level Security for documents table
alter table public.documents enable row level security;

revoke all on public.documents from anon, authenticated;
grant select, insert, delete on public.documents to authenticated;

-- Officers can view documents in their orgs
drop policy if exists "Officers can read documents in their orgs" on public.documents;
create policy "Officers can read documents in their orgs"
  on public.documents
  for select
  to authenticated
  using (public.is_org_member(org_id));

-- Officers can insert documents in their orgs
drop policy if exists "Officers can insert documents in their orgs" on public.documents;
create policy "Officers can insert documents in their orgs"
  on public.documents
  for insert
  to authenticated
  with check (public.is_org_member(org_id));

-- Officers can delete documents in their orgs
drop policy if exists "Officers can delete documents in their orgs" on public.documents;
create policy "Officers can delete documents in their orgs"
  on public.documents
  for delete
  to authenticated
  using (public.is_org_member(org_id));

-- Storage Bucket Setup for Handover Documents (org-documents)
do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public)
    values ('org-documents', 'org-documents', false)
    on conflict (id) do update set public = false;

    -- Drop existing storage policies if present
    drop policy if exists "Officers can upload handover documents" on storage.objects;
    drop policy if exists "Officers can read handover documents" on storage.objects;
    drop policy if exists "Officers can delete handover documents" on storage.objects;

    -- Officers can upload files to their organization folder
    create policy "Officers can upload handover documents"
      on storage.objects for insert
      to authenticated
      with check (
        bucket_id = 'org-documents'
        and public.is_org_member((storage.foldername(name))[1]::uuid)
      );

    -- Officers can read/download files in their organization folder
    create policy "Officers can read handover documents"
      on storage.objects for select
      to authenticated
      using (
        bucket_id = 'org-documents'
        and public.is_org_member((storage.foldername(name))[1]::uuid)
      );

    -- Officers can delete files in their organization folder
    create policy "Officers can delete handover documents"
      on storage.objects for delete
      to authenticated
      using (
        bucket_id = 'org-documents'
        and public.is_org_member((storage.foldername(name))[1]::uuid)
      );
  end if;
exception when others then
  null;
end $$;

-- ============================================================================
-- >>> FILE: 20261125120000_h4_handover_guides.sql
-- ============================================================================

-- H4: Handover guide template
-- Allows outgoing officers to fill in a handover guide for their successor,
-- linking key stored documents (from H2), with editing locked once finalized
-- unless reopened by an organization admin.

-- 1. Table: handover_guides
create table if not exists public.handover_guides (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  term_id uuid references public.officer_terms (id) on delete set null,
  role_title text not null,
  status text not null default 'draft',
  sections jsonb not null default '{}'::jsonb,
  author_id uuid references auth.users (id) on delete set null,
  finalized_by uuid references auth.users (id) on delete set null,
  finalized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Constraints
alter table public.handover_guides drop constraint if exists handover_guides_role_title_length;
alter table public.handover_guides
  add constraint handover_guides_role_title_length check (char_length(btrim(role_title)) between 2 and 100);

alter table public.handover_guides drop constraint if exists handover_guides_status_check;
alter table public.handover_guides
  add constraint handover_guides_status_check check (status in ('draft', 'ready'));

-- Indexes
create index if not exists handover_guides_org_role_idx
  on public.handover_guides (org_id, role_title);

create index if not exists handover_guides_org_term_idx
  on public.handover_guides (org_id, term_id);

-- 2. Row Level Security
alter table public.handover_guides enable row level security;

-- Officers can view handover guides in their org
drop policy if exists "Officers can view handover guides in their org" on public.handover_guides;
create policy "Officers can view handover guides in their org"
  on public.handover_guides
  for select
  to authenticated
  using (
    public.is_org_member(org_id)
    and (
      status = 'ready'
      or author_id = auth.uid()
      or public.is_org_admin(org_id)
    )
  );

-- Officers can insert handover guides in their org
drop policy if exists "Officers can create handover guides in their org" on public.handover_guides;
create policy "Officers can create handover guides in their org"
  on public.handover_guides
  for insert
  to authenticated
  with check (public.is_org_member(org_id));

-- Authors and admins can update draft guides; admins can update any guide
drop policy if exists "Authors and admins can update handover guides" on public.handover_guides;
create policy "Authors and admins can update handover guides"
  on public.handover_guides
  for update
  to authenticated
  using (
    public.is_org_member(org_id)
    and (
      (status = 'draft' and author_id = auth.uid())
      or public.is_org_admin(org_id)
    )
  )
  with check (
    public.is_org_member(org_id)
    and (
      (status = 'draft' and author_id = auth.uid())
      or public.is_org_admin(org_id)
    )
  );

-- Admins can delete handover guides
drop policy if exists "Admins can delete handover guides" on public.handover_guides;
create policy "Admins can delete handover guides"
  on public.handover_guides
  for delete
  to authenticated
  using (public.is_org_admin(org_id));

-- Helper function: auto-update updated_at timestamp if not already created
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Trigger: auto-update updated_at timestamp
drop trigger if exists set_handover_guides_updated_at on public.handover_guides;
create trigger set_handover_guides_updated_at
  before update on public.handover_guides
  for each row execute function public.set_updated_at();

-- ============================================================================
-- >>> FILE: 20261126120000_h5_transfer_admin.sql
-- ============================================================================

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

-- ============================================================================
-- >>> FILE: 20261127120000_o1_org_health.sql
-- ============================================================================

-- O1: Org health dashboard (officer Home) -----------------------------------
--
-- One read-only function that gathers the facts behind the Home dashboard in a
-- single round trip: members, dues, events, officer terms, handover and
-- documents. It returns raw counts and dates only. Whether an area is "on
-- track" or "needs action" is decided in the app (src/lib/health/org-health.ts),
-- so the thresholds can change without a migration.
--
-- Every calculation that also appears on another screen follows that screen's
-- rules, so Home never disagrees with it:
--   * Dues counts and amounts: the same rules as get_dues_period_dashboard (P4).
--   * Member statuses: pending, active, inactive (R1).
--
-- "Today" is the date in Manila, the same place the peso amounts and due dates
-- are written for. Change v_tz below if the product ever serves another zone.

create or replace function public.get_org_health(p_org_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_tz constant text := 'Asia/Manila';
  v_now timestamptz := now();
  v_today date := (now() at time zone v_tz)::date;
  v_caller uuid;
  v_members jsonb;
  v_active int;
  v_period record;
  v_dues jsonb := null;
  v_events jsonb;
  v_officers jsonb;
  v_handover jsonb;
  v_documents jsonb;
begin
  v_caller := auth.uid();
  if v_caller is null then
    raise exception 'not_authenticated';
  end if;

  -- A missing org and an org the caller is not in look the same
  if p_org_id is null or not public.is_org_member(p_org_id) then
    raise exception 'not_authorized';
  end if;

  -- 1. Members ---------------------------------------------------------------
  select
    jsonb_build_object(
      'active', count(*) filter (where status = 'active'),
      'pending', count(*) filter (where status = 'pending'),
      'inactive', count(*) filter (where status = 'inactive'),
      'joined_30d', count(*) filter (where created_at >= v_now - interval '30 days'),
      'joined_prev_30d', count(*) filter (
        where created_at >= v_now - interval '60 days' and created_at < v_now - interval '30 days'
      ),
      'oldest_pending_days', (
        extract(day from v_now - min(created_at) filter (where status = 'pending'))
      )::int,
      -- New members per week for the last 8 weeks, oldest first (index 7 is the latest week)
      'joined_weekly', (
        select coalesce(jsonb_agg(t.joined order by t.wk desc), '[]'::jsonb)
          from (
            select w.wk, count(m.id)::int as joined
              from generate_series(0, 7) as w(wk)
              left join public.members m
                on m.org_id = p_org_id
               and m.created_at >= v_now - interval '7 days' * (w.wk + 1)
               and m.created_at < v_now - interval '7 days' * w.wk
             group by w.wk
          ) t
      )
    ),
    count(*) filter (where status = 'active')::int
    into v_members, v_active
    from public.members
   where org_id = p_org_id;

  -- 2. Dues: the open period officers see first on the Dues page --------------
  select id, name, amount, due_on,
         (created_at at time zone v_tz)::date as created_on
    into v_period
    from public.dues_periods
   where org_id = p_org_id and status = 'open'
   order by created_at desc, id desc
   limit 1;

  if v_period.id is not null then
    with period_payments as (
      -- One row per member: verified beats submitted beats rejected, then the latest
      select distinct on (p.member_id)
        p.member_id,
        p.amount,
        p.status as payment_status
      from public.dues_payments p
      where p.period_id = v_period.id
      order by p.member_id,
        case p.status when 'verified' then 1 when 'submitted' then 2 when 'rejected' then 3 else 4 end,
        p.submitted_at desc,
        p.id desc
    ),
    candidates as (
      -- Active members, plus anyone inactive who still paid this period
      select m.status as member_status, pp.payment_status, pp.amount
      from public.members m
      left join period_payments pp on pp.member_id = m.id
      where m.org_id = p_org_id
        and (m.status = 'active' or pp.member_id is not null)
    )
    select jsonb_build_object(
      'period_id', v_period.id,
      'name', v_period.name,
      'amount', v_period.amount,
      'due_on', v_period.due_on,
      'created_on', v_period.created_on,
      'active_members', count(*) filter (where member_status = 'active'),
      'paid', count(*) filter (where payment_status = 'verified'),
      'pending', count(*) filter (where payment_status = 'submitted'),
      'rejected', count(*) filter (where payment_status = 'rejected'),
      'unpaid', count(*) filter (where payment_status is null),
      'collected', coalesce(sum(amount) filter (where payment_status = 'verified'), 0),
      'expected', count(*) filter (where member_status = 'active') * v_period.amount,
      'outstanding', count(*) filter (
        where member_status = 'active' and payment_status is distinct from 'verified'
      ) * v_period.amount
    )
    into v_dues
    from candidates;
  end if;

  -- 3. Events and turnout ------------------------------------------------------
  -- Turnout is check-ins divided by today's active members, so it is an
  -- approximation for older events. Cancelled events never count.
  with held as (
    select
      e.title,
      e.starts_at,
      case
        when v_active > 0
          then least(1.0, (select count(*) from public.attendance a where a.event_id = e.id)::numeric / v_active)
        else null
      end as turnout
    from public.events e
    where e.org_id = p_org_id
      and e.status = 'scheduled'
      and e.ends_at < v_now
      and e.starts_at >= v_now - interval '180 days'
  )
  select jsonb_build_object(
    'total', (select count(*) from public.events where org_id = p_org_id and status = 'scheduled'),
    'upcoming', (
      select count(*) from public.events
       where org_id = p_org_id and status = 'scheduled' and ends_at >= v_now
    ),
    'next_event', (
      select jsonb_build_object('id', e.id, 'title', e.title, 'starts_at', e.starts_at)
        from public.events e
       where e.org_id = p_org_id and e.status = 'scheduled' and e.ends_at >= v_now
       order by e.starts_at asc, e.id asc
       limit 1
    ),
    'held_90d', count(*) filter (where starts_at >= v_now - interval '90 days'),
    'turnout_pct_90d', round(avg(turnout) filter (where starts_at >= v_now - interval '90 days') * 100),
    'held_prev_90d', count(*) filter (where starts_at < v_now - interval '90 days'),
    'turnout_pct_prev_90d', round(avg(turnout) filter (where starts_at < v_now - interval '90 days') * 100),
    -- The last 8 events held, oldest first, for the turnout chart
    'recent', coalesce(
      (
        select jsonb_agg(
                 jsonb_build_object('title', r.title, 'starts_at', r.starts_at, 'turnout_pct', round(r.turnout * 100))
                 order by r.starts_at asc
               )
          from (select h.title, h.starts_at, h.turnout from held h order by h.starts_at desc limit 8) r
      ),
      '[]'::jsonb
    )
  )
  into v_events
  from held;

  -- 4. Officers and their terms -------------------------------------------------
  select jsonb_build_object(
    'with_access', (select count(*) from public.org_officers where org_id = p_org_id),
    'terms_total', count(*),
    'terms_current', count(*) filter (where start_date <= v_today and end_date >= v_today),
    'terms_ending_30d', count(*) filter (
      where start_date <= v_today and end_date >= v_today and end_date <= v_today + 30
    ),
    'next_term_end', min(end_date) filter (where start_date <= v_today and end_date >= v_today)
  )
  into v_officers
  from public.officer_terms
  where org_id = p_org_id;

  -- 5. Handover: roles whose term ends within 60 days, and their guide ----------
  -- A guide belongs to a role when it is linked to that term or has the same role
  -- title. The best guide wins: ready, then draft, then none.
  with leaving as (
    -- One row per role (ignoring case and spaces), with its earliest end date
    select
      lower(btrim(t.role_title)) as role_key,
      min(btrim(t.role_title)) as role_title,
      min(t.end_date) as end_date
    from public.officer_terms t
    where t.org_id = p_org_id
      and t.end_date >= v_today
      and t.end_date <= v_today + 60
    group by lower(btrim(t.role_title))
  ),
  ending as (
    select
      l.role_title,
      l.end_date,
      coalesce(
        (
          -- An aggregate always returns a row, so count(*) = 0 must give null
          -- for the coalesce below to reach 'missing'
          select case
                   when count(*) = 0 then null
                   when bool_or(g.status = 'ready') then 'ready'
                   else 'draft'
                 end
            from public.handover_guides g
           where g.org_id = p_org_id
             and (
               lower(btrim(g.role_title)) = l.role_key
               or g.term_id in (
                 select t2.id from public.officer_terms t2
                  where t2.org_id = p_org_id
                    and lower(btrim(t2.role_title)) = l.role_key
               )
             )
        ),
        'missing'
      ) as guide_status
    from leaving l
  )
  select jsonb_build_object(
    'ending_total', (select count(*) from ending),
    'ending_ready', (select count(*) from ending where guide_status = 'ready'),
    'ending_draft', (select count(*) from ending where guide_status = 'draft'),
    'ending_missing', (select count(*) from ending where guide_status = 'missing'),
    'roles', coalesce(
      (
        select jsonb_agg(
                 jsonb_build_object(
                   'role_title', r.role_title,
                   'end_date', r.end_date,
                   'guide_status', r.guide_status
                 )
                 order by r.end_date asc, r.role_title asc
               )
          from (select * from ending order by end_date asc, role_title asc limit 10) r
      ),
      '[]'::jsonb
    ),
    'guides_ready', (
      select count(*) from public.handover_guides where org_id = p_org_id and status = 'ready'
    ),
    'guides_draft', (
      select count(*) from public.handover_guides where org_id = p_org_id and status = 'draft'
    )
  )
  into v_handover;

  -- 6. Documents -------------------------------------------------------------------
  select jsonb_build_object(
    'total', count(*),
    'categories_covered', count(distinct category),
    'last_added_at', max(created_at)
  )
  into v_documents
  from public.documents
  where org_id = p_org_id;

  return jsonb_build_object(
    'today', v_today,
    'generated_at', v_now,
    'members', v_members,
    'dues', v_dues,
    'events', v_events,
    'officers', v_officers,
    'handover', v_handover,
    'documents', v_documents
  );
end;
$$;

revoke all on function public.get_org_health(uuid) from public, anon;
grant execute on function public.get_org_health(uuid) to authenticated;
grant execute on function public.get_org_health(uuid) to service_role;

-- Tell the API to pick up the new function now, instead of after its next cache refresh
notify pgrst, 'reload schema';
