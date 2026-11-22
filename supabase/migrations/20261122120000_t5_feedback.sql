-- T5: In-app feedback
--
-- A signed-in officer can send a message from any workspace page. It is saved
-- with the page they were on (and their org, when they were inside one), and
-- the product owner reads it in an owner-only inbox.
--
-- Users get NO direct access to the table. A direct insert policy would let a
-- signed-in browser call the database API itself and skip the app's rate limit,
-- so writes go through submit_feedback(), which only the app server (service
-- role) can call, after it has checked the session and the limit. This is the
-- same approach as join and check-in. Reads go through get_feedback(), which
-- only the product owner may call (see T3, platform_owners).
--
-- Feedback is personal data (it carries the sender and what they wrote): it is
-- deleted with the officer, and the owner can delete a row once it is handled.

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  officer_id uuid not null references public.officers(id) on delete cascade,
  -- Kept as null if the org is later removed, so the message is not lost
  org_id uuid null references public.orgs(id) on delete set null,
  page text not null check (char_length(page) between 1 and 200),
  message text not null check (char_length(btrim(message, E' \t\r\n')) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists feedback_created_idx
  on public.feedback (created_at desc);

create index if not exists feedback_officer_created_idx
  on public.feedback (officer_id, created_at desc);

alter table public.feedback enable row level security;

-- No policies and no client access, not even to read the sender's own messages
revoke all on public.feedback from public, anon, authenticated;
grant all on public.feedback to service_role;

-- Save one message. Service role only: the app checks the signed-in user and
-- the per-device rate limit first, then passes the officer's id in.
create or replace function public.submit_feedback(
  p_officer_id uuid,
  p_org_id uuid,
  p_message text,
  p_page text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_message text;
  v_page text;
  v_org uuid;
  v_id uuid;
begin
  if p_officer_id is null
     or not exists (select 1 from public.officers o where o.id = p_officer_id) then
    raise exception 'officer_not_found';
  end if;

  -- Trim spaces and line breaks at the ends; keep line breaks inside the text
  v_message := btrim(coalesce(p_message, ''), E' \t\r\n');
  if char_length(v_message) < 1 or char_length(v_message) > 2000 then
    raise exception 'invalid_message';
  end if;

  v_page := left(coalesce(nullif(btrim(p_page), ''), '/'), 200);

  -- A backstop behind the per-device limit: one officer cannot flood the inbox
  if (
    select count(*) from public.feedback f
     where f.officer_id = p_officer_id
       and f.created_at > now() - interval '1 hour'
  ) >= 20 then
    raise exception 'rate_limited';
  end if;

  -- Only keep the org if this officer really belongs to it
  if p_org_id is not null and exists (
    select 1 from public.org_officers oo
     where oo.org_id = p_org_id and oo.officer_id = p_officer_id
  ) then
    v_org := p_org_id;
  end if;

  insert into public.feedback (officer_id, org_id, page, message)
  values (p_officer_id, v_org, v_page, v_message)
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.submit_feedback(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.submit_feedback(uuid, uuid, text, text) to service_role;

-- The owner's inbox, newest first. Refuses everyone who is not a platform owner.
create or replace function public.get_feedback(p_limit integer default 100)
returns table (
  id uuid,
  created_at timestamptz,
  message text,
  page text,
  org_id uuid,
  org_name text,
  officer_name text,
  officer_email text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_limit integer := least(greatest(coalesce(p_limit, 100), 1), 200);
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if not public.is_platform_owner() then
    raise exception 'not_authorized';
  end if;

  return query
  select
    f.id,
    f.created_at,
    f.message,
    f.page,
    f.org_id,
    org.name,
    o.full_name,
    o.email
  from public.feedback f
  join public.officers o on o.id = f.officer_id
  left join public.orgs org on org.id = f.org_id
  order by f.created_at desc
  limit v_limit;
end;
$$;

revoke all on function public.get_feedback(integer) from public, anon;
grant execute on function public.get_feedback(integer) to authenticated;
grant execute on function public.get_feedback(integer) to service_role;
