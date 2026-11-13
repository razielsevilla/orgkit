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

before(async () => {
  await startDb();

  adminA = await addOfficer("admin.dues.a@school.edu", "Admin Dues A");
  orgA = await addOrg(adminA, "Dues Org A");
  officerA = await addMember(orgA, "officer.dues.a@school.edu", "officer");

  adminB = await addOfficer("admin.dues.b@school.edu", "Admin Dues B");
  orgB = await addOrg(adminB, "Dues Org B");
});

describe("dues_periods RLS and table isolation", () => {
  it("officers can create an open period for their org", async () => {
    const db = getDb();
    const res = await as("authenticated", officerA, () =>
      db.query<{ create_dues_period: string }>(
        `select public.create_dues_period($1, $2, $3, $4)`,
        [orgA, "1st Sem Membership Dues", 250.0, "2026-12-15"]
      )
    );
    const periodId = res.rows[0].create_dues_period;
    assert.ok(periodId, "Period ID should be returned");

    // Read back as officerA
    const readRes = await as("authenticated", officerA, () =>
      db.query<{ id: string; name: string; amount: string; status: string; due_on: string }>(
        `select id, name, amount, status, due_on from public.dues_periods where id = $1`,
        [periodId]
      )
    );
    assert.equal(readRes.rows.length, 1);
    assert.equal(readRes.rows[0].name, "1st Sem Membership Dues");
    assert.equal(parseFloat(readRes.rows[0].amount), 250.0);
    assert.equal(readRes.rows[0].status, "open");
  });

  it("anon and officers of other orgs cannot read dues periods", async () => {
    const db = getDb();
    // Create a period in Org A
    const res = await as("authenticated", adminA, () =>
      db.query<{ create_dues_period: string }>(
        `select public.create_dues_period($1, $2, $3, $4)`,
        [orgA, "Secret Dues Org A", 500.0, "2026-11-30"]
      )
    );
    const periodId = res.rows[0].create_dues_period;

    // Anon read
    const anonRes = await as("anon", null, () =>
      db.query(`select * from public.dues_periods where id = $1`, [periodId])
    );
    assert.equal(anonRes.rows.length, 0, "Anon should see 0 rows");

    // Officer from Org B read
    const orgBRes = await as("authenticated", adminB, () =>
      db.query(`select * from public.dues_periods where id = $1`, [periodId])
    );
    assert.equal(orgBRes.rows.length, 0, "Officer of Org B should see 0 rows");

    // Create a period in Org B and verify officer of Org A cannot read it
    const resB = await as("authenticated", adminB, () =>
      db.query<{ create_dues_period: string }>(
        `select public.create_dues_period($1, $2, $3, $4)`,
        [orgB, "Dues Org B", 350.0, "2026-12-31"]
      )
    );
    const periodBId = resB.rows[0].create_dues_period;

    const orgAReadBRes = await as("authenticated", officerA, () =>
      db.query(`select * from public.dues_periods where id = $1`, [periodBId])
    );
    assert.equal(orgAReadBRes.rows.length, 0, "Officer of Org A should see 0 rows from Org B");
  });

  it("direct insert, update, or delete via client table access is refused", async () => {
    const db = getDb();
    const errInsert = await errorOf(() =>
      as("authenticated", officerA, () =>
        db.query(
          `insert into public.dues_periods (org_id, name, amount, due_on) values ($1, 'Direct Insert', 100, '2026-12-01')`,
          [orgA]
        )
      )
    );
    assert.ok(errInsert, "Direct insert should be refused");

    const errAnonInsert = await errorOf(() =>
      as("anon", null, () =>
        db.query(
          `insert into public.dues_periods (org_id, name, amount, due_on) values ($1, 'Anon Insert', 100, '2026-12-01')`,
          [orgA]
        )
      )
    );
    assert.ok(errAnonInsert, "Anon insert should be refused");
  });
});

describe("create_dues_period validation", () => {
  it("rejects caller outside the org or unauthenticated", async () => {
    const db = getDb();
    const unauthErr = await errorOf(() =>
      as("anon", null, () =>
        db.query(`select public.create_dues_period($1, $2, $3, $4)`, [
          orgA,
          "Valid Name",
          100.0,
          "2026-12-01",
        ])
      )
    );
    assert.ok(unauthErr);

    const otherOrgErr = await errorOf(() =>
      as("authenticated", adminB, () =>
        db.query(`select public.create_dues_period($1, $2, $3, $4)`, [
          orgA,
          "Valid Name",
          100.0,
          "2026-12-01",
        ])
      )
    );
    assert.ok(otherOrgErr);
  });

  it("rejects invalid name length (less than 2 or more than 100 chars)", async () => {
    const db = getDb();
    const tooShort = await errorOf(() =>
      as("authenticated", officerA, () =>
        db.query(`select public.create_dues_period($1, $2, $3, $4)`, [orgA, "A", 100.0, "2026-12-01"])
      )
    );
    assert.ok(tooShort, "Single character name should be rejected");

    const empty = await errorOf(() =>
      as("authenticated", officerA, () =>
        db.query(`select public.create_dues_period($1, $2, $3, $4)`, [orgA, "   ", 100.0, "2026-12-01"])
      )
    );
    assert.ok(empty, "Whitespace name should be rejected");

    const tooLong = await errorOf(() =>
      as("authenticated", officerA, () =>
        db.query(`select public.create_dues_period($1, $2, $3, $4)`, [
          orgA,
          "X".repeat(101),
          100.0,
          "2026-12-01",
        ])
      )
    );
    assert.ok(tooLong, "Name over 100 characters should be rejected");
  });

  it("rejects invalid amount (0, negative, > 100,000, or more than 2 decimal places)", async () => {
    const db = getDb();
    const zero = await errorOf(() =>
      as("authenticated", officerA, () =>
        db.query(`select public.create_dues_period($1, $2, $3, $4)`, [orgA, "Zero Dues", 0, "2026-12-01"])
      )
    );
    assert.ok(zero, "Amount of 0 should be rejected");

    const negative = await errorOf(() =>
      as("authenticated", officerA, () =>
        db.query(`select public.create_dues_period($1, $2, $3, $4)`, [
          orgA,
          "Negative Dues",
          -50.0,
          "2026-12-01",
        ])
      )
    );
    assert.ok(negative, "Negative amount should be rejected");

    const overCap = await errorOf(() =>
      as("authenticated", officerA, () =>
        db.query(`select public.create_dues_period($1, $2, $3, $4)`, [
          orgA,
          "Too High Dues",
          100000.01,
          "2026-12-01",
        ])
      )
    );
    assert.ok(overCap, "Amount above 100,000 should be rejected");

    const threeDecimals = await errorOf(() =>
      as("authenticated", officerA, () =>
        db.query(`select public.create_dues_period($1, $2, $3, $4)`, [
          orgA,
          "Three Decimals",
          25.125,
          "2026-12-01",
        ])
      )
    );
    assert.ok(threeDecimals, "Amount with 3 decimal places should be rejected");
  });

  it("rejects null due date", async () => {
    const db = getDb();
    const nullDate = await errorOf(() =>
      as("authenticated", officerA, () =>
        db.query(`select public.create_dues_period($1, $2, $3, $4)`, [orgA, "Valid Name", 100.0, null])
      )
    );
    assert.ok(nullDate, "Null due date should be rejected");
  });
});

describe("update_dues_period and close_dues_period lifecycle", () => {
  it("edits name, amount, and due date of an open period", async () => {
    const db = getDb();
    const createRes = await as("authenticated", officerA, () =>
      db.query<{ create_dues_period: string }>(
        `select public.create_dues_period($1, $2, $3, $4)`,
        [orgA, "Original Name", 100.0, "2026-12-01"]
      )
    );
    const periodId = createRes.rows[0].create_dues_period;

    const updateRes = await as("authenticated", officerA, () =>
      db.query<{ update_dues_period: string }>(
        `select public.update_dues_period($1, $2, $3, $4)`,
        [periodId, "Updated Period Name", 150.5, "2026-12-10"]
      )
    );
    assert.equal(updateRes.rows[0].update_dues_period, "ok");

    const check = await as("authenticated", officerA, () =>
      db.query<{ name: string; amount: string; due_on: string }>(
        `select name, amount, due_on from public.dues_periods where id = $1`,
        [periodId]
      )
    );
    assert.equal(check.rows[0].name, "Updated Period Name");
    assert.equal(parseFloat(check.rows[0].amount), 150.5);
  });

  it("closes an open period, and re-closing is harmless/idempotent", async () => {
    const db = getDb();
    const createRes = await as("authenticated", officerA, () =>
      db.query<{ create_dues_period: string }>(
        `select public.create_dues_period($1, $2, $3, $4)`,
        [orgA, "Period To Close", 80.0, "2026-12-20"]
      )
    );
    const periodId = createRes.rows[0].create_dues_period;

    // First close
    const close1 = await as("authenticated", officerA, () =>
      db.query<{ close_dues_period: string }>(`select public.close_dues_period($1)`, [periodId])
    );
    assert.equal(close1.rows[0].close_dues_period, "ok");

    const status1 = await as("authenticated", officerA, () =>
      db.query<{ status: string }>(`select status from public.dues_periods where id = $1`, [periodId])
    );
    assert.equal(status1.rows[0].status, "closed");

    // Second close (idempotent)
    const close2 = await as("authenticated", officerA, () =>
      db.query<{ close_dues_period: string }>(`select public.close_dues_period($1)`, [periodId])
    );
    assert.equal(close2.rows[0].close_dues_period, "ok");
  });

  it("refuses to edit a closed period", async () => {
    const db = getDb();
    const createRes = await as("authenticated", officerA, () =>
      db.query<{ create_dues_period: string }>(
        `select public.create_dues_period($1, $2, $3, $4)`,
        [orgA, "Close Before Edit", 80.0, "2026-12-20"]
      )
    );
    const periodId = createRes.rows[0].create_dues_period;

    await as("authenticated", officerA, () =>
      db.query(`select public.close_dues_period($1)`, [periodId])
    );

    const editErr = await errorOf(() =>
      as("authenticated", officerA, () =>
        db.query(`select public.update_dues_period($1, $2, $3, $4)`, [
          periodId,
          "New Name",
          90.0,
          "2026-12-25",
        ])
      )
    );
    assert.ok(editErr, "Editing a closed period should be rejected");
  });

  it("payment immutability: changing dues period amount does not change existing recorded payment amount", async () => {
    const db = getDb();
    // Simulate a payment tracking table referencing dues_periods
    await db.exec(`
      create table if not exists public.test_dues_payments (
        id uuid primary key default gen_random_uuid(),
        period_id uuid not null references public.dues_periods(id),
        recorded_amount numeric(10,2) not null
      );
    `);

    const createRes = await as("authenticated", officerA, () =>
      db.query<{ create_dues_period: string }>(
        `select public.create_dues_period($1, $2, $3, $4)`,
        [orgA, "Initial Dues 200", 200.0, "2026-12-31"]
      )
    );
    const periodId = createRes.rows[0].create_dues_period;

    // Record a payment with the original amount (₱200)
    await db.query(
      `insert into public.test_dues_payments (period_id, recorded_amount) values ($1, 200.00)`,
      [periodId]
    );

    // Later, the officer updates the dues period amount to ₱300
    await as("authenticated", officerA, () =>
      db.query(`select public.update_dues_period($1, $2, $3, $4)`, [
        periodId,
        "Initial Dues 200 - Adjusted",
        300.0,
        "2026-12-31",
      ])
    );

    // Verify existing payment still has 200.00
    const payment = await db.query<{ recorded_amount: string }>(
      `select recorded_amount from public.test_dues_payments where period_id = $1`,
      [periodId]
    );
    assert.equal(parseFloat(payment.rows[0].recorded_amount), 200.0);
  });
});
