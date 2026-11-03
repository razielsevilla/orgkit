# Routes

How URLs work in OrgKit: what exists, who can open it, which file answers it,
and what runs before it.

Paths are inside `src/app/` unless they start with `src/` or `next.config.ts`.
A folder in parentheses, like `(workspace)`, is a route group: it organizes
code and adds a shared layout, but it is not part of the URL.

**Start here if you're lost:** the folder names do not always match the URL.
See [URL to file](#url-to-file) and [The `/workspace` and `/org` prefixes](#the-workspace-and-org-prefixes).

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
| `/invite/:token` | An officer invite. Signed out: sign-in card. Signed in: accepts the invite | `invite/[token]/page.tsx` |
| `/invite/:token/start` | `POST` remembers the invite in a cookie before Google sign-in. `GET` does the same, then redirects to `/consent` | `invite/[token]/start/route.ts` |

### Needs sign-in only

| URL | What it is | File |
|---|---|---|
| `/consent` | Privacy agreement, shown once on first sign-in | `consent/page.tsx` |
| `/setup` | Old address. Redirects to `/orgs/new` | `setup/page.tsx` |

### Needs sign-in and the privacy agreement (inside the `(workspace)` group)

| URL | Who | What it is | File |
|---|---|---|---|
| `/orgs/new` | Any officer | Create your org's workspace | `(workspace)/orgs/new/page.tsx` |
| `/workspace/:id` | Officer of that org | Workspace home | `(workspace)/org/[id]/page.tsx` |
| `/org/:id` | Officer of that org | The same page, reached directly | same file |
| `/workspace/:id/officers` | Officer of that org | Officers, invites, roles | `(workspace)/workspace/[id]/officers/page.tsx` |
| `/org/:id/officers` | Officer of that org | The same page | same file |
| `/org/:id/members/join` | **Admin** of that org (others get a 404) | Manage the join link and QR code | `(workspace)/org/[id]/members/join/page.tsx` |

`:id` is an org UUID. `:token` is a secret token. A malformed value is handled
as "not found" without a database query.

---

## 2. URL to file

This is the table that answers "where is the code for this URL?"

| You see this URL in the browser | Open this folder |
|---|---|
| `/workspace/:id` | `(workspace)/org/[id]/` |
| `/org/:id` | `(workspace)/org/[id]/` |
| `/workspace/:id/officers` | `(workspace)/workspace/[id]/officers/` |
| `/org/:id/officers` | `(workspace)/workspace/[id]/officers/` |
| `/org/:id/members/join` | `(workspace)/org/[id]/members/join/` |
| `/workspace/:id/members/join` | nothing: this is a 404 |
| everything else | the folder with the same path as the URL |

---

## 3. The `/workspace` and `/org` prefixes

Two rewrites in `next.config.ts` make some pages answer to both prefixes:

| Requested URL | Served by |
|---|---|
| `/workspace/:id` | the page in `org/[id]` |
| `/org/:id/officers` | the page in `workspace/[id]/officers` |

A rewrite changes which file answers. It does not change the address bar, so the
visitor still sees the URL they asked for.

**Which prefix the app links to**

| Prefix | Used by |
|---|---|
| `/workspace/:id` (the main one) | the proxy, the sign-in callback, the invite flow, the sidebar and brand logo |
| `/org/:id` | the create-org form (after creating), the "Go to my workspace" button, the join panel's back link |
| `/org/:id/members/join` | the sidebar link to the join panel (it has no `/workspace` version) |

New links to home and officers should use `/workspace/:id`. Keep the join panel
at `/org/:id/members/join` until it gets its own rewrite or move.

---

## 4. What happens to a request

A request goes through these steps in order. Knowing the order explains most
surprising redirects.

```
Browser asks for /workspace/123/officers
  │
  ├─ 1. Proxy (src/proxy.ts)            checks the session, may redirect
  │
  ├─ 2. Rewrites (next.config.ts)       picks the file that answers
  │
  ├─ 3. (workspace) layout              signed out → /signin
  │                                     no officer profile → /consent
  │
  └─ 4. The page itself                 checks the officer's role in the
                                        database, may redirect or 404
```

### Step 1: the proxy

[`src/proxy.ts`](../src/proxy.ts) runs on every request except static files
(`_next/static`, `_next/image`, `favicon.ico` and image extensions). It sees the
URL the visitor typed, before the rewrites. Its rules, in order:

1. Validate the session with Supabase and refresh its cookies.
2. **Session older than 7 days** (`src/lib/auth/session-config.ts`): sign out and
   go to `/signin?error=session_expired`.
3. **Signed in, on `/`, `/signin`, `/register` or `/orgs/new`:**
   - has an org: go to `/workspace/:id`
   - no org, pending invite cookie: go to `/invite/:token`
   - no org, no invite: go to `/orgs/new`
4. **Signed out, on a non-public path:** go to `/signin`. Public means `/`,
   `/signin`, `/register`, `/privacy`, `/terms`, `/auth/*`, `/join/*`, `/invite/*`.
   Anything not on that list needs a session, so a forgotten route fails safe.
5. **Signed in, on `/workspace/*`:** delete the pending-invite cookie, because
   the invite flow is over.

### Step 3: the workspace gate

[`(workspace)/layout.tsx`](../src/app/(workspace)/layout.tsx) wraps `/orgs/new`,
`/org/*` and `/workspace/*`. `/consent`, `/join/*` and `/invite/*` are outside it
on purpose.

### Step 4: the page

Every page re-checks access in the database, so a changed role or a removed
officer takes effect on the very next request. Failures look like this:

| Situation | Result |
|---|---|
| Not an officer of the org (home) | "We can't find that page" card |
| Not an officer of the org (officers page) | redirect to `/workspace/:id`, which shows the same card |
| Not an admin (join panel) | 404 |
| Malformed `:id` | same as not found, with no database query |

Non-members and admins get the same wording, so a guessed org ID never confirms
that the org exists.

---

## 5. Journeys

**New officer**
`/register` or `/signin` → Google → `/auth/callback` → `/consent` → agree →
`/orgs/new` → create → `/org/:id`

**Returning officer**
`/signin` → Google → `/auth/callback` → `/workspace/:id`
(or `/orgs/new` if they have no org yet)

**Invited officer**
`/invite/:token` → "Continue with Google" (the cookie is set through
`POST /invite/:token/start`) → Google → `/auth/callback` → `/invite/:token` →
invite accepted → `/workspace/:id`.
A first-time invitee sees `/consent` first, then comes back to the invite. If the
Google account's email doesn't match the invite, they see a "different account
required" card.

**Student joining**
`/join/:token` (no account) → form and consent → success card. Rate limited per
device. The page sends no Referer and asks search engines not to index it,
because the token is in the URL.

**Sign out**
The `signOut` action ends the session and goes to `/signin`.

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
| `(workspace)/org/[id]/members/join/actions.ts` | `setJoinLink` |
| `invite/actions.ts` | `clearInviteCookie` |
| `join/[token]/actions.ts` | `submitJoin` |

---

## 8. Adding or changing a route

1. **Put the page where its URL says.** Avoid new rewrites. If you must add one,
   add it to sections 2 and 3 as well.
2. **Public or private?** A public page must be added to `PUBLIC_PATHS` (or the
   prefix checks) in `src/proxy.ts`. Otherwise signed-out visitors are sent to
   `/signin`.
3. **Inside `(workspace)`?** You get the sign-in and consent gate for free.
   Admin-only pages must check the role in the database, not from the URL. Use a
   404 for "not allowed" so the page's existence isn't revealed.
4. **Reads cookies or the session?** Put it inside a `<Suspense>` boundary,
   because Cache Components is on. Copy an existing page.
5. **Secret in the URL?** Follow `/join/*`: send no Referer and mark it `noindex`.
6. **Update this file.**

---

## 9. Known quirks

Documented so nobody has to rediscover them. These are the current behavior,
not recommendations.

- Home and officers each have two URLs. Their folders don't match the main URL.
- `/workspace/:id/members/join` is a 404; only `/org/:id/members/join` exists.
- The links to home are split between `/workspace/:id` and `/org/:id`.
- `/orgs/new` (plural) sits next to `/org/:id` (singular).
- `/setup` only redirects to `/orgs/new` and appears unused.
- `/invite/:token` carries a secret in the URL but has no Referer or `noindex`
  protection, unlike `/join/:token`.
