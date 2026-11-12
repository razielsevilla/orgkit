import React from "react";
import {
  HEADER_ROW_STYLE,
  ROSTER_HEADER_CELL_STYLE,
  ROSTER_TABLE_STYLE,
  type TableColumn,
} from "@/src/components/workspace/members/member-table-layout";

/**
 * The events table's shape, in one place, so the table and its loading
 * skeleton share columns and spacing. The card, header text and table style come
 * from the roster layout, so Events sits in the same frame as Members.
 */
export const EVENT_COLUMNS: readonly TableColumn[] = [
  { label: "Event", width: "34%", padding: "14px 24px" },
  { label: "Starts", width: "19%", padding: "14px 16px" },
  { label: "Ends", width: "19%", padding: "14px 16px" },
  { label: "Status", width: "13%", padding: "14px 12px" },
  { label: "Actions", width: "15%", padding: "14px 20px" },
];

export const EVENT_CELL_PADDING = ["16px 24px", "16px 16px", "16px 16px", "16px 12px", "16px 20px"] as const;

export function EventColgroup() {
  return (
    <colgroup>
      {EVENT_COLUMNS.map((column) => (
        <col key={column.label} style={{ width: column.width }} />
      ))}
    </colgroup>
  );
}

/** The column headings above the scrolling rows, like the roster's `RosterHeaderBar` */
export function EventHeaderBar() {
  return (
    <div
      style={{
        flexShrink: 0,
        overflow: "hidden",
        scrollbarGutter: "stable",
        backgroundColor: "var(--color-base)",
        borderBottom: "1px solid var(--color-line)",
      }}
    >
      <table aria-hidden="true" style={ROSTER_TABLE_STYLE}>
        <EventColgroup />
        <thead>
          <tr style={HEADER_ROW_STYLE}>
            {EVENT_COLUMNS.map((column, i) => (
              <th
                key={column.label}
                scope="col"
                style={{ ...ROSTER_HEADER_CELL_STYLE, textAlign: i === 0 ? "left" : "center", padding: column.padding }}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
      </table>
    </div>
  );
}

/** The headings the rows table exposes to assistive technology, hidden on screen */
export function EventScreenReaderHeader() {
  return (
    <thead>
      <tr>
        {EVENT_COLUMNS.map((column) => (
          <th key={column.label} scope="col" className="sr-only">
            {column.label}
          </th>
        ))}
      </tr>
    </thead>
  );
}
