import { beforeEach, describe, expect, it, vi } from "vitest";
import { createElement, type ReactNode } from "react";
import { renderToReadableStream } from "react-dom/server";
import type { FeedbackItem } from "@/src/lib/owner/feedback-report";

/**
 * The feedback button and dialog, and the owner's inbox. There is no real
 * browser here, so the 360px behaviour is checked as markup: an icon-only button
 * with a label for screen readers, a shrinkable dialog, and single-column cards
 * that wrap long words.
 */

// The real dialog mounts in a portal after hydration; render its children inline.
vi.mock("@/src/components/ui/dialog", () => ({
  Dialog: ({ children, labelledBy }: { children: ReactNode; labelledBy?: string }) =>
    createElement("div", { role: "dialog", "aria-labelledby": labelledBy }, children),
  DialogHeader: ({ titleId, title }: { titleId: string; title: string }) =>
    createElement("h2", { id: titleId }, title),
  DialogBody: ({ children }: { children: ReactNode }) => createElement("div", null, children),
  DialogFooter: ({ children }: { children: ReactNode }) => createElement("div", null, children),
  DialogButton: ({ children, ...props }: { children: ReactNode }) =>
    createElement("button", { type: "button", ...props }, children),
}));
vi.mock("@/src/app/(workspace)/feedback-actions", () => ({ submitFeedbackAction: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => "/workspace/abc/dues" }));

const { FeedbackFormView, FeedbackSentView } = await import("@/src/components/feedback/feedback-dialog");
const { FeedbackButton } = await import("@/src/components/feedback/feedback-button");
const { FeedbackList } = await import("@/src/components/owner/feedback-list");
const { OwnerNav } = await import("@/src/components/owner/owner-nav");
const { FEEDBACK_MESSAGES, FEEDBACK_MAX } = await import("@/src/lib/feedback/feedback-validation");

async function render(element: ReturnType<typeof createElement>): Promise<string> {
  const stream = await renderToReadableStream(element);
  await stream.allReady;
  return (await new Response(stream).text()).replace(/<!-- -->/g, "");
}

const form = (over: Record<string, unknown> = {}) =>
  render(
    createElement(FeedbackFormView, {
      message: "",
      onMessageChange: () => {},
      isSending: false,
      fieldError: null,
      formError: null,
      onSubmit: () => {},
      onClose: () => {},
      ...over,
    })
  );

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("FeedbackButton", () => {
  it("is a button with a label for screen readers, even when only the icon shows", async () => {
    const html = await render(createElement(FeedbackButton));

    expect(html).toContain('aria-label="Send feedback"');
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).toContain("orgkit-feedback-btn-label");
    expect(html).toContain(">Feedback<");
  });

  it("shows the icon alone on a phone and the word from 640px, in a fixed corner clear of the dialog", async () => {
    const html = await render(createElement(FeedbackButton));

    expect(html).toMatch(/\.orgkit-feedback-btn-label\s*\{\s*display:\s*none/);
    expect(html).toMatch(/@media \(min-width: 640px\)\s*\{\s*\.orgkit-feedback-btn-label\s*\{\s*display:\s*inline/);
    expect(html).toContain("position: fixed");
    expect(html).toContain("env(safe-area-inset-bottom");
    expect(html).toMatch(/height:\s*48px/);
    expect(html).toMatch(/z-index:\s*900/);
  });

  it("starts closed", async () => {
    expect(await render(createElement(FeedbackButton))).not.toContain('role="dialog"');
  });
});

describe("FeedbackFormView", () => {
  it("is a titled dialog with a labelled message box, a counter and a plain statement of where it goes", async () => {
    const html = await form();

    expect(html).toContain('role="dialog"');
    expect(html).toContain("Tell us what&#x27;s working or what&#x27;s not");
    expect(html).toContain('for="feedback-message"');
    expect(html).toContain("Your message");
    expect(html).toContain(`0/${FEEDBACK_MAX}`);
    expect(html).toContain("Sent to the OrgKit team with the page you&#x27;re on and your name and email.");
    expect(html).toContain("Send feedback");
    expect(html).toContain("Cancel");
  });

  it("uses 16px text and a full-width, shrinkable box so a phone does not zoom or scroll sideways", async () => {
    const html = await form();

    expect(html).toMatch(/font-size:\s*16px/);
    expect(html).toMatch(/width:\s*100%/);
    expect(html).toMatch(/box-sizing:\s*border-box/);
    expect(html).toMatch(/overflow-wrap:\s*anywhere/);
  });

  it("keeps the typed message in the box", async () => {
    const html = await form({ message: "The roster page is slow" });
    expect(html).toContain("The roster page is slow");
    expect(html).toContain(`23/${FEEDBACK_MAX}`);
  });

  it("shows a message problem under the box and marks the box invalid", async () => {
    const html = await form({ fieldError: FEEDBACK_MESSAGES.empty });

    expect(html).toContain(FEEDBACK_MESSAGES.empty);
    expect(html).toContain('id="feedback-message-error"');
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('aria-describedby="feedback-message-error feedback-notice"');
  });

  it("flags a message over the limit as it is typed", async () => {
    const html = await form({ message: "a".repeat(FEEDBACK_MAX + 1) });

    expect(html).toContain(`${FEEDBACK_MAX + 1}/${FEEDBACK_MAX}`);
    expect(html).toContain('aria-invalid="true"');
  });

  it("shows a send failure in an alert and still holds the message, so nothing is lost", async () => {
    const html = await form({ message: "Keep me", formError: FEEDBACK_MESSAGES.throttled });

    expect(html).toContain('role="alert"');
    // React escapes apostrophes in the markup
    expect(html).toContain(FEEDBACK_MESSAGES.throttled.replaceAll("'", "&#x27;"));
    expect(html).toContain("Keep me");
  });

  it("locks the box and buttons while sending and says so", async () => {
    const html = await form({ message: "Hello", isSending: true });

    expect(html).toContain("Sending...");
    expect(html).not.toContain("Send feedback");
    expect(html.match(/disabled=""/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
  });
});

describe("FeedbackSentView", () => {
  it("confirms the message was sent", async () => {
    const html = await render(createElement(FeedbackSentView, { onClose: () => {} }));

    expect(html).toContain("Feedback sent");
    expect(html).toContain(FEEDBACK_MESSAGES.thanks);
    expect(html).toContain('role="status"');
    expect(html).toContain("Close");
  });
});

describe("FeedbackList", () => {
  const item = (over: Partial<FeedbackItem> = {}): FeedbackItem => ({
    id: "f-1",
    createdAt: "2026-11-21T14:05:00Z",
    message: "Line one\nLine two",
    page: "/workspace/:id/dues",
    orgName: "Computer Science Society",
    senderName: "Ana Reyes",
    senderEmail: "ana@school.edu",
    ...over,
  });

  it('says "No feedback yet" when the inbox is empty', async () => {
    const html = await render(createElement(FeedbackList, { items: [] }));
    expect(html).toContain("No feedback yet");
    expect(html).not.toContain("<li");
  });

  it("shows each message with when, who, which org and which page", async () => {
    const html = await render(createElement(FeedbackList, { items: [item()] }));

    expect(html).toContain("Line one");
    expect(html).toContain("Nov 21, 2026, 14:05 UTC");
    expect(html).toContain("Ana Reyes");
    expect(html).toContain('href="mailto:ana@school.edu"');
    expect(html).toContain("Computer Science Society");
    expect(html).toContain("<code>/workspace/:id/dues</code>");
  });

  it("keeps line breaks and wraps long words, so a 360px phone does not scroll sideways", async () => {
    const html = await render(createElement(FeedbackList, { items: [item({ message: "x".repeat(300) })] }));

    expect(html).toMatch(/white-space:\s*pre-wrap/);
    expect(html).toMatch(/overflow-wrap:\s*anywhere/);
    expect(html).toContain("minmax(min(100%, 150px), 1fr)");
  });

  it("says when a message was not sent from inside an org", async () => {
    const html = await render(createElement(FeedbackList, { items: [item({ orgName: null })] }));
    expect(html).toContain("None (not inside an org)");
  });

  it("does not turn message text into markup", async () => {
    const html = await render(
      createElement(FeedbackList, { items: [item({ message: '<img src=x onerror="alert(1)">' })] })
    );

    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });

  it("lists messages in the order it is given, newest first from the database", async () => {
    const html = await render(
      createElement(FeedbackList, {
        items: [item({ id: "new", message: "NEWER" }), item({ id: "old", message: "OLDER" })],
      })
    );
    expect(html.indexOf("NEWER")).toBeLessThan(html.indexOf("OLDER"));
  });
});

describe("OwnerNav", () => {
  it("links the two owner pages and marks the current one", async () => {
    const html = await render(createElement(OwnerNav, { current: "feedback" }));

    expect(html).toContain('href="/owner/usage"');
    expect(html).toContain('href="/owner/feedback"');
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    expect(html).toMatch(/aria-current="page"[^>]*>Feedback</);
  });
});
