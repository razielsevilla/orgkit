"use client";

import { createContext, useContext, useEffect, useSyncExternalStore } from "react";

/**
 * Example data for the officer tour.
 *
 * A new workspace has no members, no dues, no events, so most of what the tour
 * points at is not on screen yet. While the tour is open, a page whose real data
 * is empty shows made-up example data instead, so every highlighted control has
 * something to point at. Nothing is written anywhere: the example data lives in
 * the page's props for as long as the tour is open, and closing the tour puts
 * the real (empty) page back. A page with real data always shows its real data.
 *
 * How a page takes part (see src/components/workspace/tour/demo/):
 *   1. The workspace frame provides `<TourDemoProvider value={tourIsOpen}>`.
 *   2. A small wrapper around the page's client component calls
 *      `useDemoView(realDataIsEmpty)`. When it returns true the wrapper renders
 *      the same component, with a different `key` (so it starts fresh) and the
 *      example data. The component also gets `demo`, which switches off any
 *      server fetch that would replace the example data with the real, empty one.
 *   3. `useDemoView` also counts the page as "showing example data", which is what
 *      lights the "Example data" badge and the note on the card.
 */

const TourDemoContext = createContext(false);

/** The frame wraps the page in this, with `value` true while the tour is open */
export const TourDemoProvider = TourDemoContext.Provider;

/** True while the tour is open. A page also needs its real data to be empty before it shows examples */
export function useTourDemo(): boolean {
  return useContext(TourDemoContext);
}

// How many pages are showing example data right now
let shown = 0;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Whether this page should show example data: the tour is open AND the page's
 * real data is empty. While it does, the page counts as showing examples.
 */
export function useDemoView(realDataIsEmpty: boolean): boolean {
  const active = useTourDemo() && realDataIsEmpty;
  useEffect(() => {
    if (!active) return;
    shown += 1;
    notify();
    return () => {
      shown -= 1;
      notify();
    };
  }, [active]);
  return active;
}

/** True while any page is showing example data, for the badge and the card note */
export function useExampleDataShown(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => shown > 0,
    () => false
  );
}
