import { beforeEach, describe, expect, it, vi } from "vitest";
import { ATTENDANCE_MESSAGES } from "@/src/lib/events/attendance-state";

interface FakeState {
  user: { id: string } | null;
  callerRole: string | null;
  rpcCalls: { fn: string; args: Record<string, unknown> }[];
  rpcResult: { data: unknown; error: { message: string } | null };
  attendanceRows: Record<string, unknown>[];
  attendanceError: { message: string } | null;
  activeCount: number | null;
  memberRows: Record<string, unknown>[];
  /** Filters the member search applied, to prove the query is scoped */
  memberFilters: string[];
  tablesRead: string[];
}

const state: FakeState = {
  user: null,
  callerRole: null,
  rpcCalls: [],
  rpcResult: { data: "added", error: null },
  attendanceRows: [],
  attendanceError: null,
  activeCount: 0,
  memberRows: [],
  memberFilters: [],
  tablesRead: [],
};

/** A chain that records every call and resolves like a PostgREST builder */
function builder(result: () => unknown, role?: () => unknown) {
  const chain: Record<string, unknown> = {};
  for (const name of ["select", "eq", "or", "order", "limit", "not"]) {
    chain[name] = (...args: unknown[]) => {
      if (name === "eq" || name === "or" || name === "not") state.memberFilters.push(`${name}:${args.join(",")}`);
      return chain;
    };
  }
  chain.maybeSingle = async () => ({ data: role ? role() : null, error: null });
  chain.then = (resolve: (v: unknown) => unknown) => resolve(result());
  return chain;
}

const fakeClient = {
  auth: { getUser: async () => ({ data: { user: state.user } }) },
  from: (table: string) => {
    state.tablesRead.push(table);
    if (table === "org_officers") {
      return builder(() => null, () => (state.callerRole ? { role: state.callerRole } : null));
    }
    if (table === "attendance") {
      return builder(() => ({
        data: state.attendanceError ? null : state.attendanceRows,
        error: state.attendanceError,
      }));
    }
    // members: the active count (head) or the candidate search, told apart by the .limit() call
    const memberChain = builder(() => ({ data: state.memberRows, error: null, count: state.activeCount }));
    return memberChain;
  },
  rpc: async (fn: string, args: Record<string, unknown>) => {
    state.rpcCalls.push({ fn, args });
    return state.rpcResult;
  },
};

vi.mock("@/src/lib/supabase/server", () => ({ createClient: async () => fakeClient }));
const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath: (p: string) => revalidatePath(p) }));

const { getEventAttendanceAction, searchAttendeeCandidatesAction, addAttendanceAction, removeAttendanceAction } =
  await import("@/src/app/(workspace)/attendance-actions");

const ORG = "11111111-1111-4111-8111-111111111111";
const ME = "22222222-2222-4222-8222-222222222222";
const EVENT = "33333333-3333-4333-8333-333333333333";
const MEMBER = "44444444-4444-4444-8444-444444444444";

beforeEach(() => {
  state.user = { id: ME };
  state.callerRole = "officer";
  state.rpcCalls = [];
  state.rpcResult = { data: "added", error: null };
  state.attendanceRows = [];
  state.attendanceError = null;
  state.activeCount = 0;
  state.memberRows = [];
  state.memberFilters = [];
  state.tablesRead = [];
  revalidatePath.mockClear();
});

describe("getEventAttendanceAction", () => {
  it("returns the records newest first with the active member count", async () => {
    state.activeCount = 85;
    state.attendanceRows = [
      { member_id: "a", method: "qr", checked_in_at: "2030-05-01T10:01:00Z", members: { full_name: "Ana" } },
      { member_id: "b", method: "manual", checked_in_at: "2030-05-01T10:05:00Z", members: [{ full_name: "Ben" }] },
    ];
    const res = await getEventAttendanceAction(ORG, EVENT);

    expect(res.success).toBe(true);
    expect(res.data?.activeCount).toBe(85);
    expect(res.data?.records).toEqual([
      { memberId: "b", fullName: "Ben", method: "manual", checkedInAt: "2030-05-01T10:05:00Z" },
      { memberId: "a", fullName: "Ana", method: "qr", checkedInAt: "2030-05-01T10:01:00Z" },
    ]);
  });

  it("reads nothing for a malformed ID", async () => {
    const res = await getEventAttendanceAction("nope", EVENT);
    expect(res.success).toBe(false);
    expect(res.error).toBe("not_found");
    expect(state.tablesRead).toEqual([]);
  });

  it("fails with the load message when the read fails", async () => {
    state.attendanceError = { message: "boom" };
    const res = await getEventAttendanceAction(ORG, EVENT);
    expect(res.success).toBe(false);
    expect(res.errorMessage).toBe(ATTENDANCE_MESSAGES.loadFailed);
  });

  it("is refused for a signed-out caller", async () => {
    state.user = null;
    const res = await getEventAttendanceAction(ORG, EVENT);
    expect(res.error).toBe("not_authenticated");
  });
});

describe("searchAttendeeCandidatesAction", () => {
  it("answers an empty search with nothing and reads nothing", async () => {
    const res = await searchAttendeeCandidatesAction(ORG, EVENT, "   ");
    expect(res.success).toBe(true);
    expect(res.data).toEqual([]);
    expect(state.tablesRead).toEqual([]);
  });

  it("searches active members of the org and leaves out those already present", async () => {
    state.attendanceRows = [{ member_id: MEMBER }];
    state.memberRows = [{ id: "m1", full_name: "Ana Reyes", email: "ana@school.edu" }];
    const res = await searchAttendeeCandidatesAction(ORG, EVENT, "ana");

    expect(res.data).toEqual([{ id: "m1", fullName: "Ana Reyes", email: "ana@school.edu" }]);
    expect(state.memberFilters).toContain(`eq:org_id,${ORG}`);
    expect(state.memberFilters).toContain("eq:status,active");
    expect(state.memberFilters).toContain(`not:id,in,(${MEMBER})`);
  });

  it("rejects malformed IDs", async () => {
    const res = await searchAttendeeCandidatesAction("x", EVENT, "ana");
    expect(res.error).toBe("invalid_request");
  });
});

describe("addAttendanceAction", () => {
  it("calls mark_attendance_manual and revalidates the event page", async () => {
    const res = await addAttendanceAction(ORG, EVENT, MEMBER);
    expect(res.success).toBe(true);
    expect(state.rpcCalls).toEqual([
      { fn: "mark_attendance_manual", args: { target_event: EVENT, target_member: MEMBER } },
    ]);
    expect(revalidatePath).toHaveBeenCalledWith(`/workspace/${ORG}/events/${EVENT}`);
  });

  it("treats a member who is already present as success", async () => {
    state.rpcResult = { data: "already", error: null };
    const res = await addAttendanceAction(ORG, EVENT, MEMBER);
    expect(res.success).toBe(true);
  });

  it.each([
    ["event_cancelled", "cancelled", ATTENDANCE_MESSAGES.cancelled],
    ["event_not_found", "not_found", ATTENDANCE_MESSAGES.notFound],
    ["member_not_found", "member_not_found", ATTENDANCE_MESSAGES.memberNotFound],
    ["not_permitted", "access_revoked", ATTENDANCE_MESSAGES.notPermitted],
  ])("maps %s", async (word, error, message) => {
    state.rpcResult = { data: null, error: { message: `ERROR: ${word}` } };
    const res = await addAttendanceAction(ORG, EVENT, MEMBER);
    expect(res.success).toBe(false);
    expect(res.error).toBe(error);
    expect(res.errorMessage).toBe(message);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("hides an unexpected database error behind the generic message", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    state.rpcResult = { data: null, error: { message: "relation secret_table does not exist" } };
    const res = await addAttendanceAction(ORG, EVENT, MEMBER);
    expect(res.error).toBe("failed");
    expect(res.errorMessage).toBe(ATTENDANCE_MESSAGES.addFailed);
  });

  it("calls nothing for malformed IDs", async () => {
    const res = await addAttendanceAction(ORG, EVENT, "not-a-uuid");
    expect(res.error).toBe("invalid_request");
    expect(state.rpcCalls).toEqual([]);
  });
});

describe("removeAttendanceAction", () => {
  it("calls remove_attendance and revalidates the event page", async () => {
    state.rpcResult = { data: "removed", error: null };
    const res = await removeAttendanceAction(ORG, EVENT, MEMBER);
    expect(res.success).toBe(true);
    expect(state.rpcCalls).toEqual([
      { fn: "remove_attendance", args: { target_event: EVENT, target_member: MEMBER } },
    ]);
    expect(revalidatePath).toHaveBeenCalledWith(`/workspace/${ORG}/events/${EVENT}`);
  });

  it("shows the remove message when the database fails unexpectedly", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    state.rpcResult = { data: null, error: { message: "boom" } };
    const res = await removeAttendanceAction(ORG, EVENT, MEMBER);
    expect(res.success).toBe(false);
    expect(res.errorMessage).toBe(ATTENDANCE_MESSAGES.removeFailed);
  });

  it("maps a cancelled event", async () => {
    state.rpcResult = { data: null, error: { message: "event_cancelled" } };
    const res = await removeAttendanceAction(ORG, EVENT, MEMBER);
    expect(res.error).toBe("cancelled");
  });
});
