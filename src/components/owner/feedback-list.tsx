import { Inbox } from "lucide-react";
import { formatFeedbackTime, type FeedbackItem } from "@/src/lib/owner/feedback-report";

/**
 * The owner's feedback inbox: one card per message, newest first. A single
 * column that wraps long words, so it fits a 360px phone with no sideways scroll.
 */

const surface = {
  backgroundColor: "var(--color-surface)",
  border: "1px solid var(--color-line)",
  borderRadius: 24,
  boxShadow: "0 2px 10px rgba(24, 24, 27, 0.03)",
  boxSizing: "border-box",
} as const;

function FeedbackEmptyState() {
  return (
    <div
      style={{
        ...surface,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        padding: "clamp(40px, 6vw, 64px) clamp(20px, 4vw, 40px)",
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 16,
          backgroundColor: "color-mix(in srgb, var(--color-accent) 10%, transparent)",
          color: "var(--color-accent)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 16,
        }}
      >
        <Inbox size={28} strokeWidth={1.75} aria-hidden="true" />
      </div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--color-ink)", margin: "0 0 8px" }}>
        No feedback yet
      </h2>
      <p style={{ fontSize: 14, color: "var(--color-muted)", maxWidth: 380, margin: 0, lineHeight: 1.5 }}>
        Messages officers send with the Feedback button appear here, newest first.
      </p>
    </div>
  );
}

export function FeedbackList({ items }: { items: FeedbackItem[] }) {
  if (items.length === 0) return <FeedbackEmptyState />;

  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
      {items.map((item) => (
        <li key={item.id} style={{ ...surface, padding: "16px 18px", minWidth: 0 }}>
          {/* pre-wrap keeps the sender's line breaks; anywhere-wrapping stops a long word widening the page */}
          <p
            style={{
              margin: "0 0 12px",
              fontSize: 15,
              lineHeight: 1.55,
              color: "var(--color-ink)",
              whiteSpace: "pre-wrap",
              overflowWrap: "anywhere",
            }}
          >
            {item.message}
          </p>
          <dl
            style={{
              margin: 0,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 150px), 1fr))",
              gap: "8px 16px",
              fontSize: 12.5,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <dt style={{ color: "var(--color-muted)", fontWeight: 600 }}>Sent</dt>
              <dd style={{ margin: 0, color: "var(--color-ink-soft)", overflowWrap: "anywhere" }}>
                <time dateTime={item.createdAt}>{formatFeedbackTime(item.createdAt)}</time>
              </dd>
            </div>
            <div style={{ minWidth: 0 }}>
              <dt style={{ color: "var(--color-muted)", fontWeight: 600 }}>From</dt>
              <dd style={{ margin: 0, color: "var(--color-ink-soft)", overflowWrap: "anywhere" }}>
                {item.senderName}
                {item.senderEmail && (
                  <>
                    <br />
                    <a href={`mailto:${item.senderEmail}`} style={{ color: "var(--color-accent)" }}>
                      {item.senderEmail}
                    </a>
                  </>
                )}
              </dd>
            </div>
            <div style={{ minWidth: 0 }}>
              <dt style={{ color: "var(--color-muted)", fontWeight: 600 }}>Org</dt>
              <dd style={{ margin: 0, color: "var(--color-ink-soft)", overflowWrap: "anywhere" }}>
                {item.orgName ?? "None (not inside an org)"}
              </dd>
            </div>
            <div style={{ minWidth: 0 }}>
              <dt style={{ color: "var(--color-muted)", fontWeight: 600 }}>Page</dt>
              <dd style={{ margin: 0, color: "var(--color-ink-soft)", overflowWrap: "anywhere" }}>
                <code>{item.page}</code>
              </dd>
            </div>
          </dl>
        </li>
      ))}
    </ul>
  );
}
