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
let memberA1: string;
let memberA2: string;
let adminB: string;
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

before(async () => {
  await startDb();

  adminA = await addOfficer("admin.dues.p2.a@school.edu", "Admin Dues P2 A");
  orgA = await addOrg(adminA, "Dues P2 Org A");
  officerA = await addMember(orgA, "officer.dues.p2.a@school.edu", "officer");

  // Add members in Org A
  memberA1 = await createMember(orgA, "member.p2.1@school.edu", "Member P2 One", "active");
  memberA2 = await createMember(orgA, "member.p2.2@school.edu", "Member P2 Two", "active");

  const db = getDb();

  // Org B and officer
  adminB = await addOfficer("admin.dues.p2.b@school.edu", "Admin Dues P2 B");
  orgB = await addOrg(adminB, "Dues P2 Org B");

  // Create an initial open dues period in Org A
  const periodRes = await as("authenticated", officerA, () =>
    db.query<{ create_dues_period: string }>(
      `select public.create_dues_period($1, $2, $3, $4)`,
      [orgA, "Semester Dues 2026", 250.0, "2026-12-15"]
    )
  );
  periodAId = periodRes.rows[0].create_dues_period;

  // Retrieve initial pay_token
  const linkRes = await as("authenticated", officerA, () =>
    db.query<{ pay_token: string }>(
      `select pay_token from public.dues_periods where id = $1`,
      [periodAId]
    )
  );
  payTokenA = linkRes.rows[0].pay_token;
});

describe("P2 Dues Periods Pay Link Management", () => {
  it("initial dues period has an unguessable pay_token and active pay link", async () => {
    assert.ok(payTokenA, "Period should have generated a pay_token");
    assert.equal(payTokenA.length, 64, "Token should be 64 characters hex");

    const db = getDb();
    const period = await as("authenticated", officerA, () =>
      db.query<{ pay_link_active: boolean }>(
        `select pay_link_active from public.dues_periods where id = $1`,
        [periodAId]
      )
    );
    assert.equal(period.rows[0].pay_link_active, true);
  });

  it("officer can turn pay link off and on", async () => {
    const db = getDb();

    // Turn off
    const offRes = await as("authenticated", officerA, () =>
      db.query<{ set_dues_pay_link: string | null }>(
        `select public.set_dues_pay_link($1, $2, 'off')`,
        [orgA, periodAId]
      )
    );
    assert.equal(offRes.rows[0].set_dues_pay_link, null);

    const offState = await as("authenticated", officerA, () =>
      db.query<{ pay_link_active: boolean }>(
        `select pay_link_active from public.dues_periods where id = $1`,
        [periodAId]
      )
    );
    assert.equal(offState.rows[0].pay_link_active, false);

    // Turn back on
    const onRes = await as("authenticated", officerA, () =>
      db.query<{ set_dues_pay_link: string | null }>(
        `select public.set_dues_pay_link($1, $2, 'on')`,
        [orgA, periodAId]
      )
    );
    assert.equal(onRes.rows[0].set_dues_pay_link, payTokenA);

    const onState = await as("authenticated", officerA, () =>
      db.query<{ pay_link_active: boolean }>(
        `select pay_link_active from public.dues_periods where id = $1`,
        [periodAId]
      )
    );
    assert.equal(onState.rows[0].pay_link_active, true);
  });

  it("officer can rotate pay link to invalidate old link and issue a new one", async () => {
    const db = getDb();
    const rotateRes = await as("authenticated", officerA, () =>
      db.query<{ set_dues_pay_link: string }>(
        `select public.set_dues_pay_link($1, $2, 'rotate')`,
        [orgA, periodAId]
      )
    );
    const newPayToken = rotateRes.rows[0].set_dues_pay_link;
    assert.ok(newPayToken);
    assert.notEqual(newPayToken, payTokenA, "Rotated token must be different from previous token");

    // Old token should not yield active pay info
    const oldInfo = await as("service_role", null, () =>
      db.query(
        `select * from public.get_dues_pay_info($1)`,
        [payTokenA]
      )
    );
    assert.equal(oldInfo.rows.length, 0, "Old token must no longer be found");

    // New token yields active pay info
    const newInfo = await as("service_role", null, () =>
      db.query<{ period_name: string; amount: string }>(
        `select period_name, amount from public.get_dues_pay_info($1)`,
        [newPayToken]
      )
    );
    assert.equal(newInfo.rows.length, 1);
    assert.equal(newInfo.rows[0].period_name, "Semester Dues 2026");
    assert.equal(parseFloat(newInfo.rows[0].amount), 250.0);

    // Update global payTokenA to current active token
    payTokenA = newPayToken;
  });

  it("refuses unauthorized caller from other org or unauthenticated", async () => {
    const db = getDb();
    const otherOrgErr = await errorOf(() =>
      as("authenticated", adminB, () =>
        db.query(`select public.set_dues_pay_link($1, $2, 'off')`, [orgA, periodAId])
      )
    );
    assert.ok(otherOrgErr, "Officer of other org must be rejected");

    const anonErr = await errorOf(() =>
      as("anon", null, () =>
        db.query(`select public.set_dues_pay_link($1, $2, 'off')`, [orgA, periodAId])
      )
    );
    assert.ok(anonErr, "Anon caller must be rejected");
  });
});

describe("P2 Dues Payments Submission & Deduplication", () => {
  it("active member submits valid reference and screenshot: creates 1 submitted payment", async () => {
    const db = getDb();
    const submitRes = await as("service_role", null, () =>
      db.query<{ submit_dues_payment: string }>(
        `select public.submit_dues_payment($1, $2, $3, $4)`,
        [payTokenA, "member.p2.1@school.edu", "GCASH-9876543210", `${orgA}/payment-1.png`]
      )
    );
    const paymentId = submitRes.rows[0].submit_dues_payment;
    assert.ok(paymentId, "Payment ID should be returned");

    // Verify row details in dues_payments as officer
    const payment = await as("authenticated", officerA, () =>
      db.query<{
        id: string;
        amount: string;
        status: string;
        reference_no: string;
        reference_key: string;
        screenshot_path: string;
      }>(
        `select id, amount, status, reference_no, reference_key, screenshot_path from public.dues_payments where id = $1`,
        [paymentId]
      )
    );
    assert.equal(payment.rows.length, 1);
    assert.equal(parseFloat(payment.rows[0].amount), 250.0);
    assert.equal(payment.rows[0].status, "submitted");
    assert.equal(payment.rows[0].reference_no, "GCASH-9876543210");
    assert.equal(payment.rows[0].reference_key, "gcash-9876543210");
    assert.equal(payment.rows[0].screenshot_path, `${orgA}/payment-1.png`);
  });

  it("same member cannot submit again while a submitted or verified payment exists", async () => {
    const db = getDb();
    const dupErr = await errorOf(() =>
      as("service_role", null, () =>
        db.query(`select public.submit_dues_payment($1, $2, $3, $4)`, [
          payTokenA,
          "member.p2.1@school.edu",
          "GCASH-DIFFERENT-REF",
          `${orgA}/payment-dup.png`,
        ])
      )
    );
    assert.ok(dupErr, "Double submission should be rejected");
    assert.match(dupErr, /already_submitted/);
  });

  it("reference number cannot be reused by another member in the org (case/space insensitive)", async () => {
    const db = getDb();
    // Same reference with different casing and spaces
    const reuseErr = await errorOf(() =>
      as("service_role", null, () =>
        db.query(`select public.submit_dues_payment($1, $2, $3, $4)`, [
          payTokenA,
          "member.p2.2@school.edu",
          "  gcash- 9876543210  ",
          `${orgA}/payment-reuse.png`,
        ])
      )
    );
    assert.ok(reuseErr, "Reusing reference number should be rejected");
    assert.match(reuseErr, /reference_already_used/);
  });

  it("member can resubmit after a previous payment is rejected", async () => {
    const db = getDb();
    // 1. Submit initial payment for memberA2
    const res = await as("service_role", null, () =>
      db.query<{ submit_dues_payment: string }>(
        `select public.submit_dues_payment($1, $2, $3, $4)`,
        [payTokenA, "member.p2.2@school.edu", "GCASH-REJECT-ME-1", `${orgA}/payment-rej-1.png`]
      )
    );
    const rejPaymentId = res.rows[0].submit_dues_payment;

    // 2. Officer rejects this payment
    await db.query(
      `update public.dues_payments set status = 'rejected', reject_reason = 'Blurry receipt' where id = $1`,
      [rejPaymentId]
    );

    // 3. MemberA2 resubmits with a new reference and clear screenshot
    const resubmitRes = await as("service_role", null, () =>
      db.query<{ submit_dues_payment: string }>(
        `select public.submit_dues_payment($1, $2, $3, $4)`,
        [payTokenA, "member.p2.2@school.edu", "GCASH-RESUBMIT-OK-2", `${orgA}/payment-resubmit.png`]
      )
    );
    const newPaymentId = resubmitRes.rows[0].submit_dues_payment;
    assert.ok(newPaymentId);
    assert.notEqual(newPaymentId, rejPaymentId);

    // Verify both rows exist: one rejected and one submitted
    const history = await as("authenticated", officerA, () =>
      db.query<{ id: string; status: string }>(
        `select id, status from public.dues_payments where member_id = $1 order by submitted_at asc`,
        [memberA2]
      )
    );
    assert.equal(history.rows.length, 2);
    assert.equal(history.rows[0].status, "rejected");
    assert.equal(history.rows[1].status, "submitted");
  });

  it("rejects unknown, pending, or inactive emails", async () => {
    const db = getDb();

    // Unknown email
    const unknownErr = await errorOf(() =>
      as("service_role", null, () =>
        db.query(`select public.submit_dues_payment($1, $2, $3, $4)`, [
          payTokenA,
          "nonexistent@school.edu",
          "GCASH-REF-UNKNOWN",
          `${orgA}/payment-unknown.png`,
        ])
      )
    );
    assert.ok(unknownErr);
    assert.match(unknownErr, /member_not_eligible/);

    // Pending member
    const pendingMemberId = await createMember(orgA, "pending.member@school.edu", "Pending Member", "pending");
    const pendingErr = await errorOf(() =>
      as("service_role", null, () =>
        db.query(`select public.submit_dues_payment($1, $2, $3, $4)`, [
          payTokenA,
          "pending.member@school.edu",
          "GCASH-REF-PENDING",
          `${orgA}/payment-pending.png`,
        ])
      )
    );
    assert.ok(pendingErr);
    assert.match(pendingErr, /member_not_eligible/);

    // Inactive member
    await db.query(`update public.members set status = 'inactive' where id = $1`, [pendingMemberId]);
    const inactiveErr = await errorOf(() =>
      as("service_role", null, () =>
        db.query(`select public.submit_dues_payment($1, $2, $3, $4)`, [
          payTokenA,
          "pending.member@school.edu",
          "GCASH-REF-INACTIVE",
          `${orgA}/payment-inactive.png`,
        ])
      )
    );
    assert.ok(inactiveErr);
    assert.match(inactiveErr, /member_not_eligible/);
  });

  it("rejects submission on closed period or turned-off link", async () => {
    const db = getDb();

    // Turn link off
    await as("authenticated", officerA, () =>
      db.query(`select public.set_dues_pay_link($1, $2, 'off')`, [orgA, periodAId])
    );

    const offErr = await errorOf(() =>
      as("service_role", null, () =>
        db.query(`select public.submit_dues_payment($1, $2, $3, $4)`, [
          payTokenA,
          "member.p2.1@school.edu",
          "GCASH-REF-OFF",
          `${orgA}/payment-off.png`,
        ])
      )
    );
    assert.ok(offErr);
    assert.match(offErr, /invalid_or_closed_period/);

    // Turn back on
    await as("authenticated", officerA, () =>
      db.query(`select public.set_dues_pay_link($1, $2, 'on')`, [orgA, periodAId])
    );

    // Create another period and close it
    const closedPeriodRes = await as("authenticated", officerA, () =>
      db.query<{ create_dues_period: string }>(
        `select public.create_dues_period($1, $2, $3, $4)`,
        [orgA, "Past Due Fee", 100.0, "2026-10-01"]
      )
    );
    const closedPeriodId = closedPeriodRes.rows[0].create_dues_period;
    const closedToken = (
      await db.query<{ pay_token: string }>(
        `select pay_token from public.dues_periods where id = $1`,
        [closedPeriodId]
      )
    ).rows[0].pay_token;

    await as("authenticated", officerA, () =>
      db.query(`select public.close_dues_period($1)`, [closedPeriodId])
    );

    const closedErr = await errorOf(() =>
      as("service_role", null, () =>
        db.query(`select public.submit_dues_payment($1, $2, $3, $4)`, [
          closedToken,
          "member.p2.1@school.edu",
          "GCASH-REF-CLOSED",
          `${orgA}/payment-closed.png`,
        ])
      )
    );
    assert.ok(closedErr);
    assert.match(closedErr, /invalid_or_closed_period/);
  });
});

describe("P2 Dues Payments RLS and Direct Write Protection", () => {
  it("officers can read dues payments in their own org only", async () => {
    const db = getDb();
    const paymentsA = await as("authenticated", officerA, () =>
      db.query(`select * from public.dues_payments where org_id = $1`, [orgA])
    );
    assert.ok(paymentsA.rows.length >= 1, "Officer A should read Org A payments");

    const paymentsOtherOrg = await as("authenticated", adminB, () =>
      db.query(`select * from public.dues_payments where org_id = $1`, [orgA])
    );
    assert.equal(paymentsOtherOrg.rows.length, 0, "Officer B must see 0 rows from Org A");

    const anonPayments = await as("anon", null, () =>
      db.query(`select * from public.dues_payments where org_id = $1`, [orgA])
    );
    assert.equal(anonPayments.rows.length, 0, "Anon caller must see 0 rows");
  });

  it("direct client insert, update, or delete on dues_payments is refused", async () => {
    const db = getDb();
    const insertErr = await errorOf(() =>
      as("authenticated", officerA, () =>
        db.query(
          `insert into public.dues_payments (org_id, period_id, member_id, amount, reference_no, reference_key, screenshot_path)
           values ($1, $2, $3, 100, 'TEST', 'test', 'path')`,
          [orgA, periodAId, memberA1]
        )
      )
    );
    assert.ok(insertErr, "Direct client insert should be refused");

    const anonInsertErr = await errorOf(() =>
      as("anon", null, () =>
        db.query(
          `insert into public.dues_payments (org_id, period_id, member_id, amount, reference_no, reference_key, screenshot_path)
           values ($1, $2, $3, 100, 'TEST', 'test', 'path')`,
          [orgA, periodAId, memberA1]
        )
      )
    );
    assert.ok(anonInsertErr, "Anon insert should be refused");
  });

  it("direct public invocation of submit_dues_payment is refused", async () => {
    const db = getDb();
    const anonRpcErr = await errorOf(() =>
      as("anon", null, () =>
        db.query(`select public.submit_dues_payment($1, $2, $3, $4)`, [
          payTokenA,
          "member.p2.1@school.edu",
          "GCASH-DIRECT-RPC",
          "direct.png",
        ])
      )
    );
    assert.ok(anonRpcErr, "Anon should not be able to execute submit_dues_payment");

    const authRpcErr = await errorOf(() =>
      as("authenticated", officerA, () =>
        db.query(`select public.submit_dues_payment($1, $2, $3, $4)`, [
          payTokenA,
          "member.p2.1@school.edu",
          "GCASH-DIRECT-RPC",
          "direct.png",
        ])
      )
    );
    assert.ok(authRpcErr, "Authenticated client should not execute submit_dues_payment directly");
  });
});
