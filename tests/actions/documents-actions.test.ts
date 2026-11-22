import { beforeEach, describe, expect, it, vi } from "vitest";

interface FakeState {
  user: { id: string } | null;
  callerRole: string | null;
  org: { id: string; name: string } | null;
  documents: Record<string, unknown>[];
  documentsQueryError: { message: string; code: string } | null;
  uploaded: { path: string; buffer: unknown }[];
  removed: string[][];
  uploadResult: { error: { message: string } | null };
  insertResultError: { message: string } | null;
  signedUrlResult: { data: { signedUrl: string } | null; error: { message: string } | null };
}

const state: FakeState = {
  user: null,
  callerRole: null,
  org: null,
  documents: [],
  documentsQueryError: null,
  uploaded: [],
  removed: [],
  uploadResult: { error: null },
  insertResultError: null,
  signedUrlResult: { data: { signedUrl: "https://signed.mock/doc.pdf" }, error: null },
};

function query(table: string) {
  let pendingInsert: Record<string, unknown> | null = null;
  let filterId: string | null = null;
  let filterOrgId: string | null = null;

  const builder: Record<string, unknown> = {
    select: () => builder,
    order: () => builder,
    eq: (col: string, val: string) => {
      if (col === "id") filterId = val;
      if (col === "org_id") filterOrgId = val;
      return builder;
    },
    maybeSingle: async () => {
      if (table === "org_officers") {
        return { data: state.callerRole ? { role: state.callerRole } : null, error: null };
      }
      if (table === "orgs") return { data: state.org, error: null };
      if (table === "documents") {
        const found = state.documents.find(
          (d) => (!filterId || d.id === filterId) && (!filterOrgId || d.org_id === filterOrgId)
        );
        return { data: found || null, error: null };
      }
      return { data: null, error: null };
    },
    single: async () => {
      if (table === "documents" && pendingInsert) {
        if (state.insertResultError) {
          return { data: null, error: state.insertResultError };
        }
        const created = {
          id: "new-doc-uuid",
          created_at: new Date().toISOString(),
          ...pendingInsert,
        };
        state.documents.push(created);
        return { data: created, error: null };
      }
      return { data: null, error: null };
    },
    insert: (payload: Record<string, unknown>) => {
      pendingInsert = payload;
      return builder;
    },
    delete: () => {
      return {
        eq: (col1: string, val1: string) => ({
          eq: (col2: string, val2: string) => {
            const initialLen = state.documents.length;
            state.documents = state.documents.filter((d) => {
              const match1 = d[col1] === val1;
              const match2 = d[col2] === val2;
              return !(match1 && match2);
            });
            return Promise.resolve({
              error: null,
              data: state.documents.length < initialLen ? [{ id: val1 }] : [],
            });
          },
        }),
      };
    },
    then: (resolve: (v: unknown) => unknown) => {
      if (table === "documents") {
        if (state.documentsQueryError) {
          return Promise.resolve({ data: null, error: state.documentsQueryError }).then(resolve);
        }
        const docs = filterOrgId
          ? state.documents.filter((d) => d.org_id === filterOrgId)
          : state.documents;
        return Promise.resolve({ data: docs, error: null }).then(resolve);
      }
      return Promise.resolve({ data: [], error: null }).then(resolve);
    },
  };
  return builder;
}

const fakeClient = {
  auth: { getUser: async () => ({ data: { user: state.user } }) },
  from: (table: string) => query(table),
  storage: {
    from: (_bucket: string) => ({
      upload: async (path: string, buffer: unknown) => {
        state.uploaded.push({ path, buffer });
        return state.uploadResult;
      },
      createSignedUrl: async () => state.signedUrlResult,
      remove: async (paths: string[]) => {
        state.removed.push(paths);
        return { data: null, error: null };
      },
    }),
  },
};

vi.mock("@/src/lib/supabase/server", () => ({ createClient: async () => fakeClient }));
vi.mock("@/src/lib/supabase/service-role", () => ({ createAdminClient: () => fakeClient }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const {
  getWorkspaceDocuments,
  addDocumentLinkAction,
  uploadDocumentFileAction,
  getDocumentDownloadUrlAction,
  deleteDocumentAction,
} = await import("@/src/app/(workspace)/documents-actions");

const ORG = "11111111-1111-4111-8111-111111111111";
const ME = "22222222-2222-4222-8222-222222222222";
const DOC_FILE_ID = "33333333-3333-4333-8333-333333333333";
const DOC_LINK_ID = "44444444-4444-4444-8444-444444444444";

beforeEach(() => {
  state.user = { id: ME };
  state.callerRole = "officer";
  state.org = { id: ORG, name: "Robotics Club" };
  state.uploaded = [];
  state.removed = [];
  state.uploadResult = { error: null };
  state.insertResultError = null;
  state.documentsQueryError = null;
  state.signedUrlResult = { data: { signedUrl: "https://signed.mock/doc.pdf" }, error: null };
  state.documents = [
    {
      id: DOC_FILE_ID,
      org_id: ORG,
      title: "Constitution 2026",
      category: "Legal",
      kind: "file",
      storage_path: `${ORG}/constitution.pdf`,
      url: null,
      file_size: 2048,
      mime_type: "application/pdf",
      created_by: ME,
      created_at: "2026-01-01T00:00:00Z",
    },
    {
      id: DOC_LINK_ID,
      org_id: ORG,
      title: "Google Drive Assets",
      category: "Templates",
      kind: "link",
      storage_path: null,
      url: "https://drive.google.com/drive/folders/123",
      file_size: null,
      mime_type: null,
      created_by: ME,
      created_at: "2026-01-02T00:00:00Z",
    },
  ];
});

describe("documents-actions: getWorkspaceDocuments", () => {
  it("returns documents and metadata for an authorized officer", async () => {
    const res = await getWorkspaceDocuments(ORG);
    expect(res.success).toBe(true);
    if (!res.success) return;

    expect(res.data.orgName).toBe("Robotics Club");
    expect(res.data.documents).toHaveLength(2);
    expect(res.data.documents[0].title).toBe("Constitution 2026");
    expect(res.data.documents[1].kind).toBe("link");
  });

  it("fails when user is unauthenticated", async () => {
    state.user = null;
    const res = await getWorkspaceDocuments(ORG);
    expect(res.success).toBe(false);
    if (res.success) return;
    expect(res.error).toBe("not_authenticated");
  });

  it("fails when user access is revoked", async () => {
    state.callerRole = null;
    const res = await getWorkspaceDocuments(ORG);
    expect(res.success).toBe(false);
    if (res.success) return;
    expect(res.error).toBe("access_revoked");
  });

  it("gracefully falls back to empty documents if schema cache does not have the table yet (PGRST205)", async () => {
    state.documentsQueryError = {
      message: "Could not find the table 'public.documents' in the schema cache",
      code: "PGRST205",
    };
    const res = await getWorkspaceDocuments(ORG);
    expect(res.success).toBe(true);
    if (!res.success) return;
    expect(res.data.documents).toEqual([]);
    expect(res.data.orgName).toBe("Robotics Club");
  });
});

describe("documents-actions: addDocumentLinkAction", () => {
  it("creates an external link document with valid parameters", async () => {
    const res = await addDocumentLinkAction(ORG, {
      title: "Bank Signatory Guidelines",
      category: "Finance",
      url: "https://bank.com/forms/signatory.pdf",
    });

    expect(res.success).toBe(true);
    if (!res.success) return;
    expect(res.data.kind).toBe("link");
    expect(res.data.title).toBe("Bank Signatory Guidelines");
    expect(res.data.url).toBe("https://bank.com/forms/signatory.pdf");
  });

  it("rejects an invalid or dangerous URL", async () => {
    const res = await addDocumentLinkAction(ORG, {
      title: "XSS Attempt",
      category: "General",
      url: "javascript:alert(1)",
    });

    expect(res.success).toBe(false);
    if (res.success) return;
    expect(res.error).toBe("invalid_url");
  });

  it("rejects an invalid title", async () => {
    const res = await addDocumentLinkAction(ORG, {
      title: "X",
      category: "General",
      url: "https://valid.com",
    });

    expect(res.success).toBe(false);
    if (res.success) return;
    expect(res.error).toBe("invalid_title");
  });
});

describe("documents-actions: uploadDocumentFileAction", () => {
  it("uploads an allowed file to storage and saves document record", async () => {
    const formData = new FormData();
    formData.append("title", "Annual Budget 2026");
    formData.append("category", "Finance");
    const file = new File(["dummy content"], "budget.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    formData.append("file", file);

    const res = await uploadDocumentFileAction(ORG, formData);
    expect(res.success).toBe(true);
    if (!res.success) return;

    expect(res.data.kind).toBe("file");
    expect(res.data.title).toBe("Annual Budget 2026");
    expect(res.data.storagePath).toMatch(new RegExp(`^${ORG}/[0-9a-f-]+\\.xlsx$`));
    expect(state.uploaded).toHaveLength(1);
  });

  it("rejects disallowed executable file types", async () => {
    const formData = new FormData();
    formData.append("title", "Suspicious Script");
    formData.append("category", "General");
    const file = new File(["echo hello"], "malware.exe", { type: "application/x-msdownload" });
    formData.append("file", file);

    const res = await uploadDocumentFileAction(ORG, formData);
    expect(res.success).toBe(false);
    if (res.success) return;
    expect(res.error).toBe("disallowed_file_type");
    expect(state.uploaded).toHaveLength(0);
  });

  it("rejects missing file", async () => {
    const formData = new FormData();
    formData.append("title", "Empty Upload");
    formData.append("category", "General");

    const res = await uploadDocumentFileAction(ORG, formData);
    expect(res.success).toBe(false);
    if (res.success) return;
    expect(res.error).toBe("file_required");
  });

  it("cleans up orphaned storage file if database insert fails", async () => {
    state.insertResultError = { message: "DB write failed" };

    const formData = new FormData();
    formData.append("title", "Orphan Test");
    formData.append("category", "Legal");
    const file = new File(["content"], "doc.pdf", { type: "application/pdf" });
    formData.append("file", file);

    const res = await uploadDocumentFileAction(ORG, formData);
    expect(res.success).toBe(false);
    if (res.success) return;
    expect(res.error).toBe("failed");

    // File was uploaded, then immediately cleaned up
    expect(state.uploaded).toHaveLength(1);
    expect(state.removed).toHaveLength(1);
    expect(state.removed[0][0]).toBe(state.uploaded[0].path);
  });
});

describe("documents-actions: getDocumentDownloadUrlAction", () => {
  it("generates a signed download URL for an existing file", async () => {
    const res = await getDocumentDownloadUrlAction(ORG, DOC_FILE_ID);
    expect(res.success).toBe(true);
    if (!res.success) return;
    expect(res.data.signedUrl).toBe("https://signed.mock/doc.pdf");
  });

  it("returns not_found if document is an external link, not a file", async () => {
    const res = await getDocumentDownloadUrlAction(ORG, DOC_LINK_ID);
    expect(res.success).toBe(false);
    if (res.success) return;
    expect(res.error).toBe("not_found");
  });

  it("returns not_found for non-existent document ID", async () => {
    const res = await getDocumentDownloadUrlAction(ORG, "99999999-9999-4999-8999-999999999999");
    expect(res.success).toBe(false);
    if (res.success) return;
    expect(res.error).toBe("not_found");
  });
});

describe("documents-actions: deleteDocumentAction", () => {
  it("deletes a file document and purges its storage object", async () => {
    const res = await deleteDocumentAction(ORG, DOC_FILE_ID);
    expect(res.success).toBe(true);
    if (!res.success) return;

    expect(state.removed).toHaveLength(1);
    expect(state.removed[0]).toEqual([`${ORG}/constitution.pdf`]);
  });

  it("deletes a link document without calling storage remove", async () => {
    const res = await deleteDocumentAction(ORG, DOC_LINK_ID);
    expect(res.success).toBe(true);
    if (!res.success) return;

    expect(state.removed).toHaveLength(0);
  });
});
