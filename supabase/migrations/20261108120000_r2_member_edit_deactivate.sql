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
