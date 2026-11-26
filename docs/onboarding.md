# Onboarding: getting a new org to its first check-in

The first-run path for a new org, how we measure it, and what was changed to
shorten it. The aim: an org reaches **activation** quickly, and we can tell how
many do.

## Activation

> One event has QR check-ins from **at least 3 different members**, and the 3rd of
> them happened **within 14 days** of the org being created.

Why this: it only happens if members joined, were confirmed, an event exists and the
QR flow worked, and it is the habit that keeps an org coming back. Handover is the
long-term reason to use OrgKit but only pays off at the end of a term, so it cannot
be the first-session measure.

**The 3 members and 14 days are assumptions**, set before any baseline existed. Look
at the baseline (below), then change them in [`scripts/onboarding-baseline.sql`](../scripts/onboarding-baseline.sql)
(the two places marked `ACTIVATION`) if your orgs are smaller or slower.

## The path, and what each step needs

1. Sign in with Google, accept the privacy notice (`/consent`), once.
2. Create the org (name and school).
3. **Join link.** Now on from the moment the org is created, so it can be shared at once.
   Students who join are *pending*.
4. **Confirm members.** Only confirmed (active) members can check in. Confirm one by one, or
   with **Confirm all** (asks first, then confirms every pending student).
5. Create an event and open check-in.
6. Members scan the QR code. Three of them = activated.

## What changed (migration `20261128120000_on1_onboarding.sql` and the app)

| Change | Where |
|---|---|
| New orgs start with the join link **on**. Admins can still switch it off or regenerate it. **Existing orgs are not changed** | `create_organization` |
| **Confirm all** for pending students, with a confirmation step and a message saying how many were confirmed | `confirm_all_pending_members`, `ConfirmAllPending` |
| Event page and check-in screen tell the officer how many joined students aren't confirmed and so can't check in. A **count only**; the student still sees the same neutral message as a stranger, so a scan never reveals who is on the roster | `PendingMembersNotice`, `getPendingMemberCountAction` |
| The Home "Get started" guide follows progress and no longer vanishes | [org-health.md](org-health.md) |
| A **Share** button next to Copy Link on phones that can share | `MemberEmptyState` |

Joining through the link exposes no member data: joiners are pending, and the link
carries no information about the org's roster.

## Measuring it: the baseline

Nothing new is tracked. Everything comes from rows OrgKit already stores, in the same
spirit as [usage-metrics.md](usage-metrics.md) (counts only, no page views, no
third-party analytics).

1. Open the Supabase SQL editor as the database owner and run
   [`scripts/onboarding-baseline.sql`](../scripts/onboarding-baseline.sql). It is read-only
   (one temporary table, gone with the session) and selects no names or emails.
2. The editor shows the last result: **one row per weekly cohort** of org creation.

| Column | Meaning |
|---|---|
| `orgs` | Orgs created that week |
| `reached_first_member`, `reached_5_active_members`, `reached_first_event` | How many got that far |
| `activated`, `old_enough`, `activation_rate_pct` | Activated orgs, orgs at least 14 days old, and the rate against **old enough** (younger orgs have not had the chance yet) |
| `median_hours_to_first_member`, `median_hours_to_activation` | Speed |
| `activated_and_still_active`, `not_activated_but_active`, `measurable_for_retention` | Whether the org did anything in days 15 to 28. Only orgs at least 28 days old count; for younger ones the answer is "not yet", never "no" |

To see every org instead, swap the last `select` for the commented one above it.

Sample data from `scripts/seed-org-health.mjs` is left out, so it cannot inflate a baseline.

### Reading it honestly

- With only a few orgs, one org moves a percentage a lot. Read the counts, not just the rate.
- The "still active" columns are a first look at whether activation predicts staying,
  not proof. With a handful of orgs, treat the answer as a direction.
- What is **not** visible: people who leave before consenting or before creating an
  org, and whether a link was copied. That would need page views or a client counter,
  which the project avoids (see [usage-metrics.md](usage-metrics.md)).

## Tests

`tests/sql/onboarding.test.ts` (join link on at creation, confirm all and its isolation),
`tests/sql/onboarding-baseline.test.ts` (runs the baseline script against orgs whose
answers are known), `tests/actions/onboarding-ui.test.tsx`, and the Get started cases in
`tests/unit/org-health.test.ts` and `tests/actions/org-health-ui.test.tsx`.

## Not done

- The baseline is a script to run, not a page. Adding it to `/owner/usage` is the natural next step once
  the numbers have been looked at.
- Orgs created before this change keep whatever join-link state they have.
- No bulk **undo** for Confirm all: it asks first instead. A wrongly confirmed student can be set inactive from the roster.
