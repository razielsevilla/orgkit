import { describe, it, before } from "node:test";
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

interface ImportResult {
  invited: number;
  duplicates: number;
  invalid: number;
  invalid_rows: { row: number; email: string; reason: string }[];
  dry_run: boolean;
}

let orgA: string;
let orgB: string;
let adminA: string;
let officerA: string;
let adminB: string;
let tokenA: string;

async function runImport(
  userId: string | null,
  org: string,
  rows: unknown,
  dryRun = false,
  role: "authenticated" | "anon" = "authenticated"
): Promise<ImportResult> {
  const db = getDb();
  return as(role, userId, async () => {
    const res = await db.query<{ import_member_invites: ImportResult }>(
      `select public.import_member_invites($1, $2::jsonb, $3)`,
      [org, JSON.stringify(rows), dryRun]
    );
    return res.rows[0].import_member_invites;
  });
}

async function inviteCount(org: string) {
  const res = await getDb().query<{ n: number }>(
    `select count(*)::int as n from public.member_invites where org_id = $1`,
    [org]
  );
  return res.rows[0].n;
}

async function join(token: string, name: string, email: string) {
  return as("service_role", null, async () => {
    const res = await getDb().query<{ join_org: string }>(
      `select public.join_org($1, $2, $3, 'en', 'd4-2026-10-31')`,
      [token, name, email]
    );
    return res.rows[0].join_org;
  });
}

before(async () => {
  const db = await startDb();
  adminA = await addOfficer("admin.invites.a@school.edu", "Admin A");
  orgA = await addOrg(adminA, "Invites Org A");
  officerA = await addMember(orgA, "officer.invites.a@school.edu", "officer");
  adminB = await addOfficer("admin.invites.b@school.edu", "Admin B");
  orgB = await addOrg(adminB, "Invites Org B");

  const link = await as("authenticated", adminA, () =>
    db.query<{ set_join_link: string }>(`select public.set_join_link($1, 'on')`, [orgA])
  );
  tokenA = link.rows[0].set_join_link;
});

describe("import_member_invites: access", () => {
  const rows = [{ row: 2, email: "a1@school.edu", name: "A One" }];

  it("refuses an officer who is not an admin", async () => {
    const err = await errorOf(() => runImport(officerA, orgA, rows));
    assert.match(err ?? "", /not_admin/);
  });

  it("refuses an admin of another org", async () => {
    const err = await errorOf(() => runImport(adminB, orgA, rows));
    assert.match(err ?? "", /not_admin/);
  });

  it("refuses a signed-out caller and anon", async () => {
    assert.match((await errorOf(() => runImport(null, orgA, rows))) ?? "", /not_admin|permission/);
    assert.match(
      (await errorOf(() => runImport(null, orgA, rows, false, "anon"))) ?? "",
      /permission denied/
    );
  });

  it("saved nothing after the refusals", async () => {
    assert.equal(await inviteCount(orgA), 0);
  });

  it("lets only an admin of the org read its invitations", async () => {
    await runImport(adminA, orgA, [{ row: 2, email: "read1@school.edu" }]);
    const db = getDb();
    const read = (user: string, role: "authenticated" | "anon" = "authenticated") =>
      as(role, user, async () => {
        const res = await db.query(`select email from public.member_invites where org_id = $1`, [orgA]);
        return res.rows.length;
      });
    assert.equal(await read(adminA), 1);
    assert.equal(await read(adminB), 0);
    assert.equal(await read(officerA), 0);
    assert.match((await errorOf(() => read(adminA, "anon"))) ?? "", /permission denied/);
  });

  it("cannot be written directly", async () => {
    const db = getDb();
    const err = await errorOf(() =>
      as("authenticated", adminA, () =>
        db.query(
          `insert into public.member_invites (org_id, email, email_key) values ($1, 'x@school.edu', 'x@school.edu')`,
          [orgA]
        )
      )
    );
    assert.match(err ?? "", /permission denied/);
  });
});

describe("import_member_invites: rules", () => {
  it("rejects bad input shapes and the 1,000 row cap", async () => {
    assert.match((await errorOf(() => runImport(adminB, orgB, []))) ?? "", /no_rows/);
    assert.match((await errorOf(() => runImport(adminB, orgB, { a: 1 }))) ?? "", /invalid_rows/);
    const tooMany = Array.from({ length: 1001 }, (_, i) => ({ row: i + 1, email: `t${i}@school.edu` }));
    assert.match((await errorOf(() => runImport(adminB, orgB, tooMany))) ?? "", /too_many_rows/);
    assert.equal(await inviteCount(orgB), 0);
  });

  it("accepts exactly 1,000 rows", async () => {
    const rows = Array.from({ length: 1000 }, (_, i) => ({ row: i + 1, email: `bulk${i}@school.edu` }));
    const res = await runImport(adminB, orgB, rows);
    assert.equal(res.invited, 1000);
    assert.equal(await inviteCount(orgB), 1000);
    await getDb().query(`delete from public.member_invites where org_id = $1`, [orgB]);
  });

  it("a dry run reports the same counts and writes nothing", async () => {
    const rows = [
      { row: 2, email: "dry1@school.edu", name: "Dry One" },
      { row: 3, email: "not-an-email" },
    ];
    const dry = await runImport(adminB, orgB, rows, true);
    assert.equal(dry.dry_run, true);
    assert.equal(dry.invited, 1);
    assert.equal(dry.invalid, 1);
    assert.equal(await inviteCount(orgB), 0);

    const real = await runImport(adminB, orgB, rows, false);
    assert.equal(real.invited, dry.invited);
    assert.equal(real.invalid, dry.invalid);
    assert.equal(await inviteCount(orgB), 1);
    await getDb().query(`delete from public.member_invites where org_id = $1`, [orgB]);
  });

  it("lists invalid rows with their reason and skips them", async () => {
    const res = await runImport(adminB, orgB, [
      { row: 2, email: "" },
      { row: 3 },
      { row: 4, email: "no-at-sign" },
      { row: 5, email: "bad@@school.edu" },
      { row: 6, email: "sp ace@school.edu" },
      { row: 7, email: "ctrl\u0001@school.edu" },
      { row: 8, email: "long@school.edu", name: "x".repeat(101) },
      { row: 9, email: "good@school.edu" },
    ]);
    assert.equal(res.invited, 1);
    assert.equal(res.invalid, 7);
    const reasons = Object.fromEntries(res.invalid_rows.map((r) => [r.row, r.reason]));
    assert.deepEqual(reasons, {
      2: "missing_email",
      3: "missing_email",
      4: "invalid_email",
      5: "invalid_email",
      6: "invalid_email",
      7: "invalid_email",
      8: "name_too_long",
    });
    await getDb().query(`delete from public.member_invites where org_id = $1`, [orgB]);
  });

  it("counts the same email once, ignoring capitals and spacing", async () => {
    const res = await runImport(adminB, orgB, [
      { row: 2, email: "Twice@School.edu" },
      { row: 3, email: "  twice@school.edu " },
      { row: 4, email: "TWICE@SCHOOL.EDU" },
    ]);
    assert.equal(res.invited, 1);
    assert.equal(res.duplicates, 2);
    assert.equal(await inviteCount(orgB), 1);
  });

  it("skips emails that are already invited or already members of this org", async () => {
    const db = getDb();
    await db.query(
      `insert into public.members (org_id, full_name, email, email_key, consent_version, consent_language)
       values ($1, 'Existing Member', 'Existing@School.edu', 'existing@school.edu', 'v', 'en')`,
      [orgB]
    );
    const res = await runImport(adminB, orgB, [
      { row: 2, email: "twice@school.edu" },
      { row: 3, email: "EXISTING@school.edu" },
      { row: 4, email: "fresh@school.edu" },
    ]);
    assert.equal(res.invited, 1);
    assert.equal(res.duplicates, 2);
  });

  it("a member of another org does not count as a duplicate", async () => {
    const res = await runImport(adminB, orgB, [{ row: 2, email: "orgb-only@school.edu" }]);
    assert.equal(res.invited, 1);
    // the same address can be invited by org A as well
    const resA = await runImport(adminA, orgA, [{ row: 2, email: "orgb-only@school.edu" }]);
    assert.equal(resA.invited, 1);
  });

  it("cleans names: control characters, odd spacing, invisible characters, empty", async () => {
    await runImport(adminB, orgB, [
      { row: 2, email: "name1@school.edu", name: "  Maria\tClara ​ de   los\nSantos  " },
      { row: 3, email: "name2@school.edu", name: "   " },
      { row: 4, email: "name3@school.edu", name: "José Ñoño Peña" },
    ]);
    const res = await getDb().query<{ email_key: string; name: string | null }>(
      `select email_key, name from public.member_invites where org_id = $1 and email_key like 'name%' order by email_key`,
      [orgB]
    );
    assert.deepEqual(res.rows, [
      { email_key: "name1@school.edu", name: "Maria Clara de los Santos" },
      { email_key: "name2@school.edu", name: null },
      { email_key: "name3@school.edu", name: "José Ñoño Peña" },
    ]);
  });

  it("running the same import twice (double press) invites no one twice", async () => {
    const rows = [
      { row: 2, email: "dp1@school.edu" },
      { row: 3, email: "dp2@school.edu" },
    ];
    const first = await runImport(adminB, orgB, rows);
    const second = await runImport(adminB, orgB, rows);
    assert.equal(first.invited, 2);
    assert.equal(second.invited, 0);
    assert.equal(second.duplicates, 2);
    const res = await getDb().query<{ n: number }>(
      `select count(*)::int as n from public.member_invites where org_id = $1 and email_key like 'dp%'`,
      [orgB]
    );
    assert.equal(res.rows[0].n, 2);
  });

  it("is all or nothing: an unexpected failure saves no row", async () => {
    const before = await inviteCount(orgB);
    // a non-object row is skipped, but a row number that is not a number must not crash;
    // force a real failure with an oversized row number
    const err = await errorOf(() =>
      runImport(adminB, orgB, [
        { row: 2, email: "atomic1@school.edu" },
        { row: 1e12, email: "atomic2@school.edu" },
      ])
    );
    assert.ok(err, "expected the import to fail");
    assert.equal(await inviteCount(orgB), before);
  });
});

describe("expiry and cleanup", () => {
  it("an expired invitation can be invited again, and the old row is removed", async () => {
    const db = getDb();
    await runImport(adminA, orgA, [{ row: 2, email: "expired1@school.edu", name: "Old Name" }]);
    await db.query(
      `update public.member_invites set expires_at = now() - interval '1 day' where email_key = 'expired1@school.edu' and org_id = $1`,
      [orgA]
    );
    const dry = await runImport(adminA, orgA, [{ row: 2, email: "expired1@school.edu" }], true);
    assert.equal(dry.invited, 1);
    const real = await runImport(adminA, orgA, [{ row: 2, email: "expired1@school.edu", name: "New Name" }]);
    assert.equal(real.invited, 1);
    const res = await db.query<{ name: string; live: boolean }>(
      `select name, expires_at > now() as live from public.member_invites where email_key = 'expired1@school.edu' and org_id = $1`,
      [orgA]
    );
    assert.deepEqual(res.rows, [{ name: "New Name", live: true }]);
  });

  it("sets expiry 60 days after creation", async () => {
    const res = await getDb().query<{ days: number }>(
      `select round(extract(epoch from (expires_at - created_at)) / 86400)::int as days
         from public.member_invites where org_id = $1 limit 1`,
      [orgA]
    );
    assert.equal(res.rows[0].days, 60);
  });

  it("cleanup removes expired invitations, including the stored name and email", async () => {
    const db = getDb();
    await runImport(adminA, orgA, [{ row: 2, email: "gone1@school.edu", name: "Gone Person" }]);
    await db.query(
      `update public.member_invites set expires_at = now() - interval '1 second' where email_key = 'gone1@school.edu'`
    );
    const deleted = await as("service_role", null, async () => {
      const res = await db.query<{ n: number }>(`select public.cleanup_expired_member_invites() as n`);
      return res.rows[0].n;
    });
    assert.ok(deleted >= 1);
    const left = await db.query(`select 1 from public.member_invites where email_key = 'gone1@school.edu'`);
    assert.equal(left.rows.length, 0);
  });

  it("cleanup cannot be called by signed-in users or anon", async () => {
    const db = getDb();
    for (const role of ["authenticated", "anon"] as const) {
      const err = await errorOf(() =>
        as(role, adminA, () => db.query(`select public.cleanup_expired_member_invites()`))
      );
      assert.match(err ?? "", /permission denied/, role);
    }
  });
});

describe("join_org links invitations", () => {
  it("the same email (ignoring capitals) becomes a member and the invitation shows joined", async () => {
    const db = getDb();
    await runImport(adminA, orgA, [{ row: 2, email: "Joiner@School.edu", name: "Jo Iner" }]);
    assert.equal(await join(tokenA, "Jo Iner", "JOINER@school.EDU"), "ok");

    const member = await db.query(
      `select consent_version, consent_language, status from public.members where org_id = $1 and email_key = 'joiner@school.edu'`,
      [orgA]
    );
    assert.equal(member.rows.length, 1);
    assert.equal((member.rows[0] as { consent_version: string }).consent_version, "d4-2026-10-31");

    const invite = await db.query<{ joined: boolean }>(
      `select joined_at is not null as joined from public.member_invites where org_id = $1 and email_key = 'joiner@school.edu'`,
      [orgA]
    );
    assert.deepEqual(invite.rows, [{ joined: true }]);
  });

  it("a different email joins as a normal member and the invitation stays pending", async () => {
    const db = getDb();
    await runImport(adminA, orgA, [{ row: 2, email: "invited-addr@school.edu" }]);
    assert.equal(await join(tokenA, "Other Address", "other-addr@school.edu"), "ok");

    const invite = await db.query<{ joined: boolean }>(
      `select joined_at is not null as joined from public.member_invites where email_key = 'invited-addr@school.edu' and org_id = $1`,
      [orgA]
    );
    assert.deepEqual(invite.rows, [{ joined: false }]);
    const member = await db.query(
      `select 1 from public.members where org_id = $1 and email_key = 'other-addr@school.edu'`,
      [orgA]
    );
    assert.equal(member.rows.length, 1);
  });

  it("joining answers 'ok' whether or not the person was invited", async () => {
    assert.equal(await join(tokenA, "Never Invited", "never.invited@school.edu"), "ok");
    assert.equal(await join(tokenA, "Never Invited", "never.invited@school.edu"), "ok");
  });

  it("an expired invitation is not marked joined", async () => {
    const db = getDb();
    await runImport(adminA, orgA, [{ row: 2, email: "late@school.edu" }]);
    await db.query(
      `update public.member_invites set expires_at = now() - interval '1 day' where email_key = 'late@school.edu' and org_id = $1`,
      [orgA]
    );
    await join(tokenA, "Late Joiner", "late@school.edu");
    const invite = await db.query<{ joined: boolean }>(
      `select joined_at is not null as joined from public.member_invites where email_key = 'late@school.edu' and org_id = $1`,
      [orgA]
    );
    assert.deepEqual(invite.rows, [{ joined: false }]);
  });

  it("an invitation never creates a member: pending invitees are absent from members", async () => {
    const db = getDb();
    await runImport(adminA, orgA, [{ row: 2, email: "notyet@school.edu" }]);
    const member = await db.query(
      `select 1 from public.members where org_id = $1 and email_key = 'notyet@school.edu'`,
      [orgA]
    );
    assert.equal(member.rows.length, 0);
  });

  it("an invitation from org A does not mark org B's invite as joined", async () => {
    const db = getDb();
    await runImport(adminB, orgB, [{ row: 2, email: "cross@school.edu" }]);
    await runImport(adminA, orgA, [{ row: 2, email: "cross@school.edu" }]);
    await join(tokenA, "Cross Person", "cross@school.edu");
    const b = await db.query<{ joined: boolean }>(
      `select joined_at is not null as joined from public.member_invites where email_key = 'cross@school.edu' and org_id = $1`,
      [orgB]
    );
    assert.deepEqual(b.rows, [{ joined: false }]);
  });
});
