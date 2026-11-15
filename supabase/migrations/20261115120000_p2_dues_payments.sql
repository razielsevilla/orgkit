-- P2: Submit GCash Reference with Screenshot
-- Schema updates for dues_periods pay link, dues_payments table, partial unique indexes, RLS, and security definer functions.

-- 1. Add pay_token and pay_link_active to public.dues_periods
alter table public.dues_periods
  add column if not exists pay_token text unique default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  add column if not exists pay_link_active boolean not null default true;

-- Backfill any existing rows where pay_token might be null
update public.dues_periods
   set pay_token = replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
 where pay_token is null;

create index if not exists dues_periods_pay_token_active_idx
  on public.dues_periods (pay_token)
  where (pay_link_active and status = 'open');

-- 2. Create public.dues_payments table
create table if not exists public.dues_payments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  period_id uuid not null references public.dues_periods(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  amount numeric(10,2) not null check (amount > 0 and amount <= 100000.00 and scale(amount) <= 2),
  reference_no text not null check (char_length(trim(reference_no)) between 4 and 50),
  reference_key text not null,
  screenshot_path text not null,
  status text not null default 'submitted' check (status in ('submitted', 'verified', 'rejected')),
  reject_reason text null,
  submitted_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz null
);

-- Indexes for performance and lookup
create index if not exists dues_payments_org_period_idx
  on public.dues_payments (org_id, period_id, submitted_at desc);

create index if not exists dues_payments_member_idx
  on public.dues_payments (member_id);

-- Partial Unique Index 1: Exactly one Submitted or Verified payment per member per period.
-- Rejected payments do not block a subsequent submission.
create unique index if not exists dues_payments_active_member_period_idx
  on public.dues_payments (period_id, member_id)
  where (status in ('submitted', 'verified'));

-- Partial Unique Index 2: Exactly one non-rejected payment per reference in the organization.
-- Normalizes spaces and casing via reference_key.
create unique index if not exists dues_payments_org_reference_key_idx
  on public.dues_payments (org_id, reference_key)
  where (status in ('submitted', 'verified'));

-- 3. Row Level Security for public.dues_payments
alter table public.dues_payments enable row level security;

drop policy if exists "Officers can read dues payments in their org" on public.dues_payments;
create policy "Officers can read dues payments in their org"
  on public.dues_payments
  for select
  to authenticated
  using (public.is_org_member(org_id));

-- Direct writes (insert, update, delete) are prohibited from the client API.
revoke insert, update, delete on public.dues_payments from public, anon, authenticated;
grant select on public.dues_payments to authenticated;
grant all on public.dues_payments to service_role;

-- 4. Storage Bucket Setup (for Supabase projects where storage schema is present)
do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public)
    values ('dues-screenshots', 'dues-screenshots', false)
    on conflict (id) do update set public = false;
  end if;
end $$;

-- 5. Security Definer Function: get_dues_period_pay_link
-- Allows officers of the org to retrieve pay link information for an open period.
-- If the period was created earlier without a token, a token is generated and persisted.
create or replace function public.get_dues_period_pay_link(
  p_org_id uuid,
  p_period_id uuid
)
returns table (
  period_id uuid,
  pay_token text,
  pay_link_active boolean,
  status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token text;
  v_status text;
begin
  if not public.is_org_member(p_org_id) then
    raise exception 'not_authorized';
  end if;

  select p.pay_token, p.status into v_token, v_status
  from public.dues_periods p
  where p.id = p_period_id and p.org_id = p_org_id;

  if v_status is null then
    raise exception 'not_found';
  end if;

  -- Ensure token exists if null
  if v_token is null then
    v_token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
    update public.dues_periods
       set pay_token = v_token
     where id = p_period_id and org_id = p_org_id;
  end if;

  return query
  select
    p.id as period_id,
    p.pay_token,
    p.pay_link_active,
    p.status
  from public.dues_periods p
  where p.id = p_period_id
    and p.org_id = p_org_id;
end;
$$;

revoke all on function public.get_dues_period_pay_link(uuid, uuid) from public, anon;
grant execute on function public.get_dues_period_pay_link(uuid, uuid) to authenticated;
grant execute on function public.get_dues_period_pay_link(uuid, uuid) to service_role;

-- 6. Security Definer Function: set_dues_pay_link
-- Officers can turn link on ('on'), off ('off'), or rotate/regenerate ('rotate').
create or replace function public.set_dues_pay_link(
  p_org_id uuid,
  p_period_id uuid,
  p_action text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_token text;
  v_current_status text;
begin
  if not public.is_org_member(p_org_id) then
    raise exception 'not_authorized';
  end if;

  if p_action not in ('on', 'off', 'rotate') then
    raise exception 'invalid_action';
  end if;

  select status into v_current_status
  from public.dues_periods
  where id = p_period_id and org_id = p_org_id
  for update;

  if v_current_status is null then
    raise exception 'not_found';
  end if;

  if v_current_status = 'closed' then
    raise exception 'period_closed';
  end if;

  if p_action = 'off' then
    update public.dues_periods
       set pay_link_active = false,
           updated_at = now()
     where id = p_period_id and org_id = p_org_id;
    return null;
  elsif p_action = 'on' then
    update public.dues_periods
       set pay_link_active = true,
           pay_token = coalesce(pay_token, replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')),
           updated_at = now()
     where id = p_period_id and org_id = p_org_id;
    select pay_token into v_new_token
    from public.dues_periods
    where id = p_period_id;
    return v_new_token;
  elsif p_action = 'rotate' then
    v_new_token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
    update public.dues_periods
       set pay_token = v_new_token,
           pay_link_active = true,
           updated_at = now()
     where id = p_period_id and org_id = p_org_id;
    return v_new_token;
  end if;

  return null;
end;
$$;

revoke all on function public.set_dues_pay_link(uuid, uuid, text) from public, anon;
grant execute on function public.set_dues_pay_link(uuid, uuid, text) to authenticated;
grant execute on function public.set_dues_pay_link(uuid, uuid, text) to service_role;

-- 7. Update create_dues_period to generate pay_token on creation
create or replace function public.create_dues_period(
  p_org_id uuid,
  p_name text,
  p_amount numeric,
  p_due_on date
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid;
  new_id uuid;
  new_pay_token text;
begin
  caller_id := auth.uid();
  if caller_id is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_org_member(p_org_id) then
    raise exception 'Not permitted to create dues periods for this organization';
  end if;

  if p_name is null or char_length(trim(p_name)) < 2 or char_length(trim(p_name)) > 100 then
    raise exception 'Name must be between 2 and 100 characters';
  end if;

  if p_amount is null or p_amount <= 0 or p_amount > 100000.00 or scale(p_amount) > 2 then
    raise exception 'Amount must be above 0 and at most 100,000 with up to 2 decimal places';
  end if;

  if p_due_on is null then
    raise exception 'Due date is required';
  end if;

  new_pay_token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');

  insert into public.dues_periods (
    org_id,
    name,
    amount,
    due_on,
    status,
    created_by,
    pay_token,
    pay_link_active
  ) values (
    p_org_id,
    trim(p_name),
    p_amount,
    p_due_on,
    'open',
    caller_id,
    new_pay_token,
    true
  ) returning id into new_id;

  return new_id;
end;
$$;

revoke all on function public.create_dues_period(uuid, text, numeric, date) from public;
grant execute on function public.create_dues_period(uuid, text, numeric, date) to authenticated;

-- 7. Security Definer Function: get_dues_pay_info
-- Server-only function called by /pay/:token to get org, period, amount and due date.
create or replace function public.get_dues_pay_info(p_pay_token text)
returns table (
  org_id uuid,
  org_name text,
  period_id uuid,
  period_name text,
  amount numeric,
  due_on date,
  pay_link_active boolean,
  period_status text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    p.org_id,
    o.name as org_name,
    p.id as period_id,
    p.name as period_name,
    p.amount,
    p.due_on,
    p.pay_link_active,
    p.status as period_status
  from public.dues_periods p
  join public.orgs o on o.id = p.org_id
  where p.pay_token = p_pay_token;
end;
$$;

revoke all on function public.get_dues_pay_info(text) from public, anon, authenticated;
grant execute on function public.get_dues_pay_info(text) to service_role;

-- 8. Security Definer Function: submit_dues_payment
-- Server-only function that executes with service_role after rate limit & screenshot upload.
create or replace function public.submit_dues_payment(
  p_pay_token text,
  p_email text,
  p_reference_no text,
  p_screenshot_path text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period record;
  v_member record;
  v_clean_email_key text;
  v_clean_ref_key text;
  v_clean_ref text;
  v_new_payment_id uuid;
begin
  if p_pay_token is null or trim(p_pay_token) = '' then
    raise exception 'invalid_or_closed_period';
  end if;

  -- 1. Validate period
  select id, org_id, amount, status, pay_link_active
    into v_period
    from public.dues_periods
   where pay_token = trim(p_pay_token);

  if v_period.id is null or not v_period.pay_link_active or v_period.status <> 'open' then
    raise exception 'invalid_or_closed_period';
  end if;

  -- 2. Validate email & active membership in the org
  if p_email is null or trim(p_email) = '' then
    raise exception 'member_not_eligible';
  end if;

  v_clean_email_key := lower(trim(p_email));

  select id, org_id, status
    into v_member
    from public.members
   where org_id = v_period.org_id
     and email_key = v_clean_email_key;

  if v_member.id is null or v_member.status <> 'active' then
    raise exception 'member_not_eligible';
  end if;

  -- 3. Validate reference number
  v_clean_ref := trim(p_reference_no);
  if v_clean_ref is null or char_length(v_clean_ref) < 4 or char_length(v_clean_ref) > 50 then
    raise exception 'invalid_reference_number';
  end if;

  -- Strip all whitespace and lowercase for uniqueness key
  v_clean_ref_key := lower(regexp_replace(v_clean_ref, '\s+', '', 'g'));

  -- 4. Validate screenshot path
  if p_screenshot_path is null or trim(p_screenshot_path) = '' then
    raise exception 'missing_screenshot';
  end if;

  -- 5. Check if member already has active submission for this period
  if exists (
    select 1
      from public.dues_payments
     where period_id = v_period.id
       and member_id = v_member.id
       and status in ('submitted', 'verified')
  ) then
    raise exception 'already_submitted';
  end if;

  -- 6. Check if reference number already used across non-rejected payments in org
  if exists (
    select 1
      from public.dues_payments
     where org_id = v_period.org_id
       and reference_key = v_clean_ref_key
       and status in ('submitted', 'verified')
  ) then
    raise exception 'reference_already_used';
  end if;

  -- 7. Insert payment record (amount copied from dues_periods to preserve history)
  insert into public.dues_payments (
    org_id,
    period_id,
    member_id,
    amount,
    reference_no,
    reference_key,
    screenshot_path,
    status,
    submitted_at
  ) values (
    v_period.org_id,
    v_period.id,
    v_member.id,
    v_period.amount,
    v_clean_ref,
    v_clean_ref_key,
    trim(p_screenshot_path),
    'submitted',
    now()
  )
  returning id into v_new_payment_id;

  return v_new_payment_id;
end;
$$;

revoke all on function public.submit_dues_payment(text, text, text, text) from public, anon, authenticated;
grant execute on function public.submit_dues_payment(text, text, text, text) to service_role;
