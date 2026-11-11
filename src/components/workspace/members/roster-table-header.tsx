import React from "react";
import {
  HEADER_ROW_STYLE,
  ROSTER_COLUMNS,
  ROSTER_HEADER_CELL_STYLE,
  ROSTER_TABLE_STYLE,
} from "./member-table-layout";

/** Column widths for the roster, shared by the header table and the rows table so they line up */
export function RosterColgroup() {
  return (
    <colgroup>
      {ROSTER_COLUMNS.map((column) => (
        <col key={column.label} style={{ width: column.width }} />
      ))}
    </colgroup>
  );
}

/**
 * The roster's column headings, above the scrolling rows instead of inside
 * them, so the scrollbar starts under the header. The gutter is reserved the
 * same way as on the rows, which keeps the columns lined up. Screen readers get
 * the headings from the rows table, so this copy is hidden from them.
 */
export function RosterHeaderBar() {
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
        <RosterColgroup />
        <thead>
          <tr style={HEADER_ROW_STYLE}>
            {ROSTER_COLUMNS.map((column) => (
              <th key={column.label} scope="col" style={{ ...ROSTER_HEADER_CELL_STYLE, padding: column.padding }}>
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
export function RosterScreenReaderHeader() {
  return (
    <thead>
      <tr>
        {ROSTER_COLUMNS.map((column) => (
          <th key={column.label} scope="col" className="sr-only">
            {column.label}
          </th>
        ))}
      </tr>
    </thead>
  );
}
