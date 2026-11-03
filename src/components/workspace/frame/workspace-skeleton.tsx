/**
 * What the workspace shows while the frame's data streams in: a shimmering copy
 * of the sidebar and an empty canvas, so the layout doesn't jump when it arrives.
 */
export function WorkspaceLoadingSkeleton() {
  return (
    <div
      style={{
        height: "100vh",
        maxHeight: "100vh",
        width: "100%",
        overflow: "hidden",
        position: "relative",
        backgroundColor: "var(--color-base)",
        display: "flex",
        boxSizing: "border-box",
      }}
    >
      {/* Top Emerald Loading Progress Beam */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          zIndex: 9999,
          overflow: "hidden",
          backgroundColor: "color-mix(in srgb, var(--color-accent) 15%, transparent)",
        }}
      >
        <div
          className="orgkit-progress-beam"
          style={{
            height: "100%",
            width: "40%",
            backgroundColor: "var(--color-accent)",
            borderRadius: 9999,
          }}
        />
      </div>

      {/* Sidebar Skeleton (Expanded 256px) */}
      <aside
        style={{
          width: 256,
          minWidth: 256,
          height: "100vh",
          backgroundColor: "var(--color-surface)",
          borderRight: "1px solid var(--color-line)",
          padding: "16px 14px 14px 14px",
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
          flexShrink: 0,
        }}
      >
        {/* Top Header Placeholder */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
            height: 36,
          }}
        >
          <div
            className="orgkit-shimmer"
            style={{ width: 100, height: 26, borderRadius: 8, backgroundColor: "var(--color-base)" }}
          />
          <div
            className="orgkit-shimmer"
            style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: "var(--color-base)" }}
          />
        </div>

        {/* Workspace Card Shimmer */}
        <div
          className="orgkit-shimmer"
          style={{
            height: 104,
            borderRadius: 18,
            backgroundColor: "color-mix(in srgb, var(--color-accent) 8%, transparent)",
            border: "1px solid color-mix(in srgb, var(--color-accent) 12%, transparent)",
            marginBottom: 16,
          }}
        />

        {/* Nav Items Shimmer */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
          <div
            className="orgkit-shimmer"
            style={{ height: 38, borderRadius: 12, backgroundColor: "color-mix(in srgb, var(--color-accent) 10%, transparent)" }}
          />
          <div style={{ height: 16, width: 60, marginTop: 12, marginBottom: 4 }} className="orgkit-shimmer" />
          <div className="orgkit-shimmer" style={{ height: 36, borderRadius: 10, backgroundColor: "var(--color-base)" }} />
          <div className="orgkit-shimmer" style={{ height: 36, borderRadius: 10, backgroundColor: "var(--color-base)" }} />
          <div className="orgkit-shimmer" style={{ height: 36, borderRadius: 10, backgroundColor: "var(--color-base)" }} />
        </div>

        {/* Bottom Officer Profile Card Shimmer */}
        <div
          className="orgkit-shimmer"
          style={{
            height: 52,
            borderRadius: 14,
            border: "1px solid var(--color-line)",
            backgroundColor: "var(--color-surface)",
          }}
        />
      </aside>

      {/* Main Canvas Skeleton */}
      <main
        style={{
          flex: 1,
          height: "100vh",
          backgroundColor: "var(--color-base)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          position: "relative",
          overflow: "hidden",
          boxSizing: "border-box",
        }}
      >
      </main>

      <style>{`
        @keyframes shimmerPulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 0.95; }
        }
        @keyframes progressSlide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(350%); }
        }
        .orgkit-shimmer {
          animation: shimmerPulse 1.4s ease-in-out infinite;
        }
        .orgkit-progress-beam {
          animation: progressSlide 1.2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
      `}</style>
    </div>
  );
}
