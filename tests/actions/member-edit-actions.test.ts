import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  validateMemberEdit,
  MEMBER_EDIT_MESSAGES,
} from "@/src/lib/members/member-edit";

interface FakeState {
  user: { id: string } | null;
  callerRole: string | null;
  rpcCalls: { fn: string; args: Record<string, unknown> }[];
  rpcResult: { data: unknown; error: { message: string } | null };
}

const state: FakeState = {
  user: null,
  callerRole: null,
  rpcCalls: [],
  rpcResult: { data: "ok", error: null },
};

const fakeClient = {
  auth: { getUser: async () => ({ data: { user: state.user } }) },
  from: (table: string) => ({
    select: () => ({
      eq: () => ({
        eq: () => ({
          maybeSingle: async () => {
            if (table === "org_officers") {
              return {
                data: state.callerRole ? { role: state.callerRole } : null,
                error: null,
              };
            }
            return { data: null, error: null };
          },
        }),
      }),
    }),
  }),
  rpc: async (fn: string, args: Record<string, unknown>) => {
    state.rpcCalls.push({ fn, args });
    return state.rpcResult;
  },
};

vi.mock("@/src/lib/supabase/server", () => ({ createClient: async () => fakeClient }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { updateMemberAction, setMemberStatusAction } = await import(
  "@/src/app/(workspace)/members-actions"
);

const ORG = "11111111-1111-4111-8111-111111111111";
const ME = "22222222-2222-4222-8222-222222222222";
const MEMBER = "33333333-3333-4333-8333-333333333333";

describe("validateMemberEdit helper", () => {
  it("accepts valid name and email and cleans spaces", () => {
    const res = validateMemberEdit({
      fullName: "   Jane   Doe   ",
      email: "  jane.doe@school.edu  ",
    });
    expect(res.valid).toBe(true);
    expect(res.fullName).toBe("Jane Doe");
    expect(res.email).toBe("jane.doe@school.edu");
    expect(res.error).toBeUndefined();
  });

  it("rejects name shorter than 2 characters with the standard name message", () => {
    const res = validateMemberEdit({
      fullName: "J",
      email: "jane@school.edu",
    });
    expect(res.valid).toBe(false);
    expect(res.field).toBe("fullName");
    expect(res.error).toBe(MEMBER_EDIT_MESSAGES.nameInvalid);
  });

  it("rejects name longer than 100 characters", () => {
    const res = validateMemberEdit({
      fullName: "A".repeat(101),
      email: "jane@school.edu",
    });
    expect(res.valid).toBe(false);
    expect(res.field).toBe("fullName");
    expect(res.error).toBe(MEMBER_EDIT_MESSAGES.nameInvalid);
  });

  it("rejects invalid email formats with the standard email message", () => {
    const res = validateMemberEdit({
      fullName: "Jane Doe",
      email: "not-an-email",
    });
    expect(res.valid).toBe(false);
    expect(res.field).toBe("email");
    expect(res.error).toBe(MEMBER_EDIT_MESSAGES.emailInvalid);
  });

  it("rejects emails exceeding 254 characters", () => {
    const res = validateMemberEdit({
      fullName: "Jane Doe",
      email: `user@${"a".repeat(250)}.com`,
    });
    expect(res.valid).toBe(false);
    expect(res.field).toBe("email");
    expect(res.error).toBe(MEMBER_EDIT_MESSAGES.emailInvalid);
  });
});

describe("updateMemberAction server action", () => {
  beforeEach(() => {
    state.user = { id: ME };
    state.callerRole = "officer";
    state.rpcCalls = [];
    state.rpcResult = { data: "ok", error: null };
  });

  it("refuses a signed-out caller", async () => {
    state.user = null;
    const res = await updateMemberAction(ORG, MEMBER, {
      fullName: "Jane Doe",
      email: "jane@school.edu",
    });
    expect(res.success).toBe(false);
    expect(res.error).toBe("not_authenticated");
  });

  it("refuses an officer who does not belong to the org", async () => {
    state.callerRole = null;
    const res = await updateMemberAction(ORG, MEMBER, {
      fullName: "Jane Doe",
      email: "jane@school.edu",
    });
    expect(res.success).toBe(false);
    expect(res.error).toBe("access_revoked");
  });

  it("refuses invalid UUID parameters", async () => {
    const res = await updateMemberAction("bad-id", MEMBER, {
      fullName: "Jane Doe",
      email: "jane@school.edu",
    });
    expect(res.success).toBe(false);
    expect(res.error).toBe("invalid_request");
  });

  it("refuses invalid name with standard validation error", async () => {
    const res = await updateMemberAction(ORG, MEMBER, {
      fullName: "J",
      email: "jane@school.edu",
    });
    expect(res.success).toBe(false);
    expect(res.errorMessage).toBe(MEMBER_EDIT_MESSAGES.nameInvalid);
    expect(state.rpcCalls.length).toBe(0);
  });

  it("refuses invalid email with standard validation error", async () => {
    const res = await updateMemberAction(ORG, MEMBER, {
      fullName: "Jane Doe",
      email: "bad-email",
    });
    expect(res.success).toBe(false);
    expect(res.errorMessage).toBe(MEMBER_EDIT_MESSAGES.emailInvalid);
    expect(state.rpcCalls.length).toBe(0);
  });

  it("maps duplicate_email error from RPC to the expected copy", async () => {
    state.rpcResult = { data: null, error: { message: "duplicate_email" } };
    const res = await updateMemberAction(ORG, MEMBER, {
      fullName: "Jane Doe",
      email: "duplicate@school.edu",
    });
    expect(res.success).toBe(false);
    expect(res.error).toBe("duplicate_email");
    expect(res.errorMessage).toBe("Someone in this org already uses that email.");
  });

  it("successfully updates member and revalidates path", async () => {
    const res = await updateMemberAction(ORG, MEMBER, {
      fullName: "Jane Doe",
      email: "jane@school.edu",
    });
    expect(res.success).toBe(true);
    expect(res.data?.fullName).toBe("Jane Doe");
    expect(res.data?.email).toBe("jane@school.edu");
    expect(state.rpcCalls).toEqual([
      {
        fn: "update_member",
        args: {
          target_member: MEMBER,
          new_name: "Jane Doe",
          new_email: "jane@school.edu",
        },
      },
    ]);
  });
});

describe("setMemberStatusAction server action", () => {
  beforeEach(() => {
    state.user = { id: ME };
    state.callerRole = "officer";
    state.rpcCalls = [];
    state.rpcResult = { data: "ok", error: null };
  });

  it("refuses a signed-out caller", async () => {
    state.user = null;
    const res = await setMemberStatusAction(ORG, MEMBER, "inactive");
    expect(res.success).toBe(false);
    expect(res.error).toBe("not_authenticated");
  });

  it("refuses an invalid status parameter", async () => {
    const res = await setMemberStatusAction(ORG, MEMBER, "pending" as unknown as "active");
    expect(res.success).toBe(false);
    expect(res.error).toBe("invalid_request");
  });

  it("refuses an officer outside the org", async () => {
    state.callerRole = null;
    const res = await setMemberStatusAction(ORG, MEMBER, "inactive");
    expect(res.success).toBe(false);
    expect(res.error).toBe("access_revoked");
  });

  it("deactivates member successfully via RPC", async () => {
    const res = await setMemberStatusAction(ORG, MEMBER, "inactive");
    expect(res.success).toBe(true);
    expect(state.rpcCalls).toEqual([
      {
        fn: "set_member_status",
        args: {
          target_member: MEMBER,
          new_status: "inactive",
        },
      },
    ]);
  });

  it("reactivates member successfully via RPC", async () => {
    const res = await setMemberStatusAction(ORG, MEMBER, "active");
    expect(res.success).toBe(true);
    expect(state.rpcCalls).toEqual([
      {
        fn: "set_member_status",
        args: {
          target_member: MEMBER,
          new_status: "active",
        },
      },
    ]);
  });
});

