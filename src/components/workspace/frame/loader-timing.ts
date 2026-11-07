/**
 * Timing for the workspace loading animation, in one place: these are the only
 * numbers to change.
 */

/**
 * The loader shows for at least this long, however fast the page loads. With
 * the closing and fade below, it is on screen about two seconds in all.
 */
export const MIN_LOADER_MS = 1400;

/** Once the page is ready, the loader fills in solid over this long */
export const FINISH_MS = 350;

/** Then the loader fades out as the page fades in over this long */
export const REVEAL_FADE_MS = 300;

/** A loader start older than this is a navigation that never finished, so it is ignored */
export const STALE_LOADER_MS = 15000;

/** How long to keep showing the loader before it fills in, given how long it has already been showing */
export function remainingLoaderMs(elapsedMs: number): number {
  return Math.max(MIN_LOADER_MS - Math.max(elapsedMs, 0), 0);
}

/** How long the loader is on screen at the very least, from the start to the page being fully shown */
export const MIN_TOTAL_LOADER_MS = MIN_LOADER_MS + FINISH_MS + REVEAL_FADE_MS;
