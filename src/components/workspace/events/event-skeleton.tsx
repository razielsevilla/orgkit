import React from "react";
import { EventCardStyles } from "./event-card";
import { MembersStyles } from "@/src/components/workspace/members/members-styles";

/** One grey placeholder shape */
function Bar({ width, height, radius = 6, strength = 85 }: { width: number | string; height: number; radius?: number; strength?: number }) {
  return (
    <div
      className="orgkit-skeleton"
      style={{
        width,
        height,
        maxWidth: "100%",
        flexShrink: 0,
        borderRadius: radius,
        backgroundColor: `color-mix(in srgb, var(--color-line) ${strength}%, transparent)`,
      }}
    />
  );
}

/** One card placeholder, laid out like `EventCard`: centered date tile, title, time (and location), then the Edit/Cancel row */
function CardSkeleton({ titleWidth, withLocation }: { titleWidth: number; withLocation: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 14,
        padding: 18,
        backgroundColor: "var(--color-surface)",
        borderRadius: 20,
        border: "1px solid var(--color-line)",
        boxShadow: "0 2px 10px color-mix(in srgb, var(--color-ink) 3%, transparent)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "center" }}>
        <Bar width={56} height={56} radius={14} strength={60} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        <Bar width={titleWidth} height={16} />
        <Bar width={130} height={12} radius={5} strength={60} />
        {withLocation && <Bar width={100} height={12} radius={5} strength={50} />}
      </div>
      <div style={{ display: "flex", gap: 8, paddingTop: 14, borderTop: "1px solid color-mix(in srgb, var(--color-line) 70%, transparent)" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Bar width="100%" height={36} radius={18} strength={60} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Bar width="100%" height={36} radius={18} strength={50} />
        </div>
      </div>
    </div>
  );
}

/**
 * The events board while it loads: the 2x2 board (Past and Cancelled on the left, Upcoming on the right),
 * each a stack of cards shaped like `EventCard` (same board, column and stack
 * CSS), so nothing shifts when the data arrives.
 */
export function EventSkeleton() {
  const columns = [
    { label: 1, area: "upcoming", cards: [{ w: 150, loc: true }, { w: 120, loc: false }] },
    { label: 2, area: "past", cards: [{ w: 140, loc: false }] },
    { label: 3, area: "cancelled", cards: [{ w: 130, loc: false }] },
  ];

  return (
    <div
      role="status"
      aria-label="Loading events"
      className="orgkit-ev-board"
      style={{ position: "relative", width: "100%", marginTop: 16, flex: "1 1 auto", minHeight: 0 }}
    >
      <EventCardStyles />
      {columns.map((col) => (
        <div key={col.label} className={`orgkit-ev-column orgkit-ev-area-${col.area}`}>
          <div style={{ padding: "0 4px", height: 20, display: "flex", alignItems: "center" }}>
            <Bar width={[90, 60, 80][col.label - 1]} height={13} radius={5} strength={70} />
          </div>
          <div className="orgkit-ev-stack">
            {col.cards.map((card, i) => (
              <CardSkeleton key={i} titleWidth={card.w} withLocation={card.loc} />
            ))}
          </div>
        </div>
      ))}
      <span className="sr-only">Loading events...</span>
    </div>
  );
}

/**
 * The whole events screen while it loads (used by `loading.tsx`): the page
 * padding, title block and board skeleton, in the same frame as `EventsClient`.
 */
export function EventsLoading() {
  return (
    <div
      style={{
        height: "100%",
        overflowY: "auto",
        padding: "36px clamp(16px, 4vw, 36px) 24px clamp(16px, 4vw, 36px)",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
      }}
    >
      <div
        className="orgkit-members-shell"
        style={{
          width: "100%",
          maxWidth: 960,
          margin: "0 auto",
          position: "relative",
          flex: "1 1 auto",
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <MembersStyles />
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 8 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Bar width={120} height={32} radius={8} />
            <Bar width={300} height={14} radius={5} strength={60} />
          </div>
          <Bar width={136} height={42} radius={21} strength={70} />
        </div>
        <EventSkeleton />
      </div>
    </div>
  );
}
