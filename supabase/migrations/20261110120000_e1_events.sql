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
