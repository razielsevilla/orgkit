#!/usr/bin/env node
/**
 * Fills one org with dummy members and invitations so Epic 2 can be tested by
 * hand: roster paging and search, status tabs, edit and deactivate, the Invited
 * view, the import preview and the CSV export.
 *
 *   node --env-file=.env.local scripts/seed-members.mjs <orgId>            dry run, writes nothing
 *   node --env-file=.env.local scripts/seed-members.mjs <orgId> --apply    writes the dummy rows
 *   node --env-file=.env.local scripts/seed-members.mjs <orgId> --clean    removes them again
 *   node --env-file=.env.local scripts/seed-members.mjs <orgId> --clean-invites   removes only the dummy invitations
 *
 * Every dummy row uses an @seed.orgkit.test email, and --clean deletes only
 * rows with that domain, so real members are never touched. Running --apply
 * twice adds nothing new (rows are matched on org and email).
 *
 * It writes with the service-role key from .env.local, so it goes to whichever
 * Supabase project that file points at. The target is printed before anything
 * is written.
 */
import { createClient } from "@supabase/supabase-js";

const SEED_DOMAIN = "seed.orgkit.test";
const CONSENT_VERSION = "member-consent-v1";
const DAY_MS = 24 * 60 * 60 * 1000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MEMBER_COUNT = 120;
const PENDING_MEMBERS = 15;
const INACTIVE_MEMBERS = 15;
const PENDING_INVITES = 14;
const JOINED_INVITES = 5;

// ── Deterministic data, so every run produces the same people ──────────────

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

const FIRST = [
  "Juan", "Maria", "Jose", "Ana", "Mark", "Angelica", "Paolo", "Bea", "Carlo", "Denise",
  "Miguel", "Kristine", "Rafael", "Jasmine", "Gabriel", "Nicole", "Daniel", "Trisha", "Lorenzo", "Camille",
];
const LAST = [
  "Santos", "Reyes", "Cruz", "Bautista", "Ocampo", "Garcia", "Mendoza", "Torres", "Villanueva", "Ramos",
  "Aquino", "Castillo", "Flores", "Navarro", "Salazar", "Domingo", "Pascual", "Soriano", "Dela Cruz", "Del Rosario",
];

/** People that exercise awkward cases: accents, apostrophes, hyphens, a very long name */
const SPECIAL_NAMES = [
  "Niño Peña",
  "Maria Cristina O'Brien-Santos",
  "José Rizal Jr.",
  "Zoë Ångström",
  "Bartolomé de las Casas y Villanueva de la Santísima Trinidad del Rosario Fernández-Aguilar",
];

const slug = (text) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.|\.$/g, "")
    .slice(0, 40);

function buildMembers(now) {
  const rand = mulberry32(2026);
  const members = [];

  for (let i = 0; i < MEMBER_COUNT; i++) {
    const fullName =
      i < SPECIAL_NAMES.length
        ? SPECIAL_NAMES[i]
        : `${FIRST[i % FIRST.length]} ${LAST[Math.floor(i / FIRST.length) % LAST.length]}`;

    // The first block is pending, the next inactive, the rest active
    const status = i < PENDING_MEMBERS ? "pending" : i < PENDING_MEMBERS + INACTIVE_MEMBERS ? "inactive" : "active";

    // Pending people joined recently; everyone else is spread over the last year
    const ageDays = status === "pending" ? rand() * 10 : 10 + rand() * 355;
    const createdAt = new Date(now - ageDays * DAY_MS).toISOString();

    // A few emails keep capital letters, to check they are stored and matched in lowercase
    const local = `${slug(fullName)}.${i + 1}`;
    const email = i % 17 === 0 ? `${local}@${SEED_DOMAIN}`.replace(/^./, (c) => c.toUpperCase()) : `${local}@${SEED_DOMAIN}`;

    members.push({
      full_name: fullName,
      email,
      email_key: email.toLowerCase(),
      status,
      consent_version: CONSENT_VERSION,
      consent_language: i % 5 === 0 ? "fil" : "en",
      consent_at: createdAt,
      created_at: createdAt,
    });
  }
  return members;
}

function buildInvites(members, now) {
  const rand = mulberry32(7);
  const invites = [];

  const add = (email, name, ageDays, joined) => {
    const createdAt = new Date(now - ageDays * DAY_MS);
    invites.push({
      email,
      email_key: email.toLowerCase(),
      name,
      created_at: createdAt.toISOString(),
      expires_at: new Date(createdAt.getTime() + 60 * DAY_MS).toISOString(),
      joined_at: joined ? new Date(createdAt.getTime() + 2 * DAY_MS).toISOString() : null,
    });
  };

  for (let i = 0; i < PENDING_INVITES; i++) {
    const name = i % 3 === 0 ? null : `${FIRST[(i + 3) % FIRST.length]} ${LAST[(i + 7) % LAST.length]}`;
    add(`invitee.${i + 1}@${SEED_DOMAIN}`, name, rand() * 20, false);
  }
  // One invitation that runs out tomorrow
  add(`invitee.expiring@${SEED_DOMAIN}`, "Expiring Soon", 59, false);

  // Invitations already used: the person joined with the same email
  const active = members.filter((m) => m.status === "active").slice(0, JOINED_INVITES);
  active.forEach((m, i) => add(m.email, m.full_name, 20 + i * 3, true));

  return invites;
}

// ── Run ────────────────────────────────────────────────────────────────────

const [orgId, ...flags] = process.argv.slice(2);
const apply = flags.includes("--apply");
const clean = flags.includes("--clean");
const cleanInvites = flags.includes("--clean-invites");

if (!orgId || !UUID.test(orgId) || (apply && (clean || cleanInvites)) || (clean && cleanInvites)) {
  console.error("Usage: node --env-file=.env.local scripts/seed-members.mjs <orgId> [--apply | --clean | --clean-invites]");
  console.error("Find the org id in the workspace URL: /workspace/<orgId>");
  process.exit(1);
}

const now = Date.now();
const members = buildMembers(now);
const invites = buildInvites(members, now);
const count = (status) => members.filter((m) => m.status === status).length;

console.log(`Plan for org ${orgId}`);
console.log(
  `  members:     ${members.length} (${count("active")} active, ${count("pending")} pending, ${count("inactive")} inactive)`
);
console.log(
  `  invitations: ${invites.length} (${invites.filter((i) => !i.joined_at).length} waiting, ${invites.filter((i) => i.joined_at).length} joined)`
);

if (!apply && !clean && !cleanInvites) {
  console.log("\nDry run: nothing was written. Add --apply to write these rows, or --clean / --clean-invites to remove them.");
  process.exit(0);
}

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

const seedEmails = `%@${SEED_DOMAIN}`;

if (cleanInvites) {
  const total = await db.from("member_invites").select("id", { count: "exact", head: true }).eq("org_id", orgId);
  const removed = await db.from("member_invites").delete({ count: "exact" }).eq("org_id", orgId).like("email_key", seedEmails);
  if (total.error || removed.error) {
    console.error("Clean failed:", (total.error ?? removed.error).message);
    process.exit(1);
  }
  console.log(`Removed ${removed.count} dummy invitations. ${total.count - removed.count} other invitations were left alone.`);
  process.exit(0);
}

if (clean) {
  const removedMembers = await db.from("members").delete({ count: "exact" }).eq("org_id", orgId).like("email_key", seedEmails);
  const removedInvites = await db.from("member_invites").delete({ count: "exact" }).eq("org_id", orgId).like("email_key", seedEmails);
  for (const result of [removedMembers, removedInvites]) {
    if (result.error) {
      console.error("Clean failed:", result.error.message);
      process.exit(1);
    }
  }
  console.log(`Removed ${removedMembers.count} dummy members and ${removedInvites.count} dummy invitations.`);
  process.exit(0);
}

async function insert(table, rows) {
  const { error } = await db
    .from(table)
    .upsert(rows.map((row) => ({ ...row, org_id: orgId })), { onConflict: "org_id,email_key", ignoreDuplicates: true });
  if (error) {
    console.error(`Could not write ${table}:`, error.message);
    process.exit(1);
  }
}

await insert("members", members);
await insert("member_invites", invites);
console.log("Done. Open the Members page and reload.");
console.log("Things to try: search 'Santos', 'Niño', \"O'Brien\"; the Pending / Inactive tabs; Load more (50 per page);");
console.log("the Invited tab; Export; and importing scripts/sample-roster.csv.");
