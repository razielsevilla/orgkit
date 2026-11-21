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
