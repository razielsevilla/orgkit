import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The consent screen's two server actions. `redirect()` from next/navigation works by
 * throwing, so the fake does too: code after a redirect must never run, and the tests
 * read where the visitor was sent from the thrown value.
 */

class Redirect extends Error {
  constructor(public readonly to: string) {
    super(`NEXT_REDIRECT ${to}`);
  }
}

interface FakeState {
  user: {
    id: string;
    email?: string;
    identities?: unknown[];
    user_metadata?: Record<string, unknown>;
  } | null;
  signOutCalls: number;
  /** How many times the service-role client was created: signed-out visitors must never get one */
  adminClientsCreated: number;
  /** What the officers lookup answers */
  officerLookup: { data: unknown; error: { message: string; code?: string } | null };
  lookups: { table: string; column: string; value: unknown }[];
  deleteCalls: string[];
  deleteResult: { error: { message: string; code?: string } | null };
  /** The invite token remembered in the visitor's cookie, if any */
  pendingInvite: string | null;
  /** Every row inserted through the service-role client */
  inserts: { table: string; row: Record<string, unknown> }[];
  insertResult: { error: { message: string; code?: string } | null };
}

const state: FakeState = {
  user: null,
  signOutCalls: 0,
  adminClientsCreated: 0,
  officerLookup: { data: null, error: null },
  lookups: [],
  deleteCalls: [],
  deleteResult: { error: null },
  pendingInvite: null,
  inserts: [],
  insertResult: { error: null },
};

vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Redirect(to);
  },
}));

vi.mock("@/src/lib/auth/session-user", () => ({
  getSessionUser: async () => ({
    user: state.user,
    supabase: {
      auth: {
        signOut: async () => {
          state.signOutCalls += 1;
          return { error: null };
        },
      },
    },
  }),
}));

vi.mock("@/src/lib/auth/session-invite", () => ({
  getPendingInviteCookie: async () => state.pendingInvite,
}));

vi.mock("@/src/lib/supabase/service-role", () => ({
  createAdminClient: () => {
    state.adminClientsCreated += 1;
    return {
      from: (table: string) => ({
        insert: async (row: Record<string, unknown>) => {
          state.inserts.push({ table, row });
          return state.insertResult;
        },
        select: () => ({
          eq: (column: string, value: unknown) => ({
            maybeSingle: async () => {
              state.lookups.push({ table, column, value });
              return state.officerLookup;
            },
          }),
        }),
      }),
      auth: {
        admin: {
          deleteUser: async (id: string) => {
            state.deleteCalls.push(id);
            return state.deleteResult;
          },
        },
      },
    };
  },
}));

const { acceptConsent, declineConsent } = await import("@/src/app/consent/actions");

const USER_ID = "22222222-2222-4222-8222-222222222222";
const USER_EMAIL = "new.person@school.edu";

/** Runs an action that always ends in a redirect, and returns where it went */
async function destinationOf(run: () => Promise<unknown>): Promise<string> {
  try {
    await run();
  } catch (err) {
    if (err instanceof Redirect) return err.to;
    throw err;
  }
  throw new Error("the action finished without redirecting");
}

let errorSpy: ReturnType<typeof vi.spyOn>;

const logged = () =>
  errorSpy.mock.calls.map(([line]: unknown[]) => JSON.parse(String(line)) as Record<string, any>);

beforeEach(() => {
  state.user = { id: USER_ID, email: USER_EMAIL };
  state.signOutCalls = 0;
  state.adminClientsCreated = 0;
  state.officerLookup = { data: null, error: null };
  state.lookups = [];
  state.deleteCalls = [];
  state.deleteResult = { error: null };
  state.pendingInvite = null;
  state.inserts = [];
  state.insertResult = { error: null };
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  errorSpy.mockRestore();
  vi.useRealTimers();
});

describe("declineConsent", () => {
  it("for a signed-out visitor: signs out, goes to sign-in, and never touches the database", async () => {
    state.user = null;

    expect(await destinationOf(declineConsent)).toBe("/signin");

    expect(state.signOutCalls).toBe(1);
    expect(state.adminClientsCreated).toBe(0);
    expect(state.deleteCalls).toEqual([]);
  });

  describe("a new sign-in with no officer behind it", () => {
    it("deletes that sign-in record (and only that one), then signs out and goes to sign-in", async () => {
      state.officerLookup = { data: null, error: null };

      expect(await destinationOf(declineConsent)).toBe("/signin");

      // it asked the officers table about this user, by ID...
      expect(state.lookups).toEqual([{ table: "officers", column: "id", value: USER_ID }]);
      // ...and removed exactly this user's sign-in record
      expect(state.deleteCalls).toEqual([USER_ID]);
      expect(state.signOutCalls).toBe(1);
      expect(logged()).toEqual([]);
    });

    it("logs a failed delete, and the user is still signed out and sent to sign-in", async () => {
      state.deleteResult = { error: { message: "auth service unavailable", code: "unexpected_failure" } };

      expect(await destinationOf(declineConsent)).toBe("/signin");

      expect(state.deleteCalls).toEqual([USER_ID]);
      expect(state.signOutCalls).toBe(1);
      const entries = logged();
      expect(entries).toHaveLength(1);
      expect(entries[0]).toMatchObject({
        level: "error",
        event: "consent.remove_declined_failed",
        context: { userId: USER_ID, error: { message: "auth service unavailable", code: "unexpected_failure" } },
      });
      expect(JSON.stringify(entries)).not.toContain(USER_EMAIL);
    });
  });

  describe("an existing officer", () => {
    it("is never deleted: the officer row is found, so only the session is ended", async () => {
      state.officerLookup = { data: { id: USER_ID }, error: null };

      expect(await destinationOf(declineConsent)).toBe("/signin");

      expect(state.deleteCalls).toEqual([]);
      expect(state.signOutCalls).toBe(1);
      expect(logged()).toEqual([]);
    });
  });

  describe("when the officer lookup itself fails", () => {
    const lookupFailure = { message: "connection reset by peer", code: "08006" };

    it("does NOT delete anything: a failed lookup looks like 'no officer' but proves nothing", async () => {
      // This is the case that used to delete the sign-in record of an existing officer,
      // which cascades to their officer row, org memberships and audit records.
      state.officerLookup = { data: null, error: lookupFailure };

      await destinationOf(declineConsent);

      expect(state.deleteCalls).toEqual([]);
    });

    it("logs it at error level with the user's ID and the database error, and no email", async () => {
      state.officerLookup = { data: null, error: lookupFailure };

      await destinationOf(declineConsent);

      const entries = logged();
      expect(entries).toHaveLength(1);
      expect(entries[0]).toMatchObject({
        level: "error",
        event: "consent.decline_lookup_failed",
        context: { userId: USER_ID, error: { message: "connection reset by peer", code: "08006" } },
      });
      expect(JSON.stringify(entries)).not.toContain(USER_EMAIL);
    });

    it("signs the user out and redirects the way the other failure paths do", async () => {
      state.officerLookup = { data: null, error: lookupFailure };

      expect(await destinationOf(declineConsent)).toBe("/signin?error=google_error");
      expect(state.signOutCalls).toBe(1);
    });

    it("does not delete even if the failing lookup also returned a row", async () => {
      state.officerLookup = { data: { id: USER_ID }, error: lookupFailure };

      await destinationOf(declineConsent);

      expect(state.deleteCalls).toEqual([]);
      expect(state.signOutCalls).toBe(1);
    });
  });
});

const INVITE = "b".repeat(43);

/** A signed-in Google user, as Supabase hands it over */
const googleUser = (over: Record<string, unknown> = {}) => ({
  id: USER_ID,
  email: USER_EMAIL,
  identities: [{ provider: "google", identity_data: { sub: "google-123" } }],
  user_metadata: { full_name: "New Person" },
  ...over,
});

function consentForm(fields: Record<string, string> = { agree: "on" }): FormData {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.append(key, value);
  return form;
}

describe("acceptConsent", () => {
  beforeEach(() => {
    state.user = googleUser();
  });

  describe("before anything is written", () => {
    it("sends the visitor back to the consent screen unless the box is exactly ticked, touching nothing", async () => {
      for (const agree of [undefined, "", "off", "true", "yes", "ON"]) {
        const fields: Record<string, string> = agree === undefined ? {} : { agree };

        expect(await destinationOf(() => acceptConsent(consentForm(fields)))).toBe("/consent");
      }
      expect(state.adminClientsCreated).toBe(0);
      expect(state.inserts).toEqual([]);
      expect(state.signOutCalls).toBe(0);
    });

    it("sends a signed-out visitor to sign-in and writes nothing", async () => {
      state.user = null;

      expect(await destinationOf(() => acceptConsent(consentForm()))).toBe("/signin");

      expect(state.adminClientsCreated).toBe(0);
      expect(state.inserts).toEqual([]);
    });

    it("signs out and writes nothing when the Google account has no permanent ID", async () => {
      state.user = googleUser({ identities: [], user_metadata: {} });

      expect(await destinationOf(() => acceptConsent(consentForm()))).toBe("/signin?error=google_error");

      expect(state.signOutCalls).toBe(1);
      expect(state.adminClientsCreated).toBe(0);
      expect(state.inserts).toEqual([]);
    });

    it("does not treat the email as an identity: a user with an email but no Google ID is refused", async () => {
      state.user = googleUser({ identities: [], user_metadata: {}, email: "someone@school.edu" });

      expect(await destinationOf(() => acceptConsent(consentForm()))).toBe("/signin?error=google_error");
      expect(state.inserts).toEqual([]);
    });
  });

  describe("the officer row it writes", () => {
    it("is exactly the signed-in user's details, consent version v1, and one timestamp for all three dates", async () => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date("2026-11-20T10:00:00.000Z"));

      await destinationOf(() => acceptConsent(consentForm()));

      expect(state.inserts).toEqual([
        {
          table: "officers",
          row: {
            id: USER_ID,
            google_sub: "google-123",
            email: USER_EMAIL,
            full_name: "New Person",
            consent_version: "v1",
            consent_at: "2026-11-20T10:00:00.000Z",
            created_at: "2026-11-20T10:00:00.000Z",
            last_sign_in_at: "2026-11-20T10:00:00.000Z",
          },
        },
      ]);
    });

    it("comes only from the verified session, never from anything the form sends", async () => {
      await destinationOf(() =>
        acceptConsent(
          consentForm({
            agree: "on",
            id: "99999999-9999-4999-8999-999999999999",
            email: "attacker@evil.example",
            full_name: "Attacker",
            google_sub: "google-attacker",
            consent_version: "v999",
          })
        )
      );

      expect(state.inserts).toHaveLength(1);
      const row = state.inserts[0].row;
      expect(row.id).toBe(USER_ID);
      expect(row.email).toBe(USER_EMAIL);
      expect(row.full_name).toBe("New Person");
      expect(row.google_sub).toBe("google-123");
      expect(row.consent_version).toBe("v1");
    });

    it("uses an empty email and name when the account has none, and falls back to the 'name' field", async () => {
      state.user = googleUser({ email: undefined, user_metadata: { sub: "google-123" } });
      await destinationOf(() => acceptConsent(consentForm()));
      expect(state.inserts[0].row.email).toBe("");
      expect(state.inserts[0].row.full_name).toBe("");

      state.inserts = [];
      state.user = googleUser({ user_metadata: { name: "Only A Name" } });
      await destinationOf(() => acceptConsent(consentForm()));
      expect(state.inserts[0].row.full_name).toBe("Only A Name");
    });
  });

  describe("where the officer lands", () => {
    it("goes to create a workspace when there is no pending invite, signing nobody out", async () => {
      expect(await destinationOf(() => acceptConsent(consentForm()))).toBe("/workspace/new");

      expect(state.signOutCalls).toBe(0);
      expect(logged()).toEqual([]);
    });

    it("goes to the pending invite first when the visitor arrived through an invite link", async () => {
      state.pendingInvite = INVITE;

      expect(await destinationOf(() => acceptConsent(consentForm()))).toBe(`/invite/${INVITE}`);
    });
  });

  describe("a double submit", () => {
    it("is not an error: a unique violation (23505) means the officer already exists", async () => {
      state.insertResult = { error: { message: "duplicate key value violates unique constraint", code: "23505" } };
      state.pendingInvite = INVITE;

      expect(await destinationOf(() => acceptConsent(consentForm()))).toBe(`/invite/${INVITE}`);

      expect(state.signOutCalls).toBe(0);
      expect(logged()).toEqual([]);
    });

    it("sends the same visitor to the same place when they submit twice", async () => {
      const first = await destinationOf(() => acceptConsent(consentForm()));
      state.insertResult = { error: { message: "duplicate key", code: "23505" } };
      const second = await destinationOf(() => acceptConsent(consentForm()));

      expect(first).toBe("/workspace/new");
      expect(second).toBe(first);
      expect(state.inserts).toHaveLength(2);
    });
  });

  describe("when the officer row cannot be created", () => {
    it.each([
      ["a database error", { message: "connection reset by peer", code: "08006" }],
      ["an error with no code", { message: "something odd happened" }],
      ["a different constraint failure", { message: "null value in column", code: "23502" }],
    ])("%s: logs it, signs out, and does not continue as if the account existed", async (_label, error) => {
      state.insertResult = { error };
      state.pendingInvite = INVITE;

      expect(await destinationOf(() => acceptConsent(consentForm()))).toBe("/signin?error=google_error");

      expect(state.signOutCalls).toBe(1);
      const entries = logged();
      expect(entries).toHaveLength(1);
      expect(entries[0]).toMatchObject({
        level: "error",
        event: "consent.create_officer_failed",
        context: { userId: USER_ID, error: { message: error.message } },
      });
      // no email, no name and no invite token in the log
      const line = JSON.stringify(entries);
      expect(line).not.toContain(USER_EMAIL);
      expect(line).not.toContain("New Person");
      expect(line).not.toContain(INVITE);
    });
  });
});
