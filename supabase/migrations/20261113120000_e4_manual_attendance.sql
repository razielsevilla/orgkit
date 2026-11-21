-- E4: Manual attendance
-- An officer adds or removes a member from an event's attendance list by hand.
-- authenticated has no INSERT or DELETE on attendance (see E3), so both writes
-- go through the security-definer functions below.
--
-- Rules:
--   * the caller must be an officer of the event's org (is_org_member);
--   * a cancelled event is read-only;
--   * an ended event can still be corrected (no check-in grace here, since
--     fixing the list after the event is the point of manual add);
--   * only an active member of the same org can be added.

-- 1. mark_attendance_manual
-- Returns 'added', or 'already' when the member is already present (for example
-- another officer, or a QR scan, got there first). Never creates a duplicate.
create or replace function public.mark_attendance_manual(
  target_event uuid,
  target_member uuid
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
  inserted_count integer;
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

  if not exists (
    select 1
      from public.members
     where id = target_member
       and org_id = event_org
       and status = 'active'
  ) then
    raise exception 'member_not_found';
  end if;

  insert into public.attendance (org_id, event_id, member_id, method, marked_by)
  values (event_org, target_event, target_member, 'manual', caller_id)
  on conflict (event_id, member_id) do nothing;

  get diagnostics inserted_count = row_count;

  if inserted_count > 0 then
    return 'added';
  end if;
  return 'already';
end;
$$;

revoke all on function public.mark_attendance_manual(uuid, uuid) from public, anon;
grant execute on function public.mark_attendance_manual(uuid, uuid) to authenticated;

-- 2. remove_attendance
-- Returns 'removed', or 'already' when the row was already gone.
create or replace function public.remove_attendance(
  target_event uuid,
  target_member uuid
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
  deleted_count integer;
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

  delete from public.attendance
   where event_id = target_event
     and member_id = target_member;

  get diagnostics deleted_count = row_count;

  if deleted_count > 0 then
    return 'removed';
  end if;
  return 'already';
end;
$$;

revoke all on function public.remove_attendance(uuid, uuid) from public, anon;
grant execute on function public.remove_attendance(uuid, uuid) to authenticated;
