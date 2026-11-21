import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { as, addMember, addOfficer, addOrg, getDb, startDb } from "./helpers.ts";

/**
 * Two submissions that race past submit_dues_payment's own checks are stopped by a
 * unique index, not by one of the function's named errors. The pay form turns that
 * into "already submitted" or "reference already used" by reading the index name
 * from the error message (src/app/pay/[token]/actions.ts). These tests pin down,
 * against a real Postgres, exactly what that error looks like, so the mapping rests
 * on observed behavior and a rename of an index or a change in the wording fails here.
 */

const MEMBER_INDEX = "dues_payments_active_member_period_idx";
const REFERENCE_INDEX = "dues_payments_org_reference_key_idx";

let orgId: string;
let periodId: string;
let memberOne: string;
let memberTwo: string;

async function createMember(email: string): Promise<string> {
  const res = await getDb().query<{ id: string }>(
    `insert into public.members (org_id, full_name, email, email_key, consent_version, consent_language, status, created_at)
     values ($1, 'Student Member', $2, lower($2), 'v1', 'en', 'active', now())
     returning id`,
    [orgId, email]
  );
  return res.rows[0].id;
}

function insertPayment(memberId: string, referenceKey: string, status = "submitted") {
  return getDb().query(
    `insert into public.dues_payments
       (org_id, period_id, member_id, amount, reference_no, reference_key, screenshot_path, status, submitted_at)
     values ($1, $2, $3, 250, upper($4), $4, $5, $6, now())`,
    [orgId, periodId, memberId, referenceKey, `${orgId}/${referenceKey}.png`, status]
  );
}

/** What the API would hand the app for a failed statement: Postgres' code and message */
async function failureOf(run: () => Promise<unknown>): Promise<{ code?: string; message: string } | null> {
  try {
    await run();
    return null;
  } catch (err) {
    const e = err as { code?: string; message?: string };
    return { code: e.code, message: e.message ?? String(err) };
  }
}

before(async () => {
  await startDb();
  const adminId = await addOfficer("admin.unique.violations@school.edu", "Admin Unique Violations");
  orgId = await addOrg(adminId, "Unique Violations Org");
  await addMember(orgId, "officer.unique.violations@school.edu", "officer");

  memberOne = await createMember("member.one.unique@school.edu");
  memberTwo = await createMember("member.two.unique@school.edu");

  const db = getDb();
  const period = await as("authenticated", adminId, () =>
    db.query<{ create_dues_period: string }>(`select public.create_dues_period($1, $2, $3, $4)`, [
      orgId,
      "Unique Violations Dues",
      250.0,
      "2026-12-15",
    ])
  );
  periodId = period.rows[0].create_dues_period;
});

describe("unique violations on dues_payments, as the API reports them", () => {
  it("a second active payment for the same member and period names the member/period index", async () => {
    await insertPayment(memberOne, "unique-ref-a");

    const failure = await failureOf(() => insertPayment(memberOne, "unique-ref-b"));

    assert.ok(failure, "the second insert should be refused");
    assert.equal(failure.code, "23505");
    assert.ok(
      failure.message.includes(`duplicate key value violates unique constraint "${MEMBER_INDEX}"`),
      `unexpected message: ${failure.message}`
    );
  });

  it("a reference number already used in the org names the reference index", async () => {
    const failure = await failureOf(() => insertPayment(memberTwo, "unique-ref-a"));

    assert.ok(failure, "the insert should be refused");
    assert.equal(failure.code, "23505");
    assert.ok(
      failure.message.includes(`duplicate key value violates unique constraint "${REFERENCE_INDEX}"`),
      `unexpected message: ${failure.message}`
    );
  });

  it("the member/period index and the reference index are told apart by name alone", async () => {
    // same member AND same reference: one of the two fires, and it is always one of the two names
    const failure = await failureOf(() => insertPayment(memberOne, "unique-ref-a"));
    assert.ok(failure);
    assert.equal(failure.code, "23505");
    assert.ok(
      failure.message.includes(`"${MEMBER_INDEX}"`) || failure.message.includes(`"${REFERENCE_INDEX}"`)
    );
  });

  it("does not report a violation once the earlier payment has been rejected (the indexes are partial)", async () => {
    const db = getDb();
    await db.query(`update public.dues_payments set status = 'rejected' where member_id = $1`, [memberOne]);

    const failure = await failureOf(() => insertPayment(memberOne, "unique-ref-c"));

    assert.equal(failure, null);
  });

  it("the pay form's rules use exactly the wording and index names observed here", () => {
    const source = readFileSync(join(import.meta.dirname, "../../src/app/pay/[token]/actions.ts"), "utf8");
    assert.ok(source.includes(`unique constraint "${MEMBER_INDEX}"`));
    assert.ok(source.includes(`unique constraint "${REFERENCE_INDEX}"`));
  });
});
