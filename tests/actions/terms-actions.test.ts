import { beforeEach, describe, expect, it, vi } from "vitest";

interface FakeState {
  user: { id: string } | null;
  callerRole: string | null;
  org: { id: string; name: string } | null;
  terms: Record<string, unknown>[];
  members: Record<string, unknown>[];
  rpcResult: { data?: unknown; error?: { message: string } | null };
  rpcCalls: { fn: string; args: Record<string, unknown> }[];
}

const state: FakeState = {
  user: null,
  callerRole: null,
  org: null,
  terms: [],
  members: [],
  rpcResult: { data: null, error: null },
  rpcCalls: [],
};

function query(table: string) {
  const result = () => {
    switch (table) {
      case "officer_terms":
        return { data: state.terms, error: null };
      case "members":
        return { data: state.members, error: null };
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
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const {
  getWorkspaceTerms,
  createOfficerTermAction,
  updateOfficerTermAction,
  deleteOfficerTermAction,
} = await import("@/src/app/(workspace)/terms-actions");

const ORG = "11111111-1111-4111-8111-111111111111";
const ME = "22222222-2222-4222-8222-222222222222";
const TERM_ID = "33333333-3333-4333-8333-333333333333";

beforeEach(() => {
  state.user = { id: ME };
  state.callerRole = "admin";
  state.org = { id: ORG, name: "Math Society" };
  state.terms = [
    {
      id: TERM_ID,
      org_id: ORG,
      member_id: null,
      holder_name: "Juan Dela Cruz",
      role_title: "President",
      term_name: "A.Y. 2025-2026",
      start_date: "2025-06-01",
      end_date: "2026-05-31",
      created_at: "2025-06-01T00:00:00Z",
    },
    {
      id: "past-term-id",
      org_id: ORG,
      member_id: null,
      holder_name: "Maria Santos",
      role_title: "Secretary",
      term_name: "A.Y. 2023-2024",
      start_date: "2023-06-01",
      end_date: "2024-05-31",
      created_at: "2023-06-01T00:00:00Z",
    },
  ];
  state.members = [
    { id: "mem-1", full_name: "Juan Dela Cruz", email: "juan@school.edu" },
  ];
  state.rpcResult = { data: null, error: null };
  state.rpcCalls = [];
});

describe("H1: getWorkspaceTerms", () => {
  it("returns terms newest first with admin status", async () => {
    const res = await getWorkspaceTerms(ORG);
    expect(res.success).toBe(true);
    if (!res.success) return;

    expect(res.data.orgName).toBe("Math Society");
    expect(res.data.isAdmin).toBe(true);
    expect(res.data.terms).toHaveLength(2);
    expect(res.data.terms[0].roleTitle).toBe("President");
    expect(res.data.terms[1].roleTitle).toBe("Secretary");
    expect(res.data.terms[1].isEnded).toBe(true);
  });

  it("identifies read-only permission for non-admin officers", async () => {
    state.callerRole = "officer";
    const res = await getWorkspaceTerms(ORG);
    expect(res.success).toBe(true);
    if (!res.success) return;

    expect(res.data.isAdmin).toBe(false);
    expect(res.data.terms).toHaveLength(2);
  });

  it("fails if user is not signed in", async () => {
    state.user = null;
    const res = await getWorkspaceTerms(ORG);
    expect(res.success).toBe(false);
    if (res.success) return;
    expect(res.error).toBe("not_authenticated");
  });

  it("fails if user is not in the org", async () => {
    state.callerRole = null;
    const res = await getWorkspaceTerms(ORG);
    expect(res.success).toBe(false);
    if (res.success) return;
    expect(res.error).toBe("access_revoked");
  });
});

describe("H1: createOfficerTermAction", () => {
  it("allows admin to create an officer term", async () => {
    state.rpcResult = { data: "new-term-id", error: null };

    const res = await createOfficerTermAction(ORG, {
      termName: "A.Y. 2025-2026",
      roleTitle: "Vice President",
      holderName: "Elena Gomez",
      startDate: "2025-06-01",
      endDate: "2026-05-31",
    });

    expect(res.success).toBe(true);
    if (!res.success) return;
    expect(res.data.id).toBe("new-term-id");
    expect(state.rpcCalls).toHaveLength(1);
    expect(state.rpcCalls[0].fn).toBe("record_officer_term");
  });

  it("refuses non-admin from creating a term", async () => {
    state.callerRole = "officer";

    const res = await createOfficerTermAction(ORG, {
      termName: "A.Y. 2025-2026",
      roleTitle: "Vice President",
      holderName: "Elena Gomez",
      startDate: "2025-06-01",
      endDate: "2026-05-31",
    });

    expect(res.success).toBe(false);
    if (res.success) return;
    expect(res.error).toBe("not_admin");
    expect(state.rpcCalls).toHaveLength(0);
  });

  it("rejects an end date before start date before calling RPC", async () => {
    const res = await createOfficerTermAction(ORG, {
      termName: "A.Y. 2025-2026",
      roleTitle: "Treasurer",
      holderName: "Elena Gomez",
      startDate: "2026-05-31",
      endDate: "2025-06-01",
    });

    expect(res.success).toBe(false);
    if (res.success) return;
    expect(res.error).toBe("invalid_dates");
    expect(state.rpcCalls).toHaveLength(0);
  });

  it("handles overlapping_term RPC rejection gracefully", async () => {
    state.rpcResult = { data: null, error: { message: "overlapping_term" } };

    const res = await createOfficerTermAction(ORG, {
      termName: "A.Y. 2025-2026",
      roleTitle: "President",
      holderName: "Juan Dela Cruz",
      startDate: "2025-08-01",
      endDate: "2026-08-31",
    });

    expect(res.success).toBe(false);
    if (res.success) return;
    expect(res.error).toBe("overlapping_term");
    expect(res.errorMessage).toContain("overlapping");
  });
});

describe("H1: updateOfficerTermAction & deleteOfficerTermAction", () => {
  it("allows admin to update a term", async () => {
    state.rpcResult = { data: "ok", error: null };

    const res = await updateOfficerTermAction(ORG, TERM_ID, {
      termName: "A.Y. 2025-2026 Revised",
      roleTitle: "President",
      holderName: "Juan Dela Cruz",
      startDate: "2025-06-01",
      endDate: "2026-05-31",
    });

    expect(res.success).toBe(true);
    expect(state.rpcCalls).toHaveLength(1);
    expect(state.rpcCalls[0].fn).toBe("update_officer_term");
  });

  it("refuses non-admin from updating a term", async () => {
    state.callerRole = "officer";

    const res = await updateOfficerTermAction(ORG, TERM_ID, {
      termName: "A.Y. 2025-2026 Revised",
      roleTitle: "President",
      holderName: "Juan Dela Cruz",
      startDate: "2025-06-01",
      endDate: "2026-05-31",
    });

    expect(res.success).toBe(false);
    if (res.success) return;
    expect(res.error).toBe("not_admin");
  });

  it("allows admin to delete a term", async () => {
    state.rpcResult = { data: "ok", error: null };

    const res = await deleteOfficerTermAction(ORG, TERM_ID);
    expect(res.success).toBe(true);
    expect(state.rpcCalls).toHaveLength(1);
    expect(state.rpcCalls[0].fn).toBe("delete_officer_term");
  });

  it("refuses non-admin from deleting a term", async () => {
    state.callerRole = "officer";

    const res = await deleteOfficerTermAction(ORG, TERM_ID);
    expect(res.success).toBe(false);
    if (res.success) return;
    expect(res.error).toBe("not_admin");
  });
});
