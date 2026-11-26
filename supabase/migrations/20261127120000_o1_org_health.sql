-- O1: Org health dashboard (officer Home) -----------------------------------
--
-- One read-only function that gathers the facts behind the Home dashboard in a
-- single round trip: members, dues, events, officer terms, handover and
-- documents. It returns raw counts and dates only. Whether an area is "on
-- track" or "needs action" is decided in the app (src/lib/health/org-health.ts),
-- so the thresholds can change without a migration.
--
-- Every calculation that also appears on another screen follows that screen's
-- rules, so Home never disagrees with it:
--   * Dues counts and amounts: the same rules as get_dues_period_dashboard (P4).
--   * Member statuses: pending, active, inactive (R1).
--
-- "Today" is the date in Manila, the same place the peso amounts and due dates
-- are written for. Change v_tz below if the product ever serves another zone.

create or replace function public.get_org_health(p_org_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_tz constant text := 'Asia/Manila';
  v_now timestamptz := now();
  v_today date := (now() at time zone v_tz)::date;
  v_caller uuid;
  v_members jsonb;
  v_active int;
  v_period record;
  v_dues jsonb := null;
  v_events jsonb;
  v_officers jsonb;
  v_handover jsonb;
  v_documents jsonb;
begin
  v_caller := auth.uid();
  if v_caller is null then
    raise exception 'not_authenticated';
  end if;

  -- A missing org and an org the caller is not in look the same
  if p_org_id is null or not public.is_org_member(p_org_id) then
    raise exception 'not_authorized';
  end if;

  -- 1. Members ---------------------------------------------------------------
  select
    jsonb_build_object(
      'active', count(*) filter (where status = 'active'),
      'pending', count(*) filter (where status = 'pending'),
      'inactive', count(*) filter (where status = 'inactive'),
      'joined_30d', count(*) filter (where created_at >= v_now - interval '30 days'),
      'joined_prev_30d', count(*) filter (
        where created_at >= v_now - interval '60 days' and created_at < v_now - interval '30 days'
      ),
      'oldest_pending_days', (
        extract(day from v_now - min(created_at) filter (where status = 'pending'))
      )::int,
      -- New members per week for the last 8 weeks, oldest first (index 7 is the latest week)
      'joined_weekly', (
        select coalesce(jsonb_agg(t.joined order by t.wk desc), '[]'::jsonb)
          from (
            select w.wk, count(m.id)::int as joined
              from generate_series(0, 7) as w(wk)
              left join public.members m
                on m.org_id = p_org_id
               and m.created_at >= v_now - interval '7 days' * (w.wk + 1)
               and m.created_at < v_now - interval '7 days' * w.wk
             group by w.wk
          ) t
      )
    ),
    count(*) filter (where status = 'active')::int
    into v_members, v_active
    from public.members
   where org_id = p_org_id;

  -- 2. Dues: the open period officers see first on the Dues page --------------
  select id, name, amount, due_on,
         (created_at at time zone v_tz)::date as created_on
    into v_period
    from public.dues_periods
   where org_id = p_org_id and status = 'open'
   order by created_at desc, id desc
   limit 1;

  if v_period.id is not null then
    with period_payments as (
      -- One row per member: verified beats submitted beats rejected, then the latest
      select distinct on (p.member_id)
        p.member_id,
        p.amount,
        p.status as payment_status
      from public.dues_payments p
      where p.period_id = v_period.id
      order by p.member_id,
        case p.status when 'verified' then 1 when 'submitted' then 2 when 'rejected' then 3 else 4 end,
        p.submitted_at desc,
        p.id desc
    ),
    candidates as (
      -- Active members, plus anyone inactive who still paid this period
      select m.status as member_status, pp.payment_status, pp.amount
      from public.members m
      left join period_payments pp on pp.member_id = m.id
      where m.org_id = p_org_id
        and (m.status = 'active' or pp.member_id is not null)
    )
    select jsonb_build_object(
      'period_id', v_period.id,
      'name', v_period.name,
      'amount', v_period.amount,
      'due_on', v_period.due_on,
      'created_on', v_period.created_on,
      'active_members', count(*) filter (where member_status = 'active'),
      'paid', count(*) filter (where payment_status = 'verified'),
      'pending', count(*) filter (where payment_status = 'submitted'),
      'rejected', count(*) filter (where payment_status = 'rejected'),
      'unpaid', count(*) filter (where payment_status is null),
      'collected', coalesce(sum(amount) filter (where payment_status = 'verified'), 0),
      'expected', count(*) filter (where member_status = 'active') * v_period.amount,
      'outstanding', count(*) filter (
        where member_status = 'active' and payment_status is distinct from 'verified'
      ) * v_period.amount
    )
    into v_dues
    from candidates;
  end if;

  -- 3. Events and turnout ------------------------------------------------------
  -- Turnout is check-ins divided by today's active members, so it is an
  -- approximation for older events. Cancelled events never count.
  with held as (
    select
      e.title,
      e.starts_at,
      case
        when v_active > 0
          then least(1.0, (select count(*) from public.attendance a where a.event_id = e.id)::numeric / v_active)
        else null
      end as turnout
    from public.events e
    where e.org_id = p_org_id
      and e.status = 'scheduled'
      and e.ends_at < v_now
      and e.starts_at >= v_now - interval '180 days'
  )
  select jsonb_build_object(
    'total', (select count(*) from public.events where org_id = p_org_id and status = 'scheduled'),
    'upcoming', (
      select count(*) from public.events
       where org_id = p_org_id and status = 'scheduled' and ends_at >= v_now
    ),
    'next_event', (
      select jsonb_build_object('id', e.id, 'title', e.title, 'starts_at', e.starts_at)
        from public.events e
       where e.org_id = p_org_id and e.status = 'scheduled' and e.ends_at >= v_now
       order by e.starts_at asc, e.id asc
       limit 1
    ),
    'held_90d', count(*) filter (where starts_at >= v_now - interval '90 days'),
    'turnout_pct_90d', round(avg(turnout) filter (where starts_at >= v_now - interval '90 days') * 100),
    'held_prev_90d', count(*) filter (where starts_at < v_now - interval '90 days'),
    'turnout_pct_prev_90d', round(avg(turnout) filter (where starts_at < v_now - interval '90 days') * 100),
    -- The last 8 events held, oldest first, for the turnout chart
    'recent', coalesce(
      (
        select jsonb_agg(
                 jsonb_build_object('title', r.title, 'starts_at', r.starts_at, 'turnout_pct', round(r.turnout * 100))
                 order by r.starts_at asc
               )
          from (select h.title, h.starts_at, h.turnout from held h order by h.starts_at desc limit 8) r
      ),
      '[]'::jsonb
    )
  )
  into v_events
  from held;

  -- 4. Officers and their terms -------------------------------------------------
  select jsonb_build_object(
    'with_access', (select count(*) from public.org_officers where org_id = p_org_id),
    'terms_total', count(*),
    'terms_current', count(*) filter (where start_date <= v_today and end_date >= v_today),
    'terms_ending_30d', count(*) filter (
      where start_date <= v_today and end_date >= v_today and end_date <= v_today + 30
    ),
    'next_term_end', min(end_date) filter (where start_date <= v_today and end_date >= v_today)
  )
  into v_officers
  from public.officer_terms
  where org_id = p_org_id;

  -- 5. Handover: roles whose term ends within 60 days, and their guide ----------
  -- A guide belongs to a role when it is linked to that term or has the same role
  -- title. The best guide wins: ready, then draft, then none.
  with leaving as (
    -- One row per role (ignoring case and spaces), with its earliest end date
    select
      lower(btrim(t.role_title)) as role_key,
      min(btrim(t.role_title)) as role_title,
      min(t.end_date) as end_date
    from public.officer_terms t
    where t.org_id = p_org_id
      and t.end_date >= v_today
      and t.end_date <= v_today + 60
    group by lower(btrim(t.role_title))
  ),
  ending as (
    select
      l.role_title,
      l.end_date,
      coalesce(
        (
          -- An aggregate always returns a row, so count(*) = 0 must give null
          -- for the coalesce below to reach 'missing'
          select case
                   when count(*) = 0 then null
                   when bool_or(g.status = 'ready') then 'ready'
                   else 'draft'
                 end
            from public.handover_guides g
           where g.org_id = p_org_id
             and (
               lower(btrim(g.role_title)) = l.role_key
               or g.term_id in (
                 select t2.id from public.officer_terms t2
                  where t2.org_id = p_org_id
                    and lower(btrim(t2.role_title)) = l.role_key
               )
             )
        ),
        'missing'
      ) as guide_status
    from leaving l
  )
  select jsonb_build_object(
    'ending_total', (select count(*) from ending),
    'ending_ready', (select count(*) from ending where guide_status = 'ready'),
    'ending_draft', (select count(*) from ending where guide_status = 'draft'),
    'ending_missing', (select count(*) from ending where guide_status = 'missing'),
    'roles', coalesce(
      (
        select jsonb_agg(
                 jsonb_build_object(
                   'role_title', r.role_title,
                   'end_date', r.end_date,
                   'guide_status', r.guide_status
                 )
                 order by r.end_date asc, r.role_title asc
               )
          from (select * from ending order by end_date asc, role_title asc limit 10) r
      ),
      '[]'::jsonb
    ),
    'guides_ready', (
      select count(*) from public.handover_guides where org_id = p_org_id and status = 'ready'
    ),
    'guides_draft', (
      select count(*) from public.handover_guides where org_id = p_org_id and status = 'draft'
    )
  )
  into v_handover;

  -- 6. Documents -------------------------------------------------------------------
  select jsonb_build_object(
    'total', count(*),
    'categories_covered', count(distinct category),
    'last_added_at', max(created_at)
  )
  into v_documents
  from public.documents
  where org_id = p_org_id;

  return jsonb_build_object(
    'today', v_today,
    'generated_at', v_now,
    'members', v_members,
    'dues', v_dues,
    'events', v_events,
    'officers', v_officers,
    'handover', v_handover,
    'documents', v_documents
  );
end;
$$;

revoke all on function public.get_org_health(uuid) from public, anon;
grant execute on function public.get_org_health(uuid) to authenticated;
grant execute on function public.get_org_health(uuid) to service_role;

-- Tell the API to pick up the new function now, instead of after its next cache refresh
notify pgrst, 'reload schema';
