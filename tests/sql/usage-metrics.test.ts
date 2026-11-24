import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { as, addOfficer, addOrg, errorOf, getDb, startDb } from "./helpers.ts";

// T3: weekly usage metrics. The scheduled job (service role) writes one
// snapshot per completed week; only a platform owner may read the report.

const DAY = 24 * 60 * 60 * 1000;

let ownerId: string;
let adminA: string;
let officerA2: string;
let adminB: string;
let adminC: string;
let plainOfficer: string;
let orgA: string;
let orgB: string;
let orgC: string;
let weeks: { w1: string; w2: string; w3: string; w4: string; current: string };

const asServer = <T>(fn: () => Promise<T>) => as("service_role", null, fn);
const runReport = () => asServer(() => getDb().query(`select public.run_weekly_usage_report()`));

const iso = (weekStart: string, offsetMs: number) =>
  new Date(new Date(`${weekStart}T00:00:00Z`).getTime() + offsetMs).toISOString();

async function insertEvent(org: string, by: string, title: string, createdAt: string): Promise<string> {
  const res = await getDb().query<{ id: string }>(
    `insert into public.events (org_id, title, starts_at, ends_at, created_by, created_at)
     values ($1, $2, '2030-01-01T10:00:00Z', '2030-01-01T12:00:00Z', $3, $4) returning id`,
    [org, title, by, createdAt]
  );
  return res.rows[0].id;
}

async function insertMember(org: string, email: string): Promise<string> {
  const res = await getDb().query<{ id: string }>(
    `insert into public.members (org_id, full_name, email, email_key, consent_version, consent_language, status, created_at)
     values ($1, 'Test Member', $2, lower($2), 'v1', 'en', 'active', now()) returning id`,
    [org, email]
  );
  return res.rows[0].id;
}

async function insertPeriod(org: string): Promise<string> {
  const res = await getDb().query<{ id: string }>(
    `insert into public.dues_periods (org_id, name, amount, due_on, created_by)
     values ($1, 'Sem dues', 100, '2030-01-01', null) returning id`,
    [org]
  );
  return res.rows[0].id;
}

interface Row {
  week_start: string;
  status: string;
  orgs_total: number | null;
  orgs_active: number | null;
  orgs_inactive: number | null;
  events_created: number | null;
  check_ins: number | null;
  active_officers: number | null;
  attempts: number | null;
}

const snapshot = async (week: string) =>
  (
    await getDb().query<Row>(
      `select week_start::text as week_start, 'ready' as status, orgs_total, orgs_active, orgs_inactive,
              events_created, check_ins, active_officers, null::int as attempts
         from public.usage_weekly where week_start = $1`,
      [week]
    )
  ).rows[0];

const runRow = async (week: string) =>
  (
    await getDb().query<{
      status: string;
      attempts: number;
      error_message: string | null;
      next_retry_at: string | null;
    }>(
      `select status, attempts, error_message, next_retry_at::text from public.usage_report_runs where week_start = $1`,
      [week]
    )
  ).rows[0];

before(async () => {
  const db = await startDb();

  ownerId = await addOfficer("owner.t3@school.edu", "Owner T3");
  adminA = await addOfficer("admin.t3.a@school.edu", "Admin T3 A");
  officerA2 = await addOfficer("officer.t3.a2@school.edu", "Officer T3 A2");
  adminB = await addOfficer("admin.t3.b@school.edu", "Admin T3 B");
  adminC = await addOfficer("admin.t3.c@school.edu", "Admin T3 C");
  plainOfficer = await addOfficer("plain.t3@school.edu", "Plain T3");

  orgA = await addOrg(adminA, "T3 Org A");
  orgB = await addOrg(adminB, "T3 Org B");
  orgC = await addOrg(adminC, "T3 Org C (never active)");
  // A fourth org created right now, so it did not exist in any completed week
  await addOrg(plainOfficer, "T3 Org D (new)");

  // The first three orgs are old enough to exist in all four weeks
  await db.query(
    `update public.orgs set created_at = now() - interval '120 days' where id = any($1::uuid[])`,
    [[orgA, orgB, orgC]]
  );
  await db.query(`insert into public.platform_owners (officer_id) values ($1)`, [ownerId]);

  const cur = (
    await db.query<{ d: string }>(`select (date_trunc('week', now() at time zone 'utc')::date)::text as d`)
  ).rows[0].d;
  const back = async (n: number) =>
    (await db.query<{ d: string }>(`select ($1::date - $2::int)::text as d`, [cur, n * 7])).rows[0].d;
  weeks = { current: cur, w1: await back(1), w2: await back(2), w3: await back(3), w4: await back(4) };

  // W1: two events in org A (one in the last second of Sunday), plus two
  // check-ins on the first. Events at the very start of the NEXT week must not count.
  const e1 = await insertEvent(orgA, adminA, "W1 Tuesday event", iso(weeks.w1, 1 * DAY + 10 * 3600_000));
  await insertEvent(orgA, officerA2, "W1 Sunday night event", iso(weeks.w1, 7 * DAY - 1000));
  await insertEvent(orgA, adminA, "Current week boundary", iso(weeks.current, 0));
  const m1 = await insertMember(orgA, "m1@school.edu");
  const m2 = await insertMember(orgA, "m2@school.edu");
  await db.query(
    `insert into public.attendance (org_id, event_id, member_id, method, marked_by, checked_in_at)
     values ($1, $2, $3, 'qr', null, $4), ($1, $2, $5, 'manual', $6, $4)`,
    [orgA, e1, m1, iso(weeks.w1, 1 * DAY + 11 * 3600_000), m2, adminA]
  );

  // W2: an event at exactly Monday 00:00 (belongs to W2), and org B sends a reminder
  await insertEvent(orgA, adminA, "W2 Monday midnight event", iso(weeks.w2, 0));
  const periodB = await insertPeriod(orgB);
  const memberB = await insertMember(orgB, "mb@school.edu");
  await db.query(
    `insert into public.dues_reminders (org_id, period_id, member_id, sent_by, sent_at, status)
     values ($1, $2, $3, $4, $5, 'sent')`,
    [orgB, periodB, memberB, adminB, iso(weeks.w2, 3 * DAY)]
  );

  // W3: nothing happens anywhere.

  // W4: org C only has a dues review (verify), by its admin
  const periodC = await insertPeriod(orgC);
  const memberC = await insertMember(orgC, "mc@school.edu");
  const pay = await db.query<{ id: string }>(
    `insert into public.dues_payments (org_id, period_id, member_id, amount, reference_no, reference_key, screenshot_path, status)
     values ($1, $2, $3, 100, 'REF-0001', 'ref-0001', 'path/x.png', 'verified') returning id`,
    [orgC, periodC, memberC]
  );
  await db.query(
    `insert into public.dues_payment_events (payment_id, org_id, action, actor_id, created_at)
     values ($1, $2, 'verified', $3, $4)`,
    [pay.rows[0].id, orgC, adminC, iso(weeks.w4, 2 * DAY)]
  );

  await runReport();
});

after(async () => {
  await getDb().close();
});

describe("run_weekly_usage_report: the numbers", () => {
  it("fills the last 4 completed weeks on the first run", async () => {
    const rows = await getDb().query(`select week_start::text from public.usage_weekly order by week_start`);
    assert.deepEqual(
      rows.rows.map((r: any) => r.week_start),
      [weeks.w4, weeks.w3, weeks.w2, weeks.w1]
    );
    assert.equal((await runRow(weeks.w1)).status, "succeeded");
  });

  it("counts events, check-ins and officers in the week, with exact Monday-to-Sunday edges", async () => {
    const w1 = await snapshot(weeks.w1);
    // Two events (Tuesday, Sunday 23:59:59); the one at next Monday 00:00 is not W1
    assert.equal(w1.events_created, 2);
    assert.equal(w1.check_ins, 2);
    // adminA and officerA2 (event creators), adminA again as marker; the QR check-in has no officer
    assert.equal(w1.active_officers, 2);
    assert.equal(w1.orgs_active, 1);
  });

  it("puts an event created at exactly Monday 00:00 in that week", async () => {
    const w2 = await snapshot(weeks.w2);
    assert.equal(w2.events_created, 1);
    assert.equal(w2.check_ins, 0);
  });

  it("counts a dues reminder as activity for its org and officer", async () => {
    const w2 = await snapshot(weeks.w2);
    assert.equal(w2.orgs_active, 2); // org A (event) and org B (reminder)
    assert.equal(w2.active_officers, 2); // adminA and adminB
  });

  it("counts a dues review as activity", async () => {
    const w4 = await snapshot(weeks.w4);
    assert.equal(w4.orgs_active, 1);
    assert.equal(w4.active_officers, 1);
    assert.equal(w4.events_created, 0);
  });

  it("counts an org with no activity as inactive and never leaves it out", async () => {
    const w1 = await snapshot(weeks.w1);
    assert.equal(w1.orgs_total, 3);
    assert.equal(w1.orgs_inactive, 2);

    // A week where nothing happened: every org is inactive, and the row still exists
    const w3 = await snapshot(weeks.w3);
    assert.equal(w3.orgs_total, 3);
    assert.equal(w3.orgs_active, 0);
    assert.equal(w3.orgs_inactive, 3);
    assert.equal(w3.events_created, 0);
    assert.equal(w3.check_ins, 0);
    assert.equal(w3.active_officers, 0);
  });

  it("does not count an org created after the week ended", async () => {
    for (const w of [weeks.w1, weeks.w2, weeks.w3, weeks.w4]) {
      assert.equal((await snapshot(w)).orgs_total, 3, w);
    }
  });

  it("always has active plus inactive equal to the orgs that existed", async () => {
    const bad = await getDb().query(
      `select 1 from public.usage_weekly where orgs_active + orgs_inactive <> orgs_total`
    );
    assert.equal(bad.rows.length, 0);
  });

  it("is safe to run again: nothing changes and no rows are added", async () => {
    const before = await getDb().query(`select * from public.usage_weekly order by week_start`);
    await runReport();
    await asServer(() => getDb().query(`select public.compute_usage_week($1)`, [weeks.w1]));
    const after = await getDb().query(`select * from public.usage_weekly order by week_start`);

    assert.equal(after.rows.length, 4);
    const strip = (rows: Record<string, unknown>[]) =>
      rows.map((row) => Object.fromEntries(Object.entries(row).filter(([key]) => key !== "computed_at")));
    assert.deepEqual(strip(after.rows), strip(before.rows));
    assert.equal((await runRow(weeks.w1)).attempts, 1);
  });

  it("refuses a week that does not start on a Monday", async () => {
    const tuesday = (
      await getDb().query<{ d: string }>(`select ($1::date + 1)::text as d`, [weeks.w1])
    ).rows[0].d;
    const notMonday = await errorOf(() =>
      asServer(() => getDb().query(`select public.compute_usage_week($1)`, [tuesday]))
    );
    assert.match(notMonday ?? "", /week_start_must_be_a_monday/);
  });
});

describe("get_usage_report: owner only", () => {
  const report = (user: string | null, role: "authenticated" | "anon" = "authenticated") =>
    as(role, user, () =>
      getDb().query<Row>(
        `select week_start::text as week_start, status, orgs_total, orgs_active, orgs_inactive,
                events_created, check_ins, active_officers, attempts
           from public.get_usage_report()`
      )
    );

  it("gives the owner the last 4 weeks, newest first", async () => {
    const res = await report(ownerId);
    assert.deepEqual(
      res.rows.map((r) => r.week_start),
      [weeks.w1, weeks.w2, weeks.w3, weeks.w4]
    );
    assert.ok(res.rows.every((r) => r.status === "ready"));
    assert.equal(res.rows[0].events_created, 2);
    assert.equal(res.rows[2].orgs_inactive, 3);
  });

  it("denies a signed-in officer who is not the owner, even an org admin", async () => {
    for (const user of [adminA, officerA2, plainOfficer]) {
      assert.match((await errorOf(() => report(user))) ?? "", /not_authorized/);
    }
  });

  it("denies a request with no signed-in user and the anon role", async () => {
    assert.match((await errorOf(() => report(null))) ?? "", /not_authenticated/);
    assert.match((await errorOf(() => report(null, "anon"))) ?? "", /permission denied/);
  });

  it("lists a week with no snapshot as pending instead of leaving it out", async () => {
    await getDb().query(`delete from public.usage_weekly where week_start = $1`, [weeks.w3]);
    const res = await report(ownerId);
    const w3 = res.rows.find((r) => r.week_start === weeks.w3)!;
    assert.equal(res.rows.length, 4);
    assert.equal(w3.status, "pending");
    assert.equal(w3.orgs_total, null);
    await runReport(); // the next run restores it
    assert.equal((await snapshot(weeks.w3)).orgs_total, 3);
  });
});

describe("who can touch the tables and functions", () => {
  it("lets nobody but the server read or write the metric tables", async () => {
    for (const table of ["platform_owners", "usage_weekly", "usage_report_runs"]) {
      for (const role of ["authenticated", "anon"] as const) {
        const user = role === "anon" ? null : ownerId;
        const msg = await errorOf(() =>
          as(role, user, () => getDb().query(`select * from public.${table}`))
        );
        assert.match(msg ?? "", /permission denied/, `${role} read ${table}`);
      }
    }
    const insert = await errorOf(() =>
      as("authenticated", plainOfficer, () =>
        getDb().query(`insert into public.platform_owners (officer_id) values ($1)`, [plainOfficer])
      )
    );
    assert.match(insert ?? "", /permission denied/, "a user must not be able to make themselves owner");
  });

  it("keeps the compute and run functions to the service role", async () => {
    for (const role of ["authenticated", "anon"] as const) {
      const user = role === "anon" ? null : ownerId;
      const run = await errorOf(() =>
        as(role, user, () => getDb().query(`select public.run_weekly_usage_report()`))
      );
      const compute = await errorOf(() =>
        as(role, user, () => getDb().query(`select public.compute_usage_week($1)`, [weeks.w1]))
      );
      assert.match(run ?? "", /permission denied/, `${role} run`);
      assert.match(compute ?? "", /permission denied/, `${role} compute`);
    }
  });

  it("is_platform_owner is true only for the owner", async () => {
    const check = (user: string) =>
      as("authenticated", user, () =>
        getDb().query<{ is_platform_owner: boolean }>(`select public.is_platform_owner()`)
      ).then((r) => r.rows[0].is_platform_owner);
    assert.equal(await check(ownerId), true);
    assert.equal(await check(adminA), false);
  });
});

describe("a failed run is recorded and retried", () => {
  const reset = async () => {
    await getDb().query(`delete from public.usage_weekly`);
    await getDb().query(`delete from public.usage_report_runs`);
  };
  // Makes ONLY week W2's snapshot insert fail, so the other weeks can succeed
  const breakWeek = (week: string) =>
    getDb().query(
      `alter table public.usage_weekly add constraint t3_test_break check (week_start <> '${week}'::date)`
    );
  const fixWeek = () => getDb().query(`alter table public.usage_weekly drop constraint t3_test_break`);

  before(async () => {
    await reset();
    await breakWeek(weeks.w2);
    await runReport();
  });

  it("records the failure with its message, attempt count and next retry time", async () => {
    const run = await runRow(weeks.w2);
    assert.equal(run.status, "failed");
    assert.equal(run.attempts, 1);
    assert.match(run.error_message ?? "", /t3_test_break/);
    assert.ok(run.next_retry_at, "a retry time is set");
  });

  it("does not let one failing week stop the others", async () => {
    for (const w of [weeks.w1, weeks.w3, weeks.w4]) {
      assert.equal((await runRow(w)).status, "succeeded", w);
      assert.ok(await snapshot(w), `snapshot for ${w}`);
    }
    assert.equal(await snapshot(weeks.w2), undefined);
  });

  it("shows the failed week to the owner with its attempt count, not as missing", async () => {
    const res = await as("authenticated", ownerId, () =>
      getDb().query<Row>(`select week_start::text as week_start, status, attempts from public.get_usage_report()`)
    );
    const w2 = res.rows.find((r) => r.week_start === weeks.w2)!;
    assert.equal(w2.status, "failed");
    assert.equal(w2.attempts, 1);
  });

  it("waits until the retry time before trying again", async () => {
    await runReport();
    assert.equal((await runRow(weeks.w2)).attempts, 1);
  });

  it("retries once due, and clears the error when it works", async () => {
    await fixWeek();
    await getDb().query(
      `update public.usage_report_runs set next_retry_at = now() - interval '1 minute' where week_start = $1`,
      [weeks.w2]
    );
    await runReport();

    const run = await runRow(weeks.w2);
    assert.equal(run.status, "succeeded");
    assert.equal(run.attempts, 2);
    assert.equal(run.error_message, null);
    assert.equal(run.next_retry_at, null);
    assert.ok(await snapshot(weeks.w2));
  });

  it("backs off further after each repeated failure, and gives up after 5 attempts", async () => {
    await reset();
    await breakWeek(weeks.w2);
    await runReport(); // attempt 1
    const first = await getDb().query<{ gap: number }>(
      `select extract(epoch from next_retry_at - last_attempt_at)::int as gap
         from public.usage_report_runs where week_start = $1`,
      [weeks.w2]
    );
    assert.ok(Math.abs(first.rows[0].gap - 15 * 60) <= 2, "first retry in about 15 minutes");

    await getDb().query(
      `update public.usage_report_runs set next_retry_at = now() - interval '1 minute' where week_start = $1`,
      [weeks.w2]
    );
    await runReport(); // attempt 2
    const second = await getDb().query<{ gap: number; attempts: number }>(
      `select extract(epoch from next_retry_at - last_attempt_at)::int as gap, attempts
         from public.usage_report_runs where week_start = $1`,
      [weeks.w2]
    );
    assert.equal(second.rows[0].attempts, 2);
    assert.ok(second.rows[0].gap > first.rows[0].gap, "the wait grows");

    // After 5 attempts it stops retrying on its own, but stays recorded as failed
    await getDb().query(
      `update public.usage_report_runs set attempts = 5, next_retry_at = now() - interval '1 minute' where week_start = $1`,
      [weeks.w2]
    );
    await runReport();
    const given = await runRow(weeks.w2);
    assert.equal(given.status, "failed");
    assert.equal(given.attempts, 5);
    await fixWeek();
  });
});
