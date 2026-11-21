import { beforeEach, describe, expect, it, vi } from "vitest";
import { HISTORY_MESSAGES } from "@/src/lib/members/attendance-history";

interface FakeState {
  user: { id: string } | null;
  callerRole: string | null;
  rpcCalls: { fn: string; args: Record<string, unknown> }[];
  rpcResult: { data: unknown; error: { message: string } | null };
  tablesRead: string[];
}

const state: FakeState = {
  user: null,
  callerRole: null,
  rpcCalls: [],
  rpcResult: { data: null, error: null },
  tablesRead: [],
};

/** Only the officer lookup reads a table; the history itself comes from the RPC */
function officerBuilder() {
  const chain: Record<string, unknown> = {};
  for (const name of ["select", "eq"]) chain[name] = () => chain;
  chain.maybeSingle = async () => ({
    data: state.callerRole ? { role: state.callerRole } : null,
    error: null,
  });
  return chain;
}

const fakeClient = {
  auth: { getUser: async () => ({ data: { user: state.user } }) },
  from: (table: string) => {
    state.tablesRead.push(table);
    return officerBuilder();
  },
  rpc: async (fn: string, args: Record<string, unknown>) => {
    state.rpcCalls.push({ fn, args });
    return state.rpcResult;
  },
};

vi.mock("@/src/lib/supabase/server", () => ({ createClient: async () => fakeClient }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { getMemberAttendanceHistoryAction } = await import("@/src/app/(workspace)/attendance-actions");

const ORG = "11111111-1111-4111-8111-111111111111";
const OTHER_ORG = "55555555-5555-4555-8555-555555555555";
const ME = "22222222-2222-4222-8222-222222222222";
const MEMBER = "44444444-4444-4444-8444-444444444444";

const payload = (orgId = ORG) => ({
  org_id: orgId,
  joined_at: "2030-03-01T00:00:00Z",
  events: [
    {
      event_id: "e1",
      title: "General meeting",
      starts_at: "2030-04-01T10:00:00Z",
      ends_at: "2030-04-01T12:00:00Z",
      status: "scheduled",
      attended: true,
      method: "qr",
      checked_in_at: "2030-04-01T10:03:00Z",
    },
  ],
});

beforeEach(() => {
  state.user = { id: ME };
  state.callerRole = "officer";
  state.rpcCalls = [];
  state.rpcResult = { data: payload(), error: null };
  state.tablesRead = [];
});

describe("getMemberAttendanceHistoryAction", () => {
  it("returns the member's history", async () => {
    const res = await getMemberAttendanceHistoryAction(ORG, MEMBER);

    expect(res.success).toBe(true);
    expect(res.data?.joinedAt).toBe("2030-03-01T00:00:00Z");
    expect(res.data?.rows).toHaveLength(1);
    expect(res.data?.rows[0]).toMatchObject({ title: "General meeting", attended: true, method: "qr" });
    expect(state.rpcCalls).toEqual([{ fn: "get_member_attendance_history", args: { target_member: MEMBER } }]);
  });

  it("answers not_found for a malformed ID without touching the database", async () => {
    for (const [org, member] of [
      ["nope", MEMBER],
      [ORG, "nope"],
      [ORG, ""],
    ]) {
      const res = await getMemberAttendanceHistoryAction(org, member);
      expect(res.success).toBe(false);
      expect(res.error).toBe("not_found");
      expect(res.data).toBeUndefined();
    }
    expect(state.rpcCalls).toEqual([]);
    expect(state.tablesRead).toEqual([]);
  });

  it("answers not_found when the database can't find the member", async () => {
    state.rpcResult = { data: null, error: { message: "member_not_found" } };
    const res = await getMemberAttendanceHistoryAction(ORG, MEMBER);
    expect(res.error).toBe("not_found");
    expect(res.errorMessage).toBe(HISTORY_MESSAGES.notFound);
    expect(res.data).toBeUndefined();
  });

  it("answers not_found, with no data, when the member belongs to another org", async () => {
    state.rpcResult = { data: payload(OTHER_ORG), error: null };
    const res = await getMemberAttendanceHistoryAction(ORG, MEMBER);
    expect(res.error).toBe("not_found");
    expect(res.data).toBeUndefined();
  });

  it("refuses someone who is not an officer of the org", async () => {
    state.callerRole = null;
    const res = await getMemberAttendanceHistoryAction(ORG, MEMBER);
    expect(res.success).toBe(false);
    expect(res.error).toBe("access_revoked");
    expect(state.rpcCalls).toEqual([]);
  });

  it("fails with the load message on any other database error", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    state.rpcResult = { data: null, error: { message: "connection reset" } };
    const res = await getMemberAttendanceHistoryAction(ORG, MEMBER);
    expect(res.error).toBe("failed");
    expect(res.errorMessage).toBe(HISTORY_MESSAGES.loadFailed);
  });

  it("fails when the response has an unexpected shape", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    state.rpcResult = { data: { org_id: ORG, joined_at: 5 }, error: null };
    const res = await getMemberAttendanceHistoryAction(ORG, MEMBER);
    expect(res.error).toBe("failed");
  });
});
