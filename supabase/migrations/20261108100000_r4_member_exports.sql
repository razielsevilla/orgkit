-- R4: export the roster to CSV.
--
-- The file itself is made on the server from the admin's own session, so row
-- level security still applies. This migration only adds the audit record of
-- who exported what. Users never write to it directly: the only way in is
-- record_member_export, which checks the caller is an admin of the org.

create table if not exists public.member_exports (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  officer_id uuid not null references public.officers (id) on delete cascade,
  row_count integer not null check (row_count >= 0),
  -- Which fields left the app, e.g. {full_name,email,status}
  fields text[] not null check (cardinality(fields) > 0),
  -- Which member statuses were included
  statuses text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists member_exports_org_created_idx
  on public.member_exports (org_id, created_at desc);

alter table public.member_exports enable row level security;
revoke all on public.member_exports from anon, authenticated;
grant select on public.member_exports to authenticated;

-- Admins of the org can read its export record. No insert, update or delete
-- policies, and no write grants: writes happen only in record_member_export.
drop policy if exists "Admins can read their org exports" on public.member_exports;
create policy "Admins can read their org exports"
  on public.member_exports
  for select
  to authenticated
  using (public.is_org_admin(org_id));

create or replace function public.record_member_export(
  target_org uuid,
  p_fields text[],
  p_statuses text[],
  p_row_count integer
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

  if not public.is_org_admin(target_org) then
    raise exception 'Not permitted to export members of this organization';
  end if;

  if p_fields is null or cardinality(p_fields) = 0
     or not (p_fields <@ array['full_name','email','status','created_at','consent_at','consent_language']) then
    raise exception 'Invalid export fields';
  end if;

  if p_statuses is null
     or not (p_statuses <@ array['pending','active','inactive']) then
    raise exception 'Invalid export statuses';
  end if;

  if p_row_count is null or p_row_count < 0 then
    raise exception 'Invalid row count';
  end if;

  insert into public.member_exports (org_id, officer_id, row_count, fields, statuses)
  values (target_org, caller_id, p_row_count, p_fields, p_statuses)
  returning id into new_id;

  return new_id;
end;
$$;

revoke all on function public.record_member_export(uuid, text[], text[], integer) from public, anon;
grant execute on function public.record_member_export(uuid, text[], text[], integer) to authenticated;
