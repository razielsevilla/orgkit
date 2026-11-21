-- P4: Dues Status Dashboard
-- 1. Index on dues_payments for status-based dashboard filtering and counting
create index if not exists dues_payments_org_period_status_idx
  on public.dues_payments (org_id, period_id, status);

create index if not exists dues_payments_period_member_status_idx
  on public.dues_payments (period_id, member_id, status);

-- 2. Security Definer Function: get_dues_period_dashboard
-- Aggregates metrics (collected, expected, outstanding, status counts) and returns paged member dues records.
create or replace function public.get_dues_period_dashboard(
  p_period_id uuid,
  p_search text default null,
  p_status text default null,
  p_page int default 1,
  p_page_size int default 20
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid;
  v_period record;
  v_page int;
  v_page_size int;
  v_offset int;
  v_result jsonb;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'not_authenticated';
  end if;

  select id, org_id, name, amount, due_on, status, pay_token, pay_link_active
    into v_period
    from public.dues_periods
   where id = p_period_id;

  if v_period.id is null then
    raise exception 'period_not_found';
  end if;

  if not public.is_org_member(v_period.org_id) then
    raise exception 'not_authorized';
  end if;

  v_page := coalesce(p_page, 1);
  if v_page < 1 then
    v_page := 1;
  end if;

  v_page_size := coalesce(p_page_size, 20);
  if v_page_size < 1 then
    v_page_size := 20;
  elsif v_page_size > 100 then
    v_page_size := 100;
  end if;

  v_offset := (v_page - 1) * v_page_size;

  with period_payments as (
    -- For each member, find their primary payment for this period:
    -- Verified > Submitted > Rejected (latest by submitted_at)
    select distinct on (p.member_id)
      p.id as payment_id,
      p.member_id,
      p.amount,
      p.reference_no,
      p.status as payment_status,
      p.reject_reason,
      p.submitted_at,
      p.reviewed_at
    from public.dues_payments p
    where p.period_id = p_period_id
    order by p.member_id,
      case p.status
        when 'verified' then 1
        when 'submitted' then 2
        when 'rejected' then 3
        else 4
      end,
      p.submitted_at desc,
      p.id desc
  ),
  candidate_members as (
    -- Include:
    -- 1. All active members of the organization
    -- 2. Non-active members who made a payment for this period
    select
      m.id as member_id,
      m.full_name,
      m.email,
      m.email_key,
      m.status as member_status,
      m.created_at as member_created_at,
      pp.payment_id,
      pp.amount as payment_amount,
      pp.reference_no,
      pp.payment_status,
      pp.reject_reason,
      pp.submitted_at,
      pp.reviewed_at,
      case
        when pp.payment_status = 'verified' then 'paid'
        when pp.payment_status = 'submitted' then 'pending'
        when pp.payment_status = 'rejected' then 'rejected'
        else 'unpaid'
      end as dues_status
    from public.members m
    left join period_payments pp on pp.member_id = m.id
    where m.org_id = v_period.org_id
      and (m.status = 'active' or pp.payment_id is not null)
  ),
  summary_metrics as (
    select
      coalesce(count(*) filter (where member_status = 'active'), 0) as active_member_count,
      coalesce(count(*), 0) as total_member_count,
      coalesce(count(*) filter (where dues_status = 'paid'), 0) as paid_count,
      coalesce(count(*) filter (where dues_status = 'pending'), 0) as pending_count,
      coalesce(count(*) filter (where dues_status = 'rejected'), 0) as rejected_count,
      coalesce(count(*) filter (where dues_status = 'unpaid'), 0) as unpaid_count,
      -- Collected: verified payments only (including verified payments by deactivated members)
      coalesce(sum(payment_amount) filter (where payment_status = 'verified'), 0.00)::numeric(10,2) as collected_amount,
      -- Expected: active members * period amount
      (coalesce(count(*) filter (where member_status = 'active'), 0) * v_period.amount)::numeric(10,2) as expected_amount,
      -- Outstanding: active members who owe (unpaid, pending, or rejected) * period amount
      (coalesce(count(*) filter (where member_status = 'active' and dues_status in ('unpaid', 'pending', 'rejected')), 0) * v_period.amount)::numeric(10,2) as outstanding_amount
    from candidate_members
  ),
  filtered_members as (
    select *
    from candidate_members cm
    where (
      p_status is null
      or trim(p_status) = ''
      or lower(trim(p_status)) = 'all'
      or cm.dues_status = lower(trim(p_status))
    )
    and (
      p_search is null
      or trim(p_search) = ''
      or cm.full_name ilike '%' || trim(p_search) || '%'
      or cm.email ilike '%' || trim(p_search) || '%'
    )
  ),
  paged_members as (
    select
      member_id,
      full_name,
      email,
      member_status,
      dues_status,
      payment_id,
      payment_amount,
      reference_no,
      payment_status,
      reject_reason,
      submitted_at,
      reviewed_at
    from filtered_members
    order by full_name asc, member_id asc
    limit v_page_size offset v_offset
  ),
  filtered_count as (
    select count(*) as total_matching from filtered_members
  )
  select jsonb_build_object(
    'period', jsonb_build_object(
      'id', v_period.id,
      'org_id', v_period.org_id,
      'name', v_period.name,
      'amount', v_period.amount,
      'due_on', v_period.due_on,
      'status', v_period.status,
      'pay_token', v_period.pay_token,
      'pay_link_active', v_period.pay_link_active
    ),
    'summary', jsonb_build_object(
      'collected_amount', sm.collected_amount,
      'expected_amount', sm.expected_amount,
      'outstanding_amount', sm.outstanding_amount,
      'paid_count', sm.paid_count,
      'pending_count', sm.pending_count,
      'rejected_count', sm.rejected_count,
      'unpaid_count', sm.unpaid_count,
      'active_member_count', sm.active_member_count,
      'total_member_count', sm.total_member_count
    ),
    'members', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'member_id', pm.member_id,
          'full_name', pm.full_name,
          'email', pm.email,
          'member_status', pm.member_status,
          'dues_status', pm.dues_status,
          'payment_id', pm.payment_id,
          'amount', pm.payment_amount,
          'reference_no', pm.reference_no,
          'payment_status', pm.payment_status,
          'reject_reason', pm.reject_reason,
          'submitted_at', pm.submitted_at,
          'reviewed_at', pm.reviewed_at
        )
      )
      from paged_members pm
    ), '[]'::jsonb),
    'pagination', jsonb_build_object(
      'page', v_page,
      'page_size', v_page_size,
      'total_matching', fc.total_matching,
      'total_pages', case
        when fc.total_matching = 0 then 0
        else ceil(fc.total_matching::numeric / v_page_size)::int
      end
    )
  )
  into v_result
  from summary_metrics sm
  cross join filtered_count fc;

  return v_result;
end;
$$;

revoke all on function public.get_dues_period_dashboard(uuid, text, text, int, int) from public, anon;
grant execute on function public.get_dues_period_dashboard(uuid, text, text, int, int) to authenticated;
