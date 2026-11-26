import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToReadableStream } from "react-dom/server";
import { OrgHealthDashboard } from "@/src/components/workspace/home/org-health-dashboard";
import { healthy } from "@/tests/stubs/org-health-fixture";
import type { OrgHealthData } from "@/src/lib/health/org-health";

/** "Needs a look" wears the Members page's Pending colours and "Needs action" its Inactive colours */

const ORG = "11111111-1111-4111-8111-111111111111";

async function dashboard(data: OrgHealthData) {
  const stream = await renderToReadableStream(
    createElement(OrgHealthDashboard, { orgId: ORG, orgName: "Robotics Club", schoolName: null, data })
  );
  await stream.allReady;
  return (await new Response(stream).text()).replaceAll("<!-- -->", "");
}

const pill = (markup: string, status: string) =>
  markup.match(new RegExp(`<span data-status="${status}" style="([^"]+)"`))?.[1] ?? "";

const mixed = () =>
  healthy({
    today: "2026-12-28",
    members: { ...healthy().members, pending: 3, oldestPendingDays: 16 },
    events: { ...healthy().events, upcoming: 0, nextEvent: null },
  });

describe("Home status pills", () => {
  it("shows Needs a look in the Pending amber", async () => {
    const style = pill(await dashboard(mixed()), "watch");
    expect(style).toContain("background-color:var(--color-amber-soft)");
    expect(style).toContain("border:1px solid var(--color-amber-line)");
    expect(style).toContain("color:var(--color-amber-strong)");
  });

  it("shows Needs action in the Inactive red", async () => {
    const style = pill(await dashboard(mixed()), "critical");
    expect(style).toContain("background-color:var(--color-danger-soft)");
    expect(style).toContain("border:1px solid var(--color-danger-line)");
    expect(style).toContain("color:var(--color-danger-strong)");
  });

  it("uses the same tokens as the Members page, so one colour means one thing", () => {
    const tones = readFileSync("src/components/workspace/members/member-status-tones.ts", "utf8");
    // Pending: amber soft, line and strong. Inactive: danger soft, line and strong.
    for (const token of ["--color-amber-soft", "--color-amber-line", "--color-amber-strong"]) {
      expect(tones).toContain(token);
    }
    for (const token of ["--color-danger-soft", "--color-danger-line", "--color-danger-strong"]) {
      expect(tones).toContain(token);
    }
  });

  it("keeps On track and Not started neutral", async () => {
    const out = await dashboard(healthy());
    const good = pill(out, "good");
    expect(good).toContain("background-color:var(--color-surface)");
    expect(good).not.toMatch(/amber|danger/);
  });

  it("still says the status in words and with an icon, not by colour alone", async () => {
    const out = await dashboard(mixed());
    expect(out).toMatch(/data-status="watch"[^>]*>.*?<svg[\s\S]*?<\/svg>Needs a look/);
    expect(out).toMatch(/data-status="critical"[^>]*>.*?<svg[\s\S]*?<\/svg>Needs action/);
  });

  it("gives the Do next icons the same colours as the pills, and no black", async () => {
    const out = await dashboard(
      healthy({
        today: "2026-12-28",
        members: { ...healthy().members, pending: 3, oldestPendingDays: 16 },
        dues: { ...healthy().dues!, pending: 4, paid: 26 },
      })
    );
    const next = out.slice(out.indexOf("Do next"), out.indexOf('id="health-dues"'));
    const tiles = [...next.matchAll(/<span aria-hidden="true" style="([^"]+)"/g)].map((m) => m[1]).filter((s) => s.includes("width:32px"));
    expect(tiles.length).toBe(3);
    // urgent items: the Inactive red
    expect(tiles[0]).toContain("background-color:var(--color-danger-soft)");
    expect(tiles[0]).toContain("border:1px solid var(--color-danger-line)");
    expect(tiles[0]).toContain("color:var(--color-danger-strong)");
    // the rest: the Pending amber
    expect(tiles[2]).toContain("background-color:var(--color-amber-soft)");
    expect(tiles[2]).toContain("border:1px solid var(--color-amber-line)");
    expect(tiles[2]).toContain("color:var(--color-amber-strong)");
    for (const tile of tiles) expect(tile).not.toMatch(/color-ink\)|#000|black/);
  });

  it("leaves the area chips under the headline neutral", async () => {
    const out = await dashboard(mixed());
    const chips = [...out.matchAll(/<a href="#health-[a-z]+" class="orgkit-health-chip"[\s\S]*?<\/a>/g)].map((m) => m[0]);
    expect(chips).toHaveLength(5);
    for (const chip of chips) expect(chip).not.toMatch(/amber|danger/);
  });
});
