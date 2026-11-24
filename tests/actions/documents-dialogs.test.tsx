import { describe, expect, it, vi } from "vitest";
import { createElement, type ReactNode } from "react";
import { renderToReadableStream } from "react-dom/server";

vi.mock("@/src/components/ui/dialog", () => ({
  Dialog: ({ children }: { children: ReactNode }) => createElement("div", { role: "dialog" }, children),
  DialogHeader: ({ title, description }: { title: string; description?: string }) =>
    createElement(
      "header",
      null,
      createElement("h2", null, title),
      description && createElement("p", null, description)
    ),
  DialogBody: ({ children }: { children: ReactNode }) => createElement("div", { "data-dialog-body": "true" }, children),
  DialogFooter: ({ children }: { children: ReactNode }) => createElement("footer", null, children),
}));

vi.mock("@/src/app/(workspace)/documents-actions", () => ({
  uploadDocumentFileAction: vi.fn(),
  addDocumentLinkAction: vi.fn(),
}));

const { AddFileDialog } = await import("@/src/components/workspace/documents/add-file-dialog");
const { AddLinkDialog } = await import("@/src/components/workspace/documents/add-link-dialog");

async function render(element: ReturnType<typeof createElement>): Promise<string> {
  const stream = await renderToReadableStream(element);
  await stream.allReady;
  return (await new Response(stream).text()).replace(/<!-- -->/g, "");
}

describe("documents-dialogs: AddFileDialog", () => {
  it("renders upload modal with upward category select and file input", async () => {
    const html = await render(
      createElement(AddFileDialog, {
        orgId: "org-123",
        isOpen: true,
        onClose: vi.fn(),
        onSuccess: vi.fn(),
      })
    );

    expect(html).toContain("Upload Document");
    expect(html).toContain("Keep constitutions, permits, and forms organized");
    expect(html).toContain('id="document-file-input"');
    expect(html).toContain('id="document-file-title"');
    expect(html).toContain('id="document-file-category"');
    expect(html).toContain("General");
    expect(html).toContain("Upload file");
  });

  it("does not render when isOpen is false", async () => {
    const html = await render(
      createElement(AddFileDialog, {
        orgId: "org-123",
        isOpen: false,
        onClose: vi.fn(),
        onSuccess: vi.fn(),
      })
    );

    expect(html).toBe("");
  });
});

describe("documents-dialogs: AddLinkDialog", () => {
  it("renders link modal with upward category select and url input", async () => {
    const html = await render(
      createElement(AddLinkDialog, {
        orgId: "org-123",
        isOpen: true,
        onClose: vi.fn(),
        onSuccess: vi.fn(),
      })
    );

    expect(html).toContain("Add External Link");
    expect(html).toContain("Keep shared drives, folders, and resources accessible");
    expect(html).toContain('id="document-link-title"');
    expect(html).toContain('id="document-link-url"');
    expect(html).toContain('id="document-link-category"');
    expect(html).toContain("Templates");
    expect(html).toContain("Add link");
  });

  it("does not render when isOpen is false", async () => {
    const html = await render(
      createElement(AddLinkDialog, {
        orgId: "org-123",
        isOpen: false,
        onClose: vi.fn(),
        onSuccess: vi.fn(),
      })
    );

    expect(html).toBe("");
  });
});
