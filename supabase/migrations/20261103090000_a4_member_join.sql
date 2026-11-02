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
  if char_length(clean_email) > 254 or clean_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
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
