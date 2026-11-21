import { STALE_LOADER_MS } from "./loader-timing";

/**
 * When the loading animation first appeared for the current page change. The
 * loader shown while a page loads records it, and the page's reveal gate reads
 * it so the animation carries on from where it was instead of starting over.
 * Browser only: a loader rendered on the server records nothing until it mounts.
 */
let startedAt: number | null = null;

/** Called when a loader mounts. The first call for a page change wins. */
export function markLoaderStart(now: number = performance.now()): void {
  if (startedAt === null || now - startedAt > STALE_LOADER_MS) startedAt = now;
}

/** How long the loader has been showing, without ending the page change */
export function peekLoaderElapsed(now: number = performance.now()): number {
  if (startedAt === null) return 0;
  const elapsed = now - startedAt;
  return elapsed > STALE_LOADER_MS ? 0 : elapsed;
}

/** Same, and ends the page change so the next one starts fresh */
export function takeLoaderElapsed(now: number = performance.now()): number {
  const elapsed = peekLoaderElapsed(now);
  startedAt = null;
  return elapsed;
}
