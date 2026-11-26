"use client";

import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  window.addEventListener("resize", onChange);
  return () => window.removeEventListener("resize", onChange);
}

/** The visible width and height of the window, kept up to date. Zero on the server. */
export function useViewport(): { width: number; height: number } {
  // Two numbers, not one object: useSyncExternalStore needs a stable value to compare
  const width = useSyncExternalStore(subscribe, () => window.innerWidth, () => 0);
  const height = useSyncExternalStore(subscribe, () => window.innerHeight, () => 0);
  return { width, height };
}

/** Whether a media query matches, such as "(max-width: 640px)". False on the server. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false
  );
}
