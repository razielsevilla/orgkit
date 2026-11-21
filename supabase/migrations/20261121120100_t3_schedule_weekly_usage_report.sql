-- T3: run the weekly usage report on a schedule.
--
-- Two jobs call the same function, run_weekly_usage_report():
--   t3-weekly-usage-report        Mondays 01:00 UTC, when a week has just ended
--   t3-weekly-usage-report-retry  every hour, to retry a week that failed
-- The function only does work for a week that has no snapshot yet and whose
-- retry time has passed, so the hourly run costs almost nothing.
--
-- pg_cron is a Supabase extension (Database > Extensions). Where it is not
-- available, such as a plain local Postgres, this migration only prints a
-- notice and never blocks the other migrations. Enable the extension and
-- re-run this file to turn the schedule on. Until then an owner can run
--   select public.run_weekly_usage_report();
-- by hand as the database owner.

do $$
begin
  if not exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    raise notice 'pg_cron is not available: the weekly usage report is NOT scheduled. Enable pg_cron and re-run this migration.';
    return;
  end if;

  create extension if not exists pg_cron;

  -- Re-running replaces the jobs instead of stacking duplicates
  perform cron.unschedule(jobid)
  from cron.job
  where jobname in ('t3-weekly-usage-report', 't3-weekly-usage-report-retry');

  perform cron.schedule(
    't3-weekly-usage-report',
    '0 1 * * 1',  -- Mondays at 01:00 UTC
    $job$select public.run_weekly_usage_report()$job$
  );

  perform cron.schedule(
    't3-weekly-usage-report-retry',
    '5 * * * *',  -- every hour at :05
    $job$select public.run_weekly_usage_report()$job$
  );
end
$$;
