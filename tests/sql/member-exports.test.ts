import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { as, addMember, addOfficer, addOrg, errorOf, getDb, startDb } from "./helpers.ts";

let orgA: string;
let adminA: string;
let officerA: string;
let adminB: string;

const FIELDS = ["full_name", "email", "status"];
const STATUSES = ["active"];

before(async () => {
  await startDb();
  adminA = await addOfficer("admin.export.a@school.edu", "Admin Export A");
  orgA = await addOrg(adminA, "Export Org A");
  officerA = await addMember(orgA, "officer.export.a@school.edu", "officer");
  adminB = await addOfficer("admin.export.b@school.edu", "Admin Export B");
  await addOrg(adminB, "Export Org B");
});

const record = (userId: string, org: string, fields = FIELDS, statuses = STATUSES, rows = 3) =>
  as("authenticated", userId, () =>
    getDb().query(`select public.record_member_export($1, $2, $3, $4)`, [org, fields, statuses, rows])
  );

describe("record_member_export", () => {
  it("lets an admin record an export for their org", async () => {
    await record(adminA, orgA);
    const rows = await getDb().query<{ officer_id: string; row_count: number; fields: string[] }>(
      `select officer_id, row_count, fields from public.member_exports where org_id = $1`,
      [orgA]
    );
    assert.equal(rows.rows.length, 1);
    assert.equal(rows.rows[0].officer_id, adminA);
    assert.equal(rows.rows[0].row_count, 3);
    assert.deepEqual(rows.rows[0].fields, FIELDS);
  });

  it("refuses an officer who is not an admin", async () => {
    const err = await errorOf(() => record(officerA, orgA));
    assert.match(err ?? "", /Not permitted/);
  });

  it("refuses an admin of another org", async () => {
    const err = await errorOf(() => record(adminB, orgA));
    assert.match(err ?? "", /Not permitted/);
  });

  it("refuses a signed-out caller and anon", async () => {
    const anonErr = await errorOf(() =>
      as("anon", null, () =>
        getDb().query(`select public.record_member_export($1, $2, $3, 1)`, [orgA, FIELDS, STATUSES])
      )
    );
    assert.match(anonErr ?? "", /permission denied/);

    const signedOutErr = await errorOf(() =>
      as("authenticated", null, () =>
        getDb().query(`select public.record_member_export($1, $2, $3, 1)`, [orgA, FIELDS, STATUSES])
      )
    );
    assert.match(signedOutErr ?? "", /Not authenticated/);
  });

  it("refuses unknown fields, unknown statuses and bad counts", async () => {
    assert.match((await errorOf(() => record(adminA, orgA, ["password"]))) ?? "", /Invalid export fields/);
    assert.match((await errorOf(() => record(adminA, orgA, []))) ?? "", /Invalid export fields/);
    assert.match(
      (await errorOf(() => record(adminA, orgA, FIELDS, ["banned"]))) ?? "",
      /Invalid export statuses/
    );
    assert.match((await errorOf(() => record(adminA, orgA, FIELDS, STATUSES, -1))) ?? "", /Invalid row count/);
  });
});

describe("member_exports access", () => {
  it("lets an admin read their org's record", async () => {
    const res = await as("authenticated", adminA, () =>
      getDb().query(`select id from public.member_exports where org_id = $1`, [orgA])
    );
    assert.ok(res.rows.length >= 1);
  });

  it("hides the record from non-admin officers and other orgs", async () => {
    const asOfficer = await as("authenticated", officerA, () =>
      getDb().query(`select id from public.member_exports`)
    );
    assert.equal(asOfficer.rows.length, 0);

    const asOtherAdmin = await as("authenticated", adminB, () =>
      getDb().query(`select id from public.member_exports where org_id = $1`, [orgA])
    );
    assert.equal(asOtherAdmin.rows.length, 0);
  });

  it("cannot be written to directly", async () => {
    const err = await errorOf(() =>
      as("authenticated", adminA, () =>
        getDb().query(
          `insert into public.member_exports (org_id, officer_id, row_count, fields) values ($1, $2, 1, '{email}')`,
          [orgA, adminA]
        )
      )
    );
    assert.match(err ?? "", /permission denied/);
    const del = await errorOf(() =>
      as("authenticated", adminA, () => getDb().query(`delete from public.member_exports`))
    );
    assert.match(del ?? "", /permission denied/);
  });
});
