import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { as, addOfficer, addOrg, errorOf, getDb, startDb } from "./helpers.ts";

/**
 * Who may execute the SECURITY DEFINER functions. These run with the owner's rights
 * and skip row level security, so a signed-out caller (anon) must never be able to
 * start one. Postgres and Supabase both grant EXECUTE to anon by default, so every
 * function has to revoke it explicitly.
 */

before(async () => {
  await startDb();
});

describe("SECURITY DEFINER functions in public", () => {
  it("cannot be executed by anon or by PUBLIC", async () => {
    const { rows } = await getDb().query<{ proname: string; args: string }>(`
      select p.proname, pg_get_function_identity_arguments(p.oid) as args
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public'
         and p.prosecdef
         and (has_function_privilege('anon', p.oid, 'execute')
              or has_function_privilege('public', p.oid, 'execute'))
       order by 1
    `);
    assert.deepEqual(
      rows.map((r) => `${r.proname}(${r.args})`),
      [],
      "these definer functions are still open to anon: add a revoke ... from public, anon"
    );
  });
});

describe("definer functions closed to anon in S1", () => {
  it("anon is refused at the grant, before the function body runs", async () => {
    const db = getDb();
    const id = "00000000-0000-4000-8000-0000000000aa";
    for (const call of [`select public.confirm_member($1)`, `select public.get_org_join_link($1)`]) {
      const err = await as("anon", null, () => errorOf(() => db.query(call, [id])));
      assert.match(String(err), /permission denied/i, call);
    }
  });

  it("an officer can still use both", async () => {
    const db = getDb();
    const admin = await addOfficer("admin.s1@school.edu", "Admin S1");
    const org = await addOrg(admin, "S1 Org");
    const { rows } = await db.query<{ id: string }>(
      `insert into public.members (org_id, full_name, email, email_key, consent_version, consent_language, status)
       values ($1, 'Pending S1', 'pending.s1@school.edu', 'pending.s1@school.edu', 'd4-2026-10-31', 'en', 'pending')
       returning id`,
      [org]
    );
    const member = rows[0].id;

    await as("authenticated", admin, async () => {
      await db.query(`select public.get_org_join_link($1)`, [org]);
      await db.query(`select public.confirm_member($1)`, [member]);
    });
  });
});
