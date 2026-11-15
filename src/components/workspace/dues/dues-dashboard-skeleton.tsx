import React from "react";

function SkeletonBar({
  width,
  height,
  radius = 8,
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

export function DuesDashboardSkeleton({ rowCount = 5 }: { rowCount?: number }) {
  return (
    <div
      role="status"
      aria-label="Loading dues dashboard"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 20,
        width: "100%",
        maxWidth: 960,
        margin: "0 auto",
      }}
    >
      <style>{`
        @keyframes pulseSkeleton {
          0%, 100% { opacity: 0.95; }
          50% { opacity: 0.45; }
        }
        .orgkit-skeleton {
          animation: pulseSkeleton 1.8s ease-in-out infinite;
        }
      `}</style>

      {/* Period Picker Skeleton */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 20px",
          backgroundColor: "var(--color-surface)",
          border: "1px solid var(--color-line)",
          borderRadius: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <SkeletonBar width={240} height={40} radius={10} />
          <SkeletonBar width={90} height={24} radius={9999} />
          <SkeletonBar width={120} height={18} />
        </div>
        <SkeletonBar width={110} height={36} radius={8} />
      </div>

      {/* Collection Progress Banner Skeleton */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 14,
          padding: "20px 22px",
          backgroundColor: "var(--color-surface)",
          border: "1px solid var(--color-line)",
          borderRadius: 14,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <SkeletonBar width={120} height={14} style={{ marginBottom: 8 }} />
            <SkeletonBar width={320} height={28} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <SkeletonBar width={90} height={18} style={{ marginBottom: 6 }} />
            <SkeletonBar width={140} height={14} />
          </div>
        </div>
        <SkeletonBar width="100%" height={8} radius={9999} />
      </div>

      {/* 4 Status Breakdown Tiles Skeleton */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
          width: "100%",
        }}
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            style={{
              padding: "16px 18px",
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-line)",
              borderRadius: 12,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <SkeletonBar width={70} height={14} />
              <SkeletonBar width={16} height={16} radius={9999} />
            </div>
            <SkeletonBar width={50} height={28} />
            <SkeletonBar width={100} height={12} />
          </div>
        ))}
      </div>

      {/* Filter Tabs & Search Bar Skeleton */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          marginTop: 8,
        }}
      >
        <div style={{ display: "flex", gap: 8 }}>
          <SkeletonBar width={60} height={34} radius={8} />
          <SkeletonBar width={70} height={34} radius={8} />
          <SkeletonBar width={100} height={34} radius={8} />
          <SkeletonBar width={80} height={34} radius={8} />
        </div>
        <SkeletonBar width={240} height={38} radius={8} />
      </div>

      {/* Table Rows Skeleton */}
      <div
        style={{
          backgroundColor: "var(--color-surface)",
          border: "1px solid var(--color-line)",
          borderRadius: 14,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "14px 20px",
            borderBottom: "1px solid var(--color-line)",
            backgroundColor: "color-mix(in srgb, var(--color-surface) 95%, var(--color-line) 5%)",
          }}
        >
          <SkeletonBar width={120} height={14} />
        </div>
        {Array.from({ length: rowCount }).map((_, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 20px",
              borderBottom: i < rowCount - 1 ? "1px solid var(--color-line)" : "none",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <SkeletonBar width={160} height={16} />
              <SkeletonBar width={200} height={13} />
            </div>
            <SkeletonBar width={80} height={24} radius={9999} />
            <SkeletonBar width={110} height={14} />
            <SkeletonBar width={90} height={14} />
          </div>
        ))}
      </div>
    </div>
  );
}
