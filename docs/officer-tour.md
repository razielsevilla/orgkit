# Officer tour

A guided, interactive walk through the whole app for a new officer or admin. It
**dims the screen, lights up the real button, list or sidebar entry it is
explaining, and shows a card beside it with numbered steps for using it**. It
opens each page itself as it goes, so by the end the officer has seen where
every feature lives and how to use it.

It is not the same thing as [onboarding.md](onboarding.md), which is about getting a
new *org* to its first check-in. This teaches *navigation and use*.

## What an officer sees

About 45 beats on a desktop (fewer on a phone), in sections that follow the sidebar:

| Section | Beats |
|---|---|
| **Getting around** | Welcome, the sidebar (or the menu button on a phone), the profile menu, and the **?** and Feedback buttons |
| **Home** | Open Home, then one step per part of the page: your org at a glance, the area chips, what to do next, and each of the five cards (Dues, Members, Events, Terms, Handover) |
| **Members** | Open Members, then: get students to join, find and filter, manage one member, import and export |
| **Dues** | Open Dues, then: start a period, choose a period, how much is collected, check payments, share the pay link, send reminders |
| **Events** | Open Events, then: create an event, upcoming and past, take attendance with a QR code, the past events log |
| **Officers** | Open Officers, then: invite an officer, your team, hand over the admin role |
| **Terms** | Open Terms, then: record a term, leadership history |
| **Documents** | Open Documents, then: upload a file, save a link, find and open a document |
| **Handover** | Open Handover, then: start a guide, write the guide |
| **All set** | A first-week list, each item a link to the page it starts on |

Each card shows the section and place in it ("Dues · 2 of 7"), what the thing is for, and
**numbered how-to steps using the real button names** ("Press New period", "Name it, for
example 1st Sem Membership Dues"). A bar of segments, one per section, shows overall progress.

### How it behaves

- **Sidebar beats are clickable.** The lit sidebar entry is the one thing that works: click it, or press the
  card's "Open Dues" button, and the page opens and the tour moves on.
- **Everything else is look-only.** Clicking a lit button does nothing, so the tour never starts a dialog or an
  upload half way. Clicking the dim area does nothing either.
- **It opens pages by itself.** The workspace frame stays mounted across pages, so the tour carries on while the
  page changes under it. Back from a beat on another page returns to that page.
- **Skip section** (full tour only) jumps to the next section. **Skip for now**, the close button, Escape or **Finish** end the full tour; in a page guide it is **Close**, the close button, Escape or **Done**.
- **Phones.** Below 1024px the sidebar is a menu, so the tour explains the menu button once and then opens each
  page itself. At 640px and below the card is a sheet pinned to the bottom, and the lit thing is scrolled above it.
- **Nothing to point at.** On an empty page, or for a control a role does not have, the card sits in the middle and says
  "Nothing to point at yet" with what to expect, instead of ringing nothing.
- **Admin only.** An admin sees "You are an admin, so you can do this" and the control lit. An officer sees the
  card with no ring and "Ask an admin on your team to do this".
- **Keyboard.** Tab stays inside the card, the left and right arrows move, Escape ends it and focus returns to what opened it.

## When it opens: the full tour, or one page's guide

There are two ways in, and they are independent:

| | What it covers | How it opens |
|---|---|---|
| **The full tour** | Everything, from the welcome to the first-week list | **By itself, once**, the first time an officer reaches a workspace (including officers already using OrgKit when it shipped). Again on request: profile menu, **Take the full tour** |
| **A page's guide** | Only the page the officer is on, such as Members, with nothing from the other pages | The round **?** button in the bottom-right corner, beside Feedback, on every workspace page |

On Members, **?** shows only the Members steps (get students to join, find and filter, manage one member, import and
export), then **Done**. On Dues it shows only the Dues steps, and so on. It skips the "Open Dues" sidebar step because the
officer is already there, has no welcome or first-week list, and has nothing to skip to. Home's guide is eight steps, one
for each part of the page, each lighting its own piece.

Which page counts is the sidebar section the address belongs to: `/members/join` is Members, and an event's page or
check-in screen is Events. If a guide's first step lives on a different page than the one the officer is on (an event's
page, whose steps are on the events list), the tour opens that page first.

**Seen, and first login.** Only ending the **full** tour counts as seen. Closing a page guide does not, so an officer who
opens **?** before the automatic tour has run still gets the full tour the first time. Seen is kept in this browser's
`localStorage`, per officer (`orgkit_tour_v1:<officer id>`), the same way the sidebar remembers it is collapsed: no
database change. The cost is that an officer on a second device sees the full tour once there too. If storage is
blocked it never opens by itself (it could not remember), and **?** and the profile menu still work. To show the full
tour to everyone again after a big change, change the `v1` in `KEY_PREFIX` in `use-officer-tour.ts`.

## Example data: so an empty workspace still has something to point at

A new workspace has no members, dues, events or terms, so most of what the tour explains would not be on screen. While
the tour is open, **a page whose real data is empty shows made-up example data instead**, drawn by the real page
component, so every highlighted control is really there:

| Page | What the example shows |
|---|---|
| **Home** | A populated Home: 2 of 5 areas on track, three needing a look, a Do next list, and all five cards filled in |
| **Members** | Ten people (8 active, 2 pending, so Confirm is on screen) |
| **Dues** | An open period part way through collecting (4 paid, 2 pending review, 1 rejected, 1 unpaid) and a closed one |
| **Events** | Two upcoming, three ended and one cancelled |
| **Officers** | You, two teammates and an unaccepted invite |
| **Terms** | This year's three officers and last year's three |
| **Documents** | Three files and two links across the categories |
| **Handover** | A ready guide and a draft |

**Nothing is saved.** The example data is only the page's props for as long as the tour is open. It is never sent to a server
action, the database or storage, and closing the tour puts the real, empty page back. A page that has real data always shows
its real data, and a page that failed to load shows its error, never examples.

**The officer is told.** A pill at the top of the screen says "Example data for the tour. Nothing is saved", the welcome
card says so, and a page's card repeats it. The page is look-only during the tour, so nothing in the examples can be opened or changed.

**How it works** (`src/lib/tour/tour-demo.ts`, `src/components/workspace/tour/demo/`, `src/lib/tour/demo/`):
1. The workspace frame wraps the page in `<TourDemoProvider value={tourIsOpen}>`.
2. Each page's route renders a small wrapper (`MembersWithDemo`, `DuesWithDemo`, ...) instead of the page component. The wrapper
   calls `useDemoView(realDataIsEmpty)`. When it is true it renders the **same component** with a different `key` (so it starts
   fresh) and the example data; otherwise it renders exactly what the page always did.
3. Members and Dues refetch in effects, and React's development double-run would replace the examples with the real, empty
   result. Both take a `demo` prop that switches those fetches off.
4. The example data keeps what is true of the real org: whether the officer is an admin, their own entry in the team list,
   the org name, the categories. Dates are relative to today.

**Adding or changing a page?** Add its example data in `src/lib/tour/demo/`, a wrapper in `page-demos.tsx`, and use the
wrapper in the page's route. `tests/actions/tour-demo.test.tsx` keeps the data believable (the numbers add up the way the
real pages' do, the same people and dates appear on every page, the rules the real pages enforce hold), and
`tests/actions/tour-demo-pages.test.tsx` renders each page with the tour open and checks the markers its beats point at are
on screen.

## How it points at things

Every control the tour points at carries a `data-tour="name"` attribute (an inert marker, no visual or behavior change),
for example `data-tour="dues-new-period"`. A beat lists the names to look for (`target`), and the tour:

1. looks for the first one that is **actually on screen** (a hidden desktop or phone twin does not count), waiting up to
   3 seconds for a page to draw it;
2. scrolls its nearest scrolling container so it is in view (above the card on a phone);
3. follows it as the page scrolls, resizes or changes, and recovers if it disappears and comes back.

## Why a step feels instant (and what not to undo)

Pressing Next should show the next card in the same frame. These are on purpose, and tests guard them:

- **One card for the whole tour.** Only its words change, and it glides (180ms) to its next position. Do not put a `key` on the
  card: rebuilding it fades a new one in from nothing, which reads as a pause.
- **The card is never hidden while the target is looked for.** It is simply shown, in the middle if the target is not found yet.
- **The target is found before paint.** `useTourTarget` searches in a layout effect, so an element already on the page is
  found in the same frame as the click. It keeps watching for ones that load later.
- **Next never waits for a page.** A step that lives on another page opens that page itself, and its card shows at once
  (in the middle) while the page loads, then glides to the control when it appears. The sidebar step moves on the moment its link is clicked.
- **Upcoming pages are prefetched** (the next three steps), so they are usually ready by the time the officer gets there.
- Motion is short: the spotlight and card glide in 180ms and the card's entrance (once, when the tour opens) is 200ms.

What is left is the page itself: the first visit to a page under `next dev` is compiled on demand and can take a second or two.
A production build with prefetching is much quicker.

## Keeping it true

- The words are plain data in [`src/lib/tour/tour-beats.ts`](../src/lib/tour/tour-beats.ts), so they can be reviewed without reading components.
- **Adding a sidebar entry?** A test fails until the tour has beats for it. Add it to `TOUR_SECTIONS`, `SECTION_META` and `buildTourBeats`, and give its link a `section` (the sidebar marks entries as `nav-<section>` itself).
- **Pointing at a new control?** Put `data-tour="your-name"` on it and list the name in a beat's `target`. A test fails if a beat points at a name that is not in the source, so renaming or removing a marked control is caught.
- **Renaming a button?** Search `tour-beats.ts` for the old name. The steps quote the on-screen labels.
- **Changing who can do something?** "Admin only" must match [`permissions.ts`](../src/lib/orgs/permissions.ts) and the SQL. Dues, events, documents and the roster are open to every officer; invites, roles, removals, admin transfer, the join link, member import and export, terms and undoing a verification are admin only.
- Do not mark a control that is only in some states without a `missing` line on its beat saying what to expect.

## Files

| File | Job |
|---|---|
| `src/lib/tour/tour-beats.ts` | The beats, the sidebar order, section labels and icons, progress, and `scope` (the full tour, or one page) |
| `src/lib/tour/tour-placement.ts` | The geometry: the four dim panels around the hole, and where the card goes (pure numbers, tested) |
| `src/lib/tour/use-tour-target.ts` | Finds, scrolls to and follows the real element |
| `src/lib/tour/use-officer-tour.ts` | Open, start, close, and "seen" in `localStorage` |
| `src/lib/tour/tour-request.ts` | How the **?** reaches the tour: the frame registers, the button asks. The frame decides which page's guide |
| `src/lib/use-viewport.ts` | Window size and media query hooks |
| `src/lib/tour/tour-demo.ts` | The example-data switch: the provider, `useDemoView`, and the "example data is showing" count |
| `src/lib/tour/demo/*.ts` | The example data for each page |
| `src/components/workspace/tour/demo/` | The per-page wrappers that swap it in |
| `src/components/workspace/tour/tour-example-badge.tsx` | The "Example data" pill |
| `src/components/workspace/tour/officer-tour.tsx` | The conductor: current beat, page opening, advancing, focus, keyboard |
| `src/components/workspace/tour/tour-spotlight.tsx` | The dim panels, ring and click-blocker |
| `src/components/workspace/tour/tour-card.tsx` | The card (a pure view) |
| `src/components/workspace/tour/tour-styles.tsx` | Layout, stacking, motion |
| `src/components/workspace/tour/tour-help-button.tsx` | The round **?** button |
| `workspace-frame.tsx`, `sidebar.tsx`, `profile-menu.tsx` | Mounts it, registers it, and adds **Take the tour** to the profile menu |
| `src/components/feedback/feedback-button.tsx` | Holds the corner row that **?** and Feedback share |

## Design

Follows [design.md](design.md): the card has the dialog's look (emerald-tinted header with the mark tile and the shared
close button, `--shadow-dialog`, 20px radius, the same primary and secondary buttons), tokens only, hairline borders,
`scale(0.97)` press, hover lifts behind `@media (hover: hover)`, and 44px targets on touch from the global rules.
It is not a `Dialog` because it must not center itself or hide the page, but it is `role="dialog"` with `aria-modal`,
a title, and a focus trap. The tour is above everything else (1010 to 1012, see design.md 5.4).
Motion: the ring pulses slowly, the dim panels glide between targets, the card eases in. `prefers-reduced-motion` stops all of it.

## Tests

`tests/actions/officer-tour.test.tsx`: the beats against the real source (markers, sidebar entries, routes, permissions,
copy rules), the geometry as numbers, and the card, spotlight and styles as markup. There is **no browser** in the
tests, so finding elements, scrolling, the real layout and the bottom sheet are checked by eye: see "The officer tour" in
[mobile-qa.md](mobile-qa.md), at 360px and at 1280px.
