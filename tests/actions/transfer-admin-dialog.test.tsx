import { describe, expect, it, vi } from "vitest";
import { createElement, type ReactNode } from "react";
import { renderToReadableStream } from "react-dom/server";
import type { ActiveOfficer } from "@/src/app/(workspace)/officers-actions";

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
  DialogButton: ({ children, disabled, variant, ...props }: { children: ReactNode; disabled?: boolean; variant?: string }) =>
    createElement("button", { ...props, disabled, "data-variant": variant }, children),
}));

vi.mock("@/src/app/(workspace)/officers-actions", () => ({
  transferAdminRightsAction: vi.fn(),
}));

const { TransferAdminDialog } = await import("@/src/components/workspace/officers/transfer-admin-dialog");

async function render(element: ReturnType<typeof createElement>): Promise<string> {
  const stream = await renderToReadableStream(element);
  await stream.allReady;
  return (await new Response(stream).text()).replace(/<!-- -->/g, "");
}

const mockOfficers: ActiveOfficer[] = [
  {
    id: "admin-1",
    fullName: "Alice Admin",
    role: "admin",
    isCurrentUser: true,
    joinedAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "officer-2",
    fullName: "Bob Officer",
    role: "officer",
    isCurrentUser: false,
    joinedAt: "2026-01-10T00:00:00Z",
  },
  {
    id: "finance-3",
    fullName: "Charlie Finance",
    role: "finance",
    isCurrentUser: false,
    joinedAt: "2026-01-15T00:00:00Z",
  },
];

describe("TransferAdminDialog", () => {
  it("renders transfer dialog with eligible officers and confirmation prompts", async () => {
    const html = await render(
      createElement(TransferAdminDialog, {
        orgId: "org-1",
        orgName: "Robotics Club",
        officers: mockOfficers,
        isOpen: true,
        onClose: vi.fn(),
        onSuccess: vi.fn(),
      })
    );

    expect(html).toContain("Transfer admin rights");
    expect(html).toContain("Pass primary administrative control for Robotics Club");
    expect(html).toContain("You will lose admin rights");
    expect(html).toContain('id="transfer-target-officer"');
    expect(html).toContain('id="transfer-caller-new-role"');
    expect(html).toContain('id="transfer-confirm-org-name"');
    expect(html).toContain("Bob Officer (officer)");
    expect(html).toContain("Transfer admin rights");
  });

  it("renders empty state notice when caller is the only active officer", async () => {
    const singleOfficerList: ActiveOfficer[] = [
      {
        id: "admin-1",
        fullName: "Alice Admin",
        role: "admin",
        isCurrentUser: true,
        joinedAt: "2026-01-01T00:00:00Z",
      },
    ];

    const html = await render(
      createElement(TransferAdminDialog, {
        orgId: "org-1",
        orgName: "Solo Club",
        officers: singleOfficerList,
        isOpen: true,
        onClose: vi.fn(),
        onSuccess: vi.fn(),
      })
    );

    expect(html).toContain("No eligible officers available");
    expect(html).toContain("You are currently the only active officer");
  });

  it("does not render when isOpen is false", async () => {
    const html = await render(
      createElement(TransferAdminDialog, {
        orgId: "org-1",
        orgName: "Robotics Club",
        officers: mockOfficers,
        isOpen: false,
        onClose: vi.fn(),
        onSuccess: vi.fn(),
      })
    );

    expect(html).toBe("");
  });
});
