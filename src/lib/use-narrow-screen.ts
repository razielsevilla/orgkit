import { useSyncExternalStore } from "react";

/**
 * The width below which the workspace sidebar becomes a drawer (docs/design.md,
 * breakpoints). Keep this in step with the `max-width: 1023px` rules in
 * src/components/workspace/frame/frame-styles.tsx.
 */
export const NARROW_QUERY = "(max-width: 1023px)";

function subscribe(onChange: () => void) {
  const query = window.matchMedia(NARROW_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/**
 * True on a phone or small tablet. The server always says false, like
 * useSidebarCollapsed: the layout itself is done by CSS media queries, so the
 * page is already the right shape on the first paint, and this only decides
 * which sidebar content to show once the page is running in the browser.
 */
export function useNarrowScreen(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(NARROW_QUERY).matches,
    () => false
  );
}
