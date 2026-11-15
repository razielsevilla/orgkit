import { beforeEach, describe, expect, it, vi } from "vitest";

interface FakeState {
  user: { id: string } | null;
  callerRole: string | null;
  rpcCalls: { fn: string; args: Record<string, unknown> }[];
  rpcResult: { data?: unknown; error?: { message: string } | null };
}

const state: FakeState = {
  user: null,
  callerRole: null,
  rpcCalls: [],
  rpcResult: { data: null, error: null },
};

function query(table: string) {
  const builder: Record<string, unknown> = {
    select: () => builder,
    eq: () => builder,
    maybeSingle: async () => {
      if (table === "org_officers") {
        return {
          data: state.callerRole ? { role: state.callerRole } : null,
          error: null,
        };
      }
      return { data: null, error: null };
    },
  };
  return builder;
}

vi.mock("@/src/lib/auth/session-user", () => ({
  getSessionUser: async () => ({
    user: state.user,
    supabase: {
      from: (table: string) => query(table),
      rpc: (fn: string, args: Record<string, unknown>) => {
        state.rpcCalls.push({ fn, args });
        return Promise.resolve(state.rpcResult);
      },
    },
  }),
}));

const mockRevalidatePath = vi.fn();
vi.mock("next/cache", () => ({
  revalidatePath: (path: string) => mockRevalidatePath(path),
}));

const { getDuesDashboardData } = await import(
  "@/src/app/(workspace)/dues-actions"
);

const ORG_ID = "11111111-1111-1111-1111-111111111111";
const PERIOD_ID = "22222222-2222-2222-2222-222222222222";

describe("getDuesDashboardData server action", () => {
  beforeEach(() => {
    state.user = { id: "officer-user-id" };
    state.callerRole = "officer";
    state.rpcCalls = [];
    state.rpcResult = { data: null, error: null };
    mockRevalidatePath.mockClear();
  });

  it("fails with not_found when orgId is not a valid UUID", async () => {
    const res = await getDuesDashboardData("invalid-org", {
      periodId: PERIOD_ID,
    });
    expect(res.success).toBe(false);
    expect(res.error).toBe("not_found");
  });

  it("fails with invalid_input when periodId is not a valid UUID", async () => {
    const res = await getDuesDashboardData(ORG_ID, {
      periodId: "invalid-period",
    });
    expect(res.success).toBe(false);
    expect(res.error).toBe("invalid_input");
  });

  it("fails with not_authenticated when user session is missing", async () => {
    state.user = null;
    const res = await getDuesDashboardData(ORG_ID, {
      periodId: PERIOD_ID,
    });
    expect(res.success).toBe(false);
    expect(res.error).toBe("not_authenticated");
  });

  it("fails with access_revoked when caller is not an officer", async () => {
    state.callerRole = null;
    const res = await getDuesDashboardData(ORG_ID, {
      periodId: PERIOD_ID,
    });
    expect(res.success).toBe(false);
    expect(res.error).toBe("access_revoked");
  });

  it("handles database RPC error gracefully", async () => {
    state.rpcResult = {
      error: { message: "database connection error" },
    };

    const res = await getDuesDashboardData(ORG_ID, {
      periodId: PERIOD_ID,
    });

    expect(res.success).toBe(false);
    expect(res.errorMessage).toBe(
      "We couldn't load the dues dashboard. Try again."
    );
  });

  it("successfully passes validated parameters and returns mapped dashboard data", async () => {
    state.rpcResult = {
      data: {
        period: {
          id: PERIOD_ID,
          org_id: ORG_ID,
          name: "Annual Dues",
          amount: 250.0,
          due_on: "2026-12-15",
          status: "open",
          pay_token: "test-token",
          pay_link_active: true,
        },
        summary: {
          collected_amount: 500.0,
          expected_amount: 1000.0,
          outstanding_amount: 500.0,
          paid_count: 2,
          pending_count: 1,
          rejected_count: 0,
          unpaid_count: 1,
          active_member_count: 4,
          total_member_count: 4,
        },
        members: [
          {
            member_id: "m-1",
            full_name: "John Doe",
            email: "john@school.edu",
            member_status: "active",
            dues_status: "paid",
            payment_id: "p-1",
            amount: 250.0,
            reference_no: "REF123456",
            payment_status: "verified",
            reject_reason: null,
            submitted_at: "2026-11-01T00:00:00Z",
            reviewed_at: "2026-11-02T00:00:00Z",
          },
        ],
        pagination: {
          page: 2,
          page_size: 20,
          total_matching: 25,
          total_pages: 2,
        },
      },
    };

    const res = await getDuesDashboardData(ORG_ID, {
      periodId: PERIOD_ID,
      search: "John",
      status: "paid",
      page: 2,
      pageSize: 20,
    });

    expect(res.success).toBe(true);
    expect(res.data).toBeDefined();
    expect(res.data?.period.name).toBe("Annual Dues");
    expect(res.data?.summary.collectedAmount).toBe(500);
    expect(res.data?.members.length).toBe(1);
    expect(res.data?.members[0].fullName).toBe("John Doe");
    expect(res.data?.pagination.page).toBe(2);

    // Verify RPC call args
    expect(state.rpcCalls.length).toBe(1);
    expect(state.rpcCalls[0].fn).toBe("get_dues_period_dashboard");
    expect(state.rpcCalls[0].args).toEqual({
      p_period_id: PERIOD_ID,
      p_search: "John",
      p_status: "paid",
      p_page: 2,
      p_page_size: 20,
    });
  });

  it("normalizes empty search and default status to null/all", async () => {
    state.rpcResult = {
      data: {
        period: { id: PERIOD_ID, name: "Dues" },
        summary: {},
        members: [],
        pagination: {},
      },
    };

    await getDuesDashboardData(ORG_ID, {
      periodId: PERIOD_ID,
      search: "   ",
    });

    expect(state.rpcCalls[0].args.p_search).toBe(null);
    expect(state.rpcCalls[0].args.p_status).toBe("all");
    expect(state.rpcCalls[0].args.p_page).toBe(1);
    expect(state.rpcCalls[0].args.p_page_size).toBe(20);
  });
});
