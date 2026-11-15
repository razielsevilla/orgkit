-- P3: Verify or Reject Payment Submission
-- 1. Create dues_payment_events table for audit history of reviews and undos

create table if not exists public.dues_payment_events (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.dues_payments(id) on delete cascade,
  org_id uuid not null references public.orgs(id) on delete cascade,
  action text not null check (action in ('verified', 'rejected', 'undone')),
  actor_id uuid not null references auth.users(id) on delete cascade,
  reason text null,
  created_at timestamptz not null default now()
);

create index if not exists dues_payment_events_payment_idx
  on public.dues_payment_events (payment_id, created_at desc);

create index if not exists dues_payment_events_org_idx
  on public.dues_payment_events (org_id, created_at desc);

-- Row Level Security for dues_payment_events
alter table public.dues_payment_events enable row level security;

drop policy if exists "Officers can read dues payment events in their org" on public.dues_payment_events;
create policy "Officers can read dues payment events in their org"
  on public.dues_payment_events
  for select
  to authenticated
  using (public.is_org_member(org_id));

-- Direct writes (insert, update, delete) are prohibited from the client API.
revoke insert, update, delete on public.dues_payment_events from public, anon, authenticated;
grant select on public.dues_payment_events to authenticated;
grant all on public.dues_payment_events to service_role;

-- 2. Security Definer Function: verify_dues_payment
-- Marks a submitted payment as verified, recording the reviewer and timestamp.
-- Blocks self-review and prevents double-decisions via concurrency check.
create or replace function public.verify_dues_payment(
  p_payment_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid;
  v_caller_email text;
  v_payment record;
  v_member_email_key text;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'not_authenticated';
  end if;

  select id, org_id, member_id, status
    into v_payment
    from public.dues_payments
   where id = p_payment_id;

  if v_payment.id is null then
    raise exception 'payment_not_found';
  end if;

  if not public.is_org_member(v_payment.org_id) then
    raise exception 'not_authorized';
  end if;

  -- Self-review guard: Officer cannot verify their own payment
  select email into v_caller_email
    from public.officers
   where id = v_caller_id;

  select email_key into v_member_email_key
    from public.members
   where id = v_payment.member_id;

  if (v_caller_email is not null and lower(trim(v_caller_email)) = v_member_email_key)
     or (auth.jwt() ->> 'email' is not null and lower(trim(auth.jwt() ->> 'email')) = v_member_email_key) then
    raise exception 'cannot_review_own_payment';
  end if;

  -- Atomic transition from submitted -> verified
  update public.dues_payments
     set status = 'verified',
         reviewed_by = v_caller_id,
         reviewed_at = now()
   where id = p_payment_id
     and status = 'submitted';

  if not found then
    raise exception 'already_reviewed';
  end if;

  -- Record audit event
  insert into public.dues_payment_events (
    payment_id,
    org_id,
    action,
    actor_id,
    reason,
    created_at
  ) values (
    p_payment_id,
    v_payment.org_id,
    'verified',
    v_caller_id,
    null,
    now()
  );
end;
$$;

revoke all on function public.verify_dues_payment(uuid) from public, anon;
grant execute on function public.verify_dues_payment(uuid) to authenticated;

