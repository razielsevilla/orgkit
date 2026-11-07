import { beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToReadableStream } from "react-dom/server";

// The workspace frame: one sidebar for Home, Join and Invite. Rendered on the
// server with an already-resolved promise, the way the layout hands it over.
let pathname = "/";
vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
  useRouter: () => ({ push: vi.fn(), prefetch: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/src/app/auth/actions", () => ({ signOut: vi.fn() }));
// next/font only works inside the Next compiler
vi.mock("@/src/lib/fonts", () => ({ plusJakarta: { className: "font-test" } }));

const { WorkspaceFrame } = await import("@/src/components/workspace/frame/workspace-frame");

const ORG = "11111111-1111-4111-8111-111111111111";
const officer = { id: "u1", email: "ana@school.edu", full_name: "Ana Cruz" };

const data = (isAdmin: boolean) =>
  Promise.resolve({
    rawId: ORG,
    orgName: "Robotics Club",
    schoolName: "Mapua",
    officer,
    isAdmin,
  });

async function render(frameData: Promise<ReturnType<typeof Object> | null>) {
  const stream = await renderToReadableStream(
    createElement(
      WorkspaceFrame,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { data: frameData as any },
      createElement("p", null, "PAGE CONTENT")
    )
  );
  await stream.allReady;
  return new Response(stream).text();
}

/** The href of every sidebar link, in order */
function navHrefs(html: string) {
  return [...html.matchAll(/<a [^>]*>/g)]
    .map((m) => m[0])
    .filter((tag) => tag.includes("orgkit-nav-item"))
    .map((tag) => /href="([^"]+)"/.exec(tag)?.[1]);
}

beforeEach(() => {
  pathname = `/workspace/${ORG}`;
});

describe("workspace frame", () => {
  it("shows Home, Join and Invite to an admin, and nothing else", async () => {
    const html = await render(data(true));
    expect(navHrefs(html)).toEqual([
      `/workspace/${ORG}`,
      `/workspace/${ORG}/members/join`,
      `/workspace/${ORG}/officers`,
    ]);
    for (const label of ["Home", "Join", "Invite"]) expect(html).toContain(`<span>${label}</span>`);
  });

  it("has no 'Soon' items or placeholders for features that don't exist", async () => {
    const html = await render(data(true));
    expect(html).not.toMatch(/Soon/);
    for (const label of ["Members", "Events", "Dues", "Archive"]) {
      expect(html).not.toContain(`<span>${label}</span>`);
    }
  });

  it("hides Join from officers who aren't admins", async () => {
    const html = await render(data(false));
    expect(html).toContain("<span>Home</span>");
    expect(html).toContain("<span>Invite</span>");
    expect(html).not.toContain("<span>Join</span>");
    expect(html).not.toContain("/members/join");
  });

  it.each([
    [`/workspace/${ORG}`, "Home"],
    [`/workspace/${ORG}/officers`, "Invite"],
    [`/workspace/${ORG}/members/join`, "Join"],
  ])("highlights the right entry on %s", async (path, label) => {
    pathname = path;
    const html = await render(data(true));
    const active = [...html.matchAll(/class="orgkit-nav-item active"[^>]*>.*?<span>([^<]+)<\/span>/g)].map(
      (m) => m[1]
    );
    expect(active).toEqual([label]);
  });

  it("shows the same sidebar and the page's own content", async () => {
    const html = await render(data(true));
    expect(html).toContain("PAGE CONTENT");
    expect(html).toContain("Robotics Club");
    expect(html).toContain("<aside");
  });

  it("renders only the page when there is no org to show", async () => {
    const html = await render(Promise.resolve(null));
    expect(html).toContain("PAGE CONTENT");
    expect(html).not.toContain("<aside");
  });
});

async function renderLoader(props?: Record<string, unknown>) {
  const { WorkspaceContentLoader } = await import(
    "@/src/components/workspace/frame/workspace-content-loader"
  );
  const stream = await renderToReadableStream(createElement(WorkspaceContentLoader, props));
  await stream.allReady;
  return new Response(stream).text();
}

describe("workspace loading animation", () => {
  it("defaults to the flow animation: the logo filling with color from below", async () => {
    const html = await renderLoader();
    expect(html).toContain("orgkit-flow-strip");
    expect(html).toContain("orgkit-flow-ghost");
    expect(html).not.toContain("orgkit-loader-ring");
  });

  it("announces loading and uses no sidebar markup", async () => {
    const html = await renderLoader();
    expect(html).toContain('role="status"');
    expect(html).toContain("Loading");
    expect(html).not.toContain("<aside");
  });

  it("marks itself finishing when the page is ready", async () => {
    expect(await renderLoader()).not.toContain("is-finishing");
    expect(await renderLoader({ finishing: true })).toContain("is-finishing");
  });

  it("shows the same loader beside a still sidebar skeleton on first load", async () => {
    const { WorkspaceLoadingSkeleton } = await import(
      "@/src/components/workspace/frame/workspace-skeleton"
    );
    const stream = await renderToReadableStream(createElement(WorkspaceLoadingSkeleton));
    await stream.allReady;
    const html = await new Response(stream).text();
    expect(html).toContain("orgkit-loader");
    // The sidebar placeholder must not animate
    const aside = html.slice(html.indexOf("<aside"), html.indexOf("</aside>"));
    expect(aside).not.toContain("orgkit-shimmer");
    expect(aside).not.toContain("animation");
  });
});
