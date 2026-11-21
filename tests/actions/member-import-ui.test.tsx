import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToReadableStream } from "react-dom/server";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: vi.fn(), prefetch: vi.fn(), refresh: vi.fn() }),
}));
// The components import Server Actions; the server-only parts are not needed to render
vi.mock("@/src/app/(workspace)/member-invites-actions", () => ({
  parseRosterCsv: vi.fn(),
  previewMemberInvites: vi.fn(),
  importMemberInvites: vi.fn(),
  getMemberInvites: vi.fn(),
}));
vi.mock("@/src/app/(workspace)/members-actions", () => ({
  getWorkspaceMembers: vi.fn(),
  confirmMemberAction: vi.fn(),
}));

const { MembersClient } = await import("@/src/components/workspace/members/members-client");
const { ImportReviewStep } = await import("@/src/components/workspace/members/import/import-review-step");
const { ImportDoneStep } = await import("@/src/components/workspace/members/import/import-done-step");
const { ImportMatchStep } = await import("@/src/components/workspace/members/import/import-match-step");
const { ImportUploadStep } = await import("@/src/components/workspace/members/import/import-upload-step");
const { ImportStepsIndicator } = await import("@/src/components/workspace/members/import/import-steps-indicator");
const { InvitedView } = await import("@/src/components/workspace/members/invited-view");
const { readRoster } = await import("@/src/lib/members/csv-import");

const ORG = "11111111-1111-4111-8111-111111111111";

async function html(element: ReturnType<typeof createElement>) {
  const stream = await renderToReadableStream(element);
  await stream.allReady;
  // React marks text boundaries with comments; drop them so text reads as a user sees it
  return (await new Response(stream).text()).replace(/<!-- -->/g, "");
}

const membersData = (canImport: boolean) => ({
  members: [],
  totalCount: 0,
  matchingCount: 0,
  hasMore: false,
  pendingCount: 0,
  joinLinkToken: null,
  canImport,
});

describe("Members page: who sees Import", () => {
  it("shows the Import button and the Invited switch to an admin", async () => {
    const out = await html(createElement(MembersClient, { rawId: ORG, initialData: membersData(true) }));
    expect(out).toContain("Import");
    expect(out).toContain("Invited");
  });

  it("shows neither to an officer who is not an admin", async () => {
    const out = await html(createElement(MembersClient, { rawId: ORG, initialData: membersData(false) }));
    expect(out).not.toMatch(/>Import</);
    expect(out).not.toContain("Members or invited people");
  });
});

describe("import steps", () => {
  it("lists Upload, Match columns, Review and Done and marks the current one as text", async () => {
    const out = await html(createElement(ImportStepsIndicator, { current: "match" }));
    for (const label of ["Upload", "Match columns", "Review", "Done"]) expect(out).toContain(label);
    expect(out).toContain('aria-current="step"');
    expect(out).toContain("(current step)");
    expect(out).toContain("(completed)");
  });

  it("explains on the upload step that nobody becomes a member, with the limits", async () => {
    const out = await html(
      createElement(ImportUploadStep, { isReading: false, error: null, onFile: vi.fn(), onCancel: vi.fn() })
    );
    expect(out).toContain("Choose CSV file");
    expect(out).toContain("1,000 rows and 1 MB");
    expect(out).toMatch(/becomes a member only after they open your join link/);
  });

  it("shows a progress state while the file is being read", async () => {
    const out = await html(
      createElement(ImportUploadStep, { isReading: true, error: null, onFile: vi.fn(), onCancel: vi.fn() })
    );
    expect(out).toContain("Reading your file");
    expect(out).toContain('role="status"');
  });

  it("shows an upload error in an alert", async () => {
    const out = await html(
      createElement(ImportUploadStep, {
        isReading: false,
        error: "We couldn't find any email addresses in that file.",
        onFile: vi.fn(),
        onCancel: vi.fn(),
      })
    );
    expect(out).toContain('role="alert"');
    expect(out).toContain("We couldn&#x27;t find any email addresses in that file.");
  });

  it("lets the admin choose the email and name columns, with labelled fields", async () => {
    const res = readRoster(new TextEncoder().encode("Full Name,Email\nAna Cruz,ana@x.edu\n"));
    if (!res.ok) throw new Error("roster");
    const out = await html(
      createElement(ImportMatchStep, {
        fileName: "roster.csv",
        roster: res.roster,
        hasHeader: true,
        emailColumn: 1,
        nameColumn: 0,
        isBusy: false,
        error: null,
        onHasHeaderChange: vi.fn(),
        onEmailColumnChange: vi.fn(),
        onNameColumnChange: vi.fn(),
        onBack: vi.fn(),
        onContinue: vi.fn(),
      })
    );
    expect(out).toContain("Email column (required)");
    expect(out).toContain("Name column (optional)");
    expect(out).toContain("The first row is column headings");
    expect(out).toContain("Full Name");
    expect(out).toContain("roster.csv");
    expect(out).toContain("ana@x.edu");
  });

  it("blocks Continue until an email column is chosen", async () => {
    const res = readRoster(new TextEncoder().encode("Full Name,Email\nAna Cruz,ana@x.edu\n"));
    if (!res.ok) throw new Error("roster");
    const out = await html(
      createElement(ImportMatchStep, {
        fileName: "roster.csv",
        roster: res.roster,
        hasHeader: true,
        emailColumn: null,
        nameColumn: null,
        isBusy: false,
        error: null,
        onHasHeaderChange: vi.fn(),
        onEmailColumnChange: vi.fn(),
        onNameColumnChange: vi.fn(),
        onBack: vi.fn(),
        onContinue: vi.fn(),
      })
    );
    expect(out).toMatch(/<button[^>]*disabled[^>]*>Continue/);
  });

  const preview = {
    invited: 42,
    duplicates: 5,
    invalid: 2,
    invalidRows: [
      { row: 7, email: "nope", reason: "invalid_email" },
      { row: 9, email: "", reason: "missing_email" },
    ],
  };

  it("states the preview counts as text, the 60 days, and that nobody is a member yet", async () => {
    const out = await html(
      createElement(ImportReviewStep, {
        preview,
        isImporting: false,
        error: null,
        onBack: vi.fn(),
        onCancel: vi.fn(),
        onImport: vi.fn(),
      })
    );
    expect(out).toContain("42 people will be invited");
    expect(out).toContain("5 rows skipped as duplicates");
    expect(out).toContain("2 rows skipped as invalid");
    expect(out).toContain("These people will be invited. They are not members until they agree through your join link.");
    expect(out).toContain("Invitations last 60 days");
    expect(out).toContain("No emails are sent");
    // skipped rows are listed with their reason
    expect(out).toContain("Row 7");
    expect(out).toContain("Not a valid email address");
    expect(out).toContain("No email address");
    expect(out).toContain("Import 42 people");
    expect(out).toContain("Cancel");
  });

  it("disables Import while it runs and when there is no one to invite", async () => {
    const importing = await html(
      createElement(ImportReviewStep, {
        preview,
        isImporting: true,
        error: null,
        onBack: vi.fn(),
        onCancel: vi.fn(),
        onImport: vi.fn(),
      })
    );
    expect(importing).toMatch(/<button[^>]*disabled[^>]*aria-busy="true"|<button[^>]*aria-busy="true"[^>]*disabled/);
    expect(importing).toContain("Importing");

    const none = await html(
      createElement(ImportReviewStep, {
        preview: { ...preview, invited: 0 },
        isImporting: false,
        error: null,
        onBack: vi.fn(),
        onCancel: vi.fn(),
        onImport: vi.fn(),
      })
    );
    expect(none).toContain("nothing to import");
  });

  const done = (joinLinkStatus: "on" | "off" | "unknown") => ({
    invited: 42,
    duplicates: 5,
    invalid: 2,
    invalidRows: [],
    joinLinkStatus,
    joinLinkToken: joinLinkStatus === "on" ? "a".repeat(64) : null,
  });

  it("summarises the result and says nobody has been contacted", async () => {
    const out = await html(createElement(ImportDoneStep, { orgId: ORG, result: done("on"), onDone: vi.fn() }));
    expect(out).toContain("42 invited, 5 already here, 2 skipped");
    expect(out).toContain("No emails were sent");
    expect(out).toContain("have not been contacted");
    expect(out).toContain("Share the join link");
  });

  it("offers the join link to copy when it is on", async () => {
    const out = await html(createElement(ImportDoneStep, { orgId: ORG, result: done("on"), onDone: vi.fn() }));
    expect(out).toContain(`/join/${"a".repeat(64)}`);
    expect(out).toContain("Copy link");
  });

  it("warns that invitees cannot join when the link is off", async () => {
    const out = await html(createElement(ImportDoneStep, { orgId: ORG, result: done("off"), onDone: vi.fn() }));
    expect(out).toContain("invitees cannot join until the link is turned on");
    expect(out).toContain(`/workspace/${ORG}/members/join`);
    expect(out).not.toContain("Copy link");
  });
});

describe("Invited view", () => {
  const noop = vi.fn();
  const render = (props: Partial<Parameters<typeof InvitedView>[0]>) =>
    html(
      createElement(InvitedView, {
        data: null,
        isLoading: false,
        isLoadingMore: false,
        error: null,
        onRetry: noop,
        onLoadMore: noop,
        onImport: noop,
        ...props,
      })
    );

  it("shows the empty state", async () => {
    const out = await render({ data: { invites: [], totalCount: 0, pendingCount: 0, hasMore: false } });
    expect(out).toContain("No one is invited. Import a list to get started.");
  });

  it("shows each person's email, name if given, status and when they were invited", async () => {
    const out = await render({
      data: {
        totalCount: 2,
        pendingCount: 1,
        hasMore: false,
        invites: [
          {
            id: "1",
            email: "ana@x.edu",
            name: "Ana Cruz",
            createdAt: "2026-11-01T00:00:00Z",
            expiresAt: "2027-12-31T00:00:00Z",
            joinedAt: null,
          },
          {
            id: "2",
            email: "ben@x.edu",
            name: null,
            createdAt: "2026-11-02T00:00:00Z",
            expiresAt: "2027-12-31T00:00:00Z",
            joinedAt: "2026-11-05T00:00:00Z",
          },
        ],
      },
    });
    expect(out).toContain("ana@x.edu");
    expect(out).toContain("Ana Cruz");
    expect(out).toContain("ben@x.edu");
    expect(out).toContain("Invited");
    expect(out).toContain("Joined");
    expect(out).toContain("Nov 1, 2026");
    expect(out).toContain("1 waiting to join");
    expect(out).toContain("not members until they agree");
  });

  it("shows a retry for a failed load", async () => {
    const out = await render({ error: "We couldn't load the invitations. Try again." });
    expect(out).toContain('role="alert"');
    expect(out).toContain("Try again");
  });
});
