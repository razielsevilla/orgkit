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
