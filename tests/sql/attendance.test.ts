import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { as, addOfficer, addOrg, addMember, errorOf, getDb, newUuid, startDb } from "./helpers.ts";

// E3: member QR check-in. Students have no account, so the app server calls
// get_checkin_event and checkin_member with the service role. Nobody else can
// call them or write to attendance; officers can read their own org's rows.

let orgA: string;
let orgB: string;
let adminA: string;
let officerA: string;
let officerB: string;
let eventA: string;

const START = "2030-05-01T10:00:00Z";
const END = "2030-05-01T12:00:00Z";

const asServer = <T>(fn: () => Promise<T>) => as("service_role", null, fn);

async function newEvent(org: string, officer: string, title: string, open = true): Promise<string> {
  const created = await as("authenticated", officer, () =>
    getDb().query<{ create_event: string }>(`select public.create_event($1, $2, $3, $4, null)`, [
      org,
      title,
      START,
      END,
    ])
  );
  const id = created.rows[0].create_event;
  if (open) {
    await as("authenticated", officer, () =>
      getDb().query(`select public.set_event_checkin($1, true)`, [id])
    );
  }
  return id;
}

/** Joins as a student (pending), then optionally sets the status */
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

const checkin = (event: string, email: string) =>
  asServer(() =>
    getDb().query<{ result: string; first_name: string | null }>(
      `select * from public.checkin_member($1, $2)`,
      [event, email]
    )
  );

const attendanceCount = async (event: string) =>
  (
    await getDb().query<{ n: number }>(
      `select count(*)::int as n from public.attendance where event_id = $1`,
      [event]
    )
  ).rows[0].n;

before(async () => {
  await startDb();

  adminA = await addOfficer("admin.e3.a@school.edu", "Admin E3 A");
  orgA = await addOrg(adminA, "E3 Org A");
  officerA = await addMember(orgA, "officer.e3.a@school.edu", "officer");

  const adminB = await addOfficer("admin.e3.b@school.edu", "Admin E3 B");
  orgB = await addOrg(adminB, "E3 Org B");
  officerB = adminB;

  eventA = await newEvent(orgA, officerA, "Org A general meeting");

  await newStudent(orgA, "ana@school.edu", "Ana Maria Reyes");
  await newStudent(orgA, "pending@school.edu", "Pat Pending", "pending");
  await newStudent(orgA, "gone@school.edu", "Ian Inactive", "inactive");
  await newStudent(orgB, "bea@other.edu", "Bea Otherorg");
});

after(async () => {
  await getDb().close();
});

describe("checkin_member", () => {
  it("checks an active member in once, with method qr and a timestamp", async () => {
    const res = await checkin(eventA, "ana@school.edu");
    assert.deepEqual(res.rows, [{ result: "checked_in", first_name: "Ana" }]);

    const row = await getDb().query<{ method: string; marked_by: string | null; checked_in_at: string }>(
      `select method, marked_by, checked_in_at from public.attendance where event_id = $1`,
      [eventA]
    );
    assert.equal(row.rows.length, 1);
    assert.equal(row.rows[0].method, "qr");
    assert.equal(row.rows[0].marked_by, null);
    assert.ok(row.rows[0].checked_in_at);
  });

  it("answers already checked in on a second scan, and keeps exactly one row", async () => {
    const res = await checkin(eventA, "ana@school.edu");
    assert.deepEqual(res.rows, [{ result: "already", first_name: "Ana" }]);
    // A double tap is the same thing happening twice
    await Promise.all([checkin(eventA, "ana@school.edu"), checkin(eventA, "ana@school.edu")]);
    assert.equal(await attendanceCount(eventA), 1);
  });

  it("ignores capitalisation and spacing in the email", async () => {
    const event = await newEvent(orgA, officerA, "Spacing event");
    const res = await checkin(event, "   ANA@School.EDU  ");
    assert.equal(res.rows[0].result, "checked_in");
    assert.equal(await attendanceCount(event), 1);
  });

  it("returns only the first word of the name, never the full name or email", async () => {
    const event = await newEvent(orgA, officerA, "Name event");
    const res = await checkin(event, "ana@school.edu");
    assert.deepEqual(Object.keys(res.rows[0]).sort(), ["first_name", "result"]);
    assert.equal(res.rows[0].first_name, "Ana");
  });

  it("answers identically for an unknown, pending, inactive and other-org email, and records nothing", async () => {
    const event = await newEvent(orgA, officerA, "Roster event");
    const answers = [];
    for (const email of [
      "nobody@school.edu",
      "pending@school.edu",
      "gone@school.edu",
      "bea@other.edu",
      "",
      "   ",
    ]) {
      answers.push((await checkin(event, email)).rows);
    }
    for (const rows of answers) {
      assert.deepEqual(rows, [{ result: "not_found", first_name: null }]);
    }
    assert.equal(await attendanceCount(event), 0);
  });

  it("does not check a member of org A into an event of org B", async () => {
    const eventB = await newEvent(orgB, officerB, "Org B meeting");
    const res = await checkin(eventB, "ana@school.edu");
    assert.equal(res.rows[0].result, "not_found");
    assert.equal(await attendanceCount(eventB), 0);
  });

  it("lets a pending member in once an officer has made them active", async () => {
    const event = await newEvent(orgA, officerA, "Confirmed later");
    assert.equal((await checkin(event, "pending@school.edu")).rows[0].result, "not_found");
    await getDb().query(
      `update public.members set status = 'active' where org_id = $1 and email_key = 'pending@school.edu'`,
      [orgA]
    );
    assert.equal((await checkin(event, "pending@school.edu")).rows[0].result, "checked_in");
  });

  it("is closed for a closed window, a cancelled event, an ended event and an unknown event", async () => {
    const closed = await newEvent(orgA, officerA, "Closed", false);
    const cancelled = await newEvent(orgA, officerA, "Cancelled");
    await as("authenticated", officerA, () =>
      getDb().query(`select public.cancel_event($1)`, [cancelled])
    );
    const ended = await newEvent(orgA, officerA, "Ended");
    await getDb().query(
      `update public.events set starts_at = now() - interval '5 hours', ends_at = now() - interval '2 hours' where id = $1`,
      [ended]
    );
    const justEnded = await newEvent(orgA, officerA, "Just ended");
    await getDb().query(
      `update public.events set starts_at = now() - interval '3 hours', ends_at = now() - interval '30 minutes' where id = $1`,
      [justEnded]
    );

    for (const event of [closed, cancelled, ended, newUuid()]) {
      assert.deepEqual((await checkin(event, "ana@school.edu")).rows, [
        { result: "closed", first_name: null },
      ]);
      assert.equal(await attendanceCount(event), 0);
    }
    // Within the 1 hour grace the window still works, like set_event_checkin
    assert.equal((await checkin(justEnded, "ana@school.edu")).rows[0].result, "checked_in");
  });
});

describe("get_checkin_event", () => {
  it("returns the org and event name for an open window, and nothing else", async () => {
    const res = await asServer(() =>
      getDb().query(`select * from public.get_checkin_event($1)`, [eventA])
    );
    assert.deepEqual(res.rows, [{ org_name: "E3 Org A", event_title: "Org A general meeting" }]);
  });

  it("returns no row for a closed window, a cancelled event or an unknown event", async () => {
    const closed = await newEvent(orgA, officerA, "Closed too", false);
    const cancelled = await newEvent(orgA, officerA, "Cancelled too");
    await as("authenticated", officerA, () =>
      getDb().query(`select public.cancel_event($1)`, [cancelled])
    );
    for (const event of [closed, cancelled, newUuid()]) {
      const res = await asServer(() =>
        getDb().query(`select * from public.get_checkin_event($1)`, [event])
      );
      assert.equal(res.rows.length, 0);
    }
  });
});

describe("who may write or call", () => {
  for (const role of ["anon", "authenticated"] as const) {
    it(`${role} cannot call the check-in functions`, async () => {
      for (const sql of [
        `select * from public.checkin_member('${eventA}', 'ana@school.edu')`,
        `select * from public.get_checkin_event('${eventA}')`,
      ]) {
        const err = await errorOf(() => as(role, officerA, () => getDb().query(sql)));
        assert.match(String(err), /permission denied/);
      }
    });

    it(`${role} cannot insert, update or delete attendance`, async () => {
      const member = (
        await getDb().query<{ id: string }>(`select id from public.members where email_key = 'ana@school.edu'`)
      ).rows[0].id;
      for (const sql of [
        `insert into public.attendance (org_id, event_id, member_id, method) values ('${orgA}', '${eventA}', '${member}', 'qr')`,
        `update public.attendance set method = 'manual'`,
        `delete from public.attendance`,
      ]) {
        const err = await errorOf(() => as(role, officerA, () => getDb().query(sql)));
        assert.match(String(err), /permission denied|row-level security/);
      }
    });
  }

  it("keeps the rows after a refused write", async () => {
    assert.equal(await attendanceCount(eventA), 1);
  });
});

describe("reading attendance", () => {
  it("lets an officer read their own org's rows, and only theirs", async () => {
    const own = await as("authenticated", officerA, () =>
      getDb().query<{ n: number }>(`select count(*)::int as n from public.attendance where org_id = $1`, [orgA])
    );
    assert.ok(own.rows[0].n >= 1);

    const other = await as("authenticated", officerB, () =>
      getDb().query<{ n: number }>(`select count(*)::int as n from public.attendance where org_id = $1`, [orgA])
    );
    assert.equal(other.rows[0].n, 0);
  });

  it("shows anon nothing", async () => {
    const err = await errorOf(() =>
      as("anon", null, () => getDb().query(`select * from public.attendance`))
    );
    assert.match(String(err), /permission denied/);
  });
});
