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

-- 3. Security Definer Function: reject_dues_payment
-- Marks a submitted payment as rejected with a mandatory reason.
-- Allows the member to subsequently submit a corrected payment.
create or replace function public.reject_dues_payment(
  p_payment_id uuid,
  p_reason text
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
  v_clean_reason text;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'not_authenticated';
  end if;

  v_clean_reason := trim(p_reason);
  if v_clean_reason is null or char_length(v_clean_reason) < 3 then
    raise exception 'reason_required';
  end if;

  if char_length(v_clean_reason) > 500 then
    raise exception 'reason_too_long';
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

  -- Self-review guard: Officer cannot reject their own payment
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

  -- Atomic transition from submitted -> rejected
  update public.dues_payments
     set status = 'rejected',
         reject_reason = v_clean_reason,
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
    'rejected',
    v_caller_id,
    v_clean_reason,
    now()
  );
end;
$$;

revoke all on function public.reject_dues_payment(uuid, text) from public, anon;
grant execute on function public.reject_dues_payment(uuid, text) to authenticated;

-- 4. Security Definer Function: undo_dues_payment_verification
-- Allows an org admin to reverse a verified payment back to submitted with an audit reason.
create or replace function public.undo_dues_payment_verification(
  p_payment_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid;
  v_payment record;
  v_clean_reason text;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'not_authenticated';
  end if;

  v_clean_reason := trim(p_reason);
  if v_clean_reason is null or char_length(v_clean_reason) < 3 then
    raise exception 'reason_required';
  end if;

  if char_length(v_clean_reason) > 500 then
    raise exception 'reason_too_long';
  end if;

  select id, org_id, member_id, status
    into v_payment
    from public.dues_payments
   where id = p_payment_id;

  if v_payment.id is null then
    raise exception 'payment_not_found';
  end if;

  if not public.is_org_admin(v_payment.org_id) then
    raise exception 'admin_only';
  end if;

  -- Atomic transition from verified -> submitted
  update public.dues_payments
     set status = 'submitted',
         reviewed_by = null,
         reviewed_at = null
   where id = p_payment_id
     and status = 'verified';

  if not found then
    raise exception 'invalid_status_transition';
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
    'undone',
    v_caller_id,
    v_clean_reason,
    now()
  );
end;
$$;

revoke all on function public.undo_dues_payment_verification(uuid, text) from public, anon;
grant execute on function public.undo_dues_payment_verification(uuid, text) to authenticated;

-- 5. Security Definer Function: get_dues_review_queue
-- Returns submitted payments for a period ordered oldest first with member details.
create or replace function public.get_dues_review_queue(
  p_org_id uuid,
  p_period_id uuid
)
returns table (
  payment_id uuid,
  member_id uuid,
  member_name text,
  member_email text,
  amount numeric,
  reference_no text,
  screenshot_path text,
  submitted_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_org_member(p_org_id) then
    raise exception 'not_authorized';
  end if;

  return query
  select
    p.id as payment_id,
    p.member_id,
    m.full_name as member_name,
    m.email as member_email,
    p.amount,
    p.reference_no,
    p.screenshot_path,
    p.submitted_at
  from public.dues_payments p
  join public.members m on m.id = p.member_id
  where p.org_id = p_org_id
    and p.period_id = p_period_id
    and p.status = 'submitted'
  order by p.submitted_at asc, p.id asc;
end;
$$;

revoke all on function public.get_dues_review_queue(uuid, uuid) from public, anon;
grant execute on function public.get_dues_review_queue(uuid, uuid) to authenticated;




