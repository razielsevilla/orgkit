# Mobile QA checklist (T2)

The automated tests keep the rules in place (44px targets, `100dvh`, no wide fixed
widths, wrapping dialogs), but nothing in them can **measure a real screen**. This
checklist is how T2 is actually checked. Run it before a release, and after any
change to a layout, a dialog, the sidebar or `globals.css`.

The rules it checks are in [design.md](design.md), section 5.4.

## Pass criteria (from the ticket)

On a **360px-wide** screen:

1. **No horizontal scrolling** on sign in, join, check in, events and the roster.
2. **Every dialog's buttons are reachable and not clipped**, including on a short phone and with the keyboard open.
3. **Every control you tap is at least 44 x 44px.**
4. **A table that is too wide** turns into a readable list, or scrolls inside its own box (never the whole page).
5. **Long names and long emails shorten or wrap** without breaking the layout.
6. **Loading, empty and error screens** fit as well.

## How to test

### Browser device mode (about 20 minutes)

In Chrome or Edge: open DevTools (F12), then device mode (Ctrl+Shift+M).

- Use **Responsive** and type the size: try **360 x 640** (the main one), **320 x 568** (the smallest phone), **390 x 844** and **412 x 915**. Also try **768 x 1024** (a tablet) and a normal desktop width.
- To find sideways scrolling quickly: on each screen, try to scroll right, or paste this in the console. It lists anything wider than the screen:

  ```js
  [...document.querySelectorAll("body *")]
    .filter((el) => el.getBoundingClientRect().right > document.documentElement.clientWidth + 1)
    .map((el) => el.tagName + "." + el.className)
  ```
  (A few results are expected: the closed drawer, which sits off-screen on purpose, and decorative circles.)
- To check touch sizes: in the Elements panel, hover a control and DevTools shows its width and height in a tooltip (or look at the box diagram under Computed). Anything under 44 in either direction fails, unless it is a link inside a sentence. At 640px wide or narrower the 44px rules apply on their own; on a wider window turn on the device toolbar's touch emulation, because the rules also follow `pointer: coarse`.
- Use the long test data below.

### A real phone (about 10 minutes, do not skip)

Device mode does **not** reproduce the browser's address bar and toolbar, the on-screen keyboard, or iOS zooming into a field. Test on at least **one iPhone and one Android phone**, ideally the kind your pilot orgs use. Open the deployed site, or your computer's address on the same Wi-Fi.

On the phone, also check:
- A screen's **last row** is reachable by scrolling (nothing stuck under the browser toolbar or the Feedback button).
- Tapping a text field **does not zoom the page in**.
- With the **keyboard open**, a dialog's buttons can still be reached (scroll the dialog).
- Rotating to landscape does not trap anything.

## Long test data

Add these (to a test org, never a real one) so truncation is checked with real text:

| Field | Value |
|---|---|
| Member name | `Maria Christina Santos-Dela Cruz-Villanueva` |
| Member email | `maria.christina.santos.delacruz.villanueva@verylongschoolname.edu.ph` |
| Org name | `Association of Computer Engineering and Information Technology Students of the Philippines, Manila Chapter` |
| One-word org name | `Supercalifragilisticexpialidociousorganizationofstudents` |
| Event title | `Annual General Assembly and Election of Officers for the Academic Year 2026 to 2027` |
| Dues period | `1st Semester AY 2026-2027 Membership Dues and Organizational Development Fund` |
| Reject reason | `Thereferencenumberdoesnotmatchthepaymentpleasesendtheclearscreenshotagain` |

## Screens

Mark each with Pass or Fail (and a note) in the results table at the bottom. "Fits" means no sideways scroll and nothing cut off.

### Outside the workspace

| Screen | Check |
|---|---|
| **Sign in** and **Register** | The card fits (not wider than the screen); the subtitle wraps; the Google button is easy to tap |
| **Consent** (first sign in) | Card fits; the checkbox row is easy to tap; Cancel and Continue reachable |
| **Join** `/join/<token>` | Fits in English and Filipino; the org name and long one-word org name wrap; both checkbox rows are easy to tap; language pills are 44px; Join button reachable; the success and "link isn't active" cards fit |
| **Check in** `/checkin/<token>` | Fits; email field does not zoom; the button is reachable; success and expired screens fit |
| **Pay** `/pay/<token>` | Fits; the org and period names wrap beside the amount; the screenshot upload and its remove button are easy to tap; the success screen rows wrap a long reference |
| **Invite** `/invite/<token>` | Fits; a long org name and a long "Signed in as" email wrap |
| **Privacy**, **Terms** | Fit; the back link and the logo are easy to tap |

### The workspace shell (signed in)

| Check | Pass when |
|---|---|
| Top bar | A slim bar shows a menu button, the current section and the org name; the org name shortens if long |
| Open the drawer | The menu button opens the sidebar from the left; the rest of the screen dims; the sidebar is complete (even if you collapsed it on desktop) |
| Close the drawer | The X, a tap on the dim area, the Escape key (with a keyboard) and tapping a link all close it |
| Drawer links | All five links are at least 44px tall; the active one is highlighted |
| Profile menu | Opens inside the drawer; Sign out is easy to tap |
| Keyboard | With the drawer open, Tab stays inside it; closing returns focus to the menu button |
| Rotate / resize | At 1024px and wider, the normal sidebar returns and the top bar is gone |

### The officer tour (signed in)

Two ways in. The **full tour** opens by itself on a first login (clear `orgkit_tour_v1:…` in local storage to see it again) or from the profile menu, **Take the full tour**. The **?** button (bottom right, left of Feedback) opens only the guide to the page you are on. Walk both, at 360px and at 1280px, and check that **?** on Members shows no Dues steps.

| Check | Pass when |
|---|---|
| Welcome | A card in the middle of the dimmed screen; Start tour and Skip for now are easy to tap |
| Menu step (phone) | The menu button is lit with a ring, and the card is a sheet pinned to the bottom, not covering it |
| Page steps (phone) | The tour opens each page by itself. The lit button or list is scrolled above the bottom sheet and is not covered by it. The sheet scrolls if its steps are long, with Back and Next always reachable |
| Look-only | Tapping the lit button does nothing (it is for looking at); tapping the dim area does nothing |
| Sidebar steps (desktop) | The sidebar entry is lit, the card sits to its right, and clicking the entry opens the page and moves on |
| Nothing to point at | On an empty org, a step such as "Manage one member" shows the card in the middle with a "Nothing to point at yet" note, not a ring around nothing |
| Admin only | As a non-admin, an Admin only step has no ring and says to ask an admin |
| Keyboard | Tab stays inside the card; the arrow keys move; Escape ends the tour and focus goes back to the ? button |
| Rotate / resize | Crossing 1024px mid-tour keeps the step and re-points it, with no stuck dim layer |
| Reduced motion | The ring does not pulse and the card does not slide |
| Example data | In a brand-new workspace every page shows made-up data while the tour is open (Home populated, a roster, a dues period, events, terms, documents, handover), with an "Example data for the tour" pill at the top and a note on the card. Closing the tour returns the real, empty page. In a workspace that already has data, the real data stays |
| Example data on a phone | The pill does not cover the card or the menu button, and the examples fit at 360px (members cards, dues cards) |

### Workspace screens

| Screen | Check |
|---|---|
| **Home** | Fits |
| **Members** (roster) | Cards, not a table; long name and email shorten; filter chips scroll sideways **inside their own strip**; search box is a normal height (not tall); the Details toggle and every action button are 44px; the pager shows "Page X of Y" with arrows |
| **Members: Invited** | Cards; long email wraps; Load more is easy to tap |
| **Add members** dialog | The join link, QR and all the buttons are reachable by scrolling the dialog; the close button does not cover the title |
| **Import**, **Export**, **Edit member**, **Deactivate**, **Attendance history** dialogs | Fit; buttons stack full width on a phone; reachable with the keyboard open |
| **Dues** | The period picker opens inside the screen (long period name too); summary tiles fit; the member list is cards up to 800px; reference numbers and long emails shorten; the pager shows "Page X of Y" |
| **Dues dialogs**: Review queue, Reject, Undo, Pay link, Reminders, Period, Close period | Fit; the **Pay link** link box and its Copy button fit side by side; the on and off confirmations wrap; reachable with the keyboard open |
| **Receipt lightbox** (tap a payment screenshot) | The enlarged image covers the **whole screen**, not just the dialog; the close button is 44px; Escape closes only the image |
| **Events** list | Cards; long titles wrap; New event is easy to tap; the last card is not under the Feedback button |
| **Event** page | Fits; "All events" link, Check-in, Edit and Cancel are 44px; the attendance list is stacked rows; long names shorten; search and Add are easy to tap |
| **Check-in screen** (full screen QR) | The QR and live count fit; Open and Close check-in reachable; "Back to event" is easy to tap |
| **Event form** dialog | Date and time fields fit side by side; Discard and "Ends on a different day" are 44px |
| **Invite** (officers) | Long names and emails shorten or wrap; the role select stretches full width; Remove and Copy new link are 44px |
| **Invite officer** dialog | The three role cards fit and are easy to tap |
| **Feedback** button and dialog | The round button does not cover a main action; the dialog fits; the message box is 16px (no zoom) |
| **Owner pages** (`/owner/usage`, `/owner/feedback`) | The usage report is cards; feedback cards wrap long words |
| **Loading, empty and error** states | Skeletons fit (the Dues skeleton's period row wraps); empty states fit; an error banner's message and button stack |

## Results

Copy a row per run. Note the date, who ran it, the devices, and anything that failed (with the screen).

| Date | Run by | Browser sizes tried | Real devices (model, browser) | Screens that failed | Fixed on |
|---|---|---|---|---|---|
| | | | | | |
