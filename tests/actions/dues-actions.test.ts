import { beforeEach, describe, expect, it, vi } from "vitest";
import { validateDuesPeriodInput } from "@/src/lib/dues/dues-validation";

interface FakeDuesPeriod {
  id: string;
  org_id: string;
  name: string;
  amount: number;
  due_on: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface FakeState {
  user: { id: string } | null;
  callerRole: string | null;
  periods: FakeDuesPeriod[];
  rpcCalls: { fn: string; args: Record<string, unknown> }[];
  rpcResult: { data?: unknown; error?: { message: string } | null };
}

const state: FakeState = {
  user: null,
  callerRole: null,
  periods: [],
  rpcCalls: [],
  rpcResult: { data: null, error: null },
};

function query(table: string) {
  const builder: Record<string, unknown> = {
    select: () => builder,
    eq: () => builder,
    order: () => Promise.resolve({ data: state.periods, error: null }),
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

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const {
  getWorkspaceDuesPeriods,
  createDuesPeriod,
  updateDuesPeriod,
  closeDuesPeriod,
} = await import("@/src/app/(workspace)/dues-actions");

const ORG = "11111111-1111-4111-8111-111111111111";
const PERIOD_ID = "33333333-3333-4333-8333-333333333333";

beforeEach(() => {
  state.user = { id: "user-officer-1" };
  state.callerRole = "officer";
  state.periods = [];
  state.rpcCalls = [];
  state.rpcResult = { data: null, error: null };
});

describe("validateDuesPeriodInput", () => {
  it("accepts valid input values", () => {
    const res = validateDuesPeriodInput({
      name: "Membership Dues 2026",
      amount: "250.00",
      dueOn: "2026-12-15",
    });
    expect(res.isValid).toBe(true);
    expect(res.cleaned).toEqual({
      name: "Membership Dues 2026",
      amount: 250,
      dueOn: "2026-12-15",
    });
  });

  it("handles currency symbol and commas in amount", () => {
    const res = validateDuesPeriodInput({
      name: "Annual Dues",
      amount: "₱ 1,500.50",
      dueOn: "2026-12-15",
    });
    expect(res.isValid).toBe(true);
    expect(res.cleaned?.amount).toBe(1500.5);
  });

  it("rejects name shorter than 2 characters or longer than 100", () => {
    const tooShort = validateDuesPeriodInput({ name: "A", amount: 100, dueOn: "2026-12-15" });
    expect(tooShort.isValid).toBe(false);
    expect(tooShort.errors.name).toBe("Name must be between 2 and 100 characters.");

    const tooLong = validateDuesPeriodInput({ name: "X".repeat(101), amount: 100, dueOn: "2026-12-15" });
    expect(tooLong.isValid).toBe(false);
    expect(tooLong.errors.name).toBe("Name must be between 2 and 100 characters.");
  });

  it("rejects non-positive amount, over 100k, and 3+ decimals", () => {
    const zero = validateDuesPeriodInput({ name: "Valid", amount: "0", dueOn: "2026-12-15" });
    expect(zero.isValid).toBe(false);
    expect(zero.errors.amount).toBe("Amount must be greater than ₱0.");

    const negative = validateDuesPeriodInput({ name: "Valid", amount: -10, dueOn: "2026-12-15" });
    expect(negative.isValid).toBe(false);
    expect(negative.errors.amount).toBe("Amount must be greater than ₱0.");

    const overCap = validateDuesPeriodInput({ name: "Valid", amount: 100000.01, dueOn: "2026-12-15" });
    expect(overCap.isValid).toBe(false);
    expect(overCap.errors.amount).toBe("Amount cannot exceed ₱100,000.");

    const threeDecimals = validateDuesPeriodInput({ name: "Valid", amount: "50.125", dueOn: "2026-12-15" });
    expect(threeDecimals.isValid).toBe(false);
    expect(threeDecimals.errors.amount).toBe("Amount can have at most 2 decimal places.");
  });

  it("rejects invalid or missing due date", () => {
    const missing = validateDuesPeriodInput({ name: "Valid", amount: 100, dueOn: "" });
    expect(missing.isValid).toBe(false);
    expect(missing.errors.dueOn).toBe("Please enter a valid due date.");

    const invalid = validateDuesPeriodInput({ name: "Valid", amount: 100, dueOn: "not-a-date" });
    expect(invalid.isValid).toBe(false);
    expect(invalid.errors.dueOn).toBe("Please enter a valid due date.");
  });
});

describe("getWorkspaceDuesPeriods", () => {
  it("returns dues periods for signed in officer", async () => {
    state.periods = [
      {
        id: PERIOD_ID,
        org_id: ORG,
        name: "1st Sem Dues",
        amount: 200,
        due_on: "2026-12-15",
        status: "open",
        created_at: "2026-11-01T00:00:00Z",
        updated_at: "2026-11-01T00:00:00Z",
      },
    ];

    const res = await getWorkspaceDuesPeriods(ORG);
    expect(res.success).toBe(true);
    expect(res.data?.length).toBe(1);
    expect(res.data?.[0].name).toBe("1st Sem Dues");
    expect(res.data?.[0].amount).toBe(200);
    expect(res.data?.[0].status).toBe("open");
  });

  it("refuses signed-out visitor", async () => {
    state.user = null;
    const res = await getWorkspaceDuesPeriods(ORG);
    expect(res.success).toBe(false);
    expect(res.error).toBe("not_authenticated");
  });

  it("refuses user not in the org", async () => {
    state.callerRole = null;
    const res = await getWorkspaceDuesPeriods(ORG);
    expect(res.success).toBe(false);
    expect(res.error).toBe("access_revoked");
  });
});

describe("createDuesPeriod", () => {
  it("rejects invalid input without calling RPC", async () => {
    const res = await createDuesPeriod(ORG, {
      name: "A",
      amount: 0,
      dueOn: "",
    });
    expect(res.success).toBe(false);
    expect(res.error).toBe("invalid_input");
    expect(state.rpcCalls.length).toBe(0);
  });

  it("calls create_dues_period RPC with valid parameters", async () => {
    state.rpcResult = { data: PERIOD_ID, error: null };
    const res = await createDuesPeriod(ORG, {
      name: "General Assembly Dues",
      amount: 150,
      dueOn: "2026-12-01",
    });

    expect(res.success).toBe(true);
    expect(res.data?.id).toBe(PERIOD_ID);
    expect(state.rpcCalls.length).toBe(1);
    expect(state.rpcCalls[0]).toEqual({
      fn: "create_dues_period",
      args: {
        p_org_id: ORG,
        p_name: "General Assembly Dues",
        p_amount: 150,
        p_due_on: "2026-12-01",
      },
    });
  });

  it("handles RPC error message gracefully", async () => {
    state.rpcResult = {
      data: null,
      error: { message: "Not permitted to create dues periods for this organization" },
    };
    const res = await createDuesPeriod(ORG, {
      name: "General Assembly Dues",
      amount: 150,
      dueOn: "2026-12-01",
    });

    expect(res.success).toBe(false);
    expect(res.error).toBe("not_authorized");
  });
});

describe("updateDuesPeriod", () => {
  it("rejects malformed period ID without calling RPC", async () => {
    const res = await updateDuesPeriod(ORG, "not-a-uuid", {
      name: "Valid Name",
      amount: 100,
      dueOn: "2026-12-15",
    });
    expect(res.success).toBe(false);
    expect(res.error).toBe("not_found");
    expect(state.rpcCalls.length).toBe(0);
  });

  it("calls update_dues_period RPC on valid parameters", async () => {
    state.rpcResult = { data: "ok", error: null };
    const res = await updateDuesPeriod(ORG, PERIOD_ID, {
      name: "Updated Name",
      amount: 175.5,
      dueOn: "2026-12-20",
    });

    expect(res.success).toBe(true);
    expect(state.rpcCalls.length).toBe(1);
    expect(state.rpcCalls[0]).toEqual({
      fn: "update_dues_period",
      args: {
        p_period_id: PERIOD_ID,
        p_name: "Updated Name",
        p_amount: 175.5,
        p_due_on: "2026-12-20",
      },
    });
  });

  it("handles closed period edit refusal cleanly", async () => {
    state.rpcResult = {
      data: null,
      error: { message: "Cannot edit closed dues period" },
    };
    const res = await updateDuesPeriod(ORG, PERIOD_ID, {
      name: "Updated Name",
      amount: 175.5,
      dueOn: "2026-12-20",
    });

    expect(res.success).toBe(false);
    expect(res.error).toBe("closed_period");
    expect(res.errorMessage).toBe("Closed dues periods cannot be edited.");
  });
});

describe("closeDuesPeriod", () => {
  it("rejects malformed period ID without calling RPC", async () => {
    const res = await closeDuesPeriod(ORG, "malformed-id");
    expect(res.success).toBe(false);
    expect(res.error).toBe("not_found");
    expect(state.rpcCalls.length).toBe(0);
  });

  it("calls close_dues_period RPC", async () => {
    state.rpcResult = { data: "ok", error: null };
    const res = await closeDuesPeriod(ORG, PERIOD_ID);
    expect(res.success).toBe(true);
    expect(state.rpcCalls.length).toBe(1);
    expect(state.rpcCalls[0]).toEqual({
      fn: "close_dues_period",
      args: { p_period_id: PERIOD_ID },
    });
  });
});

