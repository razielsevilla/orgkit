"use client";

import React from "react";
import { Loader2, Trash2 } from "lucide-react";
import type { AttendanceRecord } from "@/src/lib/events/attendance-state";
import { TABLE_CARD_STYLE } from "@/src/components/workspace/members/member-table-layout";
import { getInitials } from "@/src/components/workspace/officers/officers-helpers";
import { AttendanceMethodBadge } from "./attendance-method-badge";
import { LocalTime } from "./local-time";
import { ATTENDANCE_COLUMNS, ATTENDANCE_SCROLL_MAX_HEIGHT } from "./attendance-layout";

const headerCell: React.CSSProperties = {
  padding: "12px 20px",
  textAlign: "left",
  fontSize: 12,
  fontWeight: 600,
  color: "var(--color-muted)",
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  backgroundColor: "var(--color-surface)",
  borderBottom: "1px solid var(--color-line)",
  position: "sticky",
  top: 0,
  zIndex: 1,
};

const ellipsis: React.CSSProperties = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

function Avatar({ name }: { name: string }) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: 34,
        height: 34,
        flexShrink: 0,
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 12,
        fontWeight: 700,
        color: "var(--color-accent-strong)",
        backgroundColor: "color-mix(in srgb, var(--color-accent) 18%, transparent)",
      }}
    >
      {getInitials(name)}
    </span>
  );
}

function RemoveButton({
  record,
  busy,
  onRemove,
}: {
  record: AttendanceRecord;
  busy: boolean;
  onRemove: (record: AttendanceRecord) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onRemove(record)}
      disabled={busy}
      aria-label={`Remove ${record.fullName}`}
      aria-busy={busy}
      title="Remove"
      style={{
        width: 34,
        height: 34,
        flexShrink: 0,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 9999,
        border: "1px solid #FEE2E2",
        backgroundColor: "#FEF2F2",
        color: "#DC2626",
        cursor: busy ? "default" : "pointer",
      }}
      onMouseEnter={(e) => {
        if (!busy) e.currentTarget.style.backgroundColor = "#FEE2E2";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "#FEF2F2";
      }}
    >
      {busy ? (
        <Loader2 size={15} aria-hidden="true" style={{ animation: "spin 1s linear infinite" }} />
      ) : (
        <Trash2 size={15} aria-hidden="true" />
      )}
    </button>
  );
}

interface AttendanceTableProps {
  records: AttendanceRecord[];
  busyIds: ReadonlySet<string>;
  /** A cancelled event can't be changed, so there is no remove button */
  readOnly: boolean;
  onRemove: (record: AttendanceRecord) => void;
}

/** A table on wide screens and stacked rows on phones, the way the roster switches */
export function AttendanceTable({ records, busyIds, readOnly, onRemove }: AttendanceTableProps) {
  return (
    <div style={{ ...TABLE_CARD_STYLE, display: "flex", flexDirection: "column" }}>
      <div
        role="region"
        tabIndex={0}
        aria-label="Attendance list"
        style={{ maxHeight: ATTENDANCE_SCROLL_MAX_HEIGHT, overflow: "auto", overflowX: "hidden", scrollbarGutter: "stable" }}
      >
        <div className="orgkit-members-desktop">
          <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
            <colgroup>
              {ATTENDANCE_COLUMNS.map((width, i) => (
                <col key={i} style={{ width }} />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th scope="col" style={headerCell}>Member</th>
                <th scope="col" style={headerCell}>Method</th>
                <th scope="col" style={headerCell}>Checked in</th>
                <th scope="col" style={headerCell}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {records.map((record, i) => (
                <tr
                  key={record.memberId}
                  data-attendance-row={record.memberId}
                  style={{ borderBottom: i === records.length - 1 ? "none" : "1px solid var(--color-line)" }}
                >
                  <td style={{ padding: "12px 20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                      <Avatar name={record.fullName} />
                      <span
                        title={record.fullName}
                        style={{ ...ellipsis, fontSize: 14, fontWeight: 600, color: "var(--color-ink)" }}
                      >
                        {record.fullName}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: "12px 20px" }}>
                    <AttendanceMethodBadge method={record.method} />
                  </td>
                  <td style={{ padding: "12px 20px", fontSize: 13.5, color: "var(--color-muted-strong)" }}>
                    <LocalTime iso={record.checkedInAt} />
                  </td>
                  <td style={{ padding: "12px 20px", textAlign: "right" }}>
                    {!readOnly && <RemoveButton record={record} busy={busyIds.has(record.memberId)} onRemove={onRemove} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="orgkit-members-mobile">
         <div>
          {records.map((record, i) => (
            <div
              key={record.memberId}
              data-attendance-row={record.memberId}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 14px",
                borderBottom: i === records.length - 1 ? "none" : "1px solid var(--color-line)",
              }}
            >
              <Avatar name={record.fullName} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  title={record.fullName}
                  style={{ ...ellipsis, fontSize: 14, fontWeight: 600, color: "var(--color-ink)" }}
                >
                  {record.fullName}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "4px 8px",
                    marginTop: 4,
                    fontSize: 12.5,
                    color: "var(--color-muted-strong)",
                  }}
                >
                  <AttendanceMethodBadge method={record.method} />
                  <LocalTime iso={record.checkedInAt} />
                </div>
              </div>
              {!readOnly && <RemoveButton record={record} busy={busyIds.has(record.memberId)} onRemove={onRemove} />}
            </div>
          ))}
         </div>
        </div>
      </div>
    </div>
  );
}
