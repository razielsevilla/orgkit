import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToReadableStream } from "react-dom/server";
import { OrgHealthDashboard } from "@/src/components/workspace/home/org-health-dashboard";
import { brandNew, healthy } from "@/tests/stubs/org-health-fixture";
import type { OrgHealthData } from "@/src/lib/health/org-health";

/** The three figures that replaced the segmented bar: ranked bars (Dues), unit squares (Terms), a dot timeline (Handover) */

const ORG = "11111111-1111-4111-8111-111111111111";

async function dashboard(data: OrgHealthData) {
  const stream = await renderToReadableStream(
    createElement(OrgHealthDashboard, { orgId: ORG, orgName: "Robotics Club", schoolName: null, data })
  );
  await stream.allReady;
  return (await new Response(stream).text()).replaceAll("<!-- -->", "");
}

const text = (markup: string) =>
  markup
    .replace(/<style[\s\S]*?<\/style>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const leaving = (roles: { roleTitle: string; endDate: string; guideStatus: "ready" | "draft" | "missing" }[]) =>
  healthy({
    handover: {
      ...healthy().handover,
      endingTotal: roles.length,
      endingReady: roles.filter((r) => r.guideStatus === "ready").length,
      endingDraft: roles.filter((r) => r.guideStatus === "draft").length,
      endingMissing: roles.filter((r) => r.guideStatus === "missing").length,
      roles,
    },
  });

describe("Home figures: the segmented bar is gone", () => {
  it("is not used anywhere on the page", async () => {
    for (const data of [healthy(), brandNew(), leaving([{ roleTitle: "Treasurer", endDate: "2026-12-10", guideStatus: "missing" }])]) {
      const out = await dashboard(data);
      // the old bar was a 28px flex row with proportional parts
      expect(out).not.toMatch(/display:flex;gap:2px;height:28px/);
    }
  });
});

describe("Home figures: ranked bars (Dues)", () => {
  it("draws one thin bar per status, and leaves a status with none out", async () => {
    const out = await dashboard(healthy({ dues: { ...healthy().dues!, paid: 30, pending: 0, rejected: 0, unpaid: 10 } }));
    expect(out).toContain('aria-label="Members by payment status: 30 paid, 10 unpaid"');
    expect(out.match(/border-radius:0 4px 4px 0/g)).toHaveLength(2);
    expect(out).not.toContain("pending (");
  });

  it("shows the value at the tip of its bar in mono, with tabular numerals", async () => {
    const out = await dashboard(healthy());
    expect(out).toMatch(/left:calc\(82% \+ 8px\)[^>]*font-family:var\(--font-jetbrains\)[^>]*>30</);
    expect(out).toMatch(/left:calc\(82% \+ 8px\)[^>]*font-variant-numeric:tabular-nums/);
  });

  it("scales bars to the largest, so close values can be told apart", async () => {
    const out = await dashboard(healthy({ dues: { ...healthy().dues!, paid: 20, pending: 10, rejected: 5, unpaid: 5 } }));
    const widths = [...out.matchAll(/width:([\d.]+)%;height:100%;border-radius:0 4px 4px 0/g)].map((m) => Number(m[1]));
    expect(widths).toEqual([82, 41, 20.5, 20.5]);
  });

  it("draws nothing when no member counts", async () => {
    const out = await dashboard(healthy({ dues: { ...healthy().dues!, paid: 0, pending: 0, rejected: 0, unpaid: 0 } }));
    expect(out).not.toContain("Members by payment status");
  });
});

describe("Home figures: unit squares (Terms)", () => {
  it("draws one square for every current term, coloured by state", async () => {
    const out = await dashboard(
      healthy({ officers: { withAccess: 6, termsTotal: 6, termsCurrent: 6, termsEnding30d: 2, nextTermEnd: "2026-12-08" } })
    );
    expect(out.match(/title="steady"/g)).toHaveLength(4);
    expect(out.match(/title="ending within 30 days"/g)).toHaveLength(2);
    expect(out).toContain('aria-label="Current terms: 4 steady, 2 ending within 30 days"');
  });

  it("names each state in a legend with its count", async () => {
    const t = text(
      await dashboard(healthy({ officers: { withAccess: 6, termsTotal: 6, termsCurrent: 6, termsEnding30d: 2, nextTermEnd: null } }))
    );
    expect(t).toContain("4 steady");
    expect(t).toContain("2 ending within 30 days");
  });

  it("stops at 40 squares and says how many more there are, so a large org never overflows", async () => {
    const out = await dashboard(
      healthy({ officers: { withAccess: 60, termsTotal: 45, termsCurrent: 45, termsEnding30d: 0, nextTermEnd: null } })
    );
    expect(out.match(/title="steady"/g)).toHaveLength(40);
    expect(text(out)).toContain("+5");
  });

  it("is also what shows guides when no role is leaving", async () => {
    const out = await dashboard(healthy({ handover: { ...healthy().handover, guidesReady: 3, guidesDraft: 1 } }));
    expect(out).toContain('aria-label="Guides by status: 3 ready, 1 draft"');
    expect(out.match(/title="ready"/g)).toHaveLength(3);
    expect(out.match(/title="draft"/g)).toHaveLength(1);
  });
});

describe("Home figures: dot timeline (Handover)", () => {
  const roles = [
    { roleTitle: "Treasurer", endDate: "2026-12-13", guideStatus: "missing" as const },
    { roleTitle: "Secretary", endDate: "2026-12-31", guideStatus: "draft" as const },
    { roleTitle: "Auditor", endDate: "2027-01-30", guideStatus: "ready" as const },
  ];

  it("puts each leaving role on its own row, so close dates never overlap", async () => {
    const out = await dashboard(leaving(roles));
    for (const role of roles) expect(out).toContain(`title="${role.roleTitle}: `);
    expect(out.match(/title="(Treasurer|Secretary|Auditor): /g)).toHaveLength(3);
  });

  it("places each dot by the days left on a 60 day axis", async () => {
    const out = await dashboard(leaving(roles));
    // today is 2026-12-01: 12, 30 and 60 days away
    expect(out).toContain("left:20%;top:50%;width:12px");
    expect(out).toContain("left:50%;top:50%;width:12px");
    expect(out).toContain("left:100%;top:50%;width:12px");
  });

  it("labels the axis at both ends and the middle", async () => {
    const t = text(await dashboard(leaving(roles)));
    expect(t).toContain("today");
    expect(t).toContain("30 days");
    expect(t).toContain("60 days");
  });

  it("keeps the dots clear of the stem with a 2px surface ring", async () => {
    expect(await dashboard(leaving(roles))).toContain("box-shadow:0 0 0 2px var(--color-surface)");
  });

  it("describes every role in words, with the guide state and the days left", async () => {
    const out = await dashboard(leaving(roles));
    expect(out).toContain(
      "Leaving roles by days left: Treasurer: no guide, term ends in 12 days; Secretary: draft, term ends in 30 days; Auditor: ready, term ends in 60 days"
    );
  });

  it("names the three states in a legend, only the ones in use", async () => {
    const t = text(await dashboard(leaving([roles[0], roles[1]])));
    expect(t).toContain("draft");
    expect(t).toContain("no guide");
    expect(t).not.toContain("ready ready");
  });

  it("shows three rows at most, and keeps every role in the text description", async () => {
    const many = [
      ...roles,
      { roleTitle: "PRO", endDate: "2027-01-15", guideStatus: "ready" as const },
      { roleTitle: "Webmaster", endDate: "2027-01-20", guideStatus: "draft" as const },
    ];
    const out = await dashboard(leaving(many));
    expect(out.match(/title="(Treasurer|Secretary|Auditor|PRO|Webmaster): /g)).toHaveLength(3);
    expect(out).toContain("PRO: ready");
    expect(out).toContain("Webmaster: draft");
  });

  it("shortens a long role name with an ellipsis instead of widening the card", async () => {
    const out = await dashboard(
      leaving([{ roleTitle: "Vice President for Internal and External Affairs and Partnerships", endDate: "2026-12-20", guideStatus: "missing" }])
    );
    expect(out).toContain('class="orgkit-truncate"');
  });

  it("holds a date past the axis to the axis, and escapes names", async () => {
    const out = await dashboard(
      leaving([{ roleTitle: "<img src=x onerror=alert(1)>", endDate: "2027-06-01", guideStatus: "draft" }])
    );
    expect(out).toContain("left:100%;top:50%;width:12px");
    expect(out).not.toContain("<img");
  });

  it("links to documents from the legend row, not from a row of its own", async () => {
    const out = await dashboard(leaving(roles));
    expect(out).toContain(`href="/workspace/${ORG}/documents"`);
    expect(text(out)).toContain("7 documents");
  });
});

describe("Home figures: clearer to read", () => {
  it("says what a square is on Terms, and on Handover when no role is leaving", async () => {
    const out = await dashboard(healthy());
    expect(text(out)).toContain("One square for each current term");
    const guides = await dashboard(healthy({ handover: { ...healthy().handover, guidesReady: 2, guidesDraft: 1 } }));
    expect(text(guides)).toContain("One square for each guide");
  });

  it("says what the dot timeline measures, so the ticks read as 'ends in today, 30 days, 60 days'", async () => {
    const t = text(
      await dashboard(leaving([{ roleTitle: "Treasurer", endDate: "2026-12-13", guideStatus: "missing" }]))
    );
    expect(t).toContain("ends in");
    expect(t).toContain("today");
    expect(t).toContain("30 days");
    expect(t).toContain("60 days");
  });

  it("writes the days left beside each dot", async () => {
    const out = await dashboard(
      leaving([
        { roleTitle: "Treasurer", endDate: "2026-12-13", guideStatus: "missing" },
        { roleTitle: "Secretary", endDate: "2026-12-01", guideStatus: "draft" },
      ])
    );
    expect(text(out)).toContain("12d");
    // a term that ends today says so
    expect(text(out)).toMatch(/Secretary[\s\S]*today/);
  });

  it("puts the label on the side of the dot with room: right normally, left near the end of the axis", async () => {
    const out = await dashboard(
      leaving([
        { roleTitle: "Treasurer", endDate: "2026-12-13", guideStatus: "missing" },
        { roleTitle: "Auditor", endDate: "2027-01-30", guideStatus: "ready" },
      ])
    );
    expect(out).toContain("left:calc(20% + 12px)");
    expect(out).toContain("right:calc(0% + 12px)");
  });
});

describe("Home figures: Members and Events still show a chart without the weekly series", () => {
  const withoutSeries = (patch: Partial<OrgHealthData> = {}) =>
    healthy({
      members: { ...healthy().members, joinedWeekly: [], joined30d: 6, joinedPrev30d: 4 },
      events: { ...healthy().events, recent: [], turnoutPct90d: 62, turnoutPctPrev90d: 70 },
      ...patch,
    });

  it("compares new members this month with the month before, in that order", async () => {
    const out = await dashboard(withoutSeries());
    expect(out).toContain('aria-label="New members by period: 6 last 30 days, 4 30 days before"');
    expect(out).not.toContain("New members per week");
  });

  it("keeps the order even when the earlier month was bigger", async () => {
    const out = await dashboard(
      withoutSeries({ members: { ...healthy().members, joinedWeekly: [], joined30d: 2, joinedPrev30d: 9 } })
    );
    expect(out).toContain('aria-label="New members by period: 2 last 30 days, 9 30 days before"');
  });

  it("compares turnout over the last 90 days with the 90 before, with the percent sign", async () => {
    const out = await dashboard(withoutSeries());
    expect(out).toContain('aria-label="Average turnout by period: 62% last 90 days, 70% 90 days before"');
    expect(text(out)).toContain("62%");
    expect(text(out)).toContain("70%");
    expect(out).not.toContain("Turnout per event");
  });

  it("shows only the current period when there is nothing before it", async () => {
    const out = await dashboard(
      withoutSeries({ events: { ...healthy().events, recent: [], turnoutPct90d: 62, turnoutPctPrev90d: null } })
    );
    expect(out).toContain('aria-label="Average turnout by period: 62% last 90 days"');
  });

  it("switches to the richer charts as soon as the series arrives", async () => {
    const out = await dashboard(healthy());
    expect(out).toContain("New members per week");
    expect(out).toContain("Turnout per event");
    expect(out).not.toContain("New members by period");
    expect(out).not.toContain("Average turnout by period");
  });

  it("draws nothing when there is nothing to compare", async () => {
    const out = await dashboard(
      withoutSeries({
        members: { ...healthy().members, joinedWeekly: [], joined30d: 0, joinedPrev30d: 0 },
        events: { ...healthy().events, recent: [], turnoutPct90d: null, turnoutPctPrev90d: null },
      })
    );
    expect(out).not.toContain("New members by period");
    expect(out).not.toContain("Average turnout by period");
  });
});
