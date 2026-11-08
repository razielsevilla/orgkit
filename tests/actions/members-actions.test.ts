import { beforeEach, describe, expect, it, vi } from "vitest";

interface FakeMember {
  id: string;
  org_id: string;
  full_name: string;
  email: string;
  status: string;
  created_at: string;
  is_pending: boolean;
}

interface FakeState {
  user: { id: string } | null;
  callerRole: string | null;
  members: FakeMember[];
  rpcCalls: { fn: string; args: Record<string, unknown> }[];
  rpcResult: { data: unknown; error: { message: string } | null };
  joinLinkToken: string | null;
}

const state: FakeState = {
  user: null,
  callerRole: null,
  members: [],
  rpcCalls: [],
  rpcResult: { data: null, error: null },
  joinLinkToken: null,
};

function query(table: string) {
  let filtered = [...state.members];
  let window: [number, number] | null = null;

  const builder: Record<string, unknown> = {
    select: (_cols: string, opts?: { count?: string; head?: boolean }) => {
      if (opts?.head && opts?.count === "exact") {
        return {
          eq: (field: string, val: unknown) => {
            let count = filtered.filter((m) => (m as unknown as Record<string, unknown>)[field] === val).length;
            const sub = {
              eq: (f2: string, v2: unknown) => {
                count = filtered
                  .filter((m) => (m as unknown as Record<string, unknown>)[field] === val)
                  .filter((m) => (m as unknown as Record<string, unknown>)[f2] === v2).length;
                return Promise.resolve({ count, error: null });
              },
              then: (res: (v: unknown) => unknown) => Promise.resolve({ count, error: null }).then(res),
            };
            return sub;
          },
        };
      }
      return builder;
    },
    eq: (field: string, val: unknown) => {
      filtered = filtered.filter((m) => (m as unknown as Record<string, unknown>)[field] === val);
      return builder;
    },
    or: (condition: string) => {
      // Mock full_name.ilike.%term%,email.ilike.%term%
      const match = condition.match(/%([^%]+)%/);
      if (match) {
        const term = match[1].toLowerCase();
        filtered = filtered.filter(
          (m) =>
            m.full_name.toLowerCase().includes(term) ||
            m.email.toLowerCase().includes(term)
        );
      }
      return builder;
    },
    order: () => builder,
    range: (from: number, to: number) => {
      window = [from, to];
      return builder;
    },
    maybeSingle: async () => {
      if (table === "org_officers") {
        return {
          data: state.callerRole ? { role: state.callerRole } : null,
          error: null,
        };
      }
      return { data: null, error: null };
    },
    then: (resolve: (v: unknown) => unknown) =>
      Promise.resolve({
        data: window ? filtered.slice(window[0], window[1] + 1) : filtered,
        count: filtered.length,
        error: null,
      }).then(resolve),
  };

  return builder;
}

const fakeClient = {
  auth: { getUser: async () => ({ data: { user: state.user } }) },
  from: (table: string) => query(table),
  rpc: async (fn: string, args: Record<string, unknown>) => {
    state.rpcCalls.push({ fn, args });
    if (fn === "get_org_join_link") {
      return { data: state.joinLinkToken, error: null };
    }
    return state.rpcResult;
  },
};

vi.mock("@/src/lib/supabase/server", () => ({ createClient: async () => fakeClient }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { getWorkspaceMembers, confirmMemberAction } = await import(
  "@/src/app/(workspace)/members-actions"
);

const ORG = "11111111-1111-4111-8111-111111111111";
const ME = "22222222-2222-4222-8222-222222222222";
const MEMBER_1 = "33333333-3333-4333-8333-333333333333";
const MEMBER_2 = "44444444-4444-4444-8444-444444444444";

beforeEach(() => {
  state.user = { id: ME };
  state.callerRole = "officer";
  state.rpcCalls = [];
  state.rpcResult = { data: "ok", error: null };
  state.joinLinkToken = "test-token-64";
  state.members = [
    {
      id: MEMBER_1,
      org_id: ORG,
      full_name: "Alice Smith",
      email: "alice@example.com",
      status: "pending",
      created_at: "2026-11-01T00:00:00Z",
      is_pending: true,
    },
    {
      id: MEMBER_2,
      org_id: ORG,
      full_name: "Bob Jones",
      email: "bob@example.com",
      status: "active",
      created_at: "2026-10-15T00:00:00Z",
      is_pending: false,
    },
  ];
});

describe("getWorkspaceMembers", () => {
  it("refuses a signed-out caller", async () => {
    state.user = null;
    const res = await getWorkspaceMembers(ORG);
    expect(res.success).toBe(false);
    expect(res.error).toBe("not_authenticated");
  });

  it("refuses an officer who does not belong to the org", async () => {
    state.callerRole = null;
    const res = await getWorkspaceMembers(ORG);
    expect(res.success).toBe(false);
    expect(res.error).toBe("access_revoked");
  });

  it("returns members for the org with counters", async () => {
    const res = await getWorkspaceMembers(ORG);
    expect(res.success).toBe(true);
    expect(res.data?.members.length).toBe(2);
    expect(res.data?.totalCount).toBe(2);
    expect(res.data?.pendingCount).toBe(1);
    expect(res.data?.matchingCount).toBe(2);
  });

  it("filters by status", async () => {
    const res = await getWorkspaceMembers(ORG, { status: "pending" });
    expect(res.success).toBe(true);
    expect(res.data?.members.length).toBe(1);
    expect(res.data?.members[0].fullName).toBe("Alice Smith");
  });

  it("searches by name or email case-insensitively and trims spaces", async () => {
    const res = await getWorkspaceMembers(ORG, { search: "  ALICE  " });
    expect(res.success).toBe(true);
    expect(res.data?.members.length).toBe(1);
    expect(res.data?.members[0].fullName).toBe("Alice Smith");

    const resEmail = await getWorkspaceMembers(ORG, { search: "  bob@  " });
    expect(resEmail.success).toBe(true);
    expect(resEmail.data?.members.length).toBe(1);
    expect(resEmail.data?.members[0].fullName).toBe("Bob Jones");
  });

  it("returns joinLinkToken when org has no members yet", async () => {
    state.members = [];
    const res = await getWorkspaceMembers(ORG);
    expect(res.success).toBe(true);
    expect(res.data?.members.length).toBe(0);
    expect(res.data?.totalCount).toBe(0);
    expect(res.data?.joinLinkToken).toBe("test-token-64");
  });
});

describe("confirmMemberAction", () => {
  it("rejects invalid UUIDs", async () => {
    const res = await confirmMemberAction("invalid-org", MEMBER_1);
    expect(res.success).toBe(false);
    expect(res.error).toBe("invalid_request");

    const res2 = await confirmMemberAction(ORG, "invalid-member");
    expect(res2.success).toBe(false);
    expect(res2.error).toBe("invalid_request");
  });

  it("refuses signed-out caller", async () => {
    state.user = null;
    const res = await confirmMemberAction(ORG, MEMBER_1);
    expect(res.success).toBe(false);
    expect(res.error).toBe("not_authenticated");
  });

  it("calls RPC confirm_member and succeeds", async () => {
    const res = await confirmMemberAction(ORG, MEMBER_1);
    expect(res.success).toBe(true);
    expect(state.rpcCalls).toHaveLength(1);
    expect(state.rpcCalls[0]).toEqual({
      fn: "confirm_member",
      args: { target_member: MEMBER_1 },
    });
  });

  it("returns error message when confirm_member RPC fails", async () => {
    state.rpcResult = { data: null, error: { message: "Database update error" } };
    const res = await confirmMemberAction(ORG, MEMBER_1);
    expect(res.success).toBe(false);
    expect(res.error).toBe("failed");
    expect(res.errorMessage).toBe("Could not confirm member. Please try again.");
  });
});

