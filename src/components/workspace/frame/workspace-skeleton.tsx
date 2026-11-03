import { WorkspaceBackdrop } from "./workspace-backdrop";
import { WorkspaceContentLoader } from "./workspace-content-loader";

/**
 * What the workspace shows while the frame's data streams in: a still copy of
 * the sidebar, so the layout doesn't jump when it arrives, and the loading
 * animation in the canvas. Only the canvas animates; the sidebar never does.
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
           
            style={{ width: 100, height: 26, borderRadius: 8, backgroundColor: "var(--color-base)" }}
          />
          <div
           
            style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: "var(--color-base)" }}
          />
        </div>

        {/* Workspace Card Shimmer */}
        <div
         
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
           
            style={{ height: 38, borderRadius: 12, backgroundColor: "color-mix(in srgb, var(--color-accent) 10%, transparent)" }}
          />
          <div style={{ height: 16, width: 60, marginTop: 12, marginBottom: 4 }} />
          <div style={{ height: 36, borderRadius: 10, backgroundColor: "var(--color-base)" }} />
          <div style={{ height: 36, borderRadius: 10, backgroundColor: "var(--color-base)" }} />
          <div style={{ height: 36, borderRadius: 10, backgroundColor: "var(--color-base)" }} />
        </div>

        {/* Bottom Officer Profile Card Shimmer */}
        <div
         
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
        <WorkspaceBackdrop />
        <div style={{ position: "relative", zIndex: 1, width: "100%", height: "100%" }}>
          <WorkspaceContentLoader />
        </div>
      </main>
    </div>
  );
}
