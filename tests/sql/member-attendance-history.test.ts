import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { as, addOfficer, addOrg, addMember, errorOf, getDb, newUuid, startDb } from "./helpers.ts";

// E5: officers read one member's attendance history through
// get_member_attendance_history. Another org's member, an unknown member and a
// non-officer all get the same 'member_not_found'.

let orgA: string;
let orgB: string;
let adminA: string;
let officerA: string;
let officerB: string;
let ana: string;
let newbie: string;
let inactive: string;
let otherOrgMember: string;

interface HistoryEvent {
  event_id: string;
  title: string;
  status: string;
  attended: boolean;
  method: string | null;
}
interface History {
  org_id: string;
  joined_at: string;
  events: HistoryEvent[];
}

const asServer = <T>(fn: () => Promise<T>) => as("service_role", null, fn);

/** An event that ended `endedHoursAgo` hours ago, after lasting two hours */
async function pastEvent(org: string, officer: string, title: string, endedHoursAgo: number): Promise<string> {
  const created = await as("authenticated", officer, () =>
    getDb().query<{ create_event: string }>(`select public.create_event($1, $2, $3, $4, null)`, [
      org,
      title,
      "2030-05-01T10:00:00Z",
      "2030-05-01T12:00:00Z",
    ])
  );
  const id = created.rows[0].create_event;
  await getDb().query(
    `update public.events
        set starts_at = now() - ($2 || ' hours')::interval - interval '2 hours',
            ends_at = now() - ($2 || ' hours')::interval
      where id = $1`,
    [id, String(endedHoursAgo)]
  );
  return id;
}

async function newStudent(
  org: string,
  email: string,
  name: string,
  status: "active" | "inactive" = "active"
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
  await db.query(`update public.members set status = $1 where org_id = $2 and email_key = lower($3)`, [
    status,
    org,
    email,
  ]);
  const row = await db.query<{ id: string }>(
    `select id from public.members where org_id = $1 and email_key = lower($2)`,
    [org, email]
  );
  return row.rows[0].id;
}

const markPresent = (event: string, member: string, org: string, method = "manual") =>
  getDb().query(
    `insert into public.attendance (org_id, event_id, member_id, method) values ($1, $2, $3, $4)`,
    [org, event, member, method]
  );

const history = async (officer: string | null, member: string): Promise<History> => {
  const res = await as(officer ? "authenticated" : "anon", officer, () =>
    getDb().query<{ get_member_attendance_history: History }>(
      `select public.get_member_attendance_history($1)`,
      [member]
    )
  );
  return res.rows[0].get_member_attendance_history;
};

const setJoined = (member: string, hoursAgo: number) =>
  getDb().query(`update public.members set created_at = now() - ($2 || ' hours')::interval where id = $1`, [
    member,
    String(hoursAgo),
  ]);

before(async () => {
  await startDb();

  adminA = await addOfficer("admin.e5.a@school.edu", "Admin E5 A");
  orgA = await addOrg(adminA, "E5 Org A");
  officerA = await addMember(orgA, "officer.e5.a@school.edu", "officer");

  const adminB = await addOfficer("admin.e5.b@school.edu", "Admin E5 B");
  orgB = await addOrg(adminB, "E5 Org B");
  officerB = adminB;

  ana = await newStudent(orgA, "ana.e5@school.edu", "Ana Maria Reyes");
  newbie = await newStudent(orgA, "new.e5@school.edu", "Nia Newbie");
  inactive = await newStudent(orgA, "gone.e5@school.edu", "Ian Inactive", "inactive");
  otherOrgMember = await newStudent(orgB, "bea.e5@other.edu", "Bea Otherorg");
});

after(async () => {
  await getDb().close();
});

describe("get_member_attendance_history", () => {
  it("lists past events newest first with how the member was marked", async () => {
    const older = await pastEvent(orgA, officerA, "Older", 48);
    const newer = await pastEvent(orgA, officerA, "Newer", 24);
    const missed = await pastEvent(orgA, officerA, "Missed", 72);
    await setJoined(ana, 500);
    await markPresent(older, ana, orgA, "qr");
    await markPresent(newer, ana, orgA, "manual");

    const h = await history(officerA, ana);
    assert.equal(h.org_id, orgA);
    const titles = h.events.map((e) => e.title);
    assert.deepEqual(titles, ["Newer", "Older", "Missed"]);
    assert.deepEqual(
      h.events.map((e) => [e.attended, e.method]),
      [
        [true, "manual"],
        [true, "qr"],
        [false, null],
      ]
    );
    assert.equal(h.events.find((e) => e.event_id === missed)?.attended, false);
  });

  it("leaves out events that haven't ended yet", async () => {
    const upcoming = await as("authenticated", officerA, () =>
      getDb().query<{ create_event: string }>(`select public.create_event($1, $2, $3, $4, null)`, [
        orgA,
        "Upcoming",
        "2030-05-01T10:00:00Z",
        "2030-05-01T12:00:00Z",
      ])
    );
    const h = await history(officerA, ana);
    assert.ok(!h.events.some((e) => e.event_id === upcoming.rows[0].create_event));
  });

  it("leaves out events before the member joined, unless they were marked present", async () => {
    const before = await pastEvent(orgA, officerA, "Before joining", 300);
    const beforeAttended = await pastEvent(orgA, officerA, "Before but present", 301);
    await setJoined(newbie, 100);
    await markPresent(beforeAttended, newbie, orgA);

    const h = await history(officerA, newbie);
    const ids = h.events.map((e) => e.event_id);
    assert.ok(!ids.includes(before));
    assert.ok(ids.includes(beforeAttended));
  });

  it("returns cancelled events with their status", async () => {
    const ev = await pastEvent(orgA, officerA, "Called off", 10);
    await as("authenticated", officerA, () => getDb().query(`select public.cancel_event($1)`, [ev]));
    const h = await history(officerA, ana);
    assert.equal(h.events.find((e) => e.event_id === ev)?.status, "cancelled");
  });

  it("returns an empty list for a member with no events", async () => {
    const fresh = await newStudent(orgA, "fresh.e5@school.edu", "Fay Fresh");
    await setJoined(fresh, 0);
    const h = await history(officerA, fresh);
    assert.deepEqual(h.events, []);
  });

  it("works for an inactive member and still shows past attendance", async () => {
    const ev = await pastEvent(orgA, officerA, "Before leaving", 20);
    await setJoined(inactive, 500);
    await markPresent(ev, inactive, orgA);
    const h = await history(officerA, inactive);
    assert.equal(h.events.find((e) => e.event_id === ev)?.attended, true);
  });

  it("reflects a manual removal when read again", async () => {
    const ev = await pastEvent(orgA, officerA, "Removal", 15);
    await setJoined(ana, 500);
    await markPresent(ev, ana, orgA);
    assert.equal((await history(officerA, ana)).events.find((e) => e.event_id === ev)?.attended, true);

    await as("authenticated", officerA, () =>
      getDb().query(`select public.remove_attendance($1, $2)`, [ev, ana])
    );
    // The event has ended and is not cancelled, so the E4 remove works
    assert.equal((await history(officerA, ana)).events.find((e) => e.event_id === ev)?.attended, false);
  });

  it("only shows the member's own attendance, not another member's", async () => {
    const ev = await pastEvent(orgA, officerA, "Someone else", 12);
    await setJoined(ana, 500);
    await markPresent(ev, newbie, orgA);
    assert.equal((await history(officerA, ana)).events.find((e) => e.event_id === ev)?.attended, false);
  });

  it("gives an officer of another org, and an unknown member, the same answer", async () => {
    const stranger = await errorOf(() => history(officerB, ana));
    const unknown = await errorOf(() => history(officerA, newUuid()));
    const crossOrg = await errorOf(() => history(officerA, otherOrgMember));
    assert.match(stranger ?? "", /member_not_found/);
    assert.match(unknown ?? "", /member_not_found/);
    assert.match(crossOrg ?? "", /member_not_found/);
  });

  it("refuses anon", async () => {
    assert.match((await errorOf(() => history(null, ana))) ?? "", /permission denied/);
  });

  it("refuses a caller who isn't signed in", async () => {
    const err = await errorOf(() =>
      as("authenticated", null, () =>
        getDb().query(`select public.get_member_attendance_history($1)`, [ana])
      )
    );
    assert.match(err ?? "", /not_authenticated/);
  });
});
