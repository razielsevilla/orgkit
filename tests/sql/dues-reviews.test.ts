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
let officerMemberA: string;
let memberA1: string;
let memberA2: string;
let memberOfficerId: string;
let adminB: string;
let officerB: string;
let periodAId: string;
let payTokenA: string;

async function createMember(
  orgId: string,
  email: string,
  fullName = "Student Member",
  status = "active"
): Promise<string> {
  const db = getDb();
  const res = await db.query<{ id: string }>(
    `insert into public.members (org_id, full_name, email, email_key, consent_version, consent_language, status, created_at)
     values ($1, $2, $3, lower($3), 'v1', 'en', $4, now())
     returning id`,
    [orgId, fullName, email, status]
  );
  return res.rows[0].id;
}

async function submitPayment(
  payToken: string,
  email: string,
  ref: string,
  screenshot = "dues-screenshots/screenshot-1.png"
): Promise<string> {
  const db = getDb();
  const res = await as("service_role", null, () =>
    db.query<{ submit_dues_payment: string }>(
      `select public.submit_dues_payment($1, $2, $3, $4)`,
      [payToken, email, ref, screenshot]
    )
  );
  return res.rows[0].submit_dues_payment;
}

let testSeq = 0;
async function createTestMember(emailPrefix = "member"): Promise<{ id: string; email: string }> {
  const email = `${emailPrefix}.${++testSeq}@school.edu`;
  const id = await createMember(orgA, email, `Member ${emailPrefix}`);
  return { id, email };
}

before(async () => {
  await startDb();

  // Setup Org A
  adminA = await addOfficer("admin.p3.a@school.edu", "Admin P3 A");
  orgA = await addOrg(adminA, "Dues P3 Org A");
  officerA = await addMember(orgA, "officer.p3.a@school.edu", "officer");

  // Officer who is also a member in Org A
  officerMemberA = await addMember(orgA, "officer.member.p3@school.edu", "officer");
  memberOfficerId = await createMember(orgA, "officer.member.p3@school.edu", "Officer Who Is Member");

  // Regular members in Org A
  memberA1 = await createMember(orgA, "member.p3.1@school.edu", "Member P3 One");
  memberA2 = await createMember(orgA, "member.p3.2@school.edu", "Member P3 Two");

  // Setup Org B
  adminB = await addOfficer("admin.p3.b@school.edu", "Admin P3 B");
  orgB = await addOrg(adminB, "Dues P3 Org B");
  officerB = await addMember(orgB, "officer.p3.b@school.edu", "officer");

  // Create an open dues period in Org A
  const db = getDb();
  const periodRes = await as("authenticated", officerA, () =>
    db.query<{ create_dues_period: string }>(
      `select public.create_dues_period($1, $2, $3, $4)`,
      [orgA, "1st Sem Dues 2026", 150.0, "2026-11-30"]
    )
  );
  periodAId = periodRes.rows[0].create_dues_period;

  const linkRes = await as("authenticated", officerA, () =>
    db.query<{ pay_token: string }>(
      `select pay_token from public.dues_periods where id = $1`,
      [periodAId]
    )
  );
  payTokenA = linkRes.rows[0].pay_token;
});

describe("P3 Dues Payment Events Schema & RLS", () => {
  it("officers can read dues payment events in their own org only", async () => {
    const db = getDb();
    const pId = await submitPayment(payTokenA, "member.p3.1@school.edu", "REF-EVT-001");

    // Insert an event as superuser test fixture
    await db.query(
      `insert into public.dues_payment_events (payment_id, org_id, action, actor_id, reason)
       values ($1, $2, 'verified', $3, null)`,
      [pId, orgA, officerA]
    );

    // Officer of Org A can read
    const eventsA = await as("authenticated", officerA, () =>
      db.query<{ action: string }>(
        `select action from public.dues_payment_events where payment_id = $1`,
        [pId]
      )
    );
    assert.equal(eventsA.rows.length, 1);
    assert.equal(eventsA.rows[0].action, "verified");

    // Officer of Org B cannot read
    const eventsB = await as("authenticated", officerB, () =>
      db.query<{ action: string }>(
        `select action from public.dues_payment_events where payment_id = $1`,
        [pId]
      )
    );
    assert.equal(eventsB.rows.length, 0);

    // Anon cannot read
    const eventsAnon = await as("anon", null, () =>
      db.query<{ action: string }>(
        `select action from public.dues_payment_events where payment_id = $1`,
        [pId]
      )
    );
    assert.equal(eventsAnon.rows.length, 0);
  });

  it("direct client insert, update, or delete on dues_payment_events is refused", async () => {
    const db = getDb();
    const pId = await submitPayment(payTokenA, "member.p3.2@school.edu", "REF-EVT-002");

    const insertErr = await errorOf(() =>
      as("authenticated", officerA, () =>
        db.query(
          `insert into public.dues_payment_events (payment_id, org_id, action, actor_id)
           values ($1, $2, 'verified', $3)`,
          [pId, orgA, officerA]
        )
      )
    );
    assert.ok(insertErr, "Direct client insert must be denied by privileges");

    const updateErr = await errorOf(() =>
      as("authenticated", officerA, () =>
        db.query(
          `update public.dues_payment_events set reason = 'Hacked' where payment_id = $1`,
          [pId]
        )
      )
    );
    assert.ok(updateErr, "Direct client update must be denied by privileges");

    const deleteErr = await errorOf(() =>
      as("authenticated", officerA, () =>
        db.query(
          `delete from public.dues_payment_events where payment_id = $1`,
          [pId]
        )
      )
    );
    assert.ok(deleteErr, "Direct client delete must be denied by privileges");
  });
});

describe("P3 Payment Verification & Self-Review Guard", () => {
  it("officer can verify a submitted payment and event is logged", async () => {
    const db = getDb();
    const m = await createTestMember("ver");
    const pId = await submitPayment(payTokenA, m.email, "REF-VER-001");

    // Verify payment as officerA
    await as("authenticated", officerA, () =>
      db.query(`select public.verify_dues_payment($1)`, [pId])
    );

    // Check payment record
    const payment = await as("authenticated", officerA, () =>
      db.query<{ status: string; reviewed_by: string; reviewed_at: string | null }>(
        `select status, reviewed_by, reviewed_at from public.dues_payments where id = $1`,
        [pId]
      )
    );
    assert.equal(payment.rows[0].status, "verified");
    assert.equal(payment.rows[0].reviewed_by, officerA);
    assert.ok(payment.rows[0].reviewed_at, "reviewed_at should be recorded");

    // Check event audit trail
    const events = await as("authenticated", officerA, () =>
      db.query<{ action: string; actor_id: string; reason: string | null }>(
        `select action, actor_id, reason from public.dues_payment_events where payment_id = $1`,
        [pId]
      )
    );
    assert.equal(events.rows.length, 1);
    assert.equal(events.rows[0].action, "verified");
    assert.equal(events.rows[0].actor_id, officerA);
    assert.equal(events.rows[0].reason, null);
  });

  it("officer is blocked from verifying their own member payment", async () => {
    const db = getDb();
    const ownPaymentId = await submitPayment(
      payTokenA,
      "officer.member.p3@school.edu",
      "REF-SELF-001"
    );

    // Self-review attempt by officerMemberA
    const selfErr = await errorOf(() =>
      as("authenticated", officerMemberA, () =>
        db.query(`select public.verify_dues_payment($1)`, [ownPaymentId])
      )
    );
    assert.ok(selfErr?.includes("cannot_review_own_payment"), "Officer cannot verify own payment");

    // Another officer can verify it
    await as("authenticated", officerA, () =>
      db.query(`select public.verify_dues_payment($1)`, [ownPaymentId])
    );

    const check = await as("authenticated", officerA, () =>
      db.query<{ status: string }>(
        `select status from public.dues_payments where id = $1`,
        [ownPaymentId]
      )
    );
    assert.equal(check.rows[0].status, "verified");
  });

  it("refuses unauthorized officer from another org or non-existent payment", async () => {
    const db = getDb();
    const m = await createTestMember("auth");
    const pId = await submitPayment(payTokenA, m.email, "REF-VER-002");

    // Org B officer cannot verify Org A payment
    const authErr = await errorOf(() =>
      as("authenticated", officerB, () =>
        db.query(`select public.verify_dues_payment($1)`, [pId])
      )
    );
    assert.ok(authErr?.includes("not_authorized"), "Officer of other org is denied");

    // Non-existent payment
    const notFoundErr = await errorOf(() =>
      as("authenticated", officerA, () =>
        db.query(`select public.verify_dues_payment('00000000-0000-4000-8000-000000000000')`)
      )
    );
    assert.ok(notFoundErr?.includes("payment_not_found"), "Non-existent payment throws payment_not_found");
  });
});


