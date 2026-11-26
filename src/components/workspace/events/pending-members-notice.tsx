import Link from "next/link";
import { UserCheck } from "lucide-react";
import { membersPath } from "@/src/lib/routes";

/**
 * Tells an officer that some students joined but aren't confirmed, so a scan from
 * them won't check them in. The member sees the same neutral message as a stranger
 * (so a check-in never reveals who is on the roster); this is the officer's side of
 * that. It carries a count only, never names.
 *
 * `inline` links to the Members page. `screen` is for the full-screen check-in view,
 * where a link would pull the officer away from the QR code, so it is text only.
 */
export function PendingMembersNotice({
  orgId,
  count,
  variant = "inline",
}: {
  orgId: string;
  count: number;
  variant?: "inline" | "screen";
}) {
  if (!(count > 0)) return null;

  const students = `${count} ${count === 1 ? "student" : "students"}`;
  const verb = count === 1 ? "hasn't" : "haven't";

  if (variant === "screen") {
    return (
      <p
        role="status"
        style={{ margin: 0, maxWidth: 420, fontSize: 13.5, lineHeight: 1.5, color: "var(--color-muted-strong)" }}
      >
        {students} who joined {verb} been confirmed yet, so can&apos;t check in. Confirm them on the Members page.
      </p>
    );
  }

  return (
    <div
      role="status"
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        margin: "16px 0 0",
        padding: "12px 14px",
        borderRadius: 14,
        backgroundColor: "var(--color-warning-soft)",
        border: "1px solid var(--color-warning-line)",
        color: "var(--color-ink)",
        fontSize: 14,
        lineHeight: 1.5,
      }}
    >
      <UserCheck size={18} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
      <span>
        {students} who joined {verb} been confirmed yet, so scanning the QR code won&apos;t check them in.{" "}
        <Link href={membersPath(orgId)} style={{ color: "var(--color-accent-strong)", fontWeight: 600 }}>
          Confirm them on Members
        </Link>
      </span>
    </div>
  );
}
