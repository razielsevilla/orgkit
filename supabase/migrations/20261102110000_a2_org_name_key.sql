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
