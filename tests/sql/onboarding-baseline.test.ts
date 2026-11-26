import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { addOfficer, addOrg, getDb, startDb } from "./helpers.ts";

/**
 * Runs scripts/onboarding-baseline.sql against sample orgs whose answers are known,
 * so the activation rule in the file is checked, not just that it parses.
 *
 * All times are "N days ago" so each org's story is easy to read:
 *   activation = 3 different members checked in by QR at one event, within 14 days
 *   of the org being created.
 */

const SCRIPT = readFileSync(join(import.meta.dirname, "../../scripts/onboarding-baseline.sql"), "utf8");

interface PerOrg {
  org_id: string;
  active_members: number;
  events_created: number;
  activated: boolean;
  hours_to_activation: string | null;
  active_days_15_28: boolean | null;
  age_days: number;
}

const orgs: Record<string, string> = {};
let perOrg: Map<string, PerOrg>;
let cohorts: Record<string, unknown>[];

let seq = 0;

async function member(orgId: string, email: string, status = "active") {
  const r = await getDb().query<{ id: string }>(
    `insert into public.members (org_id, full_name, email, email_key, consent_version, consent_language, status)
     values ($1, $2, $3, $3, 'd4-2026-10-31', 'en', $4) returning id`,
    [orgId, `Member ${++seq}`, email, status]
  );
  return r.rows[0].id;
}

async function event(orgId: string, title: string, createdAgo: string) {
  const r = await getDb().query<{ id: string }>(
    `insert into public.events (org_id, title, starts_at, ends_at, created_at)
     values ($1, $2, now(), now() + interval '1 hour', now() - $3::interval) returning id`,
    [orgId, title, createdAgo]
  );
  return r.rows[0].id;
}

async function checkin(orgId: string, eventId: string, memberId: string, method: "qr" | "manual", ago: string) {
  await getDb().query(
    `insert into public.attendance (org_id, event_id, member_id, method, checked_in_at)
     values ($1, $2, $3, $4, now() - $5::interval)`,
    [orgId, eventId, memberId, method, ago]
  );
}

async function newOrg(key: string, createdAgo: string) {
  const admin = await addOfficer(`${key.toLowerCase()}.base@school.edu`);
  const id = await addOrg(admin, `Baseline ${key}`);
  await getDb().query(`update public.orgs set created_at = now() - $2::interval where id = $1`, [id, createdAgo]);
  orgs[key] = id;
  return id;
}

before(async () => {
  await startDb();

  // A: activated on day 5 (event 35 days ago, org 40 days old), and active again on day 15
  const a = await newOrg("A", "40 days");
  const evA = await event(a, "General meeting", "35 days");
  await event(a, "Second meeting", "25 days");
  for (const [i, ago] of ["35 days 3 hours", "35 days 2 hours", "35 days"].entries()) {
    await checkin(a, evA, await member(a, `a${i}@school.edu`), "qr", ago);
  }

  // B: three check-ins, but only one by QR: not activated. Nothing later.
  const b = await newOrg("B", "40 days");
  const evB = await event(b, "General meeting", "38 days");
  await checkin(b, evB, await member(b, "b0@school.edu"), "qr", "38 days");
  await checkin(b, evB, await member(b, "b1@school.edu"), "manual", "38 days");
  await checkin(b, evB, await member(b, "b2@school.edu"), "manual", "38 days");

  // C: three QR check-ins, but on day 20: too late to count, and it is activity in days 15 to 28
  const c = await newOrg("C", "40 days");
  const evC = await event(c, "Late meeting", "20 days");
  for (const i of [0, 1, 2]) {
    await checkin(c, evC, await member(c, `c${i}@school.edu`), "qr", "20 days");
  }

  // D: 3 days old with one pending member: too young to judge
  const d = await newOrg("D", "3 days");
  await member(d, "d0@school.edu", "pending");

  // E: sample data from the seed script: must not count
  const e = await newOrg("E", "40 days");
  const evE = await event(e, "Sample · General meeting", "39 days");
  for (const i of [0, 1, 2]) {
    await checkin(e, evE, await member(e, `e${i}@seed.orgkit.test`), "qr", "39 days");
  }

  // F: only two QR check-ins
  const f = await newOrg("F", "40 days");
  const evF = await event(f, "Small meeting", "38 days");
  for (const i of [0, 1]) {
    await checkin(f, evF, await member(f, `f${i}@school.edu`), "qr", "38 days");
  }

  // The per-org rows: everything above the second select, then read the temp table
  const db = getDb();
  await db.exec(SCRIPT.slice(0, SCRIPT.indexOf("-- 1. Per org")));
  const per = await db.query<PerOrg>(`select * from onboarding_orgs`);
  perOrg = new Map(per.rows.map((r) => [r.org_id, r]));

  // The whole file: its last statement is the cohort table
  const results = await db.exec(SCRIPT);
  cohorts = results[results.length - 1].rows as Record<string, unknown>[];
});

const row = (key: string) => {
  const r = perOrg.get(orgs[key]);
  assert.ok(r, `org ${key} should be in the report`);
  return r;
};

describe("onboarding baseline: activation", () => {
  it("counts an org with 3 different QR check-ins within 14 days, and times it", () => {
    const r = row("A");
    assert.equal(r.activated, true);
    // The 3rd member checked in on day 5: 120 hours after the org was created
    assert.ok(Math.abs(Number(r.hours_to_activation) - 120) < 0.5, `got ${r.hours_to_activation}`);
  });

  it("does not count manual check-ins", () => {
    assert.equal(row("B").activated, false);
  });

  it("does not count a third check-in after day 14", () => {
    assert.equal(row("C").activated, false);
  });

  it("does not count fewer than 3 members", () => {
    assert.equal(row("F").activated, false);
  });

  it("leaves out seeded sample data", () => {
    const r = row("E");
    assert.equal(r.activated, false);
    assert.equal(r.events_created, 0);
    assert.equal(r.active_members, 0);
  });
});

describe("onboarding baseline: later activity", () => {
  it("sees activity in days 15 to 28", () => {
    assert.equal(row("A").active_days_15_28, true);
    assert.equal(row("C").active_days_15_28, true);
  });

  it("sees no activity when there was none", () => {
    assert.equal(row("B").active_days_15_28, false);
  });

  it("says 'not yet' (null), not 'no', for an org younger than 28 days", () => {
    const r = row("D");
    assert.equal(r.age_days, 3);
    assert.equal(r.active_days_15_28, null);
  });
});

describe("onboarding baseline: cohort table", () => {
  it("rolls the 40-day-old orgs into one weekly cohort with the right rate", () => {
    const old = cohorts.find((c) => Number(c.orgs) === 5);
    assert.ok(old, "five orgs were created 40 days ago (A, B, C, E, F)");
    assert.equal(Number(old.activated), 1);
    assert.equal(Number(old.old_enough), 5);
    assert.equal(Number(old.activation_rate_pct), 20);
    assert.equal(Number(old.activated_and_still_active), 1);
    assert.equal(Number(old.not_activated_but_active), 1);
    assert.equal(Number(old.measurable_for_retention), 5);
  });

  it("gives a young org a null rate instead of dividing by zero", () => {
    const young = cohorts.find((c) => Number(c.orgs) === 1);
    assert.ok(young);
    assert.equal(young.activation_rate_pct, null);
    assert.equal(Number(young.old_enough), 0);
    assert.equal(Number(young.measurable_for_retention), 0);
  });
});

describe("onboarding baseline: safety", () => {
  it("returns no personal data columns", () => {
    // The script reads email only to leave sample rows out, never to return it
    const columns = Object.keys(row("A"));
    assert.ok(!columns.includes("email"));
    assert.ok(!columns.some((c) => c.includes("full_name")));
  });
});
