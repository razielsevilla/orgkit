import Link from "next/link";
import { ROUTES } from "@/src/lib/routes";

/** The two owner pages, side by side. There is no link to them in the app itself. */
export function OwnerNav({ current }: { current: "usage" | "feedback" }) {
  const items = [
    { key: "usage", label: "Usage", href: ROUTES.ownerUsage },
    { key: "feedback", label: "Feedback", href: ROUTES.ownerFeedback },
  ] as const;

  return (
    <nav aria-label="Owner pages" style={{ display: "flex", gap: 8, margin: "12px 0 0", flexWrap: "wrap" }}>
      {items.map((item) => {
        const active = item.key === current;
        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={active ? "page" : undefined}
            style={{
              padding: "6px 14px",
              borderRadius: 9999,
              fontSize: 14,
              fontWeight: 600,
              textDecoration: "none",
              border: "1px solid var(--color-line)",
              backgroundColor: active ? "var(--color-accent)" : "var(--color-surface)",
              color: active ? "var(--color-surface)" : "var(--color-ink-soft)",
            }}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
