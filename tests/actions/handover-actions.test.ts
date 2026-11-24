import { beforeEach, describe, expect, it, vi } from "vitest";

interface FakeState {
  user: { id: string } | null;
  callerRole: string | null;
  org: { id: string; name: string } | null;
  guides: Record<string, unknown>[];
  documents: Record<string, unknown>[];
  officerTerms: Record<string, unknown>[];
}

const state: FakeState = {
  user: null,
  callerRole: null,
  org: null,
  guides: [],
  documents: [],
  officerTerms: [],
};

function query(table: string) {
  let pendingInsert: Record<string, unknown> | null = null;
  let pendingUpdate: Record<string, unknown> | null = null;
  let filterId: string | null = null;
  let filterOrgId: string | null = null;
  let filterRoleTitle: string | null = null;

  const builder: Record<string, unknown> = {
    select: () => builder,
    order: () => builder,
    limit: () => builder,
    in: () => builder,
    eq: (col: string, val: string) => {
      if (col === "id") filterId = val;
      if (col === "org_id") filterOrgId = val;
      if (col === "role_title") filterRoleTitle = val;
      return builder;
    },
    maybeSingle: async () => {
      if (table === "org_officers") {
        return { data: state.callerRole ? { role: state.callerRole } : null, error: null };
      }
      if (table === "orgs") return { data: state.org, error: null };
      if (table === "handover_guides") {
        const found = state.guides.find(
          (g) =>
            (!filterId || g.id === filterId) &&
            (!filterOrgId || g.org_id === filterOrgId) &&
            (!filterRoleTitle || g.role_title === filterRoleTitle)
        );
        return { data: found || null, error: null };
      }
      return { data: null, error: null };
    },
    single: async () => {
      if (table === "handover_guides" && pendingInsert) {
        const created = {
          id: "guide-new-id",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...pendingInsert,
        };
        state.guides.push(created);
        return { data: created, error: null };
      }
      return { data: null, error: null };
    },
    insert: (payload: Record<string, unknown>) => {
      pendingInsert = payload;
      return builder;
    },
    update: (payload: Record<string, unknown>) => {
      pendingUpdate = payload;
      return {
        eq: (col1: string, val1: string) => ({
          eq: (col2: string, val2: string) => {
            const guide = state.guides.find((g) => g[col1] === val1 && g[col2] === val2);
            if (guide && pendingUpdate) {
              Object.assign(guide, pendingUpdate);
            }
            return Promise.resolve({ error: null, data: guide });
          },
        }),
      };
    },
    then: (resolve: (v: unknown) => unknown) => {
      if (table === "handover_guides") {
        const guides = filterOrgId
          ? state.guides.filter((g) => g.org_id === filterOrgId)
          : state.guides;
        return Promise.resolve({ data: guides, error: null }).then(resolve);
      }
      if (table === "documents") {
        const docs = filterOrgId
          ? state.documents.filter((d) => d.org_id === filterOrgId)
          : state.documents;
        return Promise.resolve({ data: docs, error: null }).then(resolve);
      }
      if (table === "officer_terms") {
        return Promise.resolve({ data: state.officerTerms, error: null }).then(resolve);
      }
      return Promise.resolve({ data: [], error: null }).then(resolve);
    },
  };
  return builder;
}

const fakeClient = {
  auth: { getUser: async () => ({ data: { user: state.user } }) },
  from: (table: string) => query(table),
};

vi.mock("@/src/lib/supabase/server", () => ({ createClient: async () => fakeClient }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const {
  getHandoverGuideAction,
  saveHandoverGuideAction,
  setHandoverStatusAction,
  getHandoverGuidesListAction,
} = await import("@/src/app/(workspace)/handover-actions");

const ORG = "11111111-1111-4111-8111-111111111111";
const ME = "22222222-2222-4222-8222-222222222222";
const OTHER = "33333333-3333-4333-8333-333333333333";
const GUIDE_1 = "44444444-4444-4444-8444-444444444444";
const GUIDE_OTHER = "55555555-5555-4555-8555-555555555555";
const GUIDE_READY = "66666666-6666-4666-8666-666666666666";
const GUIDE_LOCKED = "77777777-7777-4777-8777-777777777777";
const GUIDE_FINALIZE = "88888888-8888-4888-8888-888888888888";
const GUIDE_FINAL_REOPEN = "99999999-9999-4999-8999-999999999999";

beforeEach(() => {
  state.user = { id: ME };
  state.callerRole = "officer";
  state.org = { id: ORG, name: "Marketing Society" };
  state.guides = [];
  state.documents = [];
  state.officerTerms = [];
});

describe("handover-actions: getHandoverGuideAction", () => {
  it("returns default initial template when no guide exists for role", async () => {
    const res = await getHandoverGuideAction(ORG, "President");
    expect(res.success).toBe(true);
    if (!res.success) return;

    expect(res.data.roleTitle).toBe("President");
    expect(res.data.status).toBe("draft");
    expect(res.data.canEdit).toBe(true);
  });

  it("loads existing guide with author edit permissions", async () => {
    state.guides.push({
      id: GUIDE_1,
      org_id: ORG,
      role_title: "Secretary",
      status: "draft",
      sections: { what_i_do: "Take notes", recurring_tasks: "", key_contacts: "", open_items: "", where_things_are: "", linked_document_ids: [] },
      author_id: ME,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const res = await getHandoverGuideAction(ORG, GUIDE_1);
    expect(res.success).toBe(true);
    if (!res.success) return;

    expect(res.data.sections.what_i_do).toBe("Take notes");
    expect(res.data.canEdit).toBe(true);
  });

  it("blocks non-author from reading another officer's draft guide", async () => {
    state.guides.push({
      id: GUIDE_OTHER,
      org_id: ORG,
      role_title: "Treasurer",
      status: "draft",
      sections: { what_i_do: "Secret funds" },
      author_id: OTHER,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const res = await getHandoverGuideAction(ORG, GUIDE_OTHER);
    expect(res.success).toBe(false);
    if (res.success) return;
    expect(res.error).toBe("not_authorized");
  });

  it("allows incoming officer to read guide once marked ready", async () => {
    state.guides.push({
      id: GUIDE_READY,
      org_id: ORG,
      role_title: "Treasurer",
      status: "ready",
      sections: { what_i_do: "Handover ready content" },
      author_id: OTHER,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const res = await getHandoverGuideAction(ORG, GUIDE_READY);
    expect(res.success).toBe(true);
    if (!res.success) return;
    expect(res.data.status).toBe("ready");
    expect(res.data.canEdit).toBe(false);
  });
});

describe("handover-actions: saveHandoverGuideAction", () => {
  it("creates a new draft guide successfully", async () => {
    const res = await saveHandoverGuideAction(ORG, {
      roleTitle: "Public Relations Officer",
      sections: {
        what_i_do: "Manage social media",
        recurring_tasks: "Post weekly updates",
        key_contacts: "",
        open_items: "",
        where_things_are: "",
        linked_document_ids: [],
      },
    });

    expect(res.success).toBe(true);
    expect(state.guides.length).toBe(1);
    expect(state.guides[0].role_title).toBe("Public Relations Officer");
  });

  it("blocks editing of finalized ready guide unless admin", async () => {
    state.guides.push({
      id: GUIDE_LOCKED,
      org_id: ORG,
      role_title: "President",
      status: "ready",
      sections: { what_i_do: "Finalized" },
      author_id: ME,
    });

    // Regular officer attempts update
    state.callerRole = "officer";
    const resOfficer = await saveHandoverGuideAction(ORG, {
      guideId: GUIDE_LOCKED,
      roleTitle: "President",
      sections: {
        what_i_do: "Changed after finalization",
        recurring_tasks: "",
        key_contacts: "",
        open_items: "",
        where_things_are: "",
        linked_document_ids: [],
      },
    });

    expect(resOfficer.success).toBe(false);
    if (resOfficer.success) return;
    expect(resOfficer.error).toBe("forbidden_edit");

    // Admin attempts update
    state.callerRole = "admin";
    const resAdmin = await saveHandoverGuideAction(ORG, {
      guideId: GUIDE_LOCKED,
      roleTitle: "President",
      sections: {
        what_i_do: "Admin override",
        recurring_tasks: "",
        key_contacts: "",
        open_items: "",
        where_things_are: "",
        linked_document_ids: [],
      },
    });

    expect(resAdmin.success).toBe(true);
  });
});

describe("handover-actions: setHandoverStatusAction", () => {
  it("allows author to mark guide as ready", async () => {
    state.guides.push({
      id: GUIDE_FINALIZE,
      org_id: ORG,
      role_title: "Auditor",
      status: "draft",
      author_id: ME,
    });

    const res = await setHandoverStatusAction(ORG, {
      guideId: GUIDE_FINALIZE,
      status: "ready",
    });

    expect(res.success).toBe(true);
    expect(state.guides[0].status).toBe("ready");
  });

  it("blocks non-admin from reopening a ready guide", async () => {
    state.guides.push({
      id: GUIDE_FINAL_REOPEN,
      org_id: ORG,
      role_title: "Auditor",
      status: "ready",
      author_id: ME,
    });

    state.callerRole = "officer";
    const res = await setHandoverStatusAction(ORG, {
      guideId: GUIDE_FINAL_REOPEN,
      status: "draft",
    });

    expect(res.success).toBe(false);
    if (res.success) return;
    expect(res.error).toBe("not_authorized");
  });

  it("allows admin to reopen a ready guide", async () => {
    state.guides.push({
      id: GUIDE_FINAL_REOPEN,
      org_id: ORG,
      role_title: "Auditor",
      status: "ready",
      author_id: OTHER,
    });

    state.callerRole = "admin";
    const res = await setHandoverStatusAction(ORG, {
      guideId: GUIDE_FINAL_REOPEN,
      status: "draft",
    });

    expect(res.success).toBe(true);
    expect(state.guides[0].status).toBe("draft");
  });

  it("retrieves handover guides list and distinct roles", async () => {
    state.callerRole = "officer";
    const res = await getHandoverGuidesListAction(ORG);
    expect(res.success).toBe(true);
    if (!res.success) return;
    expect(res.data?.orgId).toBe(ORG);
    expect(Array.isArray(res.data?.guides)).toBe(true);
  });
});
