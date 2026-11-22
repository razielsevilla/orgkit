import { describe, expect, it, vi } from "vitest";
import { createElement, type ReactNode } from "react";
import { renderToReadableStream } from "react-dom/server";
import type { WorkspaceTermsData } from "@/src/app/(workspace)/terms-actions";

vi.mock("@/src/components/ui/dialog", () => ({
  Dialog: ({ children }: { children: ReactNode }) => createElement("div", { role: "dialog" }, children),
  DialogHeader: ({ title, subtitle }: { title: string; subtitle?: string }) =>
    createElement("div", null, createElement("h2", null, title), subtitle && createElement("p", null, subtitle)),
  DialogBody: ({ children }: { children: ReactNode }) => createElement("div", null, children),
  DialogFooter: ({ children }: { children: ReactNode }) => createElement("div", null, children),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/workspace/11111111-1111-4111-8111-111111111111/terms",
  useRouter: () => ({ push: vi.fn(), prefetch: vi.fn(), refresh: vi.fn() }),
}));

const { TermsSkeleton } = await import("@/src/components/workspace/terms/terms-skeleton");
const { TermsEmptyState } = await import("@/src/components/workspace/terms/terms-empty-state");
const { TermsHeader } = await import("@/src/components/workspace/terms/terms-header");
const { TermGroupCard } = await import("@/src/components/workspace/terms/term-group-card");
const { TermsClient } = await import("@/src/components/workspace/terms/terms-client");

async function render(element: ReturnType<typeof createElement>): Promise<string> {
  const stream = await renderToReadableStream(element);
  await stream.allReady;
  return (await new Response(stream).text()).replace(/<!-- -->/g, "");
}

const mockTermsData: WorkspaceTermsData = {
  orgId: "11111111-1111-4111-8111-111111111111",
  orgName: "Science Club",
  isAdmin: true,
  currentTermCount: 2,
  pastTermCount: 1,
  members: [
    { id: "mem-1", fullName: "Juan Dela Cruz", email: "juan@school.edu" },
    { id: "mem-2", fullName: "Maria Santos", email: "maria@school.edu" },
  ],
  terms: [
    {
      id: "term-1",
      orgId: "11111111-1111-4111-8111-111111111111",
      memberId: "mem-1",
      holderName: "Juan Dela Cruz",
      roleTitle: "President",
      termName: "A.Y. 2025-2026",
      startDate: "2025-06-01",
      endDate: "2026-05-31",
      isEnded: false,
      createdAt: "2025-06-01T00:00:00Z",
    },
    {
      id: "term-2",
      orgId: "11111111-1111-4111-8111-111111111111",
      memberId: "mem-2",
      holderName: "Maria Santos",
      roleTitle: "Vice President",
      termName: "A.Y. 2025-2026",
      startDate: "2025-06-01",
      endDate: "2026-05-31",
      isEnded: false,
      createdAt: "2025-06-01T00:00:00Z",
    },
    {
      id: "term-3",
      orgId: "11111111-1111-4111-8111-111111111111",
      memberId: null,
      holderName: "Carlos Reyes",
      roleTitle: "President",
      termName: "A.Y. 2024-2025",
      startDate: "2024-06-01",
      endDate: "2025-05-31",
      isEnded: true,
      createdAt: "2024-06-01T00:00:00Z",
    },
  ],
};

describe("H1 UI: TermsSkeleton", () => {
  it("renders loading skeleton with aria-busy", async () => {
    const html = await render(createElement(TermsSkeleton));
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('aria-label="Loading officer terms"');
  });
});

describe("H1 UI: TermsEmptyState", () => {
  it("shows prompt button to record term when user is an admin", async () => {
    const html = await render(createElement(TermsEmptyState, { isAdmin: true }));
    expect(html).toContain("No officer terms recorded yet");
    expect(html).toContain("Record Current Term");
  });

  it("hides action button and shows read-only notice for non-admin", async () => {
    const html = await render(createElement(TermsEmptyState, { isAdmin: false }));
    expect(html).toContain("No officer terms recorded yet");
    expect(html).not.toContain("Record Current Term");
    expect(html).toContain("Only admins can record or edit officer terms");
  });
});

describe("H1 UI: TermsHeader", () => {
  it("renders header labels, badges, and admin button", async () => {
    const html = await render(
      createElement(TermsHeader, {
        totalTerms: 3,
        currentCount: 2,
        pastCount: 1,
        activeFilter: "all",
        onFilterChange: vi.fn(),
        isAdmin: true,
        onAddTerm: vi.fn(),
      })
    );
    expect(html).toContain("Terms");
    expect(html).toContain("3 roles");
    expect(html).toContain("Record Term");
  });

  it("hides Record Term button from non-admin officers", async () => {
    const html = await render(
      createElement(TermsHeader, {
        totalTerms: 3,
        currentCount: 2,
        pastCount: 1,
        activeFilter: "all",
        onFilterChange: vi.fn(),
        isAdmin: false,
        onAddTerm: vi.fn(),
      })
    );
    expect(html).toContain("Terms");
    expect(html).not.toContain("Record Term");
  });
});

describe("H1 UI: TermGroupCard", () => {
  const currentGroup = {
    termName: "A.Y. 2025-2026",
    startDate: "2025-06-01",
    endDate: "2026-05-31",
    isEnded: false,
    terms: [mockTermsData.terms[0], mockTermsData.terms[1]],
  };

  const pastGroup = {
    termName: "A.Y. 2024-2025",
    startDate: "2024-06-01",
    endDate: "2025-05-31",
    isEnded: true,
    terms: [mockTermsData.terms[2]],
  };

  it("contains required labels: Term, Role, Holder, Starts, Ends", async () => {
    const html = await render(
      createElement(TermGroupCard, {
        group: currentGroup,
        isAdmin: true,
      })
    );
    expect(html).toContain("Term");
    expect(html).toContain("Role");
    expect(html).toContain("Holder");
    expect(html).toContain("Starts");
    expect(html).toContain("Ends");
    expect(html).toContain("President");
    expect(html).toContain("Vice President");
    expect(html).toContain("Juan Dela Cruz");
    expect(html).toContain("Maria Santos");
    expect(html).toContain("Active Term");
  });

  it("displays past terms with Ended badge", async () => {
    const html = await render(
      createElement(TermGroupCard, {
        group: pastGroup,
        isAdmin: false,
      })
    );
    expect(html).toContain("Ended");
    expect(html).toContain("Carlos Reyes");
    expect(html).not.toContain('aria-label="Edit President"');
  });

  it("provides edit and delete action buttons to admins", async () => {
    const html = await render(
      createElement(TermGroupCard, {
        group: currentGroup,
        isAdmin: true,
      })
    );
    expect(html).toContain('aria-label="Edit President"');
    expect(html).toContain('aria-label="Delete President"');
  });

  it("hides edit and delete action buttons from non-admins (read-only)", async () => {
    const html = await render(
      createElement(TermGroupCard, {
        group: currentGroup,
        isAdmin: false,
      })
    );
    expect(html).not.toContain('aria-label="Edit President"');
    expect(html).not.toContain('aria-label="Delete President"');
  });
});

describe("H1 UI: TermsClient", () => {
  it("renders grouped terms newest first for admin", async () => {
    const html = await render(createElement(TermsClient, { initialData: mockTermsData }));
    expect(html).toContain("Science Club");
    expect(html).toContain("A.Y. 2025-2026");
    expect(html).toContain("A.Y. 2024-2025");
    expect(html).toContain("Record Term");

    // Check newest first ordering: 2025-2026 appears before 2024-2025
    const pos2025 = html.indexOf("A.Y. 2025-2026");
    const pos2024 = html.indexOf("A.Y. 2024-2025");
    expect(pos2025).toBeLessThan(pos2024);
  });

  it("renders read-only view for regular officers", async () => {
    const nonAdminData = { ...mockTermsData, isAdmin: false };
    const html = await render(createElement(TermsClient, { initialData: nonAdminData }));
    expect(html).toContain("Science Club");
    expect(html).not.toContain("Record Term");
    expect(html).not.toContain('aria-label="Edit President"');
  });

  it("renders empty state when there are no terms", async () => {
    const emptyData = { ...mockTermsData, terms: [], currentTermCount: 0, pastTermCount: 0 };
    const html = await render(createElement(TermsClient, { initialData: emptyData }));
    expect(html).toContain("No officer terms recorded yet");
    expect(html).toContain("Record Current Term");
  });
});
