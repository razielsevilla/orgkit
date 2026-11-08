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

let orgA: string;
let orgB: string;
let officerA: string;
let officerB: string;
let tokenA: string;

let memberPending: string;
let memberActive: string;
let memberSecond: string;
let memberOrgB: string;

before(async () => {
  const db = await startDb();

  const adminA = await addOfficer("admin.r2.a@school.edu", "Admin R2 A");
  orgA = await addOrg(adminA, "R2 Org A");
  officerA = await addMember(orgA, "officer.r2.a@school.edu", "officer");

  const adminB = await addOfficer("admin.r2.b@school.edu", "Admin R2 B");
  orgB = await addOrg(adminB, "R2 Org B");
  officerB = await addMember(orgB, "officer.r2.b@school.edu", "officer");

  // Create join link for Org A
  const linkRes = await as("authenticated", adminA, () =>
    db.query<{ set_join_link: string }>(`select public.set_join_link($1, 'on')`, [orgA])
  );
  tokenA = linkRes.rows[0].set_join_link;

  // Insert test members in Org A
  const m1 = await db.query<{ id: string }>(
    `insert into public.members (org_id, full_name, email, email_key, consent_version, consent_language, consent_at, status, created_at)
     values ($1, 'Pending Student', 'pending.student@school.edu', 'pending.student@school.edu', 'd4-2026-10-31', 'en', '2026-11-01 10:00:00+00', 'pending', now() - interval '3 days')
     returning id`,
    [orgA]
  );
  memberPending = m1.rows[0].id;

  const m2 = await db.query<{ id: string }>(
    `insert into public.members (org_id, full_name, email, email_key, consent_version, consent_language, consent_at, status, created_at)
     values ($1, 'Active Student', 'active.student@school.edu', 'active.student@school.edu', 'd4-2026-10-31', 'fil', '2026-11-02 12:00:00+00', 'active', now() - interval '2 days')
     returning id`,
    [orgA]
  );
  memberActive = m2.rows[0].id;

  const m3 = await db.query<{ id: string }>(
    `insert into public.members (org_id, full_name, email, email_key, consent_version, consent_language, consent_at, status, created_at)
     values ($1, 'Second Student', 'second.student@school.edu', 'second.student@school.edu', 'd4-2026-10-31', 'en', '2026-11-03 14:00:00+00', 'active', now() - interval '1 day')
     returning id`,
    [orgA]
  );
  memberSecond = m3.rows[0].id;

  // Insert member in Org B
  const mb = await db.query<{ id: string }>(
    `insert into public.members (org_id, full_name, email, email_key, consent_version, consent_language, consent_at, status, created_at)
     values ($1, 'Org B Member', 'orgb.member@school.edu', 'orgb.member@school.edu', 'd4-2026-10-31', 'en', '2026-11-04 15:00:00+00', 'active', now())
     returning id`,
    [orgB]
  );
  memberOrgB = mb.rows[0].id;
});

describe("update_member function", () => {
  it("allows an officer to update a member's name and email while leaving consent untouched", async () => {
    const beforeRes = await getDb().query<{
      consent_version: string;
      consent_language: string;
      consent_at: string;
    }>(
      `select consent_version, consent_language, consent_at from public.members where id = $1`,
      [memberActive]
    );
    const beforeConsent = beforeRes.rows[0];

    const res = await as("authenticated", officerA, () =>
      getDb().query<{ update_member: string }>(
        `select public.update_member($1, $2, $3)`,
        [memberActive, "Updated Active Student", "new.active@school.edu"]
      )
    );
    assert.equal(res.rows[0].update_member, "ok");

    const afterRes = await getDb().query<{
      full_name: string;
      email: string;
      email_key: string;
      consent_version: string;
      consent_language: string;
      consent_at: string;
      updated_at: string;
    }>(
      `select full_name, email, email_key, consent_version, consent_language, consent_at, updated_at from public.members where id = $1`,
      [memberActive]
    );
    const after = afterRes.rows[0];

    assert.equal(after.full_name, "Updated Active Student");
    assert.equal(after.email, "new.active@school.edu");
    assert.equal(after.email_key, "new.active@school.edu");
    assert.ok(after.updated_at, "updated_at should be populated");

    // Consent records must be exactly identical
    assert.equal(after.consent_version, beforeConsent.consent_version);
    assert.equal(after.consent_language, beforeConsent.consent_language);
    assert.equal(
      new Date(after.consent_at).getTime(),
      new Date(beforeConsent.consent_at).getTime()
    );
  });

  it("handles no-change save without error", async () => {
    const res = await as("authenticated", officerA, () =>
      getDb().query<{ update_member: string }>(
        `select public.update_member($1, $2, $3)`,
        [memberActive, "Updated Active Student", "new.active@school.edu"]
      )
    );
    assert.equal(res.rows[0].update_member, "ok");
  });

  it("allows updating casing or spacing of own email without collision", async () => {
    const res = await as("authenticated", officerA, () =>
      getDb().query<{ update_member: string }>(
        `select public.update_member($1, $2, $3)`,
        [memberActive, "Updated Active Student", "  New.Active@school.edu  "]
      )
    );
    assert.equal(res.rows[0].update_member, "ok");

    const check = await getDb().query<{ email: string; email_key: string }>(
      `select email, email_key from public.members where id = $1`,
      [memberActive]
    );
    assert.equal(check.rows[0].email, "New.Active@school.edu");
    assert.equal(check.rows[0].email_key, "new.active@school.edu");
  });

  it("rejects names shorter than 2 characters or longer than 100 characters", async () => {
    const errShort = await errorOf(() =>
      as("authenticated", officerA, () =>
        getDb().query(`select public.update_member($1, $2, $3)`, [
          memberActive,
          "A",
          "valid@school.edu",
        ])
      )
    );
    assert.ok(errShort);
    assert.match(errShort, /invalid_name/);

    const errLong = await errorOf(() =>
      as("authenticated", officerA, () =>
        getDb().query(`select public.update_member($1, $2, $3)`, [
          memberActive,
          "A".repeat(101),
          "valid@school.edu",
        ])
      )
    );
    assert.ok(errLong);
    assert.match(errLong, /invalid_name/);
  });

  it("rejects invalid emails and emails over 254 characters", async () => {
    const errFormat = await errorOf(() =>
      as("authenticated", officerA, () =>
        getDb().query(`select public.update_member($1, $2, $3)`, [
          memberActive,
          "Valid Name",
          "not-an-email",
        ])
      )
    );
    assert.ok(errFormat);
    assert.match(errFormat, /invalid_email/);

    const errTooLong = await errorOf(() =>
      as("authenticated", officerA, () =>
        getDb().query(`select public.update_member($1, $2, $3)`, [
          memberActive,
          "Valid Name",
          `user@${"a".repeat(250)}.com`,
        ])
      )
    );
    assert.ok(errTooLong);
    assert.match(errTooLong, /invalid_email/);
  });

  it("rejects an email that already belongs to another member of the same org", async () => {
    const err = await errorOf(() =>
      as("authenticated", officerA, () =>
        getDb().query(`select public.update_member($1, $2, $3)`, [
          memberActive,
          "Valid Name",
          "second.student@school.edu",
        ])
      )
    );
    assert.ok(err);
    assert.match(err, /duplicate_email/);
  });

  it("refuses an officer from another org", async () => {
    const err = await errorOf(() =>
      as("authenticated", officerB, () =>
        getDb().query(`select public.update_member($1, $2, $3)`, [
          memberActive,
          "Hacked Name",
          "hacked@school.edu",
        ])
      )
    );
    assert.ok(err);
    assert.match(err, /not_permitted/);
  });

  it("refuses unauthenticated callers", async () => {
    const err = await errorOf(() =>
      as("anon", null, () =>
        getDb().query(`select public.update_member($1, $2, $3)`, [
          memberActive,
          "Hacked Name",
          "hacked@school.edu",
        ])
      )
    );
    assert.ok(err);
    assert.match(err, /permission denied|not_authenticated/);
  });

  it("refuses direct database updates without through function (RLS write policy guard)", async () => {
    const err = await errorOf(() =>
      as("authenticated", officerA, () =>
        getDb().query(
          `update public.members set full_name = 'Direct Bypass' where id = $1`,
          [memberActive]
        )
      )
    );
    // In PostgreSQL with RLS enabled and no update policy, update either modifies 0 rows or raises error
    // Here we verify no write policy was granted to authenticated
    const check = await getDb().query<{ full_name: string }>(
      `select full_name from public.members where id = $1`,
      [memberActive]
    );
    assert.notEqual(check.rows[0].full_name, "Direct Bypass");
  });
});

describe("set_member_status function", () => {
  it("allows deactivating a pending member (rejecting pending sign-up)", async () => {
    const res = await as("authenticated", officerA, () =>
      getDb().query<{ set_member_status: string }>(
        `select public.set_member_status($1, 'inactive')`,
        [memberPending]
      )
    );
    assert.equal(res.rows[0].set_member_status, "ok");

    const check = await getDb().query<{ status: string; updated_at: string }>(
      `select status, updated_at from public.members where id = $1`,
      [memberPending]
    );
    assert.equal(check.rows[0].status, "inactive");
    assert.ok(check.rows[0].updated_at);
  });

  it("allows deactivating an active member", async () => {
    const res = await as("authenticated", officerA, () =>
      getDb().query<{ set_member_status: string }>(
        `select public.set_member_status($1, 'inactive')`,
        [memberActive]
      )
    );
    assert.equal(res.rows[0].set_member_status, "ok");

    const check = await getDb().query<{ status: string }>(
      `select status from public.members where id = $1`,
      [memberActive]
    );
    assert.equal(check.rows[0].status, "inactive");
  });

  it("is idempotent when setting already inactive member to inactive", async () => {
    const res = await as("authenticated", officerA, () =>
      getDb().query<{ set_member_status: string }>(
        `select public.set_member_status($1, 'inactive')`,
        [memberActive]
      )
    );
    assert.equal(res.rows[0].set_member_status, "ok");
  });

  it("allows reactivating an inactive member back to active", async () => {
    const res = await as("authenticated", officerA, () =>
      getDb().query<{ set_member_status: string }>(
        `select public.set_member_status($1, 'active')`,
        [memberActive]
      )
    );
    assert.equal(res.rows[0].set_member_status, "ok");

    const check = await getDb().query<{ status: string }>(
      `select status from public.members where id = $1`,
      [memberActive]
    );
    assert.equal(check.rows[0].status, "active");
  });

  it("refuses invalid transitions like setting pending to active via set_member_status", async () => {
    // Re-create a fresh pending member
    const newPendingRes = await getDb().query<{ id: string }>(
      `insert into public.members (org_id, full_name, email, email_key, consent_version, consent_language, status)
       values ($1, 'Another Pending', 'another.pending@school.edu', 'another.pending@school.edu', 'd4-2026-10-31', 'en', 'pending')
       returning id`,
      [orgA]
    );
    const newPendingId = newPendingRes.rows[0].id;

    const err = await errorOf(() =>
      as("authenticated", officerA, () =>
        getDb().query(`select public.set_member_status($1, 'active')`, [newPendingId])
      )
    );
    assert.ok(err);
    assert.match(err, /invalid_status_transition/);
  });

  it("refuses an officer of org A from altering a member of org B", async () => {
    const err = await errorOf(() =>
      as("authenticated", officerA, () =>
        getDb().query(`select public.set_member_status($1, 'inactive')`, [memberOrgB])
      )
    );
    assert.ok(err);
    assert.match(err, /not_permitted/);

    const check = await getDb().query<{ status: string }>(
      `select status from public.members where id = $1`,
      [memberOrgB]
    );
    assert.equal(check.rows[0].status, "active");
  });

  it("refuses unauthenticated callers", async () => {
    const err = await errorOf(() =>
      as("anon", null, () =>
        getDb().query(`select public.set_member_status($1, 'inactive')`, [memberActive])
      )
    );
    assert.ok(err);
    assert.match(err, /permission denied|not_authenticated/);
  });
});

describe("inactive member rejoining org through public link", () => {
  it("keeps inactive status when submitting the join form again and returns ok", async () => {
    // Ensure memberPending is inactive
    await as("authenticated", officerA, () =>
      getDb().query(`select public.set_member_status($1, 'inactive')`, [memberPending])
    );

    // Call join_org as service_role with identical email
    const res = await as("service_role", null, () =>
      getDb().query<{ join_org: string }>(
        `select public.join_org($1, $2, $3, $4, $5)`,
        [tokenA, "Pending Student", "pending.student@school.edu", "en", "d4-2026-10-31"]
      )
    );
    assert.equal(res.rows[0].join_org, "ok");

    // Status remains inactive
    const check = await getDb().query<{ status: string }>(
      `select status from public.members where id = $1`,
      [memberPending]
    );
    assert.equal(check.rows[0].status, "inactive");
  });
});
