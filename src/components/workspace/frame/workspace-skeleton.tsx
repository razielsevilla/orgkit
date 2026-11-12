"use client";

import { WorkspaceContentLoader } from "./workspace-content-loader";
import { WorkspaceBackdrop } from "./workspace-backdrop";

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
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <WorkspaceBackdrop />
      <div style={{ position: "relative", zIndex: 1, width: "100%" }}>
        <WorkspaceContentLoader />
      </div>
    </div>
  );
}
