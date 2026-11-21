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
