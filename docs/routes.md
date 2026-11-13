# Routes

How URLs work in OrgKit: what exists, who can open it, which file answers it,
and what runs before it.

Paths are inside `src/app/` unless they start with `src/` or `next.config.ts`.
A folder in parentheses, like `(workspace)`, is a route group: it adds a shared
layout but is not part of the URL.

**The rules, in short**

1. **One URL per page, and the folders match it.** There are no rewrites. The
   page for `/workspace/:id/officers` lives in `workspace/[id]/officers/`.
2. **Never type a path string.** Import it from
   [`src/lib/routes.ts`](../src/lib/routes.ts) (`workspacePath(id)`,
   `ROUTES.signIn`, and so on).
3. **Every route is classified** as public or private in that same file. A test
   fails if you add a page and forget.

---

## 1. Every route

### Public (no account needed)

| URL | What it is | File |
|---|---|---|
| `/` | Redirects to `/register` | `page.tsx` |
| `/signin` | Sign in with Google | `signin/page.tsx` |
| `/register` | Sign up with Google | `register/page.tsx` |
| `/privacy` | Privacy notice | `privacy/page.tsx` |
| `/terms` | Terms of use | `terms/page.tsx` |
| `/auth/callback` | Google sends the browser back here after sign-in. Redirects on | `auth/callback/route.ts` |
| `/join/:token` | A student joins an org from its public link or QR code | `join/[token]/page.tsx` |
| `/checkin/:token` | A member checks in to an event from the rotating QR code, with the email they joined with. No account | `checkin/[token]/page.tsx` |
| `/invite/:token` | An officer invite. Signed out: sign-in card. Signed in: accepts the invite | `invite/[token]/page.tsx` |
| `/invite/:token/start` | `POST` remembers the invite in a cookie before Google sign-in. `GET` does the same, then redirects to `/consent` | `invite/[token]/start/route.ts` |

### Needs sign-in only

| URL | What it is | File |
|---|---|---|
| `/consent` | Privacy agreement, shown once on first sign-in | `consent/page.tsx` |

### Needs sign-in and the privacy agreement (inside the `(workspace)` group)

| URL | Who | What it is | File |
|---|---|---|---|
| `/workspace/new` | Any officer | Create your org's workspace | `(workspace)/workspace/new/page.tsx` |
| `/workspace/:id` | Officer of that org | **Home**: workspace landing | `(workspace)/workspace/[id]/page.tsx` |
| `/workspace/:id/members` | Officer of that org | **Members**: view and search roster. Admins also get **Import** (a CSV of people to invite, R3) and an **Invited** view. These are a dialog and a tab on this page, not separate URLs; the CSV upload goes through a Server Action, so `experimental.serverActions.bodySizeLimit` is set in `next.config.ts` | `(workspace)/workspace/[id]/members/page.tsx` |
| `/workspace/:id/events` | Officer of that org | **Events**: upcoming and past events with Scheduled / Cancelled status. Create, edit and cancel are dialogs on this page. Times are shown in the viewer's local time | `(workspace)/workspace/[id]/events/page.tsx` |
| `/workspace/:id/events/:eventId` | Officer of that org | **Event**: one event's details, with Edit and Cancel, and the live attendance list: who is present (name, QR or Manual, time) and "N of M present", refreshed every 5 seconds, with search-to-add and a confirmed remove. A cancelled event's list is read-only; an ended event's can still be corrected. A malformed or unknown event ID, or one from another org, shows the "We can't find that page" card | `(workspace)/workspace/[id]/events/[eventId]/page.tsx` |
| `/workspace/:id/events/:eventId/checkin` | Officer of that org | **Check-in**: a full-screen view with a QR that rotates every 30 seconds, the event title, a live count and Open / Close check-in. A cancelled event, or one that ended over an hour ago, can't be opened and the screen says why. Same "We can't find that page" card as the event page | `(workspace)/workspace/[id]/events/[eventId]/checkin/page.tsx` |
| `/workspace/:id/officers` | Officer of that org | **Invite**: officers, invites, roles | `(workspace)/workspace/[id]/officers/page.tsx` |
| `/workspace/:id/members/join` | **Admin** of that org (others get a 404) | **Join**: manage the join link and QR code | `(workspace)/workspace/[id]/members/join/page.tsx` |
| `/workspace/:id/members/export` | **Admin** of that org (others get 403) | **Export**: `POST` streams the roster as a CSV download | `(workspace)/workspace/[id]/members/export/route.ts` |

`:id` is an org UUID. `:token` is a secret token. A malformed value is handled
as "not found" without a database query. `/workspace/new` is a fixed path, so
it is never mistaken for an `:id`.

### Old addresses (redirects)

Set in `next.config.ts`. They send old bookmarks and shared links to the right
page, and run before the proxy. They are temporary (307) redirects, so they can
be made permanent later.

| Old URL | Goes to |
|---|---|
| `/org/:id` | `/workspace/:id` |
| `/org/:id/...` (for example `/org/:id/officers`, `/org/:id/members/join`) | `/workspace/:id/...` |
| `/orgs/new` | `/workspace/new` |
| `/setup` | `/workspace/new` |

Do not link to these. They exist for people who saved an old address.

---

## 2. Paths in code: `src/lib/routes.ts`

| Need | Use |
|---|---|
| A fixed page | `ROUTES.home`, `.signIn`, `.register`, `.privacy`, `.terms`, `.consent`, `.authCallback`, `.newWorkspace` |
| An org's pages | `workspacePath(id)`, `membersPath(id)`, `eventsPath(id)`, `eventPath(id, eventId)`, `checkinPath(id, eventId)`, `officersPath(id)`, `joinPanelPath(id)` |
| An invite | `invitePath(token)`, `inviteStartPath(encodedToken)` |
| A student join link | `joinLinkPath(token)` |
| Sign-in with an error | `signInPath("google_error")` |
| "Where does this officer go next?" | `officerLandingPath({ orgId, pendingInvite, inviteFirst })` |
| "May a signed-out visitor open this?" | `isPublicPath(pathname)` |

`officerLandingPath` is the one place that decides where a signed-in officer
belongs: their org first, then a pending invite, then `/workspace/new`. Right
after a fresh Google sign-in the invite wins over an existing org
(`inviteFirst`). The proxy, `/auth/callback` and `/consent` all use it.

---

## 3. What happens to a request

```
Browser asks for /workspace/123/officers
  │
  ├─ 1. Redirects (next.config.ts)      old addresses such as /org/123
  │
  ├─ 2. Proxy (src/proxy.ts)            checks the session, may redirect
  │
  ├─ 3. (workspace) layout              signed out → /signin
  │                                     no officer profile → /consent
  │
  └─ 4. The page itself                 checks the officer's role in the
                                        database, may redirect or 404
```

### Step 2: the proxy

[`src/proxy.ts`](../src/proxy.ts) runs on every request except static files
(`_next/static`, `_next/image`, `favicon.ico` and image extensions). Its rules,
in order:

1. Validate the session with Supabase and refresh its cookies.
2. **Session older than 7 days** (`src/lib/auth/session-config.ts`): sign out and
   go to `/signin?error=session_expired`.
3. **Signed in, on `/`, `/signin`, `/register` or `/workspace/new`:** go to
   `officerLandingPath({ orgId, pendingInvite })`. That is their workspace, or
   their invite, or (if neither) they stay on, or go to, `/workspace/new`.
4. **Signed out, on a non-public path:** go to `/signin`. Public means `/`,
   `/signin`, `/register`, `/privacy`, `/terms`, `/auth/*`, `/join/*`, `/invite/*`,
   `/checkin/*`
   (`isPublicPath`). Anything not on that list needs a session, so a forgotten
   route fails safe.
5. **Signed in, on `/workspace/*`:** delete the pending-invite cookie, because
   the invite flow is over.

### Step 3: the workspace gate and frame

[`(workspace)/layout.tsx`](../src/app/(workspace)/layout.tsx) wraps everything
under `/workspace/*`. `/consent`, `/join/*`, `/invite/*` and `/checkin/*` are
outside it on purpose.

[`workspace/[id]/layout.tsx`](../src/app/(workspace)/workspace/[id]/layout.tsx)
then draws the **one sidebar frame** for Home, Join and Invite. Those three pages
only render their own content. Don't build a sidebar into a page: add the page
under `workspace/[id]/` and it gets the same frame. The sidebar lists only
features that exist (**Home**, **Join** for admins, **Invite**); add an entry in
`src/components/layout/sidebar/nav-list.tsx` when a real page ships.
`/workspace/new` and the "can't find that page" screen sit outside the frame and
use the top navbar, because there is no workspace to show.

### Step 4: the page

Every page re-checks access in the database, so a changed role or a removed
officer takes effect on the very next request.

| Situation | Result |
|---|---|
| Not an officer of the org (home) | "We can't find that page" card |
| Not an officer of the org (officers page) | redirect to `/workspace/:id`, which shows the same card |
| Not an admin (join panel) | 404 |
| Not an officer of the org (events), or an event of another org | "We can't find that page" card |
| Malformed `:id` or `:eventId` | same as not found, with no database query |

Non-members and admins get the same wording, so a guessed org ID never confirms
that the org exists.

---

## 4. Journeys

**New officer**
`/register` or `/signin` → Google → `/auth/callback` → `/consent` → agree →
`/workspace/new` → create → `/workspace/:id`

**Returning officer**
`/signin` → Google → `/auth/callback` → `/workspace/:id`
(or `/workspace/new` if they have no org yet)

**Invited officer**
`/invite/:token` → "Continue with Google" (the cookie is set through
`POST /invite/:token/start`) → Google → `/auth/callback` → `/invite/:token` →
invite accepted → `/workspace/:id`.
A first-time invitee sees `/consent` first, then comes back to the invite. If the
Google account's email doesn't match the invite, they see a "different account
required" card.

**Student joining**
`/join/:token` (no account) → form and consent → success card. Rate limited per
device.

**Member check-in**
An officer opens the check-in window and shows the full-screen QR. A member scans
it → `/checkin/:token` (no account) → enters the email they joined with →
"You're checked in, <first name>". Only an active member of the event's org can
check in; an unknown, pending, inactive or other-org email gets one identical
message. An expired or tampered token, a closed window or a cancelled event shows
the "link has expired or is closed" card. Rate limited per device
(`CHECKIN_ATTEMPTS_PER_MINUTE`).

**Manual attendance**
On the event page an officer watches the list fill in (it polls every 5 seconds, no
reload). To fix it by hand they search the roster, press "Add member" and the
member appears as Manual with the officer recorded; or they remove a row after
confirming. Both update the screen first and roll back with an inline error if
the server refuses. Only active members can be added, and adding someone who is
already present (another officer, or a QR scan, got there first) never makes a
duplicate: the list just refreshes. A cancelled event is read-only.

**Sign out**
The `signOut` action ends the session and goes to `/signin`.

---

## 5. Secret URLs

`/join/:token`, `/invite/:token` and `/checkin/:token` carry a secret in the path. All are sent
with `Referrer-Policy: no-referrer` and `X-Robots-Tag: noindex, nofollow`
(`headers()` in `next.config.ts`). The prefixes are listed in
`SECRET_URL_PREFIXES` in `src/lib/routes.ts`, and a test fails if the config
misses one. A new route with a secret in its URL goes in both places.

---

## 6. Sign-in error codes

`/signin?error=<code>`

| Code | Meaning |
|---|---|
| `cancelled` | The user cancelled at Google |
| `school_blocked` | Google refused the account (school or domain policy) |
| `google_error` | Anything else that failed during sign-in |
| `session_expired` | Set by the proxy: the 7-day session ran out |

---

## 7. Server actions

Not URLs, but how pages change data.

| File | Actions |
|---|---|
| `auth/actions.ts` | `signOut` |
| `consent/actions.ts` | `acceptConsent`, `declineConsent` |
| `(workspace)/actions.ts` | `createWorkspace`, plus readers `getOrganizationById`, `getOfficerDefaultWorkspace`, `getCurrentOfficer`, `isOrgAdmin` |
| `(workspace)/officers-actions.ts` | `getWorkspaceOfficers`, `createOfficerInvite`, `revokeOfficerInvite`, `updateOfficerRole`, `removeWorkspaceOfficer` |
| `(workspace)/members-actions.ts` | `getWorkspaceMembers`, `confirmMemberAction` |
| `(workspace)/attendance-actions.ts` | `getEventAttendanceAction`, `searchAttendeeCandidatesAction`, `addAttendanceAction`, `removeAttendanceAction` |
| `(workspace)/events-actions.ts` | `getWorkspaceEvents`, `getWorkspaceEvent`, `createEventAction`, `updateEventAction`, `cancelEventAction`, `setCheckinOpenAction`, `getCheckinTokenAction` |
| `(workspace)/member-invites-actions.ts` | R3, admin only: `parseRosterCsv`, `previewMemberInvites`, `importMemberInvites`, `getMemberInvites` |
| `(workspace)/workspace/[id]/members/join/actions.ts` | `setJoinLink` |
| `invite/actions.ts` | `clearInviteCookie` |
| `join/[token]/actions.ts` | `submitJoin` |
| `checkin/[token]/actions.ts` | `submitCheckin` |

---

## 8. Adding or changing a route

1. **Put the page where its URL says.** No rewrites. If you rename or move a URL,
   add a redirect from the old one in `next.config.ts` and list it in section 1.
2. **Add helpers** for any new path to `src/lib/routes.ts`, and use them instead
   of typing the string.
3. **Classify it.** Public: make `isPublicPath` allow it. Private: add it to
   `PRIVATE_ROUTES`. Both are in `src/lib/routes.ts`.
4. **Inside `(workspace)`?** You get the sign-in and consent gate for free.
   Admin-only pages must check the role in the database, not from the URL. Use a
   404 for "not allowed" so the page's existence isn't revealed.
5. **Reads cookies or the session?** Put it inside a `<Suspense>` boundary,
   because Cache Components is on. Copy an existing page.
6. **Secret in the URL?** Add the prefix to `SECRET_URL_PREFIXES` and to
   `headers()` in `next.config.ts`.
7. **Update this file.** A test fails if a route under `src/app` isn't written
   here as `` `/like/:this` ``.
8. Run `npm test`. `tests/unit/routes.test.ts` checks the classification, the
   docs and the secret-URL headers. `tests/actions/proxy.test.ts` checks the
   proxy's redirects.

---

## 9. Behavior worth knowing

- The proxy is a quick check, not the real gate. Authorization lives in the page
  and the database, so don't add role rules to the proxy.
- After a fresh Google sign-in a pending invite wins over an existing org
  (`/auth/callback`). Inside the app an existing org wins (the proxy). Both come
  from `officerLandingPath`, which is where to change it.
- Access to a page you can't see is a 404 or the same "can't find" card as a
  page that doesn't exist.
