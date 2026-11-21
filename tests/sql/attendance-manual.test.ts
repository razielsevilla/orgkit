import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { as, addOfficer, addOrg, addMember, errorOf, getDb, newUuid, startDb } from "./helpers.ts";

// E4: officers add and remove attendance by hand through mark_attendance_manual
// and remove_attendance. Nobody can write attendance directly.

let orgA: string;
let orgB: string;
let adminA: string;
let officerA: string;
let officerB: string;
let eventA: string;
let ana: string;
let ben: string;
let pending: string;
let inactive: string;
let otherOrgMember: string;

const START = "2030-05-01T10:00:00Z";
const END = "2030-05-01T12:00:00Z";

const asServer = <T>(fn: () => Promise<T>) => as("service_role", null, fn);

async function newEvent(org: string, officer: string, title: string): Promise<string> {
  const created = await as("authenticated", officer, () =>
    getDb().query<{ create_event: string }>(`select public.create_event($1, $2, $3, $4, null)`, [
      org,
      title,
      START,
      END,
    ])
  );
  return created.rows[0].create_event;
}

async function newStudent(
  org: string,
  email: string,
  name: string,
  status: "pending" | "active" | "inactive" = "active"
): Promise<string> {
  const db = getDb();
  const token = (
    await as("authenticated", org === orgA ? adminA : officerB, () =>
      db.query<{ set_join_link: string | null }>(`select public.set_join_link($1, 'on')`, [org])
    )
  ).rows[0].set_join_link;
  await asServer(() =>
    db.query(`select public.join_org($1, $2, $3, 'en', 'member-consent-v1')`, [token, name, email])
  );
  if (status !== "pending") {
    await db.query(`update public.members set status = $1 where org_id = $2 and email_key = lower($3)`, [
      status,
      org,
      email,
    ]);
  }
  const row = await db.query<{ id: string }>(
    `select id from public.members where org_id = $1 and email_key = lower($2)`,
    [org, email]
  );
  return row.rows[0].id;
}

const mark = (officer: string | null, event: string, member: string) =>
  as(officer ? "authenticated" : "anon", officer, () =>
    getDb().query<{ mark_attendance_manual: string }>(`select public.mark_attendance_manual($1, $2)`, [
      event,
      member,
    ])
  );

const remove = (officer: string | null, event: string, member: string) =>
  as(officer ? "authenticated" : "anon", officer, () =>
    getDb().query<{ remove_attendance: string }>(`select public.remove_attendance($1, $2)`, [event, member])
  );

const rowsFor = async (event: string, member: string) =>
  (
    await getDb().query<{ method: string; marked_by: string | null; org_id: string }>(
      `select method, marked_by, org_id from public.attendance where event_id = $1 and member_id = $2`,
      [event, member]
    )
  ).rows;

before(async () => {
  await startDb();

  adminA = await addOfficer("admin.e4.a@school.edu", "Admin E4 A");
  orgA = await addOrg(adminA, "E4 Org A");
  officerA = await addMember(orgA, "officer.e4.a@school.edu", "officer");

  const adminB = await addOfficer("admin.e4.b@school.edu", "Admin E4 B");
  orgB = await addOrg(adminB, "E4 Org B");
  officerB = adminB;

  eventA = await newEvent(orgA, officerA, "Org A general meeting");

  ana = await newStudent(orgA, "ana.e4@school.edu", "Ana Maria Reyes");
  ben = await newStudent(orgA, "ben.e4@school.edu", "Ben Cruz");
  pending = await newStudent(orgA, "pending.e4@school.edu", "Pat Pending", "pending");
  inactive = await newStudent(orgA, "gone.e4@school.edu", "Ian Inactive", "inactive");
  otherOrgMember = await newStudent(orgB, "bea.e4@other.edu", "Bea Otherorg");
});

after(async () => {
  await getDb().close();
});

describe("mark_attendance_manual", () => {
  it("adds an active member as manual, recording the officer", async () => {
    const res = await mark(officerA, eventA, ana);
    assert.equal(res.rows[0].mark_attendance_manual, "added");

    const rows = await rowsFor(eventA, ana);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].method, "manual");
    assert.equal(rows[0].marked_by, officerA);
    assert.equal(rows[0].org_id, orgA);
  });

  it("answers 'already' for a second add and never creates a duplicate", async () => {
    const res = await mark(adminA, eventA, ana);
    assert.equal(res.rows[0].mark_attendance_manual, "already");
    assert.equal((await rowsFor(eventA, ana)).length, 1);
    // The first officer's record is untouched
    assert.equal((await rowsFor(eventA, ana))[0].marked_by, officerA);
  });

  it("leaves a QR check-in alone when an officer adds the same member", async () => {
    await as("authenticated", officerA, () =>
      getDb().query(`select public.set_event_checkin($1, true)`, [eventA])
    );
    await asServer(() => getDb().query(`select * from public.checkin_member($1, $2)`, [eventA, "ben.e4@school.edu"]));

    const res = await mark(officerA, eventA, ben);
    assert.equal(res.rows[0].mark_attendance_manual, "already");
    const rows = await rowsFor(eventA, ben);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].method, "qr");
    assert.equal(rows[0].marked_by, null);
  });

  it("refuses members who are pending, inactive, in another org or unknown", async () => {
    for (const member of [pending, inactive, otherOrgMember, newUuid()]) {
      const err = await errorOf(() => mark(officerA, eventA, member));
      assert.match(err ?? "", /member_not_found/);
      assert.equal((await rowsFor(eventA, member)).length, 0);
    }
  });

  it("refuses an officer of another org with the same answer as an unknown event", async () => {
    const stranger = await errorOf(() => mark(officerB, eventA, ana));
    const unknown = await errorOf(() => mark(officerA, newUuid(), ana));
    assert.match(stranger ?? "", /not_permitted/);
    assert.match(unknown ?? "", /event_not_found/);
  });

  it("refuses anon, and direct writes by authenticated", async () => {
    assert.match((await errorOf(() => mark(null, eventA, ana))) ?? "", /permission denied/);

    const insert = await errorOf(() =>
      as("authenticated", officerA, () =>
        getDb().query(
          `insert into public.attendance (org_id, event_id, member_id, method) values ($1, $2, $3, 'manual')`,
          [orgA, eventA, pending]
        )
      )
    );
    assert.match(insert ?? "", /permission denied|row-level security/);

    const del = await errorOf(() =>
      as("authenticated", officerA, () =>
        getDb().query(`delete from public.attendance where event_id = $1`, [eventA])
      )
    );
    assert.match(del ?? "", /permission denied|row-level security/);
  });

  it("works on an ended event, so the list can be corrected afterwards", async () => {
    const ended = await newEvent(orgA, officerA, "Ended");
    await getDb().query(
      `update public.events set starts_at = now() - interval '5 hours', ends_at = now() - interval '3 hours' where id = $1`,
      [ended]
    );
    const added = await mark(officerA, ended, ana);
    assert.equal(added.rows[0].mark_attendance_manual, "added");
    const removed = await remove(officerA, ended, ana);
    assert.equal(removed.rows[0].remove_attendance, "removed");
  });

  it("refuses a cancelled event for add and for remove", async () => {
    const cancelled = await newEvent(orgA, officerA, "Cancelled");
    await mark(officerA, cancelled, ana);
    await as("authenticated", officerA, () => getDb().query(`select public.cancel_event($1)`, [cancelled]));

    assert.match((await errorOf(() => mark(officerA, cancelled, ben))) ?? "", /event_cancelled/);
    assert.match((await errorOf(() => remove(officerA, cancelled, ana))) ?? "", /event_cancelled/);
    // The existing record is still there, read-only
    assert.equal((await rowsFor(cancelled, ana)).length, 1);
  });
});

describe("remove_attendance", () => {
  it("removes a present member, and removing again is harmless", async () => {
    const event = await newEvent(orgA, officerA, "Remove test");
    await mark(officerA, event, ana);
    await mark(officerA, event, ben);

    const first = await remove(officerA, event, ana);
    assert.equal(first.rows[0].remove_attendance, "removed");
    assert.equal((await rowsFor(event, ana)).length, 0);
    assert.equal((await rowsFor(event, ben)).length, 1);

    const second = await remove(adminA, event, ana);
    assert.equal(second.rows[0].remove_attendance, "already");
  });

  it("only touches the given event", async () => {
    const one = await newEvent(orgA, officerA, "One");
    const two = await newEvent(orgA, officerA, "Two");
    await mark(officerA, one, ana);
    await mark(officerA, two, ana);

    await remove(officerA, one, ana);
    assert.equal((await rowsFor(one, ana)).length, 0);
    assert.equal((await rowsFor(two, ana)).length, 1);
  });

  it("refuses an officer of another org, anon, and an unknown event", async () => {
    const event = await newEvent(orgA, officerA, "Guarded");
    await mark(officerA, event, ana);

    assert.match((await errorOf(() => remove(officerB, event, ana))) ?? "", /not_permitted/);
    assert.match((await errorOf(() => remove(null, event, ana))) ?? "", /permission denied/);
    assert.match((await errorOf(() => remove(officerA, newUuid(), ana))) ?? "", /event_not_found/);
    assert.equal((await rowsFor(event, ana)).length, 1);
  });
});
