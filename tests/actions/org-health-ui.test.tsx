import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToReadableStream } from "react-dom/server";
import { OrgHealthDashboard } from "@/src/components/workspace/home/org-health-dashboard";
import { OrgHealthUnavailable } from "@/src/components/workspace/home/org-health-unavailable";
import { brandNew, healthy } from "@/tests/stubs/org-health-fixture";
import type { OrgHealthData } from "@/src/lib/health/org-health";

const ORG = "11111111-1111-4111-8111-111111111111";

/** Server-rendered markup, with React's `<!-- -->` text separators removed so "75% collected" reads as one string */
async function html(element: ReturnType<typeof createElement>) {
  const stream = await renderToReadableStream(element);
  await stream.allReady;
  return (await new Response(stream).text()).replaceAll("<!-- -->", "");
}

const dashboard = (data: OrgHealthData, orgName = "Robotics Club", schoolName: string | null = "Mapua") =>
  html(createElement(OrgHealthDashboard, { orgId: ORG, orgName, schoolName, data }));

/** The visible text of a page, tags removed and spaces collapsed */
const text = (markup: string) =>
  markup
    .replace(/<style[\s\S]*?<\/style>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

const hrefs = (markup: string) => [...markup.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);

describe("Home dashboard: a healthy org", () => {
  it("leads with an insight headline, not a label, and names the org", async () => {
    const out = await dashboard(healthy());
    expect(out).toMatch(/<h1[^>]*>Everything is on track<\/h1>/);
    expect(text(out)).toContain("Robotics Club · Mapua");
  });

  it("shows the ring as a text alternative, and one card per area", async () => {
    const out = await dashboard(healthy());
    expect(out).toContain('aria-label="5 of 5 areas on track"');
    for (const area of ["dues", "members", "events", "officers", "handover"]) {
      expect(out).toContain(`id="health-${area}"`);
      expect(out).toContain(`href="#health-${area}"`);
    }
  });

  it("says nothing needs attention", async () => {
    expect(text(await dashboard(healthy()))).toContain("Nothing needs your attention");
  });

  it("gives every card a heading under the page heading, in a sensible order", async () => {
    const out = await dashboard(healthy());
    // A card heading holds a link and an icon, so take its text without the tags
    const headings = [...out.matchAll(/<h([123])[^>]*>([\s\S]*?)<\/h\1>/g)].map(
      (m) => `${m[1]}:${m[2].replace(/<[^>]+>/g, "").trim()}`
    );
    expect(headings).toEqual([
      "1:Everything is on track",
      "2:Do next",
      "3:Dues",
      "3:Members",
      "3:Events",
      "3:Terms",
      "3:Handover",
    ]);
  });

  it("shows when it was updated, in the headline's second line", async () => {
    expect(text(await dashboard(healthy()))).toContain("updated 10:00 am");
  });

  it("links each card's title to the screen where the officer can act", async () => {
    const links = hrefs(await dashboard(healthy()));
    for (const path of ["dues", "members", "events", "terms", "handover", "documents"]) {
      expect(links).toContain(`/workspace/${ORG}/${path}`);
    }
  });
});

describe("Home dashboard: the figures", () => {
  it("shows dues as a meter against the date-based pace, with a member status bar", async () => {
    const out = await dashboard(healthy());
    const t = text(out);
    expect(t).toContain("₱3,000");
    expect(t).toContain("of ₱4,000");
    expect(t).toContain("75% collected");
    // 10 of 30 days used
    expect(t).toContain("Expected by now 33%");
    expect(t).toContain("1st Sem Dues · due Dec 21");
    expect(out).toContain('role="progressbar"');
    expect(out).toContain('aria-valuenow="75"');
    expect(out).toContain('aria-label="Members by payment status: 30 paid, 10 unpaid"');
  });

  it("draws new members per week as a column chart with a text alternative and hover text", async () => {
    const out = await dashboard(healthy());
    expect(out).toContain('aria-label="New members per week: 2, 1, 3, 2, 1, 4, 3, 2"');
    expect(out).toContain('title="2 new members this week"');
    expect(out).toContain('title="1 new member 6 weeks ago"');
    expect(text(out)).toContain("8 weeks ago");
  });

  it("draws turnout per event, oldest to latest, with the average as the number", async () => {
    const out = await dashboard(healthy());
    expect(text(out)).toContain("62%");
    expect(text(out)).toContain("average turnout");
    expect(out).toContain('aria-label="Turnout per event, oldest to latest: 55, 58, 60, 66"');
    expect(out).toContain('title="Assembly: 66% turnout, Nov 5"');
    expect(text(out)).toContain("Sat, Dec 5, 4:00 PM");
    expect(text(out)).toContain("General assembly");
  });

  it("shows terms and handover as bars with counts, and documents as a link", async () => {
    const out = await dashboard(healthy());
    expect(out).toContain('aria-label="Current terms: 6 steady"');
    expect(text(out)).toContain("current terms");
    expect(text(out)).toContain("guides ready");
    expect(out).toContain('aria-label="Guides by status: 3 ready"');
    expect(text(out)).toContain("7 documents");
  });

  it("ranks member payment statuses largest first, one bar each, with the value at the tip", async () => {
    const data = healthy({
      dues: { ...healthy().dues!, paid: 29, pending: 5, rejected: 3, unpaid: 11, collected: 7250, expected: 12000 },
    });
    const out = await dashboard(data);
    expect(out).toContain('aria-label="Members by payment status: 29 paid, 11 unpaid, 5 pending, 3 rejected"');
    // the name is on the row, the share is the hover text
    const rows = [...out.matchAll(/title="(\d+) (paid|unpaid|pending|rejected) \((\d+)%\)"/g)].map((m) => [m[2], m[1], m[3]]);
    expect(rows).toEqual([
      ["paid", "29", "60"],
      ["unpaid", "11", "23"],
      ["pending", "5", "10"],
      ["rejected", "3", "6"],
    ]);
    // thin bars, square at the baseline and rounded at the tip
    expect(out).toContain("border-radius:0 4px 4px 0");
    // bar lengths follow the values, the longest stopping short of the edge so its number fits
    const widths = [...out.matchAll(/width:([\d.]+)%;height:100%;border-radius:0 4px 4px 0/g)].map((m) => Number(m[1]));
    expect(widths[0]).toBeCloseTo(82, 5);
    expect(widths).toEqual([...widths].sort((a, b) => b - a));
  });

  it("leaves a zero part out of the bar and the legend", async () => {
    const out = await dashboard(healthy({ dues: { ...healthy().dues!, pending: 0, rejected: 0 } }));
    expect(out).toContain("Members by payment status: 30 paid, 10 unpaid");
    expect(text(out)).not.toContain("rejected");
  });
});

describe("Home dashboard: colour", () => {
  it("uses amber and red only inside the status pills, so the rest of the page stays easy on the eyes", async () => {
    const trouble = healthy({
      today: "2026-12-28",
      members: { ...healthy().members, pending: 3, oldestPendingDays: 16 },
      dues: { ...healthy().dues!, pending: 4, rejected: 2, paid: 24 },
      handover: {
        ...healthy().handover,
        endingTotal: 1,
        endingMissing: 1,
        roles: [{ roleTitle: "Treasurer", endDate: "2026-12-31", guideStatus: "missing" }],
      },
    });
    for (const data of [healthy(), trouble, brandNew()]) {
      // take the status pills and the "Do next" icon tiles out: nothing else may wear red or amber
      const outside = (await dashboard(data))
        .replace(/<span data-status="[^"]*"[\s\S]*?<\/span>/g, "")
        .replace(/<a [^>]*class="orgkit-health-next-item"[^>]*>[\s\S]*?<\/a>/g, "");
      expect(outside).not.toContain("danger");
      expect(outside).not.toContain("amber");
      expect(outside).not.toMatch(/#dc2626|#b91c1c|#fef2f2|#fca5a5|#d97706|#b45309|#fef3c7|#fde68a/i);
    }
  });

  it("says every status in words, so colour is never the only signal", async () => {
    const out = await dashboard(
      healthy({
        today: "2026-12-28",
        members: { ...healthy().members, pending: 3, oldestPendingDays: 16 },
        events: { ...healthy().events, upcoming: 0, nextEvent: null },
      })
    );
    expect(out).toContain("Needs action");
    expect(out).toContain("Needs a look");
    expect(out).toContain("On track");
    expect(out).toMatch(/Members<span class="sr-only">: Needs action<\/span>/);
  });
});

describe("Home dashboard: an org that needs attention", () => {
  const troubled = () =>
    healthy({
      today: "2026-12-28",
      members: { ...healthy().members, pending: 3, oldestPendingDays: 16 },
      dues: { ...healthy().dues!, pending: 4, paid: 26 },
      handover: {
        ...healthy().handover,
        endingTotal: 2,
        endingMissing: 1,
        endingDraft: 1,
        roles: [
          { roleTitle: "Treasurer", endDate: "2026-12-31", guideStatus: "missing" },
          { roleTitle: "Secretary", endDate: "2027-01-20", guideStatus: "draft" },
        ],
      },
      events: { ...healthy().events, upcoming: 0, nextEvent: null },
    });

  it("leads with action and counts the areas", async () => {
    expect(await dashboard(troubled())).toMatch(/<h1[^>]*>3 areas need action<\/h1>/);
  });

  it("lists what to do next, most urgent first, as short rows that link to their screen", async () => {
    const out = await dashboard(troubled());
    const next = out.slice(out.indexOf("Do next"), out.indexOf('id="health-dues"'));
    const titles = [...next.matchAll(/<span class="orgkit-wrap" style="[^"]*font-weight:600[^"]*">([^<]+)<\/span>/g)].map(
      (m) => m[1]
    );
    expect(titles).toEqual([
      "1st Sem Dues is overdue",
      "3 students waiting to be confirmed",
      "Treasurer has no handover guide",
    ]);
    expect(next).toContain(`href="/workspace/${ORG}/dues"`);
    expect(next).toContain(`href="/workspace/${ORG}/members"`);
    expect(next).toContain(`href="/workspace/${ORG}/handover"`);
  });

  it("keeps each row's detail for screen readers and as hover text, not on screen", async () => {
    const out = await dashboard(troubled());
    expect(out).toContain('title="The longest has waited 16 days"');
    expect(out).toMatch(/class="sr-only">\. The longest has waited 16 days<\/span>/);
  });

  it("flags overdue dues in the card, and members waiting to confirm", async () => {
    const t = text(await dashboard(troubled()));
    expect(t).toContain("7 days overdue");
    expect(t).toContain("3 to confirm");
  });

  it("shows leaving roles by guide status", async () => {
    const out = await dashboard(troubled());
    expect(out).toContain(
      'aria-label="Leaving roles by days left: Treasurer: no guide, term ends in 3 days; Secretary: draft, term ends in 23 days"'
    );
    expect(text(out)).toContain("0 of 2");
  });

  it("caps the list at 3 and says how many more there are", async () => {
    const many = healthy({
      today: "2026-12-28",
      members: { ...healthy().members, pending: 3, oldestPendingDays: 16 },
      dues: { ...healthy().dues!, pending: 4, paid: 26 },
      events: { ...healthy().events, upcoming: 0, nextEvent: null, turnoutPct90d: 30, turnoutPctPrev90d: 60 },
      officers: { ...healthy().officers, termsCurrent: 0 },
      handover: {
        ...healthy().handover,
        endingTotal: 3,
        endingMissing: 3,
        roles: [
          { roleTitle: "Treasurer", endDate: "2026-12-31", guideStatus: "missing" },
          { roleTitle: "Secretary", endDate: "2027-01-05", guideStatus: "missing" },
          { roleTitle: "Auditor", endDate: "2027-01-10", guideStatus: "missing" },
        ],
      },
    });
    expect(text(await dashboard(many))).toMatch(/Plus \d+ more items? in the cards/);
  });
});

describe("Home dashboard: a brand new workspace", () => {
  it("welcomes the officer instead of grading an empty org", async () => {
    const out = await dashboard(brandNew());
    expect(out).toMatch(/<h1[^>]*>Your workspace is ready<\/h1>/);
    expect(text(out)).toContain("Next: add your members");
    expect(out).toContain('aria-label="No areas to rate yet"');
  });

  it("offers first steps instead of a to-do list of problems", async () => {
    const out = await dashboard(brandNew());
    expect(out).toMatch(/<h2[^>]*>Get started<\/h2>/);
    const t = text(out);
    expect(t).toContain("Add your members");
    expect(t).toContain("Schedule your first event");
    expect(t).not.toContain("Nothing needs your attention");
  });

  it("shows no area chips and marks every card as not started, with no empty charts", async () => {
    const out = await dashboard(brandNew());
    expect(out).not.toContain('href="#health-');
    expect(out.match(/Not started/g)).toHaveLength(5);
    const t = text(out);
    expect(t).toContain("No open period");
    expect(t).toContain("No members yet");
    expect(t).toContain("No events yet");
    expect(t).toContain("No terms recorded");
    expect(t).toContain("No guides yet");
    expect(out).not.toContain('role="img" aria-label="New members');
  });

  it("never divides by zero or prints NaN", async () => {
    const out = await dashboard(brandNew());
    for (const bad of ["NaN", "Infinity", "undefined"]) expect(out).not.toContain(bad);
  });
});

describe("Home dashboard: edge cases", () => {
  it("handles an open dues period with no active members", async () => {
    const data = healthy({
      dues: { ...healthy().dues!, activeMembers: 0, expected: 0, collected: 0, outstanding: 0, paid: 0, unpaid: 0 },
    });
    const out = await dashboard(data);
    expect(text(out)).toContain("No active members to collect from yet");
    expect(out).not.toContain("NaN");
  });

  it("uses singular wording for one of everything", async () => {
    const data = healthy({
      members: {
        active: 1,
        pending: 1,
        inactive: 0,
        joined30d: 1,
        joinedPrev30d: 1,
        oldestPendingDays: 1,
        joinedWeekly: [0, 0, 0, 0, 0, 0, 0, 1],
      },
      officers: { withAccess: 1, termsTotal: 1, termsCurrent: 1, termsEnding30d: 1, nextTermEnd: "2026-12-20" },
      documents: { total: 1, categoriesCovered: 1 },
    });
    const out = await dashboard(data);
    const t = text(out);
    expect(t).toContain("active member");
    expect(t).not.toContain("1 active members");
    expect(t).toContain("1 to confirm");
    expect(t).toContain("current term");
    expect(t).not.toContain("1 current terms");
    expect(t).toContain("1 document");
    expect(t).not.toContain("1 documents");
    expect(out).toContain('title="1 new member this week"');
  });

  it("shows a plain count when no turnout can be worked out, and draws no empty chart", async () => {
    const out = await dashboard(
      healthy({
        events: {
          ...healthy().events,
          held90d: 0,
          turnoutPct90d: null,
          heldPrev90d: 0,
          turnoutPctPrev90d: null,
          recent: [],
        },
      })
    );
    expect(text(out)).toContain("events in the last 90 days");
    expect(out).not.toContain("Turnout per event");
  });

  it("draws a gap, not a bar, for an event with no turnout figure", async () => {
    const out = await dashboard(
      healthy({
        events: {
          ...healthy().events,
          recent: [
            { title: "A", startsAt: "2026-10-01T06:00:00Z", turnoutPct: 50 },
            { title: "B", startsAt: "2026-10-08T06:00:00Z", turnoutPct: null },
          ],
        },
      })
    );
    expect(out).toContain('aria-label="Turnout per event, oldest to latest: 50, no data"');
    expect(out).toContain('title="B: no turnout figure, Oct 8"');
  });

  it("escapes names typed by users and lets long ones wrap", async () => {
    const out = await dashboard(healthy(), "<script>alert(1)</script>".repeat(3), "x".repeat(200));
    expect(out).not.toContain("<script>");
    expect(out).toContain("&lt;script&gt;");
    expect(out).toContain('class="orgkit-wrap"');

    const role = await dashboard(
      healthy({
        handover: {
          ...healthy().handover,
          endingTotal: 1,
          endingMissing: 1,
          roles: [{ roleTitle: "<img src=x onerror=alert(1)>", endDate: "2026-12-10", guideStatus: "missing" }],
        },
      })
    );
    expect(role).not.toContain("<img");
    const event = await dashboard(
      healthy({
        events: {
          ...healthy().events,
          nextEvent: { id: "e", title: "<b onmouseover=x>Hi</b>", startsAt: "2026-12-05T08:00:00Z" },
        },
      })
    );
    expect(event).not.toContain("<b onmouseover");
  });

  it("follows the mobile rules: no 100vh, no fixed width over 328px, and the Feedback button is cleared", async () => {
    const out = await dashboard(healthy());
    expect(out).not.toContain("100vh");
    const widths = [...out.matchAll(/(?<![-\w])width:\s*(\d+)px/g)].map((m) => Number(m[1]));
    for (const w of widths) expect(w).toBeLessThanOrEqual(328);
    expect(out).toContain("56px");
    // the layout only ever uses the documented breakpoints
    const queries = [...out.matchAll(/@media \(max-width: (\d+)px\)/g)].map((m) => m[1]);
    for (const q of queries) expect(["640", "800", "1024"]).toContain(q);
  });

  it("fills the canvas: the page is a full-height column and the card grid takes the rest", async () => {
    const out = await dashboard(healthy());
    expect(out).toContain("min-height:100%");
    expect(out).toMatch(/\.orgkit-health-grid \{[^}]*flex: 1 0 auto/);
  });
});

describe("Home dashboard: could not load", () => {
  it("tells the officer what happened and offers a retry that stays on Home", async () => {
    const out = await html(
      createElement(OrgHealthUnavailable, { orgId: ORG, message: "We couldn't load your org's health. Try again." })
    );
    expect(out).toContain('role="alert"');
    expect(text(out)).toContain("Home could not load");
    expect(text(out)).toContain("We couldn't load your org's health. Try again.");
    expect(hrefs(out)).toEqual([`/workspace/${ORG}`]);
  });
});
