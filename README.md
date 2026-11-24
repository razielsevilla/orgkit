# OrgKit

A workspace for student organizations: officers sign in with Google, set up
their org, invite their team with roles, and let members join by link or QR
with recorded consent.

Built with Next.js (App Router), React, TypeScript and Supabase (Postgres, Auth
with Google). This is the EP-1 foundation: accounts, org setup, officer roles,
member join, roster, events with QR check-in and a live attendance list and
per-member attendance history. Dues and handover come in later epics.

> This project uses a Next.js version with breaking changes. Read
> [AGENTS.md](AGENTS.md) and the guides in `node_modules/next/dist/docs/`
> before changing framework-level code.

## Run it locally

You need Node 22 and a Supabase project.

```bash
npm install
cp .env.example .env.local   # then fill it in, see below
npm run dev                  # http://localhost:3000
```

### Environment variables

Set these in `.env.local` (never commit it). `.env.example` lists them all.

| Variable | Required | What it is |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | The project's anon (public) key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-only key. Never expose it to the browser |
| `NEXT_PUBLIC_SITE_URL` | In production | The app's public address, for example `https://orgkit.example`. Join links and QR codes are built from it, so it is required in production. It is read at build time, so changing it needs a rebuild |
| `PRIVACY_CONTACT_EMAIL` | Yes | The privacy contact shown in the member consent text and on `/privacy`. **While it is missing or not a valid email, the public join page stays closed, and the join form refuses submissions.** The privacy page reads it at build time |
| `RESEND_API_KEY` | In production | API key for Resend email service, used to send officer payment reminders. In development or test environments, an in-memory mock transport is used if unset |
| `RESEND_FROM_EMAIL` | In production | Sender address for reminder emails (default: `OrgKit Reminders <onboarding@resend.dev>`, which Resend only delivers to your own account). In production, set it to an address on your Resend verified domain |
| `CHECKIN_TOKEN_SECRET` | Yes, for check-in | Key that signs the rotating check-in QR tokens. Use a long random value (`openssl rand -base64 32`). It has no fallback, so check-in shows an error until it is set |
| `JOIN_RATE_LIMIT_SECRET` | No | Secret for hashing IP addresses in rate limiting. Defaults to the service role key. In production, one of the two must be set |
| `JOIN_ATTEMPTS_PER_MINUTE` | No | Join attempts per device per minute. Default 30 |
| `INVITE_ATTEMPTS_PER_MINUTE` | No | Invite page opens per device per minute. Default 20 |
| `CHECKIN_ATTEMPTS_PER_MINUTE` | No | Member check-in attempts per device per minute. Default 30 |
| `DUES_PAY_ATTEMPTS_PER_MINUTE` | No | Dues payment submissions per device per minute. Default 30 |
| `FEEDBACK_ATTEMPTS_PER_MINUTE` | No | In-app feedback messages per device per minute. Default 5 |

## Set up Supabase

1. **Apply the migrations** in [supabase/migrations/](supabase/migrations/) in
   file-name order (SQL editor, or the Supabase CLI). They create the tables,
   row level security policies and database functions. **Apply each one once.**
   Do not re-run the A3 and A4 files by hand: both contain a data fix that
   promotes existing officers to admin, so a second run would hand out admin
   rights. The Supabase CLI tracks what it has applied and avoids this. Only the
   `pg_cron` migration (step 4) is meant to be re-run.
2. **Turn on Google sign-in:** Authentication, Providers, Google. Add your Google
   OAuth client ID and secret.
3. **Allow the callback address:** in Authentication, URL Configuration, add
   `<your site address>/auth/callback` to the redirect URLs (for local work,
   `http://localhost:3000/auth/callback`). The Google OAuth client must allow
   Supabase's own callback URL shown on the Google provider page.
4. **Enable `pg_cron`** (Database, Extensions), then re-run
   `20261103100000_a3_schedule_invite_cleanup.sql`,
   `20261108120100_r3_schedule_member_invite_cleanup.sql` and
   `20261121120100_t3_schedule_weekly_usage_report.sql`. Without it these
   migrations only print a notice: old invite rows are never deleted and the
   weekly usage report is never produced.
5. **Name the product owner** (once, in the SQL editor), so they can open
   `/owner/usage`. Nobody else can, and the app has no screen for this:
   `insert into public.platform_owners (officer_id) select id from public.officers where email = '<owner email>';`
   The owner must have signed in once first. See
   [docs/usage-metrics.md](docs/usage-metrics.md).

The app only asks Google for the `openid`, `email` and `profile` scopes.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm test` | All tests: node tests (unit and SQL) and vitest (server actions and components) |

The SQL tests run the real migrations in an in-process Postgres (PGlite) as the
same database roles Supabase uses, so they check row level security and which
roles may call which function. No Supabase project is needed to run any test.

CI runs lint, tests and a build on pull requests (see `.github/workflows/`).
Branches flow `ticket/*` into `epic/*`, `epic/*` into `develop`, and `develop`
into `main`.

## Where things are

| | |
|---|---|
| [docs/routes.md](docs/routes.md) | Every URL, who can open it, and what runs before it |
| [docs/backup-and-access.md](docs/backup-and-access.md) | Backups, the restore runbook, who can reach production data, and the service role key |
| [docs/mobile-qa.md](docs/mobile-qa.md) | The phone checklist: how to test every screen at 360px, on a real phone too |
| [docs/feedback.md](docs/feedback.md) | In-app feedback: what is saved, who reads it, limits, cleaning up |
| [docs/usage-metrics.md](docs/usage-metrics.md) | The weekly usage report: what it counts, how it runs, how to check it |
| [docs/techstack.md](docs/techstack.md) | Stack choices and open decisions |
| [docs/design.md](docs/design.md), [docs/palette.md](docs/palette.md) | Design notes and colors |
| `src/app/` | Pages and server actions |
| `src/lib/` | Auth, orgs, invites, members, rate limiting, Supabase clients |
| `supabase/migrations/` | The database |

## Before a release

- Replace any stopgap value of `PRIVACY_CONTACT_EMAIL` with a monitored privacy
  address, in the deployment environment.
- Set `NEXT_PUBLIC_SITE_URL` to the real address.
- Decide how the database is backed up (the Free plan has no automatic backups),
  take a backup and test a restore, as in
  [docs/backup-and-access.md](docs/backup-and-access.md).
- Complete the access review in that document: who can reach the database, its
  keys and the hosting settings, and that the service role key is set for
  Production only.
