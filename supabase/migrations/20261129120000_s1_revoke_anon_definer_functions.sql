-- S1: security hardening. Close SECURITY DEFINER functions to signed-out callers.
--
-- The problem: Supabase's default privileges grant EXECUTE on every new function in
-- `public` directly to anon, authenticated and service_role. Several migrations ran
-- `revoke all on function ... from public`, which does NOT remove anon's own grant, so
-- these functions stayed callable with just the public anon key (the one every browser
-- holds), through PostgREST's /rpc endpoint:
--
--   confirm_member, get_org_join_link            (R1: no revoke at all)
--   accept_invite, change_role, create_invite,
--   remove_officer, revoke_invite                (A3)
--   cleanup_expired_invites                      (A3)
--   is_org_member                                (A2)
--   create_dues_period, update_dues_period,
--   close_dues_period                            (P1/P2)
--   transfer_admin_rights                        (H5)
--
-- Impact before this migration: every one of them except cleanup_expired_invites raises
-- 'Not authenticated' when auth.uid() is null, so no data was readable or writable by a
-- signed-out caller. cleanup_expired_invites has no caller check at all, so anyone could
-- run the scheduled retention cleanup early (it only deletes invites already more than
-- 30 days past expiry, which the schedule removes anyway). Low severity, but the grants
-- should not depend on every function body remembering to check.
--
-- Fix: revoke from anon and PUBLIC. Signed-in officers (authenticated) and the server
-- (service_role) keep exactly the access they had. The functions behind the public join,
-- check-in and pay pages are granted to service_role only and are unaffected.
--
-- Safe to run twice.

revoke all on function public.confirm_member(uuid) from public, anon;
revoke all on function public.get_org_join_link(uuid) from public, anon;

revoke all on function public.accept_invite(text) from public, anon;
revoke all on function public.change_role(uuid, text) from public, anon;
revoke all on function public.create_invite(uuid, text, text, text, text) from public, anon;
revoke all on function public.remove_officer(uuid) from public, anon;
revoke all on function public.revoke_invite(uuid) from public, anon;
revoke all on function public.cleanup_expired_invites() from public, anon;

revoke all on function public.is_org_member(uuid) from public, anon;

revoke all on function public.create_dues_period(uuid, text, numeric, date) from public, anon;
revoke all on function public.update_dues_period(uuid, text, numeric, date) from public, anon;
revoke all on function public.close_dues_period(uuid) from public, anon;

revoke all on function public.transfer_admin_rights(uuid, uuid, text) from public, anon;
