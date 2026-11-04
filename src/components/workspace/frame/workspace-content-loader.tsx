"use client";

import { FlowLoader } from "./flow-loader";

/**
 * Main loading animation for workspace screens: the OrgKit mark with flowing
 * emerald gradient.
 */
export function WorkspaceContentLoader({
  finishing = false,
}: {
  finishing?: boolean;
}) {
  return <FlowLoader finishing={finishing} />;
}
