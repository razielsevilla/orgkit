-- H4: Handover guide template
-- Allows outgoing officers to fill in a handover guide for their successor,
-- linking key stored documents (from H2), with editing locked once finalized
-- unless reopened by an organization admin.

-- 1. Table: handover_guides
create table if not exists public.handover_guides (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  term_id uuid references public.officer_terms (id) on delete set null,
  role_title text not null,
  status text not null default 'draft',
  sections jsonb not null default '{}'::jsonb,
  author_id uuid references auth.users (id) on delete set null,
  finalized_by uuid references auth.users (id) on delete set null,
  finalized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Constraints
alter table public.handover_guides drop constraint if exists handover_guides_role_title_length;
alter table public.handover_guides
  add constraint handover_guides_role_title_length check (char_length(btrim(role_title)) between 2 and 100);

alter table public.handover_guides drop constraint if exists handover_guides_status_check;
alter table public.handover_guides
  add constraint handover_guides_status_check check (status in ('draft', 'ready'));

-- Indexes
create index if not exists handover_guides_org_role_idx
  on public.handover_guides (org_id, role_title);

create index if not exists handover_guides_org_term_idx
  on public.handover_guides (org_id, term_id);

-- 2. Row Level Security
alter table public.handover_guides enable row level security;

-- Officers can view handover guides in their org
drop policy if exists "Officers can view handover guides in their org" on public.handover_guides;
create policy "Officers can view handover guides in their org"
  on public.handover_guides
  for select
  to authenticated
  using (
    public.is_org_member(org_id)
    and (
      status = 'ready'
      or author_id = auth.uid()
      or public.is_org_admin(org_id)
    )
  );

-- Officers can insert handover guides in their org
drop policy if exists "Officers can create handover guides in their org" on public.handover_guides;
create policy "Officers can create handover guides in their org"
  on public.handover_guides
  for insert
  to authenticated
  with check (public.is_org_member(org_id));

-- Authors and admins can update draft guides; admins can update any guide
drop policy if exists "Authors and admins can update handover guides" on public.handover_guides;
create policy "Authors and admins can update handover guides"
  on public.handover_guides
  for update
  to authenticated
  using (
    public.is_org_member(org_id)
    and (
      (status = 'draft' and author_id = auth.uid())
      or public.is_org_admin(org_id)
    )
  )
  with check (
    public.is_org_member(org_id)
    and (
      (status = 'draft' and author_id = auth.uid())
      or public.is_org_admin(org_id)
    )
  );

-- Admins can delete handover guides
drop policy if exists "Admins can delete handover guides" on public.handover_guides;
create policy "Admins can delete handover guides"
  on public.handover_guides
  for delete
  to authenticated
  using (public.is_org_admin(org_id));

-- Helper function: auto-update updated_at timestamp if not already created
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Trigger: auto-update updated_at timestamp
drop trigger if exists set_handover_guides_updated_at on public.handover_guides;
create trigger set_handover_guides_updated_at
  before update on public.handover_guides
  for each row execute function public.set_updated_at();
