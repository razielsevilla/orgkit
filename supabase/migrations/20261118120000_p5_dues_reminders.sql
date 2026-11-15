-- P5: Payment Reminders
-- 1. Create dues_reminders log table to track sent, failed, bounced, or skipped reminders
-- and enforce the 24-hour cooldown rule.

create table if not exists public.dues_reminders (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  period_id uuid not null references public.dues_periods(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  sent_by uuid not null references auth.users(id) on delete cascade,
  sent_at timestamptz not null default now(),
  status text not null check (status in ('sent', 'failed', 'bounced', 'skipped')),
  error_message text null
);

-- Indexes for efficient recipient checking, cooldown queries, and status filtering
create index if not exists dues_reminders_org_period_idx
  on public.dues_reminders (org_id, period_id);

create index if not exists dues_reminders_cooldown_idx
  on public.dues_reminders (org_id, period_id, member_id, sent_at desc);

create index if not exists dues_reminders_period_status_idx
  on public.dues_reminders (period_id, status);

-- 2. Row Level Security for dues_reminders
alter table public.dues_reminders enable row level security;

drop policy if exists "Officers can read dues reminders in their org" on public.dues_reminders;
create policy "Officers can read dues reminders in their org"
  on public.dues_reminders
  for select
  to authenticated
  using (public.is_org_member(org_id));

-- Direct client insert, update, and delete are prohibited.
revoke insert, update, delete on public.dues_reminders from public, anon, authenticated;
grant select on public.dues_reminders to authenticated;
grant all on public.dues_reminders to service_role;

-- 3. Security Definer Function: get_dues_reminder_recipients
-- Gathers period details, counts, and recipient evaluations (Paid, Pending, Unpaid, and 24h cooldown).
create or replace function public.get_dues_reminder_recipients(
  p_period_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid;
  v_period record;
  v_org_name text;
  v_result jsonb;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'not_authenticated';
  end if;

  select p.id, p.org_id, p.name, p.amount, p.due_on, p.status, p.pay_token
    into v_period
    from public.dues_periods p
   where p.id = p_period_id;

  if v_period.id is null then
    raise exception 'period_not_found';
  end if;

  if not public.is_org_member(v_period.org_id) then
    raise exception 'not_authorized';
  end if;

  select o.name into v_org_name
    from public.orgs o
   where o.id = v_period.org_id;

  with period_payments as (
    -- Primary payment status per member (verified > submitted > rejected)
    select distinct on (p.member_id)
      p.member_id,
      p.status as payment_status
      from public.dues_payments p
     where p.period_id = p_period_id
       and p.org_id = v_period.org_id
     order by p.member_id,
       case p.status
         when 'verified' then 1
         when 'submitted' then 2
         when 'rejected' then 3
         else 4
       end asc,
       p.submitted_at desc
  ),
  member_evaluations as (
    select
      m.id as member_id,
      m.full_name,
      m.email,
      case
        when pp.payment_status = 'verified' then 'paid'
        when pp.payment_status = 'submitted' then 'pending'
        else 'unpaid'
      end as dues_status,
      lr.sent_at as last_reminded_at,
      case
        when lr.sent_at is not null and lr.sent_at > (now() - interval '24 hours') then true
        else false
      end as is_recently_reminded
    from public.members m
    left join period_payments pp on pp.member_id = m.id
    left join lateral (
      select r.sent_at
        from public.dues_reminders r
       where r.org_id = v_period.org_id
         and r.period_id = p_period_id
         and r.member_id = m.id
         and r.status = 'sent'
         and r.sent_at > (now() - interval '24 hours')
       order by r.sent_at desc
       limit 1
    ) lr on true
    where m.org_id = v_period.org_id
      and m.status = 'active'
  ),
  filtered_recipients as (
    select
      me.member_id,
      me.full_name,
      me.email,
      me.dues_status,
      (me.dues_status = 'unpaid' and not me.is_recently_reminded) as is_eligible,
      case
        when me.dues_status = 'paid' then 'paid'
        when me.dues_status = 'pending' then 'pending'
        when me.is_recently_reminded then 'recently_reminded'
        else null
      end as skip_reason,
      me.last_reminded_at
    from member_evaluations me
  )
  select jsonb_build_object(
    'period', jsonb_build_object(
      'id', v_period.id,
      'org_id', v_period.org_id,
      'org_name', coalesce(v_org_name, 'Organization'),
      'period_name', v_period.name,
      'amount', v_period.amount,
      'due_on', v_period.due_on,
      'pay_token', v_period.pay_token,
      'status', v_period.status,
      'is_closed', (v_period.status = 'closed')
    ),
    'counts', jsonb_build_object(
      'total_active_members', (select count(*)::int from member_evaluations),
      'total_unpaid', (select count(*)::int from member_evaluations where dues_status = 'unpaid'),
      'eligible', (select count(*)::int from filtered_recipients where is_eligible = true),
      'skipped_24h', (select count(*)::int from filtered_recipients where skip_reason = 'recently_reminded'),
      'paid_or_pending', (select count(*)::int from member_evaluations where dues_status in ('paid', 'pending'))
    ),
    'recipients', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'member_id', fr.member_id,
          'full_name', fr.full_name,
          'email', fr.email,
          'is_eligible', fr.is_eligible,
          'skip_reason', fr.skip_reason,
          'last_reminded_at', fr.last_reminded_at
        )
        order by fr.is_eligible desc, fr.full_name asc
      )
      from filtered_recipients fr
      where fr.dues_status = 'unpaid' or fr.is_eligible = true
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.get_dues_reminder_recipients(uuid) from public, anon;
grant execute on function public.get_dues_reminder_recipients(uuid) to authenticated;
grant execute on function public.get_dues_reminder_recipients(uuid) to service_role;
