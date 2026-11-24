import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

interface FakeState {
  user: { id: string } | null;
  callerRole: string | null;
  org: { id: string; name: string } | null;
  rpcResult: { data?: unknown; error?: { message: string } | null };
  rpcCalls: { fn: string; args: Record<string, unknown> }[];
}

const state: FakeState = {
  user: null,
  callerRole: null,
  org: null,
  rpcResult: { data: null, error: null },
  rpcCalls: [],
};

function query(table: string) {
  const single = () => {
    if (table === "org_officers") {
      return { data: state.callerRole ? { role: state.callerRole } : null, error: null };
    }
    if (table === "orgs") return { data: state.org, error: null };
    return { data: null, error: null };
  };
  const builder: Record<string, unknown> = {
    select: () => builder,
    eq: () => builder,
    maybeSingle: async () => single(),
    then: (resolve: (v: unknown) => unknown) => Promise.resolve(single()).then(resolve),
  };
  return builder;
}

const fakeClient = {
  auth: { getUser: async () => ({ data: { user: state.user } }) },
  from: (table: string) => query(table),
  rpc: async (fn: string, args: Record<string, unknown>) => {
    state.rpcCalls.push({ fn, args });
    return state.rpcResult;
  },
};

vi.mock("@/src/lib/supabase/server", () => ({ createClient: async () => fakeClient }));
vi.mock("@/src/lib/supabase/service-role", () => ({ createAdminClient: () => fakeClient }));

const { transferAdminRightsAction } = await import("@/src/app/(workspace)/officers-actions");

const ORG = "11111111-1111-4111-8111-111111111111";
const ME = "22222222-2222-4222-8222-222222222222";
const TARGET = "33333333-3333-4333-8333-333333333333";

beforeEach(() => {
  state.user = { id: ME };
  state.callerRole = "admin";
  state.org = { id: ORG, name: "Robotics Club" };
  state.rpcResult = { data: null, error: null };
  state.rpcCalls = [];
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("transferAdminRightsAction", () => {
  it("successfully transfers admin rights when caller is admin and org name matches", async () => {
    state.rpcResult = { data: null, error: null };

    const res = await transferAdminRightsAction(ORG, {
      targetOfficerId: TARGET,
      callerNewRole: "officer",
      confirmOrgName: "Robotics Club",
    });

    expect(res.success).toBe(true);
    expect(res.data?.callerNewRole).toBe("officer");
    expect(state.rpcCalls).toHaveLength(1);
    expect(state.rpcCalls[0]).toEqual({
      fn: "transfer_admin_rights",
      args: {
        p_org_id: ORG,
        p_target_officer_id: TARGET,
        p_caller_new_role: "officer",
      },
    });
  });

  it("supports stepping down completely (callerNewRole = 'remove')", async () => {
    state.rpcResult = { data: null, error: null };

    const res = await transferAdminRightsAction(ORG, {
      targetOfficerId: TARGET,
      callerNewRole: "remove",
      confirmOrgName: "Robotics Club",
    });

    expect(res.success).toBe(true);
    expect(res.data?.callerNewRole).toBe("remove");
    expect(state.rpcCalls[0]?.args.p_caller_new_role).toBe("remove");
  });

  it("fails when typed org name does not match", async () => {
    const res = await transferAdminRightsAction(ORG, {
      targetOfficerId: TARGET,
      callerNewRole: "officer",
      confirmOrgName: "Wrong Club Name",
    });

    expect(res.success).toBe(false);
    expect(res.errorMessage).toContain("organization name does not match");
    expect(state.rpcCalls).toHaveLength(0);
  });

  it("fails when caller is not an admin", async () => {
    state.callerRole = "officer";

    const res = await transferAdminRightsAction(ORG, {
      targetOfficerId: TARGET,
      callerNewRole: "officer",
      confirmOrgName: "Robotics Club",
    });

    expect(res.success).toBe(false);
    expect(res.errorMessage).toContain("Only admins");
    expect(state.rpcCalls).toHaveLength(0);
  });

  it("returns user-friendly error when RPC reports last_admin invariant violation", async () => {
    state.rpcResult = {
      error: { message: "last_admin" },
    };

    const res = await transferAdminRightsAction(ORG, {
      targetOfficerId: TARGET,
      callerNewRole: "remove",
      confirmOrgName: "Robotics Club",
    });

    expect(res.success).toBe(false);
    expect(res.errorMessage).toContain("Every org needs at least one admin");
  });

  it("returns user-friendly error when target is the caller", async () => {
    state.rpcResult = {
      error: { message: "cannot_transfer_to_self" },
    };

    const res = await transferAdminRightsAction(ORG, {
      targetOfficerId: ME,
      callerNewRole: "officer",
      confirmOrgName: "Robotics Club",
    });

    expect(res.success).toBe(false);
    expect(res.errorMessage).toContain("already an admin");
  });

  it("validates input fields against schema", async () => {
    const res = await transferAdminRightsAction(ORG, {
      targetOfficerId: "invalid-uuid",
      callerNewRole: "officer",
      confirmOrgName: "Robotics Club",
    });

    expect(res.success).toBe(false);
    expect(state.rpcCalls).toHaveLength(0);
  });
});
