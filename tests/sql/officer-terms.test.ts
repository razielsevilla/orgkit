import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { as, addMember, addOfficer, addOrg, errorOf, getDb, newUuid, startDb } from "./helpers.ts";

let orgA: string;
let orgB: string;
let adminA: string;
let officerA: string;
let adminB: string;
let officerB: string;
let memberA1: string;

const recordTermAs = (
  user: string | null,
  org: string,
  termName: string,
  roleTitle: string,
  holderName: string,
  startDate: string,
  endDate: string,
  memberId: string | null = null
) =>
  as("authenticated", user, () =>
    getDb().query<{ record_officer_term: string }>(
      `select public.record_officer_term($1, $2, $3, $4, $5, $6, $7)`,
      [org, termName, roleTitle, holderName, startDate, endDate, memberId]
    )
  );

const updateTermAs = (
  user: string | null,
  termId: string,
  termName: string,
  roleTitle: string,
  holderName: string,
  startDate: string,
  endDate: string,
  memberId: string | null = null
) =>
  as("authenticated", user, () =>
    getDb().query<{ update_officer_term: string }>(
      `select public.update_officer_term($1, $2, $3, $4, $5, $6, $7)`,
      [termId, termName, roleTitle, holderName, startDate, endDate, memberId]
    )
  );

const deleteTermAs = (user: string | null, termId: string) =>
  as("authenticated", user, () =>
    getDb().query<{ delete_officer_term: string }>(`select public.delete_officer_term($1)`, [termId])
  );

const selectTerms = (role: "authenticated" | "anon", user: string | null) =>
  as(role, user, () =>
    getDb().query<{
      id: string;
      org_id: string;
      term_name: string;
      role_title: string;
      holder_name: string;
      start_date: string;
      end_date: string;
    }>(`select * from public.officer_terms order by start_date desc, end_date desc`)
  );

before(async () => {
  await startDb();

  adminA = await addOfficer("admin.h1.a@school.edu", "Admin H1 A");
  orgA = await addOrg(adminA, "H1 Org A");
  officerA = await addMember(orgA, "officer.h1.a@school.edu", "officer");

  adminB = await addOfficer("admin.h1.b@school.edu", "Admin H1 B");
  orgB = await addOrg(adminB, "H1 Org B");
  officerB = await addMember(orgB, "officer.h1.b@school.edu", "officer");

  // Add a roster member to Org A
  const memberRes = await getDb().query<{ id: string }>(
    `insert into public.members (org_id, full_name, email, email_key, consent_version, consent_language)
     values ($1, 'Juan Dela Cruz', 'juan@school.edu', 'juan@school.edu', '1.0', 'en')
     returning id`,
    [orgA]
  );
  memberA1 = memberRes.rows[0].id;
});

describe("H1: record_officer_term", () => {
  it("allows an admin to record an officer term", async () => {
    const res = await recordTermAs(
      adminA,
      orgA,
      "A.Y. 2025-2026",
      "President",
      "Juan Dela Cruz",
      "2025-06-01",
      "2026-05-31",
      memberA1
    );
    assert.ok(res.rows[0].record_officer_term);

    const rows = await selectTerms("authenticated", adminA);
    const term = rows.rows.find((r) => r.id === res.rows[0].record_officer_term);
    assert.ok(term);
    assert.equal(term.role_title, "President");
    assert.equal(term.holder_name, "Juan Dela Cruz");
    assert.equal(term.term_name, "A.Y. 2025-2026");
  });

  it("refuses a non-admin officer from recording a term", async () => {
    const err = await errorOf(() =>
      recordTermAs(
        officerA,
        orgA,
        "A.Y. 2025-2026",
        "Secretary",
        "Maria Santos",
        "2025-06-01",
        "2026-05-31"
      )
    );
    assert.match(String(err), /not_admin/);
  });

  it("refuses an end date before start date", async () => {
    const err = await errorOf(() =>
      recordTermAs(
        adminA,
        orgA,
        "A.Y. 2025-2026",
        "Treasurer",
        "Maria Santos",
        "2026-05-31",
        "2025-06-01"
      )
    );
    assert.match(String(err), /invalid_dates/);
  });

  it("refuses overlapping terms for the same person holding the same role", async () => {
    // Juan Dela Cruz is already President for 2025-06-01 to 2026-05-31
    const err = await errorOf(() =>
      recordTermAs(
        adminA,
        orgA,
        "A.Y. 2025-2026 Extra",
        "President",
        "Juan Dela Cruz",
        "2025-10-01",
        "2026-10-01",
        memberA1
      )
    );
    assert.match(String(err), /overlapping_term/);
  });

  it("allows the same person to hold a different role during an overlapping period", async () => {
    const res = await recordTermAs(
      adminA,
      orgA,
      "A.Y. 2025-2026",
      "Interim Secretary",
      "Juan Dela Cruz",
      "2025-07-01",
      "2025-12-31",
      memberA1
    );
    assert.ok(res.rows[0].record_officer_term);
  });

  it("allows another person to hold the same role in non-overlapping terms", async () => {
    const res = await recordTermAs(
      adminA,
      orgA,
      "A.Y. 2024-2025",
      "President",
      "Carlos Reyes",
      "2024-06-01",
      "2025-05-31"
    );
    assert.ok(res.rows[0].record_officer_term);
  });
});

describe("H1: update_officer_term and delete_officer_term", () => {
  let createdId: string;

  before(async () => {
    const res = await recordTermAs(
      adminA,
      orgA,
      "A.Y. 2023-2024",
      "Auditor",
      "Elena Gomez",
      "2023-06-01",
      "2024-05-31"
    );
    createdId = res.rows[0].record_officer_term;
  });

  it("allows admin to update a term without triggering self-overlap", async () => {
    const res = await updateTermAs(
      adminA,
      createdId,
      "A.Y. 2023-2024 Renamed",
      "Auditor",
      "Elena Gomez",
      "2023-06-01",
      "2024-05-31"
    );
    assert.equal(res.rows[0].update_officer_term, "ok");

    const rows = await selectTerms("authenticated", adminA);
    const updated = rows.rows.find((r) => r.id === createdId);
    assert.equal(updated?.term_name, "A.Y. 2023-2024 Renamed");
  });

  it("refuses non-admin from updating a term", async () => {
    const err = await errorOf(() =>
      updateTermAs(
        officerA,
        createdId,
        "A.Y. 2023-2024 Hacked",
        "Auditor",
        "Elena Gomez",
        "2023-06-01",
        "2024-05-31"
      )
    );
    assert.match(String(err), /not_admin/);
  });

  it("refuses non-admin from deleting a term", async () => {
    const err = await errorOf(() => deleteTermAs(officerA, createdId));
    assert.match(String(err), /not_admin/);
  });

  it("allows admin to delete a term", async () => {
    const res = await deleteTermAs(adminA, createdId);
    assert.equal(res.rows[0].delete_officer_term, "ok");

    const rows = await selectTerms("authenticated", adminA);
    assert.equal(rows.rows.some((r) => r.id === createdId), false);
  });
});

describe("H1: row level security read isolation", () => {
  it("allows officers in Org A to view Org A terms, but Org B officers see none of them", async () => {
    const rowsA = await selectTerms("authenticated", officerA);
    assert.ok(rowsA.rows.length >= 1);
    assert.ok(rowsA.rows.every((r) => r.org_id === orgA));

    const rowsB = await selectTerms("authenticated", officerB);
    assert.equal(rowsB.rows.some((r) => r.org_id === orgA), false);
  });

  it("shows anon nothing", async () => {
    const err = await errorOf(() =>
      as("anon", null, () => getDb().query(`select * from public.officer_terms`))
    );
    assert.match(String(err), /permission denied/);
  });
});
