"use client";

import React from "react";
import { useSelectedLayoutSegments } from "next/navigation";

/**
 * Lays out the events section. On an event's own page (`/events/[eventId]`) the
 * event takes the main column and the events list sits beside it as a narrow
 * scrollable rail. On the list, and on the check-in screen, the page gets the
 * whole width.
 */
export function EventsShell({ rail, children }: { rail: React.ReactNode; children: React.ReactNode }) {
  const segments = useSelectedLayoutSegments();
  const showRail = segments.length === 1;

  if (!showRail) return <>{children}</>;

  return (
    <div className="orgkit-ev-shell" style={{ display: "flex", height: "100%", width: "100%", minHeight: 0 }}>
      <style>{`
        .orgkit-ev-shell-main { flex: 1 1 auto; min-width: 0; height: 100%; }
        .orgkit-ev-shell-rail {
          flex: 0 0 300px;
          width: 300px;
          height: 100%;
          min-height: 0;
          border-left: 1px solid var(--color-line);
          background-color: color-mix(in srgb, var(--color-surface) 60%, transparent);
        }
        @media (max-width: 1000px) { .orgkit-ev-shell-rail { display: none; } }
      `}</style>
      <div className="orgkit-ev-shell-main">{children}</div>
      <aside className="orgkit-ev-shell-rail" aria-label="All events">
        {rail}
      </aside>
    </div>
  );
}
