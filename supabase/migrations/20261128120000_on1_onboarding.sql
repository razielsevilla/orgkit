-- ON1: onboarding changes for a new org's first mile.
--
-- 1. A new org starts with its join link switched on, so the admin can share it
--    straight away. Before this the link was off until an admin found the toggle.
--    People who join through it still start as pending and must be confirmed, so
--    switching it on exposes no member data. Existing orgs are left as they are.
-- 2. confirm_all_pending_members: confirm every pending student in one step.

-- 1. create_organization, now with a join link --------------------------------
-- Same as the A4 version, plus the insert into org_join_links at the end.
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

  -- ON1: the join link starts on. An admin can still switch it off or regenerate it.
  insert into public.org_join_links (org_id) values (new_org_id);

  return new_org_id;
end;
$$;

revoke all on function public.create_organization(text, text) from public, anon;
grant execute on function public.create_organization(text, text) to authenticated;

-- 2. Confirm every pending member -----------------------------------------------
-- Same rule as confirm_member: any officer of the org may confirm. Only pending
-- members change; active and inactive ones are never touched. Returns how many
-- were confirmed, so the screen can say so.
create or replace function public.confirm_all_pending_members(target_org uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  confirmed integer;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_org_member(target_org) then
    raise exception 'Not permitted to confirm members of this organization';
  end if;

  update public.members
     set status = 'active'
   where org_id = target_org
     and status = 'pending';

  get diagnostics confirmed = row_count;
  return confirmed;
end;
$$;

revoke all on function public.confirm_all_pending_members(uuid) from public, anon;
grant execute on function public.confirm_all_pending_members(uuid) to authenticated;
