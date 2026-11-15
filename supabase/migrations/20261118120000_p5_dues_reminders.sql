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
