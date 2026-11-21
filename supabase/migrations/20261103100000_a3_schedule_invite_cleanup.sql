-- A3: delete invite rows 30 days after they are used, revoked or expired.
-- cleanup_expired_invites() was defined in 20261102120000_a3_invite_officers.sql
-- but nothing ran it. This schedules it daily with pg_cron.
--
-- pg_cron is a Supabase extension (Database > Extensions). Where it is not
-- available, such as a plain local Postgres, this migration only prints a
-- notice, so it never blocks the other migrations. Enable the extension and
-- re-run this file to turn the schedule on.

do $$
begin
  if not exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    raise notice 'pg_cron is not available: invite cleanup is NOT scheduled. Enable pg_cron and re-run this migration.';
    return;
  end if;

  create extension if not exists pg_cron;

  -- Re-running replaces the job instead of stacking a second one
  perform cron.unschedule(jobid)
  from cron.job
  where jobname = 'a3-cleanup-expired-invites';

  perform cron.schedule(
    'a3-cleanup-expired-invites',
    '0 3 * * *',  -- every day at 03:00 UTC
    $job$select public.cleanup_expired_invites()$job$
  );
end
$$;
