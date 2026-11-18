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

let unpaidMember1: string;
let unpaidMember2: string;
let pendingMember: string;
let paidMember: string;
let inactiveMember: string;

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
  adminA = await addOfficer("admin.p5.a@school.edu", "Admin P5 A");
  orgA = await addOrg(adminA, "Dues P5 Org A");
  officerA = await addMember(orgA, "officer.p5.a@school.edu", "officer");

  // Setup Org B
  adminB = await addOfficer("admin.p5.b@school.edu", "Admin P5 B");
  orgB = await addOrg(adminB, "Dues P5 Org B");
  officerB = await addMember(orgB, "officer.p5.b@school.edu", "officer");

  // Create period in Org A
  const db = getDb();
  const periodRes = await as("authenticated", adminA, () =>
    db.query<{ create_dues_period: string }>(
      `select public.create_dues_period($1, $2, $3, $4)`,
      [orgA, "1st Sem Membership Dues", 250.0, "2026-12-15"]
    )
  );
  periodAId = periodRes.rows[0].create_dues_period;

  const tokenRes = await db.query<{ pay_token: string }>(
    `select pay_token from public.dues_periods where id = $1`,
    [periodAId]
  );
  payTokenA = tokenRes.rows[0].pay_token;

  // Setup members in Org A
  unpaidMember1 = await createMember(orgA, "unpaid1@school.edu", "Unpaid Alice");
  unpaidMember2 = await createMember(orgA, "unpaid2@school.edu", "Unpaid Bob");
  pendingMember = await createMember(orgA, "pending@school.edu", "Pending Charlie");
  paidMember = await createMember(orgA, "paid@school.edu", "Paid David");
  inactiveMember = await createMember(orgA, "inactive@school.edu", "Inactive Eve", "inactive");

  // Charlie submits payment (status = submitted/pending)
  await submitPayment(payTokenA, "pending@school.edu", "111122223333");

  // David submits payment and officer verifies it (status = verified/paid)
  const davidPaymentId = await submitPayment(payTokenA, "paid@school.edu", "444455556666");
  await as("authenticated", officerA, () =>
    db.query(`select public.verify_dues_payment($1)`, [davidPaymentId])
  );
});

describe("P5 Dues Reminders RLS and Cross-Org Isolation", () => {
  it("officers of Org A can read reminders in their own org", async () => {
    const db = getDb();
    // Insert a reminder via superuser fixture
    await db.query(
      `insert into public.dues_reminders (org_id, period_id, member_id, sent_by, status)
       values ($1, $2, $3, $4, 'sent')`,
      [orgA, periodAId, unpaidMember1, adminA]
    );

    const res = await as("authenticated", officerA, () =>
      db.query(`select count(*)::int as count from public.dues_reminders where org_id = $1`, [orgA])
    );
    assert.equal(res.rows[0].count, 1);
  });

  it("officers of Org B cannot read Org A reminders", async () => {
    const db = getDb();
    const res = await as("authenticated", officerB, () =>
      db.query(`select count(*)::int as count from public.dues_reminders where org_id = $1`, [orgA])
    );
    assert.equal(res.rows[0].count, 0);
  });

  it("anon cannot read any reminders", async () => {
    const db = getDb();
    const res = await as("anon", null, () =>
      db.query(`select count(*)::int as count from public.dues_reminders`)
    );
    assert.equal(res.rows[0].count, 0);
  });

  it("direct client mutation (insert/update/delete) is refused", async () => {
    const db = getDb();
    const insertErr = await errorOf(() =>
      as("authenticated", officerA, () =>
        db.query(
          `insert into public.dues_reminders (org_id, period_id, member_id, sent_by, status)
           values ($1, $2, $3, $4, 'sent')`,
          [orgA, periodAId, unpaidMember2, officerA]
        )
      )
    );
    assert.ok(insertErr?.includes("permission denied") || insertErr?.includes("violates"));
  });
});

describe("P5 get_dues_reminder_recipients Function", () => {
  it("refuses unauthenticated callers", async () => {
    const db = getDb();
    const err = await errorOf(() =>
      as("anon", null, () =>
        db.query(`select public.get_dues_reminder_recipients($1)`, [periodAId])
      )
    );
    assert.ok(err?.includes("permission denied") || err?.includes("not_authenticated"));
  });

  it("refuses officers from another organization", async () => {
    const db = getDb();
    const err = await errorOf(() =>
      as("authenticated", officerB, () =>
        db.query(`select public.get_dues_reminder_recipients($1)`, [periodAId])
      )
    );
    assert.ok(err?.includes("not_authorized"));
  });

  it("returns eligible unpaid members and excludes paid, pending, and inactive members", async () => {
    const db = getDb();
    // First clear any reminders from prior test
    await db.query(`delete from public.dues_reminders where org_id = $1`, [orgA]);

    const res = await as("authenticated", officerA, () =>
      db.query<{ get_dues_reminder_recipients: any }>(
        `select public.get_dues_reminder_recipients($1)`,
        [periodAId]
      )
    );
    const data = res.rows[0].get_dues_reminder_recipients;

    assert.equal(data.period.period_name, "1st Sem Membership Dues");
    assert.equal(data.period.is_closed, false);

    // Active members: unpaidMember1, unpaidMember2, pendingMember, paidMember = 4 active members
    assert.equal(data.counts.total_active_members, 4);
    assert.equal(data.counts.total_unpaid, 2);
    assert.equal(data.counts.eligible, 2);
    assert.equal(data.counts.skipped_24h, 0);
    assert.equal(data.counts.paid_or_pending, 2);

    const eligibleEmails = data.recipients
      .filter((r: any) => r.is_eligible)
      .map((r: any) => r.email);
    assert.ok(eligibleEmails.includes("unpaid1@school.edu"));
    assert.ok(eligibleEmails.includes("unpaid2@school.edu"));
    assert.ok(!eligibleEmails.includes("pending@school.edu"));
    assert.ok(!eligibleEmails.includes("paid@school.edu"));
    assert.ok(!eligibleEmails.includes("inactive@school.edu"));
  });

  it("enforces 24-hour cooldown: skips members emailed within 24h", async () => {
    const db = getDb();

    // Log a reminder sent to unpaidMember1 right now
    await as("authenticated", officerA, () =>
      db.query(
        `select public.log_dues_reminder($1, $2, 'sent')`,
        [periodAId, unpaidMember1]
      )
    );

    const res = await as("authenticated", officerA, () =>
      db.query<{ get_dues_reminder_recipients: any }>(
        `select public.get_dues_reminder_recipients($1)`,
        [periodAId]
      )
    );
    const data = res.rows[0].get_dues_reminder_recipients;

    assert.equal(data.counts.total_unpaid, 2);
    assert.equal(data.counts.eligible, 1); // unpaidMember2 is still eligible
    assert.equal(data.counts.skipped_24h, 1); // unpaidMember1 is on cooldown

    const unpaid1 = data.recipients.find((r: any) => r.email === "unpaid1@school.edu");
    assert.equal(unpaid1.is_eligible, false);
    assert.equal(unpaid1.skip_reason, "recently_reminded");

    const unpaid2 = data.recipients.find((r: any) => r.email === "unpaid2@school.edu");
    assert.equal(unpaid2.is_eligible, true);
    assert.equal(unpaid2.skip_reason, null);
  });

  it("allows re-reminding after 24 hours have elapsed", async () => {
    const db = getDb();

    // Set unpaidMember1 reminder sent_at to 25 hours ago as superuser
    await db.query(
      `update public.dues_reminders
          set sent_at = now() - interval '25 hours'
        where member_id = $1 and period_id = $2`,
      [unpaidMember1, periodAId]
    );

    const res = await as("authenticated", officerA, () =>
      db.query<{ get_dues_reminder_recipients: any }>(
        `select public.get_dues_reminder_recipients($1)`,
        [periodAId]
      )
    );
    const data = res.rows[0].get_dues_reminder_recipients;

    assert.equal(data.counts.eligible, 2);
    assert.equal(data.counts.skipped_24h, 0);

    const unpaid1 = data.recipients.find((r: any) => r.email === "unpaid1@school.edu");
    assert.equal(unpaid1.is_eligible, true);
  });
});

describe("P5 log_dues_reminder Function Validation", () => {
  it("rejects invalid reminder status", async () => {
    const db = getDb();
    const err = await errorOf(() =>
      as("authenticated", officerA, () =>
        db.query(
          `select public.log_dues_reminder($1, $2, 'invalid_status')`,
          [periodAId, unpaidMember1]
        )
      )
    );
    assert.ok(err?.includes("invalid_reminder_status"));
  });

  it("rejects member belonging to another org", async () => {
    const db = getDb();
    const memberInB = await createMember(orgB, "member.in.b@school.edu");
    const err = await errorOf(() =>
      as("authenticated", officerA, () =>
        db.query(
          `select public.log_dues_reminder($1, $2, 'sent')`,
          [periodAId, memberInB]
        )
      )
    );
    assert.ok(err?.includes("member_not_found"));
  });

  it("logs failed reminder with error message", async () => {
    const db = getDb();
    const res = await as("authenticated", officerA, () =>
      db.query<{ log_dues_reminder: string }>(
        `select public.log_dues_reminder($1, $2, 'failed', 'Mailbox full')`,
        [periodAId, unpaidMember2]
      )
    );
    const loggedId = res.rows[0].log_dues_reminder;
    assert.ok(loggedId);

    const check = await db.query<{ status: string; error_message: string }>(
      `select status, error_message from public.dues_reminders where id = $1`,
      [loggedId]
    );
    assert.equal(check.rows[0].status, "failed");
    assert.equal(check.rows[0].error_message, "Mailbox full");
  });
});
