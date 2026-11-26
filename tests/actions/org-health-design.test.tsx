import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToReadableStream } from "react-dom/server";
import { OrgHealthDashboard } from "@/src/components/workspace/home/org-health-dashboard";
import { brandNew, healthy } from "@/tests/stubs/org-health-fixture";
import type { OrgHealthData } from "@/src/lib/health/org-health";

/**
 * The "tactile refinement" revision of docs/design.md (2026-11-26), applied to Home only.
 * These keep the revision in place, and keep it from leaking into the rest of the app.
 */

const ORG = "11111111-1111-4111-8111-111111111111";

async function dashboard(data: OrgHealthData) {
  const stream = await renderToReadableStream(
    createElement(OrgHealthDashboard, { orgId: ORG, orgName: "Robotics Club", schoolName: "Mapua", data })
  );
  await stream.allReady;
  return (await new Response(stream).text()).replaceAll("<!-- -->", "");
}

/** The text inside the braces that follow `header`, matching nested braces */
function blockAfter(source: string, header: string): string {
  const start = source.indexOf(header);
  if (start < 0) throw new Error(`"${header}" not found`);
  const open = source.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}" && --depth === 0) return source.slice(open + 1, i);
  }
  throw new Error(`"${header}" has no closing brace`);
}

const styleOf = (markup: string) => markup.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? "";
const read = (path: string) => readFileSync(path, "utf8");

describe("Home design: tokens, fonts and type", () => {
  it("defines the new tokens under .orgkit-home, so nothing outside Home changes", async () => {
    const tokens = blockAfter(styleOf(await dashboard(healthy())), ".orgkit-home {");
    for (const token of [
      "--ease-out: cubic-bezier(0.23, 1, 0.32, 1)",
      "--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1)",
      "--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1)",
      "--ease-spring: cubic-bezier(0.16, 1, 0.3, 1)",
      "--t-fast: 180ms",
      "--t-base: 280ms",
      "--t-slow: 450ms",
      "--shadow-rest:",
      "--shadow-hover:",
      "--shadow-pressed:",
      "--shadow-card:",
      "--shadow-dialog:",
    ]) {
      expect(tokens).toContain(token);
    }
  });

  it("sets Inter at weight 500 as the default, with the smoothing the spec asks for", async () => {
    const tokens = blockAfter(styleOf(await dashboard(healthy())), ".orgkit-home {");
    expect(tokens).toMatch(/font-family:\s*var\(--font-inter\), "Inter"/);
    expect(tokens).toContain("font-weight: 500");
    expect(tokens).toContain("-webkit-font-smoothing: antialiased");
    expect(tokens).toContain("text-rendering: optimizeLegibility");
  });

  it("retires weight 800, and never uses transition: all", async () => {
    for (const data of [healthy(), brandNew()]) {
      const out = await dashboard(data);
      expect(out).not.toMatch(/font-weight:\s*800/);
      expect(out).not.toMatch(/transition:\s*all/);
    }
  });

  it("gives headings weight 600 or 700, with tight tracking on the page heading", async () => {
    const out = await dashboard(healthy());
    const h1 = out.match(/<h1[^>]*style="([^"]+)"/)![1];
    expect(h1).toContain("font-weight:700");
    expect(h1).toContain("letter-spacing:-0.035em");
    for (const heading of out.matchAll(/<h([23])[^>]*style="([^"]+)"/g)) {
      expect(heading[2]).toMatch(/font-weight:(600|700)/);
    }
  });

  it("uses JetBrains Mono for status tags and never for headings", async () => {
    const out = await dashboard(healthy());
    expect(out).toContain("var(--font-jetbrains)");
    const chips = [...out.matchAll(/<span data-status="[^"]+" style="([^"]+)"/g)].map((m) => m[1]);
    expect(chips.length).toBeGreaterThanOrEqual(5);
    for (const style of chips) expect(style).toContain("--font-jetbrains");
    for (const heading of out.matchAll(/<h[123][^>]*style="([^"]+)"/g)) {
      expect(heading[1]).not.toContain("--font-jetbrains");
    }
  });

  it("aligns amounts and counts with tabular numerals", async () => {
    const out = await dashboard(healthy());
    expect(out).toMatch(/font-variant-numeric:tabular-nums[^>]*>₱3,000/);
    expect(out).toMatch(/font-variant-numeric:tabular-nums[^>]*>40</);
  });

  it("selects text in ink on white", async () => {
    expect(blockAfter(styleOf(await dashboard(healthy())), ".orgkit-home ::selection")).toMatch(
      /background: var\(--color-ink\);\s*color: var\(--color-surface\)/
    );
  });
});

describe("Home design: shadows and borders", () => {
  it("uses the shadow tokens only: no one-off box-shadow values", async () => {
    const out = await dashboard(healthy());
    const withoutTokenDefinitions = out.replace(/--shadow-[a-z]+:[^;]+;/g, "");
    const shadows = [...withoutTokenDefinitions.matchAll(/box-shadow:\s*([^;"]+)/g)].map((m) => m[1].trim());
    expect(shadows.length).toBeGreaterThan(0);
    // The one exception is the 2px surface ring that keeps a chart dot clear of its neighbours (dataviz spec)
    for (const value of shadows) {
      expect(value).toMatch(/^(var\(--shadow-(rest|hover|pressed|card|dialog)\)|0 0 0 2px var\(--color-surface\))$/);
    }
  });

  it("frames cards with a hairline border and the hero with the card shadow", async () => {
    const out = await dashboard(healthy());
    expect(out).toContain("border:1px solid rgba(228, 228, 231, 0.6)");
    expect(out).toMatch(/class="orgkit-health-hero stagger-1"[^>]*box-shadow:var\(--shadow-card\)/);
  });
});

describe("Home design: motion", () => {
  it("keeps every hover effect behind @media (hover: hover), so nothing sticks after a tap", async () => {
    const css = styleOf(await dashboard(healthy()));
    const hoverBlock = blockAfter(css, "@media (hover: hover)");
    expect(hoverBlock).toContain(".orgkit-health-chip:hover");
    expect(hoverBlock).toContain("translateY(-1px)");
    // outside that block (and the reduced-motion block that cancels it) no :hover remains
    const rest = css.replace(hoverBlock, "").replace(blockAfter(css, "@media (prefers-reduced-motion: reduce)"), "");
    expect(rest).not.toMatch(/:hover/);
  });

  it("presses in with scale(0.97) on chips, rows and links", async () => {
    const css = styleOf(await dashboard(healthy()));
    for (const selector of [".orgkit-health-chip:active", ".orgkit-health-next-item:active", ".orgkit-health-link:active"]) {
      expect(blockAfter(css, selector)).toContain("scale(0.97)");
    }
  });

  it("transitions only the listed properties, with the spec's easing and durations", async () => {
    const chip = blockAfter(styleOf(await dashboard(healthy())), ".orgkit-health-chip {");
    expect(chip).toContain("transform var(--t-fast) var(--ease-out)");
    expect(chip).toContain("box-shadow var(--t-fast) var(--ease-out)");
    expect(chip).toContain("border-color var(--t-fast) var(--ease-out)");
  });

  it("enters in a cascade: hero, then the first card row, then the second", async () => {
    const out = await dashboard(healthy());
    const css = styleOf(out);
    expect(css).toContain("@keyframes orgkitSmoothRise");
    expect(css).toMatch(/\.stagger-1 \{ animation: orgkitSmoothRise 0\.7s var\(--ease-spring\) both; \}/);
    expect(css).toMatch(/\.stagger-2 \{[^}]*0\.08s both/);
    expect(css).toMatch(/\.stagger-3 \{[^}]*0\.16s both/);
    expect(out).toMatch(/id="health-dues"[^>]*class="orgkit-health-card stagger-2/);
    expect(out).toMatch(/id="health-members"[^>]*class="orgkit-health-card stagger-2/);
    for (const area of ["events", "officers", "handover"]) {
      expect(out).toMatch(new RegExp(`id="health-${area}"[^>]*class="orgkit-health-card stagger-3`));
    }
  });

  it("flattens all movement for people who ask for reduced motion", async () => {
    const reduced = blockAfter(styleOf(await dashboard(healthy())), "@media (prefers-reduced-motion: reduce)");
    expect(reduced).toContain("animation-duration: 0.01ms !important");
    expect(reduced).toContain("animation-delay: 0ms !important");
    expect(reduced).toContain("transition-duration: 0.01ms !important");
    expect(reduced).toMatch(/\.stagger-1[\s\S]*opacity: 1 !important;[\s\S]*transform: none !important/);
    expect(reduced).toContain(".orgkit-health-chip:active");
  });
});

describe("Home design: scoped to Home only", () => {
  it("keeps the tokens and fonts out of globals.css and the root layout", () => {
    expect(read("src/app/globals.css")).not.toMatch(/--ease-out|--shadow-rest|--font-inter/);
    expect(read("src/app/layout.tsx")).not.toMatch(/inter|jetbrains/i);
  });

  it("applies the two font variables on the Home page only", () => {
    const page = read("src/app/(workspace)/workspace/[id]/page.tsx");
    expect(page).toContain("inter.variable");
    expect(page).toContain("jetbrainsMono.variable");
    // no other page or layout reaches for the new fonts
    for (const other of [
      "src/app/(workspace)/layout.tsx",
      "src/app/(workspace)/workspace/[id]/dues/page.tsx",
      "src/app/(workspace)/workspace/[id]/members/page.tsx",
      "src/app/(workspace)/workspace/[id]/events/page.tsx",
    ]) {
      expect(read(other)).not.toMatch(/jetbrainsMono|inter\.(variable|className)/);
    }
  });

  it("leaves the shared page font as it was", () => {
    expect(read("src/lib/fonts.ts")).toMatch(
      /export const plusJakarta = Plus_Jakarta_Sans\(\{[\s\S]*weight: \["400", "500", "600", "700", "800"\]/
    );
  });
});
