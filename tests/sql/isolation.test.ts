import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import {
  as,
  addMember,
  addOfficer,
  addOrg,
  errorOf,
  getDb,
  startDb,
} from "./helpers.ts";

/**
 * EP-1: "Keeping each org's data visible only to that org."
 *
 * Two orgs, each with officers of every role, an invite, a join link and a
 * member. Every check runs as a real database role (authenticated or anon), so
 * row level security and grants apply. The same questions are asked of every
 * role in org A, and org B's rows must never show up.
 */

let orgA: string;
let orgB: string;
let adminA: string;
let financeA: string;
let officerA: string;
let adminB: string;
let officerB: string;
let inviteB: string;
let tokenA: string;
let tokenB: string;

const TABLES_ORG_SCOPED = ["org_officers", "org_invites", "org_join_links", "members"] as const;

async function countRows(table: string, where: string, params: unknown[] = []) {
  const res = await getDb().query<{ n: number }>(
    `select count(*)::int as n from public.${table} where ${where}`,
    params
  );
  return res.rows[0].n;
}

before(async () => {
  const db = await startDb();

  adminA = await addOfficer("admin.a@school.edu", "Admin A");
  orgA = await addOrg(adminA, "Org A");
  financeA = await addMember(orgA, "finance.a@school.edu", "finance");
  officerA = await addMember(orgA, "officer.a@school.edu", "officer");

  adminB = await addOfficer("admin.b@school.edu", "Admin B");
  orgB = await addOrg(adminB, "Org B");
  officerB = await addMember(orgB, "officer.b@school.edu", "officer");

  // One invite, one join link and one member in each org
  const invite = await as("authenticated", adminB, () =>
    db.query<{ create_invite: { invite_id: string } }>(
      `select public.create_invite($1, 'invitee.b@school.edu', 'finance')`,
      [orgB]
    )
  );
  inviteB = invite.rows[0].create_invite.invite_id;
  await as("authenticated", adminA, () =>
    db.query(`select public.create_invite($1, 'invitee.a@school.edu', 'officer')`, [orgA])
  );

  tokenA = (
    await as("authenticated", adminA, () =>
      db.query<{ set_join_link: string }>(`select public.set_join_link($1, 'on')`, [orgA])
    )
  ).rows[0].set_join_link;
  tokenB = (
    await as("authenticated", adminB, () =>
      db.query<{ set_join_link: string }>(`select public.set_join_link($1, 'on')`, [orgB])
    )
  ).rows[0].set_join_link;

  for (const [token, email] of [
    [tokenA, "student.a@school.edu"],
    [tokenB, "student.b@school.edu"],
  ]) {
    await as("service_role", null, () =>
      db.query(`select public.join_org($1, 'A Student', $2, 'en', 'member-consent-v1')`, [token, email])
    );
  }
});

after(async () => {
  await getDb().close();
});

describe("an officer of org A never sees org B", () => {
  const callers = () => [
    { label: "admin", id: adminA },
    { label: "finance", id: financeA },
    { label: "officer", id: officerA },
  ];

  it("cannot read org B's org row", async () => {
    for (const { label, id } of callers()) {
      const n = await as("authenticated", id, () => countRows("orgs", "id = $1", [orgB]));
      assert.equal(n, 0, `${label} saw org B`);
    }
  });

  it("sees their own org row", async () => {
    for (const { label, id } of callers()) {
      const n = await as("authenticated", id, () => countRows("orgs", "id = $1", [orgA]));
      assert.equal(n, 1, `${label} could not see their own org`);
    }
  });

  for (const table of TABLES_ORG_SCOPED) {
    it(`cannot read org B's rows in ${table}`, async () => {
      for (const { label, id } of callers()) {
        const n = await as("authenticated", id, () => countRows(table, "org_id = $1", [orgB]));
        assert.equal(n, 0, `${label} read ${table} rows of org B`);
      }
    });
  }

  it("sees only org A's officers, members and invites", async () => {
    for (const { label, id } of callers()) {
      const officers = await as("authenticated", id, () => countRows("org_officers", "true"));
      assert.equal(officers, 3, `${label}: officers visible`);
      const members = await as("authenticated", id, () => countRows("members", "true"));
      assert.equal(members, 1, `${label}: members visible`);
      const invites = await as("authenticated", id, () => countRows("org_invites", "true"));
      assert.equal(invites, 1, `${label}: invites visible`);
    }
  });

  it("sees only their own row in officers (no other officer's profile)", async () => {
    for (const { label, id } of callers()) {
      const n = await as("authenticated", id, () => countRows("officers", "true"));
      assert.equal(n, 1, `${label} saw other officers' profiles`);
    }
  });

  it("looking up org B by its id returns nothing, the same as an org that does not exist", async () => {
    const missing = "00000000-0000-4000-8000-ffffffffffff";
    const real = await as("authenticated", adminA, () =>
      getDb().query(`select * from public.orgs where id = $1`, [orgB])
    );
    const none = await as("authenticated", adminA, () =>
      getDb().query(`select * from public.orgs where id = $1`, [missing])
    );
    assert.deepEqual(real.rows, none.rows);
  });
});

describe("the join link is a secret held by admins", () => {
  it("lets an admin read their own org's link", async () => {
    const n = await as("authenticated", adminA, () => countRows("org_join_links", "org_id = $1", [orgA]));
    assert.equal(n, 1);
  });

  it("hides the link token from finance and officer roles in the same org", async () => {
    for (const id of [financeA, officerA]) {
      const n = await as("authenticated", id, () => countRows("org_join_links", "true"));
      assert.equal(n, 0);
    }
  });

  it("does not let an admin of another org read it either", async () => {
    const n = await as("authenticated", adminB, () => countRows("org_join_links", "org_id = $1", [orgA]));
    assert.equal(n, 0);
  });
});

describe("a signed-out visitor (anon)", () => {
  it("reads no rows from the tables that allow reads for signed-in officers", async () => {
    for (const table of ["orgs", "org_officers", "org_invites", "officers"]) {
      const n = await as("anon", null, () => countRows(table, "true"));
      assert.equal(n, 0, `anon read ${table}`);
    }
  });

  it("is refused outright on members, join links and rate limit data", async () => {
    for (const table of ["members", "org_join_links", "join_attempts"]) {
      const message = await errorOf(() => as("anon", null, () => countRows(table, "true")));
      assert.match(message ?? "", /permission denied/i, `anon was not refused on ${table}`);
    }
  });
});

describe("an officer cannot write around the functions", () => {
  it("cannot promote themselves by updating their own role", async () => {
    await as("authenticated", officerA, () =>
      getDb().query(`update public.org_officers set role = 'admin' where officer_id = $1`, [officerA])
    );
    const role = await getDb().query<{ role: string }>(
      `select role from public.org_officers where officer_id = $1`,
      [officerA]
    );
    assert.equal(role.rows[0].role, "officer");
  });

  it("cannot add themselves to another org", async () => {
    const message = await errorOf(() =>
      as("authenticated", officerA, () =>
        getDb().query(`insert into public.org_officers (org_id, officer_id, role) values ($1, $2, 'admin')`, [
          orgB,
          officerA,
        ])
      )
    );
    assert.ok(message, "insert into org_officers should be refused");
    assert.equal(await countRows("org_officers", "org_id = $1 and officer_id = $2", [orgB, officerA]), 0);
  });

  it("cannot create or rename orgs directly", async () => {
    const insert = await errorOf(() =>
      as("authenticated", adminA, () =>
        getDb().query(`insert into public.orgs (name, name_key) values ('Rogue', 'rogue')`)
      )
    );
    assert.ok(insert, "insert into orgs should be refused");

    await as("authenticated", adminA, () =>
      getDb().query(`update public.orgs set name = 'Renamed' where id = $1`, [orgA])
    );
    assert.equal(await countRows("orgs", "id = $1 and name = 'Org A'", [orgA]), 1);
  });

  it("cannot write members or join links directly, even as admin", async () => {
    const member = await errorOf(() =>
      as("authenticated", adminA, () =>
        getDb().query(
          `insert into public.members (org_id, full_name, email, email_key, consent_version, consent_language)
           values ($1, 'Fake Member', 'f@x.edu', 'f@x.edu', 'member-consent-v1', 'en')`,
          [orgA]
        )
      )
    );
    assert.match(member ?? "", /permission denied/i);

    const link = await errorOf(() =>
      as("authenticated", adminA, () =>
        getDb().query(`update public.org_join_links set active = true where org_id = $1`, [orgA])
      )
    );
    assert.match(link ?? "", /permission denied/i);
  });
});

describe("the admin functions refuse a caller from another org", () => {
  it("create_invite for org B", async () => {
    const message = await errorOf(() =>
      as("authenticated", adminA, () =>
        getDb().query(`select public.create_invite($1, 'x@school.edu', 'officer')`, [orgB])
      )
    );
    assert.match(message ?? "", /not_authorized/);
  });

  it("revoke_invite on org B's invite", async () => {
    const message = await errorOf(() =>
      as("authenticated", adminA, () => getDb().query(`select public.revoke_invite($1)`, [inviteB]))
    );
    assert.match(message ?? "", /not_authorized/);
    assert.equal(await countRows("org_invites", "id = $1 and revoked_at is null", [inviteB]), 1);
  });

  it("change_role on an officer of org B", async () => {
    const message = await errorOf(() =>
      as("authenticated", adminA, () =>
        getDb().query(`select public.change_role($1, 'admin')`, [officerB])
      )
    );
    assert.match(message ?? "", /not_authorized/);
    const role = await getDb().query<{ role: string }>(
      `select role from public.org_officers where officer_id = $1`,
      [officerB]
    );
    assert.equal(role.rows[0].role, "officer");
  });

  it("remove_officer on an officer of org B", async () => {
    const message = await errorOf(() =>
      as("authenticated", adminA, () => getDb().query(`select public.remove_officer($1)`, [officerB]))
    );
    assert.match(message ?? "", /not_authorized/);
    assert.equal(await countRows("org_officers", "officer_id = $1", [officerB]), 1);
  });

  it("set_join_link for org B", async () => {
    for (const action of ["on", "off", "regenerate"]) {
      const message = await errorOf(() =>
        as("authenticated", adminA, () =>
          getDb().query(`select public.set_join_link($1, $2)`, [orgB, action])
        )
      );
      assert.match(message ?? "", /not_admin/, `action ${action}`);
    }
    assert.equal(await countRows("org_join_links", "org_id = $1 and token = $2 and active", [orgB, tokenB]), 1);
  });
});

describe("finance and officer roles cannot use admin functions in their own org", () => {
  it("create_invite, change_role, remove_officer and set_join_link are refused", async () => {
    for (const id of [financeA, officerA]) {
      const calls: [string, string, unknown[]][] = [
        ["create_invite", `select public.create_invite($1, 'y@school.edu', 'officer')`, [orgA]],
        ["change_role", `select public.change_role($1, 'admin')`, [officerA]],
        ["remove_officer", `select public.remove_officer($1)`, [financeA]],
        ["set_join_link", `select public.set_join_link($1, 'regenerate')`, [orgA]],
      ];
      for (const [name, sql, params] of calls) {
        const message = await errorOf(() => as("authenticated", id, () => getDb().query(sql, params)));
        assert.match(message ?? "", /not_authorized|not_admin/, `${name} was not refused`);
      }
    }
    assert.equal(await countRows("org_officers", "org_id = $1", [orgA]), 3);
    assert.equal(await countRows("org_join_links", "org_id = $1 and token = $2 and active", [orgA, tokenA]), 1);
  });
});
