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
