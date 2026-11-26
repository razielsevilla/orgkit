import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { workspacePath } from "@/src/lib/routes";

/**
 * Shown on Home when the health numbers could not be loaded. The rest of the
 * workspace still works, so the sidebar stays and the officer can retry.
 */
export function OrgHealthUnavailable({ orgId, message }: { orgId: string; message: string }) {
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        boxSizing: "border-box",
      }}
    >
      <div
        role="alert"
        style={{
          width: "100%",
          maxWidth: 440,
          boxSizing: "border-box",
          padding: "clamp(24px, 6vw, 36px)",
          borderRadius: 24,
          border: "1px solid var(--color-line)",
          backgroundColor: "var(--color-surface)",
          boxShadow: "0 20px 50px color-mix(in srgb, var(--color-ink) 6%, transparent)",
          textAlign: "center",
        }}
      >
        <AlertCircle size={28} strokeWidth={1.75} aria-hidden="true" style={{ color: "var(--color-danger-strong)" }} />
        <h1
          style={{
            margin: "12px 0 6px 0",
            fontSize: 22,
            fontWeight: 800,
            lineHeight: 1.2,
            letterSpacing: "-0.02em",
            color: "var(--color-ink)",
          }}
        >
          Home could not load
        </h1>
        <p style={{ margin: "0 0 18px 0", fontSize: 14, lineHeight: 1.45, color: "var(--color-muted)" }}>{message}</p>
        <Link
          href={workspacePath(orgId)}
          className="orgkit-tap-link"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 42,
            padding: "10px 22px",
            borderRadius: 9999,
            backgroundColor: "var(--color-accent-strong)",
            color: "var(--color-on-accent)",
            fontSize: 14,
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          Try again
        </Link>
      </div>
    </div>
  );
}
