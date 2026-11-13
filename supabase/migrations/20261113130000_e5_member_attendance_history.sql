-- E5: Member attendance history
-- One read function an officer calls from the roster to see how often a member
-- has attended. No new tables.
--
-- Rules:
--   * the caller must be an officer of the member's org (is_org_member);
--   * a member of another org, a missing member and a non-officer caller all get
--     the same 'member_not_found', so the answer never confirms that a member
--     exists somewhere else;
--   * only events that have ended are listed (ends_at < now());
--   * an event is listed when it ended after the member joined (members.created_at)
--     or when the member has an attendance row for it, so a record is never hidden;
--   * cancelled events are listed with their status. Whether they count is
--     decided by the caller (the app never counts them);
--   * inactive and pending members can be viewed.

-- 1. Per-member lookups (the unique (event_id, member_id) index leads with event)
create index if not exists attendance_member_idx
  on public.attendance (member_id);

-- 2. get_member_attendance_history
-- Returns { org_id, joined_at, events: [{ event_id, title, starts_at, ends_at, status,
-- attended, method, checked_in_at }] }, newest event first.
create or replace function public.get_member_attendance_history(
  target_member uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  caller_id uuid;
  member_org uuid;
  member_joined timestamptz;
  history jsonb;
begin
  caller_id := auth.uid();
  if caller_id is null then
    raise exception 'not_authenticated';
  end if;

  select org_id, created_at
    into member_org, member_joined
    from public.members
   where id = target_member;

  -- One answer for "no such member" and "not your org's member"
  if member_org is null or not public.is_org_member(member_org) then
    raise exception 'member_not_found';
  end if;

  select coalesce(
           jsonb_agg(
             jsonb_build_object(
               'event_id', e.id,
               'title', e.title,
               'starts_at', e.starts_at,
               'ends_at', e.ends_at,
               'status', e.status,
               'attended', a.id is not null,
               'method', a.method,
               'checked_in_at', a.checked_in_at
             )
             order by e.starts_at desc, e.id
           ),
           '[]'::jsonb
         )
    into history
    from public.events e
    left join public.attendance a
      on a.event_id = e.id
     and a.member_id = target_member
   where e.org_id = member_org
     and e.ends_at < now()
     and (e.ends_at > member_joined or a.id is not null);

  return jsonb_build_object(
    'org_id', member_org,
    'joined_at', member_joined,
    'events', history
  );
end;
$$;

revoke all on function public.get_member_attendance_history(uuid) from public, anon;
grant execute on function public.get_member_attendance_history(uuid) to authenticated;
