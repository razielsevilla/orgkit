import { WorkspaceContentLoader } from "@/src/components/workspace/frame/workspace-content-loader";

// Shown in the content area while Home, Join or Invite loads. The sidebar sits
// in the layout above this, so it stays put and never joins the animation.
export default function WorkspaceLoading() {
  return <WorkspaceContentLoader />;
}
