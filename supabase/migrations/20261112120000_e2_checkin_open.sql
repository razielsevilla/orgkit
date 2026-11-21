-- E2: Event check-in window
-- An officer opens and closes the check-in window of an event. Tokens for the
-- rotating QR are signed by the app and never stored, so the only thing the
-- database holds is whether the window is open.
--
-- authenticated has no UPDATE on events (see E1), so checkin_open can only
-- change through the security-definer functions below.

-- 1. Column
alter table public.events
  add column if not exists checkin_open boolean not null default false;

-- 2. set_event_checkin
-- Opening is refused for a cancelled event and for one that ended more than
-- 1 hour ago. Closing always works, so a window can never be stuck open.
create or replace function public.set_event_checkin(
  target_event uuid,
  should_open boolean
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
  event_ends timestamptz;
begin
  caller_id := auth.uid();
  if caller_id is null then
    raise exception 'not_authenticated';
  end if;

  select org_id, status, ends_at
    into event_org, current_status, event_ends
    from public.events
   where id = target_event;

  if event_org is null then
    raise exception 'event_not_found';
  end if;

  if not public.is_org_member(event_org) then
    raise exception 'not_permitted';
  end if;

  if should_open is distinct from true then
    update public.events
       set checkin_open = false,
           updated_at = now()
     where id = target_event
       and checkin_open;
    return 'ok';
  end if;

  if current_status = 'cancelled' then
    raise exception 'event_cancelled';
  end if;

  if event_ends < now() - interval '1 hour' then
    raise exception 'event_ended';
  end if;

  update public.events
     set checkin_open = true,
         updated_at = now()
   where id = target_event
     and not checkin_open;

  return 'ok';
end;
$$;

revoke all on function public.set_event_checkin(uuid, boolean) from public, anon;
grant execute on function public.set_event_checkin(uuid, boolean) to authenticated;

-- 3. cancel_event
-- Same as E1, and a cancelled event also closes its check-in window.
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
         checkin_open = false,
         updated_at = now()
   where id = target_event;

  return 'ok';
end;
$$;

revoke all on function public.cancel_event(uuid) from public, anon;
grant execute on function public.cancel_event(uuid) to authenticated;
