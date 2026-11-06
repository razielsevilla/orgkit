import { FlowLoader } from "@/src/components/workspace/frame/flow-loader";

/**
 * Main loading boundary for workspace canvas content.
 * Keeps the sidebar permanently mounted and interactive while switching pages.
 */
export default function WorkspaceContentLoading() {
  return <FlowLoader />;
}
