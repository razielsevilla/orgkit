import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToReadableStream } from "react-dom/server";

/**
 * Example data for the officer tour. An empty workspace has nothing for the tour to
 * point at, so while the tour is open an empty page shows made-up data instead
 * (nothing is saved). These tests keep that data believable and valid, because it
 * is shown to people as "what this page looks like": the numbers must add up the
 * way the real pages' do, the people and dates must agree across pages, and the
 * switch must only fire when the tour is open AND the real page is empty.
 */

vi.mock("next/navigation", () => ({ usePathname: () => "/workspace/abc", useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }) }));

const { TourDemoProvider, useDemoView, useExampleDataShown } = await import("@/src/lib/tour/tour-demo");
const { DEMO_MEMBER_LIST, demoMembersData } = await import("@/src/lib/tour/demo/members");
const { DEMO_DUES_DASHBOARD, DEMO_DUES_PERIODS, DEMO_OPEN_PERIOD_ID } = await import("@/src/lib/tour/demo/dues");
const { DEMO_EVENTS } = await import("@/src/lib/tour/demo/events");
const { demoOfficersData } = await import("@/src/lib/tour/demo/officers");
const { DEMO_TERMS, demoTermsData } = await import("@/src/lib/tour/demo/terms");
const { DEMO_DOCUMENTS, demoDocumentsData } = await import("@/src/lib/tour/demo/documents");
const { demoHandoverSummary } = await import("@/src/lib/tour/demo/handover");
const { demoHealthData } = await import("@/src/lib/tour/demo/home");
const { summarizeHealth } = await import("@/src/lib/health/org-health");
const { DOCUMENT_CATEGORIES, isValidExternalUrl, MAX_DOCUMENT_FILE_SIZE } = await import("@/src/lib/documents/documents-validation");
const { TourExampleBadge } = await import("@/src/components/workspace/tour/tour-example-badge");
const { TourCard } = await import("@/src/components/workspace/tour/tour-card");
const { buildTourBeats, describeProgress } = await import("@/src/lib/tour/tour-beats");

async function render(element: ReturnType<typeof createElement>): Promise<string> {
  const stream = await renderToReadableStream(element);
  await stream.allReady;
  return (await new Response(stream).text()).replace(/<!-- -->/g, "").replace(/&#x27;/g, "'");
}

const now = Date.now();
const active = DEMO_MEMBER_LIST.filter((m) => m.status === "active");
const pending = DEMO_MEMBER_LIST.filter((m) => m.status === "pending");

describe("when a page shows example data", () => {
  function Probe({ empty }: { empty: boolean }) {
    return createElement("span", null, String(useDemoView(empty)));
  }
  const withTour = (open: boolean, empty: boolean) =>
    render(createElement(TourDemoProvider, { value: open }, createElement(Probe, { empty })));

  it("only when the tour is open AND the page's real data is empty", async () => {
    expect(await withTour(true, true)).toContain("true");
    expect(await withTour(true, false)).toContain("false"); // real data is never replaced
    expect(await withTour(false, true)).toContain("false"); // no tour, no examples
    expect(await withTour(false, false)).toContain("false");
  });

  it("is off with no provider at all, so a page outside the workspace frame is never affected", async () => {
    expect(await render(createElement(Probe, { empty: true }))).toContain("false");
  });

  it("reports nothing as shown during server rendering", async () => {
    function Shown() {
      return createElement("span", null, String(useExampleDataShown()));
    }
    expect(await render(createElement(Shown))).toContain("false");
  });
});

describe("the example roster", () => {
  const real = { canImport: true, joinLinkToken: "real-token" };
  const data = demoMembersData(real);

  it("counts the way the real roster does: active plus pending, with inactive kept out of the list", () => {
    expect(data.totalCount).toBe(active.length + pending.length);
    expect(data.matchingCount).toBe(data.members.length);
    expect(data.pendingCount).toBe(pending.length);
    expect(data.hasMore).toBe(false);
    expect(data.members.every((m) => m.status !== "inactive")).toBe(true);
    expect(data.inactiveCount).toBeGreaterThan(0);
  });

  it("has students waiting to be confirmed, so Confirm is on screen", () => {
    expect(pending.length).toBeGreaterThanOrEqual(1);
    expect(active.length).toBeGreaterThanOrEqual(5);
  });

  it("uses made-up people with unique ids and example.edu addresses, never a real address", () => {
    expect(new Set(DEMO_MEMBER_LIST.map((m) => m.id)).size).toBe(DEMO_MEMBER_LIST.length);
    expect(new Set(DEMO_MEMBER_LIST.map((m) => m.email)).size).toBe(DEMO_MEMBER_LIST.length);
    for (const m of DEMO_MEMBER_LIST) expect(m.email).toMatch(/^[a-z.]+@example\.edu$/);
  });

  it("keeps what is true of the real org: whether this officer may import, and the join link", () => {
    expect(demoMembersData({ canImport: false, joinLinkToken: null }).canImport).toBe(false);
    expect(data.joinLinkToken).toBe("real-token");
  });
});

describe("the example dues", () => {
  const { summary, period, members, pagination } = DEMO_DUES_DASHBOARD;
  const amount = period.amount;
  const count = (status: string) => members.filter((m) => m.duesStatus === status).length;

  it("adds up the way the real dashboard does", () => {
    expect(summary.paidCount).toBe(count("paid"));
    expect(summary.pendingCount).toBe(count("pending"));
    expect(summary.rejectedCount).toBe(count("rejected"));
    expect(summary.unpaidCount).toBe(count("unpaid"));
    // Collected is verified payments; expected is active members times the amount; outstanding is everyone else
    expect(summary.collectedAmount).toBe(summary.paidCount * amount);
    expect(summary.expectedAmount).toBe(summary.activeMemberCount * amount);
    expect(summary.outstandingAmount).toBe((summary.unpaidCount + summary.pendingCount + summary.rejectedCount) * amount);
    expect(summary.collectedAmount + summary.outstandingAmount).toBe(summary.expectedAmount);
  });

  it("has every kind of member status the officer will learn about, and the rows agree with the payment", () => {
    for (const status of ["paid", "pending", "rejected", "unpaid"]) expect(count(status), status).toBeGreaterThanOrEqual(1);
    for (const m of members) {
      const expected = { paid: "verified", pending: "submitted", rejected: "rejected", unpaid: null }[m.duesStatus];
      expect(m.paymentStatus, m.fullName).toBe(expected);
      expect(Boolean(m.referenceNo), m.fullName).toBe(m.duesStatus !== "unpaid");
    }
    expect(members.find((m) => m.duesStatus === "rejected")?.rejectReason).toBeTruthy();
  });

  it("is about the same active members as the example roster, and fits on one page", () => {
    expect(members.map((m) => m.memberId).sort()).toEqual(active.map((m) => m.id).sort());
    expect(summary.activeMemberCount).toBe(active.length);
    expect(pagination).toMatchObject({ page: 1, totalMatching: members.length, totalPages: 1 });
  });

  it("has an open period with a working pay link and a closed one, and agrees with the dashboard", () => {
    const [open, closed] = DEMO_DUES_PERIODS;
    expect(open.id).toBe(DEMO_OPEN_PERIOD_ID);
    expect(open).toMatchObject({ status: "open", payLinkActive: true });
    expect(open.payToken).toBeTruthy();
    expect(closed.status).toBe("closed");
    expect(period).toMatchObject({ id: open.id, name: open.name, amount: open.amount, dueOn: open.dueOn });
    // The period count is every payment made: verified, waiting, and rejected
    expect(open.paymentCount).toBe(summary.paidCount + summary.pendingCount + summary.rejectedCount);
  });

  it("is due in the future relative to today, whenever the tour is opened", () => {
    expect(new Date(DEMO_DUES_PERIODS[0].dueOn).getTime()).toBeGreaterThan(now);
    expect(new Date(DEMO_DUES_PERIODS[1].dueOn).getTime()).toBeLessThan(now);
  });
});

describe("the example events", () => {
  it("has upcoming, ended and cancelled events, so both columns and the Cancelled badge show", () => {
    const upcoming = DEMO_EVENTS.filter((e) => e.status === "scheduled" && new Date(e.endsAt).getTime() > now);
    const ended = DEMO_EVENTS.filter((e) => e.status === "scheduled" && new Date(e.endsAt).getTime() < now);
    expect(upcoming.length).toBeGreaterThanOrEqual(2);
    expect(ended.length).toBeGreaterThanOrEqual(2);
    expect(DEMO_EVENTS.some((e) => e.status === "cancelled")).toBe(true);
  });

  it("ends after it starts, has a place, and has a unique id", () => {
    for (const e of DEMO_EVENTS) {
      expect(new Date(e.endsAt).getTime(), e.title).toBeGreaterThan(new Date(e.startsAt).getTime());
      expect(e.location, e.title).toBeTruthy();
      expect(e.checkinOpen, e.title).toBe(false);
    }
    expect(new Set(DEMO_EVENTS.map((e) => e.id)).size).toBe(DEMO_EVENTS.length);
  });
});

describe("the example team", () => {
  const me = { id: "me", fullName: "You", email: "me@school.edu", role: "admin" as const, isCurrentUser: true, joinedAt: "2026-01-01T00:00:00Z" };
  const real = {
    orgId: "o",
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

  it("keeps the real officer first and still marked as you, then adds teammates and one invite", () => {
    const out = demoOfficersData(real);
    expect(out.officers[0]).toEqual(me);
    expect(out.officers.filter((o) => o.isCurrentUser)).toHaveLength(1);
    expect(out.officers.length).toBeGreaterThanOrEqual(3);
    expect(out.officerCount).toBe(out.officers.length);
    expect(out.pendingInvites).toHaveLength(1);
    expect(out.adminCount).toBe(1);
  });

  it("shows email addresses only to an admin, as the real list does", () => {
    const asAdmin = demoOfficersData(real);
    expect(asAdmin.officers.slice(1).every((o) => o.email)).toBe(true);
    const asOfficer = demoOfficersData({ ...real, currentRole: "officer", canInvite: false });
    expect(asOfficer.officers.slice(1).every((o) => !o.email)).toBe(true);
    expect(asOfficer.pendingInvites.every((i) => !i.email)).toBe(true);
  });
});

describe("the example terms", () => {
  const real = { orgId: "o", orgName: "Robotics Club", isAdmin: true, terms: [], members: [], currentTermCount: 0, pastTermCount: 0 };
  const data = demoTermsData(real);

  it("has a current year and a past year, with the flag matching the dates", () => {
    expect(data.currentTermCount).toBe(DEMO_TERMS.filter((t) => !t.isEnded).length);
    expect(data.pastTermCount).toBe(DEMO_TERMS.filter((t) => t.isEnded).length);
    expect(data.currentTermCount).toBeGreaterThanOrEqual(1);
    expect(data.pastTermCount).toBeGreaterThanOrEqual(1);
    for (const t of DEMO_TERMS) {
      expect(t.isEnded, `${t.roleTitle} ${t.termName}`).toBe(new Date(t.endDate).getTime() < now);
      expect(t.endDate >= t.startDate, t.roleTitle).toBe(true);
    }
  });

  it("never gives one person two overlapping terms for the same role (the rule the real page enforces)", () => {
    for (const a of DEMO_TERMS) {
      for (const b of DEMO_TERMS) {
        if (a === b || a.holderName !== b.holderName || a.roleTitle.toLowerCase() !== b.roleTitle.toLowerCase()) continue;
        expect(a.startDate <= b.endDate && a.endDate >= b.startDate, `${a.holderName} ${a.roleTitle}`).toBe(false);
      }
    }
  });

  it("is held by people on the example roster, and keeps the real org's name and admin status", () => {
    const names = new Set(DEMO_MEMBER_LIST.map((m) => m.fullName));
    for (const t of DEMO_TERMS) expect(names, t.holderName).toContain(t.holderName);
    expect(data.orgName).toBe("Robotics Club");
    expect(demoTermsData({ ...real, isAdmin: false }).isAdmin).toBe(false);
  });
});

describe("the example documents", () => {
  it("spans the categories with valid files and links", () => {
    const categories = new Set(DEMO_DOCUMENTS.map((d) => d.category));
    expect(categories.size).toBeGreaterThanOrEqual(4);
    for (const d of DEMO_DOCUMENTS) {
      expect(DOCUMENT_CATEGORIES, d.title).toContain(d.category);
      if (d.kind === "file") {
        expect(d.storagePath && d.fileSize && d.mimeType, d.title).toBeTruthy();
        expect(d.url, d.title).toBeNull();
        expect(d.fileSize!, d.title).toBeLessThanOrEqual(MAX_DOCUMENT_FILE_SIZE);
      } else {
        expect(isValidExternalUrl(d.url ?? ""), d.title).toBe(true);
        expect(d.storagePath, d.title).toBeNull();
      }
    }
    expect(DEMO_DOCUMENTS.some((d) => d.kind === "file")).toBe(true);
    expect(DEMO_DOCUMENTS.some((d) => d.kind === "link")).toBe(true);
  });

  it("keeps the real org's name, categories and admin status", () => {
    const real = { orgId: "o", orgName: "Robotics Club", isAdmin: true, documents: [], categories: DOCUMENT_CATEGORIES };
    const out = demoDocumentsData(real);
    expect(out).toMatchObject({ orgName: "Robotics Club", isAdmin: true, categories: DOCUMENT_CATEGORIES });
    expect(out.documents).toBe(DEMO_DOCUMENTS);
  });
});

describe("the example handover guides", () => {
  it("has a ready guide and a draft", () => {
    const out = demoHandoverSummary({ orgId: "o", guides: [], activeRoles: [] });
    expect(out.orgId).toBe("o");
    expect(out.guides.map((g) => g.status).sort()).toEqual(["draft", "ready"]);
    expect(out.activeRoles.length).toBeGreaterThanOrEqual(2);
  });
});

describe("the example Home", () => {
  const data = demoHealthData();
  const summary = summarizeHealth(data);

  it("has something to say in every area, a mix of statuses, and things to do next", () => {
    expect(summary.considered).toBe(5);
    expect(summary.counts.empty).toBe(0);
    expect(summary.counts.good).toBeGreaterThanOrEqual(1);
    expect(summary.counts.watch + summary.counts.critical).toBeGreaterThanOrEqual(1);
    expect(summary.attention.length).toBeGreaterThanOrEqual(2);
  });

  it("agrees with the other example pages, so the same story is told everywhere", () => {
    expect(data.members.active).toBe(active.length);
    expect(data.members.pending).toBe(pending.length);
    expect(data.members.joinedWeekly.reduce((a, b) => a + b, 0)).toBe(DEMO_MEMBER_LIST.length);
    const s = DEMO_DUES_DASHBOARD.summary;
    expect(data.dues).toMatchObject({
      name: DEMO_DUES_PERIODS[0].name,
      paid: s.paidCount,
      pending: s.pendingCount,
      rejected: s.rejectedCount,
      unpaid: s.unpaidCount,
      collected: s.collectedAmount,
      expected: s.expectedAmount,
      outstanding: s.outstandingAmount,
    });
    expect(data.events.total).toBe(DEMO_EVENTS.length);
    expect(data.officers.termsTotal).toBe(DEMO_TERMS.length);
    expect(data.officers.termsCurrent).toBe(DEMO_TERMS.filter((t) => !t.isEnded).length);
    expect(data.documents.total).toBe(DEMO_DOCUMENTS.length);
  });

  it("counts joins in the 30 days the way the roster's dates say", () => {
    const within = (from: number, to: number) =>
      DEMO_MEMBER_LIST.filter((m) => {
        const age = (now - new Date(m.createdAt).getTime()) / 86_400_000;
        return age >= from && age < to;
      }).length;
    expect(data.members.joined30d).toBe(within(0, 30));
    expect(data.members.joinedPrev30d).toBe(within(30, 60));
  });

  it("is dated today, so its dates and pace read correctly whenever the tour opens", () => {
    expect(data.today).toBe(new Date().toISOString().slice(0, 10));
    expect(new Date(data.dues!.dueOn).getTime()).toBeGreaterThan(now);
  });
});

describe("telling the officer it is not real", () => {
  it("shows a badge that says so, as a note for screen readers too", async () => {
    const out = await render(createElement(TourExampleBadge));
    expect(out).toContain("Example data for the tour");
    expect(out).toContain("Nothing is saved");
    expect(out).toContain('role="note"');
  });

  it("puts the same words on the card when the page behind it shows example data, and not otherwise", async () => {
    const beats = buildTourBeats({ narrow: false });
    const beat = beats.find((b) => b.id === "dues-new")!;
    const props = {
      beat,
      progress: describeProgress(beats, beats.indexOf(beat)),
      isAdmin: true,
      orgId: "o",
      mode: "float" as const,
      showMissing: false,
      isFirst: false,
      isLast: false,
      onBack: () => {},
      onNext: () => {},
      onSkipSection: () => {},
      onClose: () => {},
    };
    expect(await render(createElement(TourCard, { ...props, sample: true }))).toContain("Example data, made up for this tour. Nothing here is saved.");
    expect(await render(createElement(TourCard, props))).not.toContain("made up for this tour");
  });

  it("is introduced on the welcome card", () => {
    const welcome = buildTourBeats({ narrow: false })[0];
    expect(welcome.body).toContain("example data");
    expect(welcome.body).toContain("Nothing is saved");
  });
});

describe("the wiring that cannot be seen by rendering", () => {
  const ROOT = join(import.meta.dirname, "../..");
  const read = (path: string) => readFileSync(join(ROOT, path), "utf8");

  it("stops the pages that refetch from replacing example data with the real, empty result", () => {
    // React's development double-run of effects would otherwise fetch right after mounting
    expect(read("src/components/workspace/members/use-member-roster.ts")).toMatch(/if \(demo\) return;\s+if \(isFirstRender/);
    expect(read("src/components/workspace/dues/dues-client.tsx")).toMatch(/if \(demo\) return;\s+if \(isFirstMountRef/);
    expect(read("src/components/workspace/members/members-client.tsx")).toMatch(/notify: setToastError,\s+demo,/);
  });

  it("gives the example page a fresh start, with a different key, and passes `demo` to the two that fetch", () => {
    const wrappers =
      read("src/components/workspace/tour/demo/page-demos.tsx") + read("src/components/workspace/tour/demo/members-with-demo.tsx");
    expect(wrappers.match(/key="demo"/g)?.length).toBe(8); // the seven in page-demos.tsx, plus Members
    expect(wrappers.match(/\bdemo\s*\/>/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it("opens every page through its wrapper, so a page cannot be left out", () => {
    const base = "src/app/(workspace)/workspace/[id]/";
    const expected: Record<string, string> = {
      "page.tsx": "HomeWithDemo",
      "members/page.tsx": "MembersWithDemo",
      "dues/page.tsx": "DuesWithDemo",
      "events/page.tsx": "EventsWithDemo",
      "officers/page.tsx": "OfficersWithDemo",
      "terms/page.tsx": "TermsWithDemo",
      "documents/page.tsx": "DocumentsWithDemo",
      "handover/page.tsx": "HandoverWithDemo",
    };
    for (const [file, wrapper] of Object.entries(expected)) expect(read(base + file), file).toContain(`<${wrapper}`);
  });

  it("tells every page that the tour is open, from the one workspace frame", () => {
    expect(read("src/components/workspace/frame/workspace-frame.tsx")).toContain(
      "<TourDemoProvider value={tour.isOpen}>{children}</TourDemoProvider>"
    );
  });

  it("never writes example data anywhere: no server action, database or storage in the demo code", () => {
    for (const file of [
      "src/lib/tour/tour-demo.ts",
      "src/components/workspace/tour/demo/page-demos.tsx",
      "src/components/workspace/tour/demo/members-with-demo.tsx",
    ]) {
      expect(read(file), file).not.toMatch(/Action\b|supabase|localStorage|fetch\(/);
    }
    for (const name of ["members", "dues", "events", "officers", "terms", "documents", "handover", "home", "dates"]) {
      expect(read(`src/lib/tour/demo/${name}.ts`), name).not.toMatch(/supabase|server-only|localStorage|fetch\(/);
    }
  });
});
