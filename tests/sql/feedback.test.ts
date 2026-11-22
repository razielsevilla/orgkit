import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { as, addOfficer, addOrg, addMember, errorOf, getDb, newUuid, startDb } from "./helpers.ts";

// T5: in-app feedback. Officers cannot touch the table. The app server saves a
// message through submit_feedback (service role only), and only a platform owner
// can read the inbox through get_feedback.

let ownerId: string;
let adminA: string;
let memberA: string;
let outsider: string;
let orgA: string;
let orgB: string;

const asServer = <T>(fn: () => Promise<T>) => as("service_role", null, fn);

const submit = (officer: string | null, org: string | null, message: string, page = "/workspace/:id/dues") =>
  asServer(() =>
    getDb().query<{ submit_feedback: string }>(`select public.submit_feedback($1, $2, $3, $4)`, [
      officer,
      org,
      message,
      page,
    ])
  );

const rowFor = async (id: string) =>
  (
    await getDb().query<{
      officer_id: string;
      org_id: string | null;
      page: string;
      message: string;
    }>(`select officer_id, org_id, page, message from public.feedback where id = $1`, [id])
  ).rows[0];

interface InboxRow {
  id: string;
  message: string;
  page: string;
  org_name: string | null;
  officer_name: string;
  officer_email: string;
}

const inbox = (user: string | null, limit?: number | null, role: "authenticated" | "anon" = "authenticated") =>
  as(role, user, () =>
    limit === undefined
      ? getDb().query<InboxRow>(`select * from public.get_feedback()`)
      : getDb().query<InboxRow>(`select * from public.get_feedback($1)`, [limit])
  );

before(async () => {
  const db = await startDb();

  ownerId = await addOfficer("owner.t5@school.edu", "Owner T5");
  adminA = await addOfficer("admin.t5.a@school.edu", "Admin T5 A");
  outsider = await addOfficer("outsider.t5@school.edu", "Outsider T5");
  orgA = await addOrg(adminA, "T5 Org A");
  memberA = await addMember(orgA, "member.t5.a@school.edu", "officer");
  orgB = await addOrg(outsider, "T5 Org B");

  await db.query(`insert into public.platform_owners (officer_id) values ($1)`, [ownerId]);
});

after(async () => {
  await getDb().close();
});

describe("who can touch the feedback table", () => {
  it("lets no signed-in user read, write, change or delete it directly", async () => {
    const id = (await submit(adminA, orgA, "Seeded message")).rows[0].submit_feedback;

    const attempts: [string, () => Promise<unknown>][] = [
      ["select", () => as("authenticated", adminA, () => getDb().query(`select * from public.feedback`))],
      [
        "insert",
        () =>
          as("authenticated", adminA, () =>
            getDb().query(`insert into public.feedback (officer_id, page, message) values ($1, '/', 'direct')`, [adminA])
          ),
      ],
      [
        "update",
        () =>
          as("authenticated", adminA, () =>
            getDb().query(`update public.feedback set message = 'changed' where id = $1`, [id])
          ),
      ],
      [
        "delete",
        () => as("authenticated", adminA, () => getDb().query(`delete from public.feedback where id = $1`, [id])),
      ],
    ];

    for (const [name, run] of attempts) {
      assert.match((await errorOf(run)) ?? "", /permission denied/, `authenticated ${name}`);
    }
    assert.equal((await rowFor(id)).message, "Seeded message", "the row is untouched");
  });

  it("lets nobody signed out read or write it", async () => {
    for (const sql of [
      `select * from public.feedback`,
      `insert into public.feedback (officer_id, page, message) values ('${newUuid()}', '/', 'x')`,
    ]) {
      assert.match(
        (await errorOf(() => as("anon", null, () => getDb().query(sql)))) ?? "",
        /permission denied/
      );
    }
  });

  it("keeps submit_feedback to the server: signed-in users and anon cannot call it", async () => {
    for (const role of ["authenticated", "anon"] as const) {
      const user = role === "anon" ? null : adminA;
      const msg = await errorOf(() =>
        as(role, user, () =>
          getDb().query(`select public.submit_feedback($1, null, 'Hello', '/')`, [adminA])
        )
      );
      assert.match(msg ?? "", /permission denied/, role);
    }
  });
});

describe("submit_feedback", () => {
  it("saves the message trimmed, keeping line breaks inside it", async () => {
    const id = (await submit(adminA, orgA, "  \n Hello\n\nworld \n ")).rows[0].submit_feedback;
    const row = await rowFor(id);
    assert.equal(row.message, "Hello\n\nworld");
    assert.equal(row.officer_id, adminA);
    assert.equal(row.page, "/workspace/:id/dues");
  });

  it("keeps the org when the officer belongs to it", async () => {
    const id = (await submit(memberA, orgA, "From a member of A")).rows[0].submit_feedback;
    assert.equal((await rowFor(id)).org_id, orgA);
  });

  it("drops the org when the officer does not belong to it, so no one can tag another org", async () => {
    const id = (await submit(adminA, orgB, "Claiming org B")).rows[0].submit_feedback;
    assert.equal((await rowFor(id)).org_id, null);
  });

  it("allows no org at all (the new-workspace screen, the owner pages)", async () => {
    const id = (await submit(adminA, null, "No org yet", "/workspace/new")).rows[0].submit_feedback;
    const row = await rowFor(id);
    assert.equal(row.org_id, null);
    assert.equal(row.page, "/workspace/new");
  });

  it("falls back to / for a blank page and caps a long one at 200 characters", async () => {
    const blank = (await submit(adminA, null, "Blank page", "   ")).rows[0].submit_feedback;
    assert.equal((await rowFor(blank)).page, "/");

    const long = (await submit(adminA, null, "Long page", "/" + "x".repeat(500))).rows[0].submit_feedback;
    assert.equal((await rowFor(long)).page.length, 200);
  });

  it("rejects an empty message, and one of only spaces or line breaks", async () => {
    for (const message of ["", "   ", "\n\n", " \t\r\n "]) {
      assert.match(
        (await errorOf(() => submit(adminA, null, message))) ?? "",
        /invalid_message/,
        JSON.stringify(message)
      );
    }
  });

  it("allows 2000 characters and rejects 2001", async () => {
    await submit(memberA, null, "a".repeat(2000));
    assert.match((await errorOf(() => submit(memberA, null, "a".repeat(2001)))) ?? "", /invalid_message/);
  });

  it("counts an emoji as one character, like the app does", async () => {
    await submit(memberA, null, "😀".repeat(2000));
    assert.match((await errorOf(() => submit(memberA, null, "😀".repeat(2001)))) ?? "", /invalid_message/);
  });

  it("rejects an unknown or missing officer", async () => {
    assert.match((await errorOf(() => submit(newUuid(), null, "Hello"))) ?? "", /officer_not_found/);
    assert.match((await errorOf(() => submit(null, null, "Hello"))) ?? "", /officer_not_found/);
  });

  it("stops one officer flooding the inbox: 20 an hour, and other officers are unaffected", async () => {
    const flooder = await addOfficer("flooder.t5@school.edu", "Flooder T5");
    for (let i = 0; i < 20; i++) await submit(flooder, null, `Message ${i}`);

    assert.match((await errorOf(() => submit(flooder, null, "One too many"))) ?? "", /rate_limited/);
    // Someone else can still send
    await submit(outsider, null, "Still fine");

    // After the hour is up the flooder can send again
    await getDb().query(`update public.feedback set created_at = now() - interval '2 hours' where officer_id = $1`, [
      flooder,
    ]);
    await submit(flooder, null, "A new hour");
  });

  it("is deleted with the officer, and keeps the message (without an org) when the org is removed", async () => {
    const leaver = await addOfficer("leaver.t5@school.edu", "Leaver T5");
    const gone = (await submit(leaver, null, "I am leaving")).rows[0].submit_feedback;

    const doomedOrg = await addOrg(await addOfficer("doomed.t5@school.edu", "Doomed Admin"), "Doomed Org");
    const kept = (await submit(adminA, doomedOrg, "About a doomed org")).rows[0].submit_feedback;
    // adminA is not in the doomed org, so the org was dropped on save; attach it directly for this check
    await getDb().query(`update public.feedback set org_id = $1 where id = $2`, [doomedOrg, kept]);

    await getDb().query(`delete from public.officers where id = $1`, [leaver]);
    await getDb().query(`delete from public.orgs where id = $1`, [doomedOrg]);

    assert.equal(await rowFor(gone), undefined, "the officer's feedback is deleted with them");
    const row = await rowFor(kept);
    assert.equal(row.message, "About a doomed org");
    assert.equal(row.org_id, null);
  });
});

describe("get_feedback: owner only", () => {
  it("shows the owner every message, newest first, with sender and org", async () => {
    const a = (await submit(adminA, orgA, "Order check one")).rows[0].submit_feedback;
    const b = (await submit(memberA, orgA, "Order check two")).rows[0].submit_feedback;
    await getDb().query(`update public.feedback set created_at = now() + interval '1 minute' where id = $1`, [b]);
    await getDb().query(`update public.feedback set created_at = now() + interval '2 minutes' where id = $1`, [a]);

    const res = await inbox(ownerId);
    const ids = res.rows.map((r) => r.id);

    assert.ok(ids.indexOf(a) < ids.indexOf(b), "newest first");
    const first = res.rows.find((r) => r.id === a)!;
    assert.equal(first.message, "Order check one");
    assert.equal(first.org_name, "T5 Org A");
    assert.equal(first.officer_name, "Admin T5 A");
    assert.equal(first.officer_email, "admin.t5.a@school.edu");

    // The owner sees other officers' messages too (every org), not just their own
    assert.ok(res.rows.some((r) => r.officer_email === "outsider.t5@school.edu"));
  });

  it("denies a signed-in officer who is not the owner, even an org admin", async () => {
    for (const user of [adminA, memberA, outsider]) {
      assert.match((await errorOf(() => inbox(user))) ?? "", /not_authorized/);
    }
  });

  it("denies a request with no signed-in user and the anon role", async () => {
    assert.match((await errorOf(() => inbox(null))) ?? "", /not_authenticated/);
    assert.match((await errorOf(() => inbox(null, undefined, "anon"))) ?? "", /permission denied/);
  });

  it("limits the rows, and treats a silly limit as at least 1", async () => {
    assert.equal((await inbox(ownerId, 1)).rows.length, 1);
    assert.equal((await inbox(ownerId, 0)).rows.length, 1);
    assert.equal((await inbox(ownerId, -5)).rows.length, 1);
    assert.ok((await inbox(ownerId, null)).rows.length > 1);
  });
});
