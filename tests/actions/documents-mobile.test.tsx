import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToReadableStream } from "react-dom/server";
import type { WorkspaceDocument } from "@/src/app/(workspace)/documents-actions";
import { DocumentsStyles } from "@/src/components/workspace/documents/documents-styles";
import { DocumentMobileCard } from "@/src/components/workspace/documents/document-mobile-card";
import { DocumentsEmptyState } from "@/src/components/workspace/documents/documents-empty-state";

async function render(element: ReturnType<typeof createElement>): Promise<string> {
  const stream = await renderToReadableStream(element);
  await stream.allReady;
  return (await new Response(stream).text()).replace(/<!-- -->/g, "");
}

const mockDoc: WorkspaceDocument = {
  id: "mobile-doc-1",
  orgId: "org-1",
  title: "Super Extremely Long Constitution and Bylaws Document Name for Small Screens",
  category: "Legal",
  kind: "file",
  storagePath: "org-1/constitution.pdf",
  url: null,
  fileSize: 5242880, // 5 MB
  mimeType: "application/pdf",
  createdBy: "officer-1",
  createdAt: "2026-03-01T08:00:00Z",
};

describe("documents-mobile: 360px viewport responsiveness", () => {
  it("includes CSS media queries targeting mobile screens under 768px down to 360px", async () => {
    const html = await render(createElement(DocumentsStyles));

    // Desktop table hidden on mobile
    expect(html).toContain(".orgkit-documents-table-wrapper");
    expect(html).toContain("display: none !important;");

    // Mobile cards flexed on mobile
    expect(html).toContain(".orgkit-documents-mobile-cards");
    expect(html).toContain("display: flex !important;");

    // Header buttons full-width column on mobile
    expect(html).toContain(".orgkit-documents-header-actions");
    expect(html).toContain("flex-direction: column !important;");
  });

  it("renders mobile card with proper text truncation and wrap-safe layout", async () => {
    const html = await render(
      createElement(DocumentMobileCard, {
        document: mockDoc,
        onDownload: vi.fn(),
        onDelete: vi.fn(),
      })
    );

    // Title has ellipsis truncation CSS
    expect(html).toContain("text-overflow:ellipsis");
    expect(html).toContain("white-space:nowrap");
    expect(html).toContain("Super Extremely Long Constitution");

    // Category badge is rendered with contrast styling
    expect(html).toContain("Legal");

    // Formatted file size
    expect(html).toContain("5.0 MB");

    // Download and Delete buttons
    expect(html).toContain("Download");
    expect(html).toContain('aria-label="Delete Super Extremely Long Constitution');
  });

  it("renders mobile card for link document with external icon and link target", async () => {
    const linkDoc: WorkspaceDocument = {
      ...mockDoc,
      id: "mobile-link-1",
      kind: "link",
      storagePath: null,
      fileSize: null,
      url: "https://drive.google.com/folder/123",
      title: "Shared Google Drive Folder",
      category: "Templates",
    };

    const html = await render(
      createElement(DocumentMobileCard, {
        document: linkDoc,
        onDownload: vi.fn(),
        onDelete: vi.fn(),
      })
    );

    expect(html).toContain("Shared Google Drive Folder");
    expect(html).toContain("External link");
    expect(html).toContain("Open link");
    expect(html).toContain('href="https://drive.google.com/folder/123"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it("renders responsive empty state with fluid clamp sizing for small phones", async () => {
    const html = await render(
      createElement(DocumentsEmptyState, {
        onAddFile: vi.fn(),
        onAddLink: vi.fn(),
      })
    );

    // Fluid clamp padding prevents horizontal overflow on 360px
    expect(html).toContain("clamp(");
    expect(html).toContain("Add file");
    expect(html).toContain("Add link");
  });
});
