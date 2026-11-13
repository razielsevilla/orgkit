# OrgKit Tech Stack

OrgKit is built as a modular monolith: one Next.js codebase, one Postgres database, and clear internal modules (members, attendance, dues, archive).

## Stack at a glance

| Layer              | Choice                                      | Why                                                                                     |
| ------------------ | ------------------------------------------- | --------------------------------------------------------------------------------------- |
| Framework          | Next.js (App Router) + React + TypeScript   | Team preference; server actions keep the backend simple                                 |
| Styling            | Tailwind CSS + shadcn/ui                    | Fast, consistent UI with accessible components                                          |
| Forms / validation | React Hook Form + Zod                       | Shared schemas on client and server                                                     |
| Database           | PostgreSQL via Supabase                     | Relational data fits this domain; RLS handles tenancy                                   |
| ORM                | Drizzle or Prisma                           | Type-safe queries and migrations (Drizzle is lighter, Prisma is more beginner-friendly) |
| Auth               | Supabase Auth (Google OAuth)                | Students already have Google accounts                                                   |
| File storage       | Supabase Storage                            | Screenshots and handover documents                                                      |
| QR generate / scan | `qrcode` + `@yudiel/react-qr-scanner`       | Works in mobile browsers, no native app needed                                          |
| Email              | Resend                                      | Invites and payment status notifications                                                |
| Hosting            | Vercel _(tentative)_                        | Zero-config for Next.js, free tier is enough to start                                   |
| Quality            | Vitest, Playwright, Sentry, ESLint/Prettier | Unit and E2E tests, error tracking                                                      |

## Open decisions

| Item    | Status    | Notes                                                   |
| ------- | --------- | ------------------------------------------------------- |
| ORM     | Undecided | Drizzle or Prisma. Pick one before the first migration. |
| Hosting | Tentative | Vercel for now. Revisit before launch.                  |

## Install reference

Scaffold (already covered in the setup guide):

```bash
npx create-next-app@latest .
```

Core packages:

```bash
# UI
npx shadcn@latest init

# Forms and validation
npm install react-hook-form zod @hookform/resolvers

# Supabase (database, auth, storage)
npm install @supabase/supabase-js @supabase/ssr

# QR codes
npm install qrcode @yudiel/react-qr-scanner
npm install -D @types/qrcode

# Email
npm install resend

# Error tracking
npx @sentry/wizard@latest -i nextjs
```

ORM (choose one):

```bash
# Drizzle
npm install drizzle-orm
npm install -D drizzle-kit

# Prisma
npm install @prisma/client
npm install -D prisma
```

Testing and code quality:

```bash
npm install -D vitest @playwright/test prettier
npx playwright install
```

## Environment variables

Keep these in `.env.local` (never commit it):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
RESEND_API_KEY=
SENTRY_DSN=
```

`SUPABASE_SERVICE_ROLE_KEY` bypasses Row Level Security. Use it only in server code, and never expose it to the browser.

## Notes

- **Multi-tenancy:** every table carries an `org_id`, and Postgres Row Level Security keeps each org's data separate.
- **Auth:** Google OAuth through Supabase Auth, requesting only the `openid`, `email` and `profile` scopes.
- **QR check-in:** short-lived, signed, rotating tokens so a screenshot of the QR can't be reused by absent members. A token is `<eventId>.<slot>.<HMAC-SHA256>` with slot = `floor(unix seconds / 30)`, signed with `CHECKIN_TOKEN_SECRET` and never stored. A scan is accepted in its own slot and the next one (30 to 60 seconds), and the officer's check-in window (`events.checkin_open`) must be open. Slot length and grace are constants in `src/lib/checkin/token.ts`. A member opens `/checkin/<token>` with no account and confirms with the email they joined with; the server calls the `service_role`-only function `checkin_member`, which records one `attendance` row per member and event (`unique (event_id, member_id)`) for an active member and answers every other email with the same message.
- **Manual attendance:** officers add or remove a row from the event page through the `authenticated` functions `mark_attendance_manual` (writes `method = 'manual'` and `marked_by`, `on conflict do nothing`, active members of the same org only) and `remove_attendance`. Both check `is_org_member`, refuse a cancelled event and allow an ended one. The list refreshes by polling a server action every 5 seconds rather than Supabase Realtime, which keeps it working with the existing RLS and needs no extra setup.
- **Member attendance history:** the members-page dialog reads one member's history through the `authenticated` function `get_member_attendance_history(target_member)`, which returns `{ org_id, joined_at, events[] }` (ended events only; cancelled ones included with their status). It checks `is_org_member` on the member's org and raises a single `member_not_found` for a missing member, another org's member and a non-officer, so the answer never confirms a member exists elsewhere; the action also checks the returned `org_id` against the request. "Joined" is `members.created_at`. The "Attended X of Y" count is done in `src/lib/members/attendance-history.ts` so it is unit tested. An index on `attendance (member_id)` keeps the per-member read fast.
- **Payments:** GCash references are stored as records only. OrgKit never holds money.
