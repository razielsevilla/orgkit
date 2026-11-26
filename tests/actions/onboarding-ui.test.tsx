import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToReadableStream } from "react-dom/server";

vi.mock("next/navigation", () => ({
  usePathname: () => "/workspace/11111111-1111-4111-8111-111111111111/events/x",
  useRouter: () => ({ push: vi.fn(), prefetch: vi.fn(), refresh: vi.fn() }),
}));

const { ConfirmAllPending } = await import("@/src/components/workspace/members/confirm-all-pending");
const { PendingMembersNotice } = await import("@/src/components/workspace/events/pending-members-notice");
const { EventDetail } = await import("@/src/components/workspace/events/event-detail");
const { MemberEmptyState } = await import("@/src/components/workspace/members/member-empty-state");

const ORG = "11111111-1111-4111-8111-111111111111";

async function render(element: ReturnType<typeof createElement>): Promise<string> {
  const stream = await renderToReadableStream(element);
  await stream.allReady;
  return (await new Response(stream).text()).replace(/<!-- -->/g, "");
}

const text = (markup: string) =>
  markup
    .replace(/<style[\s\S]*?<\/style>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

describe("Confirm all pending", () => {
  const props = { isConfirming: false, onConfirmAll: () => {} };

  it("stays out of the way when one student or none is waiting", async () => {
    expect(await render(createElement(ConfirmAllPending, { ...props, pendingCount: 0, confirmedCount: null }))).toBe("");
    expect(await render(createElement(ConfirmAllPending, { ...props, pendingCount: 1, confirmedCount: null }))).toBe("");
  });

  it("says how many are waiting, why it matters, and offers the bulk action with the number on it", async () => {
    const out = await render(createElement(ConfirmAllPending, { ...props, pendingCount: 12, confirmedCount: null }));
    const t = text(out);
    expect(t).toContain("12 students waiting");
    expect(t).toContain("Only confirmed members can check in");
    expect(t).toContain("Confirm all 12");
    // A first tap only asks: the real action is not on screen yet
    expect(t).not.toContain("Yes, confirm");
  });

  it("is a labelled region", async () => {
    const out = await render(createElement(ConfirmAllPending, { ...props, pendingCount: 3, confirmedCount: null }));
    expect(out).toContain('role="region"');
    expect(out).toContain('aria-label="Confirm waiting students"');
  });

  it("shows busy state and disables the button while confirming", async () => {
    const out = await render(
      createElement(ConfirmAllPending, { ...props, isConfirming: true, pendingCount: 4, confirmedCount: null })
    );
    expect(text(out)).toContain("Confirming…");
    expect(out).toMatch(/<button[^>]*disabled/);
  });

  it("afterwards says how many were confirmed, in a live region, with no button", async () => {
    const out = await render(createElement(ConfirmAllPending, { ...props, pendingCount: 0, confirmedCount: 5 }));
    expect(text(out)).toContain("5 students confirmed. They can now check in to events.");
    expect(out).toContain('aria-live="polite"');
    expect(out).not.toContain("<button");

    const one = await render(createElement(ConfirmAllPending, { ...props, pendingCount: 0, confirmedCount: 1 }));
    expect(text(one)).toContain("1 student confirmed");
  });

  it("does not claim success while students are still waiting (someone joined after)", async () => {
    const out = await render(createElement(ConfirmAllPending, { ...props, pendingCount: 3, confirmedCount: 5 }));
    expect(text(out)).toContain("3 students waiting");
    expect(text(out)).not.toContain("confirmed. They can now");
  });
});

describe("Pending members notice on event screens", () => {
  it("renders nothing when nobody is waiting", async () => {
    expect(await render(createElement(PendingMembersNotice, { orgId: ORG, count: 0 }))).toBe("");
  });

  it("tells the officer a scan won't check those students in, and links to Members", async () => {
    const out = await render(createElement(PendingMembersNotice, { orgId: ORG, count: 3 }));
    expect(text(out)).toContain("3 students who joined haven't been confirmed yet");
    expect(text(out)).toContain("won't check them in");
    expect(out).toContain(`href="/workspace/${ORG}/members"`);
  });

  it("uses the singular for one student", async () => {
    const out = await render(createElement(PendingMembersNotice, { orgId: ORG, count: 1 }));
    expect(text(out)).toContain("1 student who joined hasn't been confirmed yet");
  });

  it("shows a count only: no names or emails can appear", async () => {
    const out = await render(createElement(PendingMembersNotice, { orgId: ORG, count: 2 }));
    expect(out).not.toMatch(/@/);
  });

  it("has a text-only variant for the full-screen check-in view, with no link away from the QR code", async () => {
    const out = await render(createElement(PendingMembersNotice, { orgId: ORG, count: 2, variant: "screen" }));
    expect(text(out)).toContain("2 students who joined haven't been confirmed yet, so can't check in.");
    expect(out).not.toContain("<a ");
  });
});

describe("Event detail", () => {
  const event = {
    id: "22222222-2222-4222-8222-222222222222",
    orgId: ORG,
    title: "General meeting",
    startsAt: "2027-02-01T10:00:00Z",
    endsAt: "2027-02-01T12:00:00Z",
    location: null,
    status: "scheduled" as const,
    checkinOpen: false,
    createdAt: "2027-01-01T00:00:00Z",
  };

  it("shows the notice for a scheduled event when students are waiting", async () => {
    const out = await render(createElement(EventDetail, { rawId: ORG, event, pendingMembers: 2 }));
    expect(text(out)).toContain("2 students who joined haven't been confirmed yet");
  });

  it("shows nothing extra when nobody is waiting, or when the prop is not given", async () => {
    const none = await render(createElement(EventDetail, { rawId: ORG, event, pendingMembers: 0 }));
    const omitted = await render(createElement(EventDetail, { rawId: ORG, event }));
    expect(text(none)).not.toContain("been confirmed yet");
    expect(text(omitted)).not.toContain("been confirmed yet");
  });

  it("hides it on a cancelled event, where nobody can check in anyway", async () => {
    const out = await render(
      createElement(EventDetail, { rawId: ORG, event: { ...event, status: "cancelled" as const }, pendingMembers: 5 })
    );
    expect(text(out)).not.toContain("been confirmed yet");
  });
});

describe("Empty member roster: the join link", () => {
  it("shows the link already on for a new org, ready to copy", async () => {
    const out = await render(createElement(MemberEmptyState, { type: "no-members", joinLinkToken: "abc123token" }));
    expect(out).toContain("/join/abc123token");
    expect(text(out)).toContain("Copy Link");
    expect(text(out)).not.toContain("currently turned off");
  });

  it("does not render the Share button on the server (it needs the browser to know if it can share)", async () => {
    const out = await render(createElement(MemberEmptyState, { type: "no-members", joinLinkToken: "abc123token" }));
    expect(out).not.toContain('aria-label="Share join link"');
  });
});
