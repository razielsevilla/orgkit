import React from "react";

function ShimmerBar({
  width,
  height,
  radius = 6,
  style,
}: {
  width: string | number;
  height: number;
  radius?: number;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className="orgkit-skeleton"
      style={{
        width,
        height,
        flexShrink: 0,
        borderRadius: radius,
        backgroundColor: "color-mix(in srgb, var(--color-line) 85%, transparent)",
        ...style,
      }}
    />
  );
}

export function DuesReminderSkeleton() {
  return (
    <div
      data-testid="dues-reminder-skeleton"
      style={{ display: "flex", flexDirection: "column", gap: 16 }}
    >
      {/* Recipient Count Hero Banner Shimmer */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 16px",
          borderRadius: 14,
          backgroundColor: "color-mix(in srgb, var(--color-surface) 92%, black 8%)",
          border: "1px solid var(--color-line)",
        }}
      >
        <ShimmerBar width={36} height={36} radius={10} />
        <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
          <ShimmerBar width="60%" height={16} radius={4} />
          <ShimmerBar width="85%" height={12} radius={4} />
        </div>
      </div>

      {/* Message Label Shimmer */}
      <ShimmerBar width={120} height={14} radius={4} style={{ marginTop: 4 }} />

      {/* Message Preview Envelope Card Shimmer */}
      <div
        style={{
          borderRadius: 16,
          border: "1px solid var(--color-line)",
          backgroundColor: "var(--color-surface)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "12px 16px",
            backgroundColor: "color-mix(in srgb, var(--color-brand-tint) 50%, var(--color-surface))",
            borderBottom: "1px solid var(--color-line)",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <ShimmerBar width="45%" height={12} radius={4} />
          <ShimmerBar width="70%" height={12} radius={4} />
        </div>
        <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 10 }}>
          <ShimmerBar width="35%" height={13} radius={4} />
          <ShimmerBar width="90%" height={13} radius={4} />
          <ShimmerBar width="80%" height={13} radius={4} />
          <ShimmerBar width="50%" height={13} radius={4} />
        </div>
      </div>
    </div>
  );
}
