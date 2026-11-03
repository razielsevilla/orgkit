/**
 * What the workspace shows while the frame's data streams in: a shimmering copy
 * of the sidebar and an empty canvas, so the layout doesn't jump when it arrives.
 * Used for initial cold load of the workspace frame.
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
      />

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

/**
 * Enterprise-grade canvas-only skeleton for smooth route switching.
 * Leaves the sidebar completely mounted, untouched, and interactive.
 * Perfectly centered across both expanded and compressed sidebar states.
 */
export function WorkspaceCanvasSkeleton() {
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "36px clamp(16px, 4vw, 36px) 60px clamp(16px, 4vw, 36px)",
        boxSizing: "border-box",
        overflowY: "auto",
        overflowX: "hidden",
      }}
    >
      {/* Top Emerald Progress Beam along the upper canvas edge */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          zIndex: 50,
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

      {/* Centered Canvas Column matching the real page max-width & margins */}
      <div
        style={{
          width: "100%",
          maxWidth: 960,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
        }}
      >
        {/* Page Header Shimmer */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: 32,
            gap: 16,
            width: "100%",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div
              className="orgkit-shimmer"
              style={{
                width: 220,
                height: 36,
                borderRadius: 10,
                backgroundColor: "color-mix(in srgb, var(--color-ink) 10%, transparent)",
              }}
            />
            <div
              className="orgkit-shimmer"
              style={{
                width: 360,
                maxWidth: "80%",
                height: 18,
                borderRadius: 6,
                backgroundColor: "color-mix(in srgb, var(--color-ink) 6%, transparent)",
              }}
            />
          </div>
          <div
            className="orgkit-shimmer"
            style={{
              width: 140,
              height: 40,
              borderRadius: 9999,
              backgroundColor: "color-mix(in srgb, var(--color-accent) 15%, transparent)",
            }}
          />
        </div>

        {/* Primary Card Skeleton (Active Officers) */}
        <div
          style={{
            backgroundColor: "var(--color-surface)",
            border: "1px solid var(--color-line)",
            borderRadius: 24,
            padding: 24,
            boxShadow: "0 10px 30px rgba(24, 24, 27, 0.04)",
            display: "flex",
            flexDirection: "column",
            gap: 16,
            width: "100%",
            marginBottom: 20,
            boxSizing: "border-box",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div
              className="orgkit-shimmer"
              style={{
                width: 130,
                height: 20,
                borderRadius: 6,
                backgroundColor: "color-mix(in srgb, var(--color-ink) 8%, transparent)",
              }}
            />
            <div
              className="orgkit-shimmer"
              style={{
                width: 48,
                height: 22,
                borderRadius: 9999,
                backgroundColor: "color-mix(in srgb, var(--color-accent) 12%, transparent)",
              }}
            />
          </div>

          {/* Shimmer Item 1 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: "12px 14px",
              borderRadius: 14,
              border: "1px solid color-mix(in srgb, var(--color-line) 60%, transparent)",
              backgroundColor: "color-mix(in srgb, var(--color-base) 50%, transparent)",
            }}
          >
            <div
              className="orgkit-shimmer"
              style={{
                width: 40,
                height: 40,
                borderRadius: 9999,
                backgroundColor: "color-mix(in srgb, var(--color-accent) 15%, transparent)",
              }}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
              <div
                className="orgkit-shimmer"
                style={{
                  width: 160,
                  height: 16,
                  borderRadius: 4,
                  backgroundColor: "color-mix(in srgb, var(--color-ink) 10%, transparent)",
                }}
              />
              <div
                className="orgkit-shimmer"
                style={{
                  width: 210,
                  height: 13,
                  borderRadius: 4,
                  backgroundColor: "color-mix(in srgb, var(--color-muted) 15%, transparent)",
                }}
              />
            </div>
            <div
              className="orgkit-shimmer"
              style={{
                width: 74,
                height: 28,
                borderRadius: 9999,
                backgroundColor: "color-mix(in srgb, var(--color-line) 80%, transparent)",
              }}
            />
          </div>

          {/* Shimmer Item 2 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: "12px 14px",
              borderRadius: 14,
              border: "1px solid color-mix(in srgb, var(--color-line) 60%, transparent)",
              backgroundColor: "color-mix(in srgb, var(--color-base) 50%, transparent)",
            }}
          >
            <div
              className="orgkit-shimmer"
              style={{
                width: 40,
                height: 40,
                borderRadius: 9999,
                backgroundColor: "color-mix(in srgb, var(--color-muted) 15%, transparent)",
              }}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
              <div
                className="orgkit-shimmer"
                style={{
                  width: 140,
                  height: 16,
                  borderRadius: 4,
                  backgroundColor: "color-mix(in srgb, var(--color-ink) 10%, transparent)",
                }}
              />
              <div
                className="orgkit-shimmer"
                style={{
                  width: 180,
                  height: 13,
                  borderRadius: 4,
                  backgroundColor: "color-mix(in srgb, var(--color-muted) 15%, transparent)",
                }}
              />
            </div>
            <div
              className="orgkit-shimmer"
              style={{
                width: 74,
                height: 28,
                borderRadius: 9999,
                backgroundColor: "color-mix(in srgb, var(--color-line) 80%, transparent)",
              }}
            />
          </div>
        </div>

        {/* Secondary Card Skeleton (Pending Invites) */}
        <div
          style={{
            backgroundColor: "var(--color-surface)",
            border: "1px solid var(--color-line)",
            borderRadius: 24,
            padding: 24,
            boxShadow: "0 10px 30px rgba(24, 24, 27, 0.04)",
            display: "flex",
            flexDirection: "column",
            gap: 16,
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div
              className="orgkit-shimmer"
              style={{
                width: 130,
                height: 20,
                borderRadius: 6,
                backgroundColor: "color-mix(in srgb, var(--color-ink) 8%, transparent)",
              }}
            />
            <div
              className="orgkit-shimmer"
              style={{
                width: 48,
                height: 22,
                borderRadius: 9999,
                backgroundColor: "color-mix(in srgb, var(--color-accent) 12%, transparent)",
              }}
            />
          </div>
          <div
            style={{
              padding: "20px 0",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <div
              className="orgkit-shimmer"
              style={{
                width: 150,
                height: 14,
                borderRadius: 4,
                backgroundColor: "color-mix(in srgb, var(--color-muted) 18%, transparent)",
              }}
            />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes shimmerPulse {
          0%, 100% { opacity: 0.55; }
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
