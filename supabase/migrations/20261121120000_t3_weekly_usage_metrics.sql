-- T3: Weekly usage metrics
--
-- A weekly snapshot of how much OrgKit is used, for the product owner only:
-- orgs (active and inactive), events created, check-ins and active officers.
--
-- Weeks run Monday to Sunday, UTC. Only aggregate counts are stored: nothing
-- about individual members and no page views.
--
-- An org is ACTIVE in a week if, that week, an event was created, someone
-- checked in, a dues reminder was sent, or a dues payment was verified,
-- rejected or undone. Every other org counts as inactive, so the two always add
-- up to the orgs that existed (an org with no activity is never left out).
--
-- An ACTIVE OFFICER is a distinct officer who did one of those officer actions
-- that week. The app has no sign-in history, so this is based on actions.
--
-- 1. platform_owners: who the product owner is (checked in the database)
-- 2. usage_weekly: one snapshot row per week
-- 3. usage_report_runs: records failed runs so they can be retried
-- 4. compute_usage_week, run_weekly_usage_report: service role only (cron)
-- 5. get_usage_report: the owner's read access

-- 1. Product owners ---------------------------------------------------------

create table if not exists public.platform_owners (
  officer_id uuid primary key references public.officers(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.platform_owners enable row level security;

-- No policies and no client access: the table is read only through
-- is_platform_owner(). Add an owner with an insert run as the database owner:
--   insert into public.platform_owners (officer_id)
--   select id from public.officers where email = 'owner@example.com';
revoke all on public.platform_owners from public, anon, authenticated;
grant all on public.platform_owners to service_role;

create or replace function public.is_platform_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.platform_owners where officer_id = auth.uid()
  );
$$;

revoke all on function public.is_platform_owner() from public, anon;
grant execute on function public.is_platform_owner() to authenticated;
grant execute on function public.is_platform_owner() to service_role;

-- 2. Weekly snapshots -------------------------------------------------------

create table if not exists public.usage_weekly (
  week_start date primary key,
  orgs_total integer not null check (orgs_total >= 0),
  orgs_active integer not null check (orgs_active >= 0),
  orgs_inactive integer not null check (orgs_inactive >= 0),
  events_created integer not null check (events_created >= 0),
  check_ins integer not null check (check_ins >= 0),
  active_officers integer not null check (active_officers >= 0),
  computed_at timestamptz not null default now(),
  constraint usage_weekly_monday check (extract(isodow from week_start) = 1),
  constraint usage_weekly_orgs_add_up check (orgs_active + orgs_inactive = orgs_total)
);

alter table public.usage_weekly enable row level security;
revoke all on public.usage_weekly from public, anon, authenticated;
grant all on public.usage_weekly to service_role;

-- 3. Run log ----------------------------------------------------------------

create table if not exists public.usage_report_runs (
  week_start date primary key,
  status text not null check (status in ('succeeded', 'failed')),
  attempts integer not null default 1 check (attempts >= 1),
  error_message text null,
  next_retry_at timestamptz null,
  last_attempt_at timestamptz not null default now()
);

alter table public.usage_report_runs enable row level security;
revoke all on public.usage_report_runs from public, anon, authenticated;
grant all on public.usage_report_runs to service_role;

-- 4a. Compute one week ------------------------------------------------------
-- Safe to run again for the same week: it replaces that week's row.

create or replace function public.compute_usage_week(p_week_start date)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from timestamptz;
  v_to timestamptz;
  v_orgs_total integer;
  v_orgs_active integer;
  v_events integer;
  v_check_ins integer;
  v_officers integer;
begin
  if extract(isodow from p_week_start) <> 1 then
    raise exception 'week_start_must_be_a_monday';
  end if;

  v_from := p_week_start::timestamp at time zone 'utc';
  v_to := v_from + interval '7 days';

  select count(*)::int into v_orgs_total
    from public.orgs o
   where o.created_at < v_to;

  select count(*)::int into v_events
    from public.events e
   where e.created_at >= v_from and e.created_at < v_to;

  select count(*)::int into v_check_ins
    from public.attendance a
   where a.checked_in_at >= v_from and a.checked_in_at < v_to;

  with activity as (
    select e.org_id, e.created_by as officer_id
      from public.events e
     where e.created_at >= v_from and e.created_at < v_to
    union all
    select a.org_id, a.marked_by
      from public.attendance a
     where a.checked_in_at >= v_from and a.checked_in_at < v_to
    union all
    select r.org_id, r.sent_by
      from public.dues_reminders r
     where r.sent_at >= v_from and r.sent_at < v_to
    union all
    select pe.org_id, pe.actor_id
      from public.dues_payment_events pe
     where pe.created_at >= v_from and pe.created_at < v_to
  )
  select
    (select count(distinct act.org_id)::int
       from activity act
       join public.orgs o on o.id = act.org_id and o.created_at < v_to),
    (select count(distinct act.officer_id)::int
       from activity act
      where act.officer_id is not null)
    into v_orgs_active, v_officers;

  insert into public.usage_weekly (
    week_start, orgs_total, orgs_active, orgs_inactive,
    events_created, check_ins, active_officers, computed_at
  ) values (
    p_week_start, v_orgs_total, v_orgs_active, v_orgs_total - v_orgs_active,
    v_events, v_check_ins, v_officers, now()
  )
  on conflict (week_start) do update set
    orgs_total = excluded.orgs_total,
    orgs_active = excluded.orgs_active,
    orgs_inactive = excluded.orgs_inactive,
    events_created = excluded.events_created,
    check_ins = excluded.check_ins,
    active_officers = excluded.active_officers,
    computed_at = excluded.computed_at;
end;
$$;

revoke all on function public.compute_usage_week(date) from public, anon, authenticated;
grant execute on function public.compute_usage_week(date) to service_role;

-- 4b. The scheduled run -----------------------------------------------------
-- Makes sure each of the last 4 completed weeks has a snapshot. The first run
-- therefore fills in the past weeks from existing data. A week that fails is
-- recorded and tried again later (15 minutes, then doubling, up to 5 attempts);
-- one failing week never stops the others. Does nothing when nothing is due.

create or replace function public.run_weekly_usage_report()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_week date := date_trunc('week', now() at time zone 'utc')::date;
  v_week date;
  v_run public.usage_report_runs%rowtype;
begin
  for v_week in
    select v_current_week - n * 7 from generate_series(1, 4) as n order by 1
  loop
    if exists (select 1 from public.usage_weekly where week_start = v_week) then
      continue;
    end if;

    select * into v_run from public.usage_report_runs where week_start = v_week;
    if found and v_run.status = 'failed'
       and (v_run.attempts >= 5 or v_run.next_retry_at > now()) then
      continue;
    end if;

    begin
      perform public.compute_usage_week(v_week);

      insert into public.usage_report_runs (week_start, status, attempts, last_attempt_at)
      values (v_week, 'succeeded', 1, now())
      on conflict (week_start) do update set
        status = 'succeeded',
        attempts = public.usage_report_runs.attempts + 1,
        error_message = null,
        next_retry_at = null,
        last_attempt_at = now();
    exception when others then
      insert into public.usage_report_runs (
        week_start, status, attempts, error_message, next_retry_at, last_attempt_at
      ) values (
        v_week, 'failed', 1, sqlerrm, now() + interval '15 minutes', now()
      )
      on conflict (week_start) do update set
        status = 'failed',
        attempts = public.usage_report_runs.attempts + 1,
        error_message = sqlerrm,
        next_retry_at = now() + interval '15 minutes'
          * power(2, least(public.usage_report_runs.attempts, 4)),
        last_attempt_at = now();
    end;
  end loop;
end;
$$;

revoke all on function public.run_weekly_usage_report() from public, anon, authenticated;
grant execute on function public.run_weekly_usage_report() to service_role;

-- 5. The owner's report -----------------------------------------------------
-- The last completed weeks, newest first. A week with no snapshot is still
-- listed, as 'failed' (with the attempt count) or 'pending', so the page can
-- say so instead of showing nothing.

create or replace function public.get_usage_report(p_weeks integer default 4)
returns table (
  week_start date,
  week_end date,
  status text,
  orgs_total integer,
  orgs_active integer,
  orgs_inactive integer,
  events_created integer,
  check_ins integer,
  active_officers integer,
  computed_at timestamptz,
  attempts integer,
  error_message text,
  next_retry_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_current_week date := date_trunc('week', now() at time zone 'utc')::date;
  v_weeks integer := least(greatest(coalesce(p_weeks, 4), 1), 12);
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if not public.is_platform_owner() then
    raise exception 'not_authorized';
  end if;

  return query
  select
    w.week_start,
    (w.week_start + 6),
    case
      when u.week_start is not null then 'ready'
      when r.status = 'failed' then 'failed'
      else 'pending'
    end,
    u.orgs_total,
    u.orgs_active,
    u.orgs_inactive,
    u.events_created,
    u.check_ins,
    u.active_officers,
    u.computed_at,
    r.attempts,
    case when u.week_start is null then r.error_message end,
    case when u.week_start is null and r.status = 'failed' then r.next_retry_at end
  from (
    select (v_current_week - n * 7) as week_start
      from generate_series(1, v_weeks) as n
  ) w
  left join public.usage_weekly u on u.week_start = w.week_start
  left join public.usage_report_runs r on r.week_start = w.week_start
  order by w.week_start desc;
end;
$$;

revoke all on function public.get_usage_report(integer) from public, anon;
grant execute on function public.get_usage_report(integer) to authenticated;
grant execute on function public.get_usage_report(integer) to service_role;
