import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { as, addMember, addOfficer, addOrg, errorOf, getDb, startDb } from "./helpers.ts";

let orgA: string;
let orgB: string;
let adminA: string;
let officerA: string;
let adminB: string;
let officerB: string;
let studentMemberA: string;

const insertDocumentAs = (
  user: string | null,
  role: "authenticated" | "anon",
  orgId: string,
  doc: {
    title: string;
    category: string;
    kind: "file" | "link";
    storagePath?: string | null;
    url?: string | null;
    fileSize?: number | null;
    mimeType?: string | null;
  }
) =>
  as(role, user, () =>
    getDb().query<{ id: string }>(
      `insert into public.documents (org_id, title, category, kind, storage_path, url, file_size, mime_type, created_by)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       returning id`,
      [
        orgId,
        doc.title,
        doc.category,
        doc.kind,
        doc.storagePath ?? null,
        doc.url ?? null,
        doc.fileSize ?? null,
        doc.mimeType ?? null,
        user,
      ]
    )
  );

const selectDocumentsAs = (user: string | null, role: "authenticated" | "anon", orgId: string) =>
  as(role, user, () =>
    getDb().query<{
      id: string;
      org_id: string;
      title: string;
      category: string;
      kind: string;
      storage_path: string | null;
      url: string | null;
    }>(`select id, org_id, title, category, kind, storage_path, url from public.documents where org_id = $1`, [orgId])
  );

const deleteDocumentAs = (user: string | null, role: "authenticated" | "anon", docId: string) =>
  as(role, user, () =>
    getDb().query<{ id: string }>(`delete from public.documents where id = $1 returning id`, [docId])
  );

before(async () => {
  await startDb();

  adminA = await addOfficer("admin.h2.a@school.edu", "Admin H2 A");
  orgA = await addOrg(adminA, "H2 Org A");
  officerA = await addMember(orgA, "officer.h2.a@school.edu", "officer");

  adminB = await addOfficer("admin.h2.b@school.edu", "Admin H2 B");
  orgB = await addOrg(adminB, "H2 Org B");
  officerB = await addMember(orgB, "officer.h2.b@school.edu", "officer");

  // Add a non-officer student member to Org A
  const memberRes = await getDb().query<{ id: string }>(
    `insert into public.members (org_id, full_name, email, email_key, consent_version, consent_language)
     values ($1, 'Juan Dela Cruz', 'juan.student@school.edu', 'juan.student@school.edu', '1.0', 'en')
     returning id`,
    [orgA]
  );
  studentMemberA = memberRes.rows[0].id;
});

describe("H2: documents isolation and constraints", () => {
  it("allows an officer to insert a file document", async () => {
    const res = await insertDocumentAs(officerA, "authenticated", orgA, {
      title: "Constitution 2026",
      category: "Legal",
      kind: "file",
      storagePath: `${orgA}/constitution.pdf`,
      fileSize: 1024,
      mimeType: "application/pdf",
    });
    assert.ok(res.rows[0].id);

    const rows = await selectDocumentsAs(officerA, "authenticated", orgA);
    assert.equal(rows.rows.length, 1);
    assert.equal(rows.rows[0].title, "Constitution 2026");
    assert.equal(rows.rows[0].kind, "file");
  });

  it("allows an officer to insert an external link document", async () => {
    const res = await insertDocumentAs(adminA, "authenticated", orgA, {
      title: "Org Google Drive",
      category: "Templates",
      kind: "link",
      url: "https://drive.google.com/folder/123",
    });
    assert.ok(res.rows[0].id);

    const rows = await selectDocumentsAs(officerA, "authenticated", orgA);
    assert.equal(rows.rows.length, 2);
  });

  it("denies an officer of another org from seeing Org A's documents", async () => {
    const rows = await selectDocumentsAs(officerB, "authenticated", orgA);
    assert.equal(rows.rows.length, 0);
  });

  it("denies an officer of another org from inserting documents into Org A", async () => {
    const err = await errorOf(() =>
      insertDocumentAs(officerB, "authenticated", orgA, {
        title: "Malicious Document",
        category: "General",
        kind: "link",
        url: "https://malicious.org",
      })
    );
    assert.ok(err, "Cross-org insert must be rejected by RLS");
  });

  it("denies an anonymous caller from reading or writing documents", async () => {
    const errSelect = await errorOf(() => selectDocumentsAs(null, "anon", orgA));
    assert.ok(errSelect, "Anon select must fail with permission denied");

    const errInsert = await errorOf(() =>
      insertDocumentAs(null, "anon", orgA, {
        title: "Anon Document",
        category: "General",
        kind: "link",
        url: "https://anon.org",
      })
    );
    assert.ok(errInsert, "Anon insert must fail with permission denied");
  });

  it("denies a non-officer member from reading or writing documents", async () => {
    // Student member is in members table, not org_officers, so is_org_member() is false
    const rows = await selectDocumentsAs(studentMemberA, "authenticated", orgA);
    assert.equal(rows.rows.length, 0);

    const err = await errorOf(() =>
      insertDocumentAs(studentMemberA, "authenticated", orgA, {
        title: "Member Document",
        category: "General",
        kind: "link",
        url: "https://member.org",
      })
    );
    assert.ok(err, "Non-officer insert must fail by RLS");
  });

  it("enforces title length constraint", async () => {
    const err = await errorOf(() =>
      insertDocumentAs(officerA, "authenticated", orgA, {
        title: "A", // too short (< 2)
        category: "General",
        kind: "link",
        url: "https://valid.com",
      })
    );
    assert.ok(err);
  });

  it("enforces category enum check", async () => {
    const err = await errorOf(() =>
      insertDocumentAs(officerA, "authenticated", orgA, {
        title: "Invalid Category Doc",
        category: "InvalidCategory",
        kind: "link",
        url: "https://valid.com",
      })
    );
    assert.ok(err);
  });

  it("enforces payload constraints: files require storage_path, reject url", async () => {
    const errNoStorage = await errorOf(() =>
      insertDocumentAs(officerA, "authenticated", orgA, {
        title: "Missing Storage Path",
        category: "Finance",
        kind: "file",
      })
    );
    assert.ok(errNoStorage);

    const errFileWithUrl = await errorOf(() =>
      insertDocumentAs(officerA, "authenticated", orgA, {
        title: "File With Url",
        category: "Finance",
        kind: "file",
        storagePath: `${orgA}/valid.pdf`,
        url: "https://example.com/should-not-be-here",
        fileSize: 500,
        mimeType: "application/pdf",
      })
    );
    assert.ok(errFileWithUrl);
  });

  it("enforces payload constraints: links require url, reject storage_path and file_size", async () => {
    const errNoUrl = await errorOf(() =>
      insertDocumentAs(officerA, "authenticated", orgA, {
        title: "Missing Url",
        category: "Contacts",
        kind: "link",
      })
    );
    assert.ok(errNoUrl);

    const errLinkWithStorage = await errorOf(() =>
      insertDocumentAs(officerA, "authenticated", orgA, {
        title: "Link With Storage",
        category: "Contacts",
        kind: "link",
        url: "https://example.com",
        storagePath: `${orgA}/leak.pdf`,
      })
    );
    assert.ok(errLinkWithStorage);
  });

  it("allows officer of Org A to delete a document, blocks officer of Org B", async () => {
    const created = await insertDocumentAs(officerA, "authenticated", orgA, {
      title: "Doc To Delete",
      category: "General",
      kind: "link",
      url: "https://delete-me.org",
    });
    const docId = created.rows[0].id;

    // Officer B tries to delete Org A's doc -> returns 0 rows deleted
    const resB = await deleteDocumentAs(officerB, "authenticated", docId);
    assert.equal(resB.rows.length, 0);

    // Officer A deletes Org A's doc -> success
    const resA = await deleteDocumentAs(officerA, "authenticated", docId);
    assert.equal(resA.rows.length, 1);
  });
});
