import { WorkspaceContentLoader } from "@/src/components/workspace/frame/workspace-content-loader";
import { WorkspaceBackdrop } from "@/src/components/workspace/frame/workspace-backdrop";

export default function RootLoading() {
  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "var(--color-base)",
      }}
    >
      <WorkspaceBackdrop />
      <div style={{ position: "relative", zIndex: 1, width: "100%" }}>
        <WorkspaceContentLoader />
      </div>
    </div>
  );
}

