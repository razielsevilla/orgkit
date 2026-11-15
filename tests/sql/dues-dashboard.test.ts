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
