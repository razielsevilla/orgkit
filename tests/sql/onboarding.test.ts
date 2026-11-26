import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { as, addMember, addOfficer, addOrg, errorOf, getDb, startDb } from "./helpers.ts";

let adminA: string;
let officerA: string;
let outsiderB: string;
let orgA: string;
let orgB: string;

async function addMemberRow(orgId: string, email: string, status: string) {
  const res = await getDb().query<{ id: string }>(
    `insert into public.members (org_id, full_name, email, email_key, consent_version, consent_language, status)
     values ($1, $2, $3, $3, 'd4-2026-10-31', 'en', $4)
     returning id`,
    [orgId, `Member ${email}`, email, status]
  );
  return res.rows[0].id;
}

async function statusOf(memberId: string) {
  const res = await getDb().query<{ status: string }>(`select status from public.members where id = $1`, [memberId]);
  return res.rows[0].status;
}

before(async () => {
  await startDb();
  adminA = await addOfficer("admin.on1.a@school.edu", "Admin A");
  orgA = await addOrg(adminA, "Onboarding Org A");
  officerA = await addMember(orgA, "officer.on1.a@school.edu", "officer");
  outsiderB = await addOfficer("admin.on1.b@school.edu", "Admin B");
  orgB = await addOrg(outsiderB, "Onboarding Org B");
});

describe("a new org starts with its join link on", () => {
  it("creates exactly one active link when the org is created", async () => {
    const res = await getDb().query<{ n: number }>(
      `select count(*)::int as n from public.org_join_links where org_id = $1 and active`,
      [orgA]
    );
    assert.equal(res.rows[0].n, 1);
  });

  it("lets the admin read it back, and 'on' keeps the same token", async () => {
    const before = await getDb().query<{ token: string }>(
      `select token from public.org_join_links where org_id = $1 and active`,
      [orgA]
    );
    const res = await as("authenticated", adminA, () =>
      getDb().query<{ set_join_link: string }>(`select public.set_join_link($1, 'on')`, [orgA])
    );
    assert.equal(res.rows[0].set_join_link, before.rows[0].token);
  });

  it("can still be switched off by the admin", async () => {
    const res = await as("authenticated", outsiderB, () =>
      getDb().query<{ set_join_link: string | null }>(`select public.set_join_link($1, 'off')`, [orgB])
    );
    assert.equal(res.rows[0].set_join_link, null);
  });
});

describe("confirm_all_pending_members", () => {
  it("confirms every pending member of the org and returns how many", async () => {
    const p1 = await addMemberRow(orgA, "p1@school.edu", "pending");
    const p2 = await addMemberRow(orgA, "p2@school.edu", "pending");

    const res = await as("authenticated", officerA, () =>
      getDb().query<{ confirm_all_pending_members: number }>(
        `select public.confirm_all_pending_members($1)`,
        [orgA]
      )
    );
    assert.equal(res.rows[0].confirm_all_pending_members, 2);
    assert.equal(await statusOf(p1), "active");
    assert.equal(await statusOf(p2), "active");
  });

  it("leaves active and inactive members alone, and returns 0 when nothing is pending", async () => {
    const inactive = await addMemberRow(orgA, "gone@school.edu", "inactive");
    const res = await as("authenticated", adminA, () =>
      getDb().query<{ confirm_all_pending_members: number }>(
        `select public.confirm_all_pending_members($1)`,
        [orgA]
      )
    );
    assert.equal(res.rows[0].confirm_all_pending_members, 0);
    assert.equal(await statusOf(inactive), "inactive");
  });

  it("never touches another org's pending members", async () => {
    const other = await addMemberRow(orgB, "other.pending@school.edu", "pending");
    const err = await errorOf(() =>
      as("authenticated", officerA, () =>
        getDb().query(`select public.confirm_all_pending_members($1)`, [orgB])
      )
    );
    assert.ok(err);
    assert.match(err, /Not permitted/);
    assert.equal(await statusOf(other), "pending");
  });

  it("refuses a signed-out caller and anon", async () => {
    const err = await errorOf(() =>
      as("authenticated", null, () =>
        getDb().query(`select public.confirm_all_pending_members($1)`, [orgA])
      )
    );
    assert.ok(err);
    assert.match(err, /Not authenticated/);

    const anonErr = await errorOf(() =>
      as("anon", null, () => getDb().query(`select public.confirm_all_pending_members($1)`, [orgA]))
    );
    assert.ok(anonErr);
    assert.match(anonErr, /permission denied/);
  });
});
