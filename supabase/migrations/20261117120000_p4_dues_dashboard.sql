-- P4: Dues Status Dashboard
-- 1. Index on dues_payments for status-based dashboard filtering and counting
create index if not exists dues_payments_org_period_status_idx
  on public.dues_payments (org_id, period_id, status);

create index if not exists dues_payments_period_member_status_idx
  on public.dues_payments (period_id, member_id, status);
