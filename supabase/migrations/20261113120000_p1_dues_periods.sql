-- P1: Dues Periods table, indexes, RLS, and security definer functions

-- 1. Create dues_periods table
create table if not exists public.dues_periods (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 100),
  amount numeric(10,2) not null check (amount > 0 and amount <= 100000.00 and scale(amount) <= 2),
  due_on date not null,
  status text not null default 'open' check (status in ('open', 'closed')),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Indexes for efficient lookup and ordering
create index if not exists dues_periods_org_created_idx
  on public.dues_periods (org_id, created_at desc);

create index if not exists dues_periods_org_status_idx
  on public.dues_periods (org_id, status);

-- 3. Row Level Security: Officers of the org can read dues_periods
alter table public.dues_periods enable row level security;

drop policy if exists "Officers can read dues periods in their org" on public.dues_periods;
create policy "Officers can read dues periods in their org"
  on public.dues_periods
  for select
  to authenticated
  using (public.is_org_member(org_id));

-- Direct writes (insert, update, delete) are prohibited from the client API.
-- All mutations must go through the security definer functions below.
revoke insert, update, delete on public.dues_periods from public, anon, authenticated;

-- 4. Security Definer Function: create_dues_period
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

  insert into public.dues_periods (
    org_id,
    name,
    amount,
    due_on,
    status,
    created_by
  ) values (
    p_org_id,
    trim(p_name),
    p_amount,
    p_due_on,
    'open',
    caller_id
  ) returning id into new_id;

  return new_id;
end;
$$;

revoke all on function public.create_dues_period(uuid, text, numeric, date) from public;
grant execute on function public.create_dues_period(uuid, text, numeric, date) to authenticated;

-- 5. Security Definer Function: update_dues_period
create or replace function public.update_dues_period(
  p_period_id uuid,
  p_name text,
  p_amount numeric,
  p_due_on date
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid;
  period_org uuid;
  period_status text;
begin
  caller_id := auth.uid();
  if caller_id is null then
    raise exception 'Not authenticated';
  end if;

  select org_id, status
    into period_org, period_status
    from public.dues_periods
   where id = p_period_id;

  if period_org is null then
    raise exception 'Dues period not found';
  end if;

  if not public.is_org_member(period_org) then
    raise exception 'Not permitted to update dues periods for this organization';
  end if;

  if period_status = 'closed' then
    raise exception 'Cannot edit closed dues period';
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

  update public.dues_periods
     set name = trim(p_name),
         amount = p_amount,
         due_on = p_due_on,
         updated_at = now()
   where id = p_period_id;

  return 'ok';
end;
$$;

revoke all on function public.update_dues_period(uuid, text, numeric, date) from public;
grant execute on function public.update_dues_period(uuid, text, numeric, date) to authenticated;

-- 6. Security Definer Function: close_dues_period
create or replace function public.close_dues_period(
  p_period_id uuid
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid;
  period_org uuid;
  period_status text;
begin
  caller_id := auth.uid();
  if caller_id is null then
    raise exception 'Not authenticated';
  end if;

  select org_id, status
    into period_org, period_status
    from public.dues_periods
   where id = p_period_id;

  if period_org is null then
    raise exception 'Dues period not found';
  end if;

  if not public.is_org_member(period_org) then
    raise exception 'Not permitted to close dues periods for this organization';
  end if;

  -- Idempotent: if already closed, return ok without error
  if period_status = 'closed' then
    return 'ok';
  end if;

  update public.dues_periods
     set status = 'closed',
         updated_at = now()
   where id = p_period_id;

  return 'ok';
end;
$$;

revoke all on function public.close_dues_period(uuid) from public;
grant execute on function public.close_dues_period(uuid) to authenticated;
