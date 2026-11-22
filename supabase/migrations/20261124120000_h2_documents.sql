-- H2: Store key documents and links
-- Table to store documents (uploaded files or external links) scoped to an organization.

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  title text not null,
  category text not null,
  kind text not null,
  storage_path text,
  url text,
  file_size bigint,
  mime_type text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Title constraint: between 2 and 150 characters
alter table public.documents drop constraint if exists documents_title_length;
alter table public.documents
  add constraint documents_title_length check (char_length(btrim(title)) between 2 and 150);

-- Category constraint: Finance, Legal, Templates, Contacts, General
alter table public.documents drop constraint if exists documents_category_check;
alter table public.documents
  add constraint documents_category_check check (category in ('Finance', 'Legal', 'Templates', 'Contacts', 'General'));

-- Kind constraint: file or link
alter table public.documents drop constraint if exists documents_kind_check;
alter table public.documents
  add constraint documents_kind_check check (kind in ('file', 'link'));

-- Payload constraint:
-- If kind is 'file': storage_path is required, url must be null
-- If kind is 'link': url is required, storage_path, file_size, and mime_type must be null
alter table public.documents drop constraint if exists documents_payload_check;
alter table public.documents
  add constraint documents_payload_check check (
    (kind = 'file' and storage_path is not null and char_length(btrim(storage_path)) > 0 and url is null)
    or
    (kind = 'link' and url is not null and char_length(btrim(url)) > 0 and storage_path is null and file_size is null and mime_type is null)
  );

-- File size constraint: positive for files, null for links
alter table public.documents drop constraint if exists documents_file_size_check;
alter table public.documents
  add constraint documents_file_size_check check (
    (kind = 'file' and file_size is not null and file_size > 0)
    or
    (kind = 'link' and file_size is null)
  );

-- Indexes for performance and sorting (newest first, filter by category)
create index if not exists documents_org_created_idx
  on public.documents (org_id, created_at desc);

create index if not exists documents_org_category_idx
  on public.documents (org_id, category);

-- Row Level Security for documents table
alter table public.documents enable row level security;

revoke all on public.documents from anon, authenticated;
grant select, insert, delete on public.documents to authenticated;

-- Officers can view documents in their orgs
drop policy if exists "Officers can read documents in their orgs" on public.documents;
create policy "Officers can read documents in their orgs"
  on public.documents
  for select
  to authenticated
  using (public.is_org_member(org_id));

-- Officers can insert documents in their orgs
drop policy if exists "Officers can insert documents in their orgs" on public.documents;
create policy "Officers can insert documents in their orgs"
  on public.documents
  for insert
  to authenticated
  with check (public.is_org_member(org_id));

-- Officers can delete documents in their orgs
drop policy if exists "Officers can delete documents in their orgs" on public.documents;
create policy "Officers can delete documents in their orgs"
  on public.documents
  for delete
  to authenticated
  using (public.is_org_member(org_id));

-- Storage Bucket Setup for Handover Documents (org-documents)
do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public)
    values ('org-documents', 'org-documents', false)
    on conflict (id) do update set public = false;
  end if;
end $$;

