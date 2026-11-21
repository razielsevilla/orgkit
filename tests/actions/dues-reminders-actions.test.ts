import { beforeEach, describe, expect, it, vi } from "vitest";

interface FakeState {
  user: { id: string } | null;
  callerRole: string | null;
  rpcCalls: { fn: string; args: Record<string, unknown> }[];
  rpcResponses: Record<string, { data?: unknown; error?: { message: string } | null }>;
}

const state: FakeState = {
  user: null,
  callerRole: null,
  rpcCalls: [],
  rpcResponses: {},
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
        const res = state.rpcResponses[fn] || { data: null, error: null };
        return Promise.resolve(res);
      },
    },
  }),
}));

const mockRevalidatePath = vi.fn();
vi.mock("next/cache", () => ({
  revalidatePath: (path: string) => mockRevalidatePath(path),
}));

vi.mock("@/src/lib/request", () => ({
  getBaseUrl: async () => "https://test.orgkit.ph",
}));

const {
  getDuesReminderPreviewAction,
  sendDuesRemindersAction,
  retryFailedRemindersAction,
} = await import("@/src/app/(workspace)/dues-actions");

const ORG_ID = "11111111-1111-1111-1111-111111111111";
const PERIOD_ID = "22222222-2222-2222-2222-222222222222";
const MEMBER_1 = "33333333-3333-3333-3333-333333333333";
const MEMBER_2 = "44444444-4444-4444-4444-444444444444";

const mockPreviewRpcPayload = {
  period: {
    id: PERIOD_ID,
    org_id: ORG_ID,
    org_name: "Association of Computing Machinery",
    period_name: "1st Sem Membership Dues",
    amount: "250.00",
    due_on: "2026-12-15",
    pay_token: "test-token-123",
    status: "open",
    is_closed: false,
  },
  counts: {
    total_active_members: 10,
    total_unpaid: 2,
    eligible: 2,
    skipped_24h: 0,
    paid_or_pending: 8,
  },
  recipients: [
    {
      member_id: MEMBER_1,
      full_name: "Alice Unpaid",
      email: "alice@school.edu",
      is_eligible: true,
      skip_reason: null,
      last_reminded_at: null,
    },
    {
      member_id: MEMBER_2,
      full_name: "Bob Unpaid",
      email: "bob@school.edu",
      is_eligible: true,
      skip_reason: null,
      last_reminded_at: null,
    },
  ],
};

describe("Dues Reminders Server Actions", () => {
  beforeEach(() => {
    state.user = { id: "officer-user-id" };
    state.callerRole = "officer";
    state.rpcCalls = [];
    state.rpcResponses = {
      get_dues_reminder_recipients: { data: mockPreviewRpcPayload, error: null },
      log_dues_reminder: { data: "reminder-log-id", error: null },
    };
    mockRevalidatePath.mockClear();
  });

  describe("getDuesReminderPreviewAction", () => {
    it("fails with invalid_input when orgId or periodId is not a valid UUID", async () => {
      const res = await getDuesReminderPreviewAction("bad-id", PERIOD_ID);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBe("invalid_input");
      }
    });

    it("fails with not_authenticated when user is not signed in", async () => {
      state.user = null;
      const res = await getDuesReminderPreviewAction(ORG_ID, PERIOD_ID);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBe("not_authenticated");
      }
    });

    it("fails with access_revoked when user is not in the org", async () => {
      state.callerRole = null;
      const res = await getDuesReminderPreviewAction(ORG_ID, PERIOD_ID);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBe("access_revoked");
      }
    });

    it("successfully returns reminder preview data on valid caller and period", async () => {
      const res = await getDuesReminderPreviewAction(ORG_ID, PERIOD_ID);
      expect(res.success).toBe(true);
      if (res.success && res.data) {
        expect(res.data.period.period_name).toBe("1st Sem Membership Dues");
        expect(res.data.eligible_count).toBe(2);
        expect(res.data.total_unpaid_count).toBe(2);
        expect(res.data.preview_subject).toContain("1st Sem Membership Dues");
        expect(res.data.preview_text).toContain("₱250.00");
      }
    });
  });

  describe("sendDuesRemindersAction", () => {
    it("fails with invalid_input on malformed UUIDs", async () => {
      const res = await sendDuesRemindersAction(ORG_ID, "not-a-uuid");
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBe("invalid_input");
      }
    });

    it("blocks sending reminders for a closed period", async () => {
      state.rpcResponses.get_dues_reminder_recipients = {
        data: {
          ...mockPreviewRpcPayload,
          period: {
            ...mockPreviewRpcPayload.period,
            status: "closed",
            is_closed: true,
          },
        },
        error: null,
      };

      const res = await sendDuesRemindersAction(ORG_ID, PERIOD_ID);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBe("closed_period");
        expect(res.errorMessage).toContain("closed period");
      }
    });

    it("successfully sends reminders, logs them, and revalidates dues path", async () => {
      const res = await sendDuesRemindersAction(ORG_ID, PERIOD_ID);
      expect(res.success).toBe(true);
      if (res.success && res.data) {
        expect(res.data.total_targeted).toBe(2);
        expect(res.data.sent_count).toBe(2);
        expect(res.data.failed_count).toBe(0);
      }
      expect(mockRevalidatePath).toHaveBeenCalledWith(`/workspace/${ORG_ID}/dues`);
      expect(state.rpcCalls.filter((c) => c.fn === "log_dues_reminder").length).toBe(2);
    });
  });

  describe("retryFailedRemindersAction", () => {
    it("fails with invalid_input when memberIds is empty", async () => {
      const res = await retryFailedRemindersAction(ORG_ID, PERIOD_ID, []);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBe("invalid_input");
      }
    });

    it("retries sending only to the specified member IDs", async () => {
      const res = await retryFailedRemindersAction(ORG_ID, PERIOD_ID, [MEMBER_1]);
      expect(res.success).toBe(true);
      if (res.success && res.data) {
        expect(res.data.total_targeted).toBe(1);
        expect(res.data.sent_count).toBe(1);
      }
      expect(mockRevalidatePath).toHaveBeenCalled();
      const logCalls = state.rpcCalls.filter((c) => c.fn === "log_dues_reminder");
      expect(logCalls.length).toBe(1);
      expect(logCalls[0].args.p_member_id).toBe(MEMBER_1);
    });
  });
});
