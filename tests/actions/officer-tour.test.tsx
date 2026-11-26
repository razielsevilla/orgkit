import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToReadableStream } from "react-dom/server";

/**
 * The officer tour: a spotlight that points at the real sidebar entries and page
 * controls, with numbered steps for each. There is no browser here, so the
 * beats are checked as data against the real source (every control they point
 * at must carry its marker, every sidebar entry must have beats), the geometry as
 * numbers, and the card and spotlight as markup. The 360px behaviour is a visual
 * check: docs/mobile-qa.md.
 */

vi.mock("next/navigation", () => ({ usePathname: () => "/workspace/abc" }));
vi.mock("@/src/app/(workspace)/feedback-actions", () => ({ submitFeedbackAction: vi.fn() }));

const { buildTourBeats, describeProgress, FIRST_WEEK_LINKS, SECTION_META, TOUR_SECTIONS, TOUR_SECTION_ORDER } = await import(
  "@/src/lib/tour/tour-beats"
);
const { dimPanels, expandRect, placeCard, rectsEqual } = await import("@/src/lib/tour/tour-placement");
const { TourCard } = await import("@/src/components/workspace/tour/tour-card");
const { TourSpotlight } = await import("@/src/components/workspace/tour/tour-spotlight");
const { TourStyles } = await import("@/src/components/workspace/tour/tour-styles");
const { TourHelpButton } = await import("@/src/components/workspace/tour/tour-help-button");
const { FeedbackButton } = await import("@/src/components/feedback/feedback-button");
const { registerTourStarter, requestTour } = await import("@/src/lib/tour/tour-request");
const { tourStorageKey, useOfficerTour } = await import("@/src/lib/tour/use-officer-tour");
const { PRIVATE_ROUTES } = await import("@/src/lib/routes");

type Beat = ReturnType<typeof buildTourBeats>[number];

const ROOT = join(import.meta.dirname, "../..");
const ORG = "11111111-1111-4111-8111-111111111111";

async function render(element: ReturnType<typeof createElement>): Promise<string> {
  const stream = await renderToReadableStream(element);
  await stream.allReady;
  return (await new Response(stream).text()).replace(/<!-- -->/g, "").replace(/&#x27;/g, "'");
}

const desktop = buildTourBeats({ narrow: false });
const phone = buildTourBeats({ narrow: true });
const byId = (beats: Beat[], id: string) => beats.find((b) => b.id === id)!;

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) sourceFiles(path, out);
    else if (/\.tsx$/.test(name)) out.push(path);
  }
  return out;
}

const noop = () => {};
function card(beat: Beat, over: Record<string, unknown> = {}, beats: Beat[] = desktop) {
  const index = beats.indexOf(beat);
  return render(
    createElement(TourCard, {
      beat,
      progress: describeProgress(beats, index),
      isAdmin: true,
      orgId: ORG,
      mode: "float",
      showMissing: false,
      isFirst: index === 0,
      isLast: index === beats.length - 1,
      onBack: noop,
      onNext: noop,
      onSkipSection: noop,
      onClose: noop,
      ...over,
    })
  );
}

describe("tour beats match the app", () => {
  const sourceText = sourceFiles(join(ROOT, "src")).map((file) => readFileSync(file, "utf8")).join("\n");

  it("points only at controls that carry their data-tour marker in the source", () => {
    const markers = new Set([...sourceText.matchAll(/data-tour="([a-z0-9-]+)"/g)].map((m) => m[1]));
    // The sidebar marks each entry from one template: data-tour={`nav-${section}`}
    expect(sourceText).toContain("data-tour={`nav-${section}`}");
    for (const section of TOUR_SECTIONS) markers.add(`nav-${section}`);
    // The Home cards are marked from one template too: data-tour={`home-card-${area}`}
    expect(sourceText).toContain("data-tour={`home-card-${area}`}");
    for (const area of ["dues", "members", "events", "officers", "handover"]) markers.add(`home-card-${area}`);

    for (const beats of [desktop, phone]) {
      for (const beat of beats) {
        for (const name of beat.target ?? []) expect(markers, `${beat.id} -> ${name}`).toContain(name);
      }
    }
  });

  it("has beats for every sidebar entry, so a new feature cannot ship without a line in the tour", () => {
    const nav = readFileSync(join(ROOT, "src/components/layout/sidebar/nav-list.tsx"), "utf8");
    const union = /export type SidebarSection =([^;]+);/.exec(nav)?.[1] ?? "";
    const sections = [...union.matchAll(/"([a-z]+)"/g)].map((m) => m[1]);
    expect(sections.length).toBeGreaterThan(0);

    expect([...TOUR_SECTIONS].sort()).toEqual([...sections].sort());
    for (const section of sections) {
      expect(desktop.filter((b) => b.section === section).length, section).toBeGreaterThanOrEqual(2);
      expect(phone.filter((b) => b.section === section).length, section).toBeGreaterThanOrEqual(1);
      expect(SECTION_META).toHaveProperty(section);
    }
  });

  it("goes welcome, the layout, each sidebar section in order, then a finish", () => {
    for (const beats of [desktop, phone]) {
      expect(beats[0].id).toBe("welcome");
      expect(beats.at(-1)?.id).toBe("finish");
      // Sections never come back: each one is a single run, in sidebar order
      const order = beats.map((b) => TOUR_SECTION_ORDER.indexOf(b.section));
      expect(order).toEqual([...order].sort((a, b) => a - b));
      expect(new Set(beats.map((b) => b.id)).size).toBe(beats.length);
    }
  });

  it("points at the sidebar entries one by one on a desktop, and at the menu button on a phone", () => {
    const navBeats = desktop.filter((b) => b.kind === "nav");
    expect(navBeats.map((b) => b.target?.[0])).toEqual(TOUR_SECTIONS.map((s) => `nav-${s}`));
    expect(phone.filter((b) => b.kind === "nav")).toHaveLength(0);
    expect(byId(phone, "menu").target).toEqual(["menu-button"]);
    expect(phone.some((b) => b.target?.includes("sidebar") || b.target?.includes("profile"))).toBe(false);
  });

  it("opens real private pages: every sidebar beat and page beat names a route that exists", () => {
    for (const beat of desktop) {
      for (const path of [beat.path, beat.expectPath]) {
        if (!path) continue;
        const href = path(ORG);
        expect(href.startsWith(`/workspace/${ORG}`), beat.id).toBe(true);
        expect(PRIVATE_ROUTES, beat.id).toContain(href.replace(ORG, ":id"));
      }
    }
    for (const beat of desktop.filter((b) => b.kind === "nav")) expect(beat.expectPath, beat.id).toBeDefined();
    for (const item of FIRST_WEEK_LINKS) expect(PRIVATE_ROUTES).toContain(item.href(ORG).replace(ORG, ":id"));
  });

  it("gives every feature beat numbered steps, and says what to do when it is not on screen", () => {
    for (const beat of desktop) {
      if (beat.section === "intro" || beat.section === "finish" || beat.kind === "nav") continue;
      if (beat.id === "handover-guide") continue;
      expect(beat.steps?.length, beat.id).toBeGreaterThanOrEqual(2);
    }
    // A beat on a page that can be empty, or that a role may not have, explains itself
    for (const id of ["members-row", "events-checkin", "dues-pending", "terms-list", "documents-list", "home-chips"]) {
      expect(byId(desktop, id).missing, id).toBeTruthy();
    }
  });

  it("follows the copy rules: no exclamation marks, no trailing period on titles or steps", () => {
    for (const beat of [...desktop, ...phone]) {
      const all = [beat.title, beat.body, ...(beat.steps ?? []), beat.missing ?? ""].join(" ");
      expect(all, beat.id).not.toContain("!");
      expect(beat.title, beat.id).not.toMatch(/\.$/);
      for (const step of beat.steps ?? []) expect(step, beat.id).not.toMatch(/\.$/);
    }
  });

  it("only calls something admin only when permissions.ts says admins alone may do it", () => {
    const permissions = readFileSync(join(ROOT, "src/lib/orgs/permissions.ts"), "utf8");
    const admin = /admin: \[([\s\S]*?)\],\s*finance/.exec(permissions)?.[1] ?? "";
    for (const action of ["invite:create", "member:import", "officer:change_role", "officer:transfer_admin", "members:export"]) {
      expect(admin, action).toContain(action);
    }
    expect(desktop.filter((b) => b.adminOnly).map((b) => b.id)).toEqual([
      "members-add",
      "members-import",
      "officers-invite",
      "officers-transfer",
      "terms-record",
    ]);
    // What every officer can do is not hidden behind the admin note
    for (const id of ["dues-new", "dues-paylink", "dues-reminders", "events-new", "documents-file", "documents-link"]) {
      expect(byId(desktop, id).adminOnly, id).toBeFalsy();
    }
  });

  it("measures progress by section, with the current one partly filled", () => {
    const i = desktop.indexOf(byId(desktop, "dues-pending"));
    const p = describeProgress(desktop, i);
    const fills = Object.fromEntries(p.sections.map((s) => [s.id, s.fill]));
    expect(fills.intro).toBe(1);
    expect(fills.members).toBe(1);
    expect(fills.events).toBe(0);
    expect(fills.dues).toBeGreaterThan(0);
    expect(fills.dues).toBeLessThan(1);
    expect(p.count).toBe(desktop.filter((b) => b.section === "dues").length);
    expect(p.position).toBe(desktop.filter((b) => b.section === "dues").indexOf(byId(desktop, "dues-pending")) + 1);
    expect(describeProgress(desktop, desktop.length - 1).overall).toBe(1);
  });
});

describe("spotlight and card placement", () => {
  const viewport = { width: 1280, height: 800 };
  const area = (r: { width: number; height: number }) => r.width * r.height;

  it("surrounds the hole with four panels that, with the hole, cover the screen exactly", () => {
    const hole = { top: 120, left: 300, width: 200, height: 80 };
    const panels = dimPanels(hole, viewport);
    expect(panels).toHaveLength(4);
    expect(panels.reduce((sum, p) => sum + area(p), 0) + area(hole)).toBe(area(viewport));
    for (const p of panels) {
      expect(p.width).toBeGreaterThanOrEqual(0);
      expect(p.height).toBeGreaterThanOrEqual(0);
    }
  });

  it("never makes a negative panel when the target is partly or wholly off screen", () => {
    for (const hole of [
      { top: -60, left: 100, width: 200, height: 100 },
      { top: 760, left: 1200, width: 300, height: 200 },
      { top: 2000, left: -50, width: 40, height: 40 },
    ]) {
      for (const p of dimPanels(hole, viewport)) {
        expect(p.width).toBeGreaterThanOrEqual(0);
        expect(p.height).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("dims the whole screen when there is nothing to point at", () => {
    const [top, ...rest] = dimPanels(null, viewport);
    expect(area(top)).toBe(area(viewport));
    for (const p of rest) expect(area(p)).toBe(0);
  });

  it("puts the card on the preferred side when it fits", () => {
    const size = { width: 380, height: 300 };
    const target = { top: 100, left: 20, width: 220, height: 40 };
    const right = placeCard({ target, card: size, viewport, preferred: "right" });
    expect(right.side).toBe("right");
    expect(right.left).toBeGreaterThan(target.left + target.width);
    expect(placeCard({ target, card: size, viewport, preferred: "bottom" }).side).toBe("bottom");
  });

  it("flips to the other side when the preferred one has no room", () => {
    const size = { width: 380, height: 300 };
    const nearBottom = { top: 700, left: 500, width: 200, height: 40 };
    expect(placeCard({ target: nearBottom, card: size, viewport, preferred: "bottom" }).side).toBe("top");
    const nearRight = { top: 300, left: 1100, width: 120, height: 40 };
    expect(placeCard({ target: nearRight, card: size, viewport, preferred: "right" }).side).toBe("left");
  });

  it("keeps the whole card on screen, whatever the target", () => {
    const size = { width: 380, height: 300 };
    for (const target of [
      { top: 0, left: 0, width: 50, height: 30 },
      { top: 770, left: 1250, width: 30, height: 30 },
      { top: 400, left: 600, width: 100, height: 100 },
      { top: 0, left: 256, width: 1024, height: 800 },
    ]) {
      for (const preferred of ["right", "left", "top", "bottom"] as const) {
        const spot = placeCard({ target, card: size, viewport, preferred });
        expect(spot.left, JSON.stringify(target)).toBeGreaterThanOrEqual(12);
        expect(spot.top, JSON.stringify(target)).toBeGreaterThanOrEqual(12);
        expect(spot.left + size.width).toBeLessThanOrEqual(viewport.width - 12);
        expect(spot.top + size.height).toBeLessThanOrEqual(viewport.height - 12);
      }
    }
  });

  it("overlays a target as big as the page, because there is no room beside it", () => {
    const page = { top: 0, left: 256, width: 1024, height: 800 };
    expect(placeCard({ target: page, card: { width: 380, height: 300 }, viewport, preferred: "left" }).side).toBe("inside");
  });

  it("compares and pads rectangles", () => {
    const r = { top: 10, left: 10, width: 100, height: 50 };
    expect(rectsEqual(r, { ...r, top: 10.2 })).toBe(true);
    expect(rectsEqual(r, { ...r, width: 103 })).toBe(false);
    expect(rectsEqual(r, null)).toBe(false);
    expect(expandRect(r, 8)).toEqual({ top: 2, left: 2, width: 116, height: 66 });
  });
});

describe("the card", () => {
  it("opens on a welcome with Start tour and Skip for now, and no Back or Skip section", async () => {
    const out = await card(desktop[0], { mode: "center" });
    expect(out).toContain("Welcome to OrgKit");
    expect(out).toContain("Start tour");
    expect(out).toContain("Skip for now");
    expect(out).not.toContain(">Back<");
    expect(out).not.toContain("Skip section");
    expect(out).toContain('aria-label="Skip tour"');
  });

  it("is a labelled modal dialog, focusable so the tour can move focus to it", async () => {
    const out = await card(byId(desktop, "dues-new"));
    expect(out).toContain('role="dialog"');
    expect(out).toContain('aria-modal="true"');
    expect(out).toContain('aria-labelledby="orgkit-tour-title"');
    expect(out).toContain('tabindex="-1"');
    expect(out).toContain('id="orgkit-tour-title"');
    expect(out).toMatch(/<button[^>]*data-autofocus[^>]*>Next</);
  });

  it("shows the how-to as an ordered list, in order, with the real button names", async () => {
    const out = await card(byId(desktop, "dues-new"));
    const items = [...out.matchAll(/<li>([^<]*)<\/li>/g)].map((m) => m[1]);
    expect(items).toEqual([...byId(desktop, "dues-new").steps!]);
    expect(out).toContain('<ol class="orgkit-tour-steps">');
    expect(out).toContain("Press New period");
    expect(out).toContain("Dues · 2 of 7");
  });

  it("says where it is: the section and the step within it", async () => {
    const beat = byId(desktop, "dues-pending");
    const p = describeProgress(desktop, desktop.indexOf(beat));
    const out = await card(beat);
    expect(out).toContain(`Dues · ${p.position} of ${p.count}`);
    expect(out).toContain('role="progressbar"');
    expect(out.match(/class="orgkit-tour-seg/g)?.length).toBe(TOUR_SECTION_ORDER.length);
    expect(out).toContain("--fill:100%");
  });

  it("makes a sidebar beat's button say what it does, and tells the officer they can click instead", async () => {
    const beat = byId(desktop, "dues-nav");
    const out = await card(beat);
    expect(out).toMatch(/data-autofocus[^>]*>Open Dues</);
    expect(out).toContain("Click it in the sidebar");
    // In the middle of the screen there is nothing to click, so the hint is left out
    expect(await card(beat, { mode: "center" })).not.toContain("Click it in the sidebar");
  });

  it("offers Skip section and Back in the middle, and Finish at the end", async () => {
    const mid = await card(byId(desktop, "events-new"));
    expect(mid).toContain("Skip section");
    expect(mid).toContain(">Back<");
    const last = await card(desktop.at(-1)!, { mode: "center" });
    expect(last).toContain(">Finish<");
    expect(last).not.toContain("Skip section");
  });

  it("tells an admin they can do an admin-only thing, and an officer to ask an admin", async () => {
    const beat = byId(desktop, "officers-invite");
    const asAdmin = await card(beat, { isAdmin: true });
    expect(asAdmin).toContain("Admin only");
    expect(asAdmin).toContain("You are an admin, so you can do this.");
    const asOfficer = await card(beat, { isAdmin: false });
    expect(asOfficer).toContain("Admin only");
    expect(asOfficer).toContain("Ask an admin on your team to do this.");
    expect(await card(byId(desktop, "dues-new"))).not.toContain("Admin only");
  });

  it("explains when there is nothing to point at, but not to an officer who was never going to see it", async () => {
    const beat = byId(desktop, "members-row");
    const out = await card(beat, { showMissing: true });
    expect(out).toContain("Nothing to point at yet.");
    expect(out).toContain(beat.missing!);
    expect(await card(beat, { showMissing: false })).not.toContain("Nothing to point at yet");
    expect(await card(byId(desktop, "officers-invite"), { showMissing: true, isAdmin: false })).not.toContain("Nothing to point at yet");
  });

  it("tells the officer which role they are in on the welcome", async () => {
    expect(await card(desktop[0], { mode: "center", isAdmin: true })).toContain("You are an admin of this workspace");
    expect(await card(desktop[0], { mode: "center", isAdmin: false })).toContain("You are an officer of this workspace");
  });

  it("ends with a first-week list of links that matches the role", async () => {
    const last = desktop.at(-1)!;
    const admin = await card(last, { mode: "center", isAdmin: true });
    expect(admin).toContain("Share the join link");
    expect(admin).toContain(`href="/workspace/${ORG}/officers"`);
    const officer = await card(last, { mode: "center", isAdmin: false });
    expect(officer).toContain("Create an event");
    expect(officer).toContain("Create a dues period");
    expect(officer).not.toContain("Share the join link");
    expect(officer).not.toContain("Invite officers");
  });

  it("sits where it is told: beside the target, in the middle, or as a bottom sheet", async () => {
    const float = await card(byId(desktop, "dues-new"), { mode: "float", style: { top: 120, left: 340 } });
    expect(float).toContain("orgkit-tour-card is-float");
    expect(float).toContain("top:120px");
    expect(float).toContain("left:340px");
    expect(await card(desktop[0], { mode: "center" })).toContain("orgkit-tour-card is-center");
    expect(await card(byId(phone, "dues-new"), { mode: "sheet" }, phone)).toContain("orgkit-tour-card is-sheet");
  });

  it("renders every beat, on a desktop and on a phone, without error", async () => {
    for (const beats of [desktop, phone]) {
      for (const beat of beats) {
        const out = await card(beat, {}, beats);
        expect(out, beat.id).toContain(beat.title);
      }
    }
  });
});

describe("the guide to one page (the ? button)", () => {
  const pageBeats = (section: (typeof TOUR_SECTIONS)[number], narrow = false) => buildTourBeats({ narrow, scope: section });

  it("covers only that page: its own beats, nothing from the other pages, no welcome and no finish", () => {
    for (const narrow of [false, true]) {
      for (const section of TOUR_SECTIONS) {
        const beats = pageBeats(section, narrow);
        expect(beats.length, `${section} narrow=${narrow}`).toBeGreaterThanOrEqual(1);
        for (const beat of beats) {
          expect(beat.section, beat.id).toBe(section);
        }
      }
    }
    const members = pageBeats("members").map((b) => b.id);
    expect(members).toEqual(["members-add", "members-search", "members-row", "members-import"]);
    expect(members.some((id) => id.startsWith("dues"))).toBe(false);
  });

  it("leaves out the sidebar's Open beat, because the officer is already on the page", () => {
    for (const section of TOUR_SECTIONS) {
      expect(pageBeats(section).some((b) => b.kind === "nav"), section).toBe(false);
    }
    // The full tour still has it
    expect(desktop.some((b) => b.id === "dues-nav")).toBe(true);
  });

  it("gives every page the same beats in its guide as it has in the full tour, in the same order", () => {
    for (const section of TOUR_SECTIONS) {
      const inFull = desktop.filter((b) => b.section === section && b.kind !== "nav").map((b) => b.id);
      expect(pageBeats(section).map((b) => b.id), section).toEqual(inFull);
    }
  });

  it("does not change the full tour", () => {
    expect(buildTourBeats({ narrow: false, scope: "all" }).map((b) => b.id)).toEqual(desktop.map((b) => b.id));
    expect(buildTourBeats({ narrow: false })).toHaveLength(desktop.length);
  });

  it("opens straight on the first thing on the page, with Close and Next, and ends with Done", async () => {
    const beats = pageBeats("dues");
    const first = await card(beats[0], { variant: "page" }, beats);
    expect(first).toContain(">Close<");
    expect(first).not.toContain("Skip for now");
    expect(first).not.toContain("Start tour");
    expect(first).toMatch(/data-autofocus[^>]*>Next</);
    // One section only, so there is nothing to skip to
    expect(first).not.toContain("Skip section");
    expect(first.match(/class="orgkit-tour-seg/g)?.length).toBe(1);

    const lastIndex = beats.length - 1;
    const last = await card(beats[lastIndex], { variant: "page" }, beats);
    expect(last).toMatch(/data-autofocus[^>]*>Done</);
    expect(last).not.toContain(">Finish<");
    expect(last).toContain(">Back<");
  });

  it("walks Home one part at a time: the summary, the chips, what to do next, then each card", () => {
    const home = pageBeats("home");
    expect(home.map((b) => b.id)).toEqual([
      "home-summary",
      "home-chips",
      "home-next",
      "home-card-dues",
      "home-card-members",
      "home-card-events",
      "home-card-terms",
      "home-card-handover",
    ]);
    // Each step lights its own piece of the page, and none lights the whole page
    const targets = home.map((b) => b.target?.[0]);
    expect(new Set(targets).size).toBe(home.length);
    expect(targets).not.toContain("page");
    for (const beat of home) expect(beat.steps?.length, beat.id).toBeGreaterThanOrEqual(2);
  });

  it("points the Terms step at the card the page calls officers, and every card step at a card", () => {
    expect(byId(desktop, "home-card-terms").target).toEqual(["home-card-officers"]);
    for (const area of ["dues", "members", "events", "handover"]) {
      expect(byId(desktop, `home-card-${area}`).target).toEqual([`home-card-${area}`]);
    }
  });

  it("shows Home's guide as a sequence, with Close then Next at the start and Done at the end", async () => {
    const beats = pageBeats("home");
    const first = await card(beats[0], { variant: "page" }, beats);
    expect(first).toContain("Home · 1 of 8");
    expect(first).toContain(">Close<");
    expect(first).toMatch(/data-autofocus[^>]*>Next</);
    const last = await card(beats.at(-1)!, { variant: "page" }, beats);
    expect(last).toContain("Home · 8 of 8");
    expect(last).toMatch(/data-autofocus[^>]*>Done</);
    expect(last).toContain(">Back<");
  });

  it("keeps the full tour's wording when the variant is not given", async () => {
    const out = await card(desktop[0], { mode: "center" });
    expect(out).toContain("Start tour");
    expect(out).toContain("Skip for now");
  });
});

describe("full tour on first login, guide on the ?", () => {
  const frame = readFileSync(join(ROOT, "src/components/workspace/frame/workspace-frame.tsx"), "utf8");
  const profile = readFileSync(join(ROOT, "src/components/layout/sidebar/profile-menu.tsx"), "utf8");

  it("opens by itself as the full tour, never as one page's guide", async () => {
    function Probe() {
      const tour = useOfficerTour("officer-1");
      return createElement("span", null, `${tour.isOpen}:${tour.scope}`);
    }
    // Server render: not open yet, and whenever it does open by itself the scope is "all"
    expect(await render(createElement(Probe))).toContain("false:all");
  });

  it("makes the ? open the guide to the page the officer is on, and the profile menu the full tour", () => {
    expect(frame).toContain("openTour(orgId ? sectionFor(pathname, orgId) : \"all\")");
    expect(frame).toContain("registerTourStarter(startPageGuide)");
    expect(frame).toContain('openTour("all")');
    expect(frame).toContain("onStartTour={startFullTour}");
    expect(frame).toContain("scope={tour.scope}");
    expect(profile).toContain("Take the full tour");
  });

  it("only remembers the tour as seen when the full tour ends, so a page guide cannot skip it", () => {
    const hook = readFileSync(join(ROOT, "src/lib/tour/use-officer-tour.ts"), "utf8");
    expect(hook).toContain('if (scope === "all") writeSeen(officerId);');
  });

  it("labels the ? as the guide to this page", () => {
    const button = readFileSync(join(ROOT, "src/components/workspace/tour/tour-help-button.tsx"), "utf8");
    expect(button).toContain('aria-label="Guide to this page"');
  });
});

describe("a step is instant", () => {
  const read = (path: string) => readFileSync(join(ROOT, path), "utf8");
  const conductor = read("src/components/workspace/tour/officer-tour.tsx");
  const cardSource = read("src/components/workspace/tour/tour-card.tsx");
  const targetHook = read("src/lib/tour/use-tour-target.ts");

  it("never hides the card while the target is found: the words change at once", async () => {
    const out = await card(byId(desktop, "dues-new"));
    expect(out).not.toContain("visibility");
    // No "hidden" prop on the card (aria-hidden on its icons is fine)
    expect(cardSource).not.toMatch(/(?<![-\w])hidden\??\s*[:=]/);
    expect(cardSource).not.toContain("visibility");
    expect(conductor).not.toContain("hidden={");
  });

  it("keeps one card for the whole tour, so a step does not fade a new one in from nothing", () => {
    // A key on the card would rebuild it on every step. Only the body is keyed, to reset its scroll
    expect(conductor).not.toMatch(/<TourCard[^>]*key=/);
    expect(cardSource).toContain("<div key={beat.id} className=\"orgkit-tour-card-body\">");
  });

  it("finds the target before the screen paints, so the card is placed in the same frame as the click", () => {
    expect(targetHook).toContain("useLayoutEffect(");
    expect(targetHook).not.toMatch(/useEffect\(/);
    // A first look right now, not only from an animation frame
    expect(targetHook).toContain("    search();")
  });

  it("moves on at once and never waits for the next page to load", () => {
    expect(conductor).toContain("const next = () => (isLast ? onClose() : go(index + 1));");
    // Nothing advances a beat because an address changed, so a slow page cannot stall the card
    expect(conductor).not.toContain("lastPath");
    // The page still opens, from the next beat, and the link's own click is not opened twice
    expect(conductor).toContain("router.push(want)");
    expect(conductor).toContain("openedFor.current = following.id");
  });

  it("warms up the pages the next few steps open", () => {
    expect(conductor).toContain("router.prefetch(path)");
    expect(conductor).toContain("beats.slice(index + 1, index + 4)");
  });

  it("glides the card between positions, and keeps every animation short", async () => {
    const css = await render(createElement(TourStyles));
    expect(css).toMatch(/\.orgkit-tour-card\.is-float,\s*\.orgkit-tour-card\.is-center\s*\{[^}]*transition:\s*top[^;]*,\s*left/);
    // The spotlight and the card use the fast token, never the slow one, and the entrance is quick
    expect(css).not.toContain("--t-base");
    expect(css).not.toContain("280ms");
    expect(css).toMatch(/orgkitTourCard 0\.2s/);
    // The card is placed with top and left everywhere except the phone's sheet
    expect(css).not.toMatch(/\.orgkit-tour-card\.is-center\s*\{[^}]*inset/);
  });

  it("places the centred card with top and left too, so it can glide to a target", () => {
    expect(conductor).toContain("top: Math.max(12, (viewport.height - cardSize.height) / 2)");
  });
});

describe("the spotlight", () => {
  const viewport = { width: 1280, height: 800 };
  const target = { top: 200, left: 300, width: 160, height: 40 };

  it("lights a hole with a ring, and blocks clicks on it unless it is meant to be clicked", async () => {
    const look = await render(createElement(TourSpotlight, { target, viewport }));
    expect(look.match(/class="orgkit-tour-dim"/g)?.length).toBe(4);
    expect(look).toContain("orgkit-tour-ring");
    expect(look).toContain("orgkit-tour-hole");

    const click = await render(createElement(TourSpotlight, { target, viewport, interactive: true }));
    expect(click).toContain("orgkit-tour-ring");
    expect(click).not.toContain("orgkit-tour-hole");
  });

  it("only dims the screen when there is nothing to point at", async () => {
    const out = await render(createElement(TourSpotlight, { target: null, viewport }));
    expect(out).toContain("orgkit-tour-dim");
    expect(out).not.toContain("orgkit-tour-ring");
    expect(out).not.toContain("orgkit-tour-hole");
  });

  it("is hidden from screen readers, because the card says the same in words", async () => {
    expect(await render(createElement(TourSpotlight, { target, viewport }))).toContain('aria-hidden="true"');
  });

  it("makes the ring follow the shape of what it surrounds", async () => {
    const out = await render(createElement(TourSpotlight, { target, viewport, radius: 12 }));
    expect(out).toContain("border-radius:20px");
  });
});

describe("remembering that the tour was seen", () => {
  it("keeps a separate key per officer", () => {
    expect(tourStorageKey("a")).not.toBe(tourStorageKey("b"));
    expect(tourStorageKey("a")).toContain("a");
  });

  it("never opens during server rendering, so nothing flashes before the browser decides", async () => {
    function Probe({ id }: { id: string | undefined }) {
      return createElement("span", null, String(useOfficerTour(id).isOpen));
    }
    expect(await render(createElement(Probe, { id: "officer-1" }))).toContain("false");
    expect(await render(createElement(Probe, { id: undefined }))).toContain("false");
  });
});

describe("the ? button that replays the tour", () => {
  it("asks every registered frame to start the tour, and stops once the frame is gone", () => {
    const start = vi.fn();
    const unregister = registerTourStarter(start);
    requestTour();
    expect(start).toHaveBeenCalledTimes(1);
    unregister();
    requestTour();
    expect(start).toHaveBeenCalledTimes(1);
  });

  it("stays out of the way where there is no workspace to show the tour in", async () => {
    expect(await render(createElement(TourHelpButton))).toBe("");
  });

  it("sits in the same corner row as Feedback, which the tour can point at as one", async () => {
    const html = await render(createElement(FeedbackButton));
    expect(html).toContain('class="orgkit-fab-row"');
    expect(html).toContain('data-tour="corner"');
    expect(html).toMatch(/\.orgkit-fab-row\s*\{[^}]*position:\s*fixed;[^}]*z-index:\s*900;[^}]*display:\s*flex;/);
    expect(html).not.toMatch(/\.orgkit-feedback-btn\s*\{[^}]*position:\s*fixed/);
  });
});

describe("tour styles follow the design rules", () => {
  it("stacks above every dialog, the drawer and the Feedback button, in the right order", async () => {
    const css = await render(createElement(TourStyles));
    const z = (cls: string) => Number(new RegExp(`${cls}\\s*\\{[^}]*z-index:\\s*(\\d+)`).exec(css)?.[1]);
    expect(z("\\.orgkit-tour-dim")).toBeGreaterThan(1000); // dialogs are 1000
    expect(z("\\.orgkit-tour-hole")).toBe(z("\\.orgkit-tour-dim"));
    expect(z("\\.orgkit-tour-ring")).toBeGreaterThan(z("\\.orgkit-tour-dim"));
    expect(z("\\.orgkit-tour-card")).toBeGreaterThan(z("\\.orgkit-tour-ring"));
  });

  it("puts the card at the bottom of a phone screen, above the safe area, and uses dvh", async () => {
    const css = await render(createElement(TourStyles));
    expect(css).toMatch(/\.orgkit-tour-card\.is-sheet\s*\{[^}]*bottom:\s*calc\(8px \+ env\(safe-area-inset-bottom/);
    expect(css).toContain("100dvh");
    expect(css).not.toContain("100vh");
  });

  it("flattens motion for people who ask, and lifts only where there is a pointer", async () => {
    const css = await render(createElement(TourStyles));
    expect(css).toContain("prefers-reduced-motion: reduce");
    expect(css).toContain("@media (hover: hover)");
    expect(css).toMatch(/\.orgkit-tour-start:active\s*\{\s*transform:\s*scale\(0\.97\)/);
  });

  it("uses tokens, not one-off colors, and never transition: all", async () => {
    const css = await render(createElement(TourStyles));
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(css).not.toMatch(/transition:\s*all/);
    for (const token of ["--shadow-dialog", "--shadow-rest", "--color-brand-tint", "--color-accent", "--color-line"]) {
      expect(css, token).toContain(token);
    }
  });

  it("keeps every fixed width within a 360px phone (328px) or sizes it with min()", async () => {
    const css = await render(createElement(TourStyles));
    for (const m of css.matchAll(/(?<![-\w])(?:width|min-width)\s*:\s*([^;]+);/g)) {
      if (m[1].trim().startsWith("min(")) continue;
      for (const px of m[1].matchAll(/(\d+)px/g)) expect(Number(px[1]), m[0]).toBeLessThanOrEqual(328);
    }
  });
});
