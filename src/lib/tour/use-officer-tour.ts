"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import type { TourScope } from "@/src/lib/tour/tour-beats";

/**
 * Whether the officer tour is open, and whether it has been seen.
 *
 * It opens by itself the first time an officer reaches a workspace, and again
 * whenever they ask for it (the profile menu). "Seen" is remembered in this
 * browser, per officer, like the sidebar's collapsed state
 * (use-sidebar-collapsed.ts): no account data, no migration. The cost is that
 * an officer on a second device sees the tour once there too, which is fine for
 * a three minute tour that can be skipped.
 */

const KEY_PREFIX = "orgkit_tour_v1:";
const listeners = new Set<() => void>();

/** One key per officer, so two officers on a shared computer each get the tour */
export function tourStorageKey(officerId: string): string {
  return `${KEY_PREFIX}${officerId}`;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function readSeen(officerId: string | undefined): boolean {
  // Without an officer there is nothing to remember it against, so never open by itself
  if (!officerId) return true;
  try {
    return localStorage.getItem(tourStorageKey(officerId)) !== null;
  } catch {
    // Storage blocked (private mode, some sandboxes): it could never be remembered,
    // so showing it on every page would nag. Treat it as seen; replay still works.
    return true;
  }
}

function writeSeen(officerId: string | undefined) {
  if (!officerId) return;
  try {
    localStorage.setItem(tourStorageKey(officerId), new Date().toISOString());
  } catch {}
  listeners.forEach((listener) => listener());
}

export interface OfficerTourState {
  isOpen: boolean;
  /** What the open tour covers: everything, or one page's guide */
  scope: TourScope;
  /** Opens the tour from its first step, whether or not it was seen before. Defaults to the full tour */
  start: (scope?: TourScope) => void;
  /**
   * Closes the tour. Ending the full tour (finishing or skipping) remembers it was seen,
   * so it does not open by itself again. Closing one page's guide does not: an officer
   * who looks up one page first still gets the full tour the first time.
   */
  close: () => void;
}

export function useOfficerTour(officerId: string | undefined): OfficerTourState {
  // The server and the first client render agree on "seen", so nothing opens during
  // hydration; the real value is applied right after (same approach as the sidebar).
  const seen = useSyncExternalStore(
    subscribe,
    () => readSeen(officerId),
    () => true
  );
  // Set while the officer asked for it (the ? or the profile menu); null when it opened by itself
  const [asked, setAsked] = useState<TourScope | null>(null);
  // Covers storage that accepts reads but not writes: closed stays closed this visit
  const [closed, setClosed] = useState(false);

  const start = useCallback((scope: TourScope = "all") => {
    setClosed(false);
    setAsked(scope);
  }, []);

  const scope: TourScope = asked ?? "all";
  const close = useCallback(() => {
    setAsked(null);
    setClosed(true);
    if (scope === "all") writeSeen(officerId);
  }, [officerId, scope]);

  return { isOpen: asked !== null || (!seen && !closed), scope, start, close };
}
