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

function sameLocalDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** "9:00 AM – 5:00 PM", or "Nov 16, 9:00 AM – Nov 17, 5:00 PM" when the event spans days */
export function formatEventRange(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "";
  const time = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
  // The card's date tile already shows the day, so a single-day event shows only the times
  if (sameLocalDay(start, end)) return `${time.format(start)} – ${time.format(end)}`;
  const dayTime = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  return `${dayTime.format(start)} – ${dayTime.format(end)}`;
}

/** The start's month and day for the card's date tile, in the viewer's zone */
export function formatEventTile(iso: string): { month: string; day: string } {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return { month: "", day: "" };
  return {
    month: new Intl.DateTimeFormat(undefined, { month: "short" }).format(date),
    day: String(date.getDate()),
  };
}

/** Event time range in the viewer's local time; blank until the browser takes over, like `LocalTime` */
export function LocalTimeRange({ startIso, endIso }: { startIso: string; endIso: string }) {
  const isClient = useIsClient();
  return (
    <span suppressHydrationWarning>{isClient ? formatEventRange(startIso, endIso) : " "}</span>
  );
}

/** Month and day tile text in the viewer's local time */
export function LocalDateTile({ iso }: { iso: string }) {
  const isClient = useIsClient();
  const { month, day } = isClient ? formatEventTile(iso) : { month: " ", day: " " };
  return (
    <span suppressHydrationWarning style={{ display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1.1 }}>
      <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>{month}</span>
      <span style={{ fontSize: 20, fontWeight: 700 }}>{day}</span>
    </span>
  );
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
