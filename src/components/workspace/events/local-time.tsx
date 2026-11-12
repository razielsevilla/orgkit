"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** False while rendering on the server and during hydration, true afterwards */
function useIsClient(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
}

/** "Nov 12, 2026, 7:00 PM" in the viewer's own time zone and language */
export function formatEventTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

/**
 * An event time shown in the viewer's local time. The server doesn't know the
 * viewer's time zone, so the text is filled in once the page runs in the
 * browser; until then the cell stays blank rather than show the server's zone.
 */
export function LocalTime({ iso }: { iso: string }) {
  const isClient = useIsClient();
  return (
    <time dateTime={iso} suppressHydrationWarning>
      {isClient ? formatEventTime(iso) : " "}
    </time>
  );
}
