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
