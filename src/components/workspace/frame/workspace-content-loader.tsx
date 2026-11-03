"use client";

import { ArcLoader } from "./arc-loader";
import { FlowLoader } from "./flow-loader";
import { LOADER_VARIANT, type LoaderVariant } from "./loader-variant";

/**
 * What the workspace canvas shows while a screen loads. It fills only the
 * content area, so the sidebar stays still. Which animation it is comes from
 * loader-variant.ts; both take `finishing` (the page is ready, so close up) and
 * carry on from where any previous loader stopped.
 */
export function WorkspaceContentLoader({
  finishing = false,
  variant = LOADER_VARIANT,
}: {
  finishing?: boolean;
  /** Override the chosen animation (for previews and tests) */
  variant?: LoaderVariant;
}) {
  return variant === "arc" ? <ArcLoader finishing={finishing} /> : <FlowLoader finishing={finishing} />;
}
