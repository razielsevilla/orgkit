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

before(async () => {
  await startDb();

  // Setup Org A
  adminA = await addOfficer("admin.p4.a@school.edu", "Admin P4 A");
  orgA = await addOrg(adminA, "Dues P4 Org A");
  officerA = await addMember(orgA, "officer.p4.a@school.edu", "officer");

  // Setup Org B
  adminB = await addOfficer("admin.p4.b@school.edu", "Admin P4 B");
  orgB = await addOrg(adminB, "Dues P4 Org B");
  officerB = await addMember(orgB, "officer.p4.b@school.edu", "officer");

  // Create period in Org A
  const db = getDb();
  const periodRes = await as("authenticated", adminA, () =>
    db.query<{ create_dues_period: string }>(
      `select public.create_dues_period($1, $2, $3, $4)`,
      [orgA, "1st Sem Membership Dues", 250.0, "2026-12-15"]
    )
  );
  periodAId = periodRes.rows[0].create_dues_period;

  // Retrieve payToken
  const payLinkRes = await as("authenticated", adminA, () =>
    db.query<{ pay_token: string }>(
      `select pay_token from public.get_dues_period_pay_link($1, $2)`,
      [orgA, periodAId]
    )
  );
  payTokenA = payLinkRes.rows[0].pay_token;
});

describe("P4 Dues Dashboard RLS and Cross-Org Isolation", () => {
  it("officers of Org A can view their period dashboard", async () => {
    const db = getDb();
    const res = await as("authenticated", officerA, () =>
      db.query<{ get_dues_period_dashboard: any }>(
        `select public.get_dues_period_dashboard($1)`,
        [periodAId]
      )
    );
    const data = res.rows[0].get_dues_period_dashboard;
    assert.ok(data);
    assert.equal(data.period.id, periodAId);
    assert.equal(data.period.name, "1st Sem Membership Dues");
    assert.equal(parseFloat(data.period.amount), 250.0);
  });

  it("officers of Org B are refused access to Org A period dashboard", async () => {
    const db = getDb();
    const err = await errorOf(() =>
      as("authenticated", officerB, () =>
        db.query(`select public.get_dues_period_dashboard($1)`, [periodAId])
      )
    );
    assert.ok(err);
    assert.match(err, /not_authorized/);
  });

  it("anon caller is refused access with permission error", async () => {
    const db = getDb();
    const err = await errorOf(() =>
      as("anon", null, () =>
        db.query(`select public.get_dues_period_dashboard($1)`, [periodAId])
      )
    );
    assert.ok(err);
    assert.match(err, /permission denied/i);
  });

  it("unauthenticated session raises not_authenticated", async () => {
    const db = getDb();
    const err = await errorOf(() =>
      as("authenticated", null, () =>
        db.query(`select public.get_dues_period_dashboard($1)`, [periodAId])
      )
    );
    assert.ok(err);
    assert.match(err, /not_authenticated/);
  });

  it("raises period_not_found for non-existent period", async () => {
    const db = getDb();
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const err = await errorOf(() =>
      as("authenticated", adminA, () =>
        db.query(`select public.get_dues_period_dashboard($1)`, [fakeId])
      )
    );
    assert.ok(err);
    assert.match(err, /period_not_found/);
  });
});

describe("P4 Dues Dashboard Aggregations and Edge Cases", () => {
  it("Scenario 1 & 2: period with mixed Paid, Pending, Rejected and Unpaid members", async () => {
    const db = getDb();

    // 4 active members:
    // M1: Paid (submitted + verified)
    const m1Id = await createMember(orgA, "m1.dash@school.edu", "Alice Paid", "active");
    const p1Id = await submitPayment(payTokenA, "m1.dash@school.edu", "REF-ALICE-101");
    await as("authenticated", adminA, () =>
      db.query(`select public.verify_dues_payment($1)`, [p1Id])
    );

    // M2: Pending (submitted)
    const m2Id = await createMember(orgA, "m2.dash@school.edu", "Bob Pending", "active");
    await submitPayment(payTokenA, "m2.dash@school.edu", "REF-BOB-102");

    // M3: Rejected (submitted + rejected, no resubmission)
    const m3Id = await createMember(orgA, "m3.dash@school.edu", "Charlie Rejected", "active");
    const p3Id = await submitPayment(payTokenA, "m3.dash@school.edu", "REF-CHARLIE-103");
    await as("authenticated", adminA, () =>
      db.query(`select public.reject_dues_payment($1, $2)`, [p3Id, "Blurred screenshot"])
    );

    // M4: Unpaid (active, no payment submitted)
    const m4Id = await createMember(orgA, "m4.dash@school.edu", "Diana Unpaid", "active");

    const res = await as("authenticated", officerA, () =>
      db.query<{ get_dues_period_dashboard: any }>(
        `select public.get_dues_period_dashboard($1)`,
        [periodAId]
      )
    );
    const data = res.rows[0].get_dues_period_dashboard;

    // Verify summary metrics
    assert.equal(data.summary.active_member_count, 4);
    assert.equal(data.summary.paid_count, 1);
    assert.equal(data.summary.pending_count, 1);
    assert.equal(data.summary.rejected_count, 1);
    assert.equal(data.summary.unpaid_count, 1);

    // Amounts: 1 paid = 250.00 collected; 4 active * 250 = 1000.00 expected; 3 owe = 750.00 outstanding
    assert.equal(parseFloat(data.summary.collected_amount), 250.0);
    assert.equal(parseFloat(data.summary.expected_amount), 1000.0);
    assert.equal(parseFloat(data.summary.outstanding_amount), 750.0);

    // Verify members list
    assert.equal(data.members.length, 4);
    const alice = data.members.find((m: any) => m.member_id === m1Id);
    assert.equal(alice.dues_status, "paid");
    assert.equal(alice.reference_no, "REF-ALICE-101");
    assert.equal(alice.payment_status, "verified");

    const bob = data.members.find((m: any) => m.member_id === m2Id);
    assert.equal(bob.dues_status, "pending");
    assert.equal(bob.reference_no, "REF-BOB-102");
    assert.equal(bob.payment_status, "submitted");

    const charlie = data.members.find((m: any) => m.member_id === m3Id);
    assert.equal(charlie.dues_status, "rejected");
    assert.equal(charlie.reference_no, "REF-CHARLIE-103");
    assert.equal(charlie.reject_reason, "Blurred screenshot");
    assert.equal(charlie.payment_status, "rejected");

    const diana = data.members.find((m: any) => m.member_id === m4Id);
    assert.equal(diana.dues_status, "unpaid");
    assert.equal(diana.reference_no, null);
    assert.equal(diana.payment_status, null);
  });

  it("Scenario 3: member joined mid-period, deactivated after paying, deactivated before paying", async () => {
    const db = getDb();

    // Member 5 joined mid-period (status='active')
    const m5Id = await createMember(orgA, "m5.midjoin@school.edu", "Evan MidJoin", "active");

    // Member 6: deactivated after paying (paid, then deactivated)
    const m6Id = await createMember(orgA, "m6.deactpayer@school.edu", "Fiona DeactPayer", "active");
    const p6Id = await submitPayment(payTokenA, "m6.deactpayer@school.edu", "REF-FIONA-106");
    await as("authenticated", adminA, () =>
      db.query(`select public.verify_dues_payment($1)`, [p6Id])
    );
    // Deactivate Member 6
    await db.query(`update public.members set status = 'inactive' where id = $1`, [m6Id]);

    // Member 7: deactivated before paying (inactive, no payment)
    const m7Id = await createMember(orgA, "m7.deactnonpayer@school.edu", "George DeactNonPayer", "inactive");

    const res = await as("authenticated", officerA, () =>
      db.query<{ get_dues_period_dashboard: any }>(
        `select public.get_dues_period_dashboard($1)`,
        [periodAId]
      )
    );
    const data = res.rows[0].get_dues_period_dashboard;

    // Active members: Alice(1), Bob(2), Charlie(3), Diana(4), Evan(5) = 5 active members
    assert.equal(data.summary.active_member_count, 5);
    // Expected total: 5 active * 250 = 1250.00
    assert.equal(parseFloat(data.summary.expected_amount), 1250.0);
    // Collected total: Alice(250) + Fiona(250) = 500.00 (deactivated payer money stays in collected)
    assert.equal(parseFloat(data.summary.collected_amount), 500.0);

    // Evan MidJoin is in members list with dues_status = 'unpaid'
    const evan = data.members.find((m: any) => m.member_id === m5Id);
    assert.ok(evan, "Mid-period joiner should be included");
    assert.equal(evan.dues_status, "unpaid");

    // Fiona is in members list with member_status = 'inactive' and dues_status = 'paid'
    const fiona = data.members.find((m: any) => m.member_id === m6Id);
    assert.ok(fiona, "Deactivated payer should be listed");
    assert.equal(fiona.member_status, "inactive");
    assert.equal(fiona.dues_status, "paid");

    // George is NOT in members list ("the other isn't counted")
    const george = data.members.find((m: any) => m.member_id === m7Id);
    assert.equal(george, undefined, "Deactivated non-payer should not be counted or listed");
  });

  it("Scenario 4: rejected payment with no resubmission, then a resubmission that is verified", async () => {
    const db = getDb();
    // Test member
    const m8Id = await createMember(orgA, "m8.resub@school.edu", "Hannah Resub", "active");
    const p8FirstId = await submitPayment(payTokenA, "m8.resub@school.edu", "REF-HANNAH-FIRST");
    await as("authenticated", adminA, () =>
      db.query(`select public.reject_dues_payment($1, $2)`, [p8FirstId, "Wrong amount"])
    );

    // First check: counts as rejected
    let res = await as("authenticated", officerA, () =>
      db.query<{ get_dues_period_dashboard: any }>(
        `select public.get_dues_period_dashboard($1)`,
        [periodAId]
      )
    );
    let hannah = res.rows[0].get_dues_period_dashboard.members.find((m: any) => m.member_id === m8Id);
    assert.equal(hannah.dues_status, "rejected");

    // Resubmit payment
    const p8SecondId = await submitPayment(payTokenA, "m8.resub@school.edu", "REF-HANNAH-SECOND");

    // After resubmission: becomes pending review
    res = await as("authenticated", officerA, () =>
      db.query<{ get_dues_period_dashboard: any }>(
        `select public.get_dues_period_dashboard($1)`,
        [periodAId]
      )
    );
    hannah = res.rows[0].get_dues_period_dashboard.members.find((m: any) => m.member_id === m8Id);
    assert.equal(hannah.dues_status, "pending");
    assert.equal(hannah.reference_no, "REF-HANNAH-SECOND");

    // Verify the resubmission
    await as("authenticated", adminA, () =>
      db.query(`select public.verify_dues_payment($1)`, [p8SecondId])
    );

    // After verification: becomes paid
    res = await as("authenticated", officerA, () =>
      db.query<{ get_dues_period_dashboard: any }>(
        `select public.get_dues_period_dashboard($1)`,
        [periodAId]
      )
    );
    hannah = res.rows[0].get_dues_period_dashboard.members.find((m: any) => m.member_id === m8Id);
    assert.equal(hannah.dues_status, "paid");
    assert.equal(hannah.reference_no, "REF-HANNAH-SECOND");
    assert.equal(hannah.payment_status, "verified");
  });

  it("Scenario 5: filter tabs and search by name and email", async () => {
    const db = getDb();

    // Filter by status = 'paid'
    let res = await as("authenticated", officerA, () =>
      db.query<{ get_dues_period_dashboard: any }>(
        `select public.get_dues_period_dashboard($1, null, 'paid')`,
        [periodAId]
      )
    );
    let data = res.rows[0].get_dues_period_dashboard;
    assert.ok(data.members.length > 0);
    assert.ok(data.members.every((m: any) => m.dues_status === "paid"));
    assert.equal(data.pagination.total_matching, data.members.length);

    // Filter by status = 'unpaid'
    res = await as("authenticated", officerA, () =>
      db.query<{ get_dues_period_dashboard: any }>(
        `select public.get_dues_period_dashboard($1, null, 'unpaid')`,
        [periodAId]
      )
    );
    data = res.rows[0].get_dues_period_dashboard;
    assert.ok(data.members.length > 0);
    assert.ok(data.members.every((m: any) => m.dues_status === "unpaid"));

    // Search by name "Alice"
    res = await as("authenticated", officerA, () =>
      db.query<{ get_dues_period_dashboard: any }>(
        `select public.get_dues_period_dashboard($1, 'Alice')`,
        [periodAId]
      )
    );
    data = res.rows[0].get_dues_period_dashboard;
    assert.equal(data.members.length, 1);
    assert.equal(data.members[0].full_name, "Alice Paid");
    // Summary metrics still show total counts for the period, not restricted by search!
    assert.ok(data.summary.total_member_count > 1);

    // Search by email "m2.dash@school.edu"
    res = await as("authenticated", officerA, () =>
      db.query<{ get_dues_period_dashboard: any }>(
        `select public.get_dues_period_dashboard($1, 'm2.dash@school.edu')`,
        [periodAId]
      )
    );
    data = res.rows[0].get_dues_period_dashboard;
    assert.equal(data.members.length, 1);
    assert.equal(data.members[0].email, "m2.dash@school.edu");
  });

  it("Scenario 6: pagination with page_size and page", async () => {
    const db = getDb();
    // Query page 1 with page_size = 2
    const resPage1 = await as("authenticated", officerA, () =>
      db.query<{ get_dues_period_dashboard: any }>(
        `select public.get_dues_period_dashboard($1, null, null, 1, 2)`,
        [periodAId]
      )
    );
    const data1 = resPage1.rows[0].get_dues_period_dashboard;
    assert.equal(data1.members.length, 2);
    assert.equal(data1.pagination.page, 1);
    assert.equal(data1.pagination.page_size, 2);
    assert.ok(data1.pagination.total_matching > 2);
    assert.ok(data1.pagination.total_pages >= 2);

    // Query page 2 with page_size = 2
    const resPage2 = await as("authenticated", officerA, () =>
      db.query<{ get_dues_period_dashboard: any }>(
        `select public.get_dues_period_dashboard($1, null, null, 2, 2)`,
        [periodAId]
      )
    );
    const data2 = resPage2.rows[0].get_dues_period_dashboard;
    assert.equal(data2.members.length, 2);
    assert.equal(data2.pagination.page, 2);
    // Page 1 and Page 2 members must not overlap
    const idsPage1 = new Set(data1.members.map((m: any) => m.member_id));
    for (const m of data2.members) {
      assert.equal(idsPage1.has(m.member_id), false);
    }
  });

  it("Scenario 8: period with no payments and org with no active members", async () => {
    const db = getDb();
    // Org B currently has no dues period and no active members (officerB is officer, no members created)
    const periodBRes = await as("authenticated", adminB, () =>
      db.query<{ create_dues_period: string }>(
        `select public.create_dues_period($1, $2, $3, $4)`,
        [orgB, "Empty Org Period", 100.0, "2026-12-31"]
      )
    );
    const periodBId = periodBRes.rows[0].create_dues_period;

    const res = await as("authenticated", adminB, () =>
      db.query<{ get_dues_period_dashboard: any }>(
        `select public.get_dues_period_dashboard($1)`,
        [periodBId]
      )
    );
    const data = res.rows[0].get_dues_period_dashboard;
    assert.ok(data);
    assert.equal(parseFloat(data.summary.collected_amount), 0.0);
    assert.equal(parseFloat(data.summary.expected_amount), 0.0);
    assert.equal(parseFloat(data.summary.outstanding_amount), 0.0);
    assert.equal(data.summary.paid_count, 0);
    assert.equal(data.summary.pending_count, 0);
    assert.equal(data.summary.rejected_count, 0);
    assert.equal(data.summary.unpaid_count, 0);
    assert.equal(data.summary.active_member_count, 0);
    assert.equal(data.summary.total_member_count, 0);
    assert.equal(data.members.length, 0);
    assert.equal(data.pagination.total_matching, 0);
    assert.equal(data.pagination.total_pages, 0);
  });
});
