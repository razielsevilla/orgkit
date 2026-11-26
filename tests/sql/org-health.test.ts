import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { as, addMember, addOfficer, addOrg, errorOf, getDb, newUuid, startDb } from "./helpers.ts";

/**
 * O1: get_org_health. The numbers Home shows must match the screens they link
 * to (above all Dues), cover only the caller's org, and refuse everyone else.
 * Fixtures are inserted as the superuser; every call under test runs as an API role.
 */

let orgA: string;
let orgB: string;
let adminA: string;
let officerA: string;
let adminB: string;
let emptyOrg: string;
let emptyAdmin: string;

const days = (n: number) => `now() + interval '${n} days'`;
const dateIn = (n: number) => `((now() at time zone 'Asia/Manila')::date + ${n})`;

interface Health {
  today: string;
  members: {
    active: number;
    pending: number;
    inactive: number;
    joined_30d: number;
    joined_prev_30d: number;
    oldest_pending_days: number | null;
    joined_weekly: number[];
  };
  dues: null | {
    name: string;
    active_members: number;
    paid: number;
    pending: number;
    rejected: number;
    unpaid: number;
    collected: number;
    expected: number;
    outstanding: number;
    due_on: string;
  };
  events: {
    total: number;
    upcoming: number;
    next_event: null | { title: string };
    held_90d: number;
    turnout_pct_90d: number | null;
    held_prev_90d: number;
    turnout_pct_prev_90d: number | null;
    recent: { title: string; turnout_pct: number | null }[];
  };
  officers: {
    with_access: number;
    terms_total: number;
    terms_current: number;
    terms_ending_30d: number;
  };
  handover: {
    ending_total: number;
    ending_ready: number;
    ending_draft: number;
    ending_missing: number;
    roles: { role_title: string; guide_status: string }[];
    guides_ready: number;
    guides_draft: number;
  };
  documents: { total: number; categories_covered: number };
}

async function health(user: string | null, role: "authenticated" | "anon", org: string) {
  return as(role, user, async () => {
    const res = await getDb().query<{ get_org_health: Health }>(`select public.get_org_health($1)`, [org]);
    return res.rows[0].get_org_health;
  });
}

async function member(org: string, email: string, status: string, createdOffsetDays = 0): Promise<string> {
  const res = await getDb().query<{ id: string }>(
    `insert into public.members (org_id, full_name, email, email_key, consent_version, consent_language, status, created_at)
     values ($1, $2, $3, lower($3), 'v1', 'en', $4, ${days(createdOffsetDays)})
     returning id`,
    [org, `Student ${email}`, email, status]
  );
  return res.rows[0].id;
}

async function payment(org: string, period: string, memberId: string, status: string, submittedOffset = 0) {
  const ref = `REF-${newUuid().slice(-8)}`;
  await getDb().query(
    `insert into public.dues_payments (org_id, period_id, member_id, amount, reference_no, reference_key, screenshot_path, status, submitted_at)
     values ($1, $2, $3, 100, $4, lower($4), 'dues-screenshots/x.png', $5, ${days(submittedOffset)})`,
    [org, period, memberId, ref, status]
  );
}

async function event(org: string, title: string, startOffsetDays: number, status = "scheduled"): Promise<string> {
  const res = await getDb().query<{ id: string }>(
    `insert into public.events (org_id, title, starts_at, ends_at, status)
     values ($1, $2, ${days(startOffsetDays)}, ${days(startOffsetDays)} + interval '2 hours', $3)
     returning id`,
    [org, title, status]
  );
  return res.rows[0].id;
}

async function attend(org: string, eventId: string, memberId: string) {
  await getDb().query(
    `insert into public.attendance (org_id, event_id, member_id, method) values ($1, $2, $3, 'manual')`,
    [org, eventId, memberId]
  );
}

async function term(org: string, role: string, startOffset: number, endOffset: number): Promise<string> {
  const res = await getDb().query<{ id: string }>(
    `insert into public.officer_terms (org_id, holder_name, role_title, term_name, start_date, end_date)
     values ($1, 'Holder Name', $2, 'AY 2026-27', ${dateIn(startOffset)}, ${dateIn(endOffset)})
     returning id`,
    [org, role]
  );
  return res.rows[0].id;
}

async function guide(org: string, role: string, status: string, termId: string | null = null) {
  await getDb().query(
    `insert into public.handover_guides (org_id, role_title, status, term_id) values ($1, $2, $3, $4)`,
    [org, role, status, termId]
  );
}

before(async () => {
  await startDb();
  const db = getDb();

  adminA = await addOfficer("admin.o1.a@school.edu", "Admin O1 A");
  orgA = await addOrg(adminA, "Health Org A");
  officerA = await addMember(orgA, "officer.o1.a@school.edu", "officer");

  adminB = await addOfficer("admin.o1.b@school.edu", "Admin O1 B");
  orgB = await addOrg(adminB, "Health Org B");

  emptyAdmin = await addOfficer("admin.o1.empty@school.edu", "Admin O1 Empty");
  emptyOrg = await addOrg(emptyAdmin, "Health Org Empty");

  // --- Org A: members ---------------------------------------------------------
  const active: string[] = [];
  for (let i = 0; i < 4; i++) {
    // Two joined recently (within 30 days), two joined 45 days ago
    active.push(await member(orgA, `active${i}@x.edu`, "active", i < 2 ? -5 : -45));
  }
  const inactivePayer = await member(orgA, "inactive.payer@x.edu", "inactive", -100);
  await member(orgA, "inactive.never@x.edu", "inactive", -100);
  await member(orgA, "pending1@x.edu", "pending", -20);
  await member(orgA, "pending2@x.edu", "pending", -3);

  // --- Org A: dues (4 active members, ₱100 each) ------------------------------
  // The newest open period is the one Home reports, as on the Dues page
  await db.query(
    `insert into public.dues_periods (org_id, name, amount, due_on, status, created_at)
     values ($1, 'Old closed period', 100, ${dateIn(-60)}, 'closed', ${days(-120)})`,
    [orgA]
  );
  const periodRes = await db.query<{ id: string }>(
    `insert into public.dues_periods (org_id, name, amount, due_on, status, created_at)
     values ($1, '1st Sem Dues', 100, ${dateIn(10)}, 'open', ${days(-20)})
     returning id`,
    [orgA]
  );
  const period = periodRes.rows[0].id;
  await payment(orgA, period, active[0], "verified"); // paid
  await payment(orgA, period, active[1], "submitted"); // pending review
  await payment(orgA, period, active[2], "rejected"); // rejected, never resubmitted
  // active[3] has not paid
  await payment(orgA, period, inactivePayer, "verified"); // deactivated, but the money counts

  // --- Org A: events (4 active members) ---------------------------------------
  const recent1 = await event(orgA, "General assembly", -10);
  const recent2 = await event(orgA, "Workshop", -30);
  await event(orgA, "Cancelled outing", -20, "cancelled");
  const older = await event(orgA, "Orientation", -120);
  await event(orgA, "Next meeting", 7);
  await event(orgA, "Later meeting", 21);
  // recent1: 4 of 4 attend; recent2: 2 of 4 attend -> average 75%
  for (const m of active) await attend(orgA, recent1, m);
  for (const m of active.slice(0, 2)) await attend(orgA, recent2, m);
  // older: 1 of 4 attends -> 25% in the previous window
  await attend(orgA, older, active[0]);

  // --- Org A: officer terms, handover, documents ------------------------------
  await term(orgA, "President", -200, 160); // current, ends in 160 days
  await term(orgA, "Treasurer", -300, 20); // ending in 20 days: no guide
  const secTerm = await term(orgA, "Secretary", -300, 45); // ending in 45 days: draft linked by term
  await term(orgA, "Auditor", -300, 50); // ending in 50 days: ready, matched by role title
  await term(orgA, "Old PRO", -500, -100); // ended: not current, not ending
  await guide(orgA, "Secretary (2025)", "draft", secTerm);
  await guide(orgA, "  auditor ", "ready");
  await guide(orgA, "Unrelated role", "ready");

  await db.query(
    `insert into public.documents (org_id, title, category, kind, url)
     values ($1, 'Budget', 'Finance', 'link', 'https://example.com/a'),
            ($1, 'Bylaws', 'Legal', 'link', 'https://example.com/b'),
            ($1, 'Budget 2', 'Finance', 'link', 'https://example.com/c')`,
    [orgA]
  );

  // --- Org B has data that must never leak into Org A -------------------------
  await member(orgB, "b.active@x.edu", "active", -2);
  await event(orgB, "B only event", 3);
});

describe("O1 get_org_health: members", () => {
  it("counts each status and the 30-day join windows", async () => {
    const h = await health(officerA, "authenticated", orgA);
    assert.equal(h.members.active, 4);
    assert.equal(h.members.pending, 2);
    assert.equal(h.members.inactive, 2);
    // joined in the last 30 days: 2 active + pending(-20) + pending(-3) = 4
    assert.equal(h.members.joined_30d, 4);
    // joined 30 to 60 days ago: the two active members from 45 days ago
    assert.equal(h.members.joined_prev_30d, 2);
  });

  it("reports how long the oldest pending member has waited, or null", async () => {
    const h = await health(officerA, "authenticated", orgA);
    assert.equal(h.members.oldest_pending_days, 20);

    const none = await health(emptyAdmin, "authenticated", emptyOrg);
    assert.equal(none.members.oldest_pending_days, null);
  });
});

describe("O1 get_org_health: the series behind the charts", () => {
  it("counts new members per week for 8 weeks, oldest first", async () => {
    const h = await health(officerA, "authenticated", orgA);
    // Latest week (last): 2 active joined 5 days ago + the pending student from 3 days ago.
    // Six weeks back: the 2 active members from 45 days ago. Two weeks back: the pending one from 20 days ago.
    assert.deepEqual(h.members.joined_weekly, [0, 2, 0, 0, 0, 1, 0, 3]);
  });

  it("always returns 8 weeks, even for an empty org", async () => {
    const h = await health(emptyAdmin, "authenticated", emptyOrg);
    assert.deepEqual(h.members.joined_weekly, [0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it("lists the last held events with their turnout, oldest first, skipping cancelled and upcoming ones", async () => {
    const h = await health(officerA, "authenticated", orgA);
    assert.deepEqual(
      h.events.recent.map((e) => [e.title, Number(e.turnout_pct)]),
      [
        ["Orientation", 25],
        ["Workshop", 50],
        ["General assembly", 100],
      ]
    );
  });

  it("returns an empty list when nothing has been held", async () => {
    const h = await health(emptyAdmin, "authenticated", emptyOrg);
    assert.deepEqual(h.events.recent, []);
  });

  it("keeps only the 8 most recent events", async () => {
    const db = getDb();
    const org = await addOrg(await addOfficer("many.events@school.edu"), "Many Events Org");
    const admin = (await db.query<{ officer_id: string }>(`select officer_id from public.org_officers where org_id = $1`, [org])).rows[0]
      .officer_id;
    for (let i = 1; i <= 10; i++) await event(org, `Event ${i}`, -i * 5);
    const h = await health(admin, "authenticated", org);
    assert.equal(h.events.recent.length, 8);
    // oldest first: Event 8 is the oldest of the last eight, Event 1 the latest
    assert.equal(h.events.recent[0].title, "Event 8");
    assert.equal(h.events.recent[7].title, "Event 1");
  });
});

describe("O1 get_org_health: dues matches the Dues page rules", () => {
  it("reports the newest open period, not a closed one", async () => {
    const h = await health(officerA, "authenticated", orgA);
    assert.ok(h.dues);
    assert.equal(h.dues.name, "1st Sem Dues");
  });

  it("counts paid, pending, rejected and unpaid like get_dues_period_dashboard", async () => {
    const h = await health(officerA, "authenticated", orgA);
    assert.ok(h.dues);
    assert.equal(h.dues.active_members, 4);
    // Paid includes the deactivated member who paid
    assert.equal(h.dues.paid, 2);
    assert.equal(h.dues.pending, 1);
    assert.equal(h.dues.rejected, 1);
    assert.equal(h.dues.unpaid, 1);
  });

  it("collects verified money only, expects active members only, and owes the rest", async () => {
    const h = await health(officerA, "authenticated", orgA);
    assert.ok(h.dues);
    assert.equal(Number(h.dues.collected), 200); // two verified payments of 100
    assert.equal(Number(h.dues.expected), 400); // 4 active x 100
    // Active members who have not got a verified payment: 3 (pending, rejected, unpaid)
    assert.equal(Number(h.dues.outstanding), 300);
  });

  it("agrees with the dues dashboard function for the same period", async () => {
    const db = getDb();
    const periodId = (
      await db.query<{ id: string }>(
        `select id from public.dues_periods where org_id = $1 and status = 'open'`,
        [orgA]
      )
    ).rows[0].id;
    const dash = await as("authenticated", officerA, () =>
      db.query<{ get_dues_period_dashboard: { summary: Record<string, string | number> } }>(
        `select public.get_dues_period_dashboard($1)`,
        [periodId]
      )
    );
    const s = dash.rows[0].get_dues_period_dashboard.summary;
    const h = await health(officerA, "authenticated", orgA);
    assert.ok(h.dues);
    assert.equal(h.dues.paid, Number(s.paid_count));
    assert.equal(h.dues.pending, Number(s.pending_count));
    assert.equal(h.dues.rejected, Number(s.rejected_count));
    assert.equal(h.dues.unpaid, Number(s.unpaid_count));
    assert.equal(Number(h.dues.collected), Number(s.collected_amount));
    assert.equal(Number(h.dues.expected), Number(s.expected_amount));
    assert.equal(Number(h.dues.outstanding), Number(s.outstanding_amount));
  });

  it("is null when there is no open period", async () => {
    const h = await health(emptyAdmin, "authenticated", emptyOrg);
    assert.equal(h.dues, null);
  });
});

describe("O1 get_org_health: events and turnout", () => {
  it("counts upcoming events and names the next one", async () => {
    const h = await health(officerA, "authenticated", orgA);
    assert.equal(h.events.upcoming, 2);
    assert.equal(h.events.next_event?.title, "Next meeting");
  });

  it("skips cancelled events and averages turnout over active members", async () => {
    const h = await health(officerA, "authenticated", orgA);
    // General assembly and Workshop. The cancelled outing is left out.
    assert.equal(h.events.held_90d, 2);
    assert.equal(Number(h.events.turnout_pct_90d), 75);
  });

  it("compares with the 90 days before", async () => {
    const h = await health(officerA, "authenticated", orgA);
    assert.equal(h.events.held_prev_90d, 1);
    assert.equal(Number(h.events.turnout_pct_prev_90d), 25);
  });

  it("has no turnout when nothing was held", async () => {
    const h = await health(emptyAdmin, "authenticated", emptyOrg);
    assert.equal(h.events.held_90d, 0);
    assert.equal(h.events.turnout_pct_90d, null);
    assert.equal(h.events.total, 0);
  });
});

describe("O1 get_org_health: officers, handover and documents", () => {
  it("counts current terms and those ending in 30 days", async () => {
    const h = await health(officerA, "authenticated", orgA);
    assert.equal(h.officers.with_access, 2);
    assert.equal(h.officers.terms_total, 5);
    // President, Treasurer, Secretary, Auditor are current. Old PRO ended.
    assert.equal(h.officers.terms_current, 4);
    assert.equal(h.officers.terms_ending_30d, 1);
  });

  it("matches each leaving role to its best guide, by term link or role title", async () => {
    const h = await health(officerA, "authenticated", orgA);
    assert.equal(h.handover.ending_total, 3); // Treasurer, Secretary, Auditor
    assert.equal(h.handover.ending_ready, 1);
    assert.equal(h.handover.ending_draft, 1);
    assert.equal(h.handover.ending_missing, 1);

    const byRole = Object.fromEntries(h.handover.roles.map((r) => [r.role_title, r.guide_status]));
    assert.deepEqual(byRole, { Treasurer: "missing", Secretary: "draft", Auditor: "ready" });
    // Soonest first
    assert.deepEqual(
      h.handover.roles.map((r) => r.role_title),
      ["Treasurer", "Secretary", "Auditor"]
    );
  });

  it("counts every guide by status", async () => {
    const h = await health(officerA, "authenticated", orgA);
    assert.equal(h.handover.guides_ready, 2);
    assert.equal(h.handover.guides_draft, 1);
  });

  it("counts documents and the categories they cover", async () => {
    const h = await health(officerA, "authenticated", orgA);
    assert.equal(h.documents.total, 3);
    assert.equal(h.documents.categories_covered, 2);
  });
});

describe("O1 get_org_health: an empty org", () => {
  it("returns zeros and nulls, never an error", async () => {
    const h = await health(emptyAdmin, "authenticated", emptyOrg);
    assert.equal(h.members.active, 0);
    assert.equal(h.events.upcoming, 0);
    assert.equal(h.events.next_event, null);
    assert.equal(h.officers.terms_total, 0);
    assert.equal(h.handover.ending_total, 0);
    assert.deepEqual(h.handover.roles, []);
    assert.equal(h.documents.total, 0);
  });
});

describe("O1 get_org_health: access", () => {
  it("shows only the caller's own org", async () => {
    const h = await health(adminB, "authenticated", orgB);
    assert.equal(h.members.active, 1);
    assert.equal(h.events.upcoming, 1);
    assert.equal(h.events.next_event?.title, "B only event");
    assert.equal(h.dues, null);
  });

  it("refuses an officer of another org", async () => {
    const err = await errorOf(() => health(adminB, "authenticated", orgA));
    assert.match(err ?? "", /not_authorized/);
  });

  it("answers an unknown org the same way, so it does not reveal which orgs exist", async () => {
    const err = await errorOf(() => health(adminA, "authenticated", newUuid()));
    assert.match(err ?? "", /not_authorized/);
  });

  it("refuses a missing org id", async () => {
    const err = await errorOf(() =>
      as("authenticated", adminA, () => getDb().query(`select public.get_org_health(null)`))
    );
    assert.match(err ?? "", /not_authorized/);
  });

  it("refuses a signed-in role with no user", async () => {
    const err = await errorOf(() => health(null, "authenticated", orgA));
    assert.match(err ?? "", /not_authenticated/);
  });

  it("is not executable by anon", async () => {
    const err = await errorOf(() => health(null, "anon", orgA));
    assert.match(err ?? "", /permission denied/);
  });
});
