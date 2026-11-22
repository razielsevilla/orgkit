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
