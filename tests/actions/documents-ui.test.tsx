import { describe, expect, it, vi } from "vitest";
import { createElement, type ReactNode } from "react";
import { renderToReadableStream } from "react-dom/server";
import type { WorkspaceDocumentsData, WorkspaceDocument } from "@/src/app/(workspace)/documents-actions";

vi.mock("@/src/components/ui/dialog", () => ({
  Dialog: ({ children }: { children: ReactNode }) => createElement("div", { role: "dialog" }, children),
  DialogHeader: ({ title, subtitle }: { title: string; subtitle?: string }) =>
    createElement(
      "div",
      null,
      createElement("h2", null, title),
      subtitle && createElement("p", null, subtitle)
    ),
  DialogBody: ({ children }: { children: ReactNode }) => createElement("div", null, children),
  DialogFooter: ({ children }: { children: ReactNode }) => createElement("div", null, children),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/workspace/11111111-1111-4111-8111-111111111111/documents",
  useRouter: () => ({ push: vi.fn(), prefetch: vi.fn(), refresh: vi.fn() }),
}));

const { DocumentsSkeleton } = await import("@/src/components/workspace/documents/documents-skeleton");
const { DocumentsEmptyState } = await import("@/src/components/workspace/documents/documents-empty-state");
const { DocumentsHeader } = await import("@/src/components/workspace/documents/documents-header");
const { DocumentTable } = await import("@/src/components/workspace/documents/document-table");
const { DocumentMobileCard } = await import("@/src/components/workspace/documents/document-mobile-card");
const { DocumentsClient } = await import("@/src/components/workspace/documents/documents-client");

async function render(element: ReturnType<typeof createElement>): Promise<string> {
  const stream = await renderToReadableStream(element);
  await stream.allReady;
  return (await new Response(stream).text()).replace(/<!-- -->/g, "");
}

const mockDocuments: WorkspaceDocument[] = [
  {
    id: "doc-1",
    orgId: "11111111-1111-4111-8111-111111111111",
    title: "Organization Constitution 2026",
    category: "Legal",
    kind: "file",
    storagePath: "11111111-1111-4111-8111-111111111111/constitution.pdf",
    url: null,
    fileSize: 1048576, // 1MB
    mimeType: "application/pdf",
    createdBy: "user-1",
    createdAt: "2026-02-01T10:00:00Z",
  },
  {
    id: "doc-2",
    orgId: "11111111-1111-4111-8111-111111111111",
    title: "Official Google Drive Assets",
    category: "Templates",
    kind: "link",
    storagePath: null,
    url: "https://drive.google.com/drive/folders/org-assets-123",
    fileSize: null,
    mimeType: null,
    createdBy: "user-1",
    createdAt: "2026-02-05T12:00:00Z",
  },
];

const mockInitialData: WorkspaceDocumentsData = {
  orgId: "11111111-1111-4111-8111-111111111111",
  orgName: "Robotics Club",
  isAdmin: true,
  documents: mockDocuments,
  categories: ["Finance", "Legal", "Templates", "Contacts", "General"],
};

describe("documents-ui: DocumentsSkeleton", () => {
  it("renders accessible loading skeleton with aria attributes", async () => {
    const html = await render(createElement(DocumentsSkeleton));
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('aria-label="Loading documents"');
    expect(html).toContain("doc-shimmer");
  });
});

describe("documents-ui: DocumentsEmptyState", () => {
  it("renders educational copy explaining what belongs in documents", async () => {
    const html = await render(
      createElement(DocumentsEmptyState, {
        onAddFile: vi.fn(),
        onAddLink: vi.fn(),
      })
    );

    expect(html).toContain("Keep key documents and links in one place");
    expect(html).toContain("constitutions, bank forms, permits, templates");
    expect(html).toContain("Add file");
    expect(html).toContain("Add link");
    expect(html).toContain("Finance");
    expect(html).toContain("Legal");
  });

  it("renders filtered empty state when searches return no results", async () => {
    const html = await render(
      createElement(DocumentsEmptyState, {
        isFiltered: true,
        onAddFile: vi.fn(),
        onAddLink: vi.fn(),
        onClearFilter: vi.fn(),
      })
    );

    expect(html).toContain("No matching documents found");
    expect(html).toContain("Clear filters");
  });
});

describe("documents-ui: DocumentsHeader", () => {
  it("renders page title, org name context, and counts", async () => {
    const html = await render(
      createElement(DocumentsHeader, {
        orgName: "Robotics Club",
        totalDocuments: 2,
        onAddFile: vi.fn(),
        onAddLink: vi.fn(),
      })
    );

    expect(html).toContain("Documents");
    expect(html).toContain("Robotics Club");
    expect(html).toContain("2 items");
    expect(html).toContain("Add file");
    expect(html).toContain("Add link");
  });
});

describe("documents-ui: DocumentTable", () => {
  it("renders documents with categories, kind, size, and actions", async () => {
    const html = await render(
      createElement(DocumentTable, {
        documents: mockDocuments,
        onDownload: vi.fn(),
        onDelete: vi.fn(),
      })
    );

    expect(html).toContain("Organization Constitution 2026");
    expect(html).toContain("Official Google Drive Assets");
    expect(html).toContain("Legal");
    expect(html).toContain("Templates");
    expect(html).toContain("1.0 MB");
    expect(html).toContain("drive.google.com");
    expect(html).toContain("Download");
    expect(html).toContain("Open");
  });
});

describe("documents-ui: DocumentMobileCard", () => {
  it("renders mobile-friendly document card with responsive actions", async () => {
    const html = await render(
      createElement(DocumentMobileCard, {
        document: mockDocuments[0],
        onDownload: vi.fn(),
        onDelete: vi.fn(),
      })
    );

    expect(html).toContain("Organization Constitution 2026");
    expect(html).toContain("Legal");
    expect(html).toContain("1.0 MB");
    expect(html).toContain("Download");
    expect(html).toContain('aria-label="Delete Organization Constitution 2026"');
  });
});

describe("documents-ui: DocumentsClient", () => {
  it("renders complete documents page with search, filters, and records", async () => {
    const html = await render(
      createElement(DocumentsClient, {
        initialData: mockInitialData,
      })
    );

    expect(html).toContain("Documents");
    expect(html).toContain("Search documents or links...");
    expect(html).toContain("All");
    expect(html).toContain("Files");
    expect(html).toContain("Links");
    expect(html).toContain("Organization Constitution 2026");
    expect(html).toContain("Official Google Drive Assets");
  });

  it("renders empty state when initial documents list is empty", async () => {
    const html = await render(
      createElement(DocumentsClient, {
        initialData: {
          ...mockInitialData,
          documents: [],
        },
      })
    );

    expect(html).toContain("Keep key documents and links in one place");
    expect(html).not.toContain("Organization Constitution 2026");
  });
});
