import { beforeEach, describe, expect, it, vi } from "vitest";

interface FakeMember {
  id: string;
  org_id: string;
  full_name: string;
  email: string;
  status: string;
  created_at: string;
  consent_at: string;
  consent_language: string;
}

const state = {
  user: null as { id: string } | null,
  role: null as string | null,
  orgName: "DevCon Laguna" as string | null,
  members: [] as FakeMember[],
  selected: [] as string[],
  failReadAtCall: 0,
  readCalls: 0,
  rpcCalls: [] as { fn: string; args: Record<string, unknown> }[],
  rpcError: null as { message: string } | null,
};

function membersQuery() {
  let rows = [...state.members];
  let window: [number, number] = [0, 9999];
  const b: Record<string, unknown> = {
    select: (cols: string) => {
      state.selected = cols.split(",").map((c) => c.trim());
      return b;
    },
    eq: (f: string, v: unknown) => {
      rows = rows.filter((r) => (r as unknown as Record<string, unknown>)[f] === v);
      return b;
    },
    in: (f: string, vs: unknown[]) => {
      rows = rows.filter((r) => vs.includes((r as unknown as Record<string, unknown>)[f]));
      return b;
    },
    order: () => b,
    range: (from: number, to: number) => {
      window = [from, to];
      return b;
    },
    then: (resolve: (v: unknown) => unknown) => {
      state.readCalls++;
      if (state.failReadAtCall && state.readCalls === state.failReadAtCall) {
        return Promise.resolve({ data: null, error: { message: "boom" } }).then(resolve);
      }
      // Only the selected columns come back, like the real database
      const data = rows.slice(window[0], window[1] + 1).map((r) =>
        Object.fromEntries(
          state.selected.map((c) => [c, (r as unknown as Record<string, unknown>)[c]])
        )
      );
      return Promise.resolve({ data, error: null }).then(resolve);
    },
  };
  return b;
}

const fakeClient = {
  auth: { getUser: async () => ({ data: { user: state.user } }) },
  from: (table: string) => {
    if (table === "members") return membersQuery();
    const single = (data: unknown) => {
      const b: Record<string, unknown> = {
        select: () => b,
        eq: () => b,
        maybeSingle: async () => ({ data, error: null }),
      };
      return b;
    };
    if (table === "org_officers") return single(state.role ? { role: state.role } : null);
    if (table === "orgs") return single(state.orgName ? { name: state.orgName } : null);
    throw new Error(`unexpected table ${table}`);
  },
  rpc: async (fn: string, args: Record<string, unknown>) => {
    state.rpcCalls.push({ fn, args });
    return { data: "id", error: state.rpcError };
  },
};

vi.mock("@/src/lib/supabase/server", () => ({ createClient: async () => fakeClient }));

const { POST } = await import("@/src/app/(workspace)/workspace/[id]/members/export/route");
const { EXPORT_PAGE_SIZE } = await import("@/src/lib/members/member-export");

const ORG = "11111111-1111-4111-8111-111111111111";
const ME = "22222222-2222-4222-8222-222222222222";

const member = (i: number, over: Partial<FakeMember> = {}): FakeMember => ({
  id: `m${i}`,
  org_id: ORG,
  full_name: `Member ${i}`,
  email: `m${i}@school.edu`,
  status: "active",
  created_at: "2026-11-02T10:00:00Z",
  consent_at: "2026-11-02T10:00:00Z",
  consent_language: "en",
  ...over,
});

function call(body: unknown, init: { id?: string; headers?: Record<string, string> } = {}) {
  const request = new Request(`http://localhost/workspace/${init.id ?? ORG}/members/export`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...init.headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
  return POST(request, { params: Promise.resolve({ id: init.id ?? ORG }) });
}

/** The body as written, byte order mark included (Response.text() would drop it) */
async function rawText(res: Response) {
  const bytes = new Uint8Array(await res.arrayBuffer());
  expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
  return new TextDecoder("utf-8", { ignoreBOM: true }).decode(bytes);
}

const choice = { fields: ["full_name", "email", "status"], statuses: ["active"] };

beforeEach(() => {
  state.user = { id: ME };
  state.role = "admin";
  state.orgName = "DevCon Laguna";
  state.members = [member(1), member(2), member(3, { status: "pending" })];
  state.selected = [];
  state.failReadAtCall = 0;
  state.readCalls = 0;
  state.rpcCalls = [];
  state.rpcError = null;
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("export route: access", () => {
  it("refuses a signed-out caller", async () => {
    state.user = null;
    expect((await call(choice)).status).toBe(401);
  });

  it("refuses an officer who is not an admin, and exports nothing", async () => {
    state.role = "officer";
    const res = await call(choice);
    expect(res.status).toBe(403);
    expect(state.readCalls).toBe(0);
    expect(state.rpcCalls).toHaveLength(0);
  });

  it("refuses an admin of another org (no membership here)", async () => {
    state.role = null;
    expect((await call(choice)).status).toBe(403);
    expect(state.readCalls).toBe(0);
  });

  it("treats a malformed org id as not found", async () => {
    expect((await call(choice, { id: "nope" })).status).toBe(404);
  });

  it("refuses a request from another origin", async () => {
    const res = await call(choice, { headers: { Origin: "https://evil.example" } });
    expect(res.status).toBe(403);
  });

  it("refuses a body that is not JSON", async () => {
    const res = await call(choice, { headers: { "Content-Type": "text/plain" } });
    expect(res.status).toBe(400);
  });
});

describe("export route: validation", () => {
  it("refuses no fields, no statuses, unknown fields and bad JSON", async () => {
    expect((await call({ fields: [], statuses: ["active"] })).status).toBe(400);
    expect((await call({ fields: ["email"], statuses: [] })).status).toBe(400);
    expect((await call({ fields: ["password"], statuses: ["active"] })).status).toBe(400);
    expect((await call("{not json")).status).toBe(400);
  });
});

describe("export route: the file", () => {
  it("returns a UTF-8 CSV download named after the org and today's date", async () => {
    const res = await call(choice);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/csv; charset=utf-8");
    expect(res.headers.get("Content-Disposition")).toMatch(
      /^attachment; filename="devcon-laguna-members-\d{4}-\d{2}-\d{2}\.csv"$/
    );
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("starts with a byte order mark and a heading row, then only chosen statuses", async () => {
    const text = await rawText(await call(choice));
    expect(text.startsWith("﻿Full name,Email,Status\r\n")).toBe(true);
    expect(text).toContain("Member 1,m1@school.edu,Active\r\n");
    expect(text).toContain("Member 2,m2@school.edu,Active\r\n");
    expect(text).not.toContain("Member 3");
  });

  it("selects only the chosen columns and leaves the others out entirely", async () => {
    const text = await rawText(await call({ fields: ["full_name"], statuses: ["active"] }));
    expect(state.selected).toEqual(["full_name"]);
    expect(text).toBe("﻿Full name\r\nMember 1\r\nMember 2\r\n");
    expect(text).not.toContain("@school.edu");
  });

  it("escapes commas, quotes and formulas", async () => {
    state.members = [member(1, { full_name: '=cmd, "x"', email: "a@b.c" })];
    const text = await (await call(choice)).text();
    expect(text).toContain(`"'=cmd, ""x""",a@b.c,Active\r\n`);
  });

  it("records who exported, for which org, how many members and which fields", async () => {
    await (await call(choice)).text();
    expect(state.rpcCalls).toEqual([
      {
        fn: "record_member_export",
        args: {
          target_org: ORG,
          p_fields: ["full_name", "email", "status"],
          p_statuses: ["active"],
          p_row_count: 2,
        },
      },
    ]);
  });

  it("falls back to a valid file name for an org name with no usable characters", async () => {
    state.orgName = "🎉/\\:*?";
    const res = await call(choice);
    expect(res.headers.get("Content-Disposition")).toMatch(/filename="members-\d{4}-\d{2}-\d{2}\.csv"/);
  });

  it("streams a large roster across pages", async () => {
    const total = 5000;
    state.members = Array.from({ length: total }, (_, i) => member(i));
    const text = await (await call(choice)).text();
    const lines = text.trimEnd().split("\r\n");
    expect(lines).toHaveLength(total + 1);
    expect(state.rpcCalls[0].args.p_row_count).toBe(total);
    expect(state.readCalls).toBe(Math.ceil(total / EXPORT_PAGE_SIZE) + 1);
  });
});

describe("export route: edge cases", () => {
  it("makes no file when no members match", async () => {
    const res = await call({ fields: ["email"], statuses: ["inactive"] });
    expect(res.status).toBe(422);
    expect((await res.json()).error).toBe("no_members");
    expect(state.rpcCalls).toHaveLength(0);
  });

  it("answers a failed read with a clear message and no file", async () => {
    state.failReadAtCall = 1;
    const res = await call(choice);
    expect(res.status).toBe(500);
    expect(res.headers.get("Content-Type")).not.toContain("text/csv");
    expect((await res.json()).message).toBe("We couldn't make your file. Try again.");
  });

  it("errors the stream if a later page fails, so no partial file is saved", async () => {
    state.members = Array.from({ length: EXPORT_PAGE_SIZE + 10 }, (_, i) => member(i));
    state.failReadAtCall = 2;
    const res = await call(choice);
    expect(res.status).toBe(200);
    await expect(res.text()).rejects.toThrow();
    expect(state.rpcCalls).toHaveLength(0);
  });

  it("errors the stream and offers no file if the record cannot be saved", async () => {
    state.rpcError = { message: "nope" };
    const res = await call(choice);
    await expect(res.text()).rejects.toThrow();
  });
});
