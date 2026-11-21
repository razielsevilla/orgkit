# Weekly usage metrics (T3)

A weekly snapshot of how much OrgKit is used, so the product owner can tell
whether orgs are getting value. Only the owner can see it, at
[`/owner/usage`](routes.md).

It stores **counts only**: nothing about individual members, no page views, no
third-party analytics.

## What a week is

Monday 00:00 to Sunday 23:59:59, **UTC**. The page shows the last 4 completed
weeks, newest first. The current, unfinished week is never shown.

## What is counted

| Figure | Meaning |
|---|---|
| Active orgs | Orgs that, in that week, had an event created, a check-in, a dues reminder sent, or a dues payment verified, rejected or undone |
| Inactive orgs | Every other org that existed by the end of that week. An org with no activity is **counted as inactive, not left out**, so active plus inactive is always the number of orgs that existed |
| Events | Events created that week (any status) |
| Check-ins | Attendance records made that week, by QR or by an officer |
| Active officers | Distinct officers who did one of the actions above (created an event, marked attendance, sent a reminder, reviewed a payment) |

An org created after a week ended is not counted in that week.

"Active officer" is based on **actions**, not sign-ins: the app keeps only each
officer's latest sign-in time, so it cannot say who signed in during a past
week. A QR check-in has no officer, so it counts as org activity but adds no
officer.

## How it runs

Everything is in the database
([`20261121120000_t3_weekly_usage_metrics.sql`](../supabase/migrations/20261121120000_t3_weekly_usage_metrics.sql)).

- `usage_weekly`: one row per week.
- `usage_report_runs`: one row per week, recording whether producing it
  succeeded or failed.
- `run_weekly_usage_report()`: makes sure each of the last 4 completed weeks has
  a row. The first run fills in the past weeks from existing data, so the page
  has numbers on day one. Running it again changes nothing.
- `get_usage_report()`: what the page calls. It refuses anyone who is not a
  platform owner.

Two `pg_cron` jobs call `run_weekly_usage_report()` (scheduled by
[`20261121120100_t3_schedule_weekly_usage_report.sql`](../supabase/migrations/20261121120100_t3_schedule_weekly_usage_report.sql)):

| Job | When |
|---|---|
| `t3-weekly-usage-report` | Mondays 01:00 UTC, just after a week ends |
| `t3-weekly-usage-report-retry` | Every hour at :05, to retry a week that failed |

### When a run fails

A failed week is **recorded, not skipped**: the status, the error message, the
number of attempts and the next retry time are kept in `usage_report_runs`. The
hourly job retries it once its time has come: after 15 minutes, then 30, 60,
and so on. One failing week never stops the others from being produced. After 5
attempts it stops retrying by itself; the page then says so ("Report failed
after 5 attempts. It will not retry on its own."). Fix the cause, then run it by
hand (below): a week that is still failed and out of attempts is retried only
after you set `attempts` back below 5.

The page shows a failed week with its attempt count, so a gap is never silent.

## Who is the owner

Whoever is listed in `platform_owners`. Nobody can add themselves: the table
has no access from the app. Add the owner once, as the database owner (SQL
editor), after they have signed in once:

```sql
insert into public.platform_owners (officer_id)
select id from public.officers where email = 'owner@example.com';
```

Remove with a `delete` on the same table. An org admin is **not** an owner.
Everyone who is not the owner, including signed-in admins, gets a 404 at
`/owner/usage`, and the database function refuses them too.

## Checking it

```sql
-- Are the two jobs scheduled? (needs pg_cron)
select jobname, schedule from cron.job where jobname like 't3-%';

-- Produce the report now, then look at it
select public.run_weekly_usage_report();
select * from public.usage_weekly order by week_start desc;

-- Any failed weeks?
select * from public.usage_report_runs where status = 'failed';

-- Let a week that ran out of attempts try again
update public.usage_report_runs set attempts = 1, next_retry_at = now() where week_start = '2026-11-09';
select public.run_weekly_usage_report();
```

Without `pg_cron` (for example a plain local Postgres) the migration only prints
a notice and nothing is scheduled; run the function by hand as above.

## Out of scope

Tracking individual members or page views, third-party analytics tools, and
real-time dashboards.
