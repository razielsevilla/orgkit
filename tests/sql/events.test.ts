import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { as, addMember, addOfficer, addOrg, errorOf, getDb, newUuid, startDb } from "./helpers.ts";

// E1: events. Officers read their own org's events through row level security
// and write only through create_event, update_event and cancel_event.
// E2: the check-in window (checkin_open) changes only through set_event_checkin.

let orgA: string;
let orgB: string;
let adminA: string;
let officerA: string;
let officerB: string;
let eventA: string;
let eventB: string;

const START = "2030-05-01T10:00:00Z";
const END = "2030-05-01T12:00:00Z";

type EventRow = {
  id: string;
  title: string;
  location: string | null;
  status: string;
  starts_at: string;
  ends_at: string;
};

const createAs = (user: string | null, org: string, title: string, start = START, end = END, location: string | null = null) =>
  as("authenticated", user, () =>
    getDb().query<{ create_event: string }>(`select public.create_event($1, $2, $3, $4, $5)`, [
      org,
      title,
      start,
      end,
      location,
    ])
  );

const selectEvents = (role: "authenticated" | "anon", user: string | null) =>
  as(role, user, () => getDb().query<EventRow>(`select * from public.events order by created_at, id`));

before(async () => {
  await startDb();

  adminA = await addOfficer("admin.e1.a@school.edu", "Admin E1 A");
  orgA = await addOrg(adminA, "E1 Org A");
  officerA = await addMember(orgA, "officer.e1.a@school.edu", "officer");

  const adminB = await addOfficer("admin.e1.b@school.edu", "Admin E1 B");
  orgB = await addOrg(adminB, "E1 Org B");
  officerB = await addMember(orgB, "officer.e1.b@school.edu", "finance");

  eventA = (await createAs(officerA, orgA, "Org A kickoff", START, END, "Room 4")).rows[0].create_event;
  eventB = (await createAs(officerB, orgB, "Org B kickoff")).rows[0].create_event;
});

describe("create_event", () => {
  it("lets an officer of any role create an event with all fields", async () => {
    const res = await createAs(adminA, orgA, "Full event", START, END, "Student Center");
    const rows = await selectEvents("authenticated", adminA);
    const created = rows.rows.find((r) => r.id === res.rows[0].create_event);
    assert.ok(created);
    assert.equal(created.title, "Full event");
    assert.equal(created.location, "Student Center");
    assert.equal(created.status, "scheduled");
    assert.equal(new Date(created.starts_at).toISOString(), "2030-05-01T10:00:00.000Z");
  });

  it("stores a blank location as null", async () => {
    for (const blank of [null, "", "   "]) {
      const res = await createAs(officerA, orgA, "No location", START, END, blank);
      const row = (await getDb().query<EventRow>(`select * from public.events where id = $1`, [res.rows[0].create_event]))
        .rows[0];
      assert.equal(row.location, null);
    }
  });

  it("collapses extra whitespace in the title", async () => {
    const res = await createAs(officerA, orgA, "  Board    meeting ");
    const row = (await getDb().query<EventRow>(`select * from public.events where id = $1`, [res.rows[0].create_event]))
      .rows[0];
    assert.equal(row.title, "Board meeting");
  });

  it("rejects a 1-character title and a 101-character title, creating nothing", async () => {
    const before = (await getDb().query(`select count(*)::int as n from public.events`)).rows[0] as { n: number };
    for (const title of ["a", " a ", "x".repeat(101), ""]) {
      const err = await errorOf(() => createAs(officerA, orgA, title));
      assert.match(err ?? "", /invalid_title/);
    }
    const after = (await getDb().query(`select count(*)::int as n from public.events`)).rows[0] as { n: number };
    assert.equal(after.n, before.n);
  });

  it("accepts titles of exactly 2 and 100 characters", async () => {
    assert.equal(await errorOf(() => createAs(officerA, orgA, "ab")), null);
    assert.equal(await errorOf(() => createAs(officerA, orgA, "x".repeat(100))), null);
  });

  it("rejects an end before or equal to the start", async () => {
    for (const end of ["2030-05-01T09:00:00Z", START]) {
      const err = await errorOf(() => createAs(officerA, orgA, "Backwards", START, end));
      assert.match(err ?? "", /invalid_time_range/);
    }
  });

  it("rejects missing times and a location over 200 characters", async () => {
    assert.match((await errorOf(() => createAs(officerA, orgA, "No times", null as never, null as never))) ?? "", /invalid_time_range/);
    assert.match((await errorOf(() => createAs(officerA, orgA, "Long place", START, END, "x".repeat(201)))) ?? "", /invalid_location/);
  });

  it("refuses an officer of another org", async () => {
    const err = await errorOf(() => createAs(officerB, orgA, "Sneaky"));
    assert.match(err ?? "", /not_permitted/);
  });

  it("refuses a signed-out caller and anon", async () => {
    assert.match((await errorOf(() => createAs(null, orgA, "Signed out"))) ?? "", /not_authenticated/);
    const anonErr = await errorOf(() =>
      as("anon", null, () => getDb().query(`select public.create_event($1, 'Anon', $2, $3, null)`, [orgA, START, END]))
    );
    assert.match(anonErr ?? "", /permission denied/);
  });
});

describe("update_event", () => {
  const updateAs = (user: string | null, id: string, title: string, start = START, end = END, location: string | null = null) =>
    as("authenticated", user, () =>
      getDb().query(`select public.update_event($1, $2, $3, $4, $5)`, [id, title, start, end, location])
    );

  it("changes title, time and location", async () => {
    await updateAs(officerA, eventA, "Renamed", "2030-06-01T09:00:00Z", "2030-06-01T10:30:00Z", "Hall B");
    const row = (await getDb().query<EventRow>(`select * from public.events where id = $1`, [eventA])).rows[0];
    assert.equal(row.title, "Renamed");
    assert.equal(row.location, "Hall B");
    assert.equal(new Date(row.starts_at).toISOString(), "2030-06-01T09:00:00.000Z");
    assert.equal(new Date(row.ends_at).toISOString(), "2030-06-01T10:30:00.000Z");
  });

  it("applies the same validation as create", async () => {
    assert.match((await errorOf(() => updateAs(officerA, eventA, "x"))) ?? "", /invalid_title/);
    assert.match(
      (await errorOf(() => updateAs(officerA, eventA, "Fine title", END, START))) ?? "",
      /invalid_time_range/
    );
  });

  it("refuses an officer of another org, and an unknown event", async () => {
    assert.match((await errorOf(() => updateAs(officerB, eventA, "Hijack"))) ?? "", /not_permitted/);
    assert.match((await errorOf(() => updateAs(officerA, newUuid(), "Ghost"))) ?? "", /event_not_found/);
  });
});

describe("cancel_event", () => {
  const cancelAs = (user: string | null, id: string) =>
    as("authenticated", user, () => getDb().query(`select public.cancel_event($1)`, [id]));

  it("marks the event cancelled, keeps the row, and a second cancel is harmless", async () => {
    const id = (await createAs(officerA, orgA, "To cancel")).rows[0].create_event;

    await cancelAs(officerA, id);
    const first = (await getDb().query<EventRow & { updated_at: string }>(`select * from public.events where id = $1`, [id]))
      .rows[0];
    assert.equal(first.status, "cancelled");

    assert.equal(await errorOf(() => cancelAs(officerA, id)), null);
    const second = (await getDb().query<EventRow & { updated_at: string }>(`select * from public.events where id = $1`, [id]))
      .rows[0];
    assert.equal(second.status, "cancelled");
    // Untouched: the second cancel did not rewrite the row
    assert.equal(new Date(second.updated_at).getTime(), new Date(first.updated_at).getTime());
  });

  it("can no longer be edited once cancelled", async () => {
    const id = (await createAs(officerA, orgA, "Cancelled for good")).rows[0].create_event;
    await cancelAs(officerA, id);
    const err = await errorOf(() =>
      as("authenticated", officerA, () =>
        getDb().query(`select public.update_event($1, 'Revived', $2, $3, null)`, [id, START, END])
      )
    );
    assert.match(err ?? "", /event_cancelled/);
  });

  it("refuses an officer of another org, an unknown event, and a signed-out caller", async () => {
    assert.match((await errorOf(() => cancelAs(officerB, eventA))) ?? "", /not_permitted/);
    assert.match((await errorOf(() => cancelAs(officerA, newUuid()))) ?? "", /event_not_found/);
    assert.match((await errorOf(() => cancelAs(null, eventA))) ?? "", /not_authenticated/);
  });
});

describe("row level security on events", () => {
  it("shows an officer only their own org's events", async () => {
    const a = await selectEvents("authenticated", officerA);
    assert.ok(a.rows.length > 0);
    assert.ok(a.rows.some((r) => r.id === eventA));
    assert.ok(!a.rows.some((r) => r.id === eventB));

    const b = await selectEvents("authenticated", officerB);
    assert.ok(b.rows.some((r) => r.id === eventB));
    assert.ok(!b.rows.some((r) => r.id === eventA));
  });

  it("shows a user who is in no org nothing", async () => {
    const outsider = await addOfficer("outsider.e1@school.edu");
    const res = await selectEvents("authenticated", outsider);
    assert.equal(res.rows.length, 0);
  });

  it("refuses direct inserts, updates and deletes by an officer, even in their own org", async () => {
    const insertErr = await errorOf(() =>
      as("authenticated", officerA, () =>
        getDb().query(
          `insert into public.events (org_id, title, starts_at, ends_at) values ($1, 'Direct', $2, $3)`,
          [orgA, START, END]
        )
      )
    );
    assert.match(insertErr ?? "", /permission denied/);

    const updateErr = await errorOf(() =>
      as("authenticated", officerA, () =>
        getDb().query(`update public.events set title = 'Direct edit' where id = $1`, [eventA])
      )
    );
    assert.match(updateErr ?? "", /permission denied/);

    const deleteErr = await errorOf(() =>
      as("authenticated", officerA, () => getDb().query(`delete from public.events where id = $1`, [eventA]))
    );
    assert.match(deleteErr ?? "", /permission denied/);
  });

  it("refuses an officer of org A writing org B's events directly", async () => {
    const err = await errorOf(() =>
      as("authenticated", officerA, () =>
        getDb().query(`update public.events set status = 'cancelled' where id = $1`, [eventB])
      )
    );
    assert.match(err ?? "", /permission denied/);
    const row = (await getDb().query<EventRow>(`select * from public.events where id = $1`, [eventB])).rows[0];
    assert.equal(row.status, "scheduled");
  });

  it("gives anon no access at all", async () => {
    const err = await errorOf(() => selectEvents("anon", null));
    assert.match(err ?? "", /permission denied/);
  });
});

describe("set_event_checkin (E2)", () => {
  const setAs = (user: string | null, id: string, open: boolean) =>
    as("authenticated", user, () => getDb().query(`select public.set_event_checkin($1, $2)`, [id, open]));
  const isOpen = async (id: string) =>
    (await getDb().query<{ checkin_open: boolean }>(`select checkin_open from public.events where id = $1`, [id])).rows[0]
      .checkin_open;
  const hoursFromNow = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString();
  /** An event that runs from `startH` to `endH` hours from now (negative is the past) */
  const newEvent = async (startH: number, endH: number) =>
    (await createAs(officerA, orgA, "Check-in event", hoursFromNow(startH), hoursFromNow(endH))).rows[0].create_event;

  it("starts closed", async () => {
    assert.equal(await isOpen(eventA), false);
  });

  it("lets an officer of any role open and close the window, and repeating either is harmless", async () => {
    const id = await newEvent(-1, 1);
    for (const user of [officerA, adminA]) {
      assert.equal(await errorOf(() => setAs(user, id, true)), null);
      assert.equal(await isOpen(id), true);
      assert.equal(await errorOf(() => setAs(user, id, true)), null);
      assert.equal(await errorOf(() => setAs(user, id, false)), null);
      assert.equal(await isOpen(id), false);
      assert.equal(await errorOf(() => setAs(user, id, false)), null);
    }
  });

  it("refuses an officer of another org, leaving the window as it was", async () => {
    const id = await newEvent(-1, 1);
    assert.match((await errorOf(() => setAs(officerB, id, true))) ?? "", /not_permitted/);
    assert.equal(await isOpen(id), false);

    await setAs(officerA, id, true);
    assert.match((await errorOf(() => setAs(officerB, id, false))) ?? "", /not_permitted/);
    assert.equal(await isOpen(id), true);
  });

  it("refuses an unknown event, a signed-out caller and anon", async () => {
    assert.match((await errorOf(() => setAs(officerA, newUuid(), true))) ?? "", /event_not_found/);
    assert.match((await errorOf(() => setAs(null, eventA, true))) ?? "", /not_authenticated/);
    const anonErr = await errorOf(() =>
      as("anon", null, () => getDb().query(`select public.set_event_checkin($1, true)`, [eventA]))
    );
    assert.match(anonErr ?? "", /permission denied/);
  });

  it("refuses to open a cancelled event, but still closes one", async () => {
    const id = await newEvent(-1, 1);
    await setAs(officerA, id, true);
    await as("authenticated", officerA, () => getDb().query(`select public.cancel_event($1)`, [id]));
    // Cancelling shut the window
    assert.equal(await isOpen(id), false);
    assert.match((await errorOf(() => setAs(officerA, id, true))) ?? "", /event_cancelled/);
    assert.equal(await errorOf(() => setAs(officerA, id, false)), null);
    assert.equal(await isOpen(id), false);
  });

  it("refuses to open an event that ended more than an hour ago", async () => {
    const id = await newEvent(-4, -2);
    assert.match((await errorOf(() => setAs(officerA, id, true))) ?? "", /event_ended/);
    assert.equal(await isOpen(id), false);
  });

  it("opens an event that ended less than an hour ago, and closes one that has since expired", async () => {
    const recent = await newEvent(-3, -0.5);
    assert.equal(await errorOf(() => setAs(officerA, recent, true)), null);
    assert.equal(await isOpen(recent), true);

    // An event that ended long ago while its window was still open can always be closed
    const stale = await newEvent(-1, 1);
    await setAs(officerA, stale, true);
    await getDb().query(
      `update public.events set starts_at = now() - interval '5 hours', ends_at = now() - interval '3 hours' where id = $1`,
      [stale]
    );
    assert.equal(await errorOf(() => setAs(officerA, stale, false)), null);
    assert.equal(await isOpen(stale), false);
  });
});

describe("checkin_open can't be written directly (E2)", () => {
  const writeAs = (role: "authenticated" | "anon", user: string | null, id: string) =>
    as(role, user, () => getDb().query(`update public.events set checkin_open = true where id = $1`, [id]));

  it("refuses the org's own officers and admins", async () => {
    for (const user of [officerA, adminA]) {
      assert.match((await errorOf(() => writeAs("authenticated", user, eventA))) ?? "", /permission denied/);
    }
  });

  it("refuses another org's officer", async () => {
    assert.match((await errorOf(() => writeAs("authenticated", officerB, eventA))) ?? "", /permission denied/);
  });

  it("refuses anon", async () => {
    assert.match((await errorOf(() => writeAs("anon", null, eventA))) ?? "", /permission denied/);
  });

  it("left the window closed after all of that", async () => {
    const row = (
      await getDb().query<{ checkin_open: boolean }>(`select checkin_open from public.events where id = $1`, [eventA])
    ).rows[0];
    assert.equal(row.checkin_open, false);
  });
});
