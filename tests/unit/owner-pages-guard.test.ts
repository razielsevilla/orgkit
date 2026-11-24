import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PRIVATE_ROUTES, ROUTES } from "../../src/lib/routes.ts";

/**
 * The owner pages show usage numbers and what people wrote. These checks read
 * the page files so a later edit cannot quietly drop the owner check, and so the
 * feedback button stays on every workspace page.
 */

const ROOT = join(import.meta.dirname, "../..");
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");

const OWNER_PAGES = [
  { file: "src/app/(workspace)/owner/usage/page.tsx", route: ROUTES.ownerUsage, load: "getUsageReport()" },
  { file: "src/app/(workspace)/owner/feedback/page.tsx", route: ROUTES.ownerFeedback, load: "getFeedbackInbox()" },
];

describe("owner pages stay owner-only", () => {
  for (const page of OWNER_PAGES) {
    it(`${page.route} checks the owner before it loads anything`, () => {
      const source = read(page.file);
      const check = source.indexOf("await requireOwner()");
      const load = source.indexOf(`await ${page.load}`);

      assert.ok(check >= 0, `${page.file} must call await requireOwner()`);
      assert.ok(load >= 0, `${page.file} must load its data`);
      assert.ok(check < load, "the owner check must come before the data is loaded");
    });

    it(`${page.route} is a private route and is kept out of search results`, () => {
      assert.ok(PRIVATE_ROUTES.includes(page.route));
      assert.match(read(page.file), /robots:\s*\{\s*index:\s*false/);
    });
  }

  it("the database functions behind both pages refuse anyone who is not the owner", () => {
    const usage = read("supabase/migrations/20261121120000_t3_weekly_usage_metrics.sql");
    const feedback = read("supabase/migrations/20261122120000_t5_feedback.sql");

    for (const sql of [usage, feedback]) {
      assert.match(sql, /not public\.is_platform_owner\(\)/);
      assert.match(sql, /raise exception 'not_authorized'/);
    }
  });
});

describe("the feedback button is on every workspace page", () => {
  it("is rendered by the (workspace) layout, after the officer check", () => {
    const layout = read("src/app/(workspace)/layout.tsx");
    const gate = layout.indexOf("await requireOfficer()");
    const button = layout.indexOf("<FeedbackButton />");

    assert.ok(gate >= 0 && button >= 0, "the layout must check the officer and render <FeedbackButton />");
    assert.ok(gate < button, "the button is only shown to a signed-in officer");
  });

  it("is not rendered on the public pages (join, pay, check-in, privacy)", () => {
    for (const file of [
      "src/app/join/[token]/page.tsx",
      "src/app/pay/[token]/page.tsx",
      "src/app/checkin/[token]/page.tsx",
      "src/app/privacy/page.tsx",
    ]) {
      assert.ok(!read(file).includes("FeedbackButton"), `${file} must not show the feedback button`);
    }
  });
});
