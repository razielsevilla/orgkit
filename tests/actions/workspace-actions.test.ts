import { beforeEach, describe, expect, it, vi } from "vitest";

interface FakeState {
  user: { id: string; email?: string } | null;
  rpcResult: { data?: unknown; error?: { message: string; code?: string } | null };
  rpcCalls: { fn: string; args: Record<string, unknown> }[];
  membership: { org_id: string } | null;
  org: { id: string; name: string; school: string | null } | null;
  officer: { id: string; email: string | null; full_name: string | null } | null;
  adminRpc: boolean | null;
}

const state: FakeState = {
  user: null,
  rpcResult: { data: null, error: null },
  rpcCalls: [],
  membership: null,
  org: null,
  officer: null,
  adminRpc: null,
};

function query(table: string) {
  const builder: Record<string, unknown> = {
    select: () => builder,
    eq: () => builder,
    order: () => builder,
    limit: () => builder,
    maybeSingle: async () => {
      if (table === "org_officers") return { data: state.membership, error: null };
      if (table === "orgs") return { data: state.org, error: null };
      if (table === "officers") return { data: state.officer, error: null };
      return { data: null, error: null };
    },
  };
  return builder;
}

const fakeClient = {
  auth: { getUser: async () => ({ data: { user: state.user } }) },
  from: (table: string) => query(table),
  rpc: async (fn: string, args: Record<string, unknown>) => {
    state.rpcCalls.push({ fn, args });
    if (fn === "is_org_admin") return { data: state.adminRpc, error: null };
    return state.rpcResult;
  },
};

vi.mock("@/src/lib/supabase/server", () => ({ createClient: async () => fakeClient }));

const {
  createWorkspace,
  getOrganizationById,
  getOfficerDefaultWorkspace,
  getCurrentOfficer,
  isOrgAdmin,
} = await import("@/src/app/(workspace)/actions");

const ORG = "11111111-1111-4111-8111-111111111111";
const ME = "22222222-2222-4222-8222-222222222222";

beforeEach(() => {
  state.user = { id: ME, email: "me@school.edu" };
  state.rpcResult = { data: ORG, error: null };
  state.rpcCalls = [];
  state.membership = null;
  state.org = null;
  state.officer = null;
  state.adminRpc = null;
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("createWorkspace", () => {
  it("creates the org through the database function with a trimmed name", async () => {
    const res = await createWorkspace("  Chess Club ", " State U ");

    expect(res).toEqual({ success: true, orgId: ORG });
    expect(state.rpcCalls).toEqual([
      { fn: "create_organization", args: { org_name: "Chess Club", org_school: "State U" } },
    ]);
  });

  it("sends a blank school as null", async () => {
    await createWorkspace("Chess Club", "   ");
    expect(state.rpcCalls[0].args.org_school).toBeNull();
  });

  it("refuses a signed-out caller", async () => {
    state.user = null;
    const res = await createWorkspace("Chess Club");
    expect(res.success).toBe(false);
    expect(res.error).toBeTruthy();
    expect(state.rpcCalls).toHaveLength(0);
  });

  it("checks the name length before reaching the database", async () => {
    for (const bad of ["", "   ", "A", "x".repeat(81)]) {
      const res = await createWorkspace(bad);
      expect(res.success).toBe(false);
      expect(res.fieldError).toBeTruthy();
    }
    expect(state.rpcCalls).toHaveLength(0);
  });

  it("accepts the shortest and longest allowed names", async () => {
    expect((await createWorkspace("AB")).success).toBe(true);
    expect((await createWorkspace("x".repeat(80))).success).toBe(true);
  });

  it("sends an officer who has not consented to the consent screen", async () => {
    state.rpcResult = { data: null, error: { message: "consent_required" } };
    expect(await createWorkspace("Chess Club")).toEqual({ success: false, needsConsent: true });
  });

  it("points an officer who already has an org to it", async () => {
    state.rpcResult = { data: null, error: { message: "already_in_org" } };
    state.membership = { org_id: ORG };
    state.org = { id: ORG, name: "Chess Club", school: null };

    const res = await createWorkspace("Another Club");
    expect(res.success).toBe(false);
    expect(res.existingOrgId).toBe(ORG);
  });

  it("reports a duplicate org name without naming the other org", async () => {
    state.rpcResult = { data: null, error: { message: "x", code: "23505" } };
    const res = await createWorkspace("Chess Club");
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/already exists/);
  });

  it("maps invalid_name to a field error and anything else to a generic one", async () => {
    state.rpcResult = { data: null, error: { message: "invalid_name" } };
    expect((await createWorkspace("Chess Club")).fieldError).toBeTruthy();

    state.rpcResult = { data: null, error: { message: "kaboom" } };
    const res = await createWorkspace("Chess Club");
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/couldn't create/);
  });
});

describe("workspace readers", () => {
  it("getOrganizationById returns null when signed out or not visible", async () => {
    state.user = null;
    expect(await getOrganizationById(ORG)).toBeNull();

    state.user = { id: ME };
    state.org = null;
    expect(await getOrganizationById(ORG)).toBeNull();

    state.org = { id: ORG, name: "Chess Club", school: null };
    expect(await getOrganizationById(ORG)).toEqual(state.org);
  });

  it("getOfficerDefaultWorkspace returns null without a membership", async () => {
    expect(await getOfficerDefaultWorkspace()).toBeNull();
  });

  it("getOfficerDefaultWorkspace returns the org of the latest membership", async () => {
    state.membership = { org_id: ORG };
    state.org = { id: ORG, name: "Chess Club", school: "" };
    expect(await getOfficerDefaultWorkspace()).toEqual({ orgId: ORG, name: "Chess Club", school: null });
  });

  it("getCurrentOfficer fills in missing names from the email", async () => {
    state.officer = { id: ME, email: null, full_name: " " };
    expect(await getCurrentOfficer()).toEqual({ id: ME, email: "me@school.edu", full_name: "me" });

    state.user = null;
    expect(await getCurrentOfficer()).toBeNull();
  });

  it("isOrgAdmin is true only for an explicit yes from the database", async () => {
    state.adminRpc = true;
    expect(await isOrgAdmin(ORG)).toBe(true);
    state.adminRpc = null;
    expect(await isOrgAdmin(ORG)).toBe(false);
    expect(state.rpcCalls.at(-1)).toEqual({ fn: "is_org_admin", args: { target_org: ORG } });
  });
});
