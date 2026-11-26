#!/usr/bin/env node
/**
 * Fills one org with sample data in every area the Home dashboard reads, so you
 * can see how it looks: members, a dues period with payments, events with
 * attendance, officer terms, handover guides and documents.
 *
 *   node --env-file=.env.local scripts/seed-org-health.mjs <orgId>                          dry run, writes nothing
 *   node --env-file=.env.local scripts/seed-org-health.mjs <orgId> --apply                  writes the "mixed" scenario
 *   node --env-file=.env.local scripts/seed-org-health.mjs <orgId> --apply --scenario=healthy
 *   node --env-file=.env.local scripts/seed-org-health.mjs <orgId> --clean                  removes the sample rows
 *
 * Scenarios:
 *   mixed    some areas fine, some needing a look, some needing action
 *   healthy  every area on track
 *
 * Everything is dated relative to today, so run --apply again on another day to
 * refresh it. --apply first removes the previous sample rows, so it never piles
 * up and switching scenario is just another --apply.
 *
 * How sample rows are marked, so --clean never touches real data:
 *   members     email like healthseed.NN@seed.orgkit.test
 *   events      title starts with "Sample · "
 *   dues        period name starts with "Sample · " (its payments go with it)
 *   terms       term name ends with "(sample)" (their handover guides go first)
 *   documents   title starts with "Sample · "
 *
 * It writes with the service-role key from .env.local, so it goes to whichever
 * Supabase project that file points at. The target is printed before anything is
 * written. Sample payments point at a placeholder screenshot, so opening one in
 * the review queue shows a broken image.
 */
import { createClient } from "@supabase/supabase-js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DAY = 24 * 60 * 60 * 1000;
const PREFIX = "Sample · ";
const TERM_SUFFIX = "(sample)";
const EMAIL_DOMAIN = "seed.orgkit.test";
const EMAIL_LIKE = `healthseed.%@${EMAIL_DOMAIN}`;
const CONSENT_VERSION = "member-consent-v2";

// ── Scenarios ───────────────────────────────────────────────────────────────
// Day numbers are relative to today: -30 is thirty days ago, 6 is in six days.

const SCENARIOS = {
  mixed: {
    summary: "Dues and Events need a look, Members and Handover need action, Terms need a look",
    members: { active: 48, pending: [17, 9, 5, 3, 1], inactive: 4, joinedLast30: 9, joinedPrev30: 4 },
    dues: { createdDaysAgo: 24, dueInDays: 6, verified: 29, submitted: 5, rejected: 3 },
    events: {
      // [day, turnout share of active members]
      held: [[-80, 0.65], [-62, 0.58], [-45, 0.55], [-30, 0.5], [-14, 0.45], [-7, 0.4], [-170, 0.72], [-140, 0.7], [-105, 0.68]],
      upcoming: [5, 19],
    },
    // role, end day (from today), guide status or null for no guide
    terms: [
      ["President", 200, "ready"],
      ["Vice President", 200, null],
      ["Secretary", 25, null],
      ["Treasurer", 12, null],
      ["Auditor", 45, "draft"],
      ["PRO", 50, "ready"],
    ],
  },
  healthy: {
    summary: "Every area on track",
    members: { active: 48, pending: [], inactive: 4, joinedLast30: 8, joinedPrev30: 6 },
    dues: { createdDaysAgo: 10, dueInDays: 20, verified: 43, submitted: 0, rejected: 0 },
    events: {
      held: [[-80, 0.55], [-62, 0.58], [-45, 0.6], [-30, 0.62], [-14, 0.66], [-7, 0.68], [-170, 0.5], [-140, 0.52], [-105, 0.54]],
      upcoming: [4, 18],
    },
    terms: [
      ["President", 200, "ready"],
      ["Vice President", 200, "ready"],
      ["Secretary", 180, null],
      ["Treasurer", 180, "ready"],
    ],
  },
};

// ── Arguments ───────────────────────────────────────────────────────────────

const [orgId, ...flags] = process.argv.slice(2);
const apply = flags.includes("--apply");
const clean = flags.includes("--clean");
const scenarioName = (flags.find((f) => f.startsWith("--scenario="))?.split("=")[1] ?? "mixed").trim();
const scenario = SCENARIOS[scenarioName];

if (!orgId || !UUID.test(orgId) || (apply && clean) || !scenario) {
  console.error("Usage: node --env-file=.env.local scripts/seed-org-health.mjs <orgId> [--apply | --clean] [--scenario=mixed|healthy]");
  console.error("Find the org id in the workspace URL: /workspace/<orgId>");
  process.exit(1);
}

// ── Dates (Manila, the zone the dashboard uses) ─────────────────────────────

const nowMs = Date.now();
const manilaDate = (offsetDays) => new Date(nowMs + 8 * 3600e3 + offsetDays * DAY).toISOString().slice(0, 10);
/** 2pm Manila on a day, as an ISO timestamp */
const at2pm = (offsetDays) => new Date(`${manilaDate(offsetDays)}T06:00:00Z`).toISOString();
const daysAgoIso = (days) => new Date(nowMs - days * DAY).toISOString();

// ── Deterministic people ────────────────────────────────────────────────────

function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const FIRST = ["Juan", "Maria", "Jose", "Ana", "Mark", "Angelica", "Paolo", "Bea", "Carlo", "Denise", "Miguel", "Kristine", "Rafael", "Jasmine", "Gabriel", "Nicole", "Daniel", "Trisha", "Lorenzo", "Camille"];
const LAST = ["Santos", "Reyes", "Cruz", "Bautista", "Ocampo", "Garcia", "Mendoza", "Torres", "Villanueva", "Ramos", "Aquino", "Castillo", "Flores", "Navarro", "Salazar", "Domingo", "Pascual", "Soriano", "Aguilar", "Lim"];

function buildMembers() {
  const rand = mulberry32(77);
  const { active, pending, inactive, joinedLast30, joinedPrev30 } = scenario.members;
  const rows = [];
  let n = 0;
  const person = (status, daysOld) => {
    n += 1;
    const first = FIRST[Math.floor(rand() * FIRST.length)];
    const last = LAST[Math.floor(rand() * LAST.length)];
    const createdAt = daysAgoIso(daysOld);
    rows.push({
      full_name: `${first} ${last}`,
      email: `healthseed.${String(n).padStart(2, "0")}@${EMAIL_DOMAIN}`,
      email_key: `healthseed.${String(n).padStart(2, "0")}@${EMAIL_DOMAIN}`,
      status,
      consent_version: CONSENT_VERSION,
      consent_language: "en",
      consent_at: createdAt,
      created_at: createdAt,
    });
  };
  for (let i = 0; i < active; i++) {
    const daysOld =
      i < joinedLast30 ? 1 + Math.floor(rand() * 27) : i < joinedLast30 + joinedPrev30 ? 31 + Math.floor(rand() * 27) : 70 + Math.floor(rand() * 230);
    person("active", daysOld);
  }
  for (const waited of pending) person("pending", waited);
  for (let i = 0; i < inactive; i++) person("inactive", 120 + i * 20);
  return rows;
}

// ── Plan ────────────────────────────────────────────────────────────────────

const memberRows = buildMembers();
const activeCount = scenario.members.active;
const { dues, events } = scenario;
const unpaid = activeCount - dues.verified - dues.submitted - dues.rejected;

console.log(`Plan for org ${orgId} (scenario: ${scenarioName})`);
console.log(`  members:   ${memberRows.length} (${activeCount} active, ${scenario.members.pending.length} pending, ${scenario.members.inactive} inactive)`);
console.log(`  dues:      1 open period (₱250, due ${manilaDate(dues.dueInDays)}): ${dues.verified} paid, ${dues.submitted} pending, ${dues.rejected} rejected, ${unpaid} unpaid, plus 1 closed period`);
console.log(`  events:    ${events.held.length} held with attendance, ${events.upcoming.length} upcoming, 1 cancelled`);
console.log(`  terms:     ${scenario.terms.length} officer terms, ${scenario.terms.filter((t) => t[2]).length} handover guides`);
console.log("  documents: 8 links across 4 categories");
console.log(`  expect:    ${scenario.summary}`);

if (!apply && !clean) {
  console.log("\nDry run: nothing was written. Add --apply to write these rows, or --clean to remove them.");
  process.exit(0);
}

// ── Connect ─────────────────────────────────────────────────────────────────

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Run with --env-file=.env.local");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });
console.log(`\nTarget: ${new URL(url).host}`);

const { data: org, error: orgError } = await db.from("orgs").select("name, school").eq("id", orgId).maybeSingle();
if (orgError || !org) {
  console.error("No org with that id in this project. Nothing was changed.");
  process.exit(1);
}
console.log(`Org:    ${org.name}${org.school ? ` (${org.school})` : ""}`);

/** Stops on the first failure, saying which step it was */
function must(result, step) {
  if (result.error) {
    console.error(`\n${step} failed: ${result.error.message}`);
    console.error("Stopped. Run --clean to remove whatever was written.");
    process.exit(1);
  }
  return result;
}

// ── Clean: only rows that carry the sample marker ───────────────────────────

async function removeSamples() {
  const termIds = must(
    await db.from("officer_terms").select("id").eq("org_id", orgId).like("term_name", `%${TERM_SUFFIX}`),
    "Finding sample terms"
  ).data.map((t) => t.id);

  let guides = 0;
  if (termIds.length) {
    guides = must(await db.from("handover_guides").delete({ count: "exact" }).eq("org_id", orgId).in("term_id", termIds), "Removing guides").count;
  }
  const terms = must(await db.from("officer_terms").delete({ count: "exact" }).eq("org_id", orgId).like("term_name", `%${TERM_SUFFIX}`), "Removing terms").count;
  const eventsGone = must(await db.from("events").delete({ count: "exact" }).eq("org_id", orgId).like("title", `${PREFIX}%`), "Removing events").count;
  const periods = must(await db.from("dues_periods").delete({ count: "exact" }).eq("org_id", orgId).like("name", `${PREFIX}%`), "Removing dues periods").count;
  const docs = must(await db.from("documents").delete({ count: "exact" }).eq("org_id", orgId).like("title", `${PREFIX}%`), "Removing documents").count;
  const members = must(await db.from("members").delete({ count: "exact" }).eq("org_id", orgId).like("email_key", EMAIL_LIKE), "Removing members").count;

  return { members, periods, eventsGone, terms, guides, docs };
}

if (clean) {
  const r = await removeSamples();
  console.log(`Removed ${r.members} members, ${r.periods} dues periods (and their payments), ${r.eventsGone} events (and their attendance), ${r.terms} terms, ${r.guides} guides, ${r.docs} documents.`);
  console.log("Anything that was not marked as sample data was left alone.");
  process.exit(0);
}

// ── Apply ───────────────────────────────────────────────────────────────────

const removed = await removeSamples();
if (removed.members + removed.periods + removed.eventsGone + removed.terms + removed.docs > 0) {
  console.log("Replaced the previous sample data.");
}

// Members
const members = must(
  await db.from("members").insert(memberRows.map((m) => ({ ...m, org_id: orgId }))).select("id, status, created_at"),
  "Adding members"
).data;
const activeMembers = members.filter((m) => m.status === "active");
console.log(`Added ${members.length} members`);

// Dues: one closed period everyone paid, one open period in progress
const periods = must(
  await db
    .from("dues_periods")
    .insert([
      { org_id: orgId, name: `${PREFIX}Orientation fee`, amount: 100, due_on: manilaDate(-90), status: "closed", created_at: daysAgoIso(120) },
      {
        org_id: orgId,
        name: `${PREFIX}1st Sem Membership Dues`,
        amount: 250,
        due_on: manilaDate(dues.dueInDays),
        status: "open",
        created_at: daysAgoIso(dues.createdDaysAgo),
      },
    ])
    .select("id, name, status"),
  "Adding dues periods"
).data;
const closedPeriod = periods.find((p) => p.status === "closed");
const openPeriod = periods.find((p) => p.status === "open");

const payments = [];
activeMembers.slice(0, Math.min(40, activeMembers.length)).forEach((m, i) => {
  payments.push({
    org_id: orgId,
    period_id: closedPeriod.id,
    member_id: m.id,
    amount: 100,
    reference_no: `SEEDOLD-${String(i + 1).padStart(4, "0")}`,
    reference_key: `seedold-${String(i + 1).padStart(4, "0")}`,
    screenshot_path: "seed/placeholder.png",
    status: "verified",
    submitted_at: daysAgoIso(110),
    reviewed_at: daysAgoIso(108),
  });
});
const statusPlan = [
  ...Array(dues.verified).fill("verified"),
  ...Array(dues.submitted).fill("submitted"),
  ...Array(dues.rejected).fill("rejected"),
];
statusPlan.forEach((status, i) => {
  const m = activeMembers[i];
  const submittedDaysAgo = Math.min(dues.createdDaysAgo - 1, 1 + (i % Math.max(1, dues.createdDaysAgo - 1)));
  payments.push({
    org_id: orgId,
    period_id: openPeriod.id,
    member_id: m.id,
    amount: 250,
    reference_no: `SEEDREF-${String(i + 1).padStart(4, "0")}`,
    reference_key: `seedref-${String(i + 1).padStart(4, "0")}`,
    screenshot_path: "seed/placeholder.png",
    status,
    reject_reason: status === "rejected" ? "The reference number does not match the screenshot" : null,
    submitted_at: daysAgoIso(submittedDaysAgo),
    reviewed_at: status === "submitted" ? null : daysAgoIso(Math.max(0, submittedDaysAgo - 1)),
  });
});
must(await db.from("dues_payments").insert(payments), "Adding dues payments");
console.log(`Added 2 dues periods and ${payments.length} payments`);

// Events and attendance
const TITLES = ["General assembly", "Workshop: Intro to Git", "Outreach day", "Officer meet and greet", "Hackathon prep", "Alumni talk", "Team building", "Resume clinic", "Orientation"];
const eventRows = [
  ...events.held.map(([day], i) => ({ title: `${PREFIX}${TITLES[i % TITLES.length]}`, day, status: "scheduled" })),
  ...events.upcoming.map((day, i) => ({ title: `${PREFIX}${["Monthly general meeting", "Career night"][i % 2]}`, day, status: "scheduled" })),
  { title: `${PREFIX}Cancelled outing`, day: -20, status: "cancelled" },
].map((e) => ({
  org_id: orgId,
  title: e.title,
  starts_at: at2pm(e.day),
  ends_at: new Date(Date.parse(at2pm(e.day)) + 2 * 3600e3).toISOString(),
  location: "Student center, Room 204",
  status: e.status,
  created_at: daysAgoIso(Math.max(0, -e.day + 10)),
}));
const insertedEvents = must(await db.from("events").insert(eventRows).select("id, title, starts_at"), "Adding events").data;

const attendance = [];
events.held.forEach(([day, share], i) => {
  // The database writes timestamps as "...+00:00", so compare moments, not strings
  const event = insertedEvents.find(
    (e) => Date.parse(e.starts_at) === Date.parse(at2pm(day)) && e.title === `${PREFIX}${TITLES[i % TITLES.length]}`
  );
  const going = Math.round(share * activeMembers.length);
  for (let k = 0; k < going; k++) {
    const member = activeMembers[(k + i * 7) % activeMembers.length];
    attendance.push({
      org_id: orgId,
      event_id: event.id,
      member_id: member.id,
      method: k % 4 === 0 ? "manual" : "qr",
      checked_in_at: new Date(Date.parse(event.starts_at) + (5 + (k % 40)) * 60e3).toISOString(),
    });
  }
});
for (let i = 0; i < attendance.length; i += 500) {
  must(await db.from("attendance").insert(attendance.slice(i, i + 500)), "Adding attendance");
}
console.log(`Added ${insertedEvents.length} events and ${attendance.length} check-ins`);

// Officer terms and handover guides
const HOLDERS = ["Ana Villareal", "Marco Delgado", "Isabel Cortez", "Paolo Mercado", "Rina Alonzo", "Dante Robles"];
const termRows = scenario.terms.map(([role, endDay], i) => ({
  org_id: orgId,
  member_id: null,
  holder_name: HOLDERS[i % HOLDERS.length],
  role_title: role,
  term_name: `AY 2026-27 ${TERM_SUFFIX}`,
  start_date: manilaDate(-150),
  end_date: manilaDate(endDay),
}));
const insertedTerms = must(await db.from("officer_terms").insert(termRows).select("id, role_title"), "Adding officer terms").data;

const guideRows = scenario.terms
  .map(([role, , guideStatus]) => ({ role, guideStatus }))
  .filter((g) => g.guideStatus)
  .map(({ role, guideStatus }) => ({
    org_id: orgId,
    term_id: insertedTerms.find((t) => t.role_title === role).id,
    role_title: role,
    status: guideStatus,
    finalized_at: guideStatus === "ready" ? daysAgoIso(5) : null,
    sections: {
      what_i_do: `Day to day, the ${role} keeps the org running: answers officer questions, signs off on requests and reports to the adviser.`,
      recurring_tasks: guideStatus === "ready" ? "Weekly: review the inbox.\nMonthly: send the officers' report.\nEvery semester: renew accreditation." : "",
      key_contacts: guideStatus === "ready" ? "Adviser: Prof. Reyes\nStudent affairs office: Ms. Lim" : "",
      open_items: guideStatus === "ready" ? "Renew the room reservation for next semester." : "",
      where_things_are: guideStatus === "ready" ? "Shared drive, folder Officers 2026-27." : "",
      linked_document_ids: [],
    },
  }));
if (guideRows.length) must(await db.from("handover_guides").insert(guideRows), "Adding handover guides");
console.log(`Added ${insertedTerms.length} officer terms and ${guideRows.length} handover guides`);

// Documents: links only, so nothing needs storage
const DOCS = [
  ["Budget template", "Finance"],
  ["Semester budget", "Finance"],
  ["Receipts folder", "Finance"],
  ["Organization bylaws", "Legal"],
  ["Accreditation form", "Legal"],
  ["Event proposal template", "Templates"],
  ["Poster template", "Templates"],
  ["Meeting minutes archive", "General"],
];
must(
  await db.from("documents").insert(
    DOCS.map(([title, category], i) => ({
      org_id: orgId,
      title: `${PREFIX}${title}`,
      category,
      kind: "link",
      url: `https://example.com/orgkit-sample/${i + 1}`,
      created_at: daysAgoIso(3 + i * 9),
    }))
  ),
  "Adding documents"
);
console.log(`Added ${DOCS.length} documents`);

console.log("\nDone. Reload Home to see it. Remove it all with: --clean");
