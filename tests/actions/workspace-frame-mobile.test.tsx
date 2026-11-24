import { beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToReadableStream } from "react-dom/server";

/**
 * The workspace frame on a phone (T2): a slim top bar with a menu button, and the
 * sidebar as a drawer. There is no real browser here, so the sizes and the slide
 * are checked as CSS and markup; the drawer opening and closing is checked by
 * hand in docs/mobile-qa.md.
 */

let pathname = "/";
let narrow = false;
let collapsed = false;

vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
  useRouter: () => ({ push: vi.fn(), prefetch: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/src/app/auth/actions", () => ({ signOut: vi.fn() }));
vi.mock("@/src/lib/fonts", () => ({ plusJakarta: { className: "font-test" } }));
vi.mock("@/src/lib/use-narrow-screen", () => ({
  NARROW_QUERY: "(max-width: 1023px)",
  useNarrowScreen: () => narrow,
}));
vi.mock("@/src/lib/use-sidebar-collapsed", () => ({
  useSidebarCollapsed: () => [collapsed, vi.fn()],
}));

import type { WorkspaceFrameData } from "@/src/components/workspace/frame/workspace-frame";
const { WorkspaceFrame } = await import("@/src/components/workspace/frame/workspace-frame");
const { Sidebar } = await import("@/src/components/layout/sidebar");

const ORG = "11111111-1111-4111-8111-111111111111";
const officer = { id: "u1", email: "ana@school.edu", full_name: "Ana Cruz" };

const data = (): Promise<WorkspaceFrameData | null> =>
  Promise.resolve({
    rawId: ORG,
    orgName: "Robotics Club",
    schoolName: "Mapua",
    officer,
    isAdmin: true,
  });

async function html(element: ReturnType<typeof createElement>): Promise<string> {
  const stream = await renderToReadableStream(element);
  await stream.allReady;
  return (await new Response(stream).text()).replace(/<!-- -->/g, "");
}

const renderFrame = () =>
  html(createElement(WorkspaceFrame, { data: data() }, createElement("p", null, "PAGE CONTENT")));

const asideTag = (markup: string) => /<aside [^>]*>/.exec(markup)?.[0] ?? "";
const navHrefs = (markup: string) =>
  [...markup.matchAll(/<a [^>]*>/g)].map((m) => m[0]).filter((tag) => tag.includes("orgkit-nav-item"));

beforeEach(() => {
  pathname = `/workspace/${ORG}/dues`;
  narrow = false;
  collapsed = false;
});

describe("the top bar", () => {
  it("has a menu button a screen reader can name, that says what it controls and that it starts closed", async () => {
    const markup = await renderFrame();

    expect(markup).toContain('<header class="orgkit-topbar">');
    expect(markup).toContain('aria-label="Open menu"');
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).toContain('aria-controls="orgkit-sidebar"');
    expect(markup).toContain('class="orgkit-topbar-menu"');
  });

  it("says where you are: the section and the org", async () => {
    const markup = await renderFrame();

    expect(markup).toContain('<span class="orgkit-topbar-section">Dues</span>');
    expect(markup).toContain('<span class="orgkit-topbar-org">Robotics Club</span>');

    pathname = `/workspace/${ORG}/events/22222222-2222-4222-8222-222222222222`;
    expect(await renderFrame()).toContain('<span class="orgkit-topbar-section">Events</span>');

    pathname = `/workspace/${ORG}/terms`;
    expect(await renderFrame()).toContain('<span class="orgkit-topbar-section">Terms</span>');

    pathname = `/workspace/${ORG}/documents`;
    expect(await renderFrame()).toContain('<span class="orgkit-topbar-section">Documents</span>');
  });

  it("is in the markup on every screen size, and hidden on a desktop by CSS, so it never flickers", async () => {
    const markup = await renderFrame();
    expect(markup).toMatch(/\.orgkit-topbar,\s*\.orgkit-scrim\s*\{\s*display:\s*none;/);
    expect(markup).toMatch(/@media \(max-width: 1023px\)[\s\S]*\.orgkit-topbar\s*\{\s*display:\s*flex;/);
  });
});

describe("the sidebar drawer", () => {
  it("is the sidebar rendered once: the same eight links, in order, whatever the screen", async () => {
    for (const isNarrow of [false, true]) {
      narrow = isNarrow;
      const links = navHrefs(await renderFrame());
      expect(links).toHaveLength(8);
      expect(links.map((tag) => /href="([^"]+)"/.exec(tag)?.[1])).toEqual([
        `/workspace/${ORG}`,
        `/workspace/${ORG}/members`,
        `/workspace/${ORG}/dues`,
        `/workspace/${ORG}/events`,
        `/workspace/${ORG}/officers`,
        `/workspace/${ORG}/terms`,
        `/workspace/${ORG}/documents`,
        `/workspace/${ORG}/handover`,
      ]);
    }
  });

  it("on a desktop is an ordinary sidebar: no dialog role, no scrim, and it can be collapsed", async () => {
    const markup = await renderFrame();

    expect(asideTag(markup)).toContain('id="orgkit-sidebar"');
    expect(asideTag(markup)).toContain('class="orgkit-aside"');
    expect(asideTag(markup)).not.toContain("role=");
    expect(markup).not.toContain("orgkit-scrim\"");
    expect(markup).toContain('title="Collapse sidebar"');
    expect(markup).not.toContain('aria-label="Close menu"');
  });

  it("on a phone is a labelled dialog with a Close menu button instead of the collapse button", async () => {
    narrow = true;
    const markup = await renderFrame();

    expect(asideTag(markup)).toContain('role="dialog"');
    expect(asideTag(markup)).toContain('aria-label="Menu"');
    expect(markup).toContain('aria-label="Close menu"');
    expect(markup).toContain("data-drawer-close");
    expect(markup).not.toContain('title="Collapse sidebar"');
  });

  it("is never modal while closed, and not marked open", async () => {
    narrow = true;
    const markup = await renderFrame();

    expect(asideTag(markup)).not.toContain("aria-modal");
    expect(asideTag(markup)).not.toContain("is-open");
  });

  it("is marked open and modal when open", async () => {
    narrow = true;
    const markup = await html(
      createElement(Sidebar, {
        rawId: ORG,
        orgName: "Robotics Club",
        officer,
        isCollapsed: false,
        onToggleCollapse: () => {},
        isDrawer: true,
        isDrawerOpen: true,
        onCloseDrawer: () => {},
      })
    );

    expect(asideTag(markup)).toContain('class="orgkit-aside is-open"');
    expect(asideTag(markup)).toContain('aria-modal="true"');
  });

  it("shows the full sidebar in a drawer even if the desktop sidebar was left collapsed", async () => {
    collapsed = true;

    narrow = false;
    const desktop = await renderFrame();
    expect(desktop).not.toContain("<span>Members</span>");
    expect(desktop).toContain('title="Expand sidebar"');

    narrow = true;
    const phone = await renderFrame();
    for (const label of ["Home", "Members", "Dues", "Events", "Officers"]) {
      expect(phone).toContain(`<span>${label}</span>`);
    }
    expect(phone).not.toContain('title="Expand sidebar"');
  });

  it("keeps the desktop sidebar's width inline, and lets the drawer CSS override it", async () => {
    const markup = await renderFrame();

    expect(asideTag(markup)).toMatch(/width:256px/);
    expect(markup).toMatch(/@media \(max-width: 1023px\)[\s\S]*width:\s*min\(256px, 85vw\)\s*!important;/);
  });
});

describe("the frame's size and content area", () => {
  it("uses the visible height (dvh) so the bottom is not hidden under a phone's toolbar", async () => {
    const markup = await renderFrame();

    expect(markup).toContain('class="font-test orgkit-frame"');
    expect(markup).toContain('class="orgkit-main"');
    expect(markup).toMatch(/\.orgkit-frame\s*\{\s*height:\s*100vh;\s*height:\s*100dvh;/);
    // No inline fixed height left on the frame, the sidebar or the content area
    expect(markup).not.toMatch(/<(div|aside|main)[^>]*style="[^"]*height:100vh/);
  });

  it("stacks the top bar over the content on a phone and gives the content the rest of the height", async () => {
    const markup = await renderFrame();

    expect(markup).toMatch(/@media \(max-width: 1023px\)\s*\{\s*\.orgkit-frame\s*\{\s*flex-direction:\s*column;/);
    expect(markup).toMatch(/\.orgkit-main\s*\{\s*flex:\s*1 1 0;\s*height:\s*auto;\s*min-height:\s*0;/);
  });

  it("renders the page content", async () => {
    expect(await renderFrame()).toContain("PAGE CONTENT");
  });
});
