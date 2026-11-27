import { describe, it } from "node:test";
import assert from "node:assert/strict";
import nextConfig from "../../next.config.ts";
import { SECRET_URL_PREFIXES } from "../../src/lib/routes.ts";
import { CSP_ENFORCED, HSTS_VALUE, buildCsp } from "../../src/lib/security/csp.ts";

/**
 * The response headers next.config.ts sets, as they combine for a given path.
 * Next merges every rule whose `source` matches the path, in order, and when two
 * rules set the same key the LAST one wins (node_modules/next/dist/docs, headers.md,
 * "Header Overriding Behavior"). This test applies the rules the same way.
 */

type Rule = { source: string; headers: { key: string; value: string }[] };

async function rules(): Promise<Rule[]> {
  assert.equal(typeof nextConfig.headers, "function", "next.config.ts must define headers()");
  return (await nextConfig.headers!()) as Rule[];
}

/** The only source shapes this config uses: "/:path*" alone, or "<literal prefix>/:path*" */
function matches(source: string, pathname: string): boolean {
  const wildcard = /^(.*)\/:path\*$/.exec(source);
  if (!wildcard || /[():?+]/.test(wildcard[1])) {
    throw new Error(`The test cannot read the header source "${source}"; extend matches() first`);
  }
  const prefix = wildcard[1];
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

async function headersFor(pathname: string): Promise<Record<string, string>> {
  const merged: Record<string, string> = {};
  for (const rule of await rules()) {
    if (!matches(rule.source, pathname)) continue;
    for (const { key, value } of rule.headers) merged[key.toLowerCase()] = value;
  }
  return merged;
}

const GLOBAL = {
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
};

/** The headers the secret-link routes had before the global rule was added */
const SECRET_LINK = {
  "referrer-policy": "no-referrer",
  "x-robots-tag": "noindex, nofollow",
};

const PUBLIC_AND_APP_PATHS = [
  "/",
  "/signin",
  "/register",
  "/privacy",
  "/consent",
  "/auth/callback",
  "/workspace/new",
  "/workspace/11111111-1111-4111-8111-111111111111/dues",
  "/workspace/11111111-1111-4111-8111-111111111111/members/export",
  "/_next/static/chunks/main.js",
  "/orgkit-logo.png",
];

const SECRET_LINK_PATHS = SECRET_URL_PREFIXES.flatMap((prefix) => [
  `${prefix}0123456789abcdef`,
  `${prefix}0123456789abcdef/start`,
]);

describe("global security headers", () => {
  it("are set on every kind of path: pages, the app, route handlers, assets and secret links", async () => {
    for (const pathname of [...PUBLIC_AND_APP_PATHS, ...SECRET_LINK_PATHS]) {
      const headers = await headersFor(pathname);
      for (const [key, value] of Object.entries(GLOBAL)) {
        assert.equal(headers[key], value, `${key} on ${pathname}`);
      }
      assert.ok(headers["permissions-policy"], `Permissions-Policy on ${pathname}`);
    }
  });

  it("refuse framing outright (nothing embeds our pages)", async () => {
    assert.equal((await headersFor("/signin"))["x-frame-options"], "DENY");
    assert.equal((await headersFor("/pay/0123456789abcdef"))["x-frame-options"], "DENY");
  });

  describe("Permissions-Policy", () => {
    it("turns off what the app never uses", async () => {
      const policy = (await headersFor("/"))["permissions-policy"];
      for (const feature of ["microphone", "geolocation", "payment", "usb"]) {
        assert.ok(policy.includes(`${feature}=()`), `${feature} should be switched off: ${policy}`);
      }
    });

    it("does not switch off anything the app uses, or the QR scanner planned in docs/techstack.md", async () => {
      const policy = (await headersFor("/"))["permissions-policy"];
      // the app copies links with navigator.clipboard.writeText
      assert.ok(!policy.includes("clipboard"), `clipboard must stay available: ${policy}`);
      assert.ok(!policy.includes("fullscreen"), `fullscreen must stay available: ${policy}`);
      // camera stays available to our own origin (a QR scanner would need it)
      assert.ok(policy.includes("camera=(self)"), `camera should stay available to self: ${policy}`);
      assert.ok(!policy.includes("camera=()"), `camera must not be switched off: ${policy}`);
    });
  });
});

describe("Content-Security-Policy and HSTS", () => {
  const cspOf = (headers: Record<string, string>) =>
    headers["content-security-policy"] ?? headers["content-security-policy-report-only"];

  it("is on every kind of path, enforcing or report-only", async () => {
    for (const pathname of [...PUBLIC_AND_APP_PATHS, ...SECRET_LINK_PATHS]) {
      const headers = await headersFor(pathname);
      assert.ok(cspOf(headers), `a CSP header on ${pathname}`);
      assert.equal(headers["strict-transport-security"], HSTS_VALUE, `HSTS on ${pathname}`);
    }
  });

  it("uses exactly one CSP header name, matching CSP_ENFORCED", async () => {
    const headers = await headersFor("/");
    const expected = CSP_ENFORCED ? "content-security-policy" : "content-security-policy-report-only";
    assert.ok(headers[expected], `${expected} should be set`);
    const other = CSP_ENFORCED ? "content-security-policy-report-only" : "content-security-policy";
    assert.equal(headers[other], undefined, `${other} should not be set`);
  });

  it("HSTS has no preload until the domain is confirmed HTTPS-only", () => {
    assert.ok(!/preload/i.test(HSTS_VALUE));
    assert.ok(/max-age=\d{7,}/.test(HSTS_VALUE));
  });

  describe("buildCsp", () => {
    const prod = buildCsp({ supabaseUrl: "https://abc.supabase.co" });
    const directive = (csp: string, name: string) =>
      csp.split("; ").find((d) => d === name || d.startsWith(`${name} `)) ?? "";

    it("blocks plugins, framing, base-tag hijack and off-site form posts", () => {
      assert.ok(directive(prod, "object-src") === "object-src 'none'");
      assert.ok(directive(prod, "frame-ancestors") === "frame-ancestors 'none'");
      assert.ok(directive(prod, "base-uri") === "base-uri 'self'");
      assert.ok(directive(prod, "form-action") === "form-action 'self'");
      assert.ok(directive(prod, "upgrade-insecure-requests"));
    });

    it("never allows a wildcard or an outside host for scripts, styles or fonts", () => {
      for (const name of ["default-src", "script-src", "style-src", "font-src"]) {
        const d = directive(prod, name);
        assert.ok(!/\*|https?:|data:/.test(d), `${name} must be self-only: ${d}`);
      }
      assert.ok(!directive(prod, "script-src").includes("unsafe-eval"), "no eval in production");
    });

    it("lets the browser reach only its own origin and the Supabase project", () => {
      assert.equal(directive(prod, "connect-src"), "connect-src 'self' https://abc.supabase.co wss://abc.supabase.co");
      assert.ok(directive(prod, "img-src").includes("https://abc.supabase.co"));
      assert.ok(!/\*/.test(prod), "no wildcard anywhere");
    });

    it("still builds a safe policy when the Supabase URL is missing or malformed", () => {
      for (const bad of [undefined, "", "not a url", "javascript:alert(1)"]) {
        const csp = buildCsp({ supabaseUrl: bad });
        assert.equal(directive(csp, "connect-src"), "connect-src 'self'");
        assert.ok(!csp.includes("javascript:"));
      }
    });

    it("allows eval and dev websockets in development only", () => {
      const dev = buildCsp({ supabaseUrl: "https://abc.supabase.co", isDev: true });
      assert.ok(directive(dev, "script-src").includes("'unsafe-eval'"));
      assert.ok(!directive(dev, "upgrade-insecure-requests"), "http://localhost must keep working in dev");
    });

    it("is a single plain line", () => {
      assert.ok(!/[\r\n]/.test(prod));
      assert.equal(prod, prod.trim());
    });
  });
});

describe("secret-link routes keep their existing headers", () => {
  it("still get Referrer-Policy and X-Robots-Tag with exactly the old values", async () => {
    assert.ok(SECRET_LINK_PATHS.length >= 8);
    for (const pathname of SECRET_LINK_PATHS) {
      const headers = await headersFor(pathname);
      for (const [key, value] of Object.entries(SECRET_LINK)) {
        assert.equal(headers[key], value, `${key} on ${pathname}`);
      }
    }
  });

  it("are not applied to the rest of the app", async () => {
    for (const pathname of PUBLIC_AND_APP_PATHS) {
      const headers = await headersFor(pathname);
      for (const key of Object.keys(SECRET_LINK)) {
        assert.equal(headers[key], undefined, `${key} should not be on ${pathname}`);
      }
    }
  });

  it("have a rule for every secret URL prefix (kept in step with routes.ts)", async () => {
    const sources = (await rules()).map((r) => r.source);
    for (const prefix of SECRET_URL_PREFIXES) {
      assert.ok(sources.includes(`${prefix}:path*`), `no rule for ${prefix}:path*`);
    }
  });
});

describe("how the global rule and the per-route rules combine", () => {
  it("never have two matching rules set the same key, so 'last one wins' never decides anything", async () => {
    const all = await rules();
    for (const pathname of [...PUBLIC_AND_APP_PATHS, ...SECRET_LINK_PATHS]) {
      const setBy = new Map<string, string>();
      for (const rule of all.filter((r) => matches(r.source, pathname))) {
        const keysInRule = new Set<string>();
        for (const { key } of rule.headers) {
          const lower = key.toLowerCase();
          assert.ok(!keysInRule.has(lower), `${lower} is set twice inside the rule for ${rule.source}`);
          keysInRule.add(lower);
          const first = setBy.get(lower);
          assert.equal(first, undefined, `on ${pathname}, ${lower} is set by both ${first} and ${rule.source}`);
          setBy.set(lower, rule.source);
        }
      }
    }
  });

  it("keep the global keys out of every secret-link rule, and the other way round", async () => {
    const all = await rules();
    const global = all.find((r) => r.source === "/:path*");
    assert.ok(global, "the global rule is missing");
    const globalKeys = new Set(global.headers.map((h) => h.key.toLowerCase()));
    for (const rule of all.filter((r) => r !== global)) {
      for (const { key } of rule.headers) {
        assert.ok(!globalKeys.has(key.toLowerCase()), `${key} is in both the global rule and ${rule.source}`);
      }
    }
  });

  it("every value is a single plain line", async () => {
    for (const rule of await rules()) {
      for (const { key, value } of rule.headers) {
        assert.ok(!/[\r\n]/.test(value), `${key} has a line break`);
        assert.equal(value, value.trim(), `${key} has stray spaces`);
      }
    }
  });
});
