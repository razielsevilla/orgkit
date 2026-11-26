import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToReadableStream } from "react-dom/server";

/**
 * Each page, rendered the way the officer sees it while the tour is open and the
 * real data is empty. The wrappers swap in example data, and the real page
 * component does the drawing, so these check that every page really accepts the
 * example data and puts on screen the controls the tour's beats point at.
 * (Server render: there is no browser here. What matters is the markup.)
 */

vi.mock("next/navigation", () => ({
  usePathname: () => "/workspace/22222222-2222-4222-8222-222222222222",
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), prefetch: vi.fn(), replace: vi.fn() }),
}));

const { TourDemoProvider } = await import("@/src/lib/tour/tour-demo");
const { MembersWithDemo } = await import("@/src/components/workspace/tour/demo/members-with-demo");
const { DuesWithDemo, EventsWithDemo, OfficersWithDemo, TermsWithDemo, DocumentsWithDemo, HandoverWithDemo, HomeWithDemo } =
  await import("@/src/components/workspace/tour/demo/page-demos");
const { MembersClient } = await import("@/src/components/workspace/members/members-client");
const { EventsClient } = await import("@/src/components/workspace/events/events-client");
const { buildTourBeats } = await import("@/src/lib/tour/tour-beats");

const ORG = "22222222-2222-4222-8222-222222222222";

async function render(element: ReturnType<typeof createElement>): Promise<string> {
  const stream = await renderToReadableStream(element);
  await stream.allReady;
  return (await new Response(stream).text()).replace(/<!-- -->/g, "").replace(/&#x27;/g, "'");
}

const tour = (open: boolean, child: ReturnType<typeof createElement>) =>
  render(createElement(TourDemoProvider, { value: open }, child));

const markers = (html: string) => new Set([...html.matchAll(/data-tour="([a-z0-9-]+)"/g)].map((m) => m[1]));

/** Every `target` a page's beats name, so a page can be checked against exactly what the tour needs */
const targetsFor = (section: string) =>
  new Set(
    buildTourBeats({ narrow: false })
      .filter((b) => b.section === section && b.kind === "info" && !b.adminOnly)
      .flatMap((b) => b.target ?? [])
      .filter((t) => t !== "page")
  );

const emptyMembers = { members: [], totalCount: 0, matchingCount: 0, hasMore: false, pendingCount: 0, inactiveCount: 0, joinLinkToken: null, canImport: true };

describe("Members", () => {
  const members = (open: boolean) =>
    tour(open, createElement(MembersWithDemo, { rawId: ORG, initialData: emptyMembers, canExport: true, orgName: "Robotics Club", siteUrl: "http://localhost:3000" }));

  it("shows the example roster while the tour is open, with what the tour points at", async () => {
    const html = await members(true);
    expect(html).toContain("Maria Clara Reyes");
    expect(html).toContain("Angelica Santos");
    const found = markers(html);
    for (const name of ["members-add", "members-search", "member-row-actions", "members-import", "members-export"]) {
      expect(found, name).toContain(name);
    }
  });

  it("shows the real, empty page when the tour is closed", async () => {
    const html = await members(false);
    expect(html).not.toContain("Maria Clara Reyes");
    expect(markers(html)).not.toContain("member-row-actions");
  });

  it("never replaces a roster that has real people in it", async () => {
    const real = { ...emptyMembers, totalCount: 1, matchingCount: 1, members: [{ id: "x", orgId: ORG, fullName: "Real Person", email: "real@school.edu", status: "active" as const, createdAt: "2026-01-01T00:00:00Z" }] };
    const html = await tour(true, createElement(MembersWithDemo, { rawId: ORG, initialData: real, orgName: "Robotics Club" }));
    expect(html).toContain("Real Person");
    expect(html).not.toContain("Maria Clara Reyes");
  });

  it("leaves the failed-to-load page alone, so an error is never hidden behind examples", async () => {
    const html = await tour(true, createElement(MembersWithDemo, { rawId: ORG, initialData: emptyMembers, initialError: "We couldn't load your members. Try again.", orgName: "Robotics Club" }));
    expect(html).toContain("We couldn&#x27;t load your members".replace("&#x27;", "'"));
    expect(html).not.toContain("Maria Clara Reyes");
    // The page component itself is the same one the real page uses
    expect(typeof MembersClient).toBe("function");
  });
});

describe("Dues", () => {
  const dues = (open: boolean, periods: unknown[] = []) =>
    tour(open, createElement(DuesWithDemo, { rawId: ORG, initialPeriods: periods as never, initialDashboardData: null, siteUrl: "http://localhost:3000" }));

  it("shows an open period part way through collecting, with the controls the tour points at", async () => {
    const html = await dues(true);
    expect(html).toContain("1st Sem Membership Dues");
    expect(html).toContain("Angelica Santos");
    const found = markers(html);
    for (const name of targetsFor("dues")) expect(found, name).toContain(name);
  });

  it("shows the empty page, with its own create button for the tour to point at, when the tour is closed", async () => {
    const html = await dues(false);
    expect(html).not.toContain("1st Sem Membership Dues");
    expect(markers(html)).toContain("dues-new-period");
  });
});

describe("Events", () => {
  it("shows upcoming and past events, with what the tour points at", async () => {
    const html = await tour(true, createElement(EventsWithDemo, { rawId: ORG, events: [] }));
    expect(html).toContain("General Assembly");
    expect(html).toContain("Orientation Day");
    expect(html).toContain("Cancelled");
    const found = markers(html);
    for (const name of targetsFor("events")) expect(found, name).toContain(name);
  });

  it("does not hide a failed load behind examples", async () => {
    const html = await tour(true, createElement(EventsWithDemo, { rawId: ORG, events: [], initialError: "Could not load events." }));
    expect(html).not.toContain("General Assembly");
    expect(typeof EventsClient).toBe("function");
  });
});

describe("Officers", () => {
  const me = { id: "me", fullName: "Raziel Sevilla", email: "me@school.edu", role: "admin" as const, isCurrentUser: true, joinedAt: "2026-01-01T00:00:00Z" };
  const data = {
    orgId: ORG,
    orgName: "Robotics Club",
    currentRole: "admin" as const,
    officers: [me],
    pendingInvites: [],
    officerCount: 1,
    adminCount: 1,
    canInvite: true,
    canManageRoles: true,
    canRemove: true,
  };

  it("keeps you in the list and adds teammates and an invite, with what the tour points at", async () => {
    const html = await tour(true, createElement(OfficersWithDemo, { rawId: ORG, initialData: data }));
    expect(html).toContain("Raziel Sevilla");
    expect(html).toContain("Carlo Fernandez");
    expect(html).toContain("Denise Aquino");
    const found = markers(html);
    for (const name of ["officers-invite", "officers-list"]) expect(found, name).toContain(name);
  });

  it("does not add teammates to a real team", async () => {
    const team = { ...data, officers: [me, { ...me, id: "b", fullName: "Real Teammate", isCurrentUser: false }], officerCount: 2 };
    const html = await tour(true, createElement(OfficersWithDemo, { rawId: ORG, initialData: team }));
    expect(html).toContain("Real Teammate");
    expect(html).not.toContain("Carlo Fernandez");
  });
});

describe("Terms", () => {
  const real = { orgId: ORG, orgName: "Robotics Club", isAdmin: true, terms: [], members: [], currentTermCount: 0, pastTermCount: 0 };

  it("shows this year's officers and last year's, with what the tour points at", async () => {
    const html = await tour(true, createElement(TermsWithDemo, { initialData: real }));
    expect(html).toContain("A.Y. 2026–2027");
    expect(html).toContain("Angelica Santos");
    const found = markers(html);
    for (const name of ["terms-record", "terms-card"]) expect(found, name).toContain(name);
  });

  it("still shows the Record Term button for an admin when closed (empty state)", async () => {
    expect(markers(await tour(false, createElement(TermsWithDemo, { initialData: real })))).toContain("terms-record");
  });
});

describe("Documents", () => {
  const real = { orgId: ORG, orgName: "Robotics Club", isAdmin: true, documents: [], categories: ["Finance", "Legal", "Templates", "Contacts", "General"] as never };

  it("shows files and links, with what the tour points at", async () => {
    const html = await tour(true, createElement(DocumentsWithDemo, { initialData: real }));
    expect(html).toContain("Organization Constitution");
    expect(html).toContain("Shared Drive: Org Files");
    const found = markers(html);
    for (const name of targetsFor("documents")) expect(found, name).toContain(name);
  });
});

describe("Handover", () => {
  it("shows a ready guide and a draft, with the role picker the tour points at", async () => {
    const html = await tour(true, createElement(HandoverWithDemo, { summary: { orgId: ORG, guides: [], activeRoles: [] }, isAdmin: true }));
    expect(html).toContain("President");
    expect(html).toContain("Treasurer");
    expect(markers(html)).toContain("handover-start");
  });
});

describe("Home", () => {
  const { brandNew, healthy } = {
    brandNew: () => ({
      today: "2026-12-01",
      generatedAt: "2026-12-01T02:00:00Z",
      members: { active: 0, pending: 0, inactive: 0, joined30d: 0, joinedPrev30d: 0, oldestPendingDays: null, joinedWeekly: [0, 0, 0, 0, 0, 0, 0, 0] },
      dues: null,
      events: { total: 0, upcoming: 0, nextEvent: null, held90d: 0, turnoutPct90d: null, heldPrev90d: 0, turnoutPctPrev90d: null, recent: [] },
      officers: { withAccess: 1, termsTotal: 0, termsCurrent: 0, termsEnding30d: 0, nextTermEnd: null },
      handover: { endingTotal: 0, endingReady: 0, endingDraft: 0, endingMissing: 0, roles: [], guidesReady: 0, guidesDraft: 0 },
      documents: { total: 0, categoriesCovered: 0 },
    }),
    healthy: () => ({
      today: "2026-12-01",
      generatedAt: "2026-12-01T02:00:00Z",
      members: { active: 40, pending: 0, inactive: 3, joined30d: 6, joinedPrev30d: 4, oldestPendingDays: null, joinedWeekly: [2, 1, 3, 2, 1, 4, 3, 2] },
      dues: null,
      events: { total: 8, upcoming: 2, nextEvent: null, held90d: 4, turnoutPct90d: 62, heldPrev90d: 3, turnoutPctPrev90d: 60, recent: [] },
      officers: { withAccess: 6, termsTotal: 6, termsCurrent: 6, termsEnding30d: 0, nextTermEnd: "2027-03-31" },
      handover: { endingTotal: 0, endingReady: 0, endingDraft: 0, endingMissing: 0, roles: [], guidesReady: 3, guidesDraft: 0 },
      documents: { total: 7, categoriesCovered: 4 },
    }),
  };

  it("shows a populated Home for a brand-new workspace, with every part the tour points at", async () => {
    const html = await tour(true, createElement(HomeWithDemo, { orgId: ORG, orgName: "Robotics Club", schoolName: null, data: brandNew() as never }));
    const found = markers(html);
    for (const name of ["home-summary", "home-chips", "home-next", "home-card-dues", "home-card-members", "home-card-events", "home-card-officers", "home-card-handover"]) {
      expect(found, name).toContain(name);
    }
    expect(html).toContain("1st Sem Membership Dues");
    expect(html).toContain("2 payments waiting for review");
  });

  it("shows the real Home when the tour is closed, so a new workspace is never shown fake numbers", async () => {
    const html = await tour(false, createElement(HomeWithDemo, { orgId: ORG, orgName: "Robotics Club", schoolName: null, data: brandNew() as never }));
    expect(html).not.toContain("1st Sem Membership Dues");
    expect(markers(html)).not.toContain("home-chips");
  });

  it("never replaces an org that already has something to rate", async () => {
    const html = await tour(true, createElement(HomeWithDemo, { orgId: ORG, orgName: "Robotics Club", schoolName: null, data: healthy() as never }));
    expect(html).not.toContain("1st Sem Membership Dues");
    expect(html).not.toContain("2 payments waiting for review");
  });
});
