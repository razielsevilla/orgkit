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
} = await import("@/src/app/(workspace)/dues-actions");

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
});
