import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The Google sign-in callback decides where every officer lands, so each branch
 * is pinned here: Google errors, a failed code exchange, first-time officers,
 * returning officers with and without an org, and a pending invite.
 */

interface FakeState {
  exchange: { data: { user: unknown }; error: unknown };
  officer: { id: string; email: string } | null;
  officerQueryError: unknown;
  updateError: unknown;
  membership: { org_id: string } | null;
  pendingInvite: string | null;
  signOutCalls: number;
  updates: Record<string, unknown>[];
}

const state: FakeState = {
  exchange: { data: { user: null }, error: null },
  officer: null,
  officerQueryError: null,
  updateError: null,
  membership: null,
  pendingInvite: null,
  signOutCalls: 0,
  updates: [],
};

function userQuery(table: string) {
  const builder: Record<string, unknown> = {
    select: () => builder,
    eq: () => builder,
    order: () => builder,
    limit: () => builder,
    maybeSingle: async () =>
      table === "org_officers" ? { data: state.membership, error: null } : { data: null, error: null },
  };
  return builder;
}

const fakeClient = {
  auth: {
    exchangeCodeForSession: async () => state.exchange,
    signOut: async () => {
      state.signOutCalls += 1;
    },
  },
  from: (table: string) => userQuery(table),
};

const fakeAdmin = {
  from: () => ({
    select: () => ({
      eq: () => ({
        maybeSingle: async () => ({ data: state.officer, error: state.officerQueryError }),
      }),
    }),
    update: (values: Record<string, unknown>) => {
      state.updates.push(values);
      return { eq: async () => ({ error: state.updateError }) };
    },
  }),
};

vi.mock("@/src/lib/supabase/server", () => ({ createClient: async () => fakeClient }));
vi.mock("@/src/lib/supabase/service-role", () => ({ createAdminClient: () => fakeAdmin }));
vi.mock("@/src/lib/auth/session-invite", () => ({
  getPendingInviteCookie: async () => state.pendingInvite,
}));

const { GET } = await import("@/src/app/auth/callback/route");

const ORIGIN = "https://orgkit.test";
const ME = "22222222-2222-4222-8222-222222222222";
const ORG = "11111111-1111-4111-8111-111111111111";
const INVITE = "b".repeat(43);

const googleUser = {
  id: ME,
  email: "me@school.edu",
  identities: [{ provider: "google", identity_data: { sub: "google-123" } }],
  user_metadata: {},
};

async function callback(query: string) {
  const res = await GET(new Request(`${ORIGIN}/auth/callback${query}`));
  return new URL(res.headers.get("location")!);
}

function destination(url: URL) {
  return url.pathname + url.search;
}

beforeEach(() => {
  state.exchange = { data: { user: googleUser }, error: null };
  state.officer = null;
  state.officerQueryError = null;
  state.updateError = null;
  state.membership = null;
  state.pendingInvite = null;
  state.signOutCalls = 0;
  state.updates = [];
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("auth callback: errors from Google", () => {
  it("sends a cancelled sign-in back with a cancelled code", async () => {
    expect(destination(await callback("?error=access_denied"))).toBe("/signin?error=cancelled");
    expect(destination(await callback("?error=x&error_description=User+cancelled"))).toBe(
      "/signin?error=cancelled"
    );
  });

  it("reports a school or policy block", async () => {
    expect(destination(await callback("?error=admin_policy_enforced"))).toBe("/signin?error=school_blocked");
    expect(destination(await callback("?error=x&error_description=domain+not+allowed"))).toBe(
      "/signin?error=school_blocked"
    );
  });

  it("reports any other Google error generically", async () => {
    expect(destination(await callback("?error=server_error"))).toBe("/signin?error=google_error");
  });

  it("goes to plain sign-in when there is no code", async () => {
    expect(destination(await callback(""))).toBe("/signin");
  });
});

describe("auth callback: session and officer lookup", () => {
  it("fails when the code exchange fails or returns no user", async () => {
    state.exchange = { data: { user: null }, error: { message: "bad" } };
    expect(destination(await callback("?code=abc"))).toBe("/signin?error=google_error");

    state.exchange = { data: { user: null }, error: null };
    expect(destination(await callback("?code=abc"))).toBe("/signin?error=google_error");
  });

  it("fails when the Google account has no permanent ID", async () => {
    state.exchange = { data: { user: { ...googleUser, identities: [], user_metadata: {} } }, error: null };
    expect(destination(await callback("?code=abc"))).toBe("/signin?error=google_error");
  });

  it("signs out instead of treating a failed lookup as a new officer", async () => {
    state.officerQueryError = { message: "db down" };
    expect(destination(await callback("?code=abc"))).toBe("/signin?error=google_error");
    expect(state.signOutCalls).toBe(1);
  });

  it("signs out when the officer row and the auth user disagree", async () => {
    state.officer = { id: "someone-else", email: "x@school.edu" };
    expect(destination(await callback("?code=abc"))).toBe("/signin?error=google_error");
    expect(state.signOutCalls).toBe(1);
    expect(state.updates).toHaveLength(0);
  });

  it("signs out when recording the sign-in fails", async () => {
    state.officer = { id: ME, email: "me@school.edu" };
    state.updateError = { message: "nope" };
    expect(destination(await callback("?code=abc"))).toBe("/signin?error=google_error");
    expect(state.signOutCalls).toBe(1);
  });
});

describe("auth callback: where an officer lands", () => {
  it("sends a first-time officer to the privacy notice", async () => {
    expect(destination(await callback("?code=abc"))).toBe("/consent");
  });

  it("sends a returning officer with an org to that workspace and records the sign-in", async () => {
    state.officer = { id: ME, email: "old@school.edu" };
    state.membership = { org_id: ORG };

    expect(destination(await callback("?code=abc"))).toBe(`/workspace/${ORG}`);
    expect(state.updates).toHaveLength(1);
    expect(state.updates[0].email).toBe("me@school.edu");
    expect(state.updates[0].last_sign_in_at).toBeTruthy();
  });

  it("sends a returning officer with no org to create one", async () => {
    state.officer = { id: ME, email: "me@school.edu" };
    expect(destination(await callback("?code=abc"))).toBe("/orgs/new");
  });

  it("lets a pending invite win over the workspace", async () => {
    state.officer = { id: ME, email: "me@school.edu" };
    state.membership = { org_id: ORG };
    state.pendingInvite = INVITE;

    expect(destination(await callback("?code=abc"))).toBe(`/invite/${INVITE}`);
  });
});
