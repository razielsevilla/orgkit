-- A1: officers who sign in with Google.
-- Safe to run when the table was already created by hand in the dashboard:
-- every statement checks first, and nothing is dropped except our own policy.

create table if not exists public.officers (
  -- Same ID as the Supabase sign-in record, so the session maps straight to the row
  id uuid primary key references auth.users (id) on delete cascade,
  -- Google's permanent account ID. Used to match a returning officer, never the email.
  google_sub text not null,
  email text not null,
  full_name text not null default '',
  -- Which version of the privacy notice they agreed to, and when
  consent_version text not null,
  consent_at timestamptz not null,
  created_at timestamptz not null default now(),
  last_sign_in_at timestamptz not null default now()
);

-- One officer per Google account, even if the email on that account changes
create unique index if not exists officers_google_sub_key
  on public.officers (google_sub);

alter table public.officers enable row level security;

-- An officer can read only their own row. There are no insert/update/delete
-- policies: the app writes through the server with the service-role key.
drop policy if exists "Officers can read their own row" on public.officers;
create policy "Officers can read their own row"
  on public.officers
  for select
  to authenticated
  using (id = (select auth.uid()));
