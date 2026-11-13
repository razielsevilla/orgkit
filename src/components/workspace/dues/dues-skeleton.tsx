import React from "react";

function Bar({
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

export function DuesSkeleton({ rowCount = 4 }: { rowCount?: number }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 20,
        width: "100%",
        maxWidth: 1040,
        margin: "0 auto",
        padding: "clamp(16px, 2.5vw, 32px)",
        boxSizing: "border-box",
      }}
    >
      {/* Header skeleton */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Bar width={140} height={32} radius={8} />
          <Bar width={260} height={18} radius={6} />
        </div>
        <Bar width={120} height={40} radius={9999} />
      </div>

      {/* Table Card skeleton */}
      <div
        style={{
          backgroundColor: "var(--color-surface)",
          borderRadius: 20,
          border: "1px solid var(--color-line)",
          boxShadow: "0 20px 50px rgba(24, 24, 27, 0.04)",
          overflow: "hidden",
        }}
      >
        {/* Table header bar */}
        <div
          style={{
            height: 48,
            borderBottom: "1px solid var(--color-line)",
            backgroundColor: "color-mix(in srgb, var(--color-base) 60%, transparent)",
            display: "flex",
            alignItems: "center",
            padding: "0 24px",
            gap: 24,
          }}
        >
          <Bar width="35%" height={14} />
          <Bar width="20%" height={14} />
          <Bar width="20%" height={14} />
          <Bar width="15%" height={14} />
          <Bar width="10%" height={14} />
        </div>

        {/* Rows */}
        {Array.from({ length: rowCount }).map((_, i) => (
          <div
            key={i}
            style={{
              height: 64,
              borderBottom: i < rowCount - 1 ? "1px solid var(--color-line)" : "none",
              display: "flex",
              alignItems: "center",
              padding: "0 24px",
              gap: 24,
            }}
          >
            <Bar width="35%" height={16} />
            <Bar width="20%" height={16} />
            <Bar width="20%" height={16} />
            <Bar width="15%" height={22} radius={9999} />
            <Bar width="10%" height={28} radius={8} />
          </div>
        ))}
      </div>
    </div>
  );
}

