# Org health dashboard (officer Home)

## Overview
The Home screen of a workspace answers one question for officers: **how is the org doing, and what should I do next?** It replaces the old "Your workspace is ready" card. A brand new workspace still gets that welcome, plus a "Get started" list (see [onboarding.md](onboarding.md)).

Audience: every officer role (admin, finance, officer). Check it weekly, or after a payment or event. It is read-only: each card links to the screen where the officer acts.

## What it shows
- **Hero:** an insight headline ("3 areas need action"), a ring of areas on track, one chip per area, and a **Do next** list (3 rows, most urgent first, with a count of the rest).
- **Five cards**, each built around one figure rather than text. The card title links to the screen where the officer acts.

| Card | Headline number | Figure |
| :--- | :--- | :--- |
| Dues | Collected so far, of the amount expected | Meter against the date-based pace, and ranked bars of members by payment status |
| Members | Active members | New members per week, last 8 weeks (columns), and a "to confirm" tag. Without the weekly series: bars for the last 30 days against the 30 before |
| Events | Average turnout, last 90 days | Turnout of the last 8 events (columns), and the next event. Without the per-event series: bars for the last 90 days against the 90 before |
| Terms | Current terms | One square per term (captioned), steady or ending within 30 days |
| Handover | Roles leaving soon with a ready guide | A dot plot: one row per leaving role, a dot placed by days left on a 60 day axis (labelled "ends in", with the days written beside each dot), coloured by guide state |

- The update time and time windows sit under the chips. The layout is compact on purpose: it fits one screen (about 733px tall) in the new and healthy states, and scrolls only as a fallback.

There is deliberately no single 0 to 100 "health score". A made-up number has no shared definition. Status counts and plain reasons do.

## Get started guide
Until an org has a **confirmed member and a first event**, the "Do next" column is replaced by a "Get started" guide that ticks itself off ("2 of 6 done") from the same facts as the cards: add members, confirm members (it says how many are waiting, and that only confirmed members can check in), schedule a first event, then dues, terms and documents. It shows the first three steps still to do. After that Home goes back to "Do next", even if dues or terms are not set up, and students waiting to be confirmed are an ordinary "Do next" item rather than a reason to bring the guide back. The rules are `getStartedSteps` and `isSetupInProgress` in [org-health.ts](../src/lib/health/org-health.ts).

(Before this, the guide was tied to "no area has any data", so a single recorded term made it vanish for good.)

## Statuses
Always an icon plus words, never colour alone: **On track** (outlined pill, emerald check), **Needs a look** (the Pending amber from the Members page), **Needs action** (the Inactive red from the Members page), **Not started** (grey, nothing to judge yet; not counted against the org).

**Colour:** emerald and grey for the page, with amber and red only in the two status pills and the matching icon tiles in "Do next", using the same tokens as the status pills on the Members page (`member-status-tones.ts`), so one colour means one thing across the app. A lighter emerald means "in progress" (pending payments, draft guides). Nothing else on Home wears amber or red, and a test guards that.

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
- The two series behind the charts, weekly joins and per-event turnout, come from the same function (`joined_weekly`, `recent`).

## Files
- `src/lib/health/org-health.ts`: types, mapper, status rules, Do next list (no imports, unit tested)
- `src/lib/health/format.ts`: date text
- `src/app/(workspace)/org-health-actions.ts`: `getOrgHealth`
- `src/components/workspace/home/`: `org-health-dashboard`, `health-hero`, `health-cards`, `health-figures` (the charts), `health-shared`, `org-health-unavailable`
- Server components only: no client JavaScript on this screen.

## Design and phones
Follows [design.md](design.md), including the 2026-11-26 "tactile refinement" revision, **on Home only for now**: base canvas, white cards (20px, hero 24px) with a hairline border and the `--shadow-*` tokens, 56px clear below the last row for the Feedback button. Breakpoints are the documented ones: cards go 3, 2, then 1 column at 800px and 640px; the hero stacks at 800px; links and chips are 44px on touch. Checked at 360px with no sideways scroll.

### The revision on Home
- **Fonts:** Inter (default weight 500, headings 600 and 700, 800 retired) and JetBrains Mono for status tags, counts inside bars, chart dates and timestamps. Amounts and counts use tabular numerals. `src/lib/fonts.ts` exports `inter` and `jetbrainsMono`, and only the Home page applies them, so the rest of the app keeps Plus Jakarta Sans.
- **Tokens:** the easing, duration and shadow tokens from design.md 2.2 are defined under `.orgkit-home` in `org-health-dashboard.tsx`, not in `globals.css`. When the whole app adopts the revision, delete that block and use the global tokens.
- **Motion:** the hero, the first card row and the second card row rise in turn (`stagger-1` to `stagger-3`, 0.08s apart). Chips press in with `scale(0.97)`, and hover lifts sit behind `@media (hover: hover)`. Only listed properties transition, never `all`. `prefers-reduced-motion` flattens all of it.
- **Guard:** `tests/actions/org-health-design.test.tsx` fails if any of this drifts, or if the new fonts or tokens leak into `globals.css`, the root layout or another page.

## Tests
`tests/sql/org-health.test.ts` (numbers, windows, isolation), `tests/unit/org-health.test.ts` (rules, boundaries, wording), `tests/actions/org-health-actions.test.ts`, `tests/actions/org-health-ui.test.tsx`.

## Not included (ideas)
Period and date filters; a previous-period dues comparison (needs historical member counts); notifications for the Do next list.

## Trying it with sample data
`scripts/seed-org-health.mjs` fills one org with sample records in every area, dated relative to today. Run it without flags first: it is a dry run.

```
node --env-file=.env.local scripts/seed-org-health.mjs <orgId> --apply                    # mixed: some areas fine, some not
node --env-file=.env.local scripts/seed-org-health.mjs <orgId> --apply --scenario=healthy # everything on track
node --env-file=.env.local scripts/seed-org-health.mjs <orgId> --clean                    # remove the sample rows
```

Sample rows are marked ("Sample · " titles, `@seed.orgkit.test` emails, a "(sample)" term name), so `--clean` never touches real data. Sample payments use a placeholder screenshot.

## Charts
Plain HTML and CSS drawn on the server, with no chart library and no client code, built to the dataviz rules: thin marks, a 2px gap between touching marks, one baseline, a visible legend with the numbers, and a text alternative (`aria-label`) on every figure. The hover tooltip is the native `title`. A part too narrow to hold its number prints none inside, and the legend carries it. The light emerald and the greys are faint on white, which is why every bar keeps its gaps and a visible legend.
