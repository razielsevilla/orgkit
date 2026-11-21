-- R3: delete expired member invitations daily, so the stored name and email
-- are removed once the 60 days are up. Same approach as the A3 schedule.
--
-- pg_cron is a Supabase extension (Database > Extensions). Where it is not
-- available, such as a plain local Postgres, this migration only prints a
-- notice, so it never blocks the other migrations. The Members page also runs
-- the cleanup when an admin opens it. Enable the extension and re-run this
-- file to turn the schedule on.

do $$
begin
  if not exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    raise notice 'pg_cron is not available: member invitation cleanup is NOT scheduled. Enable pg_cron and re-run this migration.';
    return;
  end if;

  create extension if not exists pg_cron;

  -- Re-running replaces the job instead of stacking a second one
  perform cron.unschedule(jobid)
  from cron.job
  where jobname = 'r3-cleanup-expired-member-invites';

  perform cron.schedule(
    'r3-cleanup-expired-member-invites',
    '15 3 * * *',  -- every day at 03:15 UTC
    $job$select public.cleanup_expired_member_invites()$job$
  );
end
$$;
