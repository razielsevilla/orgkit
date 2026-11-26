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
    maybeSingle: async () => ({
      data: table === "org_officers" && state.callerRole ? { role: state.callerRole } : null,
      error: null,
    }),
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

const { getOrgHealth } = await import("@/src/app/(workspace)/org-health-actions");

const ORG_ID = "11111111-1111-4111-8111-111111111111";

describe("getOrgHealth server action", () => {
  beforeEach(() => {
    state.user = { id: "officer-user-id" };
    state.callerRole = "officer";
    state.rpcCalls = [];
    state.rpcResult = { data: null, error: null };
  });

  it("fails with not_found for a malformed org id, without calling the database", async () => {
    const res = await getOrgHealth("not-a-uuid");
    expect(res).toMatchObject({ success: false, error: "not_found" });
    expect(state.rpcCalls).toHaveLength(0);
  });

  it("fails with not_authenticated when signed out", async () => {
    state.user = null;
    const res = await getOrgHealth(ORG_ID);
    expect(res).toMatchObject({ success: false, error: "not_authenticated" });
    expect(state.rpcCalls).toHaveLength(0);
  });

  it("fails with access_revoked for someone who is not an officer of the org", async () => {
    state.callerRole = null;
    const res = await getOrgHealth(ORG_ID);
    expect(res).toMatchObject({ success: false, error: "access_revoked" });
    expect(state.rpcCalls).toHaveLength(0);
  });

  it("works for every officer role, not just admins", async () => {
    state.rpcResult = { data: { members: { active: 3 } }, error: null };
    for (const role of ["admin", "finance", "officer"]) {
      state.callerRole = role;
      const res = await getOrgHealth(ORG_ID);
      expect(res.success).toBe(true);
    }
  });

  it("calls get_org_health with the org id and maps the answer", async () => {
    state.rpcResult = {
      data: {
        today: "2026-12-01",
        members: { active: 12, pending: 2, oldest_pending_days: 4 },
        dues: null,
        events: { total: 0 },
      },
      error: null,
    };
    const res = await getOrgHealth(ORG_ID);

    expect(state.rpcCalls).toEqual([{ fn: "get_org_health", args: { p_org_id: ORG_ID } }]);
    expect(res.success).toBe(true);
    expect(res.data?.members).toMatchObject({ active: 12, pending: 2, oldestPendingDays: 4 });
    expect(res.data?.dues).toBeNull();
  });

  it("turns the database's not_authorized into a clear message", async () => {
    state.rpcResult = { error: { message: "not_authorized" } };
    const res = await getOrgHealth(ORG_ID);
    expect(res).toMatchObject({
      success: false,
      error: "not_authorized",
      errorMessage: "You no longer have access to this org.",
    });
  });

  it("hides internal database errors behind a generic message", async () => {
    state.rpcResult = { error: { message: 'relation "secret_table" does not exist' } };
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const res = await getOrgHealth(ORG_ID);
      expect(res).toMatchObject({
        success: false,
        error: "failed",
        errorMessage: "We couldn't load your org's health. Try again.",
      });
      expect(JSON.stringify(res)).not.toContain("secret_table");
    } finally {
      spy.mockRestore();
    }
  });

  it("logs and fails cleanly when the answer is not an object", async () => {
    state.rpcResult = { data: "garbage", error: null };
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const res = await getOrgHealth(ORG_ID);
      expect(res).toMatchObject({ success: false, error: "failed" });
      const events = spy.mock.calls.map(([line]) => JSON.parse(String(line)).event);
      expect(events).toContain("org_health.parse_failed");
    } finally {
      spy.mockRestore();
    }
  });
});
