import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { as, addMember, addOfficer, addOrg, getDb, startDb } from "./helpers.ts";

let orgA: string;
let orgB: string;
let adminA: string;
let officerA: string;
let adminB: string;
let officerB: string;

const insertGuideAs = (
  user: string | null,
  role: "authenticated" | "anon",
  orgId: string,
  guide: {
    roleTitle: string;
    status?: "draft" | "ready";
    sections?: Record<string, unknown>;
  }
) =>
  as(role, user, () =>
    getDb().query<{ id: string }>(
      `insert into public.handover_guides (org_id, role_title, status, sections, author_id)
       values ($1, $2, $3, $4, $5)
       returning id`,
      [
        orgId,
        guide.roleTitle,
        guide.status || "draft",
        JSON.stringify(guide.sections || {}),
        user,
      ]
    )
  );

const selectGuidesAs = (user: string | null, role: "authenticated" | "anon", orgId: string) =>
  as(role, user, () =>
    getDb().query<{
      id: string;
      org_id: string;
      role_title: string;
      status: string;
    }>(`select id, org_id, role_title, status from public.handover_guides where org_id = $1`, [orgId])
  );

before(async () => {
  await startDb();

  adminA = await addOfficer("admin.h4.a@school.edu", "Admin H4 A");
  orgA = await addOrg(adminA, "H4 Org A");
  officerA = await addMember(orgA, "officer.h4.a@school.edu", "officer");

  adminB = await addOfficer("admin.h4.b@school.edu", "Admin H4 B");
  orgB = await addOrg(adminB, "H4 Org B");
  officerB = await addMember(orgB, "officer.h4.b@school.edu", "officer");
});

describe("H4: handover_guides isolation and security", () => {
  it("allows an officer to create a draft guide in their org", async () => {
    const res = await insertGuideAs(officerA, "authenticated", orgA, {
      roleTitle: "Treasurer",
      sections: { what_i_do: "Manage funds" },
    });
    assert.ok(res.rows[0]?.id);
  });

  it("author can see their own draft guide in org A", async () => {
    const res = await selectGuidesAs(officerA, "authenticated", orgA);
    assert.ok(res.rows.length >= 1);
    assert.equal(res.rows[0].role_title, "Treasurer");
  });

  it("officer in Org B cannot see Org A draft or ready guide", async () => {
    const res = await selectGuidesAs(officerB, "authenticated", orgA);
    assert.equal(res.rows.length, 0);
  });

  it("anon cannot view any handover guides", async () => {
    const res = await as("anon", null, () => getDb().query(`select * from public.handover_guides`));
    assert.equal(res.rows.length, 0);
  });
});
