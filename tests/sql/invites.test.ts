import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";

/**
 * Runs the real migrations in an in-process Postgres (PGlite) and calls the A3
 * database functions directly. Supabase pieces the migrations lean on are
 * stubbed: auth.users, auth.uid() and the authenticated/service_role roles.
 */

const MIGRATIONS_DIR = join(import.meta.dirname, "../../supabase/migrations");

const SUPABASE_STUBS = `
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  create role anon;
  create role authenticated;
  create role service_role;
  create schema extensions;
`;

let db: PGlite;
let seq = 0;

const hex = (n: number) => n.toString(16).padStart(12, "0");
const newUuid = () => `00000000-0000-4000-8000-${hex(++seq)}`;
/** A token-hash stand-in: the functions only store and compare it. */
const newHash = () => `hash-${++seq}`;

/** Acts as this signed-in user for following calls (what auth.uid() returns). */
async function actAs(userId: string | null) {
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [userId ?? ""]);
}

async function addOfficer(email: string, fullName = "Test Officer") {
  const id = newUuid();
  await db.query(`insert into auth.users (id) values ($1)`, [id]);
  await db.query(
    `insert into public.officers (id, google_sub, email, full_name, consent_version, consent_at)
     values ($1, $2, $3, $4, 'v1', now())`,
    [id, `sub-${id}`, email, fullName]
  );
  return id;
}

/** Creates an org through create_organization, so the creator becomes admin. */
async function addOrg(adminId: string, name = `Org ${++seq}`) {
  await actAs(adminId);
  const res = await db.query<{ create_organization: string }>(
    `select public.create_organization($1, null)`,
    [name]
  );
  return res.rows[0].create_organization;
}

async function addMember(orgId: string, email: string, role: string) {
  const id = await addOfficer(email);
  await db.query(`insert into public.org_officers (org_id, officer_id, role) values ($1, $2, $3)`, [
    orgId,
    id,
    role,
  ]);
  return id;
}

interface InviteResult {
  invite_id: string;
  raw_token: string | null;
  token_hash: string;
}

async function invite(orgId: string, email: string, role = "officer", hash = newHash()) {
  const res = await db.query<{ create_invite: InviteResult }>(
    `select public.create_invite($1, $2, $3, null, $4)`,
    [orgId, email, role, hash]
  );
  return { ...res.rows[0].create_invite, hash };
}

async function accept(hash: string) {
  const res = await db.query<{ accept_invite: { status: string; org_id?: string } }>(
    `select public.accept_invite($1)`,
    [hash]
  );
  return res.rows[0].accept_invite;
}

async function roleOf(orgId: string, officerId: string) {
  const res = await db.query<{ role: string }>(
    `select role from public.org_officers where org_id = $1 and officer_id = $2`,
    [orgId, officerId]
  );
  return res.rows[0]?.role ?? null;
}

before(async () => {
  db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(SUPABASE_STUBS);
  for (const file of readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(join(MIGRATIONS_DIR, file), "utf8"));
  }
});

after(async () => {
  await db.close();
});

describe("create_invite", () => {
  it("lets an admin create a pending invite that expires in 7 days", async () => {
    const admin = await addOfficer("admin1@school.edu");
    const org = await addOrg(admin);
    const res = await invite(org, "new.finance@school.edu", "finance");

    const row = (
      await db.query<{ role: string; days: number; used_at: string | null }>(
        `select role, extract(epoch from (expires_at - created_at)) / 86400 as days, used_at
         from public.org_invites where id = $1`,
        [res.invite_id]
      )
    ).rows[0];
    assert.equal(row.role, "finance");
    assert.equal(Math.round(Number(row.days)), 7);
    assert.equal(row.used_at, null);
  });

  it("stores only the token hash, never the raw token", async () => {
    const admin = await addOfficer("admin2@school.edu");
    const org = await addOrg(admin);
    await actAs(admin);
    const res = await db.query<{ create_invite: InviteResult }>(
      `select public.create_invite($1, 'someone@school.edu', 'officer')`,
      [org]
    );
    const { raw_token, token_hash } = res.rows[0].create_invite;
    assert.ok(raw_token && raw_token.length >= 43, "database generates a long random token");

    const dump = await db.query(`select to_jsonb(i)::text as t from public.org_invites i where token_hash = $1`, [
      token_hash,
    ]);
    assert.equal(dump.rows.length, 1);
    assert.equal(dump.rows[0].t.includes(raw_token), false, "raw token is not in any column");
  });

  it("refuses finance and officer roles, and anyone outside the org", async () => {
    const admin = await addOfficer("admin3@school.edu");
    const org = await addOrg(admin);
    const finance = await addMember(org, "fin3@school.edu", "finance");
    const officer = await addMember(org, "off3@school.edu", "officer");
    const outsider = await addOfficer("outsider3@school.edu");

    for (const who of [finance, officer, outsider]) {
      await actAs(who);
      await assert.rejects(() => invite(org, "x@school.edu"), /not_authorized/);
    }
  });

  it("rejects an invalid email format and an invalid role", async () => {
    const admin = await addOfficer("admin4@school.edu");
    const org = await addOrg(admin);
    await actAs(admin);
    await assert.rejects(() => invite(org, "not-an-email"), /invalid_email/);
    await assert.rejects(() => invite(org, "a@b"), /invalid_email/);
    await assert.rejects(() => invite(org, "ok@school.edu", "owner"), /invalid_role/);
  });

  it("refuses an email that is already an officer, ignoring case", async () => {
    const admin = await addOfficer("admin5@school.edu");
    const org = await addOrg(admin);
    await addMember(org, "Member5@School.edu", "officer");
    await actAs(admin);
    await assert.rejects(() => invite(org, "  member5@school.EDU "), /already_officer/);
  });

  it("replaces a pending invite for the same email, and the old link stops working", async () => {
    const admin = await addOfficer("admin6@school.edu");
    const org = await addOrg(admin);
    const joiner = await addOfficer("joiner6@school.edu");
    const first = await invite(org, "joiner6@school.edu", "officer");
    const second = await invite(org, "Joiner6@school.edu", "finance");

    const pending = await db.query(
      `select id from public.org_invites where org_id = $1 and used_at is null and revoked_at is null`,
      [org]
    );
    assert.equal(pending.rows.length, 1, "only the new invite is pending");

    await actAs(joiner);
    assert.equal((await accept(first.hash)).status, "invalid");
    assert.equal((await accept(second.hash)).status, "success");
    assert.equal(await roleOf(org, joiner), "finance", "the new invite's role wins");
  });

  it("enforces the limit of 30 pending invites, but still allows replacing one", async () => {
    const admin = await addOfficer("admin7@school.edu");
    const org = await addOrg(admin);
    await actAs(admin);
    for (let i = 0; i < 30; i++) await invite(org, `p${i}-7@school.edu`);
    await assert.rejects(() => invite(org, "one-too-many@school.edu"), /invite_limit_reached/);
    await invite(org, "p0-7@school.edu", "finance"); // replacement does not add a pending invite
  });

  it("enforces the limit of 30 officers", async () => {
    const admin = await addOfficer("admin8@school.edu");
    const org = await addOrg(admin);
    for (let i = 0; i < 29; i++) await addMember(org, `m${i}-8@school.edu`, "officer");
    await actAs(admin);
    await assert.rejects(() => invite(org, "thirty-first@school.edu"), /officer_limit_reached/);
  });
});

describe("accept_invite", () => {
  it("adds the invitee with the invited role and marks the invite used", async () => {
    const admin = await addOfficer("admin9@school.edu");
    const org = await addOrg(admin);
    const joiner = await addOfficer("joiner9@school.edu");
    const inv = await invite(org, "joiner9@school.edu", "finance");

    await actAs(joiner);
    const res = await accept(inv.hash);
    assert.equal(res.status, "success");
    assert.equal(res.org_id, org);
    assert.equal(await roleOf(org, joiner), "finance");

    const row = (
      await db.query<{ used_at: string | null; email: string | null }>(
        `select used_at, email from public.org_invites where id = $1`,
        [inv.invite_id]
      )
    ).rows[0];
    assert.notEqual(row.used_at, null);
    assert.equal(row.email, null, "invited email is dropped once used");
  });

  it("matches the email case-insensitively", async () => {
    const admin = await addOfficer("admin10@school.edu");
    const org = await addOrg(admin);
    const joiner = await addOfficer("Mixed.Case10@School.EDU");
    const inv = await invite(org, "mixed.case10@school.edu");
    await actAs(joiner);
    assert.equal((await accept(inv.hash)).status, "success");
  });

  it("does not add someone signed in with a different email", async () => {
    const admin = await addOfficer("admin11@school.edu");
    const org = await addOrg(admin);
    const wrong = await addOfficer("wrong11@school.edu");
    const inv = await invite(org, "intended11@school.edu");

    await actAs(wrong);
    const res = await accept(inv.hash);
    assert.equal(res.status, "email_mismatch");
    assert.equal(JSON.stringify(res).includes("intended11"), false, "never reveals the invited address");
    assert.equal(await roleOf(org, wrong), null);

    // the invite is untouched and still works for the right person
    const right = await addOfficer("intended11@school.edu");
    await actAs(right);
    assert.equal((await accept(inv.hash)).status, "success");
  });

  it("is single-use: a second open after use is invalid", async () => {
    const admin = await addOfficer("admin12@school.edu");
    const org = await addOrg(admin);
    const joiner = await addOfficer("joiner12@school.edu");
    const inv = await invite(org, "joiner12@school.edu");
    await actAs(joiner);
    assert.equal((await accept(inv.hash)).status, "success");
    assert.equal((await accept(inv.hash)).status, "invalid");
  });

  it("treats an invite older than 7 days as invalid", async () => {
    const admin = await addOfficer("admin13@school.edu");
    const org = await addOrg(admin);
    const joiner = await addOfficer("joiner13@school.edu");
    const inv = await invite(org, "joiner13@school.edu");
    await db.query(
      `update public.org_invites set created_at = now() - interval '8 days',
         expires_at = now() - interval '1 day' where id = $1`,
      [inv.invite_id]
    );
    await actAs(joiner);
    assert.equal((await accept(inv.hash)).status, "invalid");
    assert.equal(await roleOf(org, joiner), null);
  });

  it("treats an unknown token as invalid", async () => {
    const joiner = await addOfficer("joiner14@school.edu");
    await actAs(joiner);
    assert.equal((await accept("no-such-hash")).status, "invalid");
  });

  it("refuses an invitee who already belongs to another org", async () => {
    const adminA = await addOfficer("adminA15@school.edu");
    const orgA = await addOrg(adminA);
    const adminB = await addOfficer("adminB15@school.edu");
    const orgB = await addOrg(adminB);
    const busy = await addMember(orgA, "busy15@school.edu", "officer");
    const inv = await invite(orgB, "busy15@school.edu");

    await actAs(busy);
    assert.equal((await accept(inv.hash)).status, "in_other_org");
    assert.equal(await roleOf(orgB, busy), null);
    assert.equal(await roleOf(orgA, busy), "officer", "stays in the first org");
  });

  it("requires a signed-in officer who has agreed to the privacy notice", async () => {
    const admin = await addOfficer("admin16@school.edu");
    const org = await addOrg(admin);
    const inv = await invite(org, "joiner16@school.edu");

    await actAs(null);
    assert.equal((await accept(inv.hash)).status, "not_authenticated");

    const noConsent = newUuid(); // signed in, but no officers row yet
    await db.query(`insert into auth.users (id) values ($1)`, [noConsent]);
    await actAs(noConsent);
    assert.equal((await accept(inv.hash)).status, "consent_required");
  });
});

describe("revoke_invite", () => {
  it("lets an admin revoke, and the link stops working", async () => {
    const admin = await addOfficer("admin17@school.edu");
    const org = await addOrg(admin);
    const joiner = await addOfficer("joiner17@school.edu");
    const inv = await invite(org, "joiner17@school.edu");

    await actAs(admin);
    await db.query(`select public.revoke_invite($1)`, [inv.invite_id]);

    await actAs(joiner);
    assert.equal((await accept(inv.hash)).status, "invalid");
  });

  it("refuses non-admins", async () => {
    const admin = await addOfficer("admin18@school.edu");
    const org = await addOrg(admin);
    const officer = await addMember(org, "off18@school.edu", "officer");
    const inv = await invite(org, "joiner18@school.edu");

    await actAs(officer);
    await assert.rejects(() => db.query(`select public.revoke_invite($1)`, [inv.invite_id]), /not_authorized/);
  });
});

describe("change_role and remove_officer", () => {
  it("applies a role change straight away", async () => {
    const admin = await addOfficer("admin19@school.edu");
    const org = await addOrg(admin);
    const member = await addMember(org, "m19@school.edu", "officer");

    await actAs(admin);
    await db.query(`select public.change_role($1, 'finance')`, [member]);
    assert.equal(await roleOf(org, member), "finance");
  });

  it("refuses a role change or removal by a non-admin", async () => {
    const admin = await addOfficer("admin20@school.edu");
    const org = await addOrg(admin);
    const finance = await addMember(org, "fin20@school.edu", "finance");
    const target = await addMember(org, "t20@school.edu", "officer");

    await actAs(finance);
    await assert.rejects(() => db.query(`select public.change_role($1, 'admin')`, [target]), /not_authorized/);
    await assert.rejects(() => db.query(`select public.remove_officer($1)`, [target]), /not_authorized/);
    assert.equal(await roleOf(org, target), "officer");
  });

  it("will not demote or remove the last admin", async () => {
    const admin = await addOfficer("admin21@school.edu");
    const org = await addOrg(admin);
    await addMember(org, "m21@school.edu", "officer");

    await actAs(admin);
    await assert.rejects(() => db.query(`select public.change_role($1, 'officer')`, [admin]), /last_admin/);
    await assert.rejects(() => db.query(`select public.remove_officer($1)`, [admin]), /last_admin/);
    assert.equal(await roleOf(org, admin), "admin");
  });

  it("allows removing an admin once another admin exists", async () => {
    const admin = await addOfficer("admin22@school.edu");
    const org = await addOrg(admin);
    const second = await addMember(org, "second22@school.edu", "admin");

    await actAs(admin);
    await db.query(`select public.remove_officer($1)`, [second]);
    assert.equal(await roleOf(org, second), null);
    // now `admin` is the last admin again
    await assert.rejects(() => db.query(`select public.remove_officer($1)`, [admin]), /last_admin/);
  });

  it("cuts off a removed officer's admin powers on their next action", async () => {
    const admin = await addOfficer("admin23@school.edu");
    const org = await addOrg(admin);
    const second = await addMember(org, "second23@school.edu", "admin");

    await actAs(admin);
    await db.query(`select public.remove_officer($1)`, [second]);

    await actAs(second);
    await assert.rejects(() => invite(org, "late@school.edu"), /not_authorized/);
  });

  it("keeps one admin when two admins try to demote each other", async () => {
    const a = await addOfficer("a24@school.edu");
    const org = await addOrg(a);
    const b = await addMember(org, "b24@school.edu", "admin");

    await actAs(a);
    await db.query(`select public.change_role($1, 'officer')`, [b]); // ok: a stays admin
    await assert.rejects(() => db.query(`select public.change_role($1, 'officer')`, [a]), /last_admin/);
    const admins = await db.query(`select 1 from public.org_officers where org_id = $1 and role = 'admin'`, [org]);
    assert.equal(admins.rows.length, 1);
  });
});

describe("one org per officer", () => {
  it("is enforced by the database", async () => {
    const adminA = await addOfficer("adminA25@school.edu");
    await addOrg(adminA);
    const adminB = await addOfficer("adminB25@school.edu");
    const orgB = await addOrg(adminB);
    await assert.rejects(
      () => db.query(`insert into public.org_officers (org_id, officer_id, role) values ($1, $2, 'officer')`, [orgB, adminA]),
      /org_officers_one_org|duplicate key/
    );
  });

  it("makes the workspace creator an admin", async () => {
    const creator = await addOfficer("creator26@school.edu");
    const org = await addOrg(creator);
    assert.equal(await roleOf(org, creator), "admin");
  });
});

describe("retention cleanup", () => {
  it("deletes invites 30 days after use, revoke or expiry, and keeps newer ones", async () => {
    const admin = await addOfficer("admin27@school.edu");
    const org = await addOrg(admin);
    const mk = async (email: string) => (await invite(org, email)).invite_id;

    const usedOld = await mk("used-old@school.edu");
    const usedNew = await mk("used-new@school.edu");
    const revokedOld = await mk("revoked-old@school.edu");
    const expiredOld = await mk("expired-old@school.edu");
    const expiredNew = await mk("expired-new@school.edu");
    const pending = await mk("pending@school.edu");

    await db.query(`update public.org_invites set used_at = now() - interval '31 days' where id = $1`, [usedOld]);
    await db.query(`update public.org_invites set used_at = now() - interval '29 days' where id = $1`, [usedNew]);
    await db.query(`update public.org_invites set revoked_at = now() - interval '31 days' where id = $1`, [revokedOld]);
    await db.query(`update public.org_invites set expires_at = now() - interval '31 days' where id = $1`, [expiredOld]);
    await db.query(`update public.org_invites set expires_at = now() - interval '29 days' where id = $1`, [expiredNew]);

    const res = await db.query<{ cleanup_expired_invites: number }>(`select public.cleanup_expired_invites()`);
    assert.equal(res.rows[0].cleanup_expired_invites >= 3, true);

    const left = (await db.query<{ id: string }>(`select id from public.org_invites where org_id = $1`, [org])).rows.map(
      (r) => r.id
    );
    for (const id of [usedOld, revokedOld, expiredOld]) assert.equal(left.includes(id), false);
    for (const id of [usedNew, expiredNew, pending]) assert.equal(left.includes(id), true);
  });

  it("is not callable by signed-in users", async () => {
    const res = await db.query<{ allowed: boolean }>(
      `select has_function_privilege('authenticated', 'public.cleanup_expired_invites()', 'execute') as allowed`
    );
    assert.equal(res.rows[0].allowed, false);
    const svc = await db.query<{ allowed: boolean }>(
      `select has_function_privilege('service_role', 'public.cleanup_expired_invites()', 'execute') as allowed`
    );
    assert.equal(svc.rows[0].allowed, true);
  });
});
