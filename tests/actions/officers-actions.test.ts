import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";

/**
 * Calls the real Server Actions in officers-actions.ts with a fake Supabase
 * client. The fake records every rpc() call, so the tests can check both what an
 * action returns and whether it reached the database at all.
 */

interface FakeState {
  user: { id: string } | null;
  /** The caller's membership row; null means they are not in the org */
  callerRole: string | null;
  org: { id: string; name: string } | null;
  memberships: { officer_id: string; role: string; joined_at: string }[];
  invites: Record<string, unknown>[];
  profiles: { id: string; full_name: string; email: string }[];
  rpcResult: { data?: unknown; error?: { message: string } | null };
  rpcCalls: { fn: string; args: Record<string, unknown> }[];
}

const state: FakeState = {
  user: null,
  callerRole: null,
  org: null,
  memberships: [],
  invites: [],
  profiles: [],
  rpcResult: { data: null, error: null },
  rpcCalls: [],
};

function query(table: string) {
  const result = () => {
    switch (table) {
      case "org_officers":
        return { data: state.memberships, error: null };
      case "org_invites":
        return { data: state.invites, error: null };
      case "officers":
        return { data: state.profiles, error: null };
      default:
        return { data: [], error: null };
    }
  };
  const single = () => {
    if (table === "org_officers") {
      return { data: state.callerRole ? { role: state.callerRole } : null, error: null };
    }
    if (table === "orgs") return { data: state.org, error: null };
    return { data: null, error: null };
  };
  const builder: Record<string, unknown> = {
    select: () => builder,
    eq: () => builder,
    in: () => builder,
    is: () => builder,
    gt: () => builder,
    order: () => builder,
    maybeSingle: async () => single(),
    then: (resolve: (v: unknown) => unknown) => Promise.resolve(result()).then(resolve),
  };
  return builder;
}

const fakeClient = {
  auth: { getUser: async () => ({ data: { user: state.user } }) },
  from: (table: string) => query(table),
  rpc: async (fn: string, args: Record<string, unknown>) => {
    state.rpcCalls.push({ fn, args });
    return state.rpcResult;
  },
};

vi.mock("@/src/lib/supabase/server", () => ({ createClient: async () => fakeClient }));
vi.mock("@/src/lib/supabase/service-role", () => ({ createAdminClient: () => fakeClient }));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ host: "orgkit.test", "x-forwarded-proto": "https" }),
}));

const {
  createOfficerInvite,
  revokeOfficerInvite,
  updateOfficerRole,
  removeWorkspaceOfficer,
  getWorkspaceOfficers,
} = await import("@/src/app/(workspace)/officers-actions");

const ORG = "11111111-1111-4111-8111-111111111111";
const ME = "22222222-2222-4222-8222-222222222222";
const OTHER = "33333333-3333-4333-8333-333333333333";

beforeEach(() => {
  state.user = { id: ME };
  state.callerRole = "admin";
  state.org = { id: ORG, name: "Chess Club" };
  state.memberships = [];
  state.invites = [];
  state.profiles = [];
  state.rpcResult = { data: null, error: null };
  state.rpcCalls = [];
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("createOfficerInvite", () => {
  it("sends the hash and a normalized email to the database, and returns a one-time link", async () => {
    state.rpcResult = { data: { invite_id: "x" }, error: null };
    const res = await createOfficerInvite(ORG, "  New.Officer@School.EDU ", "finance");

    expect(res.success).toBe(true);
    const { rawToken, inviteUrl } = res.data!;
    expect(inviteUrl).toBe(`https://orgkit.test/invite/${rawToken}`);

    expect(state.rpcCalls).toHaveLength(1);
    const { fn, args } = state.rpcCalls[0];
    expect(fn).toBe("create_invite");
    expect(args.p_email).toBe("new.officer@school.edu");
    expect(args.p_role).toBe("finance");
    expect(args.p_token_hash).toBe(createHash("sha256").update(rawToken).digest("hex"));
    expect(args.p_token_hash).not.toBe(rawToken);
  });

  it("shows a message under the field for a bad email, without touching the database", async () => {
    for (const bad of ["", "   ", "not-an-email", "a@b"]) {
      const res = await createOfficerInvite(ORG, bad, "officer");
      expect(res.success).toBe(false);
      expect(res.error).toBe("invalid_email");
      expect(res.errorMessage).toBeTruthy();
    }
    expect(state.rpcCalls).toHaveLength(0);
  });

  it("refuses finance and officer roles even when called directly", async () => {
    for (const role of ["finance", "officer"]) {
      state.callerRole = role;
      const res = await createOfficerInvite(ORG, "x@school.edu", "officer");
      expect(res.success).toBe(false);
      expect(res.error).toBe("not_authorized");
    }
    expect(state.rpcCalls).toHaveLength(0);
  });

  it("tells a removed officer they no longer have access", async () => {
    state.callerRole = null;
    const res = await createOfficerInvite(ORG, "x@school.edu", "officer");
    expect(res.error).toBe("access_revoked");
    expect(res.errorMessage).toBe("You no longer have access to this org.");
    expect(state.rpcCalls).toHaveLength(0);
  });

  it("requires a signed-in user", async () => {
    state.user = null;
    const res = await createOfficerInvite(ORG, "x@school.edu", "officer");
    expect(res.error).toBe("not_authenticated");
    expect(state.rpcCalls).toHaveLength(0);
  });

  it("rejects an unknown role", async () => {
    const res = await createOfficerInvite(ORG, "x@school.edu", "owner" as never);
    expect(res.success).toBe(false);
    expect(state.rpcCalls).toHaveLength(0);
  });

  it.each([
    ["already_officer", "already_officer", /already an officer/i],
    ["officer_limit_reached", "officer_limit_reached", /30 officers/],
    ["invite_limit_reached", "invite_limit_reached", /30 pending invites/],
    ["not_authorized", "not_authorized", /Only admins/],
  ])("maps the database error %s to a clear message", async (dbMessage, code, text) => {
    state.rpcResult = { error: { message: `P0001: ${dbMessage}` } };
    const res = await createOfficerInvite(ORG, "x@school.edu", "officer");
    expect(res.success).toBe(false);
    expect(res.error).toBe(code);
    expect(res.errorMessage).toMatch(text);
  });
});

const INVITE = "44444444-4444-4444-8444-444444444444";

describe("revokeOfficerInvite", () => {
  it("revokes through the database for an admin", async () => {
    const res = await revokeOfficerInvite(ORG, INVITE);
    expect(res.success).toBe(true);
    expect(state.rpcCalls).toEqual([{ fn: "revoke_invite", args: { p_invite_id: INVITE } }]);
  });

  it("refuses non-admins before reaching the database", async () => {
    state.callerRole = "officer";
    const res = await revokeOfficerInvite(ORG, INVITE);
    expect(res.error).toBe("not_authorized");
    expect(state.rpcCalls).toHaveLength(0);
  });

  it("rejects an invite ID that is not a UUID without reaching the database", async () => {
    const res = await revokeOfficerInvite(ORG, "inv-1");
    expect(res.success).toBe(false);
    expect(res.error).toBe("failed");
    expect(state.rpcCalls).toHaveLength(0);
  });
});

describe("shared access rules", () => {
  it("says a signed-out caller must sign in, on every action", async () => {
    state.user = null;
    const results = [
      await getWorkspaceOfficers(ORG),
      await createOfficerInvite(ORG, "x@school.edu", "officer"),
      await revokeOfficerInvite(ORG, INVITE),
      await updateOfficerRole(ORG, OTHER, "officer"),
      await removeWorkspaceOfficer(ORG, OTHER),
    ];
    for (const res of results) {
      expect(res.error).toBe("not_authenticated");
      expect(res.errorMessage).toBe("You must be signed in.");
    }
    expect(state.rpcCalls).toHaveLength(0);
  });

  it("treats a malformed org ID as no access", async () => {
    const res = await removeWorkspaceOfficer("not-a-uuid", OTHER);
    expect(res.error).toBe("access_revoked");
    expect(state.rpcCalls).toHaveLength(0);
  });

  it("rejects a target officer ID that is not a UUID", async () => {
    for (const res of [
      await updateOfficerRole(ORG, "someone", "officer"),
      await removeWorkspaceOfficer(ORG, "someone"),
    ]) {
      expect(res.success).toBe(false);
      expect(res.error).toBe("failed");
    }
    expect(state.rpcCalls).toHaveLength(0);
  });

  it("hides what a thrown error says behind a generic message", async () => {
    state.rpcResult = undefined as never; // makes the action throw reading .error
    const res = await removeWorkspaceOfficer(ORG, OTHER);
    expect(res.success).toBe(false);
    expect(res.error).toBe("failed");
    expect(res.errorMessage).toBe("An unexpected error occurred while removing officer.");
  });

  it("maps each database refusal to its own message", async () => {
    const cases: [string, string][] = [
      ["already_officer", "This person is already an officer of this org."],
      ["officer_limit_reached", "This org has reached the maximum of 30 officers."],
      ["invite_limit_reached", "This org has reached the maximum of 30 pending invites."],
      ["not_authorized", "Only admins can invite officers."],
    ];
    for (const [code, message] of cases) {
      state.rpcResult = { error: { message: `ERROR: ${code}` } };
      const res = await createOfficerInvite(ORG, "x@school.edu", "officer");
      expect(res.error).toBe(code);
      expect(res.errorMessage).toBe(message);
    }

    state.rpcResult = { error: { message: "relation does not exist" } };
    const res = await createOfficerInvite(ORG, "x@school.edu", "officer");
    expect(res.error).toBe("failed");
    expect(res.errorMessage).not.toMatch(/relation/);
  });
});

describe("updateOfficerRole", () => {
  it("changes a role through the database for an admin", async () => {
    const res = await updateOfficerRole(ORG, OTHER, "finance");
    expect(res.success).toBe(true);
    expect(state.rpcCalls).toEqual([{ fn: "change_role", args: { p_officer_id: OTHER, p_role: "finance" } }]);
  });

  it("refuses non-admins before reaching the database", async () => {
    state.callerRole = "finance";
    const res = await updateOfficerRole(ORG, OTHER, "admin");
    expect(res.error).toBe("not_authorized");
    expect(state.rpcCalls).toHaveLength(0);
  });

  it("rejects an invalid role", async () => {
    const res = await updateOfficerRole(ORG, OTHER, "owner" as never);
    expect(res.error).toBe("invalid_role");
    expect(state.rpcCalls).toHaveLength(0);
  });

  it("explains why the last admin cannot be changed", async () => {
    state.rpcResult = { error: { message: "last_admin" } };
    const res = await updateOfficerRole(ORG, ME, "officer");
    expect(res.error).toBe("last_admin");
    expect(res.errorMessage).toBe("Every org needs at least one admin. Make someone else an admin first.");
  });
});

describe("removeWorkspaceOfficer", () => {
  it("removes through the database for an admin", async () => {
    const res = await removeWorkspaceOfficer(ORG, OTHER);
    expect(res.success).toBe(true);
    expect(state.rpcCalls).toEqual([{ fn: "remove_officer", args: { p_officer_id: OTHER } }]);
  });

  it("refuses non-admins before reaching the database", async () => {
    state.callerRole = "officer";
    const res = await removeWorkspaceOfficer(ORG, OTHER);
    expect(res.error).toBe("not_authorized");
    expect(state.rpcCalls).toHaveLength(0);
  });

  it("explains why the last admin cannot be removed", async () => {
    state.rpcResult = { error: { message: "last_admin" } };
    const res = await removeWorkspaceOfficer(ORG, ME);
    expect(res.error).toBe("last_admin");
    expect(res.errorMessage).toBe("Every org needs at least one admin. Make someone else an admin first.");
  });

  it("tells a removed officer they no longer have access", async () => {
    state.callerRole = null;
    const res = await removeWorkspaceOfficer(ORG, OTHER);
    expect(res.error).toBe("access_revoked");
    expect(res.errorMessage).toBe("You no longer have access to this org.");
  });
});

describe("getWorkspaceOfficers", () => {
  beforeEach(() => {
    state.memberships = [
      { officer_id: ME, role: "admin", joined_at: "2026-11-01T00:00:00Z" },
      { officer_id: OTHER, role: "finance", joined_at: "2026-11-02T00:00:00Z" },
    ];
    state.profiles = [
      { id: ME, full_name: "Ana Admin", email: "ana@school.edu" },
      { id: OTHER, full_name: "Fin Ance", email: "fin@school.edu" },
    ];
    state.invites = [
      {
        id: "inv-1",
        role: "officer",
        email: "pending@school.edu",
        created_at: "2026-11-03T00:00:00Z",
        expires_at: "2026-11-10T00:00:00Z",
      },
    ];
  });

  it("gives an admin the emails and the management flags", async () => {
    const res = await getWorkspaceOfficers(ORG);
    expect(res.success).toBe(true);
    const data = res.data!;
    expect(data.officers.map((o) => o.email)).toEqual(["ana@school.edu", "fin@school.edu"]);
    expect(data.pendingInvites[0].email).toBe("pending@school.edu");
    expect(data.canInvite && data.canManageRoles && data.canRemove).toBe(true);
    expect(data.adminCount).toBe(1);
    expect(data.officers.find((o) => o.id === ME)?.isCurrentUser).toBe(true);
  });

  it.each(["finance", "officer"])("shows a %s officer the list and roles but no emails or controls", async (role) => {
    state.callerRole = role;
    const res = await getWorkspaceOfficers(ORG);
    expect(res.success).toBe(true);
    const data = res.data!;
    expect(data.officers.map((o) => o.fullName)).toEqual(["Ana Admin", "Fin Ance"]);
    expect(data.officers.map((o) => o.role)).toEqual(["admin", "finance"]);
    expect(data.officers.every((o) => o.email === null)).toBe(true);
    expect(data.pendingInvites).toHaveLength(1);
    expect(data.pendingInvites[0].email).toBeNull();
    expect(data.canInvite).toBe(false);
    expect(data.canManageRoles).toBe(false);
    expect(data.canRemove).toBe(false);
    expect(JSON.stringify(data)).not.toContain("@school.edu");
  });

  it("refuses someone who is not in the org", async () => {
    state.callerRole = null;
    const res = await getWorkspaceOfficers(ORG);
    expect(res.success).toBe(false);
    expect(res.error).toBe("access_revoked");
    expect(res.errorMessage).toBe("You no longer have access to this org.");
  });

  it("hides the invite button once the org is at 30 pending invites", async () => {
    state.invites = Array.from({ length: 30 }, (_, i) => ({
      id: `inv-${i}`,
      role: "officer",
      email: `p${i}@school.edu`,
      created_at: "2026-11-03T00:00:00Z",
      expires_at: "2026-11-10T00:00:00Z",
    }));
    const res = await getWorkspaceOfficers(ORG);
    expect(res.data!.canInvite).toBe(false);
  });
});
