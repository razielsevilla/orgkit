import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToReadableStream } from "react-dom/server";
import { MemberPager } from "@/src/components/workspace/members/member-pager";
import { DuesMemberPager } from "@/src/components/workspace/dues/dues-member-pager";

/**
 * At 44px a button, seven page numbers plus two arrows are wider than a 360px
 * phone. Both pagers therefore swap the numbers for "Page 2 of 5" on a phone,
 * and wrap if they ever run out of room. The swap is CSS, so both versions are
 * in the markup and these tests read the markup.
 */

async function html(element: ReturnType<typeof createElement>): Promise<string> {
  const stream = await renderToReadableStream(element);
  await stream.allReady;
  return (await new Response(stream).text()).replace(/<!-- -->/g, "");
}

const pagers = [
  {
    name: "MemberPager",
    render: () => html(createElement(MemberPager, { page: 3, pageCount: 9, onPageChange: () => {} })),
  },
  {
    name: "DuesMemberPager",
    render: () => html(createElement(DuesMemberPager, { page: 3, totalPages: 9, onPageChange: () => {} })),
  },
];

describe.each(pagers)("$name on a phone", ({ render }) => {
  it("says which page you are on in words", async () => {
    const markup = await render();
    expect(markup).toContain('<span class="orgkit-pager-status" aria-live="polite">Page 3 of 9</span>');
  });

  it("hides the numbered pages and the gaps with CSS at 640px and below, and shows the status", async () => {
    const markup = await render();

    expect(markup).toMatch(/@media \(max-width: 640px\)\s*\{\s*\.orgkit-pager-num\s*\{\s*display:\s*none !important;/);
    expect(markup).toMatch(/\.orgkit-pager-status\s*\{\s*display:\s*inline;/);
    // Hidden by default, so a desktop never shows it
    expect(markup).toMatch(/\.orgkit-pager-status\s*\{\s*display:\s*none;/);
  });

  it("keeps the arrows, which are always shown", async () => {
    const markup = await render();

    expect(markup).toContain('aria-label="Previous page"');
    expect(markup).toContain('aria-label="Next page"');
    const arrowTags = [...markup.matchAll(/<button[^>]*aria-label="(Previous|Next) page"[^>]*>/g)].map((m) => m[0]);
    expect(arrowTags).toHaveLength(2);
    expect(arrowTags.every((tag) => !tag.includes("orgkit-pager-num"))).toBe(true);
  });

  it("marks every numbered page and every gap, so the phone CSS can hide them", async () => {
    const markup = await render();

    const numbered = [...markup.matchAll(/<button[^>]*aria-label="Page \d+"[^>]*>/g)].map((m) => m[0]);
    expect(numbered.length).toBeGreaterThan(0);
    expect(numbered.every((tag) => tag.includes("orgkit-pager-num"))).toBe(true);
    expect(markup).toMatch(/<span[^>]*class="orgkit-pager-num"[^>]*aria-hidden="true"[^>]*>…<\/span>/);
  });

  it("wraps instead of overflowing if it still runs out of room", async () => {
    const markup = await render();
    expect(markup).toMatch(/<nav[^>]*style="[^"]*flex-wrap:wrap/);
    expect(markup).toMatch(/<nav[^>]*style="[^"]*justify-content:center/);
  });

  it("still marks the current page for screen readers on wider screens", async () => {
    const markup = await render();
    expect(markup).toMatch(/aria-label="Page 3"[^>]*aria-current="page"|aria-current="page"[^>]*aria-label="Page 3"/);
  });
});
