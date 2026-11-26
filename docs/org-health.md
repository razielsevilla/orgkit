# Org health dashboard (officer Home)

## Overview
The Home screen of a workspace answers one question for officers: **how is the org doing, and what should I do next?** It replaces the old "Your workspace is ready" card. A brand new workspace still gets that welcome, plus a "Get started" list.

Audience: every officer role (admin, finance, officer). Check it weekly, or after a payment or event. It is read-only: each card links to the screen where the officer acts.

## What it shows
- **Hero:** an insight headline ("3 areas need action"), a ring of areas on track, one chip per area, and a **Do next** list (3 rows, most urgent first, with a count of the rest).
- **Five cards:** Dues, Members, Events, Terms, Handover. Each has a status, one headline number and a comparison; the card title links to the screen.
- The update time and time windows sit under the chips. The layout is compact on purpose: it fits one screen (about 733px tall) in the new and healthy states, and scrolls only as a fallback.

There is deliberately no single 0 to 100 "health score". A made-up number has no shared definition. Status counts and plain reasons do.

## Statuses
Always an icon plus words, never colour alone: **On track** (emerald), **Needs a look** (amber), **Needs action** (red, only for act-now cases), **Not started** (grey, nothing to judge yet; not counted against the org).

All thresholds live in `HEALTH_RULES` in [org-health.ts](../src/lib/health/org-health.ts).

| Area | Needs a look | Needs action |
| :--- | :--- | :--- |
| Dues (newest open period) | Payments waiting for review; collected % trails the date-based pace by more than 20 points; under 80% collected within 7 days of the due date | Past the due date with money outstanding |
| Members | Anyone waiting to be confirmed | Longest wait is 14 days or more |
| Events | Nothing upcoming; turnout down 10 points or more against the previous 90 days | none |
| Terms | No current term, or a term ends within 30 days | none |
| Handover | A role whose term ends within 60 days has no ready guide | That role leaves within 14 days |

**Pace** is how far through the period we are: days since the period was created divided by days from creation to the due date. It is the benchmark that makes "42% collected" readable as ahead or behind.

## Data
One database function, `get_org_health(p_org_id)` ([migration](../supabase/migrations/20261127120000_o1_org_health.sql)), returns facts only, in one round trip. Security definer; the caller must be an officer of the org (`not_authorized` otherwise, the same for a missing org so existence is not revealed); `anon` cannot call it.

- Dues counts and amounts follow `get_dues_period_dashboard` exactly (a SQL test compares the two), so Home never disagrees with Dues.
- "Today" is the date in Manila (`v_tz` in the function).
- Turnout is check-ins divided by **today's** active members, so it is approximate for old events. Cancelled events never count.
- Joins compare the last 30 days with the 30 before; turnout, the last 90 with the 90 before.
- Officers are shown by role title only. Names are not on Home.

## Files
- `src/lib/health/org-health.ts`: types, mapper, status rules, Do next list (no imports, unit tested)
- `src/lib/health/format.ts`: date text
- `src/app/(workspace)/org-health-actions.ts`: `getOrgHealth`
- `src/components/workspace/home/`: `org-health-dashboard`, `health-hero`, `health-cards`, `health-shared`, `org-health-unavailable`
- Server components only: no client JavaScript on this screen.

## Design and phones
Follows [design.md](design.md): base canvas, white cards (20px, hero 24px), Plus Jakarta Sans, emerald with the amber companion, 60px clear below the last row for the Feedback button. Breakpoints are the documented ones: cards go 3, 2, then 1 column at 800px and 640px; the hero stacks at 800px; links and chips are 44px on touch. Checked at 360px with no sideways scroll.

## Tests
`tests/sql/org-health.test.ts` (numbers, windows, isolation), `tests/unit/org-health.test.ts` (rules, boundaries, wording), `tests/actions/org-health-actions.test.ts`, `tests/actions/org-health-ui.test.tsx`.

## Not included (ideas)
Period and date filters; a previous-period dues comparison (needs historical member counts); notifications for the Do next list.
