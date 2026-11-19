-- E1: an event that has already ended can no longer be cancelled.
-- Cancelling is for events that haven't happened (or are still running). A past
-- event stays in the list as it was, and its attendance is still correctable.
-- Cancelling an already cancelled event is still a harmless no-op, and cancelling
-- still closes the check-in window (as in E2).
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
  event_end timestamptz;
begin
  caller_id := auth.uid();
  if caller_id is null then
    raise exception 'not_authenticated';
  end if;

  select org_id, status, ends_at
    into event_org, current_status, event_end
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

  if event_end < now() then
    raise exception 'event_ended';
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
