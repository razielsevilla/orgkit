import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToReadableStream } from "react-dom/server";
import type { HandoverGuide } from "@/src/lib/handover/handover-types";
import { HANDOVER_SECTION_DEFINITIONS } from "@/src/lib/handover/handover-helpers";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/workspace/11111111-1111-4111-8111-111111111111/handover",
}));

const { HandoverSkeleton } = await import(
  "@/src/components/workspace/handover/handover-skeleton"
);
const { HandoverHeader } = await import(
  "@/src/components/workspace/handover/handover-header"
);
const { HandoverSectionCard } = await import(
  "@/src/components/workspace/handover/handover-section-card"
);
const { HandoverLinkedDocuments } = await import(
  "@/src/components/workspace/handover/handover-linked-documents"
);
const { HandoverOverviewClient } = await import(
  "@/src/components/workspace/handover/handover-overview-client"
);

async function render(element: ReturnType<typeof createElement>): Promise<string> {
  const stream = await renderToReadableStream(element);
  await stream.allReady;
  return (await new Response(stream).text()).replace(/<!-- -->/g, "");
}

const mockGuide: HandoverGuide = {
  id: "guide-123",
  orgId: "11111111-1111-4111-8111-111111111111",
  termId: "term-abc",
  termName: "A.Y. 2025–2026",
  roleTitle: "Vice President",
  status: "draft",
  sections: {
    what_i_do: "Manage internal committees and oversee project leads.",
    recurring_tasks: "Hold weekly sync every Tuesday.",
    key_contacts: "Advisor Dr. Smith - smith@school.edu",
    open_items: "Room reservation for General Assembly pending.",
    where_things_are: "Google Drive: /Executive 2025/",
    linked_document_ids: ["doc-1"],
  },
  linkedDocuments: [
    {
      id: "doc-1",
      title: "Organization Constitution",
      category: "Legal",
      kind: "file",
      url: null,
      fileSize: 1048576,
      mimeType: "application/pdf",
      storagePath: "org/const.pdf",
    },
  ],
  authorId: "user-me",
  finalizedBy: null,
  finalizedAt: null,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-02T00:00:00Z",
  canEdit: true,
  canReopen: false,
  canFinalize: true,
};

describe("handover UI: HandoverHeader", () => {
  it("renders role title, draft status badge, and progress", async () => {
    const html = await render(
      createElement(HandoverHeader, {
        guide: mockGuide,
        completeness: { filledCount: 5, totalCount: 5, percentage: 100 },
        saveStatus: "saved",
        isSavingManual: false,
        onSaveManual: vi.fn(),
        onOpenFinalize: vi.fn(),
        onOpenReopen: vi.fn(),
      })
    );

    expect(html).toContain("Vice President Handover Guide");
    expect(html).toContain("Draft in progress");
    expect(html).toContain("100%");
    expect(html).toContain("Mark as ready");
    expect(html).toContain("All changes saved");
  });

  it("renders ready badge and locked copy when finalized", async () => {
    const finalizedGuide: HandoverGuide = {
      ...mockGuide,
      status: "ready",
      canEdit: false,
      canFinalize: false,
      canReopen: true,
    };

    const html = await render(
      createElement(HandoverHeader, {
        guide: finalizedGuide,
        completeness: { filledCount: 5, totalCount: 5, percentage: 100 },
        saveStatus: "idle",
        isSavingManual: false,
        onSaveManual: vi.fn(),
        onOpenFinalize: vi.fn(),
        onOpenReopen: vi.fn(),
      })
    );

    expect(html).toContain("Ready for successor");
    expect(html).toContain("Reopen for editing");
  });
});

describe("handover UI: HandoverSectionCard", () => {
  it("renders section title and prompts", async () => {
    const def = HANDOVER_SECTION_DEFINITIONS[0];
    const html = await render(
      createElement(HandoverSectionCard, {
        definition: def,
        content: "Detailed overview of executive responsibilities.",
        isReadOnly: false,
        onChange: vi.fn(),
        defaultExpanded: true,
      })
    );

    expect(html).toContain("What I do");
    expect(html).toContain("Key questions to cover:");
    expect(html).toContain("Complete");
    expect(html).toContain("Detailed overview of executive responsibilities.");
  });

  it("renders locked indicator and read-only container when finalized", async () => {
    const def = HANDOVER_SECTION_DEFINITIONS[1];
    const html = await render(
      createElement(HandoverSectionCard, {
        definition: def,
        content: "Weekly meetings on Monday.",
        isReadOnly: true,
        onChange: vi.fn(),
        defaultExpanded: true,
      })
    );

    expect(html).toContain("Locked");
    expect(html).toContain("Weekly meetings on Monday.");
  });
});

describe("handover UI: HandoverLinkedDocuments", () => {
  it("renders linked document title and category badge", async () => {
    const html = await render(
      createElement(HandoverLinkedDocuments, {
        orgId: "11111111-1111-4111-8111-111111111111",
        linkedDocuments: mockGuide.linkedDocuments,
        availableDocuments: mockGuide.linkedDocuments,
        isReadOnly: false,
        onAttachDocument: vi.fn(),
        onDetachDocument: vi.fn(),
      })
    );

    expect(html).toContain("Attached Documents &amp; Shared Links");
    expect(html).toContain("Organization Constitution");
    expect(html).toContain("Legal");
  });
});

describe("handover UI: HandoverOverviewClient", () => {
  it("renders guides summary cards and role action", async () => {
    const html = await render(
      createElement(HandoverOverviewClient, {
        summary: {
          orgId: "11111111-1111-4111-8111-111111111111",
          guides: [
            {
              id: "guide-1",
              roleTitle: "Treasurer",
              status: "ready",
              termName: "A.Y. 2025–2026",
              authorName: null,
              updatedAt: "2026-01-01T00:00:00Z",
            },
          ],
          activeRoles: ["Treasurer", "Secretary"],
        },
        isAdmin: true,
      })
    );

    expect(html).toContain("Handover Guides");
    expect(html).toContain("Treasurer");
    expect(html).toContain("Ready");
    expect(html).toContain("Open role guide");
  });
});

describe("handover UI: HandoverSkeleton", () => {
  it("renders shimmer loading skeleton", async () => {
    const html = await render(createElement(HandoverSkeleton));
    expect(html).toContain("handover-shimmer");
  });
});
