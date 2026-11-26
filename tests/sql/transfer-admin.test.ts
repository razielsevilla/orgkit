import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { as, addMember, addOfficer, addOrg, errorOf, getDb, startDb } from "./helpers.ts";

/**
 * H5: transfer_admin_rights runs as the real `authenticated` / `anon` roles, so
 * grants and row level security apply. The checks are the same ones the action
 * relies on: only an admin, only inside their own org, never leaving an org
 * without an admin, and every successful transfer logged.
 */

let seq = 0;
const email = (tag: string) => `h5.${tag}.${++seq}@school.edu`;

/** A fresh org with an admin, an officer and a finance member, so tests never share state. */
async function freshOrg() {
  const admin = await addOfficer(email("admin"), "H5 Admin");
  const orgId = await addOrg(admin, `H5 Org ${++seq}`);
  const officer = await addMember(orgId, email("officer"), "officer");
  const finance = await addMember(orgId, email("finance"), "finance");
  return { admin, orgId, officer, finance };
}

const transferAs = (
  role: "authenticated" | "anon",
  user: string | null,
  orgId: string,
  target: string,
  callerNewRole: string
) =>
  as(role, user, () =>
    getDb().query(`select public.transfer_admin_rights($1, $2, $3)`, [orgId, target, callerNewRole])
  );

async function roleOf(orgId: string, officerId: string): Promise<string | null> {
  const res = await getDb().query<{ role: string }>(
    `select role from public.org_officers where org_id = $1 and officer_id = $2`,
    [orgId, officerId]
  );
  return res.rows[0]?.role ?? null;
}

async function adminCount(orgId: string): Promise<number> {
  const res = await getDb().query<{ n: number }>(
    `select count(*)::int as n from public.org_officers where org_id = $1 and role = 'admin'`,
    [orgId]
  );
  return res.rows[0].n;
}

async function logRows(orgId: string) {
  const res = await getDb().query<{
    transferred_by: string;
    transferred_to: string;
    previous_caller_role: string;
    new_caller_role: string;
  }>(
    `select transferred_by, transferred_to, previous_caller_role, new_caller_role
       from public.admin_transfers_log where org_id = $1 order by created_at`,
    [orgId]
  );
  return res.rows;
}

before(async () => {
  await startDb();
});

describe("H5: transfer_admin_rights, successful transfers", () => {
  it("promotes the target, demotes the caller to officer and logs it", async () => {
    const { admin, orgId, officer } = await freshOrg();

    await transferAs("authenticated", admin, orgId, officer, "officer");

    assert.equal(await roleOf(orgId, officer), "admin");
    assert.equal(await roleOf(orgId, admin), "officer");
    assert.equal(await adminCount(orgId), 1);
    assert.deepEqual(await logRows(orgId), [
      {
        transferred_by: admin,
        transferred_to: officer,
        previous_caller_role: "admin",
        new_caller_role: "officer",
      },
    ]);
  });

  it("can move the caller to finance", async () => {
    const { admin, orgId, officer } = await freshOrg();

    await transferAs("authenticated", admin, orgId, officer, "finance");

    assert.equal(await roleOf(orgId, admin), "finance");
    assert.equal(await roleOf(orgId, officer), "admin");
    assert.equal((await logRows(orgId))[0].new_caller_role, "finance");
  });

  it("can remove the caller from the org and still leaves an admin", async () => {
    const { admin, orgId, finance } = await freshOrg();

    await transferAs("authenticated", admin, orgId, finance, "remove");

    assert.equal(await roleOf(orgId, admin), null);
    assert.equal(await roleOf(orgId, finance), "admin");
    assert.equal(await adminCount(orgId), 1);
    assert.equal((await logRows(orgId))[0].new_caller_role, "remove");
  });
});

describe("H5: transfer_admin_rights, rejections", () => {
  it("rejects a non-admin caller and changes nothing", async () => {
    const { admin, orgId, officer, finance } = await freshOrg();

    const err = await errorOf(() => transferAs("authenticated", officer, orgId, finance, "officer"));

    assert.match(err ?? "", /not_authorized/);
    assert.equal(await roleOf(orgId, admin), "admin");
    assert.equal(await roleOf(orgId, finance), "finance");
    assert.equal(await roleOf(orgId, officer), "officer");
    assert.equal((await logRows(orgId)).length, 0);
  });

  it("rejects a target who is not in the org", async () => {
    const { admin, orgId } = await freshOrg();
    const outsider = await addOfficer(email("outsider"));

    const err = await errorOf(() => transferAs("authenticated", admin, orgId, outsider, "officer"));

    assert.match(err ?? "", /officer_not_found/);
    assert.equal(await roleOf(orgId, admin), "admin");
    assert.equal((await logRows(orgId)).length, 0);
  });

  it("rejects transferring to yourself", async () => {
    const { admin, orgId } = await freshOrg();

    const err = await errorOf(() => transferAs("authenticated", admin, orgId, admin, "officer"));

    assert.match(err ?? "", /cannot_transfer_to_self/);
    assert.equal(await roleOf(orgId, admin), "admin");
    assert.equal((await logRows(orgId)).length, 0);
  });

  it("rejects a role that is not officer, finance or remove", async () => {
    const { admin, orgId, officer } = await freshOrg();

    for (const bad of ["admin", "owner", ""]) {
      const err = await errorOf(() => transferAs("authenticated", admin, orgId, officer, bad));
      assert.match(err ?? "", /invalid_role/, `role "${bad}"`);
    }

    assert.equal(await roleOf(orgId, admin), "admin");
    assert.equal(await roleOf(orgId, officer), "officer");
    assert.equal((await logRows(orgId)).length, 0);
  });

  it("rejects a signed-out call (anon)", async () => {
    const { admin, orgId, officer } = await freshOrg();

    const err = await errorOf(() => transferAs("anon", null, orgId, officer, "officer"));

    assert.ok(err, "anon must not be able to call the function");
    assert.equal(await roleOf(orgId, admin), "admin");
    assert.equal((await logRows(orgId)).length, 0);
  });

  it("an admin of org A cannot transfer inside org B", async () => {
    const a = await freshOrg();
    const b = await freshOrg();

    const err = await errorOf(() => transferAs("authenticated", a.admin, b.orgId, b.officer, "officer"));

    assert.match(err ?? "", /not_authorized/);
    assert.equal(await roleOf(b.orgId, b.admin), "admin");
    assert.equal(await roleOf(b.orgId, b.officer), "officer");
    assert.equal((await logRows(b.orgId)).length, 0);
  });
});

describe("H5: the org always keeps an admin", () => {
  it("has exactly one admin after every successful transfer, across repeated hand-offs", async () => {
    const { admin, orgId, officer, finance } = await freshOrg();

    await transferAs("authenticated", admin, orgId, officer, "officer");
    assert.equal(await adminCount(orgId), 1);

    await transferAs("authenticated", officer, orgId, finance, "remove");
    assert.equal(await adminCount(orgId), 1);
    assert.equal(await roleOf(orgId, finance), "admin");

    assert.equal((await logRows(orgId)).length, 2);
  });

  it("a former admin can no longer transfer", async () => {
    const { admin, orgId, officer, finance } = await freshOrg();
    await transferAs("authenticated", admin, orgId, officer, "officer");

    const err = await errorOf(() => transferAs("authenticated", admin, orgId, finance, "officer"));

    assert.match(err ?? "", /not_authorized/);
    assert.equal(await roleOf(orgId, officer), "admin");
  });
});

describe("H5: admin_transfers_log access", () => {
  it("is not readable or writable directly by authenticated users", async () => {
    const { admin, orgId, officer } = await freshOrg();
    await transferAs("authenticated", admin, orgId, officer, "officer");

    // Row level security with no policy: reads return nothing, writes are refused
    const read = await as("authenticated", admin, () =>
      getDb().query(`select * from public.admin_transfers_log where org_id = $1`, [orgId])
    );
    assert.equal(read.rows.length, 0);

    const write = await errorOf(() =>
      as("authenticated", admin, () =>
        getDb().query(
          `insert into public.admin_transfers_log (org_id, transferred_by, transferred_to, new_caller_role)
           values ($1, $2, $3, 'officer')`,
          [orgId, admin, officer]
        )
      )
    );
    assert.ok(write, "a direct insert must be refused");
    assert.equal((await logRows(orgId)).length, 1);
  });

  it("is granted to the service role (which bypasses row level security on Supabase)", async () => {
    const res = await getDb().query<{ ok: boolean }>(
      `select has_table_privilege('service_role', 'public.admin_transfers_log', 'SELECT') as ok`
    );
    assert.equal(res.rows[0].ok, true);
  });
});
