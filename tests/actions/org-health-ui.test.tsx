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
      // each chip jumps to its card
      expect(out).toContain(`href="#health-${area}"`);
    }
  });

  it("says nothing needs attention", async () => {
    const out = await dashboard(healthy());
    expect(text(out)).toContain("Nothing needs your attention");
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

  it("shows the dues numbers with the pace to compare them against", async () => {
    const out = await dashboard(healthy());
    const t = text(out);
    expect(t).toContain("₱3,000");
    expect(t).toContain("collected of ₱4,000");
    expect(t).toContain("75% collected");
    // 10 of 30 days used
    expect(t).toContain("Expected by now: about 33%");
    expect(t).toContain("1st Sem Dues · Dec 21 (due in 20 days)");
    expect(out).toContain('role="progressbar"');
    expect(out).toContain('aria-valuenow="75"');
  });

  it("shows members, turnout, terms and documents with their comparisons", async () => {
    const t = text(await dashboard(healthy()));
    expect(t).toContain("active members");
    expect(t).toContain("6 joined in the last 30 days");
    expect(t).toContain("4 before");
    expect(t).toContain("62%");
    expect(t).toContain("2 points higher than the 90 days before");
    expect(t).toContain("Next: General assembly");
    expect(t).toContain("current terms");
    expect(t).toContain("Next term ends Mar 31");
    expect(t).toContain("7 documents across 4 of 5 categories");
  });

  it("says when and how the numbers were worked out", async () => {
    const t = text(await dashboard(healthy()));
    expect(t).toContain("Updated 10:00 AM");
    expect(t).toContain("joins use 30 days, turnout 90 days");
  });

  it("links each card to the screen where the officer can act", async () => {
    const links = hrefs(await dashboard(healthy()));
    for (const path of ["dues", "members", "events", "terms", "handover", "documents"]) {
      expect(links).toContain(`/workspace/${ORG}/${path}`);
    }
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
    const out = await dashboard(troubled());
    expect(out).toMatch(/<h1[^>]*>3 areas need action<\/h1>/);
  });

  it("lists what to do next, most urgent first, each row linking to its screen", async () => {
    const out = await dashboard(troubled());
    const next = out.slice(out.indexOf("Do next"), out.indexOf('id="health-dues"'));
    // Titles are the bold line; the detail under each is not bold
    const titles = [...next.matchAll(/<span class="orgkit-wrap" style="[^"]*font-weight:600[^"]*">([^<]+)<\/span>/g)].map(
      (m) => m[1]
    );
    // Critical items first (in the order dues, members, handover). Only three rows fit on one screen.
    expect(titles).toEqual([
      "1st Sem Dues is overdue",
      "3 students waiting to be confirmed",
      "Treasurer has no handover guide",
    ]);
    expect(next).toContain(`href="/workspace/${ORG}/dues"`);
    expect(next).toContain(`href="/workspace/${ORG}/members"`);
    expect(next).toContain(`href="/workspace/${ORG}/handover"`);
  });

  it("states every status in words, not by colour alone", async () => {
    const out = await dashboard(troubled());
    expect(out).toContain("Needs action");
    expect(out).toContain("Needs a look");
    expect(out).toContain("On track");
    // the chips carry the status for screen readers
    expect(out).toMatch(/Dues<span class="sr-only">: Needs action<\/span>/);
  });

  it("flags overdue dues in the card", async () => {
    const t = text(await dashboard(troubled()));
    expect(t).toContain("7 days overdue");
    expect(t).toContain("still to collect from 14 members");
  });

  it("names roles that are leaving without a ready guide", async () => {
    const t = text(await dashboard(troubled()));
    expect(t).toContain("Treasurer");
    expect(t).toContain("No guide");
    expect(t).toContain("Draft");
    expect(t).toContain("Term ends in 3 days");
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
    const t = text(await dashboard(many));
    expect(t).toMatch(/Plus \d+ more items? in the cards/);
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

  it("shows no area chips and marks every card as not started", async () => {
    const out = await dashboard(brandNew());
    expect(out).not.toContain('href="#health-');
    expect(out.match(/Not started/g)).toHaveLength(5);
    const t = text(out);
    expect(t).toContain("No open dues period");
    expect(t).toContain("No members yet");
    expect(t).toContain("No events yet");
    expect(t).toContain("No terms recorded");
    expect(t).toContain("No handover guides yet");
  });

  it("never divides by zero or prints NaN", async () => {
    const out = await dashboard(brandNew());
    expect(out).not.toContain("NaN");
    expect(out).not.toContain("Infinity");
    expect(out).not.toContain("undefined");
  });
});

describe("Home dashboard: edge cases", () => {
  it("handles an open dues period with no active members", async () => {
    const data = healthy({
      dues: { ...healthy().dues!, activeMembers: 0, expected: 0, collected: 0, outstanding: 0, paid: 0, unpaid: 0 },
    });
    const out = await dashboard(data);
    expect(text(out)).toContain("there are no active members to collect from yet");
    expect(out).not.toContain("NaN");
  });

  it("uses singular wording for one of everything", async () => {
    const data = healthy({
      members: { active: 1, pending: 1, inactive: 0, joined30d: 1, joinedPrev30d: 1, oldestPendingDays: 1 },
      officers: { withAccess: 1, termsTotal: 1, termsCurrent: 1, termsEnding30d: 1, nextTermEnd: "2026-12-20" },
      documents: { total: 1, categoriesCovered: 1 },
    });
    const t = text(await dashboard(data));
    expect(t).toContain("active member");
    expect(t).not.toContain("1 active members");
    expect(t).toContain("1 joined in the last 30 days");
    expect(t).toContain("1 student waiting to be confirmed");
    expect(t).toContain("1 term ends within 30 days");
    expect(t).toContain("1 officer has access");
    expect(t).toContain("1 document across 1 of 5 categories");
  });

  it("shows turnout as unchanged, and as a plain count when no turnout can be worked out", async () => {
    const same = text(
      await dashboard(healthy({ events: { ...healthy().events, turnoutPct90d: 60, turnoutPctPrev90d: 60 } }))
    );
    expect(same).toContain("Same turnout as the 90 days before");

    const none = text(
      await dashboard(
        healthy({
          events: { ...healthy().events, held90d: 0, turnoutPct90d: null, heldPrev90d: 0, turnoutPctPrev90d: null },
        })
      )
    );
    expect(none).toContain("events held in the last 90 days");
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
  });

  it("follows the mobile rules: no 100vh, no fixed width over 328px, and the Feedback button is cleared", async () => {
    const out = await dashboard(healthy());
    expect(out).not.toContain("100vh");
    const widths = [...out.matchAll(/(?<![-\w])width:\s*(\d+)px/g)].map((m) => Number(m[1]));
    for (const w of widths) expect(w).toBeLessThanOrEqual(328);
    expect(out).toContain("60px");
    // the layout only ever uses the documented breakpoints
    const queries = [...out.matchAll(/@media \(max-width: (\d+)px\)/g)].map((m) => m[1]);
    for (const q of queries) expect(["640", "800", "1024"]).toContain(q);
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
