import { beforeEach, describe, expect, it, vi } from "vitest";

interface FakeState {
  user: { id: string } | null;
  callerRole: string | null;
  rpcCalls: { fn: string; args: Record<string, unknown> | undefined }[];
  importResult: { data: unknown; error: { message: string } | null };
  joinLinkToken: string | null;
  joinLinkError: boolean;
  invites: Record<string, unknown>[];
  adminRpcCalls: string[];
}

const state: FakeState = {
  user: null,
  callerRole: null,
  rpcCalls: [],
  importResult: { data: null, error: null },
  joinLinkToken: null,
  joinLinkError: false,
  invites: [],
  adminRpcCalls: [],
};

const SUMMARY = { invited: 2, duplicates: 1, invalid: 1, invalid_rows: [{ row: 5, email: "x", reason: "invalid_email" }] };

function inviteQuery() {
  let rows = [...state.invites];
  let window: [number, number] | null = null;
  const builder: Record<string, unknown> = {
    select: () => builder,
    eq: () => builder,
    is: (field: string, value: unknown) => {
      rows = rows.filter((r) => r[field] === value);
      return builder;
    },
    gt: () => builder,
    order: () => builder,
    range: (from: number, to: number) => {
      window = [from, to];
      return builder;
    },
    then: (resolve: (v: unknown) => unknown) =>
      Promise.resolve({
        data: window ? rows.slice(window[0], window[1] + 1) : rows,
        count: rows.length,
        error: null,
      }).then(resolve),
  };
  return builder;
}

const fakeClient = {
  auth: { getUser: async () => ({ data: { user: state.user } }) },
  from: (table: string) => {
    if (table === "org_officers") {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: state.callerRole ? { role: state.callerRole } : null,
                error: null,
              }),
            }),
          }),
        }),
      };
    }
    return inviteQuery();
  },
  rpc: async (fn: string, args?: Record<string, unknown>) => {
    state.rpcCalls.push({ fn, args });
    if (fn === "get_org_join_link") {
      return state.joinLinkError
        ? { data: null, error: { message: "boom" } }
        : { data: state.joinLinkToken, error: null };
    }
    return state.importResult;
  },
};

vi.mock("@/src/lib/supabase/server", () => ({ createClient: async () => fakeClient }));
vi.mock("@/src/lib/supabase/service-role", () => ({
  createAdminClient: () => ({
    rpc: async (fn: string) => {
      state.adminRpcCalls.push(fn);
      return { data: 0, error: null };
    },
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { parseRosterCsv, previewMemberInvites, importMemberInvites, getMemberInvites } = await import(
  "@/src/app/(workspace)/member-invites-actions"
);

const ORG = "11111111-1111-4111-8111-111111111111";
const ME = "22222222-2222-4222-8222-222222222222";
const ROWS = [
  { row: 2, email: "a@x.edu", name: "A" },
  { row: 3, email: "b@x.edu", name: "B" },
];

function csvForm(text: string | Uint8Array, name = "roster.csv") {
  const fd = new FormData();
  fd.append("file", new File([text as BlobPart], name, { type: "text/csv" }));
  return fd;
}

beforeEach(() => {
  state.user = { id: ME };
  state.callerRole = "admin";
  state.rpcCalls = [];
  state.adminRpcCalls = [];
  state.importResult = { data: SUMMARY, error: null };
  state.joinLinkToken = "t".repeat(64);
  state.joinLinkError = false;
  state.invites = [];
});

describe("access", () => {
  it.each([
    ["parseRosterCsv", () => parseRosterCsv(ORG, csvForm("email\na@x.edu"))],
    ["previewMemberInvites", () => previewMemberInvites(ORG, ROWS)],
    ["importMemberInvites", () => importMemberInvites(ORG, ROWS)],
    ["getMemberInvites", () => getMemberInvites(ORG)],
  ])("%s sends a signed-out caller to sign-in", async (_name, call) => {
    state.user = null;
    const res = await call();
    expect(res.success).toBe(false);
    expect(res.error).toBe("not_authenticated");
    expect(state.rpcCalls).toHaveLength(0);
  });

  it.each([
    ["parseRosterCsv", () => parseRosterCsv(ORG, csvForm("email\na@x.edu"))],
    ["previewMemberInvites", () => previewMemberInvites(ORG, ROWS)],
    ["importMemberInvites", () => importMemberInvites(ORG, ROWS)],
    ["getMemberInvites", () => getMemberInvites(ORG)],
  ])("%s refuses officers and finance who are not admins", async (_name, call) => {
    for (const role of ["officer", "finance"]) {
      state.callerRole = role;
      const res = await call();
      expect(res.success).toBe(false);
      expect(res.error).toBe("not_authorized");
    }
    expect(state.rpcCalls).toHaveLength(0);
    expect(state.adminRpcCalls).toHaveLength(0);
  });

  it("refuses an admin of another org (no membership row for this org)", async () => {
    state.callerRole = null;
    for (const res of [
      await previewMemberInvites(ORG, ROWS),
      await importMemberInvites(ORG, ROWS),
      await getMemberInvites(ORG),
    ]) {
      expect(res.success).toBe(false);
      expect(res.error).toBe("access_revoked");
    }
    expect(state.rpcCalls).toHaveLength(0);
  });

  it("refuses a malformed org id", async () => {
    const res = await importMemberInvites("not-a-uuid", ROWS);
    expect(res.error).toBe("access_revoked");
  });
});

describe("parseRosterCsv", () => {
  it("reads the file on the server and returns lines plus column guesses", async () => {
    const res = await parseRosterCsv(ORG, csvForm("Name,Email\nAna,ana@x.edu\n"));
    expect(res.success).toBe(true);
    expect(res.data?.hasHeader).toBe(true);
    expect(res.data?.emailColumn).toBe(1);
    expect(res.data?.nameColumn).toBe(0);
    expect(res.data?.records).toHaveLength(2);
    expect(state.rpcCalls).toHaveLength(0); // nothing is saved
  });

  it("enforces the 1 MB limit on the server", async () => {
    const big = new Uint8Array(1024 * 1024 + 1).fill(97);
    const res = await parseRosterCsv(ORG, csvForm(big));
    expect(res.error).toBe("too_large");
    expect(res.errorMessage).toMatch(/1 MB/);
  });

  it("enforces the 1,000 row limit on the server", async () => {
    const text = ["email", ...Array.from({ length: 1001 }, (_, i) => `p${i}@x.edu`)].join("\n");
    const res = await parseRosterCsv(ORG, csvForm(text));
    expect(res.error).toBe("too_many_rows");
    expect(res.errorMessage).toMatch(/1,000/);
  });

  it("gives a clear message for an unreadable, empty, or email-less file", async () => {
    expect((await parseRosterCsv(ORG, csvForm(new Uint8Array([0xff, 0xfe, 0xfd])))).error).toBe("not_csv");
    expect((await parseRosterCsv(ORG, csvForm(""))).error).toBe("empty");
    const noEmail = await parseRosterCsv(ORG, csvForm("name\nAna\n"));
    expect(noEmail.error).toBe("no_emails");
    expect(noEmail.errorMessage).toBe("We couldn't find any email addresses in that file.");
  });

  it("refuses a request with no file", async () => {
    const res = await parseRosterCsv(ORG, new FormData());
    expect(res.error).toBe("invalid_request");
  });
});

describe("previewMemberInvites", () => {
  it("runs the import rules as a dry run and returns the counts and skipped rows", async () => {
    const res = await previewMemberInvites(ORG, ROWS);
    expect(res.success).toBe(true);
    expect(res.data).toEqual({
      invited: 2,
      duplicates: 1,
      invalid: 1,
      invalidRows: [{ row: 5, email: "x", reason: "invalid_email" }],
    });
    expect(state.rpcCalls).toHaveLength(1);
    expect(state.rpcCalls[0].fn).toBe("import_member_invites");
    expect(state.rpcCalls[0].args).toMatchObject({ target_org: ORG, p_dry_run: true });
  });

  it("checks the row limit on the server before calling the database", async () => {
    const rows = Array.from({ length: 1001 }, (_, i) => ({ row: i + 1, email: `p${i}@x.edu`, name: "" }));
    const res = await previewMemberInvites(ORG, rows);
    expect(res.error).toBe("too_many_rows");
    expect(state.rpcCalls).toHaveLength(0);
  });

  it("refuses no rows and rebuilds untrusted rows", async () => {
    expect((await previewMemberInvites(ORG, [])).error).toBe("no_rows");
    const messy = [{ row: "x", email: 5, name: { a: 1 }, extra: "drop me" }, null] as never;
    await previewMemberInvites(ORG, messy);
    expect(state.rpcCalls[0].args?.p_rows).toEqual([
      { row: 1, email: "", name: "" },
      { row: 2, email: "", name: "" },
    ]);
  });

  it("does not leak database errors", async () => {
    state.importResult = { data: null, error: { message: "relation secret_table exploded" } };
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await previewMemberInvites(ORG, ROWS);
    spy.mockRestore();
    expect(res.success).toBe(false);
    expect(res.error).toBe("failed");
    expect(res.errorMessage).not.toMatch(/secret_table/);
  });
});

describe("importMemberInvites", () => {
  it("saves for real and returns the join link when it is on", async () => {
    const res = await importMemberInvites(ORG, ROWS);
    expect(res.success).toBe(true);
    expect(res.data?.invited).toBe(2);
    expect(res.data?.joinLinkStatus).toBe("on");
    expect(res.data?.joinLinkToken).toBe("t".repeat(64));
    expect(state.rpcCalls[0].args).toMatchObject({ p_dry_run: false });
  });

  it("says when the join link is off", async () => {
    state.joinLinkToken = null;
    const res = await importMemberInvites(ORG, ROWS);
    expect(res.success).toBe(true);
    expect(res.data?.joinLinkStatus).toBe("off");
    expect(res.data?.joinLinkToken).toBeNull();
  });

  it("still reports success when the join link cannot be checked", async () => {
    state.joinLinkError = true;
    const res = await importMemberInvites(ORG, ROWS);
    expect(res.success).toBe(true);
    expect(res.data?.joinLinkStatus).toBe("unknown");
  });

  it("maps a database refusal to a clear message and saves nothing", async () => {
    state.importResult = { data: null, error: { message: "not_admin" } };
    const res = await importMemberInvites(ORG, ROWS);
    expect(res.success).toBe(false);
    expect(res.error).toBe("not_authorized");

    state.importResult = { data: null, error: { message: "too_many_rows" } };
    expect((await importMemberInvites(ORG, ROWS)).error).toBe("too_many_rows");
  });

  it("fails as a whole when the database fails: no summary, no join link lookup", async () => {
    state.importResult = { data: null, error: { message: "connection reset" } };
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await importMemberInvites(ORG, ROWS);
    spy.mockRestore();
    expect(res.success).toBe(false);
    expect(res.errorMessage).toMatch(/nothing was saved/i);
    expect(state.rpcCalls.map((c) => c.fn)).toEqual(["import_member_invites"]);
  });
});

describe("getMemberInvites", () => {
  const invite = (id: string, joined: string | null) => ({
    id,
    email: `${id}@x.edu`,
    name: null,
    created_at: "2026-11-01T00:00:00Z",
    expires_at: "2027-01-01T00:00:00Z",
    joined_at: joined,
  });

  it("returns live invitations with counts and runs the expiry cleanup", async () => {
    state.invites = [invite("a", null), invite("b", "2026-11-05T00:00:00Z")];
    const res = await getMemberInvites(ORG);
    expect(res.success).toBe(true);
    expect(res.data?.invites.map((i) => i.id)).toEqual(["a", "b"]);
    expect(res.data?.invites[1].joinedAt).toBe("2026-11-05T00:00:00Z");
    expect(res.data?.totalCount).toBe(2);
    expect(res.data?.pendingCount).toBe(1);
    expect(res.data?.hasMore).toBe(false);
    expect(state.adminRpcCalls).toEqual(["cleanup_expired_member_invites"]);
  });
});
