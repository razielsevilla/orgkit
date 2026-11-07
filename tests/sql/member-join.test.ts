import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { setTimeout as sleep } from "node:timers/promises";
import { as, addMember, addOfficer, addOrg, errorOf, getDb, startDb } from "./helpers.ts";

/**
 * A4: members join through a public link, with consent. The public page reaches
 * the database only through the server's service-role key, so these tests call
 * the functions as service_role, and check that nobody else can.
 */

const CONSENT = "member-consent-v1";
const unknownToken = "0".repeat(64);

let orgA: string;
let orgB: string;
let adminA: string;
let adminB: string;
let financeA: string;

const asServer = <T>(fn: () => Promise<T>) => as("service_role", null, fn);

async function setLink(admin: string, org: string, action: "on" | "off" | "regenerate") {
  const res = await as("authenticated", admin, () =>
    getDb().query<{ set_join_link: string | null }>(`select public.set_join_link($1, $2)`, [org, action])
  );
  return res.rows[0].set_join_link;
}

async function join(
  token: string,
  name: string,
  email: string,
  { language = "en", version = CONSENT }: { language?: string; version?: string } = {}
) {
  const res = await asServer(() =>
    getDb().query<{ join_org: string }>(`select public.join_org($1, $2, $3, $4, $5)`, [
      token,
      name,
      email,
      language,
      version,
    ])
  );
  return res.rows[0].join_org;
}

async function membersOf(org: string) {
  const res = await getDb().query<{
    full_name: string;
    email: string;
    email_key: string;
    status: string;
    consent_version: string;
    consent_language: string;
    consent_at: Date;
  }>(`select * from public.members where org_id = $1 order by created_at, id`, [org]);
  return res.rows;
}

before(async () => {
  await startDb();
  adminA = await addOfficer("admin.a@school.edu");
  orgA = await addOrg(adminA, "Org A");
  financeA = await addMember(orgA, "finance.a@school.edu", "finance");
  adminB = await addOfficer("admin.b@school.edu");
  orgB = await addOrg(adminB, "Org B");
});

after(async () => {
  await getDb().close();
});

describe("the join link", () => {
  it("is off until an admin turns it on", async () => {
    const res = await asServer(() =>
      getDb().query(`select public.get_join_org($1) as name`, [unknownToken])
    );
    assert.equal(res.rows[0].name, null);
    assert.equal(await join(unknownToken, "Maria Santos", "maria@school.edu"), "inactive");
  });

  it("is an unguessable 64-character token", async () => {
    const token = await setLink(adminA, orgA, "on");
    assert.match(token ?? "", /^[0-9a-f]{64}$/);
  });

  it("shows only the org's name to the public page", async () => {
    const token = (await setLink(adminA, orgA, "on")) as string;
    const res = await asServer(() =>
      getDb().query<{ name: string }>(`select public.get_join_org($1) as name`, [token])
    );
    assert.equal(res.rows[0].name, "Org A");
  });

  it("'on' when already on keeps the same link", async () => {
    const first = await setLink(adminA, orgA, "on");
    const second = await setLink(adminA, orgA, "on");
    assert.equal(first, second);
    const active = await getDb().query(
      `select 1 from public.org_join_links where org_id = $1 and active`,
      [orgA]
    );
    assert.equal(active.rowCount, 1);
  });

  it("'off' stops joins, and turning it on again makes a new link, not the old one", async () => {
    const before = (await setLink(adminA, orgA, "on")) as string;
    assert.equal(await setLink(adminA, orgA, "off"), null);
    assert.equal(await join(before, "Maria Santos", "off@school.edu"), "inactive");

    const after = (await setLink(adminA, orgA, "on")) as string;
    assert.notEqual(after, before);
    assert.equal(await join(before, "Maria Santos", "off@school.edu"), "inactive");
    assert.equal(await join(after, "Maria Santos", "off@school.edu"), "ok");
  });

  it("'regenerate' kills the old link at once and keeps one active link", async () => {
    const old = (await setLink(adminA, orgA, "on")) as string;
    const fresh = (await setLink(adminA, orgA, "regenerate")) as string;
    assert.notEqual(fresh, old);
    assert.equal(await join(old, "Maria Santos", "regen@school.edu"), "inactive");
    assert.equal(await join(fresh, "Maria Santos", "regen@school.edu"), "ok");

    const active = await getDb().query(
      `select 1 from public.org_join_links where org_id = $1 and active`,
      [orgA]
    );
    assert.equal(active.rowCount, 1);
  });

  it("is controlled by an admin only", async () => {
    const message = await errorOf(() => setLink(financeA, orgA, "on"));
    assert.match(message ?? "", /not_admin/);
  });

  it("rejects an unknown action", async () => {
    const message = await errorOf(() => setLink(adminA, orgA, "delete" as "on"));
    assert.match(message ?? "", /invalid_action/);
  });
});

describe("join_org", () => {
  let tokenA: string;
  let tokenB: string;

  before(async () => {
    tokenA = (await setLink(adminA, orgA, "regenerate")) as string;
    tokenB = (await setLink(adminB, orgB, "on")) as string;
  });

  it("saves the student as pending, with the consent wording version, language and time", async () => {
    assert.equal(await join(tokenA, "Juan dela Cruz", "juan@school.edu", { language: "fil" }), "ok");

    const [member] = (await membersOf(orgA)).filter((m) => m.email === "juan@school.edu");
    assert.equal(member.status, "pending");
    assert.equal(member.consent_version, CONSENT);
    assert.equal(member.consent_language, "fil");
    assert.ok(Math.abs(member.consent_at.getTime() - Date.now()) < 60_000);
  });

  it("puts the student in the org that owns the link, not any other", async () => {
    assert.equal(await join(tokenB, "Ana Reyes", "ana@school.edu"), "ok");
    assert.equal((await membersOf(orgB)).filter((m) => m.email === "ana@school.edu").length, 1);
    assert.equal((await membersOf(orgA)).filter((m) => m.email === "ana@school.edu").length, 0);
  });

  it("trims and collapses spaces in the name, and stores the email in lower case as the key", async () => {
    await join(tokenA, "  Pedro   Santos  ", "  Pedro.Santos@School.EDU ");
    const member = (await membersOf(orgA)).find((m) => m.email_key === "pedro.santos@school.edu");
    assert.ok(member);
    assert.equal(member.full_name, "Pedro Santos");
    assert.equal(member.email, "Pedro.Santos@School.EDU");
  });

  it("answers 'ok' for an email already in the org without saving a second row or revealing it", async () => {
    await join(tokenA, "Lea Cruz", "lea@school.edu");
    assert.equal(await join(tokenA, "Someone Else", "LEA@school.edu"), "ok");

    const rows = (await membersOf(orgA)).filter((m) => m.email_key === "lea@school.edu");
    assert.equal(rows.length, 1);
    assert.equal(rows[0].full_name, "Lea Cruz");
  });

  it("lets the same person join two different orgs", async () => {
    await join(tokenA, "Both Orgs", "both@school.edu");
    await join(tokenB, "Both Orgs", "both@school.edu");
    assert.equal((await membersOf(orgA)).filter((m) => m.email_key === "both@school.edu").length, 1);
    assert.equal((await membersOf(orgB)).filter((m) => m.email_key === "both@school.edu").length, 1);
  });

  it("refuses a bad name, email or language, and saves nothing", async () => {
    const before = (await membersOf(orgA)).length;
    const cases: [string, string, string, string, RegExp][] = [
      ["one-letter name", "A", "ok1@school.edu", "en", /invalid_name/],
      ["name over 100 characters", "x".repeat(101), "ok2@school.edu", "en", /invalid_name/],
      ["blank name", "   ", "ok3@school.edu", "en", /invalid_name/],
      ["no @ in email", "Valid Name", "not-an-email", "en", /invalid_email/],
      ["no domain dot", "Valid Name", "a@school", "en", /invalid_email/],
      ["space in email", "Valid Name", "a b@school.edu", "en", /invalid_email/],
      ["email over 254 characters", "Valid Name", `${"a".repeat(250)}@school.edu`, "en", /invalid_email/],
      ["unsupported language", "Valid Name", "ok4@school.edu", "es", /invalid_language/],
    ];
    for (const [label, name, email, language, expected] of cases) {
      const message = await errorOf(() => join(tokenA, name, email, { language }));
      assert.match(message ?? "", expected, label);
    }
    assert.equal((await membersOf(orgA)).length, before);
  });

  it("does not run the checks for a dead link: it says 'inactive' and saves nothing", async () => {
    const before = (await membersOf(orgA)).length;
    assert.equal(await join(unknownToken, "Valid Name", "dead@school.edu"), "inactive");
    assert.equal((await membersOf(orgA)).length, before);
  });
});

describe("who may call the public join functions", () => {
  const calls: [string, string, unknown[]][] = [
    ["get_join_org", `select public.get_join_org($1)`, [unknownToken]],
    [
      "join_org",
      `select public.join_org($1, 'Valid Name', 'x@school.edu', 'en', 'member-consent-v1')`,
      [unknownToken],
    ],
    ["hit_join_rate_limit", `select public.hit_join_rate_limit('k', 10)`, []],
  ];

  for (const role of ["anon", "authenticated"] as const) {
    it(`refuses ${role}, even a signed-in admin`, async () => {
      for (const [name, sql, params] of calls) {
        const message = await errorOf(() => as(role, adminA, () => getDb().query(sql, params)));
        assert.match(message ?? "", /permission denied/i, `${role} could call ${name}`);
      }
    });
  }

  it("allows service_role", async () => {
    for (const [name, sql, params] of calls) {
      const message = await errorOf(() => asServer(() => getDb().query(sql, params)));
      assert.equal(message, null, `service_role could not call ${name}`);
    }
  });
});

describe("hit_join_rate_limit", () => {
  const hit = async (key: string, limit: number) => {
    const res = await asServer(() =>
      getDb().query<{ ok: boolean }>(`select public.hit_join_rate_limit($1, $2) as ok`, [key, limit])
    );
    return res.rows[0].ok;
  };

  before(async () => {
    // Attempts are counted per clock minute: don't straddle the minute boundary
    const { rows } = await getDb().query<{ s: number }>(`select extract(second from now())::int as s`);
    if (rows[0].s >= 56) await sleep((61 - rows[0].s) * 1000);
  });

  it("allows up to the limit in a minute, then refuses", async () => {
    assert.deepEqual(
      [await hit("device-1", 3), await hit("device-1", 3), await hit("device-1", 3), await hit("device-1", 3)],
      [true, true, true, false]
    );
  });

  it("counts each device on its own", async () => {
    await hit("device-2", 1);
    assert.equal(await hit("device-2", 1), false);
    assert.equal(await hit("device-3", 1), true);
  });

  it("has no column that could hold a raw IP address", async () => {
    const cols = await getDb().query<{ column_name: string }>(
      `select column_name from information_schema.columns
        where table_schema = 'public' and table_name = 'join_attempts' order by 1`
    );
    assert.deepEqual(
      cols.rows.map((c) => c.column_name),
      ["attempts", "key", "window_start"]
    );
  });
});
