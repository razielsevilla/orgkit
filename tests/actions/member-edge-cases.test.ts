import { beforeEach, describe, expect, it, vi } from "vitest";
import { MEMBER_EDIT_MESSAGES } from "@/src/lib/members/member-edit";

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
              neq: (f2: string, v2: unknown) => {
                count = filtered
                  .filter((m) => (m as unknown as Record<string, unknown>)[field] === val)
                  .filter((m) => (m as unknown as Record<string, unknown>)[f2] !== v2).length;
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
    neq: (field: string, val: unknown) => {
      filtered = filtered.filter((m) => (m as unknown as Record<string, unknown>)[field] !== val);
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
      if (table === "members") {
        return {
          data: filtered[0] ? { ...filtered[0] } : null,
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

const {
  getWorkspaceMembers,
  confirmMemberAction,
  updateMemberAction,
  setMemberStatusAction,
} = await import("@/src/app/(workspace)/members-actions");
const { buildMemberSearchFilter } = await import("@/src/lib/members/member-search");

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

  it("pages the roster 20 at a time and reports hasMore", async () => {
    state.members = Array.from({ length: 120 }, (_, i) => ({
      id: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
      org_id: ORG_A,
      full_name: `Person ${i}`,
      email: `p${i}@example.com`,
      status: "active",
      created_at: "2026-10-10T10:00:00Z",
      is_pending: false,
    }));
    const p1 = await getWorkspaceMembers(ORG_A);
    expect(p1.data?.members).toHaveLength(20);
    expect(p1.data?.matchingCount).toBe(120);
    expect(p1.data?.hasMore).toBe(true);

    // The second page starts where the first ended
    const p2 = await getWorkspaceMembers(ORG_A, { offset: 20 });
    expect(p2.data?.members).toHaveLength(20);
    expect(p2.data?.hasMore).toBe(true);
    expect(p2.data?.members.map((m) => m.id)).not.toContain(p1.data?.members[0].id);

    const p6 = await getWorkspaceMembers(ORG_A, { offset: 100 });
    expect(p6.data?.members).toHaveLength(20);
    expect(p6.data?.hasMore).toBe(false);
  });

  it("builds a search filter that survives commas, parentheses and wildcards", () => {
    expect(buildMemberSearchFilter("   ")).toBeNull();
    expect(buildMemberSearchFilter("  Smith,   John ")).toBe(
      'full_name.ilike."%Smith, John%",email.ilike."%Smith, John%"'
    );
    expect(buildMemberSearchFilter("100%_(a)")).toContain('"%100\\\\%\\\\_(a)%"');
    expect(buildMemberSearchFilter('a"b')).toContain('"%a\\"b%"');
  });
});

describe("Ticket R2: Member Edit Edge Cases", () => {
  it("handles concurrent edits by multiple officers where later save calls RPC cleanly", async () => {
    const [res1, res2] = await Promise.all([
      updateMemberAction(ORG_A, MEMBER_ACTIVE, {
        fullName: "Bob Jones Jr.",
        email: "bobjr@example.com",
      }),
      updateMemberAction(ORG_A, MEMBER_ACTIVE, {
        fullName: "Robert Jones III",
        email: "robert.jones@example.com",
      }),
    ]);
    expect(res1.success).toBe(true);
    expect(res2.success).toBe(true);
    const updateCalls = state.rpcCalls.filter((c) => c.fn === "update_member");
    expect(updateCalls).toHaveLength(2);
    expect(updateCalls[0].args).toEqual({
      target_member: MEMBER_ACTIVE,
      new_name: "Bob Jones Jr.",
      new_email: "bobjr@example.com",
    });
    expect(updateCalls[1].args).toEqual({
      target_member: MEMBER_ACTIVE,
      new_name: "Robert Jones III",
      new_email: "robert.jones@example.com",
    });
  });

  it("handles duplicate email collision during save with appropriate error copy", async () => {
    state.rpcResult = { data: null, error: { message: "duplicate_email" } };
    const res = await updateMemberAction(ORG_A, MEMBER_ACTIVE, {
      fullName: "Bob New",
      email: LONG_EMAIL,
    });
    expect(res.success).toBe(false);
    expect(res.error).toBe("duplicate_email");
    expect(res.errorMessage).toBe("Someone in this org already uses that email.");
  });

  it("validates inputs before calling database or role check", async () => {
    const invalidShortName = await updateMemberAction(ORG_A, MEMBER_ACTIVE, {
      fullName: "A",
      email: "valid@example.com",
    });
    expect(invalidShortName.success).toBe(false);
    expect(invalidShortName.error).toBe("invalid_request");
    expect(invalidShortName.errorMessage).toBe(MEMBER_EDIT_MESSAGES.nameInvalid);
    expect(state.rpcCalls.filter((c) => c.fn === "update_member")).toHaveLength(0);

    const invalidEmail = await updateMemberAction(ORG_A, MEMBER_ACTIVE, {
      fullName: "Valid Name",
      email: "invalid-email-address",
    });
    expect(invalidEmail.success).toBe(false);
    expect(invalidEmail.error).toBe("invalid_request");
    expect(invalidEmail.errorMessage).toBe(MEMBER_EDIT_MESSAGES.emailInvalid);
    expect(state.rpcCalls.filter((c) => c.fn === "update_member")).toHaveLength(0);
  });
});

describe("Ticket R2: Member Deactivate and Reactivate Edge Cases", () => {
  it("deactivates pending member and changes status to inactive", async () => {
    const res = await setMemberStatusAction(ORG_A, MEMBER_PENDING, "inactive");
    expect(res.success).toBe(true);
    const statusCalls = state.rpcCalls.filter((c) => c.fn === "set_member_status");
    expect(statusCalls).toHaveLength(1);
    expect(statusCalls[0].args).toEqual({
      target_member: MEMBER_PENDING,
      new_status: "inactive",
    });
  });

  it("reactivates inactive member to active", async () => {
    const res = await setMemberStatusAction(ORG_A, MEMBER_ACTIVE, "active");
    expect(res.success).toBe(true);
    const statusCalls = state.rpcCalls.filter((c) => c.fn === "set_member_status");
    expect(statusCalls).toHaveLength(1);
    expect(statusCalls[0].args).toEqual({
      target_member: MEMBER_ACTIVE,
      new_status: "active",
    });
  });

  it("passes the status the officer saw so a concurrent change can be detected", async () => {
    await setMemberStatusAction(ORG_A, MEMBER_ACTIVE, "inactive", "active");
    await updateMemberAction(
      ORG_A,
      MEMBER_ACTIVE,
      { fullName: "Bob Jones", email: "bob.new@example.com" },
      "active"
    );
    const calls = state.rpcCalls;
    expect(calls[0].args).toEqual({
      target_member: MEMBER_ACTIVE,
      new_status: "inactive",
      expected_status: "active",
    });
    expect(calls[1].args).toMatchObject({ expected_status: "active" });
  });

  it("reports a clear stale error when another officer already changed the member", async () => {
    state.rpcResult = { data: null, error: { message: "stale_member" } };

    const status = await setMemberStatusAction(ORG_A, MEMBER_ACTIVE, "inactive", "active");
    expect(status.success).toBe(false);
    expect(status.error).toBe("stale");
    expect(status.errorMessage).toBe(MEMBER_EDIT_MESSAGES.stale);

    const edit = await updateMemberAction(
      ORG_A,
      MEMBER_ACTIVE,
      { fullName: "Bob Jones", email: "bob.new@example.com" },
      "active"
    );
    expect(edit.success).toBe(false);
    expect(edit.error).toBe("stale");
    expect(edit.errorMessage).toBe(MEMBER_EDIT_MESSAGES.stale);
  });

  it("gracefully catches invalid status transition from concurrent state changes", async () => {
    state.rpcResult = { data: null, error: { message: "invalid_status_transition" } };
    const res = await setMemberStatusAction(ORG_A, MEMBER_ACTIVE, "inactive");
    expect(res.success).toBe(false);
    expect(res.error).toBe("failed");
    expect(res.errorMessage).toBe(MEMBER_EDIT_MESSAGES.statusChangeFailed);
  });

  it("gracefully catches member_not_found if member was deleted or inaccessible", async () => {
    state.rpcResult = { data: null, error: { message: "member_not_found" } };
    const res = await setMemberStatusAction(ORG_A, "99999999-9999-4999-8999-999999999999", "inactive");
    expect(res.success).toBe(false);
    expect(res.error).toBe("not_found");
    expect(res.errorMessage).toBe(MEMBER_EDIT_MESSAGES.notFound);
  });

  it("excludes inactive members from the default active roster query", async () => {
    state.members = [
      {
        id: "1",
        org_id: ORG_A,
        full_name: "Active Member",
        email: "active@example.com",
        status: "active",
        created_at: "2026-11-01T00:00:00Z",
        is_pending: false,
      },
      {
        id: "2",
        org_id: ORG_A,
        full_name: "Pending Member",
        email: "pending@example.com",
        status: "pending",
        created_at: "2026-11-02T00:00:00Z",
        is_pending: true,
      },
      {
        id: "3",
        org_id: ORG_A,
        full_name: "Inactive Member",
        email: "inactive@example.com",
        status: "inactive",
        created_at: "2026-11-03T00:00:00Z",
        is_pending: false,
      },
    ];

    const defaultRoster = await getWorkspaceMembers(ORG_A);
    expect(defaultRoster.success).toBe(true);
    expect(defaultRoster.data?.members.map((m) => m.id)).toEqual(["1", "2"]);

    const inactiveRoster = await getWorkspaceMembers(ORG_A, { status: "inactive" });
    expect(inactiveRoster.success).toBe(true);
    expect(inactiveRoster.data?.members.map((m) => m.id)).toEqual(["3"]);
  });
});
