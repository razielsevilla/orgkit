import { WorkspaceCanvasSkeleton } from "@/src/components/workspace/frame/workspace-skeleton";

/**
 * Loading boundary for workspace canvas content.
 * Keeps the sidebar permanently mounted and interactive while switching pages.
 */
export default function WorkspaceContentLoading() {
  return <WorkspaceCanvasSkeleton />;
}
