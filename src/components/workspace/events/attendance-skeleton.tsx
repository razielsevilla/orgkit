import React from "react";
import { TABLE_CARD_STYLE } from "@/src/components/workspace/members/member-table-layout";
import { ATTENDANCE_COLUMNS, ATTENDANCE_SCROLL_MAX_HEIGHT } from "./attendance-layout";

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

/** The attendance list while it loads: the same card, columns and row height as `AttendanceTable` */
export function AttendanceSkeleton({ rowCount = 5 }: { rowCount?: number }) {
  const rows = Array.from({ length: rowCount });

  return (
    <div role="status" aria-label="Loading attendance" style={{ marginTop: 32 }}>
      <span className="sr-only">Loading attendance</span>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
        <Bar width={120} height={22} />
        <Bar width={110} height={14} radius={5} strength={60} />
      </div>
      <div style={{ marginBottom: 14 }}>
        <Bar width={9999} height={42} radius={12} strength={60} />
      </div>
      <div style={{ ...TABLE_CARD_STYLE, maxHeight: ATTENDANCE_SCROLL_MAX_HEIGHT }}>
        <div className="orgkit-members-desktop">
          <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
            <colgroup>
              {ATTENDANCE_COLUMNS.map((width, i) => (
                <col key={i} style={{ width }} />
              ))}
            </colgroup>
            <tbody>
              {rows.map((_, i) => (
                <tr key={i} style={{ borderBottom: i === rowCount - 1 ? "none" : "1px solid var(--color-line)" }}>
                  <td style={{ padding: "12px 20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <Bar width={34} height={34} radius={17} />
                      <Bar width={i % 2 === 0 ? 140 : 180} height={14} />
                    </div>
                  </td>
                  <td style={{ padding: "12px 20px" }}>
                    <Bar width={56} height={20} radius={10} strength={70} />
                  </td>
                  <td style={{ padding: "12px 20px" }}>
                    <Bar width={130} height={12} radius={5} strength={70} />
                  </td>
                  <td style={{ padding: "12px 20px", textAlign: "right" }}>
                    <Bar width={34} height={34} radius={17} strength={60} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="orgkit-members-mobile">
          <div>
            {rows.map((_, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 14px",
                  borderBottom: i === rowCount - 1 ? "none" : "1px solid var(--color-line)",
                }}
              >
                <Bar width={34} height={34} radius={17} />
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                  <Bar width={i % 2 === 0 ? 130 : 170} height={14} />
                  <Bar width={150} height={12} radius={5} strength={60} />
                </div>
                <Bar width={34} height={34} radius={17} strength={60} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
