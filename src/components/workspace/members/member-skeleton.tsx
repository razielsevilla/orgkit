import React from "react";

interface MemberSkeletonProps {
  rowCount?: number;
}

/**
 * Shimmer placeholder rows matching the workspace frame styling.
 * Adheres to docs/design.md zinc palette and smooth radius.
 */
export function MemberSkeleton({ rowCount = 6 }: MemberSkeletonProps) {
  return (
    <div
      aria-label="Loading member roster"
      role="status"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        width: "100%",
      }}
    >
      {Array.from({ length: rowCount }).map((_, index) => (
        <div
          key={index}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            backgroundColor: "var(--color-surface)",
            borderRadius: 16,
            border: "1px solid var(--color-line)",
            opacity: Math.max(0.35, 1 - index * 0.12),
          }}
        >
          {/* Left: Avatar circle + Name & Email bars */}
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              className="animate-pulse"
              style={{
                width: 38,
                height: 38,
                borderRadius: "50%",
                backgroundColor: "color-mix(in srgb, var(--color-line) 80%, transparent)",
              }}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div
                className="animate-pulse"
                style={{
                  width: index % 2 === 0 ? 140 : 180,
                  height: 14,
                  borderRadius: 6,
                  backgroundColor: "color-mix(in srgb, var(--color-line) 85%, transparent)",
                }}
              />
              <div
                className="animate-pulse"
                style={{
                  width: index % 2 === 0 ? 190 : 150,
                  height: 12,
                  borderRadius: 5,
                  backgroundColor: "color-mix(in srgb, var(--color-line) 60%, transparent)",
                }}
              />
            </div>
          </div>

          {/* Right: Status badge pill + Action pill placeholder */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              className="animate-pulse"
              style={{
                width: 68,
                height: 24,
                borderRadius: 9999,
                backgroundColor: "color-mix(in srgb, var(--color-line) 70%, transparent)",
              }}
            />
            <div
              className="animate-pulse"
              style={{
                width: 76,
                height: 32,
                borderRadius: 9999,
                backgroundColor: "color-mix(in srgb, var(--color-line) 60%, transparent)",
              }}
            />
          </div>
        </div>
      ))}
      <span className="sr-only">Loading member roster...</span>
    </div>
  );
}

