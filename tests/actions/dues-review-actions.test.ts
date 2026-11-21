import { beforeEach, describe, expect, it, vi } from "vitest";

interface FakeState {
  user: { id: string } | null;
  callerRole: string | null;
  rpcCalls: { fn: string; args: Record<string, unknown> }[];
  rpcResult: { data?: unknown; error?: { message: string } | null };
  storageSignedUrl: { data: { signedUrl: string } | null; error: { message: string } | null };
}

const state: FakeState = {
  user: null,
  callerRole: null,
  rpcCalls: [],
  rpcResult: { data: null, error: null },
  storageSignedUrl: { data: { signedUrl: "https://storage.mock/screenshot.png" }, error: null },
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
      storage: {
        from: () => ({
          createSignedUrl: async () => state.storageSignedUrl,
        }),
      },
    },
  }),
}));

const mockRevalidatePath = vi.fn();
vi.mock("next/cache", () => ({
  revalidatePath: (path: string) => mockRevalidatePath(path),
}));

const {
  getDuesReviewQueue,
  getPaymentScreenshotUrl,
  verifyDuesPayment,
  rejectDuesPayment,
  undoDuesPaymentVerification,
} = await import("@/src/app/(workspace)/dues-review-actions");

const ORG = "11111111-1111-4111-8111-111111111111";
const PERIOD_ID = "22222222-2222-4222-8222-222222222222";
const PAYMENT_ID = "33333333-3333-4333-8333-333333333333";

beforeEach(() => {
  state.user = { id: "officer-user-1" };
  state.callerRole = "officer";
  state.rpcCalls = [];
  state.rpcResult = { data: null, error: null };
  state.storageSignedUrl = { data: { signedUrl: "https://storage.mock/screenshot.png" }, error: null };
  mockRevalidatePath.mockClear();
});

describe("getDuesReviewQueue server action", () => {
  it("returns review queue items on success", async () => {
    state.rpcResult = {
      data: [
        {
          payment_id: PAYMENT_ID,
          member_id: "member-1",
          member_name: "Alice",
          member_email: "alice@school.edu",
          amount: "150.00",
          reference_no: "1001 2345 6789",
          screenshot_path: "screenshots/p1.png",
          submitted_at: "2026-11-15T08:00:00Z",
        },
      ],
      error: null,
    };

    const res = await getDuesReviewQueue(ORG, PERIOD_ID);
    expect(res.success).toBe(true);
    if (!res.success) return;

    expect(res.data).toHaveLength(1);
    expect(res.data[0].paymentId).toBe(PAYMENT_ID);
    expect(res.data[0].amount).toBe(150);
    expect(res.data[0].memberName).toBe("Alice");
    expect(state.rpcCalls[0]).toEqual({
      fn: "get_dues_review_queue",
      args: { p_org_id: ORG, p_period_id: PERIOD_ID },
    });
  });

  it("refuses malformed UUID parameters", async () => {
    const res = await getDuesReviewQueue("not-a-uuid", PERIOD_ID);
    expect(res.success).toBe(false);
    if (res.success) return;
    expect(res.error).toBe("not_found");
  });

  it("handles RPC errors gracefully", async () => {
    state.rpcResult = { data: null, error: { message: "not_authorized" } };
    const res = await getDuesReviewQueue(ORG, PERIOD_ID);
    expect(res.success).toBe(false);
    if (res.success) return;
    expect(res.error).toBe("not_authorized");
  });
});

describe("getPaymentScreenshotUrl server action", () => {
  it("returns signed URL for legitimate screenshot path", async () => {
    const res = await getPaymentScreenshotUrl(ORG, "screenshots/receipt.png");
    expect(res.success).toBe(true);
    if (!res.success) return;
    expect(res.data.signedUrl).toBe("https://storage.mock/screenshot.png");
  });

  it("rejects empty or whitespace screenshot path", async () => {
    const res = await getPaymentScreenshotUrl(ORG, "   ");
    expect(res.success).toBe(false);
    if (res.success) return;
    expect(res.error).toBe("invalid_input");
  });

  it("handles storage service error gracefully", async () => {
    state.storageSignedUrl = { data: null, error: { message: "Object not found" } };
    const res = await getPaymentScreenshotUrl(ORG, "screenshots/missing.png");
    expect(res.success).toBe(false);
    if (res.success) return;
    expect(res.error).toBe("failed");
    expect(res.errorMessage).toContain("Screenshot is unavailable");
  });
});

describe("verifyDuesPayment server action", () => {
  it("verifies payment and revalidates dues page", async () => {
    state.rpcResult = { data: null, error: null };
    const res = await verifyDuesPayment(ORG, PAYMENT_ID);

    expect(res.success).toBe(true);
    expect(state.rpcCalls[0]).toEqual({
      fn: "verify_dues_payment",
      args: { p_payment_id: PAYMENT_ID },
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith(`/workspace/${ORG}/dues`);
  });

  it("catches already_reviewed concurrency conflict with informative error", async () => {
    state.rpcResult = { data: null, error: { message: "already_reviewed" } };
    const res = await verifyDuesPayment(ORG, PAYMENT_ID);

    expect(res.success).toBe(false);
    if (res.success) return;
    expect(res.error).toBe("already_reviewed");
    expect(res.errorMessage).toBe("This payment has already been reviewed by another officer.");
  });

  it("catches cannot_review_own_payment self-review error", async () => {
    state.rpcResult = { data: null, error: { message: "cannot_review_own_payment" } };
    const res = await verifyDuesPayment(ORG, PAYMENT_ID);

    expect(res.success).toBe(false);
    if (res.success) return;
    expect(res.error).toBe("cannot_review_own_payment");
    expect(res.errorMessage).toBe("You cannot review your own payment.");
  });
});

describe("rejectDuesPayment server action", () => {
  it("rejects payment with valid reason and revalidates dues page", async () => {
    state.rpcResult = { data: null, error: null };
    const res = await rejectDuesPayment(ORG, PAYMENT_ID, "Amount doesn't match");

    expect(res.success).toBe(true);
    expect(state.rpcCalls[0]).toEqual({
      fn: "reject_dues_payment",
      args: { p_payment_id: PAYMENT_ID, p_reason: "Amount doesn't match" },
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith(`/workspace/${ORG}/dues`);
  });

  it("refuses blank or short reason before calling database", async () => {
    const res = await rejectDuesPayment(ORG, PAYMENT_ID, "no");
    expect(res.success).toBe(false);
    if (res.success) return;
    expect(res.error).toBe("invalid_input");
    expect(state.rpcCalls).toHaveLength(0);
  });

  it("catches already_reviewed concurrency error on rejection", async () => {
    state.rpcResult = { data: null, error: { message: "already_reviewed" } };
    const res = await rejectDuesPayment(ORG, PAYMENT_ID, "Screenshot unclear");

    expect(res.success).toBe(false);
    if (res.success) return;
    expect(res.error).toBe("already_reviewed");
  });
});

describe("undoDuesPaymentVerification server action", () => {
  it("admin officer can undo a verification with reason", async () => {
    state.callerRole = "admin";
    state.rpcResult = { data: null, error: null };

    const res = await undoDuesPaymentVerification(ORG, PAYMENT_ID, "Accidental verification");
    expect(res.success).toBe(true);
    expect(state.rpcCalls[0]).toEqual({
      fn: "undo_dues_payment_verification",
      args: { p_payment_id: PAYMENT_ID, p_reason: "Accidental verification" },
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith(`/workspace/${ORG}/dues`);
  });

  it("catches admin_only refusal error for non-admin officers", async () => {
    state.rpcResult = { data: null, error: { message: "admin_only" } };
    const res = await undoDuesPaymentVerification(ORG, PAYMENT_ID, "Accidental verification");

    expect(res.success).toBe(false);
    if (res.success) return;
    expect(res.error).toBe("admin_only");
    expect(res.errorMessage).toBe("Only organization admins can undo payment verifications.");
  });

  it("rejects empty reason before calling database", async () => {
    const res = await undoDuesPaymentVerification(ORG, PAYMENT_ID, "   ");
    expect(res.success).toBe(false);
    if (res.success) return;
    expect(res.error).toBe("invalid_input");
    expect(state.rpcCalls).toHaveLength(0);
  });
});
