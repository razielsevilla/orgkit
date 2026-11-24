import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToReadableStream } from "react-dom/server";
import { HandoverHeader } from "@/src/components/workspace/handover/handover-header";
import { HandoverSectionCard } from "@/src/components/workspace/handover/handover-section-card";
import { HANDOVER_SECTION_DEFINITIONS } from "@/src/lib/handover/handover-helpers";
import type { HandoverGuide } from "@/src/lib/handover/handover-types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/workspace/11111111-1111-4111-8111-111111111111/handover",
}));

async function render(element: ReturnType<typeof createElement>): Promise<string> {
  const stream = await renderToReadableStream(element);
  await stream.allReady;
  return (await new Response(stream).text()).replace(/<!-- -->/g, "");
}

const mockGuide: HandoverGuide = {
  id: "guide-mobile",
  orgId: "11111111-1111-4111-8111-111111111111",
  termId: null,
  roleTitle: "Auditor",
  status: "draft",
  sections: {
    what_i_do: "Audit all financial statements and receipts.",
    recurring_tasks: "",
    key_contacts: "",
    open_items: "",
    where_things_are: "",
    linked_document_ids: [],
  },
  linkedDocuments: [],
  authorId: "user-1",
  finalizedBy: null,
  finalizedAt: null,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-02T00:00:00Z",
  canEdit: true,
  canReopen: false,
  canFinalize: true,
};

describe("handover UI: 360px mobile view", () => {
  it("renders mobile-friendly responsive header classes and elements", async () => {
    const html = await render(
      createElement(HandoverHeader, {
        guide: mockGuide,
        completeness: { filledCount: 1, totalCount: 5, percentage: 20 },
        saveStatus: "idle",
        isSavingManual: false,
        onSaveManual: vi.fn(),
        onOpenFinalize: vi.fn(),
        onOpenReopen: vi.fn(),
      })
    );

    expect(html).toContain("orgkit-handover-header-row");
    expect(html).toContain("orgkit-handover-actions-group");
  });

  it("renders mobile-friendly fluid accordion containers without fixed overflow widths", async () => {
    const def = HANDOVER_SECTION_DEFINITIONS[0];
    const html = await render(
      createElement(HandoverSectionCard, {
        definition: def,
        content: "Audit financial statements.",
        isReadOnly: false,
        onChange: vi.fn(),
        defaultExpanded: true,
      })
    );

    expect(html).toContain("orgkit-handover-accordion");
    expect(html).toContain("orgkit-textarea-field");
  });
});
