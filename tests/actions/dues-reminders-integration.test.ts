import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RawReminderRpcResponse } from "@/src/lib/dues/dues-reminders-server";
import { MockEmailSender } from "@/src/lib/email/email-sender";

interface TestState {
  user: { id: string } | null;
  callerRole: string | null;
  rpcCalls: { fn: string; args: Record<string, unknown> }[];
  rawRpcData: RawReminderRpcResponse;
  mockSender: MockEmailSender;
}

const mockSender = new MockEmailSender();

const ORG_ID = "11111111-1111-1111-1111-111111111111";
const PERIOD_ID = "22222222-2222-2222-2222-222222222222";
const MEM_1 = "33333333-3333-3333-3333-333333333331";
const MEM_2 = "33333333-3333-3333-3333-333333333332";
const MEM_3 = "33333333-3333-3333-3333-333333333333";
const MEM_4 = "33333333-3333-3333-3333-333333333334";
const MEM_5 = "33333333-3333-3333-3333-333333333335";
const MEM_6 = "33333333-3333-3333-3333-333333333336";

const state: TestState = {
  user: { id: "00000000-0000-0000-0000-000000000001" },
  callerRole: "admin",
  rpcCalls: [],
  mockSender,
  rawRpcData: {
    period: {
      id: PERIOD_ID,
      org_id: ORG_ID,
      org_name: "UP Association of Computing Machinery",
      period_name: "1st Semester Dues 2026-2027",
      amount: "350.00",
      due_on: "2026-12-15",
      pay_token: "acm-dues-2026-sem1",
      status: "open",
      is_closed: false,
    },
    counts: {
      total_active_members: 15,
      total_unpaid: 3,
      eligible: 3,
      skipped_24h: 0,
      paid_or_pending: 12,
    },
    recipients: [
      {
        member_id: MEM_1,
        full_name: "Juan Dela Cruz",
        email: "juan@university.edu.ph",
        is_eligible: true,
        skip_reason: null,
        last_reminded_at: null,
      },
      {
        member_id: MEM_2,
        full_name: "Maria Clara",
        email: "maria@university.edu.ph",
        is_eligible: true,
        skip_reason: null,
        last_reminded_at: null,
      },
      {
        member_id: MEM_3,
        full_name: "Jose Rizal",
        email: "jose@university.edu.ph",
        is_eligible: true,
        skip_reason: null,
        last_reminded_at: null,
      },
      {
        member_id: MEM_4,
        full_name: "Andres Bonifacio",
        email: "andres@university.edu.ph",
        is_eligible: false,
        skip_reason: "payment_pending",
        last_reminded_at: null,
      },
      {
        member_id: MEM_5,
        full_name: "Gabriela Silang",
        email: "gabriela@university.edu.ph",
        is_eligible: false,
        skip_reason: "paid",
        last_reminded_at: null,
      },
      {
        member_id: MEM_6,
        full_name: "Emilio Aguinaldo",
        email: "emilio@university.edu.ph",
        is_eligible: false,
        skip_reason: "inactive",
        last_reminded_at: null,
      },
    ],
  },
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
        if (fn === "get_dues_reminder_recipients") {
          return Promise.resolve({ data: state.rawRpcData, error: null });
        }
        if (fn === "log_dues_reminder") {
          return Promise.resolve({ data: "logged-uuid", error: null });
        }
        return Promise.resolve({ data: null, error: null });
      },
    },
  }),
}));

vi.mock("@/src/lib/email/email-sender", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/src/lib/email/email-sender")>();
  return {
    ...actual,
    getEmailSender: () => state.mockSender,
  };
});

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/src/lib/request", () => ({
  getBaseUrl: async () => "https://orgkit.ph",
}));

const {
  getDuesReminderPreviewAction,
  sendDuesRemindersAction,
  retryFailedRemindersAction,
} = await import("@/src/app/(workspace)/dues-reminders-actions");

describe("Phase 10: Dues Reminders End-to-End Integration Flow", () => {
  beforeEach(() => {
    state.rpcCalls = [];
    state.mockSender.reset();
  });

  it("Scenario 1, 2, 3: previews and sends reminders to unpaid members only, excluding paid/pending/inactive", async () => {
    // 1. Fetch preview
    const previewRes = await getDuesReminderPreviewAction(ORG_ID, PERIOD_ID);
    expect(previewRes.success).toBe(true);
    expect(previewRes.data).toBeDefined();

    const preview = previewRes.data!;
    expect(preview.eligible_count).toBe(3);
    expect(preview.total_unpaid_count).toBe(3);
    expect(preview.skipped_24h_count).toBe(0);
    expect(preview.period.org_name).toBe("UP Association of Computing Machinery");
    expect(preview.period.amount).toBe(350);
    expect(preview.period.pay_url).toBe("https://orgkit.ph/pay/acm-dues-2026-sem1");

    // Preview message contains bilingual copy and due date
    expect(preview.preview_subject).toContain("UP Association of Computing Machinery");
    expect(preview.preview_text).toContain("₱350.00");
    expect(preview.preview_text).toContain("https://orgkit.ph/pay/acm-dues-2026-sem1");
    expect(preview.preview_text).toContain("Maraming salamat sa inyong suporta!");

    // 2. Confirm and send
    const sendRes = await sendDuesRemindersAction(ORG_ID, PERIOD_ID);
    expect(sendRes.success).toBe(true);
    expect(sendRes.data).toBeDefined();

    const summary = sendRes.data!;
    expect(summary.sent_count).toBe(3);
    expect(summary.failed_count).toBe(0);
    expect(summary.failures).toHaveLength(0);

    // Verify exactly 3 emails were dispatched via MockEmailSender
    const sentEmails = state.mockSender.getSentEmails();
    expect(sentEmails).toHaveLength(3);

    const recipientEmails = sentEmails.map((m) => m.to);
    expect(recipientEmails).toContain("juan@university.edu.ph");
    expect(recipientEmails).toContain("maria@university.edu.ph");
    expect(recipientEmails).toContain("jose@university.edu.ph");

    // Verify paid, pending, and inactive members were NEVER emailed
    expect(recipientEmails).not.toContain("andres@university.edu.ph");
    expect(recipientEmails).not.toContain("gabriela@university.edu.ph");
    expect(recipientEmails).not.toContain("emilio@university.edu.ph");

    // Verify dues_reminders database log was written for each send
    const logCalls = state.rpcCalls.filter((c) => c.fn === "log_dues_reminder");
    expect(logCalls).toHaveLength(3);
    expect(logCalls.map((c) => c.args.p_status)).toEqual(["sent", "sent", "sent"]);
  });

  it("Scenario 4: skips already-reminded members within 24 hours on consecutive send", async () => {
    // Simulate state where all 3 unpaid members were reminded within the last 24 hours
    state.rawRpcData = {
      ...state.rawRpcData,
      counts: {
        total_active_members: 15,
        total_unpaid: 3,
        eligible: 0,
        skipped_24h: 3,
        paid_or_pending: 12,
      },
      recipients: [
        {
          member_id: MEM_1,
          full_name: "Juan Dela Cruz",
          email: "juan@university.edu.ph",
          is_eligible: false,
          skip_reason: "reminded_recently",
          last_reminded_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
        },
        {
          member_id: MEM_2,
          full_name: "Maria Clara",
          email: "maria@university.edu.ph",
          is_eligible: false,
          skip_reason: "reminded_recently",
          last_reminded_at: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
        },
        {
          member_id: MEM_3,
          full_name: "Jose Rizal",
          email: "jose@university.edu.ph",
          is_eligible: false,
          skip_reason: "reminded_recently",
          last_reminded_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
        },
      ],
    };

    // 1. Preview shows 0 eligible, 3 skipped due to 24h cooldown
    const previewRes = await getDuesReminderPreviewAction(ORG_ID, PERIOD_ID);
    expect(previewRes.success).toBe(true);
    expect(previewRes.data!.eligible_count).toBe(0);
    expect(previewRes.data!.skipped_24h_count).toBe(3);

    // 2. Dispatching reminders skips all recently reminded members
    const sendRes = await sendDuesRemindersAction(ORG_ID, PERIOD_ID);
    expect(sendRes.success).toBe(true);
    expect(sendRes.data!.sent_count).toBe(0);
    expect(sendRes.data!.skipped_count).toBe(3);
    expect(sendRes.data!.failed_count).toBe(0);

    // 0 emails dispatched, 0 logs added
    expect(state.mockSender.getSentEmails()).toHaveLength(0);
    const logCalls = state.rpcCalls.filter((c) => c.fn === "log_dues_reminder");
    expect(logCalls).toHaveLength(0);
  });

  it("Scenario 5: lists partial send failures by member and retries only failed recipients", async () => {
    // Reset raw data to 3 eligible members
    state.rawRpcData = {
      ...state.rawRpcData,
      counts: {
        total_active_members: 15,
        total_unpaid: 3,
        eligible: 3,
        skipped_24h: 0,
        paid_or_pending: 12,
      },
      recipients: [
        {
          member_id: MEM_1,
          full_name: "Juan Dela Cruz",
          email: "juan@university.edu.ph",
          is_eligible: true,
          skip_reason: null,
          last_reminded_at: null,
        },
        {
          member_id: MEM_2,
          full_name: "Maria Clara",
          email: "maria@university.edu.ph",
          is_eligible: true,
          skip_reason: null,
          last_reminded_at: null,
        },
        {
          member_id: MEM_3,
          full_name: "Jose Rizal",
          email: "jose@university.edu.ph",
          is_eligible: true,
          skip_reason: null,
          last_reminded_at: null,
        },
      ],
    };

    // Force Jose's email delivery to bounce/fail
    state.mockSender.setFailFor(["jose@university.edu.ph"], "550 Mailbox does not exist");

    // 1. Initial send execution
    const initialSendRes = await sendDuesRemindersAction(ORG_ID, PERIOD_ID);
    expect(initialSendRes.success).toBe(true);

    const summary = initialSendRes.data!;
    expect(summary.sent_count).toBe(2);
    expect(summary.failed_count).toBe(1);
    expect(summary.failures).toHaveLength(1);

    const failedMember = summary.failures[0];
    expect(failedMember.member_id).toBe(MEM_3);
    expect(failedMember.full_name).toBe("Jose Rizal");
    expect(failedMember.email).toBe("jose@university.edu.ph");
    expect(failedMember.error_message).toBe("Email bounced (address not found)");

    // Verify 2 emails succeeded, 1 failed in the sender
    expect(state.mockSender.getSentEmails()).toHaveLength(2);

    // Verify database logs status: sent for 2, bounced for 1
    const initialLogCalls = state.rpcCalls.filter((c) => c.fn === "log_dues_reminder");
    expect(initialLogCalls).toHaveLength(3);
    const statuses = initialLogCalls.map((c) => c.args.p_status);
    expect(statuses).toContain("sent");
    expect(statuses).toContain("bounced");

    // 2. Clear sender failure to simulate resolution or transient retry
    state.mockSender.clearFailures();
    state.rpcCalls = [];

    // 3. Retry specifically for failed recipient MEM_3
    const retryRes = await retryFailedRemindersAction(ORG_ID, PERIOD_ID, [MEM_3]);
    expect(retryRes.success).toBe(true);

    const retrySummary = retryRes.data!;
    expect(retrySummary.sent_count).toBe(1);
    expect(retrySummary.failed_count).toBe(0);
    expect(retrySummary.failures).toHaveLength(0);

    // Verify that ONLY Jose received a retry email and previously successful members were not emailed again
    const allSentEmails = state.mockSender.getSentEmails();
    expect(allSentEmails).toHaveLength(3); // 2 initial + 1 retry
    expect(allSentEmails[2].to).toBe("jose@university.edu.ph");

    // Verify retry logged status "sent" for Jose
    const retryLogs = state.rpcCalls.filter((c) => c.fn === "log_dues_reminder");
    expect(retryLogs).toHaveLength(1);
    expect(retryLogs[0].args.p_member_id).toBe(MEM_3);
    expect(retryLogs[0].args.p_status).toBe("sent");
  });

  it("Scenario 8: verifies payment link token integrity in generated emails", async () => {
    const customToken = "unique-rotated-token-xyz-789";
    state.rawRpcData = {
      ...state.rawRpcData,
      period: {
        ...state.rawRpcData.period,
        pay_token: customToken,
      },
      counts: {
        total_active_members: 1,
        total_unpaid: 1,
        eligible: 1,
        skipped_24h: 0,
        paid_or_pending: 0,
      },
      recipients: [
        {
          member_id: MEM_1,
          full_name: "Juan Dela Cruz",
          email: "juan@university.edu.ph",
          is_eligible: true,
          skip_reason: null,
          last_reminded_at: null,
        },
      ],
    };

    const sendRes = await sendDuesRemindersAction(ORG_ID, PERIOD_ID);
    expect(sendRes.success).toBe(true);

    const sentEmails = state.mockSender.getSentEmails();
    expect(sentEmails).toHaveLength(1);

    const sentEmail = sentEmails[0];
    const expectedPayUrl = `https://orgkit.ph/pay/${customToken}`;

    // Verify plaintext content has exact token link
    expect(sentEmail.text).toContain(expectedPayUrl);
    expect(sentEmail.text).toContain("₱350.00");
    expect(sentEmail.text).toContain("Dec 15, 2026");

    // Verify HTML content has exact token link in CTA button
    expect(sentEmail.html).toBeDefined();
    expect(sentEmail.html).toContain(`href="${expectedPayUrl}"`);
    expect(sentEmail.html).toContain("Pay Now &amp; Submit Receipt");
    expect(sentEmail.html).toContain("₱350.00");
  });
});
