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

export function DuesReviewSkeleton() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap: 16,
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* Left pane: Queue items */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              padding: 16,
              borderRadius: 14,
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-line)",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <ShimmerBar width="45%" height={16} radius={4} />
              <ShimmerBar width="25%" height={16} radius={4} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <ShimmerBar width="35%" height={12} radius={4} />
              <ShimmerBar width="30%" height={12} radius={4} />
            </div>
          </div>
        ))}
      </div>

      {/* Right pane: Preview skeleton */}
      <div
        style={{
          padding: 20,
          borderRadius: 16,
          backgroundColor: "var(--color-surface)",
          border: "1px solid var(--color-line)",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <ShimmerBar width="60%" height={20} radius={6} />
        <ShimmerBar width="100%" height={220} radius={12} />
        <div style={{ display: "flex", gap: 12 }}>
          <ShimmerBar width="50%" height={44} radius={8} />
          <ShimmerBar width="50%" height={44} radius={8} />
        </div>
      </div>
    </div>
  );
}
