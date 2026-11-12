import React from "react";
import {
  ROSTER_FOOTER_STYLE,
  ROSTER_TABLE_STYLE,
  TABLE_CARD_STYLE,
} from "@/src/components/workspace/members/member-table-layout";
import { MembersStyles } from "@/src/components/workspace/members/members-styles";
import { EVENT_CELL_PADDING, EventColgroup, EventHeaderBar } from "./event-table-layout";

/** One grey placeholder shape */
function Bar({ width, height, radius = 6, strength = 85 }: { width: number; height: number; radius?: number; strength?: number }) {
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

/**
 * The events list while it loads: the same card, columns and row height as
 * `EventTable` (both read `event-table-layout`), and phone cards as in
 * `EventMobileCard`, so nothing shifts when the data arrives.
 */
export function EventSkeleton({ rowCount = 5 }: { rowCount?: number }) {
  const rows = Array.from({ length: rowCount });

  return (
    <div
      role="status"
      aria-label="Loading events"
      className="orgkit-members-list"
      style={{ position: "relative", width: "100%", marginTop: 4 }}
    >
      <div className="orgkit-members-list-body" style={{ width: "100%" }}>
        <div className="orgkit-members-desktop">
          <div className="orgkit-members-table-card" style={{ ...TABLE_CARD_STYLE, display: "flex", flexDirection: "column" }}>
            <EventHeaderBar />
            <div style={{ flex: "1 1 auto", minHeight: 0, overflow: "hidden", scrollbarGutter: "stable" }}>
              <table style={ROSTER_TABLE_STYLE}>
                <EventColgroup />
                <tbody>
                  {rows.map((_, i) => (
                    <tr key={i} style={{ borderBottom: i === rowCount - 1 ? "none" : "1px solid var(--color-line)" }}>
                      <td style={{ padding: EVENT_CELL_PADDING[0] }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          <Bar width={i % 2 === 0 ? 170 : 210} height={14} />
                          <Bar width={i % 2 === 0 ? 110 : 140} height={12} radius={5} strength={60} />
                        </div>
                      </td>
                      <td style={{ padding: EVENT_CELL_PADDING[1] }}>
                        <div style={{ display: "flex", justifyContent: "center" }}>
                          <Bar width={120} height={12} radius={5} strength={70} />
                        </div>
                      </td>
                      <td style={{ padding: EVENT_CELL_PADDING[2] }}>
                        <div style={{ display: "flex", justifyContent: "center" }}>
                          <Bar width={120} height={12} radius={5} strength={70} />
                        </div>
                      </td>
                      <td style={{ padding: EVENT_CELL_PADDING[3] }}>
                        <div style={{ display: "flex", justifyContent: "center" }}>
                          <Bar width={80} height={26} radius={13} strength={70} />
                        </div>
                      </td>
                      <td style={{ padding: EVENT_CELL_PADDING[4] }}>
                        <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
                          {[0, 1].map((n) => (
                            <Bar key={n} width={32} height={32} radius={16} strength={60} />
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={ROSTER_FOOTER_STYLE}>
              <Bar width={80} height={12} radius={5} strength={70} />
            </div>
          </div>
        </div>

        <div className="orgkit-members-mobile">
          {rows.slice(0, 4).map((_, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                padding: 16,
                backgroundColor: "var(--color-surface)",
                borderRadius: 16,
                border: "1px solid var(--color-line)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <Bar width={i % 2 === 0 ? 150 : 190} height={14} />
                <Bar width={80} height={24} radius={12} strength={70} />
              </div>
              <Bar width={200} height={12} radius={5} strength={60} />
              <div style={{ display: "flex", gap: 8 }}>
                <Bar width={120} height={40} radius={20} strength={60} />
                <Bar width={120} height={40} radius={20} strength={60} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <span className="sr-only">Loading events...</span>
    </div>
  );
}

/**
 * The whole events screen while it loads (used by `loading.tsx`): the page
 * padding, title block and table skeleton, in the same frame as `EventsClient`.
 */
export function EventsLoading() {
  return (
    <div
      style={{
        height: "100%",
        overflowY: "auto",
        padding: "36px clamp(16px, 4vw, 36px) 60px clamp(16px, 4vw, 36px)",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
      }}
    >
      <div className="orgkit-members-shell" style={{ width: "100%", maxWidth: 960, margin: "0 auto", position: "relative" }}>
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
