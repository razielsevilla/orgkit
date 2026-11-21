# Backups and access controls (T4)

OrgKit holds personal data about students. This page is the runbook for keeping
it safe: what backups exist, how to take one and restore it, who may reach
production data, and where the service role key is allowed to live.

**Keep this page free of secrets.** Write roles ("Owner", "Developer 1"), dates,
timings and results here. Never write an email address, a key, a password, a
connection string or any dump content. Real names and accounts belong in the
owner's private notes.

Status: the sections marked **Fill in** are checked off by the owner, in the
Supabase dashboard and the hosting settings. Nothing here is "done" until the
tables are filled in.

---

## 1. Backups: where we stand

| | |
|---|---|
| Supabase plan | Free |
| Automatic backups | **None.** Supabase says Free projects get no automatic backups, and backups are not available to download for them |
| Retention | None. The only backups are the ones we take ourselves (section 2) |
| Point-in-time recovery | Not available, and out of scope for now |
| Last manual backup | **Fill in:** date, who, where it is stored |
| Last restore test | **Fill in:** date, see section 3 |

For comparison, paid plans keep daily backups: Pro 7 days, Team 14 days,
Enterprise up to 30 days (point-in-time recovery is a paid add-on). Moving to Pro
is a decision for the owner. It is worth making **before real student data goes
live**, because on Free a mistake, a failed migration or a deleted project
cannot be undone from Supabase's side (deleting a project also deletes any
backups Supabase holds).

Also on Free: Supabase may **pause a project with low activity over a 7-day
period**. A paused project can be restored from the dashboard, but it is down in
the meantime. Pro projects are not paused for inactivity.

### What a database backup does and does not contain

| Thing | In a database dump? |
|---|---|
| Tables, rows, row level security policies, functions (everything the migrations create) | Yes |
| **Payment screenshots** in the `dues-screenshots` Storage bucket | **No.** The database holds only each file's metadata, so a restore brings back the rows but not the images. Back the files up separately (section 2.3) |
| Auth settings: Google sign-in provider, redirect URLs, API keys | **No.** Set these again on a new project |
| Extensions (`pgcrypto`, `pg_cron`) and the scheduled jobs | Not reliably. Enable the extensions and re-run the three schedule migrations (section 3) |
| Passwords of custom database roles | No. OrgKit does not use any, but reset them if you ever add one |
| Vault or column encryption | Not used by OrgKit, so the extra Vault steps in Supabase's guide do not apply |

Whether the dump includes the `auth` schema data (the `auth.users` rows that
`officers` points at) is **not stated on Supabase's page**, so do not assume it.
Section 2.2 has a check you must run after every dump.

---

## 2. Taking a backup by hand

Do this **weekly** and **before every migration or release**. Each dump is
personal data about students: treat it as such.

### 2.1 Prerequisites

- The Supabase CLI and Docker Desktop (the CLI uses it for dumps).
- PostgreSQL client tools, with `psql` on your PATH (on Windows add the
  PostgreSQL `bin` folder to PATH, then check `psql --version`).
- The project's **database connection string** (Dashboard, **Connect**). Use the
  *direct* connection. If your network has no IPv6 and you don't have the IPv4
  add-on, use the *Session pooler* string instead. The database password is in
  Database Settings; reset it there if it is lost.

Put the connection string in an environment variable for the session instead of
typing it into commands or files:

```powershell
$env:DB_URL = Read-Host "Connection string" -MaskInput   # PowerShell 7
# older PowerShell: $env:DB_URL = Read-Host "Connection string"
```

### 2.2 Dump the database

Use a new folder per backup, outside the repository (the repo ignores `.env*`
but not dump files, and a dump must never be committed):

```bash
supabase db dump --remote=$DB_URL -f roles.sql --role-only
supabase db dump --remote=$DB_URL -f schema.sql
supabase db dump --remote=$DB_URL -f data.sql --use-copy --data-only -x "storage.buckets_vectors" -x "storage.vector_indexes"
```

(These are the commands on Supabase's "Backup and restore using the CLI" page.
Check that page for changes before relying on them.)

**Check the dump is complete.** Open `data.sql` in a text editor (it may be
large; search, don't scroll) and confirm:

1. It has a `COPY` block for each of `public.orgs`, `public.officers`,
   `public.members`, `public.events`, `public.attendance`,
   `public.dues_periods`, `public.dues_payments`.
2. It has a `COPY auth.users` block with rows. If it does **not**, the dump
   cannot be restored with working officer sign-in: stop and fix this first
   (see "Auth users missing" in section 4).
3. The file is not zero bytes and ends normally (no error text at the end).

Record the row counts of the main tables in production, so a restore can be
compared against them:

```sql
select 'orgs' as t, count(*) from public.orgs
union all select 'officers', count(*) from public.officers
union all select 'members', count(*) from public.members
union all select 'events', count(*) from public.events
union all select 'attendance', count(*) from public.attendance
union all select 'dues_payments', count(*) from public.dues_payments
union all select 'auth.users', count(*) from auth.users;
```

### 2.3 Back up the payment screenshots

The `dues-screenshots` bucket is private and is **not** in the dump. Copy the
files separately, at the same time as the dump:

- **Few files:** Dashboard, Storage, Files, download them.
- **Many files:** Supabase recommends an S3-compatible tool (rclone or
  Cyberduck). In Dashboard, Storage, Configuration, S3: enable the S3 protocol,
  generate an access key and secret (shown **once**; save them straight into
  your password manager), then use the endpoint and keys with the tool. Supabase
  also gives a Node.js script for copying files between projects on its
  "Backup and restore using the CLI" page, and the `supabase storage` CLI
  commands can list and copy objects with `--remote` (check `supabase storage
  cp --help` for the exact syntax of your CLI version).
- Rotate or delete the S3 keys when you are done.

### 2.4 Store it safely

- Put the folder (`roles.sql`, `schema.sql`, `data.sql`, the screenshots, and the
  row-count output) in **encrypted** storage that only the owner can open, not
  in a shared drive, chat or email, and not in the repository.
- Keep the last **4 weekly** backups and delete older ones. Data a student asks
  to have deleted stays in older backups until they are deleted, so keeping the
  window short (about a month) keeps that delay short too.
- Record each backup below.

**Fill in: backup log**

| Date | Taken by (role) | Dump complete? (2.2 checks) | Screenshots copied? | Stored in | Deleted on |
|---|---|---|---|---|---|
| | | | | | |

---

## 3. Restore test (to a scratch project)

**Never restore over the production project.** Always restore into a new, empty
project first. A scratch project holds **real student data**, so delete it when
the test is over.

Do this once now, then every 3 months and after any change to how backups are
taken.

### Steps

Start a stopwatch and fill in the timing table as you go.

1. **Create the scratch project** (Dashboard, New project). If the free project
   limit blocks you, pause or delete one you don't use. Note its connection
   string (the password is shown once).
2. **Restore the dump** into it, in one transaction so a failure undoes
   everything instead of leaving half a database:

   ```bash
   psql \
     --single-transaction \
     --variable ON_ERROR_STOP=1 \
     --file roles.sql \
     --file schema.sql \
     --command 'SET session_replication_role = replica' \
     --file data.sql \
     --dbname $SCRATCH_DB_URL
   ```

3. **Enable the extensions** the app needs: Database, Extensions: `pg_cron`
   (and `pgcrypto`, which the migrations create themselves).
4. **Re-run the three schedule migrations** in the SQL editor, so the cron jobs
   exist on the new project (they replace jobs of the same name, so it is safe
   to run them again):
   `20261103100000_a3_schedule_invite_cleanup.sql`,
   `20261108120100_r3_schedule_member_invite_cleanup.sql`,
   `20261121120100_t3_schedule_weekly_usage_report.sql`.
5. **Copy the screenshots** back into a `dues-screenshots` bucket on the scratch
   project (the dump restored the bucket's rows, not its files).
6. **Point a local copy of the app at the scratch project.** In `.env.local`
   (never in a file you commit) set `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` to the
   **scratch** project's values, plus `PRIVACY_CONTACT_EMAIL` and
   `NEXT_PUBLIC_SITE_URL=http://localhost:3000`. Then `npm run dev`.
   Set the scratch project's Google provider and add
   `http://localhost:3000/auth/callback` as a redirect URL to test sign-in
   (optional, see the checklist).
7. **Run the checklist** below, then stop the stopwatch.
8. **Delete the scratch project** and the local `.env.local` values you changed.

### Checklist

| Check | Result |
|---|---|
| Restore ran to the end with no error | |
| Row counts match production (the counts you recorded in 2.2) | |
| `select count(*) from auth.users` matches production | |
| Every table in `public` has row level security on: `select tablename from pg_tables where schemaname='public' and not rowsecurity;` returns no rows | |
| The functions exist: `select proname from pg_proc where proname in ('join_org','checkin_member','get_usage_report','run_weekly_usage_report');` returns 4 rows | |
| `cron.job` has the three jobs: `select jobname from cron.job;` | |
| The app starts (`npm run dev`) and `/` loads | |
| A real join link (`/join/<token>`) shows the org's name | |
| An officer can sign in and see their workspace (optional, needs the Google provider on the scratch project) | |
| A payment screenshot opens from the dues review (after step 5) | |

**Fill in: timing and result**

| | |
|---|---|
| Date of test | |
| Done by (role) | |
| Backup used (date) | |
| Dump size | |
| Scratch project created at (elapsed) | |
| Restore finished at (elapsed) | |
| App running against it at (elapsed) | |
| **Total time** | |
| Result (pass / fail, and what failed) | |
| Scratch project deleted on | |

---

## 4. When a restore fails or is only partial

Read the error first, then find the matching case. Because the restore command
uses `--single-transaction` and `ON_ERROR_STOP=1`, a SQL error should roll back
**everything**. If it did not (for example you ran the files one at a time), the
database is partial: do not use it. Delete the scratch project and start again
from step 1.

| What you see | What it means | What to do |
|---|---|---|
| `psql: error` straight away, or "could not connect" | Wrong connection string, password or network (IPv6) | Check the string in Dashboard, Connect. Use the Session pooler string if your network has no IPv6 |
| Dump file is empty, short, or ends mid-line | The dump was cut off or the disk filled | Do not restore it. Take a new dump. Fall back to the previous weekly backup |
| `permission denied` / `must be owner` on `supabase_admin` | Supabase-managed ownership in `schema.sql` | In `schema.sql`, comment out the lines that say `ALTER ... OWNER TO "supabase_admin"`, then run the restore again on a fresh project |
| `permission denied to grant role "postgres"` (`cli_login_postgres`) | A CLI login role in `roles.sql` | In `roles.sql`, comment out the line `GRANT "postgres" TO "cli_login_postgres" ...`, then run again on a fresh project. If problems remain: `DROP ROLE IF EXISTS cli_login_postgres;` |
| `extension "pg_cron" does not exist` or `schema "cron" does not exist` | The extension is off on the new project | Enable it (Database, Extensions), then re-run the three schedule migrations |
| **Auth users missing:** `auth.users` has no rows, or officers can't sign in, or `officers` rows have no matching user | The dump did not include `auth` data | Restore is not usable for sign-in. Take a new dump that includes `auth.users`, using the schema options in Supabase's CLI reference. As a last resort an officer signs in again (a new `auth.users` row is made) and an admin re-links them: officers keep their data only if their user id matches |
| App starts but sign-in with Google fails | Auth settings are not in the dump | Dashboard, Authentication, Providers: set Google up again (client ID and secret) and add `<site>/auth/callback` to Redirect URLs |
| App errors on every page | Wrong environment values | Check the three Supabase values are the scratch project's, not production's, and restart `npm run dev` (the two `NEXT_PUBLIC_` values are read when the app starts or is built) |
| Dues payment screenshots show "not found" | Storage files are not in the dump | Copy the screenshots from the backup (2.3). Without a copy, the payment rows are intact but the images are lost: ask the members to re-submit |
| Row counts are lower than production | Backup is older than the data, or the restore was partial | Compare dates. Restoring an old backup does not bring back anything created after it. If the counts should match, treat it as a partial restore: start again |
| "already exists" errors | Restoring on top of existing objects | Use a brand new, empty project, not a used one |

### If production itself is damaged

1. **Stop writes if you can** (pause the project, or take the site down), so
   nothing new is lost or overwritten.
2. **Do not restore over the damaged project.** Restore the latest good backup
   into a **new** project (section 3, steps 1 to 5).
3. **Switch the app to the new project:** set the three Supabase variables on
   the host to the new project's values and **redeploy** (the two public values
   are baked in at build time, so a redeploy is required, not just a restart).
4. **Re-do what the backup does not hold:** Google provider and redirect URLs;
   the `platform_owners` insert for the product owner (see
   [usage-metrics.md](usage-metrics.md)); `PRIVACY_CONTACT_EMAIL` if it is set per
   project.
5. **Rotate** the old project's keys and database password, or delete the old
   project once the new one is confirmed.
6. Write down what happened, the time lost, and what to change. Tell affected
   orgs what data (since the backup) needs to be re-entered.

---

## 5. Who can reach production data

Every place that grants access to the database or its keys. Review them all, and
**remove anyone without a stated need**. Use role labels, not emails.

**Fill in: access review** (date of review: ______)

| Where | Who (role) | Why they need it | Keep / remove | Done on |
|---|---|---|---|---|
| Supabase organization members (and their roles) | | | | |
| Supabase project: who knows the **database password** | | | | |
| Supabase project: who has the **service role key** (secret key) | | | | |
| Hosting dashboard members (production environment variables) | | | | |
| GitHub repository collaborators and teams | | | | |
| GitHub Actions secrets (should hold none for production) | | | | |
| Google Cloud project that owns the OAuth client | | | | |
| Resend account (sends reminder emails) | | | | |
| Local `.env.local` files holding production values (including whoever runs `scripts/seed-members.mjs`) | | | | |
| Stored database dumps and screenshot copies (section 2.4) | | | | |

Rules to apply:

- **Least access:** an admin who only manages the app does not need the Supabase
  dashboard. A developer does not need production keys on a laptop if a separate
  development project exists.
- **If anyone who held the service role key or the database password is
  removed, rotate both** (Database Settings to reset the password; API keys to
  replace the secret key), update the hosting environment variables, and
  redeploy. Record the date below.
- **Owner of the data:** the product owner stays listed as the Supabase owner,
  and a second trusted person should be able to recover the account.

**Fill in: rotations**

| Date | What was rotated | Why |
|---|---|---|
| | | |

---

## 6. The service role key

The service role key bypasses row level security, so it is the most sensitive
secret the app has. It may appear **only in server-side configuration**.

### In the codebase (checked, and kept true by a test)

- It is read in one place, `src/lib/supabase/env.ts` (`getServiceRoleKey`), and
  used only through `createAdminClient()` in
  `src/lib/supabase/service-role.ts`.
- That file starts with `import "server-only"`, so the build **fails** if a client
  component ever imports it.
- No `"use client"` file references it, and no variable that starts with
  `NEXT_PUBLIC_` holds a secret (anything with that prefix is sent to the
  browser).
- `.env*` files are ignored by git (only `.env.example`, which is empty, is
  tracked), and no key-like text exists in the repository or its history.
- CI uses placeholder values only; it needs no production secret.
- It is also the fallback secret for hashing IP addresses
  (`src/lib/config.ts`); set `JOIN_RATE_LIMIT_SECRET` to a separate value if you
  would rather the two were not the same.

`tests/unit/service-key-guard.test.ts` fails the build if any of these stop being
true.

### In deployment (**Fill in**)

| Check | Result / date |
|---|---|
| The variable is named exactly `SUPABASE_SERVICE_ROLE_KEY`, with **no** `NEXT_PUBLIC_` prefix, in the hosting settings | |
| It is set for the **Production** environment only. Preview and Development deployments do not get the production key (use a separate Supabase project for them) | |
| After a production build, the key is not in the browser files: search the built static files for the first 10 characters of the key (never the whole key) and find nothing, e.g. `Select-String -Path .next\static -Pattern "<first 10 characters>" -Recurse` | |
| The key is not in any build or runtime log, ticket or chat | |
| Only the people listed in section 5 can read it | |

If the key may have leaked (it appeared in a log, a screenshot, a public repo or
a chat), **rotate it now**, then update the hosting variable and redeploy.

---

## 7. Review log

Review again every 3 months, and whenever someone with access leaves.

| Date | Backups checked | Restore tested | Access reviewed | Key checked | By (role) |
|---|---|---|---|---|---|
| | | | | | |
