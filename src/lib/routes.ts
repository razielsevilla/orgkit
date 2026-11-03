/**
 * Every path in the app, in one place. Import from here instead of typing a
 * path string, so a rename is a one-line change and a typo fails to compile.
 *
 * Kept free of imports so the node:test route checks can load it directly.
 * The full map of routes is in docs/routes.md.
 */

export const ROUTES = {
  home: "/",
  signIn: "/signin",
  register: "/register",
  privacy: "/privacy",
  terms: "/terms",
  consent: "/consent",
  authCallback: "/auth/callback",
  /** Where an officer with no org yet creates one */
  newWorkspace: "/workspace/new",
} as const;

/** An org's home. The only URL for it: /org/:id is redirected here. */
export function workspacePath(orgId: string): string {
  return `/workspace/${orgId}`;
}

export function officersPath(orgId: string): string {
  return `${workspacePath(orgId)}/officers`;
}

/** The admin-only page that manages the public join link and QR code */
export function joinPanelPath(orgId: string): string {
  return `${workspacePath(orgId)}/members/join`;
}

/** An officer invite. The token is a secret. */
export function invitePath(token: string): string {
  return `/invite/${token}`;
}

/** Remembers an invite in a cookie before sign-in. Pass an already-encoded token. */
export function inviteStartPath(token: string): string {
  return `${invitePath(token)}/start`;
}

/** The public link students open to join an org. The token is a secret. */
export function joinLinkPath(token: string): string {
  return `/join/${token}`;
}

/** The sign-in page, optionally showing an error (see docs/routes.md for the codes) */
export function signInPath(error?: string): string {
  return error ? `${ROUTES.signIn}?error=${error}` : ROUTES.signIn;
}

/**
 * Where a signed-in officer belongs next. Their org comes first, then a pending
 * invite, then the create screen. After a fresh Google sign-in the invite wins
 * over an existing org, so pass `inviteFirst`.
 */
export function officerLandingPath({
  orgId,
  pendingInvite,
  inviteFirst = false,
}: {
  orgId?: string | null;
  pendingInvite?: string | null;
  inviteFirst?: boolean;
}): string {
  if (inviteFirst && pendingInvite) return invitePath(pendingInvite);
  if (orgId) return workspacePath(orgId);
  if (pendingInvite) return invitePath(pendingInvite);
  return ROUTES.newWorkspace;
}

// ── Who may open what ─────────────────────────────────────────────────────

const PUBLIC_EXACT: readonly string[] = [
  ROUTES.home,
  ROUTES.signIn,
  ROUTES.register,
  ROUTES.privacy,
  ROUTES.terms,
  "/auth",
  "/invite",
];

// Member join links (A4) and invites open with no account
const PUBLIC_PREFIXES: readonly string[] = ["/auth/", "/join/", "/invite/"];

/** Pages a signed-out visitor may open. Everything else needs a session. */
export function isPublicPath(pathname: string): boolean {
  return PUBLIC_EXACT.includes(pathname) || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

/**
 * Every page and route that is not public. A test compares this list and the
 * public rules above against the files in src/app, so a new route has to be
 * classified here (or made public) before the tests pass.
 */
export const PRIVATE_ROUTES: readonly string[] = [
  "/consent",
  "/workspace/new",
  "/workspace/:id",
  "/workspace/:id/officers",
  "/workspace/:id/members/join",
];

/**
 * URL prefixes whose path holds a secret token. They are sent without a
 * Referer and marked noindex (see next.config.ts, which lists the same ones).
 */
export const SECRET_URL_PREFIXES: readonly string[] = ["/join/", "/invite/"];
