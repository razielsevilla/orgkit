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
