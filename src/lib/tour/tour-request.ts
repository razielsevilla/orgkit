"use client";

import { useSyncExternalStore } from "react";

/**
 * Lets a button elsewhere on the screen start the officer tour.
 *
 * The tour's state lives in the workspace frame (it needs the org and the
 * officer), but the "?" button sits in the corner with the Feedback button,
 * which is in the layout above the frame and cannot reach it. The frame
 * registers how to start the tour here, and the button asks. Pages with no frame
 * (the new-workspace screen, the owner pages) register nothing, so the button
 * does not appear there.
 */

const starters = new Set<() => void>();
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((listener) => listener());

/** The frame calls this while it is mounted. Returns the function that unregisters. */
export function registerTourStarter(start: () => void): () => void {
  starters.add(start);
  notify();
  return () => {
    starters.delete(start);
    notify();
  };
}

/** Starts the tour from the first step, if a frame is there to show it */
export function requestTour(): void {
  starters.forEach((start) => start());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** True while a workspace frame is mounted and can show the tour */
export function useTourAvailable(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => starters.size > 0,
    () => false
  );
}
