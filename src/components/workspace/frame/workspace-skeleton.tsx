"use client";

import { FlowLoader } from "./flow-loader";

/**
 * Full-screen loading animation used on initial cold load of the workspace.
 */
export function WorkspaceLoadingSkeleton() {
  return (
    <div
      style={{
        height: "100vh",
        maxHeight: "100vh",
        width: "100vw",
        overflow: "hidden",
        backgroundColor: "var(--color-base)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <FlowLoader />
    </div>
  );
}

/**
 * Canvas loading animation for smooth route transitions within the workspace.
 */
export function WorkspaceCanvasSkeleton() {
  return <FlowLoader />;
}
