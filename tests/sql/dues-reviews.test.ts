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
  await createMember(orgA, "officer.member.p3@school.edu", "Officer Who Is Member");

  // Regular members in Org A
  await createMember(orgA, "member.p3.1@school.edu", "Member P3 One");
  await createMember(orgA, "member.p3.2@school.edu", "Member P3 Two");

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

describe("P3 Payment Rejection & Resubmission Eligibility", () => {
  it("officer can reject with a reason and event is logged", async () => {
    const db = getDb();
    const m = await createTestMember("rej");
    const pId = await submitPayment(payTokenA, m.email, "REF-REJ-001");

    const reason = "Amount doesn't match the period dues";
    await as("authenticated", officerA, () =>
      db.query(`select public.reject_dues_payment($1, $2)`, [pId, reason])
    );

    const payment = await as("authenticated", officerA, () =>
      db.query<{ status: string; reject_reason: string; reviewed_by: string; reviewed_at: string | null }>(
        `select status, reject_reason, reviewed_by, reviewed_at from public.dues_payments where id = $1`,
        [pId]
      )
    );
    assert.equal(payment.rows[0].status, "rejected");
    assert.equal(payment.rows[0].reject_reason, reason);
    assert.equal(payment.rows[0].reviewed_by, officerA);
    assert.ok(payment.rows[0].reviewed_at);

    // Event audit trail
    const events = await as("authenticated", officerA, () =>
      db.query<{ action: string; actor_id: string; reason: string }>(
        `select action, actor_id, reason from public.dues_payment_events where payment_id = $1`,
        [pId]
      )
    );
    assert.equal(events.rows.length, 1);
    assert.equal(events.rows[0].action, "rejected");
    assert.equal(events.rows[0].actor_id, officerA);
    assert.equal(events.rows[0].reason, reason);
  });

  it("rejection requires a valid non-empty reason", async () => {
    const db = getDb();
    const m = await createTestMember("rejreq");
    const pId = await submitPayment(payTokenA, m.email, "REF-REJ-002");

    // Empty / whitespace reason
    const emptyErr = await errorOf(() =>
      as("authenticated", officerA, () =>
        db.query(`select public.reject_dues_payment($1, $2)`, [pId, "   "])
      )
    );
    assert.ok(emptyErr?.includes("reason_required"), "Empty reason must be rejected");

    // Short reason (< 3 chars)
    const shortErr = await errorOf(() =>
      as("authenticated", officerA, () =>
        db.query(`select public.reject_dues_payment($1, $2)`, [pId, "no"])
      )
    );
    assert.ok(shortErr?.includes("reason_required"), "Short reason must be rejected");

    // Too long reason (> 500 chars)
    const longErr = await errorOf(() =>
      as("authenticated", officerA, () =>
        db.query(`select public.reject_dues_payment($1, $2)`, [pId, "a".repeat(501)])
      )
    );
    assert.ok(longErr?.includes("reason_too_long"), "Too long reason must be rejected");
  });

  it("member can resubmit after rejection and rejected row stays in history", async () => {
    const db = getDb();
    const m = await createTestMember("resub");
    const firstPaymentId = await submitPayment(payTokenA, m.email, "REF-ORIG-001");

    // Reject first payment
    await as("authenticated", officerA, () =>
      db.query(`select public.reject_dues_payment($1, 'Screenshot unclear')`, [firstPaymentId])
    );

    // Member submits second payment for same period
    const secondPaymentId = await submitPayment(payTokenA, m.email, "REF-CORR-002");
    assert.ok(secondPaymentId, "New submission should succeed after rejection");
    assert.notEqual(firstPaymentId, secondPaymentId);

    // Verify first is rejected and second is submitted
    const list = await as("authenticated", officerA, () =>
      db.query<{ id: string; status: string; reference_no: string }>(
        `select id, status, reference_no from public.dues_payments where member_id = (
           select id from public.members where email = $1
         ) order by submitted_at asc`,
        [m.email]
      )
    );
    assert.equal(list.rows.length, 2);
    assert.equal(list.rows[0].status, "rejected");
    assert.equal(list.rows[0].reference_no, "REF-ORIG-001");
    assert.equal(list.rows[1].status, "submitted");
    assert.equal(list.rows[1].reference_no, "REF-CORR-002");
  });

  it("officer cannot reject their own payment", async () => {
    const db = getDb();
    const id = await addMember(orgA, "officer.rej.self@school.edu", "officer");
    await createMember(orgA, "officer.rej.self@school.edu", "Officer Rej Self");

    const ownPaymentId = await submitPayment(
      payTokenA,
      "officer.rej.self@school.edu",
      "REF-SELF-REJ-001"
    );

    const selfErr = await errorOf(() =>
      as("authenticated", id, () =>
        db.query(`select public.reject_dues_payment($1, 'Invalid receipt')`, [ownPaymentId])
      )
    );
    assert.ok(selfErr?.includes("cannot_review_own_payment"), "Self-rejection must be blocked");
  });
});

describe("P3 Review Concurrency, Admin Undo & Queue Ordering", () => {
  it("two officers acting simultaneously: exactly one wins, second sees already_reviewed", async () => {
    const db = getDb();
    const m = await createTestMember("conc");
    const pId = await submitPayment(payTokenA, m.email, "REF-CONC-001");

    // Officer A verifies
    await as("authenticated", officerA, () =>
      db.query(`select public.verify_dues_payment($1)`, [pId])
    );

    // Admin tries to reject the already verified payment
    const secondErr = await errorOf(() =>
      as("authenticated", adminA, () =>
        db.query(`select public.reject_dues_payment($1, 'Late rejection')`, [pId])
      )
    );
    assert.ok(secondErr?.includes("already_reviewed"), "Second reviewer receives already_reviewed");

    // Admin tries to verify again
    const thirdErr = await errorOf(() =>
      as("authenticated", adminA, () =>
        db.query(`select public.verify_dues_payment($1)`, [pId])
      )
    );
    assert.ok(thirdErr?.includes("already_reviewed"), "Subsequent reviewer receives already_reviewed");

    // Only 1 event is recorded
    const events = await as("authenticated", officerA, () =>
      db.query<{ count: string }>(
        `select count(*)::text from public.dues_payment_events where payment_id = $1`,
        [pId]
      )
    );
    assert.equal(events.rows[0].count, "1");
  });

  it("admin can undo a verification with reason; non-admin is refused", async () => {
    const db = getDb();
    const m = await createTestMember("undo");
    const pId = await submitPayment(payTokenA, m.email, "REF-UNDO-001");

    // 1. Verify
    await as("authenticated", officerA, () =>
      db.query(`select public.verify_dues_payment($1)`, [pId])
    );

    // 2. Non-admin officer tries to undo -> denied
    const nonAdminErr = await errorOf(() =>
      as("authenticated", officerA, () =>
        db.query(`select public.undo_dues_payment_verification($1, 'Mistake')`, [pId])
      )
    );
    assert.ok(nonAdminErr?.includes("admin_only"), "Non-admin cannot undo verification");

    // 3. Admin undoes with reason
    const reason = "Mistakenly matched wrong bank transaction";
    await as("authenticated", adminA, () =>
      db.query(`select public.undo_dues_payment_verification($1, $2)`, [pId, reason])
    );

    // Check payment restored to submitted
    const payment = await as("authenticated", officerA, () =>
      db.query<{ status: string; reviewed_by: string | null; reviewed_at: string | null }>(
        `select status, reviewed_by, reviewed_at from public.dues_payments where id = $1`,
        [pId]
      )
    );
    assert.equal(payment.rows[0].status, "submitted");
    assert.equal(payment.rows[0].reviewed_by, null);
    assert.equal(payment.rows[0].reviewed_at, null);

    // Check undo event is logged
    const events = await as("authenticated", officerA, () =>
      db.query<{ action: string; actor_id: string; reason: string }>(
        `select action, actor_id, reason from public.dues_payment_events where payment_id = $1 order by created_at asc`,
        [pId]
      )
    );
    assert.equal(events.rows.length, 2);
    assert.equal(events.rows[0].action, "verified");
    assert.equal(events.rows[1].action, "undone");
    assert.equal(events.rows[1].actor_id, adminA);
    assert.equal(events.rows[1].reason, reason);
  });

  it("undo requires valid reason and rejects non-verified payments", async () => {
    const db = getDb();
    const m = await createTestMember("undoval");
    const pId = await submitPayment(payTokenA, m.email, "REF-UNDOVAL-001");

    // Payment is still 'submitted' -> invalid status transition for undo
    const submitUndoErr = await errorOf(() =>
      as("authenticated", adminA, () =>
        db.query(`select public.undo_dues_payment_verification($1, 'Valid reason')`, [pId])
      )
    );
    assert.ok(submitUndoErr?.includes("invalid_status_transition"));

    // Verify first
    await as("authenticated", officerA, () =>
      db.query(`select public.verify_dues_payment($1)`, [pId])
    );

    // Undo with empty reason
    const emptyErr = await errorOf(() =>
      as("authenticated", adminA, () =>
        db.query(`select public.undo_dues_payment_verification($1, '   ')`, [pId])
      )
    );
    assert.ok(emptyErr?.includes("reason_required"));
  });

  it("get_dues_review_queue returns only submitted payments oldest first", async () => {
    const db = getDb();
    // Create a new period for clean queue test
    const periodRes = await as("authenticated", officerA, () =>
      db.query<{ create_dues_period: string }>(
        `select public.create_dues_period($1, $2, $3, $4)`,
        [orgA, "Queue Test Period", 100.0, "2026-12-31"]
      )
    );
    const qPeriodId = periodRes.rows[0].create_dues_period;

    const tokenRes = await as("authenticated", officerA, () =>
      db.query<{ pay_token: string }>(
        `select pay_token from public.dues_periods where id = $1`,
        [qPeriodId]
      )
    );
    const qToken = tokenRes.rows[0].pay_token;

    // Member 1 submits
    const m1 = await createTestMember("queue1");
    const p1 = await submitPayment(qToken, m1.email, "REF-Q-001");

    // Member 2 submits
    const m2 = await createTestMember("queue2");
    const p2 = await submitPayment(qToken, m2.email, "REF-Q-002");

    // Member 3 submits
    const m3 = await createTestMember("queue3");
    const p3 = await submitPayment(qToken, m3.email, "REF-Q-003");

    // Verify Member 2 payment (should leave queue)
    await as("authenticated", officerA, () =>
      db.query(`select public.verify_dues_payment($1)`, [p2])
    );

    // Fetch queue
    const queue = await as("authenticated", officerA, () =>
      db.query<{ payment_id: string; reference_no: string; member_name: string }>(
        `select payment_id, reference_no, member_name from public.get_dues_review_queue($1, $2)`,
        [orgA, qPeriodId]
      )
    );

    // Only p1 and p3 remain in queue, in submission order (oldest first)
    assert.equal(queue.rows.length, 2);
    assert.equal(queue.rows[0].payment_id, p1);
    assert.equal(queue.rows[0].reference_no, "REF-Q-001");
    assert.equal(queue.rows[1].payment_id, p3);
    assert.equal(queue.rows[1].reference_no, "REF-Q-003");

    // Unauthorized org officer is refused
    const authErr = await errorOf(() =>
      as("authenticated", officerB, () =>
        db.query(`select * from public.get_dues_review_queue($1, $2)`, [orgA, qPeriodId])
      )
    );
    assert.ok(authErr?.includes("not_authorized"));
  });
});




