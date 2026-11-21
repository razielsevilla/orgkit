import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToReadableStream } from "react-dom/server";

// next/font only works inside the Next.js compiler
vi.mock("@/src/lib/fonts", () => ({ plusJakarta: { className: "font-test" } }));

const { default: PrivacyPage } = await import("@/src/app/privacy/page");

async function render(): Promise<string> {
  const stream = await renderToReadableStream(createElement(PrivacyPage));
  await stream.allReady;
  return (await new Response(stream).text()).replace(/<!-- -->/g, "");
}

describe("/privacy page", () => {
  beforeEach(() => {
    vi.stubEnv("PRIVACY_CONTACT_EMAIL", "privacy@orgkit.example");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("lists every kind of data OrgKit holds, including attendance and dues", async () => {
    const html = await render();

    for (const phrase of [
      "Account data",
      "Organizational data",
      "Attendance",
      "Dues",
      "payment reference number",
      "screenshot",
      "dues reminder email",
      "Exports and rate limiting",
      "hashed",
    ]) {
      expect(html, phrase).toContain(phrase);
    }
  });

  it("does not describe handover records, which the app does not hold yet", async () => {
    expect((await render()).toLowerCase()).not.toContain("handover");
  });

  it("says that consent given to an earlier wording stays valid", async () => {
    const html = await render();
    expect(html).toContain("If you agreed to an earlier wording");
    expect(html).toContain("Your consent stays valid");
  });

  it("shows the configured contact address as a mailto link", async () => {
    const html = await render();
    expect(html).toContain('href="mailto:privacy@orgkit.example"');
  });

  it("falls back to asking the org's officers when no contact is configured", async () => {
    vi.stubEnv("PRIVACY_CONTACT_EMAIL", "");
    const html = await render();

    expect(html).not.toContain("mailto:");
    expect(html).toContain("Ask the officers of your org");
  });
});
