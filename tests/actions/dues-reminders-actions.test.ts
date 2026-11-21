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

const mockGetBaseUrl = vi.fn(async () => "https://test.orgkit.ph");
vi.mock("@/src/lib/request", () => ({
  getBaseUrl: () => mockGetBaseUrl(),
}));

const {
  getDuesReminderPreviewAction,
  sendDuesRemindersAction,
  retryFailedRemindersAction,
} = await import("@/src/app/(workspace)/dues-reminders-actions");

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
    mockGetBaseUrl.mockReset();
    mockGetBaseUrl.mockImplementation(async () => "https://test.orgkit.ph");
  });

  describe("when the site address is not configured (production)", () => {
    beforeEach(() => {
      mockGetBaseUrl.mockImplementation(async () => {
        throw new Error("NEXT_PUBLIC_SITE_URL is not set. It is required in production to build links.");
      });
    });

    it("fails the preview with the generic message and does not leak the configuration error", async () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      try {
        const res = await getDuesReminderPreviewAction(ORG_ID, PERIOD_ID);
        expect(res.success).toBe(false);
        expect(res.error).toBe("failed");
        expect(res.errorMessage).toBe("We couldn't load the reminder preview. Try again.");
      } finally {
        errorSpy.mockRestore();
      }
    });

    it("sends nothing and logs nothing to the reminder log", async () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      try {
        const res = await sendDuesRemindersAction(ORG_ID, PERIOD_ID);
        expect(res.success).toBe(false);
        expect(res.error).toBe("failed");
        expect(res.errorMessage).toBe("We couldn't send the payment reminders. Try again.");
        // It stopped before reading recipients, so no email and no log row
        expect(state.rpcCalls).toEqual([]);
        // ...and the problem is visible in the server log
        expect(errorSpy).toHaveBeenCalled();
      } finally {
        errorSpy.mockRestore();
      }
    });

    it("retry also stops before sending", async () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      try {
        const res = await retryFailedRemindersAction(ORG_ID, PERIOD_ID, [MEMBER_1]);
        expect(res.success).toBe(false);
        expect(res.error).toBe("failed");
        expect(state.rpcCalls).toEqual([]);
      } finally {
        errorSpy.mockRestore();
      }
    });
  });

  describe("failures never reach the officer as raw text", () => {
    const RAW_DB_ERROR = 'connection to server at "10.0.0.5", port 5432 failed: FATAL password authentication';
    const FIXED = {
      preview: "We couldn't load the reminder preview. Try again.",
      send: "We couldn't send the payment reminders. Try again.",
      retry: "We couldn't retry sending reminders. Try again.",
    };
    const calls = {
      preview: () => getDuesReminderPreviewAction(ORG_ID, PERIOD_ID),
      send: () => sendDuesRemindersAction(ORG_ID, PERIOD_ID),
      retry: () => retryFailedRemindersAction(ORG_ID, PERIOD_ID, [MEMBER_1]),
    };
    const logEvent = {
      preview: "dues_reminders.preview_failed",
      send: "dues_reminders.send_failed",
      retry: "dues_reminders.retry_failed",
    };

    const run = async (kind: keyof typeof calls) => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      try {
        const res = await calls[kind]();
        const entries = spy.mock.calls.map(([line]) => JSON.parse(String(line)));
        return { res, entries };
      } finally {
        spy.mockRestore();
      }
    };

    for (const kind of ["preview", "send", "retry"] as const) {
      it(`${kind}: an unexpected database error becomes a fixed message, and the cause is only logged`, async () => {
        state.rpcResponses.get_dues_reminder_recipients = { data: null, error: { message: RAW_DB_ERROR } };

        const { res, entries } = await run(kind);

        expect(res.success).toBe(false);
        expect(res.error).toBe("failed");
        expect(res.errorMessage).toBe(FIXED[kind]);
        expect(JSON.stringify(res)).not.toContain("10.0.0.5");
        const entry = entries.find((e) => e.event === logEvent[kind]);
        expect(entry).toMatchObject({
          level: "error",
          context: { orgId: ORG_ID, periodId: PERIOD_ID },
        });
        // the real cause is in the server log
        expect(entry.context.error.message).toContain("connection to server");
      });

      it(`${kind}: malformed data from the database also becomes the fixed message`, async () => {
        // used to be returned as "Invalid reminder data returned from database"
        state.rpcResponses.get_dues_reminder_recipients = { data: { recipients: [] }, error: null };

        const { res, entries } = await run(kind);

        expect(res.success).toBe(false);
        expect(res.errorMessage).toBe(FIXED[kind]);
        expect(res.errorMessage).not.toContain("Invalid reminder data");
        expect(entries.some((e) => e.event === logEvent[kind])).toBe(true);
      });
    }

    it("keeps the existing messages for the cases that were already safe", async () => {
      state.rpcResponses.get_dues_reminder_recipients = { data: null, error: { message: "period_not_found" } };
      expect((await run("preview")).res).toMatchObject({ error: "not_found", errorMessage: "Dues period not found." });
      expect((await run("send")).res).toMatchObject({ error: "not_found", errorMessage: "Dues period not found." });

      state.rpcResponses.get_dues_reminder_recipients = { data: null, error: { message: "not_authorized" } };
      expect((await run("preview")).res).toMatchObject({
        error: "not_authorized",
        errorMessage: "You are not authorized to view this period's reminders.",
      });
      for (const kind of ["send", "retry"] as const) {
        expect((await run(kind)).res).toMatchObject({
          error: "not_authorized",
          errorMessage: "You are not authorized to send reminders for this organization.",
        });
      }
    });

    it("does not log a failure for the cases that were already mapped", async () => {
      state.rpcResponses.get_dues_reminder_recipients = { data: null, error: { message: "not_authorized" } };
      const { entries } = await run("send");
      expect(entries.filter((e) => e.event === logEvent.send)).toHaveLength(0);
    });
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

    it("reports a rejected reminder log write instead of dropping it silently", async () => {
      // supabase.rpc() returns { error } for a rejected call; it does not throw.
      state.rpcResponses.log_dues_reminder = {
        data: null,
        error: { message: "not_authorized" },
      };
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      try {
        const res = await sendDuesRemindersAction(ORG_ID, PERIOD_ID);

        // Emails already went out, so the send itself still reports as sent...
        expect(res.success).toBe(true);
        if (res.success && res.data) {
          expect(res.data.sent_count).toBe(2);
        }
        // ...but each failed log write is reported, once per recipient.
        const logFailures = errorSpy.mock.calls
          .map(([line]) => JSON.parse(String(line)))
          .filter((entry) => entry.event === "dues_reminder.log_write_failed");
        expect(logFailures.length).toBe(2);
        expect(logFailures[0].level).toBe("error");
        expect(logFailures[0].context).toMatchObject({
          periodId: PERIOD_ID,
          memberId: MEMBER_1,
          error: { message: "not_authorized" },
        });
        // No recipient address or name in the log
        expect(JSON.stringify(logFailures)).not.toContain("school.edu");
      } finally {
        errorSpy.mockRestore();
      }
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
