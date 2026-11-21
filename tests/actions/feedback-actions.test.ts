import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * submitFeedbackAction is how an officer's message reaches the database. These
 * tests pin down its order (who is asking, the rate limit, the message rules,
 * then the save), what it sends, and that the message never reaches a log.
 */

const ORG = "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";
// A string that must never show up in any log line
const SECRET_TEXT = "PRIVATE-MARKER-the-roster-page-shows-ana@school.edu";

interface FakeState {
  user: { id: string } | null;
  officer: { id: string } | null;
  allow: boolean;
  rpcResult: { data: unknown; error: { message: string; code?: string } | null };
  rpcThrows: boolean;
  order: string[];
  rpcCalls: { fn: string; args: Record<string, unknown> }[];
}

const state: FakeState = {
  user: { id: "user-1" },
  officer: { id: "user-1" },
  allow: true,
  rpcResult: { data: "feedback-id", error: null },
  rpcThrows: false,
  order: [],
  rpcCalls: [],
};

vi.mock("@/src/lib/auth/session-user", () => ({
  getSessionUser: async () => ({ user: state.user, supabase: {} }),
}));
vi.mock("@/src/lib/auth/officer-profile", () => ({
  getOfficerRow: async () => {
    state.order.push("officer");
    return state.officer;
  },
}));
vi.mock("@/src/lib/feedback/feedback-server", () => ({
  allowFeedbackAttempt: async () => {
    state.order.push("limit");
    return state.allow;
  },
}));
vi.mock("@/src/lib/supabase/service-role", () => ({
  createAdminClient: () => ({
    rpc: async (fn: string, args: Record<string, unknown>) => {
      state.order.push("rpc");
      state.rpcCalls.push({ fn, args });
      if (state.rpcThrows) throw new Error(`boom while saving: ${SECRET_TEXT}`);
      return state.rpcResult;
    },
  }),
}));

const { submitFeedbackAction } = await import("@/src/app/(workspace)/feedback-actions");
const { FEEDBACK_MESSAGES, FEEDBACK_MAX } = await import("@/src/lib/feedback/feedback-validation");

let errorSpy: ReturnType<typeof vi.spyOn>;
const logged = () => errorSpy.mock.calls.flat().map(String).join("\n");

beforeEach(() => {
  state.user = { id: "user-1" };
  state.officer = { id: "user-1" };
  state.allow = true;
  state.rpcResult = { data: "feedback-id", error: null };
  state.rpcThrows = false;
  state.order = [];
  state.rpcCalls = [];
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("submitFeedbackAction: who may send", () => {
  it("refuses someone who is not signed in, before counting or saving anything", async () => {
    state.user = null;
    const res = await submitFeedbackAction({ message: "Hello", pathname: "/" });

    expect(res).toEqual({ success: false, error: "not_authenticated", errorMessage: FEEDBACK_MESSAGES.notSignedIn });
    expect(state.order).toEqual([]);
  });

  it("refuses a signed-in user who has not agreed to the privacy notice (no officer row)", async () => {
    state.officer = null;
    const res = await submitFeedbackAction({ message: "Hello", pathname: "/" });

    expect(res.error).toBe("not_authorized");
    expect(state.rpcCalls).toHaveLength(0);
  });
});

describe("submitFeedbackAction: the rate limit", () => {
  it("asks the person to wait, and saves nothing, when the device is over the limit", async () => {
    state.allow = false;
    const res = await submitFeedbackAction({ message: "Hello", pathname: "/" });

    expect(res).toEqual({ success: false, error: "throttled", errorMessage: FEEDBACK_MESSAGES.throttled });
    expect(FEEDBACK_MESSAGES.throttled).toMatch(/wait a minute/);
    expect(state.rpcCalls).toHaveLength(0);
  });

  it("counts the attempt before it validates or saves", async () => {
    await submitFeedbackAction({ message: "Hello", pathname: "/" });
    expect(state.order).toEqual(["officer", "limit", "rpc"]);
  });

  it("treats the database's own hourly limit as the same 'please wait'", async () => {
    state.rpcResult = { data: null, error: { message: "rate_limited", code: "P0001" } };
    const res = await submitFeedbackAction({ message: "Hello", pathname: "/" });

    expect(res.error).toBe("throttled");
    expect(res.errorMessage).toBe(FEEDBACK_MESSAGES.throttled);
  });
});

describe("submitFeedbackAction: the message rules", () => {
  it("rejects an empty message, or one of only spaces and line breaks, without saving", async () => {
    for (const message of ["", "   ", "\n\n"]) {
      const res = await submitFeedbackAction({ message, pathname: "/" });
      expect(res).toEqual({ success: false, error: "invalid_request", errorMessage: FEEDBACK_MESSAGES.empty });
    }
    expect(state.rpcCalls).toHaveLength(0);
  });

  it("rejects a message over the length limit without saving", async () => {
    const res = await submitFeedbackAction({ message: "a".repeat(FEEDBACK_MAX + 1), pathname: "/" });

    expect(res).toEqual({ success: false, error: "invalid_request", errorMessage: FEEDBACK_MESSAGES.tooLong });
    expect(state.rpcCalls).toHaveLength(0);
  });

  it("rejects input that is not text, including a missing input", async () => {
    // @ts-expect-error a browser can send anything to a Server Action
    expect((await submitFeedbackAction({ message: 42, pathname: "/" })).error).toBe("invalid_request");
    // @ts-expect-error the action is called with no input at all
    expect((await submitFeedbackAction(undefined)).error).toBe("invalid_request");
    expect(state.rpcCalls).toHaveLength(0);
  });
});

describe("submitFeedbackAction: saving", () => {
  it("saves the trimmed message with the officer, the org and the page the officer was on", async () => {
    const res = await submitFeedbackAction({
      message: "  The dues page is slow \n",
      pathname: `/workspace/${ORG}/dues`,
    });

    expect(res).toEqual({ success: true });
    expect(state.rpcCalls).toEqual([
      {
        fn: "submit_feedback",
        args: {
          p_officer_id: "user-1",
          p_org_id: ORG,
          p_message: "The dues page is slow",
          p_page: "/workspace/:id/dues",
        },
      },
    ]);
  });

  it("saves the page with ids and secrets removed, and no query string", async () => {
    await submitFeedbackAction({
      message: "Hello",
      pathname: `/workspace/${ORG}/events/${ORG}/checkin?token=${"a".repeat(40)}#top`,
    });
    expect(state.rpcCalls[0].args.p_page).toBe("/workspace/:id/events/:id/checkin");
  });

  it("sends no org from a page that is not inside one", async () => {
    await submitFeedbackAction({ message: "Hello", pathname: "/workspace/new" });
    expect(state.rpcCalls[0].args.p_org_id).toBeNull();
    expect(state.rpcCalls[0].args.p_page).toBe("/workspace/new");

    await submitFeedbackAction({ message: "Hello", pathname: "/owner/usage" });
    expect(state.rpcCalls[1].args.p_org_id).toBeNull();
  });

  it("uses the signed-in user as the sender, whatever the browser claims", async () => {
    await submitFeedbackAction({
      message: "Hello",
      pathname: "/",
      // @ts-expect-error a browser can add fields the action never asked for
      officerId: "someone-else",
      p_officer_id: "someone-else",
    });
    expect(state.rpcCalls[0].args.p_officer_id).toBe("user-1");
  });
});

describe("submitFeedbackAction: when saving fails", () => {
  it("gives the generic message, which tells the person their text is still there", async () => {
    state.rpcResult = { data: null, error: { message: "connection reset", code: "08006" } };
    const res = await submitFeedbackAction({ message: "Hello", pathname: "/" });

    expect(res).toEqual({ success: false, error: "failed", errorMessage: FEEDBACK_MESSAGES.failed });
    expect(FEEDBACK_MESSAGES.failed).toMatch(/still here/);
  });

  it("gives the same message when the save throws", async () => {
    state.rpcThrows = true;
    const res = await submitFeedbackAction({ message: SECRET_TEXT, pathname: "/" });

    expect(res.error).toBe("failed");
    expect(res.errorMessage).toBe(FEEDBACK_MESSAGES.failed);
  });

  it("never writes the message to a log, even when the error itself repeats it", async () => {
    // A database error can carry the row it rejected, message included
    state.rpcResult = {
      data: null,
      error: { message: `check violation: Failing row contains (${SECRET_TEXT})`, code: "23514" },
    };
    await submitFeedbackAction({ message: SECRET_TEXT, pathname: "/" });

    state.rpcThrows = true;
    await submitFeedbackAction({ message: SECRET_TEXT, pathname: "/" });

    const output = logged();
    expect(output).toContain("feedback.submit_failed");
    expect(output).toContain("feedback.submit_unexpected");
    expect(output).not.toContain("PRIVATE-MARKER");
    expect(output).not.toContain("ana@school.edu");
  });
});
