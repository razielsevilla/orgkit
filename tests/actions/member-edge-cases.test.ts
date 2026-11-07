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
        data: filtered,
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

const ORG_A = "11111111-1111-4111-8111-111111111111";
const ME = "22222222-2222-4222-8222-222222222222";
const MEMBER_PENDING = "33333333-3333-4333-8333-333333333333";
const MEMBER_ACTIVE = "44444444-4444-4444-8444-444444444444";
const LONG_NAME = "Alexander Bartholomew Montgomery The Third Of Cambridge";
const LONG_EMAIL = "alexander.bartholomew.montgomery.the.third@very-long-subdomain.university.edu";

beforeEach(() => {
  state.user = { id: ME };
  state.callerRole = "officer";
  state.rpcCalls = [];
  state.rpcResult = { data: "ok", error: null };
  state.joinLinkToken = "active-token-string";
  state.members = [
    {
      id: MEMBER_PENDING,
      org_id: ORG_A,
      full_name: LONG_NAME,
      email: LONG_EMAIL,
      status: "pending",
      created_at: "2026-11-05T12:00:00Z",
      is_pending: true,
    },
    {
      id: MEMBER_ACTIVE,
      org_id: ORG_A,
      full_name: "Bob Jones",
      email: "bob@example.com",
      status: "active",
      created_at: "2026-10-10T10:00:00Z",
      is_pending: false,
    },
  ];
});

describe("Ticket R1: Member Roster Edge Cases", () => {
  it("preserves long names and emails without truncation in data layer", async () => {
    const res = await getWorkspaceMembers(ORG_A);
    expect(res.success).toBe(true);
    const member = res.data?.members.find((m) => m.id === MEMBER_PENDING);
    expect(member?.fullName).toBe(LONG_NAME);
    expect(member?.email).toBe(LONG_EMAIL);
  });

  it("handles search queries with excessive whitespace and capitalization", async () => {
    const res = await getWorkspaceMembers(ORG_A, { search: "   ALEXANDER   " });
    expect(res.success).toBe(true);
    expect(res.data?.members.length).toBe(1);
    expect(res.data?.members[0].fullName).toBe(LONG_NAME);
  });

  it("returns zero results when status filter excludes matching name", async () => {
    // Member is pending, but status filter is active
    const res = await getWorkspaceMembers(ORG_A, {
      search: "Alexander",
      status: "active",
    });
    expect(res.success).toBe(true);
    expect(res.data?.members.length).toBe(0);
    expect(res.data?.matchingCount).toBe(0);
  });

  it("returns zero results when search matches nobody", async () => {
    const res = await getWorkspaceMembers(ORG_A, { search: "NonExistentPerson" });
    expect(res.success).toBe(true);
    expect(res.data?.members.length).toBe(0);
    expect(res.data?.matchingCount).toBe(0);
  });

  it("rejects malformed UUID parameters before hitting database", async () => {
    const res1 = await getWorkspaceMembers("not-a-uuid");
    expect(res1.success).toBe(false);

    const res2 = await confirmMemberAction(ORG_A, "malformed-member-id");
    expect(res2.success).toBe(false);
    expect(res2.error).toBe("invalid_request");
    expect(state.rpcCalls).toHaveLength(0);
  });

  it("supports concurrent confirm actions idempotently", async () => {
    // Two officers confirm the same member concurrently
    const [res1, res2] = await Promise.all([
      confirmMemberAction(ORG_A, MEMBER_PENDING),
      confirmMemberAction(ORG_A, MEMBER_PENDING),
    ]);
    expect(res1.success).toBe(true);
    expect(res2.success).toBe(true);
    expect(state.rpcCalls).toHaveLength(2);
    expect(state.rpcCalls[0].args).toEqual({ target_member: MEMBER_PENDING });
    expect(state.rpcCalls[1].args).toEqual({ target_member: MEMBER_PENDING });
  });

  it("handles RPC database failure with graceful error message and no crash", async () => {
    state.rpcResult = { data: null, error: { message: "connection error" } };
    const res = await confirmMemberAction(ORG_A, MEMBER_PENDING);
    expect(res.success).toBe(false);
    expect(res.errorMessage).toBe("Could not confirm member. Please try again.");
  });
});

