import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import {
  PRIVATE_ROUTES,
  SECRET_URL_PREFIXES,
  inviteStartPath,
  invitePath,
  isPublicPath,
  joinLinkPath,
  joinPanelPath,
  membersPath,
  officerLandingPath,
  officersPath,
  signInPath,
  workspacePath,
} from "../../src/lib/routes.ts";

const APP_DIR = join(import.meta.dirname, "../../src/app");

/** Every URL pattern that has a page or route handler under src/app */
function discoverRoutes(dir = APP_DIR): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...discoverRoutes(full));
    } else if (entry.name === "page.tsx" || entry.name === "route.ts") {
      const segments = relative(APP_DIR, dir)
        .split(sep)
        .filter((s) => s && !(s.startsWith("(") && s.endsWith(")")))
        .map((s) => (s.startsWith("[") ? `:${s.slice(1, -1)}` : s));
      found.push("/" + segments.join("/"));
    }
  }
  return found;
}

const routes = discoverRoutes();
const sample = (pattern: string) => pattern.replace(/:\w+/g, "x");

describe("route access", () => {
  it("finds the routes under src/app", () => {
    assert.ok(routes.length >= 12, `only found ${routes.join(", ")}`);
    assert.ok(routes.includes("/"));
    assert.ok(routes.includes("/workspace/:id"));
  });

  it("classifies every route as public or private, never both", () => {
    for (const route of routes) {
      const isPublic = isPublicPath(sample(route));
      const isPrivate = PRIVATE_ROUTES.includes(route);
      assert.ok(
        isPublic || isPrivate,
        `${route} is neither public nor in PRIVATE_ROUTES (src/lib/routes.ts). Add it to one of them.`
      );
      assert.ok(!(isPublic && isPrivate), `${route} is both public and in PRIVATE_ROUTES`);
    }
  });

  it("lists no private route that doesn't exist", () => {
    for (const route of PRIVATE_ROUTES) {
      assert.ok(routes.includes(route), `PRIVATE_ROUTES has ${route}, but no page serves it`);
    }
  });

  it("documents every route in docs/routes.md", () => {
    const docs = readFileSync(join(import.meta.dirname, "../../docs/routes.md"), "utf8");
    for (const route of routes) {
      assert.ok(docs.includes(`\`${route}\``), `docs/routes.md doesn't mention ${route}`);
    }
  });
});

describe("secret URLs", () => {
  it("sends no Referer and marks noindex for every secret URL prefix", () => {
    const config = readFileSync(join(import.meta.dirname, "../../next.config.ts"), "utf8");
    for (const prefix of SECRET_URL_PREFIXES) {
      assert.ok(
        config.includes(`"${prefix}:path*"`),
        `next.config.ts has no header rule for ${prefix}:path*`
      );
    }
    assert.ok(config.includes("no-referrer"));
    assert.ok(config.includes("noindex"));
  });

  it("only treats real secret-token routes as secret prefixes", () => {
    for (const prefix of SECRET_URL_PREFIXES) {
      assert.ok(
        routes.some((r) => r.startsWith(prefix)),
        `${prefix} has no route`
      );
    }
  });
});

describe("path helpers", () => {
  const id = "11111111-1111-4111-8111-111111111111";

  it("builds one URL per page", () => {
    assert.equal(workspacePath(id), `/workspace/${id}`);
    assert.equal(membersPath(id), `/workspace/${id}/members`);
    assert.equal(officersPath(id), `/workspace/${id}/officers`);
    assert.equal(joinPanelPath(id), `/workspace/${id}/members/join`);
    assert.equal(invitePath("t"), "/invite/t");
    assert.equal(inviteStartPath("t"), "/invite/t/start");
    assert.equal(joinLinkPath("t"), "/join/t");
  });

  it("builds sign-in URLs with an optional error", () => {
    assert.equal(signInPath(), "/signin");
    assert.equal(signInPath("google_error"), "/signin?error=google_error");
  });

  it("builds paths that exist as routes", () => {
    const built = [
      workspacePath(id),
      membersPath(id),
      officersPath(id),
      joinPanelPath(id),
      invitePath("t"),
      inviteStartPath("t"),
      joinLinkPath("t"),
    ];
    for (const path of built) {
      const matches = routes.some(
        (route) =>
          new RegExp("^" + route.replace(/:\w+/g, "[^/]+") + "$").test(path)
      );
      assert.ok(matches, `${path} doesn't match any route`);
    }
  });
});

describe("officerLandingPath", () => {
  it("puts the org first, then a pending invite, then the create screen", () => {
    assert.equal(officerLandingPath({ orgId: "o", pendingInvite: "t" }), "/workspace/o");
    assert.equal(officerLandingPath({ orgId: null, pendingInvite: "t" }), "/invite/t");
    assert.equal(officerLandingPath({ orgId: null, pendingInvite: undefined }), "/workspace/new");
    assert.equal(officerLandingPath({}), "/workspace/new");
  });

  it("puts a pending invite first right after sign-in", () => {
    assert.equal(
      officerLandingPath({ orgId: "o", pendingInvite: "t", inviteFirst: true }),
      "/invite/t"
    );
    assert.equal(officerLandingPath({ orgId: "o", inviteFirst: true }), "/workspace/o");
  });
});

describe("isPublicPath", () => {
  it("lets signed-out visitors open the public pages", () => {
    for (const path of ["/", "/signin", "/register", "/privacy", "/terms", "/auth/callback"]) {
      assert.equal(isPublicPath(path), true, path);
    }
    assert.equal(isPublicPath("/join/abc"), true);
    assert.equal(isPublicPath("/invite/abc"), true);
    assert.equal(isPublicPath("/invite/abc/start"), true);
  });

  it("keeps everything else behind sign-in", () => {
    for (const path of ["/consent", "/workspace/new", `/workspace/x`, "/workspace/x/officers", "/org/x", "/unknown"]) {
      assert.equal(isPublicPath(path), false, path);
    }
  });
});
