import { beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToReadableStream } from "react-dom/server";

// The workspace frame: one sidebar for Home, Members, Join and Invite.
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

describe("workspace frame navigation for Ticket R1 & P1", () => {
  it("shows Home, Members, Dues, Join and Invite to an admin", async () => {
    const html = await render(data(true));
    expect(navHrefs(html)).toEqual([
      `/workspace/${ORG}`,
      `/workspace/${ORG}/members`,
      `/workspace/${ORG}/dues`,
      `/workspace/${ORG}/members/join`,
      `/workspace/${ORG}/officers`,
    ]);
    for (const label of ["Home", "Members", "Dues", "Join", "Invite"]) {
      expect(html).toContain(`<span>${label}</span>`);
    }
  });

  it("shows Members and Dues to regular officers, but hides Join", async () => {
    const html = await render(data(false));
    expect(html).toContain("<span>Home</span>");
    expect(html).toContain("<span>Members</span>");
    expect(html).toContain("<span>Dues</span>");
    expect(html).toContain("<span>Invite</span>");
    expect(html).not.toContain("<span>Join</span>");
    expect(html).toContain(`/workspace/${ORG}/members`);
    expect(html).toContain(`/workspace/${ORG}/dues`);
    expect(html).not.toContain("/members/join");
  });

  it("has no 'Soon' placeholders for Members or Dues", async () => {
    const html = await render(data(true));
    expect(html).not.toMatch(/Soon/);
    expect(html).toContain("<span>Members</span>");
    expect(html).toContain("<span>Dues</span>");
  });

  it.each([
    [`/workspace/${ORG}`, "Home"],
    [`/workspace/${ORG}/members`, "Members"],
    [`/workspace/${ORG}/dues`, "Dues"],
    [`/workspace/${ORG}/officers`, "Invite"],
    [`/workspace/${ORG}/members/join`, "Join"],
  ])("highlights %s as active when on %s", async (path, label) => {
    pathname = path;
    const html = await render(data(true));
    const active = [...html.matchAll(/class="orgkit-nav-item active"[^>]*>.*?<span>([^<]+)<\/span>/g)].map(
      (m) => m[1]
    );
    expect(active).toEqual([label]);
  });
});

