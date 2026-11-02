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

