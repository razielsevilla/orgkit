-- Onboarding baseline: how far each org got, and what share of orgs reach activation.
--
-- READ-ONLY apart from one temporary table that disappears with the session.
-- Counts only: no member names, emails or any personal data are selected.
-- Run it in the Supabase SQL editor (as the database owner). See docs/onboarding.md.
--
-- ACTIVATION (the definition this file measures):
--   One event has QR check-ins from at least 3 different members, and the 3rd of
--   them happened within 14 days of the org being created.
-- The 3 members and the 14 days are assumptions. Change them in the two places
-- marked "ACTIVATION" below, then run the file again.
--
-- Rows made by scripts/seed-org-health.mjs (members with an @seed.orgkit.test email,
-- events titled "Sample · ...") are left out, so sample data cannot inflate a baseline.
--
-- The editor shows the result of the LAST statement: the cohort table. To read the
-- per-org rows instead, run the file with the last select swapped for the one above it.

drop table if exists pg_temp.onboarding_orgs;

create temp table onboarding_orgs as
with qr_ranked as (
  -- Each member checks in to an event at most once (unique on event + member), so
  -- the row number is "how many different members had checked in by then".
  select a.org_id,
         a.event_id,
         a.checked_in_at,
         row_number() over (partition by a.event_id order by a.checked_in_at) as nth_member
    from public.attendance a
    join public.orgs o on o.id = a.org_id
    join public.members m on m.id = a.member_id
   where a.method = 'qr'
     and m.email not like '%@seed.orgkit.test'
     -- ACTIVATION: the 14 days
     and a.checked_in_at <= o.created_at + interval '14 days'
),
activation as (
  select org_id, min(checked_in_at) as activated_at
    from qr_ranked
   -- ACTIVATION: the 3 members
   where nth_member = 3
   group by org_id
),
member_stats as (
  select org_id,
         min(created_at) as first_member_at,
         count(*) filter (where status = 'active') as active_members,
         count(*) filter (where status = 'pending') as pending_members
    from public.members
   where email not like '%@seed.orgkit.test'
   group by org_id
),
event_stats as (
  select org_id,
         min(created_at) as first_event_at,
         count(*) as events_created
    from public.events
   where title not like 'Sample · %'
   group by org_id
)
select o.id as org_id,
       o.name,
       o.created_at,
       extract(day from now() - o.created_at)::int as age_days,
       ms.first_member_at,
       round((extract(epoch from ms.first_member_at - o.created_at) / 3600)::numeric, 1) as hours_to_first_member,
       coalesce(ms.active_members, 0) as active_members,
       coalesce(ms.pending_members, 0) as pending_members,
       es.first_event_at,
       coalesce(es.events_created, 0) as events_created,
       (ac.activated_at is not null) as activated,
       round((extract(epoch from ac.activated_at - o.created_at) / 3600)::numeric, 1) as hours_to_activation,
       -- Did the org do anything in days 15 to 28? Null until the org is 28 days old,
       -- because before that the answer is "not yet", not "no".
       case
         when now() < o.created_at + interval '28 days' then null
         else exists (
                select 1 from public.events e
                 where e.org_id = o.id
                   and e.created_at >  o.created_at + interval '14 days'
                   and e.created_at <= o.created_at + interval '28 days'
              )
              or exists (
                select 1 from public.attendance a
                 where a.org_id = o.id
                   and a.checked_in_at >  o.created_at + interval '14 days'
                   and a.checked_in_at <= o.created_at + interval '28 days'
              )
       end as active_days_15_28
  from public.orgs o
  left join member_stats ms on ms.org_id = o.id
  left join event_stats es on es.org_id = o.id
  left join activation ac on ac.org_id = o.id;

-- 1. Per org (swap this in as the last statement to see every org) ---------------
-- select * from onboarding_orgs order by created_at;

-- 2. Per weekly cohort of org creation (the baseline) ------------------------------
-- "reached" columns are counts of orgs. Activation can only be judged for orgs at
-- least 14 days old, so the rate is against `old_enough`, not against `orgs`.
select date_trunc('week', created_at)::date as cohort_week,
       count(*) as orgs,
       count(*) filter (where first_member_at is not null) as reached_first_member,
       count(*) filter (where active_members >= 5) as reached_5_active_members,
       count(*) filter (where first_event_at is not null) as reached_first_event,
       count(*) filter (where activated) as activated,
       count(*) filter (where age_days >= 14) as old_enough,
       round(100.0 * count(*) filter (where activated and age_days >= 14)
             / nullif(count(*) filter (where age_days >= 14), 0), 1) as activation_rate_pct,
       percentile_cont(0.5) within group (order by hours_to_first_member) as median_hours_to_first_member,
       percentile_cont(0.5) within group (order by hours_to_activation) as median_hours_to_activation,
       count(*) filter (where activated and active_days_15_28) as activated_and_still_active,
       count(*) filter (where not activated and active_days_15_28) as not_activated_but_active,
       count(*) filter (where active_days_15_28 is not null) as measurable_for_retention
  from onboarding_orgs
 group by 1
 order by 1;
