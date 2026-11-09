import { describe, expect, it, vi } from "vitest";
import { createElement, type ReactNode } from "react";
import { renderToReadableStream } from "react-dom/server";

// The real dialog mounts in a portal after hydration; render its children inline.
vi.mock("@/src/components/ui/dialog", () => ({
  Dialog: ({ children }: { children: ReactNode }) => createElement("div", { role: "dialog" }, children),
}));
vi.mock("@/src/app/(workspace)/members-actions", () => ({
  getExportCount: vi.fn(async () => ({ success: true, data: { count: 128 } })),
}));

const { ExportDialog } = await import("@/src/components/workspace/members/export/export-dialog");

async function render() {
  const stream = await renderToReadableStream(
    createElement(ExportDialog, { orgId: "11111111-1111-4111-8111-111111111111", onClose: () => {} })
  );
  await stream.allReady;
  return new Response(stream).text();
}

/** The opening <input ...> tag that sits right before a label's text */
function checkboxBefore(html: string, label: string) {
  const idx = html.indexOf(`>${label}`);
  const start = html.lastIndexOf("<input", idx);
  return html.slice(start, idx);
}

describe("ExportDialog", () => {
  it("is a titled dialog with Fields and Which members groups", async () => {
    const html = await render();
    expect(html).toContain("Export members");
    expect(html).toContain('id="export-dialog-title"');
    expect(html).toContain("<legend");
    expect(html).toContain("Fields");
    expect(html).toContain("Which members");
  });

  it("lists every field", async () => {
    const html = await render();
    for (const label of [
      "Full name",
      "Email",
      "Status",
      "Date joined",
      "Consent date",
      "Consent language",
    ]) {
      expect(html).toContain(label);
    }
  });

  it("opens with only Full name, Email and Status selected", async () => {
    const html = await render();
    expect(checkboxBefore(html, "Full name")).toContain('checked=""');
    expect(checkboxBefore(html, "Email")).toContain('checked=""');
    expect(checkboxBefore(html, "Date joined")).not.toContain('checked=""');
    expect(checkboxBefore(html, "Consent date")).not.toContain('checked=""');
    expect(checkboxBefore(html, "Consent language")).not.toContain('checked=""');
  });

  it("selects only Active members by default", async () => {
    const html = await render();
    expect(checkboxBefore(html, "Active")).toContain('checked=""');
    expect(checkboxBefore(html, "Pending")).not.toContain('checked=""');
    expect(checkboxBefore(html, "Inactive")).not.toContain('checked=""');
  });

  it("warns beside personal-data fields", async () => {
    const html = await render();
    expect(html.match(/Personal data\. Share carefully\./g)).toHaveLength(3);
  });

  it("announces the count in a polite live region and disables the button until it is known", async () => {
    const html = await render();
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain("Counting members");
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*aria-describedby="export-count"[^>]*>/);
    expect(html).toContain("Download CSV");
  });
});
