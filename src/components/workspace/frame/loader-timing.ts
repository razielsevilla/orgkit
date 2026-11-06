/**
 * Timing for the workspace loading animation, in one place: these are the only
 * numbers to change. The arc is anchored at the top of the ring and its other
 * end travels clockwise around it, at one steady speed, until the two ends meet.
 */

/**
 * The arc travels for at least this long, however fast the page loads. With the
 * closing and fade below, the loader is on screen about two seconds in all.
 */
export const MIN_LOADER_MS = 1400;

/** Once the page is ready, the arc travels the rest of the way round, closing the circle, over this long */
export const ARC_FINISH_MS = 350;

/** Then the loader fades out as the page fades in over this long */
export const REVEAL_FADE_MS = 300;

/** A loader start older than this is a navigation that never finished, so it is ignored */
export const STALE_LOADER_MS = 15000;

/** How long to keep showing the loader before the arc closes, given how long it has already been showing */
export function remainingLoaderMs(elapsedMs: number): number {
  return Math.max(MIN_LOADER_MS - Math.max(elapsedMs, 0), 0);
}

/** How long the loader is on screen at the very least, from the start to the page being fully shown */
export const MIN_TOTAL_LOADER_MS = MIN_LOADER_MS + ARC_FINISH_MS + REVEAL_FADE_MS;

/**
 * How far round the ring the arc has travelled (0 to 100, in percent) when the
 * minimum time is up. The rest is covered while closing, at the same speed, so
 * the arc moves at one steady pace from start to finish.
 */
export const ARC_PERCENT_AT_MIN = Math.round((100 * MIN_LOADER_MS) / (MIN_LOADER_MS + ARC_FINISH_MS));

/** How far the arc creeps past that if a page is slow, so a long wait never looks frozen */
const ARC_CREEP_PERCENT = 14;
const ARC_CREEP_MS = 3000;

/** The arc's length (percent of the ring) after the loader has been showing this long */
export function arcProgress(elapsedMs: number): number {
  const elapsed = Math.max(elapsedMs, 0);
  if (elapsed <= MIN_LOADER_MS) return (elapsed / MIN_LOADER_MS) * ARC_PERCENT_AT_MIN;
  const creep = ARC_CREEP_PERCENT * (1 - Math.exp(-(elapsed - MIN_LOADER_MS) / ARC_CREEP_MS));
  return ARC_PERCENT_AT_MIN + creep;
}

/** The arc's length while closing: from where it was to a full circle, at a steady pace */
export function finishProgress(fromPercent: number, sinceFinishMs: number): number {
  const done = Math.min(Math.max(sinceFinishMs / ARC_FINISH_MS, 0), 1);
  return fromPercent + (100 - fromPercent) * done;
}
