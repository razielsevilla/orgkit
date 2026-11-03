/**
 * Which loading animation the workspace shows. Both are kept:
 *
 *   "flow"  the OrgKit logo fills with emerald that flows up through it, over and over
 *   "arc"   the logo in a disc with an emerald arc that travels round it and closes
 *
 * Both share the same timing (loader-timing.ts) and the same hand-off into the
 * page. To switch, set NEXT_PUBLIC_LOADER_VARIANT=arc (or flow) in .env.local and
 * restart, or change the default below.
 */
export type LoaderVariant = "flow" | "arc";

export const LOADER_VARIANT: LoaderVariant =
  process.env.NEXT_PUBLIC_LOADER_VARIANT === "arc" ? "arc" : "flow";
