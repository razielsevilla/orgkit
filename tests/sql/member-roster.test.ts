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
let adminA: string;
let officerA: string;
let adminB: string;
let tokenA: string;

let memberPending1: string;
let memberPending2: string;
let memberActive: string;
let memberB: string;

before(async () => {
  const db = await startDb();

  adminA = await addOfficer("admin.roster.a@school.edu", "Admin Roster A");
  orgA = await addOrg(adminA, "Roster Org A");
  officerA = await addMember(orgA, "officer.roster.a@school.edu", "officer");

  adminB = await addOfficer("admin.roster.b@school.edu", "Admin Roster B");
  orgB = await addOrg(adminB, "Roster Org B");

  // Generate join link for Org A
  const linkRes = await as("authenticated", adminA, () =>
    db.query<{ set_join_link: string }>(`select public.set_join_link($1, 'on')`, [orgA])
  );
  tokenA = linkRes.rows[0].set_join_link;

  // Insert test members directly in superuser context
  const m1 = await db.query<{ id: string }>(
    `insert into public.members (org_id, full_name, email, email_key, consent_version, consent_language, status, created_at)
     values ($1, 'Zack Pending Older', 'zack@school.edu', 'zack@school.edu', 'd4-2026-10-31', 'en', 'pending', now() - interval '2 days')
     returning id`,
    [orgA]
  );
  memberPending1 = m1.rows[0].id;

  const m2 = await db.query<{ id: string }>(
    `insert into public.members (org_id, full_name, email, email_key, consent_version, consent_language, status, created_at)
     values ($1, 'Alice Pending Newer', 'alice@school.edu', 'alice@school.edu', 'd4-2026-10-31', 'en', 'pending', now() - interval '1 hour')
     returning id`,
    [orgA]
  );
  memberPending2 = m2.rows[0].id;

  const m3 = await db.query<{ id: string }>(
    `insert into public.members (org_id, full_name, email, email_key, consent_version, consent_language, status, created_at)
     values ($1, 'Charlie Active', 'charlie@school.edu', 'charlie@school.edu', 'd4-2026-10-31', 'en', 'active', now() - interval '5 days')
     returning id`,
    [orgA]
  );
  memberActive = m3.rows[0].id;

  const mb = await db.query<{ id: string }>(
    `insert into public.members (org_id, full_name, email, email_key, consent_version, consent_language, status, created_at)
     values ($1, 'Dave Org B', 'dave@school.edu', 'dave@school.edu', 'd4-2026-10-31', 'en', 'pending', now())
     returning id`,
    [orgB]
  );
  memberB = mb.rows[0].id;
});

describe("member status constraint and sorting", () => {
  it("enforces allowed statuses: pending, active, inactive", async () => {
    const err = await errorOf(() =>
      getDb().query(
        `insert into public.members (org_id, full_name, email, email_key, consent_version, consent_language, status)
         values ($1, 'Invalid Person', 'bad@school.edu', 'bad@school.edu', 'd4-2026-10-31', 'en', 'banned')`,
        [orgA]
      )
    );
    assert.ok(err, "should refuse invalid status");
    assert.match(err, /members_status_check/);
  });

  it("orders pending members first, then newest joins first within groups", async () => {
    const res = await getDb().query<{ id: string; status: string }>(
      `select id, status from public.members where org_id = $1 order by is_pending desc, created_at desc`,
      [orgA]
    );

    // Expected order: memberPending2 (newer pending) -> memberPending1 (older pending) -> memberActive
    assert.equal(res.rows[0].id, memberPending2);
    assert.equal(res.rows[1].id, memberPending1);
    assert.equal(res.rows[2].id, memberActive);
  });
});

describe("confirm_member security definer function", () => {
  it("allows an officer of the org to confirm a pending member", async () => {
    const res = await as("authenticated", officerA, () =>
      getDb().query<{ confirm_member: string }>(
        `select public.confirm_member($1)`,
        [memberPending1]
      )
    );
    assert.equal(res.rows[0].confirm_member, "ok");

    const check = await getDb().query<{ status: string }>(
      `select status from public.members where id = $1`,
      [memberPending1]
    );
    assert.equal(check.rows[0].status, "active");
  });

  it("is idempotent: confirming an already active member returns ok and does not error", async () => {
    const res = await as("authenticated", officerA, () =>
      getDb().query<{ confirm_member: string }>(
        `select public.confirm_member($1)`,
        [memberPending1]
      )
    );
    assert.equal(res.rows[0].confirm_member, "ok");
  });

  it("refuses an officer from another org and leaves the member unchanged", async () => {
    const err = await errorOf(() =>
      as("authenticated", adminB, () =>
        getDb().query(`select public.confirm_member($1)`, [memberPending2])
      )
    );
    assert.ok(err);
    assert.match(err, /Not permitted/);

    const check = await getDb().query<{ status: string }>(
      `select status from public.members where id = $1`,
      [memberPending2]
    );
    assert.equal(check.rows[0].status, "pending");
  });

  it("refuses unauthenticated caller", async () => {
    const err = await errorOf(() =>
      as("anon", null, () =>
        getDb().query(`select public.confirm_member($1)`, [memberPending2])
      )
    );
    assert.ok(err);
  });
});

describe("get_org_join_link security definer function", () => {
  it("allows officers of the org to retrieve the active join link token", async () => {
    const res = await as("authenticated", officerA, () =>
      getDb().query<{ get_org_join_link: string }>(
        `select public.get_org_join_link($1)`,
        [orgA]
      )
    );
    assert.equal(res.rows[0].get_org_join_link, tokenA);
  });

  it("refuses callers from another org", async () => {
    const err = await errorOf(() =>
      as("authenticated", adminB, () =>
        getDb().query(`select public.get_org_join_link($1)`, [orgA])
      )
    );
    assert.ok(err);
    assert.match(err, /Not permitted/);
  });
});

